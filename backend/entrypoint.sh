#!/bin/bash
set -e

cd /app/backend
echo "Running database migrations..."
alembic upgrade head 2>/dev/null || echo "No migrations to run"
echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
