import os
import json
import uuid
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse, FileResponse

from app.core.catalog import SoftwareCatalog
from app.core.analyzer import InstallerAnalyzer
from app.core.auth import AzureAuthManager
from app.core.graph_client import IntuneGraphClient
from app.core.winget import WinGetService
from app.core.scripts_library import ScriptPackager, CURATED_POWERSHELL_SCRIPTS
from app.core.rule_simulator import RuleSimulator
from app.models.schemas import (
    AppDeployRequest,
    BatchDeployRequest,
    ScriptDeployRequest,
    RuleSimulationRequest,
    TenantConnectServicePrincipal,
    DeviceCodeInitRequest,
    DeviceCodePollRequest,
    TenantProfile
)
from app.services.storage import StorageManager, PACKAGES_DIR
from app.services.deployment_worker import DeploymentJobManager

router = APIRouter(prefix="/api")

# In-memory tenant profiles for MSP / Multi-tenant management
tenant_profiles: List[Dict[str, Any]] = [
    {
        "id": "sandbox-tenant-12345",
        "name": "Contoso Corp (Sandbox)",
        "mode": "simulation",
        "tenant_id": "sandbox-tenant-12345",
        "client_id": "mock-client-id-001",
        "is_active": True
    },
    {
        "id": "acme-corp-prod",
        "name": "Acme Corp (Production)",
        "mode": "live",
        "tenant_id": "89b53874-5111-4f81-8fb7-449339e14511",
        "client_id": "acme-client-id",
        "is_active": False
    },
    {
        "id": "fabrikam-msp-client",
        "name": "Fabrikam Ltd (MSP Client)",
        "mode": "live",
        "tenant_id": "31b14a90-3342-411a-a1e4-857c79313abc",
        "client_id": "fabrikam-client-id",
        "is_active": False
    }
]

# Current global tenant session state
current_tenant_session = {
    "connected": True,
    "mode": "simulation", # "simulation" | "live"
    "tenant_name": "Contoso Corp (Sandbox)",
    "tenant_id": "sandbox-tenant-12345",
    "access_token": None,
    "user_email": "admin@contoso.onmicrosoft.com"
}

def get_graph_client() -> IntuneGraphClient:
    is_sim = (current_tenant_session["mode"] == "simulation") or not current_tenant_session.get("access_token")
    return IntuneGraphClient(access_token=current_tenant_session.get("access_token"), is_simulation=is_sim)

# --- WORKSTATION FLEET BASELINES ---
FLEET_BASELINES = [
    {
        "id": "baseline-standard-office",
        "name": "Standard Office Fleet",
        "description": "Essential productivity software stack for corporate office knowledge workers.",
        "badge": "Standard",
        "icon": "Briefcase",
        "app_ids": ["google-chrome", "adobe-acrobat-reader", "zoom-workplace", "7zip"]
    },
    {
        "id": "baseline-developer-workstation",
        "name": "Developer Workstation",
        "description": "Full-stack engineering baseline with code editors, runtime environments, and shell tooling.",
        "badge": "Engineering",
        "icon": "Code",
        "app_ids": ["visual-studio-code", "git", "powertoys", "python-3", "notepad-plus-plus"]
    },
    {
        "id": "baseline-sysadmin-secops",
        "name": "SysAdmin & SecOps Suite",
        "description": "Advanced diagnostic, remote administration, and packet inspection utilities.",
        "badge": "IT SecOps",
        "icon": "ShieldAlert",
        "app_ids": ["sysinternals-suite", "7zip", "notepad-plus-plus"]
    }
]

@router.get("/catalog/baselines")
def get_fleet_baselines():
    """Returns curated 1-click fleet deployment baselines."""
    return {"baselines": FLEET_BASELINES}

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

# --- WINGET INTEGRATION ---
@router.get("/winget/search")
def search_winget(query: str = Query("", description="Search term for winget packages")):
    """Searches Windows Package Manager (winget) repository index."""
    results = WinGetService.search(query=query)
    return {"packages": results, "total": len(results), "query": query}

@router.get("/winget/{package_id}")
def get_winget_package(package_id: str):
    """Retrieves winget package manifest and converts it to DeployForge format."""
    pkg = WinGetService.get_by_id(package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="WinGet package not found")
    return WinGetService.convert_to_catalog_app(pkg)

# --- POWERSHELL SCRIPT & REMEDIATION STUDIO ---
@router.get("/scripts/curated")
def get_curated_scripts():
    """Lists pre-built enterprise PowerShell scripts."""
    return {"scripts": ScriptPackager.list_curated_scripts()}

