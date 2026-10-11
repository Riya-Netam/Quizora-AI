import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import settings

_hasher = PasswordHasher()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def _create_token(subject: str, token_type: str, expires: timedelta, extra: dict | None = None) -> str:
    now = utcnow()
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires).timestamp()),
        "jti": secrets.token_urlsafe(8),
        **(extra or {}),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: int) -> str:
    return _create_token(str(user_id), "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(user_id: int, token_id: str) -> str:
    return _create_token(
        str(user_id), "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS), {"rid": token_id}
    )


def decode_token(token: str, expected_type: str) -> dict | None:
    """Return the payload if valid and of the expected type, else None."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != expected_type:
        return None
    return payload


def generate_opaque_token() -> str:
    """Random token sent to the user; only its SHA-256 hash is stored."""
    return secrets.token_urlsafe(32)


def hash_opaque_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
