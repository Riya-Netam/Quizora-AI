from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.common import get_owned_set
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Flashcard, FlashcardReview, Question, StudySet, User
from app.schemas.auth import MessageOut
from app.schemas.study import (FlashcardIn, FlashcardOut, FlashcardReviewIn, Page, QuestionCreate, QuestionUpdate,
                               QuestionWithKey, StudySetCreate, StudySetDetail, StudySetSummary, StudySetUpdate)

router = APIRouter(tags=["study-sets"])

MAX_QUESTIONS_PER_SET = 100
MAX_FLASHCARDS_PER_SET = 200


def _summary(db: Session, s: StudySet) -> StudySetSummary:
    out = StudySetSummary.model_validate(s)
    out.question_count = db.scalar(select(func.count(Question.id)).where(Question.study_set_id == s.id)) or 0
    out.flashcard_count = db.scalar(select(func.count(Flashcard.id)).where(Flashcard.study_set_id == s.id)) or 0
    return out


@router.get("/study-sets", response_model=Page)
def list_sets(q: str | None = Query(None, max_length=100),
              source_type: str | None = Query(None, pattern="^(topic|notes|pdf|demo|manual)$"),
              difficulty: str | None = Query(None, pattern="^(easy|medium|hard)$"),
              sort: str = Query("newest", pattern="^(newest|oldest|title)$"),
              page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=50),
              user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(StudySet).where(StudySet.owner_id == user.id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(StudySet.title.ilike(like) | StudySet.topic.ilike(like))
    if source_type:
        stmt = stmt.where(StudySet.source_type == source_type)
    if difficulty:
        stmt = stmt.where(StudySet.difficulty == difficulty)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    order = {"newest": StudySet.created_at.desc(), "oldest": StudySet.created_at.asc(), "title": StudySet.title.asc()}[sort]
    rows = db.scalars(stmt.order_by(order, StudySet.id.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return Page(items=[_summary(db, s) for s in rows], total=total, page=page, page_size=page_size)


@router.post("/study-sets", response_model=StudySetSummary, status_code=201)
def create_set(data: StudySetCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = StudySet(owner_id=user.id, source_type="manual", **data.model_dump())
    db.add(s)
    db.commit()
    return _summary(db, s)


@router.get("/study-sets/{set_id}", response_model=StudySetDetail)
def get_set(set_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = get_owned_set(db, set_id, user)
    base = _summary(db, s)
    return StudySetDetail(**base.model_dump(), questions=s.questions, flashcards=s.flashcards)


@router.get("/study-sets/{set_id}/answer-key", response_model=list[QuestionWithKey])
def answer_key(set_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Owner-only, for the editor. The quiz-taking screen never calls this."""
    return get_owned_set(db, set_id, user).questions


@router.patch("/study-sets/{set_id}", response_model=StudySetSummary)
def update_set(set_id: int, data: StudySetUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = get_owned_set(db, set_id, user)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    return _summary(db, s)


@router.delete("/study-sets/{set_id}", response_model=MessageOut)
def delete_set(set_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(get_owned_set(db, set_id, user))
    db.commit()
    return MessageOut(message="Study set deleted")


# ---- questions ----
@router.post("/study-sets/{set_id}/questions", response_model=QuestionWithKey, status_code=201)
def add_question(set_id: int, data: QuestionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = get_owned_set(db, set_id, user)
    if len(s.questions) >= MAX_QUESTIONS_PER_SET:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"A study set can have at most {MAX_QUESTIONS_PER_SET} questions")
    position = (max((q.position for q in s.questions), default=-1)) + 1
    q = Question(study_set_id=s.id, position=position, question_type="mcq", **data.model_dump())
    db.add(q)
    db.commit()
    return q


def _owned_question(db: Session, question_id: int, user: User) -> Question:
    q = db.scalar(select(Question).join(StudySet).where(Question.id == question_id, StudySet.owner_id == user.id))
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    return q


@router.put("/questions/{question_id}", response_model=QuestionWithKey)
def update_question(question_id: int, data: QuestionUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = _owned_question(db, question_id, user)
    for k, v in data.model_dump().items():
        setattr(q, k, v)
    db.commit()
    return q


@router.delete("/questions/{question_id}", response_model=MessageOut)
def delete_question(question_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(_owned_question(db, question_id, user))
    db.commit()
    return MessageOut(message="Question deleted")


# ---- flashcards ----
@router.post("/study-sets/{set_id}/flashcards", response_model=FlashcardOut, status_code=201)
def add_flashcard(set_id: int, data: FlashcardIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = get_owned_set(db, set_id, user)
    if len(s.flashcards) >= MAX_FLASHCARDS_PER_SET:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"A study set can have at most {MAX_FLASHCARDS_PER_SET} flashcards")
    position = (max((c.position for c in s.flashcards), default=-1)) + 1
    c = Flashcard(study_set_id=s.id, position=position, front=data.front.strip(), back=data.back.strip())
    db.add(c)
    db.commit()
    return c


def _owned_card(db: Session, card_id: int, user: User) -> Flashcard:
    c = db.scalar(select(Flashcard).join(StudySet).where(Flashcard.id == card_id, StudySet.owner_id == user.id))
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Flashcard not found")
    return c


@router.put("/flashcards/{card_id}", response_model=FlashcardOut)
def update_flashcard(card_id: int, data: FlashcardIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _owned_card(db, card_id, user)
    c.front, c.back = data.front.strip(), data.back.strip()
    db.commit()
    return c


@router.delete("/flashcards/{card_id}", response_model=MessageOut)
def delete_flashcard(card_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(_owned_card(db, card_id, user))
    db.commit()
    return MessageOut(message="Flashcard deleted")


@router.post("/flashcards/{card_id}/review", response_model=MessageOut, status_code=201)
def review_flashcard(card_id: int, data: FlashcardReviewIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = _owned_card(db, card_id, user)
    db.add(FlashcardReview(user_id=user.id, flashcard_id=c.id, confidence=data.confidence))
    db.commit()
    return MessageOut(message="Review saved")


@router.get("/study-sets/{set_id}/flashcard-progress")
def flashcard_progress(set_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Latest confidence per card, so revision mode can resume and prioritise hard cards."""
    s = get_owned_set(db, set_id, user)
    ids = [c.id for c in s.flashcards]
    latest: dict[int, str] = {}
    if ids:
        rows = db.execute(select(FlashcardReview.flashcard_id, FlashcardReview.confidence)
                          .where(FlashcardReview.user_id == user.id, FlashcardReview.flashcard_id.in_(ids))
                          .order_by(FlashcardReview.created_at, FlashcardReview.id)).all()
        for fid, conf in rows:
            latest[fid] = conf
    return {"progress": latest}
