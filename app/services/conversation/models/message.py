from sqlalchemy import Column, Text, Boolean, DateTime, Integer
from .base import BaseModel


class Message(BaseModel):
    user_id = Column(Text, nullable=True)
    conversation_id = Column(Text, nullable=False)
    parent_id = Column(Text, nullable=True)
    