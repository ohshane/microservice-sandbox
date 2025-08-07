import os

import models as M
import schemas.payloads as P
from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from schemas.responses import create_model, create_response
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from models.base import Base

import json
from aiokafka import AIOKafkaProducer
from lib.infra import *
from lib.utils import hash_password, create_event
from contextlib import asynccontextmanager

APP_ENV = os.getenv("APP_ENV")

# Postgres
DB_SCHEMA = os.getenv("DB_SCHEMA")
POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
postgres_url = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
get_db = new_db(url=postgres_url)
engine = create_engine(url=postgres_url)
assert DB_SCHEMA
with engine.connect() as conn:
    conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS \"msa_{DB_SCHEMA}\";"))
    conn.commit()
Base.metadata.create_all(bind=engine)

# Redis
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = os.getenv("REDIS_PORT")
redis = new_redis(host=REDIS_HOST, port=REDIS_PORT)

# s3
AWS_S3_REGION = os.getenv("AWS_S3_REGION")
AWS_S3_ENDPOINT = os.getenv("AWS_S3_ENDPOINT")
AWS_S3_ACCESS_KEY = os.getenv("AWS_S3_ACCESS_KEY")
AWS_S3_SECRET_KEY = os.getenv("AWS_S3_SECRET_KEY")
s3 = new_s3(
    s3_region=AWS_S3_REGION,
    s3_endpoint=AWS_S3_ENDPOINT,
    s3_access_key=AWS_S3_ACCESS_KEY,
    s3_secret_key=AWS_S3_SECRET_KEY,
)

# Kafka
KAFKA_BROKER_URL = os.getenv("KAFKA_BROKER_URL")
producer = AIOKafkaProducer(
    bootstrap_servers=[KAFKA_BROKER_URL],
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await producer.start()
    yield
    await producer.stop()


app = FastAPI(root_path="/api/v1/auth", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", response_model=create_model())
def healthz(db: Session = Depends(get_db)):
    message = "Auth service is healthy."
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        message = str(e)

    return create_response(message)


@app.post("/register", response_model=create_model(P.Token))
async def register(body: P.RegisterUser, db: Session = Depends(get_db)):
    existing_user = db.query(M.User).filter(M.User.email == body.email).first()
    if existing_user:
        return JSONResponse(create_response("Email already exists."), 409)

    hashed_password = hash_password(body.password)
    user = M.User(
        email=body.email,
        hashed_password=hashed_password,
        is_active=True,
        change_password_on_next_login=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    data = user.to_dict()

    try:
        await producer.send(
            "auth.user.registered",
            key=None,
            value=create_event(data)
        )
    except Exception as e:
        return JSONResponse(create_response(str(e)), 500)

    return JSONResponse(create_response("User created.", data), 201)
