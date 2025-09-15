import re
from typing import Generic, TypeVar

from fastapi.encoders import jsonable_encoder
from lib.utils import now
from pydantic import BaseModel, Field

T = TypeVar("T")


def snake_to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


def camel_to_snake(s: str) -> str:
    return re.sub(r"([A-Z])", r"_\1", s).lower()


def create_model(T=None):
    if T is None:
        return ResponseModel
    return DataResponseModel[T]


def create_response(message: str, data: any = None) -> dict:
    if data is None:
        return jsonable_encoder(ResponseModel(message=message))
    return jsonable_encoder(DataResponseModel(message=message, data=data))


class ResponseModel(BaseModel):
    message: str
    timestamp: int = Field(default_factory=lambda: now())


class DataResponseModel(BaseModel, Generic[T]):
    message: str
    data: T
    timestamp: int = Field(default_factory=lambda: now())
