from datetime import timedelta

from app.core.security import generate_opaque_token, hash_opaque_token, utcnow
from app.models import PasswordResetToken, User
from tests.conftest import sign_in

API = "/api/v1"


def test_register_success_and_password_not_plaintext(student, db):
    r = student.get(f"{API}/auth/me")
    assert r.status_code == 200 and r.json()["email"] == "student@example.com"
    user = db.query(User).one()
    assert user.password_hash != "correct-horse-1" and user.password_hash.startswith("$argon2")


def test_duplicate_email_rejected_case_insensitive(register, make_client):
    register("dup@example.com")
    r = make_client().post(f"{API}/auth/register", json={"name": "X", "email": "DUP@Example.com", "password": "another-pass-1"})
    assert r.status_code == 409


def test_register_cannot_choose_role(make_client, db):
    c = make_client()
    r = c.post(f"{API}/auth/register", json={"name": "Sneaky", "email": "s@example.com", "password": "long-enough-1", "role": "admin"})
    assert r.status_code == 201
    assert r.json()["role"] == "student"
    assert db.query(User).one().role == "student"


def test_weak_password_rejected(make_client):
    r = make_client().post(f"{API}/auth/register", json={"name": "X", "email": "x@example.com", "password": "short"})
    assert r.status_code == 422


def test_login_valid_and_invalid(register, make_client):
    register("login@example.com", password="right-password-1")
    assert sign_in(make_client(), "login@example.com", "right-password-1").status_code == 200
    wrong = make_client().post(f"{API}/auth/login", json={"email": "login@example.com", "password": "wrong-password"})
    unknown = make_client().post(f"{API}/auth/login", json={"email": "nobody@example.com", "password": "whatever-1"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()  # no user enumeration


def test_protected_endpoint_requires_auth(make_client):
    assert make_client().get(f"{API}/study-sets").status_code == 401
    assert make_client().get(f"{API}/auth/me").status_code == 401


def test_logout_clears_session(student):
    assert student.post(f"{API}/auth/logout").status_code == 200
    student.cookies.clear()
    assert student.get(f"{API}/auth/me").status_code == 401


def test_csrf_required_for_state_changes(student):
    del student.headers["X-CSRF-Token"]
    r = student.post(f"{API}/study-sets", json={"title": "No csrf"})
    assert r.status_code == 403


def test_suspended_user_blocked(student, admin_client, db):
    uid = db.query(User).filter(User.email == "student@example.com").one().id
    assert admin_client.patch(f"{API}/admin/users/{uid}/status", json={"status": "suspended"}).status_code == 200
    assert student.get(f"{API}/auth/me").status_code == 403  # existing session stops working immediately
    assert sign_in(student, "student@example.com", "correct-horse-1").status_code == 403


def _add_reset_token(db, user_id, expires_in):
    token = generate_opaque_token()
    db.add(PasswordResetToken(user_id=user_id, token_hash=hash_opaque_token(token), expires_at=utcnow() + expires_in))
    db.commit()
    return token


def test_reset_token_expired(student, db, make_client):
    uid = db.query(User).one().id
    token = _add_reset_token(db, uid, timedelta(minutes=-1))
    r = make_client().post(f"{API}/auth/reset-password", json={"token": token, "new_password": "brand-new-pass-1"})
    assert r.status_code == 400


def test_reset_token_single_use(student, db, make_client):
    uid = db.query(User).one().id
    token = _add_reset_token(db, uid, timedelta(minutes=10))
    c = make_client()
    assert c.post(f"{API}/auth/reset-password", json={"token": token, "new_password": "brand-new-pass-1"}).status_code == 200
    assert c.post(f"{API}/auth/reset-password", json={"token": token, "new_password": "another-new-pass-2"}).status_code == 400
    assert sign_in(make_client(), "student@example.com", "brand-new-pass-1").status_code == 200


def test_forgot_password_reports_unconfigured_email(make_client):
    r = make_client().post(f"{API}/auth/forgot-password", json={"email": "a@example.com"})
    assert r.status_code == 503  # honest: no SMTP configured in tests
