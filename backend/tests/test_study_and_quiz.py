API = "/api/v1"


def _uid(student):
    return student.get(f"{API}/auth/me").json()["id"]


def test_set_detail_hides_answers(student, make_set):
    s = make_set(_uid(student))
    body = student.get(f"{API}/study-sets/{s.id}").json()
    assert len(body["questions"]) == 3
    for q in body["questions"]:
        assert "correct_index" not in q and "explanation" not in q


def test_ownership_enforced(register, make_set):
    owner, other = register("owner@example.com"), register("other@example.com")
    s = make_set(_uid(owner))
    assert other.get(f"{API}/study-sets/{s.id}").status_code == 404
    assert other.patch(f"{API}/study-sets/{s.id}", json={"title": "hacked"}).status_code == 404
    assert other.delete(f"{API}/study-sets/{s.id}").status_code == 404
    assert other.get(f"{API}/study-sets/{s.id}/answer-key").status_code == 404
    assert other.post(f"{API}/study-sets/{s.id}/attempts", json={"client_token": "token-12345", "answers": []}).status_code == 404
    listing = other.get(f"{API}/study-sets").json()
    assert listing["total"] == 0


def test_list_search_and_pagination(student, make_set):
    uid = _uid(student)
    for i in range(5):
        make_set(uid, title=f"Biology {i}")
    make_set(uid, title="History")
    r = student.get(f"{API}/study-sets", params={"q": "biology", "page_size": 2}).json()
    assert r["total"] == 5 and len(r["items"]) == 2


def test_scoring_is_server_side(student, make_set):
    s = make_set(_uid(student))
    qs = student.get(f"{API}/study-sets/{s.id}").json()["questions"]
    # correct_index of question i is i. Answer 0 right, 1 right, 2 wrong. Client lies about correctness.
    payload = {"client_token": "token-score-1", "duration_seconds": 30, "answers": [
        {"question_id": qs[0]["id"], "selected_index": 0, "is_correct": True},
        {"question_id": qs[1]["id"], "selected_index": 1, "is_correct": True},
        {"question_id": qs[2]["id"], "selected_index": 0, "is_correct": True},
    ], "score": 3}
    r = student.post(f"{API}/study-sets/{s.id}/attempts", json=payload)
    assert r.status_code == 201
    body = r.json()
    assert body["correct_count"] == 2 and body["incorrect_count"] == 1 and body["total_questions"] == 3
    assert round(body["percentage"]) == 67
    wrong = [x for x in body["review"] if not x["is_correct"]]
    assert len(wrong) == 1 and wrong[0]["correct_index"] == 2 and wrong[0]["explanation"]


def test_unanswered_and_out_of_range_count_wrong(student, make_set):
    s = make_set(_uid(student))
    qs = student.get(f"{API}/study-sets/{s.id}").json()["questions"]
    r = student.post(f"{API}/study-sets/{s.id}/attempts", json={"client_token": "token-skip-1", "answers": [
        {"question_id": qs[0]["id"], "selected_index": 99}, {"question_id": qs[1]["id"], "selected_index": None}]})
    assert r.status_code == 201 and r.json()["correct_count"] == 0


def test_attempt_persisted_and_duplicate_submit_idempotent(student, make_set):
    s = make_set(_uid(student))
    qs = student.get(f"{API}/study-sets/{s.id}").json()["questions"]
    payload = {"client_token": "token-dup-0001", "answers": [{"question_id": q["id"], "selected_index": 0} for q in qs]}
    first = student.post(f"{API}/study-sets/{s.id}/attempts", json=payload).json()
    second = student.post(f"{API}/study-sets/{s.id}/attempts", json=payload).json()
    assert first["id"] == second["id"]
    assert student.get(f"{API}/attempts").json()["total"] == 1
    assert student.get(f"{API}/attempts/{first['id']}").status_code == 200


def test_cannot_view_other_users_attempt(register, make_set):
    a, b = register("a@example.com"), register("b@example.com")
    s = make_set(_uid(a))
    qs = a.get(f"{API}/study-sets/{s.id}").json()["questions"]
    att = a.post(f"{API}/study-sets/{s.id}/attempts", json={"client_token": "token-priv-01", "answers": [
        {"question_id": qs[0]["id"], "selected_index": 0}]}).json()
    assert b.get(f"{API}/attempts/{att['id']}").status_code == 404


def test_question_validation(student, make_set):
    s = make_set(_uid(student))
    bad = {"text": "What is 2+2?", "options": ["4", "4", "5", "6"], "correct_index": 0, "explanation": "math"}
    assert student.post(f"{API}/study-sets/{s.id}/questions", json=bad).status_code == 422  # duplicate options
    bad2 = {"text": "What is 2+2?", "options": ["4", "3", "5", "6"], "correct_index": 9, "explanation": "math"}
    assert student.post(f"{API}/study-sets/{s.id}/questions", json=bad2).status_code == 422  # index out of range


def test_flashcard_review_saved(student, make_set, db):
    from app.models import Flashcard
    s = make_set(_uid(student))
    db.add(Flashcard(study_set_id=s.id, front="F", back="B", position=0))
    db.commit()
    card_id = db.query(Flashcard).one().id
    assert student.post(f"{API}/flashcards/{card_id}/review", json={"confidence": "hard"}).status_code == 201
    assert student.get(f"{API}/study-sets/{s.id}/flashcard-progress").json()["progress"] == {str(card_id): "hard"}
    assert student.post(f"{API}/flashcards/{card_id}/review", json={"confidence": "nope"}).status_code == 422
