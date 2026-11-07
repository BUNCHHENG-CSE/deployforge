import os
import sys

# Ensure backend root is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import router as api_router
from app.services.storage import StorageManager
from app.db.session import init_db, check_db_health
from app.db.prisma_client import prisma_manager, check_prisma_health
from app.db.prisma_repository import PrismaJobRepository


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure folders exist and initialize PostgreSQL database schema
    StorageManager.init()
    try:
        init_db()
    except Exception as e:
        print(f"[!] Warning during DB startup initialization: {e}")
    try:
        await prisma_manager.connect()
    except Exception as e:
        print(f"[!] Warning during Prisma Query Engine startup: {e}")
    yield
    # Shutdown logic
    try:
        await prisma_manager.disconnect()
    except Exception as e:
        print(f"[!] Warning during Prisma Query Engine disconnect: {e}")

app = FastAPI(
    title="TCT DeployForge — Intune One-Click App Deploy Platform",
    description="TCT DeployForge — Automated enterprise Win32 application packaging, detection rule generation, and Graph API deployment platform for Microsoft Intune.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router)

# Health check endpoints
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "DeployForge Engine", "version": "1.0.0"}

@app.get("/api/db/health")
def db_health_check():
    return check_db_health()

@app.get("/api/prisma/health")
async def prisma_health_check():
    return await check_prisma_health()

@app.get("/api/prisma/jobs/stats")
async def prisma_jobs_stats(tenant_id: str = None):
    return await PrismaJobRepository.get_job_stats(tenant_id=tenant_id)

# Mount static build of frontend if exists (must be mounted last to avoid shadowing API routes)
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

