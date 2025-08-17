import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import declarative_base
from sqlalchemy_serializer import SerializerMixin

Base = declarative_base()


class BaseModel(Base):
    __abstract__ = True

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    seq = Column(Integer, autoincrement=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.now(timezone.utc),
        onupdate=datetime.now(timezone.utc),
        nullable=False,
    )
    deleted_at = Column(DateTime, default=datetime.now(timezone.utc), nullable=False)

    @declared_attr
    def __tablename__(cls):
        return cls.__name__.lower() + "s"

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
