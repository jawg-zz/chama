#!/bin/bash
set -e

# Try to start PostgreSQL via pg_ctlcluster (Debian standard)
if command -v pg_ctlcluster &>/dev/null; then
    PGVER=$(pg_lsclusters -h 2>/dev/null | head -1 | awk '{print $1}')
    if [ -z "$PGVER" ]; then
        # No existing cluster, create one
        PGVER=$(ls /usr/lib/postgresql/ 2>/dev/null | head -1)
        if [ -n "$PGVER" ]; then
            pg_ctlcluster $PGVER main initdb 2>/dev/null || true
        fi
    fi
    if [ -n "$PGVER" ]; then
        pg_ctlcluster $PGVER main start 2>/dev/null || true
    fi
else
    # Fallback: try direct paths
    for v in 16 15 14 13; do
        if [ -f "/usr/lib/postgresql/$v/bin/initdb" ]; then
            PGDATA=/var/lib/postgresql/$v/main
            mkdir -p /var/lib/postgresql/$v
            chown -R postgres:postgres /var/lib/postgresql
            if [ ! -d "$PGDATA" ]; then
                su - postgres -c "/usr/lib/postgresql/$v/bin/initdb -D $PGDATA"
            fi
            su - postgres -c "/usr/lib/postgresql/$v/bin/pg_ctl -D $PGDATA -l /var/log/postgresql.log start"
            break
        fi
    done
fi

# Wait for PG and create DB
for i in $(seq 1 15); do
    su - postgres -c "pg_isready" &>/dev/null && break
    sleep 1
done

# Create user and database
su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname='app'\" | grep -q 1" 2>/dev/null || \
    su - postgres -c "psql -c \"CREATE USER app WITH PASSWORD 'changemer';\"" 2>/dev/null || true
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='chama'\" | grep -q 1" 2>/dev/null || \
    su - postgres -c "psql -c \"CREATE DATABASE chama OWNER app;\"" 2>/dev/null || true

cd /app/backend
echo "Running database migrations..."
alembic upgrade head 2>/dev/null || echo "No migrations to run"
echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
