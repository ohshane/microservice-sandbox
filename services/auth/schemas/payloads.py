from pydantic import BaseModel


class AuthCredentials(BaseModel):
    email: str
    password: str


class Tokens(BaseModel):
    refresh_token: str
    access_token: str
