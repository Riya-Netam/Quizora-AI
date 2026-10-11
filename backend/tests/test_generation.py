import pytest

from app.core.config import settings
from app.models import AIUsage, StudySet
from app.services import generation
from app.services.ai.base import AIProvider, AITransientError, ProviderResult

API = "/api/v1"

GOOD = {
    "questions": [
        {"text": "What is the capital of France?", "options": ["Paris", "Rome", "Madrid", "Berlin"], "correct_index": 0,
         "explanation": "Paris is the capital.", "difficulty": "easy"},
        {"text": "What is 2 + 2?", "options": ["3", "4", "5", "6"], "correct_index": 1, "explanation": "Basic arithmetic.",
         "difficulty": "easy"},
    ],
    "flashcards": [{"front": "Paris", "back": "Capital of France"}, {"front": "Rome", "back": "Capital of Italy"}],
}
REQ = {"topic": "Geography", "difficulty": "easy", "num_questions": 2, "num_flashcards": 2, "output": "both"}


class FakeProvider(AIProvider):
    name = "fake"

    def __init__(self, data=None, fail_times=0):
        self.data, self.fail_times, self.calls = data if data is not None else GOOD, fail_times, 0

    def generate_structured(self, prompt):
        self.calls += 1
        if self.calls <= self.fail_times:
            raise AITransientError()
        return ProviderResult(data=self.data, prompt_tokens=10, completion_tokens=20)


@pytest.fixture
def use_provider(monkeypatch):
    def _use(provider):
        monkeypatch.setattr(generation, "get_provider", lambda: provider)
        return provider
    return _use


def test_valid_generation_saved(student, use_provider, db):
    use_provider(FakeProvider())
    r = student.post(f"{API}/generate/topic", json=REQ)
    assert r.status_code == 201
    body = r.json()
    assert body["question_count"] == 2 and body["flashcard_count"] == 2 and body["is_demo"] is False
    assert db.query(AIUsage).filter_by(status="success").count() == 1


def test_transient_error_is_retried(student, use_provider):
    p = use_provider(FakeProvider(fail_times=1))
    assert student.post(f"{API}/generate/topic", json=REQ).status_code == 201
    assert p.calls == 2


def test_invalid_output_is_rejected_and_nothing_saved(student, use_provider, db):
    bad = {"questions": [{"text": "Broken question here", "options": ["only one"], "correct_index": 5, "explanation": "x"}],
           "flashcards": []}
    use_provider(FakeProvider(data=bad))
    r = student.post(f"{API}/generate/topic", json=REQ)
    assert r.status_code == 502
    assert db.query(StudySet).count() == 0
    assert db.query(AIUsage).filter_by(status="failed").count() == 1


def test_duplicate_and_malformed_items_filtered(student, use_provider, db):
    data = {"questions": [GOOD["questions"][0], GOOD["questions"][0],  # duplicate
                          {"text": "Same options question?", "options": ["a", "a", "b", "c"], "correct_index": 0, "explanation": "x"},
                          GOOD["questions"][1]], "flashcards": GOOD["flashcards"]}
    use_provider(FakeProvider(data=data))
    r = student.post(f"{API}/generate/topic", json=REQ)
    assert r.status_code == 201 and r.json()["question_count"] == 2


def test_daily_limit_enforced(student, use_provider, monkeypatch):
    monkeypatch.setattr(settings, "AI_DAILY_LIMIT_PER_USER", 1)
    use_provider(FakeProvider())
    assert student.post(f"{API}/generate/topic", json=REQ).status_code == 201
    assert student.post(f"{API}/generate/topic", json=REQ).status_code == 429
    st = student.get(f"{API}/generate/status").json()
    assert st["remaining_today"] == 0


def test_demo_mode_is_labelled_and_makes_no_ai_call(student, use_provider, db):
    p = use_provider(FakeProvider())
    r = student.post(f"{API}/generate/topic", json={**REQ, "demo": True})
    assert r.status_code == 201 and r.json()["is_demo"] is True and r.json()["source_type"] == "demo"
    assert p.calls == 0
    assert db.query(AIUsage).count() == 0


def test_missing_api_key_gives_clear_error(student):
    r = student.post(f"{API}/generate/topic", json=REQ)  # no provider injected, no key configured
    assert r.status_code == 503 and "not configured" in r.json()["detail"].lower()


def test_notes_too_short_rejected(student):
    assert student.post(f"{API}/generate/notes", json={"notes": "too short"}).status_code == 422


def test_pdf_upload_validation(student):
    r = student.post(f"{API}/generate/pdf", files={"file": ("notes.txt", b"hello", "text/plain")})
    assert r.status_code == 400
    r = student.post(f"{API}/generate/pdf", files={"file": ("fake.pdf", b"this is not a pdf at all", "application/pdf")})
    assert r.status_code == 400
    r = student.post(f"{API}/generate/pdf", files={"file": ("empty.pdf", b"", "application/pdf")})
    assert r.status_code == 400
