import os
import json
import asyncio
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, FileResponse

from app.core.catalog import SoftwareCatalog
from app.core.analyzer import InstallerAnalyzer
from app.core.auth import AzureAuthManager
from app.core.graph_client import IntuneGraphClient
from app.models.schemas import (
    AppDeployRequest,
    TenantConnectServicePrincipal,
    DeviceCodeInitRequest,
    DeviceCodePollRequest
)
from app.services.storage import StorageManager, PACKAGES_DIR
from app.services.deployment_worker import DeploymentJobManager

router = APIRouter(prefix="/api")

# Current global tenant session state
current_tenant_session = {
    "connected": False,
    "mode": "simulation", # "simulation" | "live"
    "tenant_name": "Contoso Corp (Sandbox)",
    "tenant_id": "sandbox-tenant-12345",
    "access_token": None,
    "user_email": "admin@contoso.onmicrosoft.com"
}

def get_graph_client() -> IntuneGraphClient:
    is_sim = (current_tenant_session["mode"] == "simulation") or not current_tenant_session.get("access_token")
    return IntuneGraphClient(access_token=current_tenant_session.get("access_token"), is_simulation=is_sim)

# --- CATALOG ENDPOINTS ---
@router.get("/catalog")
def get_catalog(query: Optional[str] = None, category: Optional[str] = None):
    apps = SoftwareCatalog.list_apps(query=query, category=category)
    categories = SoftwareCatalog.get_categories()
    return {"apps": apps, "categories": categories, "total": len(apps)}

