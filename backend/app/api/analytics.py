from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.attempts import pct
from app.api.deps import get_current_user
from app.core.security import utcnow
from app.db.session import get_db
from app.models import FlashcardReview, Question, QuizAttempt, StudySet, User
from app.schemas.study import AttemptSummary, StudySetSummary

router = APIRouter(prefix="/analytics", tags=["analytics"])

MAX_ROWS = 5000  # safety bound; a student will not realistically reach this


def _day(dt) -> date:
    return dt.date()


def _streak(days: set[date]) -> int:
    """Consecutive active days ending today (or yesterday, so the streak isn't lost until the day ends)."""
    today = utcnow().date()
    cursor = today if today in days else today - timedelta(days=1)
    n = 0
    while cursor in days:
        n += 1
        cursor -= timedelta(days=1)
    return n


def _activity_days(db: Session, user_id: int) -> set[date]:
    a = db.scalars(select(QuizAttempt.created_at).where(QuizAttempt.user_id == user_id).limit(MAX_ROWS)).all()
    r = db.scalars(select(FlashcardReview.created_at).where(FlashcardReview.user_id == user_id).limit(MAX_ROWS)).all()
    return {_day(x) for x in [*a, *r]}


@router.get("/dashboard")
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sets_total = db.scalar(select(func.count(StudySet.id)).where(StudySet.owner_id == user.id)) or 0
    attempts = db.scalars(select(QuizAttempt).where(QuizAttempt.user_id == user.id)
                          .order_by(QuizAttempt.created_at.desc()).limit(MAX_ROWS)).all()
    avg = round(sum(pct(a.correct_count, a.total_questions) for a in attempts) / len(attempts), 1) if attempts else None
    reviews_total = db.scalar(select(func.count(FlashcardReview.id)).where(FlashcardReview.user_id == user.id)) or 0
    recent_sets = db.scalars(select(StudySet).where(StudySet.owner_id == user.id)
                             .order_by(StudySet.created_at.desc()).limit(5)).all()
    summaries = []
    for s in recent_sets:
        item = StudySetSummary.model_validate(s)
        item.question_count = db.scalar(select(func.count(Question.id)).where(Question.study_set_id == s.id)) or 0
        item.flashcard_count = len(s.flashcards)
        summaries.append(item)
    recent_attempts = []
    for a in attempts[:5]:
        item = AttemptSummary.model_validate(a)
        item.percentage = pct(a.correct_count, a.total_questions)
        item.study_set_title = a.study_set.title if a.study_set else None
        recent_attempts.append(item)
    return {
        "total_study_sets": sets_total,
        "total_attempts": len(attempts),
        "average_score": avg,
        "flashcard_reviews": reviews_total,
        "streak_days": _streak(_activity_days(db, user.id)),
        "recent_sets": summaries,
        "recent_attempts": recent_attempts,
    }


@router.get("/overview")
def overview(days: int = Query(30, ge=7, le=365), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    since = utcnow() - timedelta(days=days)
    attempts = db.scalars(select(QuizAttempt).where(QuizAttempt.user_id == user.id, QuizAttempt.created_at >= since)
                          .order_by(QuizAttempt.created_at).limit(MAX_ROWS)).all()
    per_day = defaultdict(lambda: {"attempts": 0, "correct": 0, "incorrect": 0, "pct_sum": 0.0})
    per_set = defaultdict(lambda: {"attempts": 0, "pct_sum": 0.0})
    for a in attempts:
        d = per_day[_day(a.created_at).isoformat()]
        d["attempts"] += 1
        d["correct"] += a.correct_count
        d["incorrect"] += a.incorrect_count
        d["pct_sum"] += pct(a.correct_count, a.total_questions)
        s = per_set[a.study_set_id]
        s["attempts"] += 1
        s["pct_sum"] += pct(a.correct_count, a.total_questions)
    titles = dict(db.execute(select(StudySet.id, StudySet.title).where(StudySet.id.in_(list(per_set) or [0]))).all()) if per_set else {}
    
    by_set = sorted(
        ({"study_set_id": k, "title": titles.get(k, "Deleted set"), "attempts": v["attempts"],
          "average_score": round(v["pct_sum"] / v["attempts"], 1)} for k, v in per_set.items()),
        key=lambda x: x["attempts"], reverse=True)[:10]
    review_rows = db.scalars(select(FlashcardReview.created_at).where(
        FlashcardReview.user_id == user.id, FlashcardReview.created_at >= since).limit(MAX_ROWS)).all()
    reviews = defaultdict(int)
    for r in review_rows:
        reviews[_day(r).isoformat()] += 1
    return {
        "days": days,
        "attempts_over_time": [{"date": k, "attempts": v["attempts"], "average_score": round(v["pct_sum"] / v["attempts"], 1),
                                "correct": v["correct"], "incorrect": v["incorrect"]} for k, v in sorted(per_day.items())],
        "accuracy_by_set": by_set,
        "flashcard_reviews_over_time": [{"date": k, "reviews": v} for k, v in sorted(reviews.items())],
        "has_data": bool(attempts or review_rows),
    }
