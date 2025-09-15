def new_db_session(url):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def new_db(url):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    return get_db


def new_redis(host, port):
    import redis

    return redis.Redis(host=host, port=port)


def new_s3(s3_region, s3_endpoint, s3_access_key, s3_secret_key):
    import boto3

    return boto3.client(
        "s3",
        region_name=s3_region,
        endpoint_url=s3_endpoint,
        aws_access_key_id=s3_access_key,
        aws_secret_access_key=s3_secret_key,
        config=boto3.session.Config(
            connect_timeout=5, read_timeout=10, s3={"addressing_style": "path"}
        ),
    )


def new_chromadb(host, port):
    import chromadb

    return chromadb.HttpClient(
        host=host,
        port=port,
    )


def new_kafka_producer(bootstrap_servers: list[str]):

    import json

    from aiokafka import AIOKafkaProducer

    return AIOKafkaProducer(
        bootstrap_servers=bootstrap_servers,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )


def new_kafka_consumer(*topics, group_id: str, bootstrap_servers: list[str]):
    import json

    from aiokafka import AIOKafkaConsumer

    return AIOKafkaConsumer(
        *topics,
        bootstrap_servers=bootstrap_servers,
        group_id=group_id,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="earliest",
        enable_auto_commit=True,
    )