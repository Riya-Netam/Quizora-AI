#!/usr/bin/env bash
# Production start command for Render (and any host that sets $PORT).
# 1) apply database migrations (safe to repeat: it does nothing if already up to date)
# 2) start the API with a production ASGI server
set -euo pipefail
alembic upgrade head
exec gunicorn app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers "${WEB_CONCURRENCY:-2}" \
  --bind "0.0.0.0:${PORT:-8000}" \
  --timeout 120 \
  --forwarded-allow-ips="*"
