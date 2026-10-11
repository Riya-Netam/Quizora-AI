from app.models import AuditLog, User

API = "/api/v1"


def test_admin_endpoints_forbidden_for_students(student):
    for path in ("/admin/stats", "/admin/users", "/admin/feedback", "/admin/audit-logs", "/admin/settings", "/admin/health"):
        assert student.get(f"{API}{path}").status_code == 403, path


def test_admin_endpoints_require_login(make_client):
    assert make_client().get(f"{API}/admin/stats").status_code == 401


def test_admin_stats_and_users(admin_client, student):
    s = admin_client.get(f"{API}/admin/stats").json()
    assert s["users_total"] == 2 and s["users_active"] == 2
    users = admin_client.get(f"{API}/admin/users", params={"q": "student"}).json()
    assert users["total"] == 1
    assert "password_hash" not in users["items"][0]


def test_suspend_reactivate_audited(admin_client, student, db):
    uid = db.query(User).filter(User.role == "student").one().id
    assert admin_client.patch(f"{API}/admin/users/{uid}/status", json={"status": "suspended"}).json()["status"] == "suspended"
    assert admin_client.patch(f"{API}/admin/users/{uid}/status", json={"status": "active"}).json()["status"] == "active"
    actions = [a.action for a in db.query(AuditLog).all()]
    assert "user.suspended" in actions and "user.active" in actions


def test_admin_cannot_suspend_self_or_last_admin(admin_client, db):
    aid = db.query(User).filter(User.role == "admin").one().id
    assert admin_client.patch(f"{API}/admin/users/{aid}/status", json={"status": "suspended"}).status_code == 400


def test_no_endpoint_lets_a_user_change_role(student, db):
    me = student.get(f"{API}/auth/me").json()
    student.patch(f"{API}/auth/me", json={"name": "New Name", "role": "admin"})
    assert db.query(User).filter(User.id == me["id"]).one().role == "student"
    assert student.patch(f"{API}/admin/users/{me['id']}/status", json={"status": "active"}).status_code == 403


def test_feedback_public_and_admin_review(admin_client, make_client):
    c = make_client()
    assert c.post(f"{API}/feedback", json={"message": "Great app, please add dark mode"}).status_code == 201
    assert c.post(f"{API}/feedback", json={"message": "short"}).status_code == 422
    items = admin_client.get(f"{API}/admin/feedback").json()["items"]
    assert len(items) == 1
    fid = items[0]["id"]
    assert admin_client.patch(f"{API}/admin/feedback/{fid}", json={"status": "resolved"}).json()["status"] == "resolved"


def test_admin_settings_update(admin_client):
    assert admin_client.put(f"{API}/admin/settings", json={"ai_daily_limit_per_user": 3}).status_code == 200
    assert admin_client.get(f"{API}/admin/settings").json()["ai_daily_limit_per_user"] == 3
    assert admin_client.put(f"{API}/admin/settings", json={"ai_daily_limit_per_user": -1}).status_code == 422


def test_admin_health_has_no_secrets(admin_client):
    body = str(admin_client.get(f"{API}/admin/health").json()).lower()
    assert "secret" not in body and "password" not in body and "key" not in body.replace("ai_configured", "")


def test_analytics_empty_state(student):
    d = student.get(f"{API}/analytics/dashboard").json()
    assert d["total_study_sets"] == 0 and d["average_score"] is None and d["streak_days"] == 0
    assert student.get(f"{API}/analytics/overview").json()["has_data"] is False


def test_health_endpoints(make_client):
    c = make_client()
    assert c.get("/health").json() == {"status": "ok"}
    assert c.get("/ready").status_code == 200
