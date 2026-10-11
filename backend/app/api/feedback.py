from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.deps import get_optional_user
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models import Feedback, User
from app.schemas.auth import MessageOut
from app.schemas.misc import FeedbackIn

router = APIRouter(tags=["feedback"])


@router.post("/feedback", response_model=MessageOut, status_code=201)
@limiter.limit("5/minute")
def submit_feedback(request: Request, data: FeedbackIn, user: User | None = Depends(get_optional_user),
                    db: Session = Depends(get_db)):
    db.add(Feedback(user_id=user.id if user else None, name=data.name or (user.name if user else None),
                    email=data.email or (user.email if user else None), message=data.message.strip()))
    db.commit()
    return MessageOut(message="Thank you! Your feedback has been received.")
