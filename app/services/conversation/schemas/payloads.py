from pydantic import BaseModel


class Message(BaseModel):
    role: str
    content: str


class Conversation(BaseModel):
    conversation_id: str
    messages: list[Message]
    timezone: str = "UTC"
