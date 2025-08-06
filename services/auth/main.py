import os

import schemas.payloads as P
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import Base
from schemas.responses import create_model, create_response
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from lib.infra import *

APP_ENV = os.getenv("APP_ENV")

# Postgres
POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
postgres_url = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
get_db = new_db(url=postgres_url)
engine = create_engine(url=postgres_url)
Base.metadata.create_all(bind=engine)

# Redis
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = os.getenv("REDIS_PORT")
redis = new_redis(host=REDIS_HOST, port=REDIS_PORT)

app = FastAPI(root_path="/api/v1/auth")

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
def register(body: P.RegisterUser, db: Session = Depends(get_db)):
    raise NotImplementedError