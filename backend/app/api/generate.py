from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models import User
from app.schemas.ai import GenerateNotesIn, GenerateTopicIn, GenerationStatus
from app.schemas.study import StudySetSummary
from app.services import generation
from app.services.ai.base import AIConfigError, AIError, AIRateLimitError
from app.services.pdf import PDFError, extract_pdf_text

router = APIRouter(prefix="/generate", tags=["ai"])


def _run(db: Session, user: User, **kwargs) -> StudySetSummary:
    try:
        s = generation.generate_study_set(db, user, **kwargs)
    except generation.QuotaExceeded:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                            "You've reached your daily AI generation limit. Try again tomorrow, or use Demo Mode.")
    except AIConfigError as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, e.user_message)
    except AIRateLimitError as e:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, e.user_message)
    except AIError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, e.user_message)
    out = StudySetSummary.model_validate(s)
    out.question_count, out.flashcard_count = len(s.questions), len(s.flashcards)
    return out


@router.get("/status", response_model=GenerationStatus)
def gen_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    limit, used = generation.daily_limit(db), generation.used_today(db, user.id)
    return GenerationStatus(provider=settings.AI_PROVIDER, ai_available=generation.ai_available(), daily_limit=limit,
                            used_today=used, remaining_today=max(0, limit - used))


@router.post("/topic", response_model=StudySetSummary, status_code=201)
@limiter.limit("6/minute")
def from_topic(request: Request, data: GenerateTopicIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _run(db, user, source_type="topic", title=f"{data.topic.strip()} ({data.difficulty})", topic=data.topic.strip(),
                material=None, difficulty=data.difficulty, num_q=data.num_questions, num_f=data.num_flashcards,
                output=data.output, demo=data.demo)


@router.post("/notes", response_model=StudySetSummary, status_code=201)
@limiter.limit("6/minute")
def from_notes(request: Request, data: GenerateNotesIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _run(db, user, source_type="notes", title=data.title.strip(), topic=data.title.strip(), material=data.notes,
                difficulty=data.difficulty, num_q=data.num_questions, num_f=data.num_flashcards, output=data.output,
                demo=data.demo)


@router.post("/pdf", response_model=StudySetSummary, status_code=201)
@limiter.limit("4/minute")
async def from_pdf(request: Request, file: UploadFile = File(...), difficulty: str = Form("medium"),
                   num_questions: int = Form(10), num_flashcards: int = Form(10), output: str = Form("both"),
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if difficulty not in ("easy", "medium", "hard") or output not in ("quiz", "flashcards", "both"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid difficulty or output type")
    if not (1 <= num_questions <= 100 and 0 <= num_flashcards <= 50):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid question or flashcard count")
    limit = settings.MAX_UPLOAD_MB * 1024 * 1024
    data = await file.read(limit + 1)  # never read more than the limit into memory
    try:
        text = extract_pdf_text(data, file.filename or "", file.content_type)
    except PDFError as e:
        raise HTTPException(e.status_code, e.message)
    title = (file.filename or "PDF notes").rsplit(".", 1)[0][:200]
    # sync work is pushed to the threadpool so the event loop isn't blocked by the AI call
    from starlette.concurrency import run_in_threadpool
    return await run_in_threadpool(_run, db, user, source_type="pdf", title=title, topic=title, material=text,
                                   difficulty=difficulty, num_q=num_questions, num_f=num_flashcards, output=output,
                                   demo=False)
