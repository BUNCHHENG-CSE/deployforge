from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class DetectionRule(BaseModel):
    type: str = Field(..., description="msi | file | registry | script")
    # MSI fields
    productCode: Optional[str] = None
    productVersion: Optional[str] = None
    productVersionOperator: Optional[str] = "greaterThanOrEqual"
    # File fields
    path: Optional[str] = None
    fileOrFolderName: Optional[str] = None
    detectionType: Optional[str] = "exists" # exists | version | date | size
    operator: Optional[str] = "greaterThanOrEqual"
    detectionValue: Optional[str] = None
    check32BitOn64System: Optional[bool] = False
    # Registry fields
    keyPath: Optional[str] = None
    valueName: Optional[str] = None
    # Script fields
    scriptContent: Optional[str] = None
    enforceSignatureCheck: Optional[bool] = False
    runAs32Bit: Optional[bool] = False
    runAsAccount: Optional[str] = "system"
    description: Optional[str] = None

class AppDeployRequest(BaseModel):
    catalog_app_id: Optional[str] = None
    app_name: str
    description: Optional[str] = "Automated Win32 Package deployed via DeployForge"
    publisher: str
    version: str = "1.0.0"
    filename: str
    file_token: Optional[str] = None # Reference to uploaded installer file
    download_url: Optional[str] = None # For catalog auto-download
    architecture: str = "x64" # x64 | x86 | all | arm64
    install_command: str
    uninstall_command: str
    install_behavior: str = "system" # system | user
    device_restart_behavior: str = "suppress" # suppress | allow | forceReboot | softReboot
    detection_rules: List[DetectionRule]
    target_group_id: str = "all-devices" # all-devices | all-users | <entra_group_id>
    assignment_intent: str = "required" # required | available | uninstall
    is_simulation: Optional[bool] = False

class TenantConnectServicePrincipal(BaseModel):
    tenant_id: str
    client_id: str
    client_secret: str

class DeviceCodeInitRequest(BaseModel):
    tenant_id: Optional[str] = "common"
    client_id: Optional[str] = None

class DeviceCodePollRequest(BaseModel):
    tenant_id: str
    client_id: Optional[str] = None
    device_code: str

class DeploymentJobLog(BaseModel):
    timestamp: str
    message: str
    level: str = "info" # info | warn | error | success
    progress: int

class DeploymentJobResponse(BaseModel):
    job_id: str
    app_name: str
    publisher: str
    version: str
    status: str # pending | running | completed | failed
    progress: int
    current_step: str
    logs: List[DeploymentJobLog]
    created_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None
    intunewin_filename: Optional[str] = None
    intune_app_id: Optional[str] = None
    is_simulation: bool = False
