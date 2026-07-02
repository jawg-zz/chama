#!/bin/bash
set -e
PGVER=15
PGDATA=/var/lib/postgresql/$PGVER/main
if [ ! -d "$PGDATA" ]; then
    mkdir -p /var/lib/postgresql/$PGVER
    chown -R postgres:postgres /var/lib/postgresql
    su - postgres -c "/usr/lib/postgresql/$PGVER/bin/initdb -D $PGDATA"
fi
su - postgres -c "/usr/lib/postgresql/$PGVER/bin/pg_ctl -D $PGDATA -l /var/log/postgresql.log start" 2>/dev/null || true
for i in $(seq 1 10); do
    su - postgres -c "pg_isready" &>/dev/null && break
    sleep 1
done
su - postgres -c "psql -tc "SELECT 1 FROM pg_roles WHERE rolname='app'" | grep -q 1" ||     su - postgres -c "psql -c "CREATE USER app WITH PASSWORD 'changemer';""
su - postgres -c "psql -tc "SELECT 1 FROM pg_database WHERE datname='chama'" | grep -q 1" ||     su - postgres -c "psql -c "CREATE DATABASE chama OWNER app;""
cd /app/backend
echo "Running database migrations..."
alembic upgrade head 2>/dev/null || echo "No migrations to run, continuing..."
echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
