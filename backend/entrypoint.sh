#!/bin/bash
set -e
# Find PostgreSQL version and paths
PGVER=$(ls /usr/lib/postgresql/ 2>/dev/null | head -1)
PGDATA=/var/lib/postgresql/$PGVER/main

if [ -z "$PGVER" ]; then
    echo "No PostgreSQL found, trying to install..."
    apt-get update -qq && apt-get install -y -qq postgresql-16 2>/dev/null || apt-get install -y -qq postgresql-15 2>/dev/null || apt-get install -y -qq postgresql-14 2>/dev/null
    PGVER=$(ls /usr/lib/postgresql/ 2>/dev/null | head -1)
fi

echo "PostgreSQL version: $PGVER"

if [ -n "$PGVER" ]; then
    PGBIN=/usr/lib/postgresql/$PGVER/bin
    mkdir -p /var/lib/postgresql/$PGVER
    chown -R postgres:postgres /var/lib/postgresql
    if [ ! -d "$PGDATA" ] || [ ! -f "$PGDATA/PG_VERSION" ]; then
        su - postgres -c "$PGBIN/initdb -D $PGDATA"
    fi
    su - postgres -c "$PGBIN/pg_ctl -D $PGDATA -l /var/log/postgresql.log start" 2>/dev/null || true
    for i in $(seq 1 15); do
        su - postgres -c "pg_isready" &>/dev/null && break
        sleep 1
    done
    su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='app'\" | grep -q 1" || \
        su - postgres -c "psql -c \"CREATE USER app WITH PASSWORD 'changemer';\""
    su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='chama'\" | grep -q 1" || \
        su - postgres -c "psql -c \"CREATE DATABASE chama OWNER app;\""
else
    echo "WARNING: No PostgreSQL installed. App will fail to connect."
fi

cd /app/backend
echo "Running database migrations..."
alembic upgrade head 2>/dev/null || echo "No migrations to run"
echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
