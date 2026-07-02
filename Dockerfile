FROM python:3.13-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libpq-dev curl nodejs npm && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY frontend/ frontend/
RUN cd frontend && npm install && npm run build
FROM python:3.13-slim
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev curl postgresql-15 redis-server && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app/backend /app/backend
COPY --from=builder /app/frontend/dist /app/frontend/dist
COPY backend/ /app/backend/
COPY backend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 CMD curl -f http://localhost:8000/api/health || exit 1
CMD ["/app/entrypoint.sh"]
