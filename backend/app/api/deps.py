from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models import User

ACCESS_COOKIE = "quizora_access"
REFRESH_COOKIE = "quizora_refresh"
CSRF_COOKIE = "quizora_csrf"
CSRF_HEADER = "x-csrf-token"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def verify_csrf(request: Request) -> None:
    """Double-submit CSRF check for state-changing requests authenticated by cookie."""
    if request.method in SAFE_METHODS:
        return
    cookie = request.cookies.get(CSRF_COOKIE)
    header = request.headers.get(CSRF_HEADER)
    if not cookie or not header or cookie != header:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "CSRF validation failed")


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    access: str | None = Cookie(default=None, alias=ACCESS_COOKIE),
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    if not access:
        raise unauthorized
    payload = decode_token(access, "access")
    if not payload:
        raise unauthorized
    verify_csrf(request)
    user = db.scalar(select(User).where(User.id == int(payload["sub"])))
    if not user:
        raise unauthorized
    if user.status != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is not active")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Administrator access required")
    return user


def get_optional_user(db: Session = Depends(get_db),
                      access: str | None = Cookie(default=None, alias=ACCESS_COOKIE)) -> User | None:
    """For public endpoints that behave slightly differently when signed in. Never raises."""
    payload = decode_token(access, "access") if access else None
    if not payload:
        return None
    user = db.scalar(select(User).where(User.id == int(payload["sub"])))
    return user if user and user.status == "active" else None
