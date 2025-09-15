import os
import uuid
from datetime import datetime, timedelta, timezone

import redis
from fastapi import HTTPException
from jose import jwt
from pydantic import BaseModel

# JWT_SECRET=supersecret!
# JWT_ALGORITHM=HS256
# JWT_ACCESS_TOKEN_EXPIRE_SECONDS=60
# JWT_REFRESH_TOKEN_EXPIRE_SECONDS=180


class TokenPayload(BaseModel):
    sid: str
    sub: str
    iat: int
    exp: int
    jti: str


class AccessTokenPayload(TokenPayload):
    iss: str
    aud: str


class RefreshTokenPayload(TokenPayload):
    pass


class JWTService:
    def __init__(
        self,
        secret: str = os.getenv("JWT_SECRET", "supersecret!"),
        algorithm: str = os.getenv("JWT_ALGORITHM", "HS256"),
    ):
        self.secret = secret
        self.algorithm = algorithm

    def decode(
        self, token: str, issuer: str | None = None, audience: str | None = None
    ) -> dict:
        return jwt.decode(
            token,
            self.secret,
            algorithms=[self.algorithm],
            issuer=issuer,
            audience=audience,
        )

    def verify_token(
        self, token: str, issuer: str | None = None, audience: str | None = None
    ) -> TokenPayload:
        try:
            payload = TokenPayload(
                **self.decode(token, issuer=issuer, audience=audience)
            )
        except:
            raise HTTPException(status_code=401, detail="Token is invalid.")

        if payload.exp < int(datetime.now(timezone.utc).timestamp()):
            raise HTTPException(status_code=401, detail="Token has expired.")

        return payload


class JWTManager(JWTService):

    def __init__(
        self,
        redis: redis.Redis,
        secret: str = os.getenv("JWT_SECRET", "supersecret!"),
        algorithm: str = os.getenv("JWT_ALGORITHM", "HS256"),
        access_token_ttl: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_SECONDS", 60)),
        refresh_token_ttl: int = int(
            os.getenv("JWT_REFRESH_TOKEN_EXPIRE_SECONDS", 180)
        ),
    ):
        super().__init__(secret, algorithm)
        self.redis = redis
        self.access_token_ttl = access_token_ttl
        self.refresh_token_ttl = refresh_token_ttl

    def encode(self, payload: dict) -> str:
        return jwt.encode(payload, self.secret, algorithm=self.algorithm)

    def decode(self, *args, **kwargs) -> dict:
        return super().decode(*args, **kwargs)

    def claim_tokens(
        self,
        sub: str,
        sid: str = None,
        iss: str = "auth.service",
        aud: str = "service",
    ) -> dict:
        if sid is None:
            sid = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        access_token_payload = AccessTokenPayload(
            sid=sid,
            iss=iss,
            aud=aud,
            sub=sub,
            iat=int(now.timestamp()),
            exp=int((now + timedelta(seconds=self.access_token_ttl)).timestamp()),
            jti=str(uuid.uuid4()),
        )

        refresh_token_payload = RefreshTokenPayload(
            sid=sid,
            sub=sub,
            iat=int(now.timestamp()),
            exp=int((now + timedelta(seconds=self.refresh_token_ttl)).timestamp()),
            jti=str(uuid.uuid4()),
        )

        return {
            "access_token": self.encode(access_token_payload.model_dump()),
            "refresh_token": self.encode(refresh_token_payload.model_dump()),
        }

    def verify_token(
        self, token: str, issuer: str | None = None, audience: str | None = None
    ) -> TokenPayload:
        try:
            payload: TokenPayload = super().verify_token(
                token, issuer=issuer, audience=audience
            )
        except Exception as e:
            raise e

        if self.redis.exists(f"bl:{payload.sid}"):
            raise HTTPException(status_code=401, detail="Token is blacklisted.")

        if self.redis.exists(f"bl:{payload.jti}"):
            raise HTTPException(status_code=401, detail="Token is blacklisted.")

        return payload

    def blacklist(self, id: str) -> None:
        self.redis.setex(f"bl:{id}", self.refresh_token_ttl, "blacklisted")

    def rotate_tokens(
        self, refresh_token: str, iss: str = "auth.service", aud: str = "service"
    ) -> dict:
        payload: TokenPayload = self.verify_token(refresh_token)
        self.blacklist(payload.jti)
        return self.claim_tokens(sub=payload.sub, sid=payload.sid, iss=iss, aud=aud)
