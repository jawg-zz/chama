#!/bin/bash
set -e
mkdir -p /var/lib/postgresql/data /var/log/postgresql
chown -R postgres:postgres /var/lib/postgresql /var/log/postgresql
su - postgres -c "initdb -D /var/lib/postgresql/data" 2>/dev/null || true
su - postgres -c "pg_ctl -D /var/lib/postgresql/data -l /var/log/postgresql/pg.log start" 2>/dev/null || true
for i in $(seq 1 10); do su - postgres -c "pg_isready" &>/dev/null && break; sleep 1; done
su - postgres -c 'psql -tc "SELECT 1 FROM pg_roles WHERE rolname='"'app'"'" | grep -q 1' || su - postgres -c 'psql -c "CREATE USER app WITH PASSWORD '"'"'changemer'"'"'"'
su - postgres -c 'psql -tc "SELECT 1 FROM pg_database WHERE datname='"'chama'"'" | grep -q 1' || su - postgres -c 'psql -c "CREATE DATABASE chama OWNER app;"'
redis-server --daemonize yes 2>/dev/null || true
cd /app/backend
alembic upgrade head 2>/dev/null || echo "No migrations to run"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
