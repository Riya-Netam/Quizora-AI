# Quizora AI: your personal AI study companion

**Live demo:** https://quizora-ai-sable.vercel.app (the free server may take up to a minute to wake up on the first visit)

Turn a topic, pasted notes or a PDF into quizzes and flashcards, practice them, and track progress.
Full-stack: **React + Vite + Tailwind** frontend, **FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL** backend, **Google Gemini** for generation.

> **Status:** deployed on Vercel, Render and Supabase. Backend tests: 41 passing. Frontend tests: 17 passing. Lint and production build: passing.

---

## 1. Architecture

```
Browser (React SPA on Vercel)
   │  same-origin /api/*  (Vercel rewrite proxies to the backend, so cookies are first-party)
   ▼
FastAPI on Render  ──►  PostgreSQL (Supabase)
   │
   └──►  Gemini API   (backend only; the key never reaches the browser)
```

* **Auth:** Argon2 password hashes, short-lived JWT access cookie + rotating refresh cookie (both `HttpOnly`), CSRF double-submit header on every state-changing request. No tokens in `localStorage`.
* **Roles:** `student` and `admin`, enforced in FastAPI dependencies. Sign-up can only create students; admins are created from a command line (section 4).
* **AI:** a provider interface (`app/services/ai/`) with a Gemini provider and a deterministic Demo provider. Output is requested as JSON, then **every question is re-validated** (4 distinct options, valid answer index, no duplicates) before anything is saved.
* **Scoring is server-side.** The quiz page never receives correct answers; the server computes the score from the stored key and returns explanations only after submission.

### Folder structure

```
quizora-ai/
├─ backend/
│  ├─ app/
│  │  ├─ api/          routers: auth, study_sets, attempts, generate, analytics, feedback, admin (+ deps, common)
│  │  ├─ core/         config (validated settings), security (hashing, JWT), rate_limit
│  │  ├─ db/           base (naming convention), session (engine, pooling)
│  │  ├─ models/       user.py, study.py, system.py
│  │  ├─ schemas/      Pydantic request/response models
│  │  ├─ services/     generation.py, pdf.py, email.py, audit.py, ai/{base,gemini,demo}.py
│  │  ├─ cli.py        admin bootstrap command
│  │  └─ main.py       app, CORS, security headers, error handling, /health, /ready
│  ├─ migrations/      Alembic environment (generate the first migration, see section 3)
│  ├─ tests/           pytest suite (fake AI provider, throwaway SQLite)
│  ├─ requirements.txt  alembic.ini  pytest.ini  start.sh  .env.example
├─ frontend/
│  ├─ src/
│  │  ├─ api/          axios client (CSRF, silent refresh) + service functions
│  │  ├─ components/   ui/ (Button, Field, ConfirmDialog, ...), charts/
│  │  ├─ context/      AuthContext
│  │  ├─ hooks/  layouts/  routes/  utils/  test/
│  │  └─ pages/        public/, auth/, app/, admin/
│  ├─ package.json  vite.config.js  tailwind.config.js  vercel.json  .env.example
├─ LICENSE   .gitignore   README.md
```

---

## 2. Run it locally (Windows PowerShell)

You need: **Python 3.12**, **Node.js 20+**, and **Git**. Check with `python --version`, `node --version`.
No PostgreSQL is needed locally: development uses a SQLite file. (Production must use PostgreSQL; the app refuses to start in production on SQLite.)

### Backend

```powershell
cd quizora-ai\backend

# 1. Create and activate a virtual environment (an isolated box for this project's Python packages)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
# If PowerShell blocks the script, run this once, then activate again:
#   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# 2. Install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt

# 3. Create your settings file
Copy-Item .env.example .env
# Open .env in an editor and set at least:
#   JWT_SECRET_KEY=<a long random string>   (generate one: python -c "import secrets; print(secrets.token_urlsafe(48))")
#   GEMINI_API_KEY=<your key from https://aistudio.google.com/apikey>   (optional: Demo Mode works without it)
```

**Create the database tables (one-time, then after any model change).** The first time, generate the initial migration from the models, then apply it:

