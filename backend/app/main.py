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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure folders exist
    StorageManager.init()
    yield
    # Shutdown logic if needed

app = FastAPI(
    title="DeployForge - Intune One-Click Deploy Tool",
    description="Automated enterprise Win32 application packaging, detection rule generation, and Graph API deployment platform for Microsoft Intune.",
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

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "DeployForge Engine", "version": "1.0.0"}

# Mount static build of frontend if exists (must be mounted last to avoid shadowing API routes)
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

