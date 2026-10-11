from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class FeedbackIn(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    message: str = Field(min_length=10, max_length=2000)

    @field_validator("email")
    @classmethod
    def _norm(cls, v):
        return v.strip().lower() if v else v


class FeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str | None
    email: str | None
    message: str
    status: str
    created_at: datetime


class FeedbackStatusIn(BaseModel):
    status: Literal["new", "reviewed", "resolved"]


class UserStatusIn(BaseModel):
    status: Literal["active", "suspended"]


class SettingsIn(BaseModel):
    ai_daily_limit_per_user: int = Field(ge=0, le=1000)


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    actor_id: int | None
    action: str
    target_type: str | None
    target_id: str | None
    meta: dict | None
    created_at: datetime
