from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import StudySet, User


def get_owned_set(db: Session, set_id: int, user: User) -> StudySet:
    """404 (not 403) for other people's sets so IDs can't be probed."""
    study_set = db.scalar(select(StudySet).where(StudySet.id == set_id, StudySet.owner_id == user.id))
    if not study_set:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Study set not found")
    return study_set
