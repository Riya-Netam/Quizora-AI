import os
import tempfile

# Must be set BEFORE the app is imported: settings are read at import time.
# Tests always use a throwaway SQLite file, never a real database.
_tmp = tempfile.mkdtemp(prefix="quizora_test_")
os.environ.update({
    "ENVIRONMENT": "test",
    "DATABASE_URL": f"sqlite:///{_tmp}/test.db",
    "JWT_SECRET_KEY": "test-secret-key-that-is-long-enough-0123456789",
    "COOKIE_SECURE": "false",
    "GEMINI_API_KEY": "",
    "ADMIN_EMAIL": "admin@example.com",
})

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.rate_limit import limiter  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Question, StudySet, User  # noqa: E402

limiter.enabled = False  # rate limits are not what these tests check


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


@pytest.fixture
def make_client():
    """Factory so one test can hold several independent browser sessions (separate cookie jars)."""
    clients = []

    def _make() -> TestClient:
        c = TestClient(app)
        clients.append(c)
        return c

    yield _make
    for c in clients:
        c.close()


def sign_in(client: TestClient, email: str, password: str):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    if r.status_code == 200:
        client.headers["X-CSRF-Token"] = client.cookies.get("quizora_csrf", "")
    return r


@pytest.fixture
def register(make_client):
    def _register(email="student@example.com", name="Student", password="correct-horse-1"):
        c = make_client()
        r = c.post("/api/v1/auth/register", json={"name": name, "email": email, "password": password})
        assert r.status_code == 201, r.text
        c.headers["X-CSRF-Token"] = c.cookies.get("quizora_csrf", "")
        return c
    return _register


@pytest.fixture
def student(register):
    return register()


@pytest.fixture
def admin_client(db, make_client):
    db.add(User(name="Admin", email="admin@example.com", password_hash=hash_password("admin-password-123"), role="admin"))
    db.commit()
    c = make_client()
    assert sign_in(c, "admin@example.com", "admin-password-123").status_code == 200
    return c


@pytest.fixture
def make_set(db):
    """Create a study set with 3 questions (correct_index 0,1,2) owned by the given user id."""
    def _make(owner_id: int, title="Sample set") -> StudySet:
        s = StudySet(owner_id=owner_id, title=title, source_type="manual", difficulty="medium")
        db.add(s)
        db.flush()
        for i in range(3):
            db.add(Question(study_set_id=s.id, position=i, text=f"Question number {i}?", options=["A", "B", "C", "D"],
                            correct_index=i, explanation=f"Because {i}", difficulty="medium"))
        db.commit()
        db.refresh(s)
        return s
    return _make