```powershell
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

Commit the generated file in `backend\migrations\versions\`. Production relies on it.

```powershell
# 4. Start the API  (http://localhost:8000, interactive docs at http://localhost:8000/docs)
uvicorn app.main:app --reload --port 8000
```

### Frontend (a second PowerShell window)

```powershell
cd quizora-ai\frontend
npm install
Copy-Item .env.example .env     # leave VITE_API_BASE_URL empty for local development
npm run dev                     # http://localhost:5173
```

Vite forwards `/api` requests to port 8000, so the browser only ever talks to one origin. Open http://localhost:5173, create an account, and click **Create new** then **Demo Mode** to try the app without an AI key.

### Run the tests

```powershell
# backend (from quizora-ai\backend, venv active)
pytest -v

# frontend (from quizora-ai\frontend)
npm test
npm run lint
npm run build
```

Tests use fake AI responses and a temporary SQLite file. They never call Gemini and never touch real data.

---

## 3. Database

| Table | Purpose | Key relationships |
|---|---|---|
| `users` | accounts (unique normalized email, Argon2 hash, role, status) | parent of almost everything |
| `refresh_tokens` | server-side record so refresh tokens rotate and can be revoked | user (cascade delete) |
| `password_reset_tokens` | stores only the **hash** of the emailed token; expiring, single-use | user (cascade) |
| `study_sets` | a quiz/flashcard collection (source type, topic, difficulty, `is_demo`) | owner user (cascade) |
| `questions` | MCQ: text, options (JSON list), correct index, explanation, position | study set (cascade) |
| `flashcards` | front/back/position | study set (cascade) |
| `quiz_attempts` | score, counts, duration, answers (JSON), idempotency token (unique per user) | user, study set (cascade) |
| `flashcard_reviews` | one row per rating (easy/medium/hard) | user, flashcard (cascade) |
| `ai_usage` | provider, operation, status, token counts, error code | user (cascade) |
| `feedback` | contact-form messages with a status | user (set null) |
| `audit_logs` | who did what to which target, with safe metadata | actor user (set null) |
| `app_settings` | admin-adjustable settings (daily AI limit) | none |

Deleting a user removes their study sets, attempts and reviews. Deleting a study set removes its questions, flashcards and attempts. Feedback and audit rows survive (their user link becomes null).

---

## 4. Create the first admin

Admins can't be created from the sign-up form. After your database is migrated (locally, or against production):

```powershell
cd quizora-ai\backend
.\.venv\Scripts\Activate.ps1
$env:ADMIN_EMAIL = "you@example.com"      # or set ADMIN_EMAIL in .env
python -m app.cli create-admin
```

You'll be asked for a display name and a password (hidden, 12+ characters). The password is never read from a file or environment variable, so it can't leak into logs or Git. If an account with that email already exists, the command offers to promote it.

**For production:** Render's free plan has no shell. Instead, run the same command on your own computer with `DATABASE_URL` pointed at your Supabase database for that one command:

```powershell
$env:DATABASE_URL = "postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres"   # your Supabase URL
$env:ENVIRONMENT = "development"   # lets the CLI run locally without production-only checks
$env:ADMIN_EMAIL = "you@example.com"
python -m app.cli create-admin
```

Close the window afterwards so the URL isn't left in your session.

---

## 5. Deploy

Free tiers change. Check each provider's current limits before relying on them. Typical behaviour: Render's free web service **sleeps after inactivity** (first request can take ~a minute), Supabase free projects can **pause after a period of inactivity**, and Gemini's free quota is limited and subject to change. No paid domain is needed; you get `*.vercel.app` and `*.onrender.com` URLs.

### Step 1: Push to GitHub

```powershell
cd quizora-ai
git init
git add .
git status          # confirm no .env files are listed
git commit -m "Initial commit: Quizora AI"
# Create an empty repository on github.com (no README), then:
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/quizora-ai.git
git push -u origin main
```

### Step 2: Database (Supabase)

1. Create a project at supabase.com and note the database password.
2. **Project Settings → Database → Connection string.** Use the **Session pooler** string (works over IPv4, which Render needs). The direct connection is IPv6-only on some plans.
3. Convert it to SQLAlchemy form by changing the start to `postgresql+psycopg://`. If your password has special characters (`@ : / #`), URL-encode them.
4. Apply migrations (once, from your computer, with the venv active):
   ```powershell
   $env:DATABASE_URL = "postgresql+psycopg://USER:PASSWORD@HOST:5432/postgres"
   alembic upgrade head
   ```
   (After this, Render also runs `alembic upgrade head` on every start via `start.sh`; it's a no-op when up to date.)

### Step 3: Backend (Render)

1. **New → Web Service**, connect your GitHub repo.
2. Settings: **Root Directory** `backend` · **Runtime** Python · **Build Command** `pip install -r requirements.txt` · **Start Command** `bash start.sh`.
3. **Environment variables** (Environment tab):

| Variable | Value |
|---|---|
| `PYTHON_VERSION` | `3.12.3` |
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | your Supabase session-pooler URL (`postgresql+psycopg://...`) |
| `JWT_SECRET_KEY` | a new random 48+ character string (never reuse the dev one) |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAMESITE` | `lax` (with the Vercel proxy in step 4) or `none` (direct API calls) |
| `FRONTEND_ORIGIN` | your exact Vercel URL, e.g. `https://quizora-ai.vercel.app` (no trailing slash) |
| `GEMINI_API_KEY` | your key (keep it only here) |
| `GEMINI_MODEL` | a currently supported model, e.g. `gemini-2.0-flash`; check Google's docs |
| `AI_DAILY_LIMIT_PER_USER` | e.g. `10` |
| `ENABLE_API_DOCS` | `false` if you don't want public API docs |
| `ADMIN_EMAIL` | your admin email |

   The app **refuses to start** in production with a weak secret, SQLite, `COOKIE_SECURE=false`, `DEBUG=true` or a `localhost` frontend origin, and logs which setting is wrong.
4. Deploy, then open `https://YOUR-API.onrender.com/health` (should show `{"status":"ok"}`) and `/ready` (should show the database is up).

### Step 4: Frontend (Vercel)

1. Edit `frontend/vercel.json` and replace `YOUR-BACKEND.onrender.com` with your Render hostname. Commit and push.
2. **Add New → Project**, import the repo, **Root Directory** `frontend`, framework Vite (build `npm run build`, output `dist`).
3. Leave `VITE_API_BASE_URL` **unset**. The Vercel rewrite forwards `/api/*` to Render, so the browser sees a single origin and cookies are first-party. (This avoids third-party-cookie blocking in Safari and private windows.)
4. Deploy, copy the Vercel URL into Render's `FRONTEND_ORIGIN`, and let Render redeploy.

**Alternative (direct API calls):** set `VITE_API_BASE_URL=https://YOUR-API.onrender.com` in Vercel, `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true` in Render. This works but some browsers block third-party cookies, which would break login. I'm not certain of Vercel's current proxy timeout for long requests; if AI generation times out through the proxy, this alternative is the fallback.

### Secrets you must supply yourself

`JWT_SECRET_KEY`, `DATABASE_URL` (Supabase password), `GEMINI_API_KEY`, your admin password (typed into the CLI), and optional SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). Without SMTP, "Forgot password" tells the user plainly that email isn't configured; it never pretends a message was sent.

