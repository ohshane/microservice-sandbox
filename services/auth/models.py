import uuid
from datetime import datetime, timezone

from sqlalchemy import *
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    name = Column(String, nullable=True)  # Full name
    bio = Column(Text, nullable=True)     # User bio/introduction
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)
    is_first = Column(Boolean, default=True, nullable=False)  # Active status
    is_active = Column(Boolean, default=True, nullable=False)  # Active status
    role = Column(String, default="user", nullable=False)      # User role (e.g., 'user', 'admin')
    sso_provider = Column(String, nullable=True)  # e.g., 'google', 'github'
    sso_id = Column(String, nullable=True)        # provider-specific user id