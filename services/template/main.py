import os

import schemas.payloads as P
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from schemas.responses import create_model, create_response
from sqlalchemy import text
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

# # Redis
# REDIS_HOST = os.getenv("REDIS_HOST")
# REDIS_PORT = os.getenv("REDIS_PORT")
# redis = new_redis(host=REDIS_HOST, port=REDIS_PORT)

# # s3
# AWS_S3_REGION = os.getenv("AWS_S3_REGION")
# AWS_S3_ENDPOINT = os.getenv("AWS_S3_ENDPOINT")
# AWS_S3_ACCESS_KEY = os.getenv("AWS_S3_ACCESS_KEY")
# AWS_S3_SECRET_KEY = os.getenv("AWS_S3_SECRET_KEY")
# s3 = new_s3(
#     s3_region=AWS_S3_REGION,
#     s3_endpoint=AWS_S3_ENDPOINT,
#     s3_access_key=AWS_S3_ACCESS_KEY,
#     s3_secret_key=AWS_S3_SECRET_KEY,
# )

# # Chroma
# CHROMA_HOST = os.getenv("CHROMA_HOST")
# CHROMA_PORT = os.getenv("CHROMA_PORT")
# chroma = new_chromadb(host=CHROMA_HOST, port=CHROMA_PORT)


app = FastAPI(root_path="/api/v1/template")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", response_model=create_model())
def healthz(db: Session = Depends(get_db)):
    message = "service is healthy."
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        message = str(e)

    return create_response(message)


@app.post("/endpoint", response_model=create_model(P.Name))
def endpoint(body: P.Name):
    data = P.Name(name=body.name)
    return create_response("saying hi!", data)
