import json
import logging

from app.core.config import settings
from app.schemas.ai import RawContent
from app.services.ai.base import (AIConfigError, AIInvalidOutputError, AIProvider, AIRateLimitError, AITransientError,
                                  AIError, ProviderResult)

log = logging.getLogger("quizora.ai.gemini")


class GeminiProvider(AIProvider):
    name = "gemini"

    def __init__(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise AIConfigError()
        from google import genai  # imported lazily so the app (and tests) run without the SDK configured

        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def generate_structured(self, prompt: str) -> ProviderResult:
        from google.genai import errors, types

        try:
            resp = self._client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=RawContent,
                    temperature=0.6,
                ),
            )
        except errors.APIError as e:
            code = getattr(e, "code", None)
            log.warning("Gemini API error code=%s", code)  # message omitted: may echo prompt content
            if code == 429:
                raise AIRateLimitError() from e
            if code in (500, 502, 503, 504):
                raise AITransientError() from e
            raise AIError() from e
        except (TimeoutError, ConnectionError) as e:
            raise AITransientError() from e

        text = (getattr(resp, "text", None) or "").strip()
        if not text:
            raise AIInvalidOutputError()
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            raise AIInvalidOutputError() from e
        usage = getattr(resp, "usage_metadata", None)
        return ProviderResult(
            data=data,
            prompt_tokens=getattr(usage, "prompt_token_count", None),
            completion_tokens=getattr(usage, "candidates_token_count", None),
        )
