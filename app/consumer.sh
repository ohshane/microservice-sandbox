#!/bin/sh

TOPIC="$1"

docker exec -it broker-1 /opt/kafka/bin/kafka-console-consumer.sh \
    --bootstrap-server localhost:19092 \
    --topic "$TOPIC"