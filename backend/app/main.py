import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.api import admin, analytics, attempts, auth, feedback, generate, study_sets
from app.core.config import settings
from app.core.rate_limit import limiter
from app.db.session import engine

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("quizora")

app = FastAPI(
    title="Quizora AI API",
    version="1.0.0",
    docs_url="/docs" if settings.ENABLE_API_DOCS else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.ENABLE_API_DOCS else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],  # exact origin, never "*" with credentials
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)

MAX_BODY_BYTES = (settings.MAX_UPLOAD_MB + 1) * 1024 * 1024


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > MAX_BODY_BYTES:
        return JSONResponse({"detail": "Request body too large"}, status_code=413)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse({"detail": "Something went wrong on our side. Please try again."}, status_code=500)


@app.get("/health", tags=["ops"])
def liveness():
    return {"status": "ok"}


@app.get("/ready", tags=["ops"])
def readiness():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        log.exception("Readiness check failed")
        return JSONResponse({"status": "unavailable", "database": "down"}, status_code=503)
    return {"status": "ready", "database": "up"}


app.include_router(auth.router, prefix="/api/v1")
app.include_router(study_sets.router, prefix="/api/v1")
app.include_router(attempts.router, prefix="/api/v1")
app.include_router(generate.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(feedback.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
