import logging
import os
import random
from contextlib import asynccontextmanager

import schemas.models as M
import schemas.payloads as P
from fastapi import Cookie, Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from lib.infra import *
from lib.jwt import *
from lib.middleware import *
from lib.utils import *
from lib.model import Base
from lib.response import create_model, create_response
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

APP_ENV = os.getenv("APP_ENV")

logging.basicConfig(level=logging.DEBUG if APP_ENV == "dev" else logging.INFO)
logger = logging.getLogger(__name__)


# Superuser credentials
SU_EMAIL = os.getenv("SU_EMAIL")
SU_PASSWORD = os.getenv("SU_PASSWORD")

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

if not db.query(M.User).filter(M.User.email == SU_EMAIL).first():
    user = M.User(
        email=SU_EMAIL,
        username="superuser",
        name="Super User",
        role="superuser",
        hashed_password=hash_password(SU_PASSWORD),
        is_active=True,
        change_password_on_next_login=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

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

# Jwt
jwt = JWTManager(redis=redis)


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


app = FastAPI(root_path="/api/v1/auth", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://localhost:3000"],
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

    return JSONResponse(create_response(message), 200)


@app.post("/register", response_model=create_model(P.Tokens))
async def register(
    request: Request, body: P.AuthCredentials, db: Session = Depends(get_db)
):
    existing_user = db.query(M.User).filter(M.User.email == body.email).first()
    if existing_user:
        return JSONResponse(create_response("Email already exists."), 409)

    username = ""
    while True:
        username = get_random_name() + "_" + str(random.randint(1000, 9999))
        if db.query(M.User).filter(M.User.username == username).first() is None:
            break

    hashed_password = hash_password(body.password)
    user = M.User(
        email=body.email,
        username=username,
        hashed_password=hashed_password,
        is_active=True,
        is_first_login=True,
        change_password_on_next_login=False,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        await request.app.state.producer.send_and_wait(
            "auth.user.registered", key=None, value=create_event(user.to_dict())
        )
    except Exception as e:
        return JSONResponse(create_response(str(e)), 500)

    return JSONResponse(create_response("User registered."), 201)


@app.post("/login", response_model=P.Tokens)
async def login(
    request: Request, body: P.AuthCredentials, db: Session = Depends(get_db)
):
    user = db.query(M.User).filter(M.User.email == body.email).first()
    logger.debug(user.to_dict() if user else "User not found")
    if user is not None and verify_password(body.password, user.hashed_password):
        user.last_login_at = now()
        db.commit()
        db.refresh(user)
    else:
        return JSONResponse(create_response("Invalid email or password."), 401)

    tokens = jwt.claim_tokens(sub=user.id)

    res = JSONResponse(
        create_response("Logged in successfully.", tokens),
        200,
    )

    res.set_cookie(
        key="access_token",
        value=tokens.get("access_token"),
        httponly=True,
        # TODO: https
        secure=True,
        samesite="None",
        max_age=jwt.access_token_ttl,
        path="/",
    )

    res.set_cookie(
        key="refresh_token",
        value=tokens.get("refresh_token"),
        httponly=True,
        # TODO: https
        secure=True,
        samesite="None",
        max_age=jwt.refresh_token_ttl,
        path="/api/v1/auth/refresh",
    )

    return res


@app.post("/logout", response_model=P.AccessToken)
async def logout(request: Request, tokens: dict = Depends(get_tokens)):
    token = tokens.get("access_token") or tokens.get("bearer_token") or None
    try:
        payload = jwt.verify_token(token, issuer="auth.service", audience="service")
    except Exception as e:
        raise e

    jwt.blacklist(payload.sid)
    res = JSONResponse(create_response("Logged out successfully."), 200)
    res.set_cookie(
        key="access_token",
        value="",
        httponly=True,
        # TODO: https
        secure=True,
        samesite="None",
        max_age=0,
        path="/",
    )

    res.set_cookie(
        key="refresh_token",
        value="",
        httponly=True,
        # TODO: https
        secure=True,
        samesite="None",
        max_age=0,
        path="/api/v1/auth/refresh",
    )
    return res


@app.post("/refresh", response_model=P.AccessToken)
async def refresh(request: Request, tokens: dict = Depends(get_tokens)):
    token = tokens.get("refresh_token") or tokens.get("bearer_token") or None
    refreshed_tokens = jwt.rotate_tokens(
        refresh_token=token, iss="auth.service", aud="service"
    )

    res = JSONResponse(
        create_response("Refreshed tokens successfully.", refreshed_tokens),
        200,
    )

    res.set_cookie(
        key="access_token",
        value=refreshed_tokens.get("access_token"),
        httponly=True,
        # TODO: https
        secure=True,
        samesite="None",
        max_age=jwt.access_token_ttl,
        path="/",
    )

    res.set_cookie(
        key="refresh_token",
        value=refreshed_tokens.get("refresh_token"),
        httponly=True,
        # TODO: https
        secure=True,
        samesite="None",
        max_age=jwt.refresh_token_ttl,
        path="/api/v1/auth/refresh",
    )

    return res


@app.get("/me", response_model=P.Me)
async def get_me(tokens: str = Depends(get_tokens), db: Session = Depends(get_db)):
    token = tokens.get("access_token") or tokens.get("bearer_token") or None
    if not token:
        return JSONResponse(create_response("Token is required."), 401)

    payload = jwt.verify_token(token, issuer="auth.service", audience="service")
    user = db.query(M.User).filter(M.User.id == payload.sub).first()

    if not user:
        return JSONResponse(create_response("User not found."), 404)

    return JSONResponse(
        create_response(
            "User retrieved successfully.",
            P.Me(
                email=user.email,
                username=user.username,
                name=user.name,
                bio=user.bio,
                profile_url=user.profile_url,
                role=user.role,
                is_first_login=user.is_first_login,
                is_active=user.is_active,
                change_password_on_next_login=user.change_password_on_next_login,
            ),
        ),
        200,
    )


@app.post("/me", response_model=P.Me)
async def update_me(
    request: Request,
    body: P.UpdateMe,
    tokens: dict = Depends(get_tokens),
    db: Session = Depends(get_db),
):
    token = tokens.get("access_token") or tokens.get("bearer_token") or None
    if not token:
        return JSONResponse(create_response("Token is required."), 401)

    payload = jwt.verify_token(token, issuer="auth.service", audience="service")
    user = db.query(M.User).filter(M.User.id == payload.sub).first()

    if not user:
        return JSONResponse(create_response("User not found."), 404)

    user.username = body.username or user.username
    user.name = body.name or user.name
    user.bio = body.bio or user.bio
    user.is_active = body.is_active or user.is_active

    db.commit()
    db.refresh(user)

    try:
        await request.app.state.producer.send_and_wait(
            "auth.user.updated", key=None, value=create_event(user.to_dict())
        )
    except Exception as e:
        return JSONResponse(create_response(str(e)), 500)

    return JSONResponse(
        create_response(
            "User updated successfully.",
            P.Me(
                email=user.email,
                username=user.username,
                name=user.name,
                bio=user.bio,
                profile_url=user.profile_url,
                role=user.role,
                is_first_login=user.is_first_login,
                is_active=user.is_active,
                change_password_on_next_login=user.change_password_on_next_login,
            ),
        ),
        200,
    )


@app.post("/me/change-password")
async def change_password(
    body: P.ChangePassword,
    tokens: dict = Depends(get_tokens),
    db: Session = Depends(get_db),
):
    token = tokens.get("access_token") or tokens.get("bearer_token") or None
    if not token:
        return JSONResponse(create_response("Token is required."), 401)

    payload = jwt.verify_token(token, issuer="auth.service", audience="service")
    user = db.query(M.User).filter(M.User.id == payload.sub).first()
    if not user or not verify_password(body.old_password, user.hashed_password):
        return JSONResponse(
            create_response("User not found or old password incorrect."), 404
        )

    user.hashed_password = hash_password(body.new_password)
    db.commit()
    db.refresh(user)

    return JSONResponse(create_response("Password changed successfully."), 200)
