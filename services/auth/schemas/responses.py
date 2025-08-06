from typing import Generic, TypeVar

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field

from lib.utils import now

T = TypeVar("T")


def create_model(T=None):
    if T is None:
        return ResponseModel
    return DataResponseModel[T]


def create_response(message: str, data: any = None):
    response = None
    if data is None:
        response = ResponseModel(message=message)
    response = DataResponseModel(message=message, data=data)
    return jsonable_encoder(response)


class ResponseModel(BaseModel):
    message: str
    timestamp: int = Field(default_factory=lambda: now())


class DataResponseModel(BaseModel, Generic[T]):
    message: str
    data: T
    timestamp: int = Field(default_factory=lambda: now())