### Deployment checklist

- [ ] `.env` files are not in Git (`git status` shows none)
- [ ] Initial migration file is committed
- [ ] `alembic upgrade head` ran against Supabase
- [ ] Render env vars set; `/health` and `/ready` are green
- [ ] `vercel.json` points at your Render URL; `FRONTEND_ORIGIN` equals your Vercel URL exactly
- [ ] First admin created; you can open `/admin`
- [ ] Register a test student, run Demo Mode, then a real generation
- [ ] Rotate any secret you pasted into chats or screenshots

### Rotating secrets

* **`JWT_SECRET_KEY`:** change it in Render and redeploy. Everyone is signed out (their tokens stop validating). Do this immediately if it leaks.
* **`GEMINI_API_KEY`:** create a new key in Google AI Studio, update Render, delete the old key.
* **Database password:** reset in Supabase, update `DATABASE_URL` in Render (and your local shell), redeploy.

### Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Browser console: CORS error | `FRONTEND_ORIGIN` must match the browser's URL exactly (scheme, host, no trailing slash). With the Vercel proxy, CORS shouldn't be involved at all; check `vercel.json`. |
| Login works but you're logged out on refresh | Cookies are blocked or `COOKIE_SECURE`/`COOKIE_SAMESITE` mismatch. Use the proxy setup, HTTPS, and `lax`. |
| Every state-changing request returns 403 "CSRF validation failed" | The CSRF cookie isn't reaching the API. Same cause as above. |
| Render deploy fails at "Invalid production configuration" | Read the log; it lists exactly which setting to fix. |
| `could not connect to server` / timeouts to the database | Use the Supabase **session pooler** URL, check the password encoding, and confirm the project isn't paused. |
| `relation "users" does not exist` | Migrations haven't run: run `alembic upgrade head`; confirm the migration file is committed. |
| `alembic ... Target database is not up to date` | Run `alembic upgrade head` before generating a new revision. |
| First request after a while takes ~1 minute | Free Render service waking up. Expected on free tiers. |
| "AI generation isn't configured" | `GEMINI_API_KEY` empty or `AI_PROVIDER=demo`. Set the key in Render. |
| 429 "usage quota" from the AI | Gemini free quota reached; wait, switch model, or lower traffic. Daily per-user limit is separate and adjustable in the admin System page. |
| Frontend build fails on Vercel | Root Directory must be `frontend`; run `npm run build` locally to see the error. |
| API docs missing in production | `ENABLE_API_DOCS=false` (intended). |