@router.get("/catalog/{app_id}")
def get_catalog_app(app_id: str):
    app = SoftwareCatalog.get_by_id(app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found in catalog")
    return app

# --- INSTALLER UPLOAD & ANALYZER ---
@router.post("/upload")
async def upload_installer(file: UploadFile = File(...)):
    """Uploads an installer binary, analyzes PE/MSI metadata, and extracts silent switches."""
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    filename = file.filename or "installer.exe"
    token, file_path = StorageManager.save_upload(filename, content)

    try:
        analysis = InstallerAnalyzer.analyze(file_path)
    except Exception as e:
        analysis = {
            "filename": filename,
            "error": f"Failed to fully analyze binary: {str(e)}",
            "app_name": os.path.splitext(filename)[0],
            "publisher": "Unknown Publisher",
            "version": "1.0.0.0",
            "architecture": "x64",
            "engine": "Unknown",
            "install_command": f'"{filename}" /quiet /norestart',
            "uninstall_command": f'"{filename}" /uninstall /quiet /norestart',
            "suggested_detection_rules": []
        }

    return {
        "file_token": token,
        "filename": filename,
        "size_bytes": len(content),
        "analysis": analysis
    }

# --- TENANT & AUTH ENDPOINTS ---
@router.get("/tenant/status")
async def get_tenant_status():
    client = get_graph_client()
    try:
        details = await client.get_tenant_details()
        return {
            "connected": True,
            "mode": current_tenant_session["mode"],
            "tenant_name": details.get("displayName", current_tenant_session["tenant_name"]),
            "tenant_id": details.get("id", current_tenant_session["tenant_id"]),
            "is_simulation": client.is_simulation
        }
    except Exception as e:
        return {
            "connected": False,
            "mode": current_tenant_session["mode"],
            "error": str(e)
        }

@router.post("/tenant/connect-sp")
async def connect_service_principal(data: TenantConnectServicePrincipal):
    """Authenticates using Azure AD Client Credentials."""
    try:
        token_info = await AzureAuthManager.get_service_principal_token(
            tenant_id=data.tenant_id,
            client_id=data.client_id,
            client_secret=data.client_secret
        )
        current_tenant_session["connected"] = True
        current_tenant_session["mode"] = "live"
        current_tenant_session["tenant_id"] = data.tenant_id
        current_tenant_session["access_token"] = token_info["access_token"]
        
        client = get_graph_client()
        details = await client.get_tenant_details()
        current_tenant_session["tenant_name"] = details.get("displayName", "Azure Tenant")
        return {"status": "success", "tenant": details}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/tenant/device-code/init")
async def init_device_code(data: DeviceCodeInitRequest):
    """Initiates Device Code flow for interactive admin login."""
    try:
        res = await AzureAuthManager.initiate_device_code(
            tenant_id=data.tenant_id or "common",
            client_id=data.client_id
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/tenant/device-code/poll")
async def poll_device_code(data: DeviceCodePollRequest):
    """Polls Device Code token endpoint."""
    try:
        res = await AzureAuthManager.poll_device_code_token(
            tenant_id=data.tenant_id,
            client_id=data.client_id,
            device_code=data.device_code
        )
        if res.get("status") == "success":
            current_tenant_session["connected"] = True
            current_tenant_session["mode"] = "live"
            current_tenant_session["access_token"] = res["access_token"]
            client = get_graph_client()
            details = await client.get_tenant_details()
            current_tenant_session["tenant_name"] = details.get("displayName", "Azure Tenant")
            current_tenant_session["tenant_id"] = details.get("id", data.tenant_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/tenant/toggle-simulation")
def toggle_simulation(enable: bool = Query(True)):
    """Switches between Live Azure connection and Simulation sandbox mode."""
    if enable:
        current_tenant_session["mode"] = "simulation"
        current_tenant_session["connected"] = True
        current_tenant_session["tenant_name"] = "Contoso Corp (Sandbox)"
        current_tenant_session["tenant_id"] = "sandbox-tenant-12345"
        current_tenant_session["access_token"] = None
    else:
        current_tenant_session["mode"] = "live"
    return {"status": "success", "mode": current_tenant_session["mode"]}

@router.get("/tenant/groups")
async def list_groups():
    client = get_graph_client()
    try:
        groups = await client.list_security_groups()
        return {"groups": groups}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tenant/apps")
async def list_deployed_apps():
    client = get_graph_client()
    try:
        apps = await client.list_win32_apps()
        return {"apps": apps}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- DEPLOYMENT EXECUTION & STREAMING ---
@router.post("/deploy")
async def deploy_application(req: AppDeployRequest, background_tasks: BackgroundTasks):
    """Initiates one-click deployment pipeline for catalog app or custom uploaded installer."""
    client = get_graph_client()
    req.is_simulation = client.is_simulation

    job_id = DeploymentJobManager.create_job(req)
    # Launch async pipeline in background task
    background_tasks.add_task(DeploymentJobManager.execute_deployment, job_id, client)

    return {
        "job_id": job_id,
        "status": "queued",
        "app_name": req.app_name,
        "is_simulation": req.is_simulation
    }

@router.get("/jobs")
def get_jobs():
    return {"jobs": DeploymentJobManager.list_jobs()}

@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = DeploymentJobManager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Deployment job not found")
    return job

@router.get("/jobs/{job_id}/stream")
async def stream_job_updates(job_id: str):
    """Server-Sent Events endpoint streaming real-time deployment logs and progress."""
    job = DeploymentJobManager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        q = DeploymentJobManager.subscribe(job_id)
        try:
            # Yield initial snapshot
            yield f"data: {json.dumps(job)}\n\n"

            while True:
                # Wait for next update or heartbeat
                try:
                    updated_job = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"data: {json.dumps(updated_job)}\n\n"
                    if updated_job.get("status") in ["completed", "failed"]:
                        break
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat
                    yield f": keep-alive\n\n"
        finally:
            DeploymentJobManager.unsubscribe(job_id, q)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/packages/download/{filename}")
def download_package(filename: str):
    """Allows downloading the compiled .intunewin package directly to admin's machine."""
    file_path = os.path.join(PACKAGES_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Package file not found")
    return FileResponse(file_path, filename=filename, media_type="application/octet-stream")
