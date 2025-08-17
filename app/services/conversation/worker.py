import os
import asyncio
import logging
from lib.infra import *
from sqlalchemy import create_engine, text
from lib.model import Base
import schemas.models as M

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

DB_SCHEMA = os.getenv("DB_SCHEMA")
POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
postgres_url = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
db = new_db_session(url=postgres_url)
engine = create_engine(url=postgres_url)
assert DB_SCHEMA
db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "msa_{DB_SCHEMA}";'))
db.commit()
Base.metadata.create_all(bind=engine)


def handler(msg) -> None:

    user = db.query(M.User).filter_by(user_id=msg.value['data']['id']).first()
    if user:
        for key, value in msg.value['data'].items():
            if hasattr(user, key):
                setattr(user, key, value)
        user.user_seq = msg.value['data']['seq']
        user.user_created_at = msg.value['data']['created_at']
        user.user_updated_at = msg.value['data']['updated_at']
        user.user_deleted_at = msg.value['data']['deleted_at']
        db.commit()
    else:
        user = M.User(
            **msg.value['data'],
            user_id=msg.value['data']['id'],
            user_seq=msg.value['data']['seq'],
            user_created_at=msg.value['data']['created_at'],
            user_updated_at=msg.value['data']['updated_at'],
            user_deleted_at=msg.value['data']['deleted_at'],
        )
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


handlers: dict[str, callable] = {
    "auth.user.registered": handler,
    "auth.user.updated": handler,
}


async def consume() -> None:
    from lib.infra import new_kafka_consumer

    KAFKA_BROKER_URL = os.getenv("KAFKA_BROKER_URL")
    consumer = new_kafka_consumer(
        *handlers.keys(),
        group_id="conversation-service",
        bootstrap_servers=[KAFKA_BROKER_URL],
    )

    await consumer.start()
    logger.info("kafka:conversation:consumer:{'message':'Started.'}")

    try:
        async for msg in consumer:
            topic = msg.topic
            handler = handlers.get(topic)
            logger.info(
                f"kafka:conversation:consumer:{topic}|{msg.value}"
            )
            if handler is None:
                logger.error(
                    "kafka:conversation:consumer:{'message':'Handler not found.'}"
                )
                continue

            try:
                handler(msg)
            except Exception as e:
                logger.error(
                    f"kafka:conversation:consumer:{'message':'Error processing message.', 'error': str(e)}"
                )
    finally:
        await consumer.stop()
        logger.info("kafka:conversation:consumer:{'message':'Stopped.'}")


def main() -> None:
    asyncio.run(consume())


if __name__ == "__main__":
    main()