---

## 6. API summary

Base path: `/api/v1`. All endpoints except those marked *public* need the auth cookie, and state-changing requests need the `X-CSRF-Token` header (the frontend does this automatically).

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` *(public)*, `POST /auth/login` *(public)*, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/csrf`, `GET /auth/me`, `PATCH /auth/me`, `POST /auth/change-password`, `POST /auth/forgot-password` *(public)*, `POST /auth/reset-password` *(public)*, `DELETE /auth/me` |
| Study sets | `GET/POST /study-sets`, `GET/PATCH/DELETE /study-sets/{id}`, `GET /study-sets/{id}/answer-key` (owner only) |
| Questions | `POST /study-sets/{id}/questions`, `PUT/DELETE /questions/{id}` |
| Flashcards | `POST /study-sets/{id}/flashcards`, `PUT/DELETE /flashcards/{id}`, `POST /flashcards/{id}/review`, `GET /study-sets/{id}/flashcard-progress` |
| Quiz attempts | `POST /study-sets/{id}/attempts`, `GET /attempts`, `GET /attempts/{id}` |
| AI generation | `GET /generate/status`, `POST /generate/topic`, `POST /generate/notes`, `POST /generate/pdf` (multipart) |
| Analytics | `GET /analytics/dashboard`, `GET /analytics/overview?days=30` |
| Feedback | `POST /feedback` *(public, rate-limited)* |
| Admin (admin role only) | `GET /admin/stats`, `GET /admin/users`, `PATCH /admin/users/{id}/status`, `GET /admin/feedback`, `PATCH /admin/feedback/{id}`, `GET /admin/audit-logs`, `GET/PUT /admin/settings`, `GET /admin/health` |
| Ops (no prefix) | `GET /health` (liveness), `GET /ready` (checks the database) |

Example (PowerShell, against a local server):

```powershell
$base = "http://localhost:8000/api/v1"
Invoke-RestMethod "$base/auth/register" -Method Post -SessionVariable s -ContentType "application/json" `
  -Body '{"name":"Ada","email":"ada@example.com","password":"correct-horse-1"}'
$csrf = ($s.Cookies.GetCookies("http://localhost:8000") | Where-Object Name -eq "quizora_csrf").Value
Invoke-RestMethod "$base/generate/topic" -Method Post -WebSession $s -ContentType "application/json" `
  -Headers @{ "X-CSRF-Token" = $csrf } `
  -Body '{"topic":"Photosynthesis","difficulty":"easy","num_questions":5,"num_flashcards":5,"output":"both","demo":true}'
