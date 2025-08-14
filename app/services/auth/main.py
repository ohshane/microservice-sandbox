import os
import random

import models as M
import schemas.payloads as P
from fastapi import Depends, FastAPI, Request, Cookie, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from schemas.responses import create_model, create_response
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from models.base import Base

from lib.middleware import get_token
from lib.infra import *
from lib.utils import *
from lib.jwt import *
from contextlib import asynccontextmanager
import logging

APP_ENV = os.getenv("APP_ENV")

logging.basicConfig(level=logging.DEBUG if APP_ENV == "dev" else logging.INFO)
logger = logging.getLogger(__name__)

# Jwt
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
JWT_REFRESH_TOKEN_EXPIRE_SECONDS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_SECONDS"))
JWT_ACCESS_TOKEN_EXPIRE_SECONDS = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_SECONDS"))
jwt_encoder = new_jwt_encoder(jwt_secret=JWT_SECRET, jwt_algorithm=JWT_ALGORITHM)
jwt_decoder = new_jwt_decoder(jwt_secret=JWT_SECRET, jwt_algorithm=JWT_ALGORITHM)

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
    allow_origins=["http://localhost:3000"],
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
        username = get_random_name() + str(random.randint(1000, 9999))
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
    data = user.to_dict()

    try:
        await request.app.state.producer.send_and_wait(
            "auth.user.registered", key=None, value=create_event(data)
        )
    except Exception as e:
        return JSONResponse(create_response(str(e)), 500)

    return JSONResponse(create_response("User registered."), 201)


@app.post("/login", response_model=P.Tokens)
async def login(body: P.AuthCredentials, db: Session = Depends(get_db)):
    user = db.query(M.User).filter(M.User.email == body.email).first()
    logger.debug(user.to_dict() if user else "User not found")
    if user is not None and verify_password(body.password, user.hashed_password):
        user.last_login_at = now()
        db.commit()
        db.refresh(user)
    else:
        return JSONResponse(create_response("Invalid email or password."), 401)

    refresh_token = jwt_encoder(
        refresh_token_payload(user, JWT_REFRESH_TOKEN_EXPIRE_SECONDS)
    )

    access_token = jwt_encoder(
        access_token_payload(user, JWT_ACCESS_TOKEN_EXPIRE_SECONDS)
    )

    res = JSONResponse(
        create_response(
            "Logged in successfully.",
            {
                "access_token": access_token,
                "refresh_token": refresh_token,
            },
        ),
        200,
    )

    res.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        # TODO: https
        secure=False,
        samesite="Lax",
        max_age=JWT_ACCESS_TOKEN_EXPIRE_SECONDS,
        path="/api",
    )

    res.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        # TODO: https
        secure=False,
        samesite="Lax",
        max_age=JWT_REFRESH_TOKEN_EXPIRE_SECONDS,
        path="/api/v1/auth/refresh",
    )

    return res


def verify_token(redis, token: str, *args, **kwargs) -> dict:
    try:
        payload = jwt_decoder(token, *args, **kwargs)
    except:
        raise HTTPException(status_code=401, detail="Token is invalid.1")

    if redis.exists(f"bl:{payload.get("jti")}"):
        raise HTTPException(status_code=401, detail="Token is invalid.2")

    if payload.get("exp") < int(now().timestamp()):
        raise HTTPException(status_code=401, detail="Token is invalid.3")

    return payload


def blacklist_token(redis, payload: dict) -> None:
    exp = payload.get("exp")
    ttl = exp - int(now().timestamp())
    redis.setex(f"bl:{payload.get("jti")}", ttl, "blacklisted")


@app.post("/logout", response_model=P.AccessToken)
async def logout(access_token: str = Depends(get_token)):
    payload = verify_token(redis, access_token)
    blacklist_token(redis, payload)

    res = JSONResponse(create_response("Logged out successfully."), 200)
    res.delete_cookie("access_token", path="/api")
    return res


@app.post("/refresh", response_model=P.AccessToken)
async def refresh(
    refresh_token: str = Depends(get_token), db: Session = Depends(get_db)
):
    payload = verify_token(redis, refresh_token)

    user = db.query(M.User).filter(M.User.id == payload.get("sub")).first()
    if not user:
        return JSONResponse(create_response("User not found."), 404)

    access_token = jwt_encoder(
        access_token_payload(user, JWT_ACCESS_TOKEN_EXPIRE_SECONDS)
    )

    res = JSONResponse(
        create_response("Access token refreshed.", {"access_token": access_token}),
        200,
    )

    res.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        # TODO: https
        secure=False,
        samesite="Lax",
        max_age=JWT_ACCESS_TOKEN_EXPIRE_SECONDS,
        path="/api",
    )

    return res


@app.get("/me", response_model=P.Me)
async def me(access_token: str = Depends(get_token), db: Session = Depends(get_db)):
    payload = verify_token(
        redis, access_token, audience="service", issuer="auth.service"
    )

    user = db.query(M.User).filter(M.User.id == payload.get("sub")).first()
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
