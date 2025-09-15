import json
import logging
import os
from contextlib import asynccontextmanager
import asyncio

import httpx
import schemas.models as M
import schemas.payloads as P
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from lib.infra import *
from lib.jwt import *
from lib.utils import *
from lib.middleware import get_tokens
from lib.model import Base
from lib.response import create_model, create_response
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

APP_ENV = os.getenv("APP_ENV")

logging.basicConfig(level=logging.DEBUG if APP_ENV == "dev" else logging.INFO)
logger = logging.getLogger(__name__)


# Postgres
DB_SCHEMA = os.getenv("DB_SCHEMA")
POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
postgres_url = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
get_db = new_db(url=postgres_url)
db = new_db_session(url=postgres_url)
engine = create_engine(url=postgres_url)
assert DB_SCHEMA
db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "msa_{DB_SCHEMA}";'))
db.commit()
Base.metadata.create_all(bind=engine)

# Jwt
jwt = JWTService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    KAFKA_BROKER_URL = os.getenv("KAFKA_BROKER_URL")
    producer = new_kafka_producer(bootstrap_servers=[KAFKA_BROKER_URL])
    await producer.start()
    app.state.producer = producer
    try:
        yield
    finally:
        await producer.stop()


app = FastAPI(root_path="/api/v1/conversation", lifespan=lifespan)

@asynccontextmanager
async def lifespan(app: FastAPI):
    KAFKA_BROKER_URL = os.getenv("KAFKA_BROKER_URL")
    producer = new_kafka_producer(bootstrap_servers=[KAFKA_BROKER_URL])
    await producer.start()
    app.state.producer = producer
    try:
        yield
    finally:
        await producer.stop()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000",
        "http://192.168.0.34:3000",
        "https://192.168.0.34:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", response_model=create_model())
def healthz(db: Session = Depends(get_db)):
    message = "Conversation service is healthy."
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        message = str(e)

    return JSONResponse(create_response(message), 200)


async def set_title(db: Session, conv: M.Conversation, text: str):
    try:
        title = await summarize(text=text, max_length=30)
        conv.title = title
        db.add(conv)
        db.commit()
        db.refresh(conv)
    except Exception as e:
        logger.exception("set_title_async failed: %s", e)


