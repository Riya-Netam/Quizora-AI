from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.study import Difficulty

Output = Literal["quiz", "flashcards", "both"]


class GenerateTopicIn(BaseModel):
    topic: str = Field(min_length=2, max_length=200)
    difficulty: Difficulty = "medium"
    num_questions: int = Field(default=10, ge=1, le=100)
    num_flashcards: int = Field(default=10, ge=0, le=50)
    output: Output = "both"
    demo: bool = False


class GenerateNotesIn(BaseModel):
    title: str = Field(default="My notes", min_length=1, max_length=200)
    notes: str = Field(min_length=50, max_length=60000)
    difficulty: Difficulty = "medium"
    num_questions: int = Field(default=10, ge=1, le=100)
    num_flashcards: int = Field(default=10, ge=0, le=50)
    output: Output = "both"
    demo: bool = False


# Loose schemas given to the model as the response format. Strict validation happens afterwards
# with the real study schemas, so one bad item never silently reaches the database.
class RawQuestion(BaseModel):
    text: str
    options: list[str]
    correct_index: int
    explanation: str
    difficulty: str = "medium"


class RawFlashcard(BaseModel):
    front: str
    back: str


class RawContent(BaseModel):
    questions: list[RawQuestion] = []
    flashcards: list[RawFlashcard] = []


class GenerationStatus(BaseModel):
    provider: str
    ai_available: bool
    demo_available: bool = True
    daily_limit: int
    used_today: int
    remaining_today: int
