from pydantic import BaseModel


class RegisterUser(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    refresh_token: str
    access_token: str
