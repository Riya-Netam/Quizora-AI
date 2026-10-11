from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ENVIRONMENT: Literal["development", "production", "test"] = "development"
    DEBUG: bool = False

    DATABASE_URL: str = "sqlite:///./quizora_dev.db"

    JWT_SECRET_KEY: str = "change-me-generate-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_EXPIRE_MINUTES: int = 30
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"

    FRONTEND_ORIGIN: str = "http://localhost:5173"
    ADMIN_EMAIL: str = ""
    ENABLE_API_DOCS: bool = True

    AI_PROVIDER: Literal["gemini", "demo"] = "gemini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    AI_DAILY_LIMIT_PER_USER: int = 10
    AI_MAX_QUESTIONS: int = 30
    AI_MAX_INPUT_CHARS: int = 30000
    AI_MAX_RETRIES: int = 2

    MAX_UPLOAD_MB: int = 10
    MAX_PDF_PAGES: int = 60

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def email_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_FROM)

    @model_validator(mode="after")
    def _validate_production(self) -> "Settings":
        if self.ENVIRONMENT == "production":
            problems = []
            if len(self.JWT_SECRET_KEY) < 32 or self.JWT_SECRET_KEY.startswith("change-me"):
                problems.append("JWT_SECRET_KEY must be a random string of 32+ characters")
            if self.DATABASE_URL.startswith("sqlite"):
                problems.append("DATABASE_URL must be PostgreSQL in production")
            if not self.COOKIE_SECURE:
                problems.append("COOKIE_SECURE must be true in production")
            if self.DEBUG:
                problems.append("DEBUG must be false in production")
            if "localhost" in self.FRONTEND_ORIGIN:
                problems.append("FRONTEND_ORIGIN must be your deployed frontend URL")
            if problems:
                raise ValueError("Invalid production configuration: " + "; ".join(problems))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
