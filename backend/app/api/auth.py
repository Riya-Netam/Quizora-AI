import logging
import secrets
from datetime import timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE, get_current_user, verify_csrf
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import (create_access_token, create_refresh_token, decode_token, generate_opaque_token,
                               hash_opaque_token, hash_password, utcnow, verify_password)
from app.db.session import get_db
from app.models import PasswordResetToken, RefreshToken, User
from app.schemas.auth import (ChangePasswordIn, DeleteAccountIn, ForgotPasswordIn, LoginIn, MessageOut,
                              ProfileUpdateIn, RegisterIn, ResetPasswordIn, UserOut)
from app.services import audit
from app.services.email import send_password_reset_email

log = logging.getLogger("quizora.auth")
router = APIRouter(prefix="/auth", tags=["auth"])

INVALID_CREDENTIALS = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
# Pre-computed so login takes similar time whether or not the email exists.
_DUMMY_HASH = hash_password("dummy-password-for-timing")


def _cookie_kwargs(max_age: int, http_only: bool = True) -> dict:
    return dict(max_age=max_age, httponly=http_only, secure=settings.COOKIE_SECURE,
                samesite=settings.COOKIE_SAMESITE, path="/")


def _issue_session(response: Response, db: Session, user: User) -> None:
    token_id = secrets.token_urlsafe(16)
    db.add(RefreshToken(user_id=user.id, token_id=token_id,
                        expires_at=utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)))
    response.set_cookie(ACCESS_COOKIE, create_access_token(user.id),
                        **_cookie_kwargs(settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60))
    response.set_cookie(REFRESH_COOKIE, create_refresh_token(user.id, token_id),
                        **_cookie_kwargs(settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400))
    # CSRF token is readable by JS on purpose (double-submit pattern); it grants nothing by itself.
    response.set_cookie(CSRF_COOKIE, secrets.token_urlsafe(24),
                        **_cookie_kwargs(settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, http_only=False))


def _clear_session(response: Response) -> None:
    for name in (ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE):
        response.delete_cookie(name, path="/", secure=settings.COOKIE_SECURE, samesite=settings.COOKIE_SAMESITE)


def _revoke_all_refresh_tokens(db: Session, user_id: int) -> None:
    for t in db.scalars(select(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False))):
        t.revoked = True


@router.post("/register", response_model=UserOut, status_code=201)
@limiter.limit("5/minute")
def register(request: Request, data: RegisterIn, response: Response, db: Session = Depends(get_db)):
    user = User(name=data.name, email=data.email, password_hash=hash_password(data.password))
    db.add(user)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    # Role is always "student" here; there is no way to request admin through this endpoint.
    _issue_session(response, db, user)
    db.commit()
    return user


@router.post("/login", response_model=UserOut)
@limiter.limit("10/minute")
def login(request: Request, data: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email))
    if not user:
        verify_password(data.password, _DUMMY_HASH)
        raise INVALID_CREDENTIALS
    if not verify_password(data.password, user.password_hash):
        raise INVALID_CREDENTIALS
    if user.status != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is not active")
    user.last_login_at = utcnow()
    _issue_session(response, db, user)
    db.commit()
    return user


@router.post("/refresh", response_model=UserOut)
@limiter.limit("30/minute")
def refresh(request: Request, response: Response, db: Session = Depends(get_db),
            refresh_cookie: str | None = Cookie(default=None, alias=REFRESH_COOKIE)):
    verify_csrf(request)
    payload = decode_token(refresh_cookie, "refresh") if refresh_cookie else None
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")
    record = db.scalar(select(RefreshToken).where(RefreshToken.token_id == payload["rid"]))
    if not record or record.revoked:
        # Reuse of a rotated token suggests theft: revoke the whole family.
        if record:
            _revoke_all_refresh_tokens(db, record.user_id)
            db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")
    user = db.get(User, record.user_id)
    if not user or user.status != "active":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")
    record.revoked = True  # rotation: each refresh token is single-use
    _issue_session(response, db, user)
    db.commit()
    return user


