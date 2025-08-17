from sqlalchemy import Boolean, Column, DateTime, Integer, Text, String

from lib.model import BaseModel


class User(BaseModel):
    user_id = Column(String(36))
    user_seq = Column(Integer)
    user_created_at = Column(DateTime)
    user_updated_at = Column(DateTime)
    user_deleted_at = Column(DateTime)

    email = Column(Text)
    username = Column(Text)
    hashed_password = Column(Text)
    name = Column(Text)
    bio = Column(Text)
    profile_url = Column(Text)

    role = Column(Text)

    sso_provider = Column(Text)
    sso_id = Column(Text)

    is_first_login = Column(Boolean)
    is_active = Column(Boolean)
    change_password_on_next_login = Column(Boolean)
    last_login_at = Column(DateTime)
    last_password_change_at = Column(DateTime)


class Message(BaseModel):
    conversation_id = Column(Text, nullable=False)
    parent_id = Column(Text, nullable=True, default=None)
    role = Column(Text)
    content = Column(Text)


class Conversation(BaseModel):
    user_id = Column(Text)
    title = Column(Text)
