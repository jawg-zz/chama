#!/bin/bash
set -e

# Find PostgreSQL version directory
PGDIR=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | head -1)
if [ -n "$PGDIR" ]; then
    PGVER=$(basename $(dirname $PGDIR))
    PGDATA=/var/lib/postgresql/$PGVER/main
    mkdir -p /var/lib/postgresql/$PGVER
    chown -R postgres:postgres /var/lib/postgresql
    [ -f "$PGDATA/PG_VERSION" ] || su - postgres -c "$PGDIR/initdb -D $PGDATA"
    su - postgres -c "$PGDIR/pg_ctl -D $PGDATA -l /var/log/pg.log start" 2>/dev/null || true
    for i in $(seq 1 15); do
        su - postgres -c "pg_isready" &>/dev/null && break
        sleep 1
    done
    su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='chama'\" | grep -q 1" 2>/dev/null || \
        su - postgres -c "psql -c \"CREATE USER chama WITH PASSWORD 'chama_password';\"" 2>/dev/null || true
    su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='chama'\" | grep -q 1" 2>/dev/null || \
        su - postgres -c "psql -c \"CREATE DATABASE chama OWNER chama;\"" 2>/dev/null || true
fi

cd /app/backend
echo "Running database migrations..."
alembic upgrade head 2>/dev/null || echo "No migrations to run"
echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