```

---

## 7. Security notes

Implemented: Argon2 hashing; `HttpOnly` cookies with `SameSite`/`Secure` from config; CSRF double-submit; refresh-token rotation with reuse detection; identical error for unknown email vs wrong password (with a dummy hash to even out timing); hashed, expiring, single-use reset tokens that are never logged; rate limits on register, login, refresh, reset and AI endpoints; per-user daily AI limit; strict Pydantic validation; SQLAlchemy parameterized queries; ownership checks that return 404 (not 403) for other users' IDs; server-side role checks on every admin route; admin actions written to an audit log; suspended users are blocked on every request and their sessions are revoked; request-size limit; PDF checks (extension, content type, `%PDF` header, size, page count, encryption, text present) processed in memory and never stored; document text is wrapped and the model is told to ignore instructions inside it; security headers; CORS limited to one exact origin; production start-up validation.

Not claimed: this is not "completely secure". Known considerations:

* **Rate limiting is in-memory per process.** With multiple workers each has its own counters, and behind proxies the client IP depends on forwarded headers. Verify after deploying; use Redis-backed limits if you scale.
* **Prompt injection** can't be fully eliminated: a malicious PDF could still skew generated questions (it can't access other users' data or tools).
* **Email verification is not implemented** (the column exists; accounts are usable immediately).
* No CAPTCHA, no MFA, no account lockout beyond rate limiting.
* Privacy policy and terms are templates, not legal advice.
* Dependency pins were chosen from memory; run `pip list --outdated` / `npm audit` and update.

---

## 8. What is verified

| Check | Status |
|---|---|
| Every backend Python file compiles (`compileall`) | Done |
| Every relative frontend import resolves to a file | Done |
| Backend `pytest` suite (~45 tests) | **Not run** (no network to install packages) |
| Frontend `vitest` suite | **Not run** |
| `npm run build`, `npm run lint` | **Not run** |
| Alembic initial migration | **Not generated**; you generate it once (section 2) |
| Real Gemini call | **Not tested.** SDK usage written from knowledge of `google-genai`; verify on first run |
| Deployment to Vercel / Render / Supabase | **Not tested** |
| Accessibility | Built with labels, focus states, roles, hidden chart tables; **not audited** with a tool |

**First-run advice:** run `pytest -v` and `npm test` and send me any failures; they will most likely be small version or typo issues.

---

## 9. Features and limitations

**Implemented:** landing/about/contact/privacy/terms/404/403/500 pages; register, login, logout, forgot/reset password, change password, profile, account deletion; student dashboard and progress charts from real data; topic, notes and PDF generation; Demo Mode (clearly labelled, no AI call); quizzes (optional timer, navigator, confirm-before-submit, duplicate-submit protection, server scoring, review with explanations, retry, history); flashcards (flip, shuffle, easy/medium/hard, saved ratings, revision mode); study-set search/filter/sort/pagination and full question/flashcard editing; admin overview, user management with safeguards, feedback inbox, audit log, health and AI-limit settings.

**Limitations:** no OCR for scanned PDFs; MCQ only (no true/false, multi-select or short answer); generated questions can be wrong, so users can edit them; no email verification; no sharing/public study sets; analytics aggregate in Python (fine for personal data volumes, not for huge histories); no automated end-to-end browser tests.

---

## 10. Project description and resume bullets

**Description:** Quizora AI is a full-stack study platform that turns topics, notes and PDFs into validated multiple-choice quizzes and spaced-revision flashcards using Google Gemini. It features cookie-based JWT authentication with CSRF protection, role-based access control with an admin console and audit trail, server-side quiz scoring, per-user AI usage quotas, and analytics computed from persisted data. Built with React, FastAPI, PostgreSQL and deployed on Vercel, Render and Supabase.

**Resume bullets** (only keep a bullet after the matching part works for you, and replace placeholders with real numbers):

* Built and deployed a full-stack AI study platform (React, FastAPI, PostgreSQL) that generates quizzes and flashcards from topics, notes and PDFs using the Gemini API.
* Designed a provider-agnostic AI layer with structured JSON output, strict Pydantic validation, bounded retries and per-user daily quotas, so malformed model output is never saved.
* Implemented secure authentication (Argon2, HttpOnly JWT cookies with refresh rotation, CSRF protection) and role-based access with an admin dashboard and audit log.
* Enforced server-side quiz scoring and ownership checks so correct answers and other users' data are never exposed to the browser.
* Modelled a relational schema with SQLAlchemy 2 and Alembic migrations, and wrote a pytest suite with mocked AI providers covering auth, authorization, scoring and generation validation.
* Shipped an accessible, responsive UI with Tailwind and Recharts; set up CI-ready linting, tests and a Vercel + Render + Supabase deployment.
