# Chama Management System

A web application for managing Kenyan informal savings/investment groups (Chamas).

## Tech Stack

- **Backend:** Python 3.13, FastAPI, SQLAlchemy async 2.0 + asyncpg, Alembic, Celery + Redis
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7
- **Infra:** Docker, PostgreSQL 16, Redis 7

## Features

- JWT authentication (access + refresh tokens)
- Chama group CRUD with invite codes
- Member management with roles (admin, chairperson, treasurer, secretary, member)
- Contribution tracking with payment methods (M-Pesa, bank, cash)
- Loan management with approval workflow, guarantor system, repayment tracking
- Investment tracking (shares, land, business, SACCO, MMF)
- Meeting scheduling with minutes and attendance
- Financial reports (member statement, group summary, contribution trends)
- Dark mode support
- Responsive mobile-first UI

## Quick Start

```bash
docker compose up --build
# Visit http://localhost:8000
```

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/v1/      # Route handlers
│   │   ├── core/        # Security, pagination, celery
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   └── tasks/       # Celery background tasks
│   ├── alembic/         # Database migrations
│   └── entrypoint.sh    # Container startup
├── frontend/
│   └── src/
│       ├── api/         # API client modules
│       ├── components/  # Reusable UI components
│       ├── hooks/       # Custom React hooks
│       ├── pages/       # Page components
│       └── store/       # Zustand stores
├── Dockerfile           # Multi-stage build
└── docker-compose.yml   # App + Postgres + Redis
```

## API Endpoints

- `GET /api/health` — Health check
- `POST /api/v1/auth/register` — Register
- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/refresh` — Refresh token
- `GET/PUT /api/v1/users/me` — Current user profile
- `GET /api/v1/chamas` — List chamas
- `POST /api/v1/chamas` — Create chama
- `POST /api/v1/chamas/join` — Join chama via invite code
- `GET/PUT/DELETE /api/v1/chamas/{id}` — Chama CRUD
- `GET /api/v1/chamas/{id}/members` — List members
- `GET /api/v1/chamas/{id}/contributions` — List contributions
- `POST /api/v1/chamas/{id}/contributions` — Add contribution
- `GET /api/v1/chamas/{id}/loans` — List loans
- `POST /api/v1/chamas/{id}/loans` — Apply for loan
- `POST /api/v1/chamas/{id}/loans/{id}/action` — Approve/reject/disburse
- `POST /api/v1/chamas/{id}/loans/{id}/repayments` — Make repayment
- `GET /api/v1/chamas/{id}/investments` — List investments
- `POST /api/v1/chamas/{id}/investments` — Add investment
- `GET /api/v1/chamas/{id}/meetings` — List meetings
- `POST /api/v1/chamas/{id}/meetings` — Schedule meeting
- `GET /api/v1/chamas/{id}/reports/*` — Financial reports
