from abc import ABC, abstractmethod
from dataclasses import dataclass


class AIError(Exception):
    """Base class. `user_message` is safe to show to end users."""
    code = "ai_error"
    user_message = "AI generation failed. Please try again."
    retryable = False


class AITransientError(AIError):
    code = "ai_transient"
    user_message = "The AI service is temporarily unavailable. Please try again in a moment."
    retryable = True


class AIRateLimitError(AIError):
    code = "ai_rate_limited"
    user_message = "The AI provider's usage quota has been reached. Please try again later."
    retryable = False


class AIConfigError(AIError):
    code = "ai_not_configured"
    user_message = "AI generation is not configured on this server. Try Demo Mode instead."


class AIInvalidOutputError(AIError):
    code = "ai_invalid_output"
    user_message = "The AI returned content that could not be validated. Please try again."
    retryable = True


@dataclass
class ProviderResult:
    data: dict
    prompt_tokens: int | None = None
    completion_tokens: int | None = None


class AIProvider(ABC):
    name: str

    @abstractmethod
    def generate_structured(self, prompt: str) -> ProviderResult:
        """Return parsed JSON matching RawContent, or raise an AIError subclass."""
