from collections import defaultdict
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.core.config import settings
from app.core.security import utcnow
from app.db.session import get_db
from app.models import (AIUsage, AppSetting, AuditLog, Feedback, QuizAttempt, RefreshToken, StudySet, User)
from app.schemas.auth import UserOut
from app.schemas.misc import AuditLogOut, FeedbackOut, FeedbackStatusIn, SettingsIn, UserStatusIn
from app.schemas.study import Page
from app.services import audit, generation

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])
# Every route in this router requires an authenticated, active admin (enforced server-side).


def _count(db: Session, stmt) -> int:
    return db.scalar(stmt) or 0


@router.get("/stats")
def stats(days: int = Query(14, ge=7, le=90), db: Session = Depends(get_db)):
    since = utcnow() - timedelta(days=days)
    ai_rows = db.execute(select(AIUsage.created_at, AIUsage.status).where(AIUsage.created_at >= since)).all()
    ai_by_day = defaultdict(lambda: {"requests": 0, "failures": 0})
    for created, st in ai_rows:
        d = ai_by_day[created.date().isoformat()]
        d["requests"] += 1
        d["failures"] += st != "success"
    signups = defaultdict(int)
    for created in db.scalars(select(User.created_at).where(User.created_at >= since)):
        signups[created.date().isoformat()] += 1
    return {
        "users_total": _count(db, select(func.count(User.id))),
        "users_active": _count(db, select(func.count(User.id)).where(User.status == "active")),
        "users_suspended": _count(db, select(func.count(User.id)).where(User.status == "suspended")),
        "study_sets": _count(db, select(func.count(StudySet.id))),
        "quiz_attempts": _count(db, select(func.count(QuizAttempt.id))),
        "ai_requests": _count(db, select(func.count(AIUsage.id))),
        "ai_failures": _count(db, select(func.count(AIUsage.id)).where(AIUsage.status != "success")),
        "ai_over_time": [{"date": k, **v} for k, v in sorted(ai_by_day.items())],
        "signups_over_time": [{"date": k, "signups": v} for k, v in sorted(signups.items())],
    }


@router.get("/users", response_model=Page)
def list_users(q: str | None = Query(None, max_length=100), user_status: str | None = Query(None, alias="status", pattern="^(active|suspended)$"),
               role: str | None = Query(None, pattern="^(student|admin)$"), page: int = Query(1, ge=1),
               page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    stmt = select(User)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(User.email.ilike(like) | User.name.ilike(like))
    if user_status:
        stmt = stmt.where(User.status == user_status)
    if role:
        stmt = stmt.where(User.role == role)
    total = _count(db, select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(User.created_at.desc(), User.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return Page(items=[UserOut.model_validate(u) for u in rows], total=total, page=page, page_size=page_size)


@router.patch("/users/{user_id}/status", response_model=UserOut)
def set_user_status(user_id: int, data: UserStatusIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if target.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot change your own account status")
    if target.role == "admin" and data.status == "suspended":
        others = _count(db, select(func.count(User.id)).where(User.role == "admin", User.status == "active", User.id != target.id))
        if others == 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot suspend the last active administrator")
    if target.status != data.status:
        old = target.status
        target.status = data.status
        if data.status == "suspended":  # kill existing sessions immediately
            for t in db.scalars(select(RefreshToken).where(RefreshToken.user_id == target.id, RefreshToken.revoked.is_(False))):
                t.revoked = True
        audit.record(db, admin.id, f"user.{data.status}", "user", target.id, {"from": old, "to": data.status})
        db.commit()
    return target


@router.get("/feedback", response_model=Page)
def list_feedback(fb_status: str | None = Query(None, alias="status", pattern="^(new|reviewed|resolved)$"),
                  page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    stmt = select(Feedback)
    if fb_status:
        stmt = stmt.where(Feedback.status == fb_status)
    total = _count(db, select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Feedback.created_at.desc(), Feedback.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return Page(items=[FeedbackOut.model_validate(f) for f in rows], total=total, page=page, page_size=page_size)


@router.patch("/feedback/{feedback_id}", response_model=FeedbackOut)
def set_feedback_status(feedback_id: int, data: FeedbackStatusIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    fb = db.get(Feedback, feedback_id)
    if not fb:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Feedback not found")
    fb.status = data.status
    audit.record(db, admin.id, "feedback.status", "feedback", fb.id, {"status": data.status})
    db.commit()
    return fb


@router.get("/audit-logs", response_model=Page)
def audit_logs(page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100), db: Session = Depends(get_db)):
    total = _count(db, select(func.count(AuditLog.id)))
    rows = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
                      .offset((page - 1) * page_size).limit(page_size)).all()
    return Page(items=[AuditLogOut.model_validate(r) for r in rows], total=total, page=page, page_size=page_size)


@router.get("/settings")
def get_settings_view(db: Session = Depends(get_db)):
    return {"ai_daily_limit_per_user": generation.daily_limit(db), "ai_provider": settings.AI_PROVIDER,
            "ai_model": settings.GEMINI_MODEL if settings.AI_PROVIDER == "gemini" else None,
            "max_questions": settings.AI_MAX_QUESTIONS}


@router.put("/settings")
def update_settings(data: SettingsIn, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    row = db.get(AppSetting, "ai_daily_limit_per_user")
    old = row.value if row else str(settings.AI_DAILY_LIMIT_PER_USER)
    if row:
        row.value = str(data.ai_daily_limit_per_user)
    else:
        db.add(AppSetting(key="ai_daily_limit_per_user", value=str(data.ai_daily_limit_per_user)))
    audit.record(db, admin.id, "settings.update", "setting", "ai_daily_limit_per_user",
                 {"from": old, "to": data.ai_daily_limit_per_user})
    db.commit()
    return {"ai_daily_limit_per_user": data.ai_daily_limit_per_user}


@router.get("/health")
def health(db: Session = Depends(get_db)):
    """Operational status. Booleans only: never returns keys, URLs or credentials."""
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {"database": "up" if db_ok else "down", "environment": settings.ENVIRONMENT,
            "ai_configured": generation.ai_available(), "ai_provider": settings.AI_PROVIDER,
            "email_configured": settings.email_configured, "api_docs_enabled": settings.ENABLE_API_DOCS}