@app.post("/prepare")
async def prepare(
    body: P.Conversation,
    tokens: dict = Depends(get_tokens),
    db: Session = Depends(get_db),
):

    token = tokens.get("access_token") or tokens.get("bearer_token") or None
    sub = None
    try:
        payload = jwt.verify_token(token, issuer="auth.service", audience="service")
        sub = payload.sub
    except:
        pass

    conversation = M.Conversation(
        id=body.conversation_id,
        user_id=sub if sub else None,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    user_message = M.Message(
        parent_id=None,
        conversation_id=conversation.id,
        role="user",
        content=body.messages[-1].content,
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    return JSONResponse(
        create_response(
            "Conversation prepared successfully.",
        ),
        200,
    )


@app.post("")
async def completions(
    request: Request,
    body: P.Conversation,
    tokens: dict = Depends(get_tokens),
    db: Session = Depends(get_db),
):
    logger.debug(">>>>>>>>>>>>>>>>>>>>>>>>>>")
    logger.debug(body)
    logger.debug("<<<<<<<<<<<<<<<<<<<<<<<<<<")

    token = tokens.get("access_token") or tokens.get("bearer_token") or None
    sub = None
    try:
        payload = jwt.verify_token(token, issuer="auth.service", audience="service")
        sub = payload.sub
    except:
        pass

    user = db.query(M.User).filter_by(user_id=sub).first() if sub else None

    prev_conversation = (
        db.query(M.Conversation).filter_by(id=body.conversation_id).first()
    )
    if sub and prev_conversation:
        prev_conversation.user_id = sub
        db.add(prev_conversation)
        db.commit()
        db.refresh(prev_conversation)

    prev_message = None
    if prev_conversation:
        prev_message = (
            db.query(M.Message)
            .filter_by(conversation_id=body.conversation_id)
            .order_by(M.Message.created_at.desc())
            .first()
        )
    else:
        prev_conversation = M.Conversation(
            id=body.conversation_id,
            user_id=sub if sub else None,
        )
        db.add(prev_conversation)
        db.commit()
        db.refresh(prev_conversation)
    
    user_message = None
    if prev_message and prev_message.role == "user":
        user_message = prev_message
    else:
        user_message = M.Message(
            parent_id=prev_message.id if prev_message else None,
            conversation_id=body.conversation_id,
            role="user",
            content=body.messages[-1].content,
        )
        db.add(user_message)
        db.commit()
        db.refresh(user_message)
    
    try:
        await request.app.state.producer.send_and_wait(
            "conversation.user.message", key=None, value=create_event(user_message.to_dict())
        )
    except Exception as e:
        return JSONResponse(create_response(str(e)), 500)

    if prev_conversation.title is None or prev_conversation.title == "":
        asyncio.create_task(set_title(db, prev_conversation, body.messages[-1].content))

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
    }
    data = {
        "model": "gpt-4o",
        "messages": [
            {
                "role": "developer",
                "content": f"""
You are Cherry, the official AI assistant for CakeStack, founded by Shane Oh.

# Company & Product Context
CakeStack is a developer-first platform that helps teams build production-ready microservices with no pain.
Our flagship product, Microservice Sandbox, is a batteries-included starter kit featuring:
- CQRS + Kafka for scalable, event-driven architectures
- Multi-tenant authentication & authorization
- PostgreSQL and Redis integrations
- Kubernetes-ready deployments
Optimized developer experience from day one
We believe in production from day one—empowering developers to ship fast, maintain quality, and avoid boilerplate chaos.

# Your Role
Cherry is the knowledgeable, practical, and friendly technical partner for anyone interacting with CakeStack. You help:
- Explain CakeStack’s architecture, features, and best practices
- Provide hands-on technical guidance for Microservice Sandbox
- Offer clear, concise, and actionable answers to developer questions
- Suggest optimizations, troubleshooting steps, and deployment strategies
- Maintain a professional yet approachable tone

# Guidelines
- Be precise & practical — no vague answers; always provide implementation-ready guidance.
- Understand context — tailor explanations to the user’s technical level.
- Prioritize developer experience — share best practices, not just solutions.
- Stay up-to-date — reflect the latest capabilities and recommendations for CakeStack.
- Be a technical partner — anticipate needs, suggest improvements, and connect dots between components.

# Tone & Style
- Professional but approachable
- Direct, confident, and jargon-aware
- Uses examples and code snippets when helpful
- Encouraging, collaborative, and developer-first

# User
- The current user's information: {user.to_dict() if user else "No user data available"}
- Greet user with the the information you have about them.
- Use their name if possible when greeting.
- Say "Hello, [name]!" if you have their name.
""",
            },
            *[m.model_dump() for m in body.messages],
        ],
        "stream": True,
    }

    async def stream_generator(url: str, data: dict):
        chunks = ""
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream(
                "POST", url, headers=headers, json=data
            ) as response:
                async for b in response.aiter_bytes():
                    chunks += b.decode("utf-8")
                    yield b
        chunks = [
            c.removeprefix("data: ").strip()
            for c in chunks.split("\n\n")
            if c.startswith("data: ")
        ]
        chunks = [json.loads(c) for c in chunks if c and c != "[DONE]"]
        chunks = [c["choices"][0].get("delta").get("content") for c in chunks]
        chunks = [c for c in chunks if c is not None]
        content = "".join(chunks)
        logger.debug(content)

        assistant_message = M.Message(
            parent_id=user_message.id,
            conversation_id=body.conversation_id,
            role="assistant",
            content=content,
        )
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)

        # Produce Kafka event after streaming response
        try:
            await request.app.state.producer.send_and_wait(
                "conversation.assistant.message", key=None, value=create_event(assistant_message.to_dict())
            )
        except Exception as e:
            logger.exception("Kafka production failed: %s", e)

    return StreamingResponse(
        stream_generator(url=url, data=data),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/list")
async def list_conversations(
    tokens: dict = Depends(get_tokens),
    db: Session = Depends(get_db),
):
    token = tokens.get("access_token") or tokens.get("bearer_token") or None
    try:
        payload = jwt.verify_token(token, issuer="auth.service", audience="service")
    except Exception as e:
        raise e

    conversations = (
        db.query(M.Conversation)
        .filter_by(user_id=payload.sub)
        .order_by(M.Conversation.created_at.desc())
        .all()
    )

    return JSONResponse(
        create_response(
            "Conversations list retrieved successfully.",
            [c.to_dict() for c in conversations],
        ),
        200,
    )


@app.get("/list/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    tokens: dict = Depends(get_tokens),
    db: Session = Depends(get_db),
):
    token = tokens.get("access_token") or tokens.get("bearer_token") or None
    try:
        payload = jwt.verify_token(token, issuer="auth.service", audience="service")
    except Exception as e:
        raise e

    conversation = (
        db.query(M.Conversation)
        .filter_by(id=conversation_id, user_id=payload.sub)
        .first()
    )

    if not conversation:
        return JSONResponse(create_response("Conversation not found.", None), 404)

    messages = (
        db.query(M.Message)
        .filter_by(conversation_id=conversation_id)
        .order_by(M.Message.created_at.asc())
        .all()
    )

    return JSONResponse(
        create_response(
            "Conversation retrieved successfully.",
            {
                "conversation": conversation.to_dict(),
                "messages": [m.to_dict() for m in messages],
            },
        ),
        200,
    )
