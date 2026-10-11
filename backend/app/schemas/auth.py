from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _normalize_email(v: str) -> str:
    return v.strip().lower()


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v

    @field_validator("email")
    @classmethod
    def _norm(cls, v: str) -> str:
        return _normalize_email(v)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def _norm(cls, v: str) -> str:
        return _normalize_email(v)


class ForgotPasswordIn(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def _norm(cls, v: str) -> str:
        return _normalize_email(v)


class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ProfileUpdateIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class DeleteAccountIn(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: str
    status: str
    email_verified: bool
    created_at: datetime
    last_login_at: datetime | None = None


class MessageOut(BaseModel):
    message: str
