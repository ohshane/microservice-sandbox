import os
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, Text
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class BaseModel(Base):
    __abstract__ = True

    id = Column(Text, primary_key=True, default=lambda: str(uuid.uuid4()))
    seq = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    deleted_at = Column(DateTime, default=None, nullable=True)

    @declared_attr
    def __table_args__(cls):
        DB_SCHEMA = os.getenv("DB_SCHEMA")
        return {"schema": f"msa_{DB_SCHEMA}"}

    @declared_attr
    def __tablename__(cls):
        return cls.__name__.lower() + "s"

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
