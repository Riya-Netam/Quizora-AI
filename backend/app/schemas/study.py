from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Difficulty = Literal["easy", "medium", "hard"]
Confidence = Literal["easy", "medium", "hard"]


class QuestionBase(BaseModel):
    text: str = Field(min_length=5, max_length=1000)
    options: list[str] = Field(min_length=2, max_length=6)
    correct_index: int = Field(ge=0)
    explanation: str = Field(min_length=1, max_length=2000)
    difficulty: Difficulty = "medium"

    @field_validator("options")
    @classmethod
    def _clean_options(cls, v: list[str]) -> list[str]:
        v = [o.strip() for o in v]
        if any(not o or len(o) > 500 for o in v):
            raise ValueError("Options must be non-empty and under 500 characters")
        if len({o.lower() for o in v}) != len(v):
            raise ValueError("Options must be unique")
        return v

    @model_validator(mode="after")
    def _check_correct(self):
        if self.correct_index >= len(self.options):
            raise ValueError("correct_index is out of range")
        return self


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(QuestionBase):
    pass


class QuestionPublic(BaseModel):
    """Shown while taking a quiz: deliberately has NO correct answer or explanation."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    text: str
    options: list[str]
    difficulty: str
    position: int


class QuestionWithKey(QuestionPublic):
    correct_index: int
    explanation: str


class FlashcardIn(BaseModel):
    front: str = Field(min_length=1, max_length=1000)
    back: str = Field(min_length=1, max_length=2000)


class FlashcardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    front: str
    back: str
    position: int


class FlashcardReviewIn(BaseModel):
    confidence: Confidence


class StudySetCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    topic: str | None = Field(default=None, max_length=200)
    difficulty: Difficulty = "medium"


class StudySetUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)


class StudySetSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: str | None
    source_type: str
    topic: str | None
    difficulty: str
    is_demo: bool
    question_count: int = 0
    flashcard_count: int = 0
    created_at: datetime
    updated_at: datetime


class StudySetDetail(StudySetSummary):
    questions: list[QuestionPublic]
    flashcards: list[FlashcardOut]


class Page(BaseModel):
    items: list
    total: int
    page: int
    page_size: int


class AnswerIn(BaseModel):
    question_id: int
    selected_index: int | None = Field(default=None, ge=0)  # None = skipped


class AttemptSubmit(BaseModel):
    client_token: str = Field(min_length=8, max_length=64)
    answers: list[AnswerIn] = Field(max_length=100)
    duration_seconds: int | None = Field(default=None, ge=0, le=86400)


class AnswerReview(BaseModel):
    question_id: int
    text: str
    options: list[str]
    selected_index: int | None
    correct_index: int
    is_correct: bool
    explanation: str


class AttemptSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    study_set_id: int
    score: int
    total_questions: int
    correct_count: int
    incorrect_count: int
    percentage: float = 0
    study_set_title: str | None = None
    duration_seconds: int | None
    created_at: datetime


class AttemptResult(AttemptSummary):
    review: list[AnswerReview]
