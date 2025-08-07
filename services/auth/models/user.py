from sqlalchemy import Column, Text, Boolean, DateTime, Integer
from .base import BaseModel


class User(BaseModel):
    email = Column(Text, nullable=False, unique=True)
    username = Column(Text, nullable=True)
    hashed_password = Column(Text, nullable=True)
    name = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    profile_url = Column(Text, nullable=True)

    login_fail_count = Column(Integer, default=0)
    login_fail_at = Column(DateTime, nullable=True)

    role = Column(Text, nullable=False, default="user")

    sso_provider = Column(Text, nullable=True)
    sso_id = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    change_password_on_next_login = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    last_password_change_at = Column(DateTime, nullable=True)
