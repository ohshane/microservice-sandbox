from pydantic import BaseModel


class Message(BaseModel):
    role: str
    content: str


class ConversationPrepare(BaseModel):
    conversation_id: str


class Conversation(BaseModel):
    conversation_id: str
    messages: list[Message]
    timezone: str = "UTC"
