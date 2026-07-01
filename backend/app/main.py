from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import settings
from app.database import engine, Base
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.chamas import router as chamas_router
from app.api.v1.contributions import router as contributions_router
from app.api.v1.loans import router as loans_router
from app.api.v1.investments import router as investments_router
from app.api.v1.meetings import router as meetings_router
from app.api.v1.reports import router as reports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


api_v1 = FastAPI()
api_v1.include_router(auth_router)
api_v1.include_router(users_router)
api_v1.include_router(chamas_router)
api_v1.include_router(contributions_router)
api_v1.include_router(loans_router)
api_v1.include_router(investments_router)
api_v1.include_router(meetings_router)
api_v1.include_router(reports_router)

app.mount("/api/v1", api_v1)

static_dir = Path(__file__).parent.parent.parent / "frontend" / "dist"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
