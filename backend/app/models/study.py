from datetime import datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StudySet(Base):
    __tablename__ = "study_sets"
    __table_args__ = (Index("ix_study_sets_owner_created", "owner_id", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    source_type: Mapped[str] = mapped_column(String(20))  # topic | notes | pdf | demo | manual
    topic: Mapped[str | None] = mapped_column(String(200))
    difficulty: Mapped[str] = mapped_column(String(10), default="medium", server_default="medium")
    is_demo: Mapped[bool] = mapped_column(default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner = relationship("User", back_populates="study_sets")
    questions = relationship(
        "Question", back_populates="study_set", cascade="all, delete-orphan", order_by="Question.position"
    )
    flashcards = relationship(
        "Flashcard", back_populates="study_set", cascade="all, delete-orphan", order_by="Flashcard.position"
    )
    attempts = relationship("QuizAttempt", back_populates="study_set", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (CheckConstraint("position >= 0", name="position_nonneg"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    study_set_id: Mapped[int] = mapped_column(ForeignKey("study_sets.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    question_type: Mapped[str] = mapped_column(String(20), default="mcq", server_default="mcq")
    options: Mapped[list] = mapped_column(JSON)  # list[str]; validated by Pydantic
    correct_index: Mapped[int] = mapped_column(Integer)
    explanation: Mapped[str] = mapped_column(Text)
    difficulty: Mapped[str] = mapped_column(String(10), default="medium", server_default="medium")
    position: Mapped[int] = mapped_column(Integer, default=0)

    study_set = relationship("StudySet", back_populates="questions")


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(primary_key=True)
    study_set_id: Mapped[int] = mapped_column(ForeignKey("study_sets.id", ondelete="CASCADE"), index=True)
    front: Mapped[str] = mapped_column(Text)
    back: Mapped[str] = mapped_column(Text)
    position: Mapped[int] = mapped_column(Integer, default=0)

    study_set = relationship("StudySet", back_populates="flashcards")
    reviews = relationship("FlashcardReview", back_populates="flashcard", cascade="all, delete-orphan")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    __table_args__ = (
        Index("ix_attempts_user_created", "user_id", "created_at"),
        UniqueConstraint("user_id", "client_token", name="uq_attempts_user_client_token"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    study_set_id: Mapped[int] = mapped_column(ForeignKey("study_sets.id", ondelete="CASCADE"), index=True)
    score: Mapped[int] = mapped_column(Integer)
    total_questions: Mapped[int] = mapped_column(Integer)
    correct_count: Mapped[int] = mapped_column(Integer)
    incorrect_count: Mapped[int] = mapped_column(Integer)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    answers: Mapped[list] = mapped_column(JSON)  # [{question_id, selected_index, is_correct}]
    client_token: Mapped[str | None] = mapped_column(String(64))  # idempotency key: blocks double submits
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="attempts")
    study_set = relationship("StudySet", back_populates="attempts")


class FlashcardReview(Base):
    __tablename__ = "flashcard_reviews"
    __table_args__ = (Index("ix_reviews_user_created", "user_id", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    flashcard_id: Mapped[int] = mapped_column(ForeignKey("flashcards.id", ondelete="CASCADE"), index=True)
    confidence: Mapped[str] = mapped_column(String(10))  # easy | medium | hard
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    flashcard = relationship("Flashcard", back_populates="reviews")
