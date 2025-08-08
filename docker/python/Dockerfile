FROM python:3.12-slim

ARG SERVICE

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app

WORKDIR /app

COPY services/${SERVICE}/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY services/${SERVICE}/. .
COPY lib/ ./lib/

EXPOSE 8000

CMD [ "fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "8000" ]