from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.common import get_owned_set
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import QuizAttempt, StudySet, User
from app.schemas.study import AnswerReview, AttemptResult, AttemptSubmit, AttemptSummary, Page

router = APIRouter(tags=["attempts"])


def pct(correct: int, total: int) -> float:
    return round(100 * correct / total, 1) if total else 0.0


def score_attempt(questions, submitted) -> tuple[list[dict], int]:
    """Authoritative scoring. Only question_id + selected_index are trusted from the client;
    correctness is always computed from the stored answer key."""
    chosen = {a.question_id: a.selected_index for a in submitted}
    results, correct = [], 0
    for q in questions:
        sel = chosen.get(q.id)
        if sel is not None and sel >= len(q.options):
            sel = None  # out-of-range index counts as unanswered
        ok = sel is not None and sel == q.correct_index
        correct += ok
        results.append({"question_id": q.id, "selected_index": sel, "is_correct": ok})
    return results, correct


def _result(attempt: QuizAttempt, questions_by_id: dict) -> AttemptResult:
    review = []
    for a in attempt.answers:
        q = questions_by_id.get(a["question_id"])
        if not q:  # question deleted after the attempt
            continue
        review.append(AnswerReview(question_id=q.id, text=q.text, options=q.options, selected_index=a["selected_index"],
                                   correct_index=q.correct_index, is_correct=a["is_correct"], explanation=q.explanation))
    base = AttemptSummary.model_validate(attempt)
    base.percentage = pct(attempt.correct_count, attempt.total_questions)
    base.study_set_title = attempt.study_set.title if attempt.study_set else None
    return AttemptResult(**base.model_dump(), review=review)


@router.post("/study-sets/{set_id}/attempts", response_model=AttemptResult, status_code=201)
def submit_attempt(set_id: int, data: AttemptSubmit, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = get_owned_set(db, set_id, user)
    if not s.questions:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This study set has no questions")
    existing = db.scalar(select(QuizAttempt).where(QuizAttempt.user_id == user.id, QuizAttempt.client_token == data.client_token))
    if existing:  # duplicate submit (double click / retry): return the original result
        return _result(existing, {q.id: q for q in s.questions})
    answers, correct = score_attempt(s.questions, data.answers)
    total = len(s.questions)
    attempt = QuizAttempt(user_id=user.id, study_set_id=s.id, score=correct, total_questions=total, correct_count=correct,
                          incorrect_count=total - correct, duration_seconds=data.duration_seconds, answers=answers,
                          client_token=data.client_token)
    db.add(attempt)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        attempt = db.scalar(select(QuizAttempt).where(QuizAttempt.user_id == user.id, QuizAttempt.client_token == data.client_token))
    return _result(attempt, {q.id: q for q in s.questions})


@router.get("/attempts", response_model=Page)
def list_attempts(study_set_id: int | None = None, page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=50),
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(QuizAttempt).where(QuizAttempt.user_id == user.id)
    if study_set_id:
        stmt = stmt.where(QuizAttempt.study_set_id == study_set_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc())
                      .offset((page - 1) * page_size).limit(page_size)).all()
    items = []
    for a in rows:
        item = AttemptSummary.model_validate(a)
        item.percentage = pct(a.correct_count, a.total_questions)
        item.study_set_title = a.study_set.title if a.study_set else None
        items.append(item)
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/attempts/{attempt_id}", response_model=AttemptResult)
def get_attempt(attempt_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = db.scalar(select(QuizAttempt).where(QuizAttempt.id == attempt_id, QuizAttempt.user_id == user.id))
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attempt not found")
    s = db.get(StudySet, a.study_set_id)
    return _result(a, {q.id: q for q in s.questions})