@router.post("/scripts/package")
def package_powershell_script(req: ScriptDeployRequest):
    """Packages a PowerShell script into a standalone .intunewin package."""
    try:
        res = ScriptPackager.package_script(
            script_id=req.script_id,
            script_name=req.script_name,
            script_content=req.script_content,
            version=req.version
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Packaging failed: {str(e)}")

@router.post("/scripts/deploy")
async def deploy_powershell_script(req: ScriptDeployRequest, background_tasks: BackgroundTasks):
    """Packages and deploys a PowerShell script directly to Microsoft Intune."""
    try:
        pkg = ScriptPackager.package_script(
            script_id=req.script_id,
            script_name=req.script_name,
            script_content=req.script_content,
            version=req.version
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Packaging failed: {str(e)}")

    client = get_graph_client()

    deploy_req = AppDeployRequest(
        catalog_app_id=req.script_id,
        app_name=req.script_name,
        publisher=req.publisher,
        version=req.version,
        filename="run.cmd",
        description=req.description or "Automated PowerShell Win32 wrapper package",
        install_command=pkg["install_command"],
        uninstall_command=pkg["uninstall_command"],
        install_behavior="system",
        device_restart_behavior="suppress",
        detection_rules=[pkg["detection_rule"]],
        target_group_id=req.target_group_id,
        assignment_intent=req.assignment_intent,
        is_simulation=client.is_simulation
    )

    job_id = DeploymentJobManager.create_job(deploy_req)
    background_tasks.add_task(DeploymentJobManager.execute_deployment, job_id, client)

    return {
        "job_id": job_id,
        "status": "queued",
        "script_name": req.script_name,
        "intunewin_filename": pkg["intunewin_filename"]
    }

# --- DETECTION RULE SIMULATOR ---
@router.post("/rules/simulate")
def simulate_detection_rule(req: RuleSimulationRequest):
    """Simulates and verifies an Intune Win32 Detection Rule against logic & host."""
    res = RuleSimulator.simulate_rule(req.rule.model_dump())
    return res

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

# --- TENANT & MSP PROFILES ---
@router.get("/tenant/profiles")
def list_tenant_profiles():
    """Lists saved MSP tenant profiles."""
    return {"profiles": tenant_profiles}

@router.post("/tenant/profiles/{profile_id}/activate")
def activate_tenant_profile(profile_id: str):
    """Switches active MSP tenant profile."""
    target = None
    for p in tenant_profiles:
        if p["id"] == profile_id:
            p["is_active"] = True
            target = p
        else:
            p["is_active"] = False

    if not target:
        raise HTTPException(status_code=404, detail="Tenant profile not found")

    current_tenant_session["connected"] = True
    current_tenant_session["mode"] = target["mode"]
    current_tenant_session["tenant_name"] = target["name"]
    current_tenant_session["tenant_id"] = target["tenant_id"]
    if target["mode"] == "simulation":
        current_tenant_session["access_token"] = None

    return {"status": "success", "active_profile": target}

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

# --- DEPLOYMENT EXECUTION & BATCH DEPLOYMENT ---
@router.post("/deploy")
async def deploy_application(req: AppDeployRequest, background_tasks: BackgroundTasks):
    """Initiates one-click deployment pipeline for catalog app or custom uploaded installer."""
    client = get_graph_client()
    req.is_simulation = client.is_simulation

    job_id = DeploymentJobManager.create_job(req)
    background_tasks.add_task(DeploymentJobManager.execute_deployment, job_id, client)

    return {
        "job_id": job_id,
        "status": "queued",
        "app_name": req.app_name,
        "is_simulation": req.is_simulation
    }

@router.post("/deploy/batch")
async def deploy_batch_applications(req: BatchDeployRequest, background_tasks: BackgroundTasks):
    """Deploys multiple applications in batch to a target group (e.g. Workstation Baselines)."""
    if not req.apps:
        raise HTTPException(status_code=400, detail="Batch request contains no applications.")

    client = get_graph_client()
    batch_id = f"batch-{uuid.uuid4().hex[:8]}"
    job_ids = []

    for app_req in req.apps:
        # Override target and intent if specified at batch level
        if req.target_group_id:
            app_req.target_group_id = req.target_group_id
        if req.assignment_intent:
            app_req.assignment_intent = req.assignment_intent
        app_req.is_simulation = client.is_simulation

        job_id = DeploymentJobManager.create_job(app_req)
        job_ids.append(job_id)
        background_tasks.add_task(DeploymentJobManager.execute_deployment, job_id, client)

    return {
        "batch_id": batch_id,
        "batch_name": req.batch_name,
        "target_group_id": req.target_group_id,
        "count": len(job_ids),
        "job_ids": job_ids,
        "status": "queued"
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
                try:
                    updated_job = await asyncio.wait_for(q.get(), timeout=15.0)
                    yield f"data: {json.dumps(updated_job)}\n\n"
                    if updated_job.get("status") in ["completed", "failed"]:
                        break
                except asyncio.TimeoutError:
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