@router.post("/logout", response_model=MessageOut)
def logout(response: Response, db: Session = Depends(get_db),
           refresh_cookie: str | None = Cookie(default=None, alias=REFRESH_COOKIE)):
    payload = decode_token(refresh_cookie, "refresh") if refresh_cookie else None
    if payload:
        record = db.scalar(select(RefreshToken).where(RefreshToken.token_id == payload["rid"]))
        if record:
            record.revoked = True
            db.commit()
    _clear_session(response)
    return MessageOut(message="Logged out")


@router.get("/csrf")
def csrf_token(request: Request):
    """Lets the SPA learn its CSRF token when the API is on another domain (it cannot read that
    domain's cookies). Safe: other sites cannot read this response because of CORS."""
    return {"csrf_token": request.cookies.get(CSRF_COOKIE)}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_profile(data: ProfileUpdateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.name = data.name.strip()  # only name is editable: role/status/email are not accepted here
    db.commit()
    return user


@router.post("/change-password", response_model=MessageOut)
@limiter.limit("5/minute")
def change_password(request: Request, data: ChangePasswordIn, response: Response,
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    user.password_hash = hash_password(data.new_password)
    _revoke_all_refresh_tokens(db, user.id)
    _issue_session(response, db, user)  # keep this device signed in
    db.commit()
    return MessageOut(message="Password updated")


@router.post("/forgot-password", response_model=MessageOut)
@limiter.limit("3/minute")
def forgot_password(request: Request, data: ForgotPasswordIn, db: Session = Depends(get_db)):
    if not settings.email_configured:
        # Honest behaviour: never claim an email was sent when it cannot be.
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            "Password reset email is not configured on this server. Please contact the administrator.")
    generic = MessageOut(message="If an account exists for that email, a reset link has been sent.")
    user = db.scalar(select(User).where(User.email == data.email))
    if not user or user.status != "active":
        return generic
    token = generate_opaque_token()
    db.add(PasswordResetToken(user_id=user.id, token_hash=hash_opaque_token(token),
                              expires_at=utcnow() + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)))
    db.commit()
    try:
        send_password_reset_email(user.email, f"{settings.FRONTEND_ORIGIN}/reset-password?token={token}")
    except Exception:
        log.exception("Failed to send password reset email")  # token itself is never logged
    return generic


@router.post("/reset-password", response_model=MessageOut)
@limiter.limit("5/minute")
def reset_password(request: Request, data: ResetPasswordIn, db: Session = Depends(get_db)):
    bad = HTTPException(status.HTTP_400_BAD_REQUEST, "This reset link is invalid or has expired")
    record = db.scalar(select(PasswordResetToken).where(
        PasswordResetToken.token_hash == hash_opaque_token(data.token)))
    if not record or record.used_at is not None:
        raise bad
    expires = record.expires_at if record.expires_at.tzinfo else record.expires_at.replace(tzinfo=utcnow().tzinfo)
    if expires < utcnow():
        raise bad
    user = db.get(User, record.user_id)
    if not user:
        raise bad
    user.password_hash = hash_password(data.new_password)
    record.used_at = utcnow()  # single-use
    _revoke_all_refresh_tokens(db, user.id)
    db.commit()
    return MessageOut(message="Password has been reset. You can now sign in.")


@router.delete("/me", response_model=MessageOut)
def delete_account(data: DeleteAccountIn, response: Response, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password is incorrect")
    if user.role == "admin":
        remaining = db.scalar(select(User.id).where(User.role == "admin", User.id != user.id, User.status == "active"))
        if remaining is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You are the only administrator and cannot delete this account")
    audit.record(db, None, "account.deleted", "user", user.id)
    db.delete(user)  # study sets, attempts, tokens cascade
    db.commit()
    _clear_session(response)
    return MessageOut(message="Account deleted")
