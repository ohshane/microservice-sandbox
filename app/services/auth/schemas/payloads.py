from pydantic import BaseModel


class AuthCredentials(BaseModel):
    email: str
    password: str


class Tokens(BaseModel):
    refresh_token: str
    access_token: str


class AccessToken(BaseModel):
    access_token: str


class RefreshToken(BaseModel):
    refresh_token: str


class Me(BaseModel):
    email: str
    username: str
    name: str | None = None
    bio: str | None = None
    profile_url: str | None = None
    role: str
    is_first_login: bool
    is_active: bool
    change_password_on_next_login: bool