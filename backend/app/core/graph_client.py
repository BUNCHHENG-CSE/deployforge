import asyncio
import base64
import uuid
import httpx
from typing import Dict, Any, List, Optional, Callable

GRAPH_BASE_URL = "https://graph.microsoft.com"

class IntuneGraphClient:
    """
    Client for Microsoft Graph API deviceAppManagement (Intune Win32 LOB Apps)
    and Azure Blob Storage encrypted chunk uploads.
    Includes full Sandbox / Simulation fallback.
    """

    def __init__(self, access_token: Optional[str] = None, is_simulation: bool = False):
        self.access_token = access_token
        self.is_simulation = is_simulation or not bool(access_token)

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    async def get_tenant_details(self) -> Dict[str, Any]:
        """Fetches tenant organization profile."""
        if self.is_simulation:
            return {
                "id": "tenant-simulated-contoso-corp",
                "displayName": "Contoso Corp (Sandbox)",
                "verifiedDomains": [{"name": "contoso.onmicrosoft.com", "isDefault": True}],
                "is_simulation": True
            }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{GRAPH_BASE_URL}/v1.0/organization", headers=self._headers())
            if resp.status_code != 200:
                raise ValueError(f"Failed to fetch organization: {resp.text}")
            data = resp.json()
            orgs = data.get("value", [])
            return orgs[0] if orgs else {"displayName": "Connected Tenant", "id": "unknown"}

    async def list_security_groups(self) -> List[Dict[str, Any]]:
        """Lists Entra ID security groups for deployment targeting."""
        if self.is_simulation:
            return [
                {"id": "all-devices", "displayName": "All Devices (Virtual Target)", "securityEnabled": True},
                {"id": "all-users", "displayName": "All Users (Virtual Target)", "securityEnabled": True},
                {"id": "grp-it-workstations", "displayName": "IT Engineering Workstations", "description": "High-perf engineering hardware"},
                {"id": "grp-finance-corp", "displayName": "Finance & Accounting Laptops", "description": "Standard corporate finance devices"},
                {"id": "grp-pilot-ring", "displayName": "Ring 0 - Pilot Fast Ring", "description": "Early preview and validation group"}
            ]

        async with httpx.AsyncClient(timeout=15.0) as client:
            url = f"{GRAPH_BASE_URL}/v1.0/groups?$filter=securityEnabled eq true&$select=id,displayName,description&$top=50"
            resp = await client.get(url, headers=self._headers())
            if resp.status_code != 200:
                raise ValueError(f"Failed to list groups: {resp.text}")
            groups = resp.json().get("value", [])
            # Prepend virtual targets
            return [
                {"id": "all-devices", "displayName": "All Devices (Virtual Target)"},
                {"id": "all-users", "displayName": "All Users (Virtual Target)"}
            ] + groups

    async def list_win32_apps(self) -> List[Dict[str, Any]]:
        """Lists Win32 LOB apps configured in Intune."""
        if self.is_simulation:
            return [
                {
                    "id": "app-sim-001",
                    "displayName": "Google Chrome (Enterprise)",
                    "publisher": "Google LLC",
                    "fileName": "ChromeStandaloneSetup64.exe",
                    "installCommandLine": "ChromeStandaloneSetup64.exe /silent /install",
                    "createdDateTime": "2026-10-15T10:00:00Z",
                    "size": 104857600,
                    "status": "Committed & Assigned"
                },
                {
                    "id": "app-sim-002",
                    "displayName": "Visual Studio Code (System Installer)",
                    "publisher": "Microsoft Corporation",
                    "fileName": "VSCodeSetup-x64.exe",
                    "installCommandLine": 'VSCodeSetup-x64.exe /VERYSILENT /NORESTART',
                    "createdDateTime": "2026-10-16T14:30:00Z",
                    "size": 95420100,
                    "status": "Committed & Assigned"
                }
            ]

        async with httpx.AsyncClient(timeout=20.0) as client:
            url = f"{GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps?$filter=isof('microsoft.graph.win32LobApp')&$top=50"
            resp = await client.get(url, headers=self._headers())
            if resp.status_code != 200:
                raise ValueError(f"Failed to list Win32 apps: {resp.text}")
            return resp.json().get("value", [])

    async def create_win32_lob_app(self, app_payload: Dict[str, Any], progress_cb: Optional[Callable[[str, int], None]] = None) -> Dict[str, Any]:
        """Creates the win32LobApp definition in Intune."""
        if progress_cb:
            progress_cb("Creating Win32 LOB App definition in Microsoft Intune...", 20)

        if self.is_simulation:
            await asyncio.sleep(1.2)
            sim_id = f"sim-{uuid.uuid4().hex[:12]}"
            return {
                "id": sim_id,
                "displayName": app_payload.get("displayName"),
                "publisher": app_payload.get("publisher"),
                "status": "Created"
            }

        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps"
            resp = await client.post(url, headers=self._headers(), json=app_payload)
            if resp.status_code not in [200, 201]:
                raise ValueError(f"Graph API error creating Win32 app ({resp.status_code}): {resp.text}")
            return resp.json()

    async def create_content_version(self, app_id: str, progress_cb: Optional[Callable[[str, int], None]] = None) -> Dict[str, Any]:
        """Creates a content version container for the Win32 app."""
        if progress_cb:
            progress_cb("Creating Intune content version container...", 35)

        if self.is_simulation:
            await asyncio.sleep(0.8)
            return {"id": "1"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps/{app_id}/contentVersions"
            resp = await client.post(url, headers=self._headers(), json={})
            if resp.status_code not in [200, 201]:
                raise ValueError(f"Failed to create content version: {resp.text}")
            return resp.json()

    async def create_content_file(
        self,
        app_id: str,
        content_version_id: str,
        filename: str,
        encrypted_size: int,
        manifest_base64: str,
        progress_cb: Optional[Callable[[str, int], None]] = None
    ) -> Dict[str, Any]:
        """Creates content file record and obtains Azure Blob SAS upload URI."""
        if progress_cb:
            progress_cb("Requesting Azure Blob Storage upload URI from Graph API...", 50)

        if self.is_simulation:
            await asyncio.sleep(1.0)
            return {
                "id": f"file-sim-{uuid.uuid4().hex[:8]}",
                "azureStorageUri": "https://intunestorage.blob.core.windows.net/simulation-block?sas=mock",
                "uploadState": "transient"
            }

        body = {
            "@odata.type": "#microsoft.graph.mobileAppContentFile",
            "name": f"{filename}.intunewin",
            "size": encrypted_size,
            "sizeEncrypted": encrypted_size,
            "manifest": manifest_base64,
            "isDependency": False
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps/{app_id}/contentVersions/{content_version_id}/files"
            resp = await client.post(url, headers=self._headers(), json=body)
            if resp.status_code not in [200, 201]:
                raise ValueError(f"Failed to create content file record: {resp.text}")
            return resp.json()

    async def upload_encrypted_content(
        self,
        azure_storage_uri: str,
        encrypted_data: bytes,
        progress_cb: Optional[Callable[[str, int], None]] = None
    ) -> None:
        """Uploads encrypted .intunewin content to Azure Blob Storage."""
        if progress_cb:
            progress_cb(f"Uploading encrypted payload ({len(encrypted_data)} bytes) to Azure Blob Storage...", 65)

        if self.is_simulation:
            # Simulate network upload in steps
            for pct in range(65, 85, 5):
                await asyncio.sleep(0.4)
                if progress_cb:
                    progress_cb(f"Uploading blocks to Azure Blob Storage ({pct}%)...", pct)
            return

        # Direct block blob upload
        headers = {
            "x-ms-blob-type": "BlockBlob"
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.put(azure_storage_uri, headers=headers, content=encrypted_data)
            if resp.status_code not in [200, 201]:
                raise ValueError(f"Azure Blob Storage upload failed ({resp.status_code}): {resp.text}")

    async def commit_content_file(
        self,
        app_id: str,
        content_version_id: str,
        file_id: str,
        encryption_info: Dict[str, Any],
        progress_cb: Optional[Callable[[str, int], None]] = None
    ) -> None:
        """Commits the content file with cryptographic verification keys."""
        if progress_cb:
            progress_cb("Committing file and verifying HMAC cryptographic digest with Intune...", 85)

        if self.is_simulation:
            await asyncio.sleep(1.0)
            return

        body = {
            "fileEncryptionInfo": encryption_info
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps/{app_id}/contentVersions/{content_version_id}/files/{file_id}/commit"
            resp = await client.post(url, headers=self._headers(), json=body)
            if resp.status_code not in [200, 204]:
                raise ValueError(f"Failed to commit content file: {resp.text}")

    async def commit_app(
        self,
        app_id: str,
        content_version_id: str,
        progress_cb: Optional[Callable[[str, int], None]] = None
    ) -> None:
        """Commits the content version to the application to make it ready."""
        if progress_cb:
            progress_cb("Finalizing application version commit in Intune...", 90)

        if self.is_simulation:
            await asyncio.sleep(0.8)
            return

        body = {
            "@odata.type": "#microsoft.graph.win32LobApp",
            "committedContentVersion": content_version_id
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps/{app_id}"
            resp = await client.patch(url, headers=self._headers(), json=body)
            if resp.status_code not in [200, 204]:
                raise ValueError(f"Failed to commit app version: {resp.text}")

    async def assign_app(
        self,
        app_id: str,
        target_group_id: str,
        intent: str = "required",
        progress_cb: Optional[Callable[[str, int], None]] = None
    ) -> Dict[str, Any]:
        """Assigns the deployed application to a target group or All Devices/Users."""
        if progress_cb:
            progress_cb(f"Assigning package to target: {target_group_id} (Intent: {intent})...", 95)

        if self.is_simulation:
            await asyncio.sleep(0.7)
            if progress_cb:
                progress_cb("Deployment and assignment successfully completed!", 100)
            return {"id": "sim-assign-123", "target": target_group_id, "intent": intent}

        if target_group_id == "all-devices":
            target = {"@odata.type": "#microsoft.graph.allDevicesAssignmentTarget"}
        elif target_group_id == "all-users":
            target = {"@odata.type": "#microsoft.graph.allLicensedUsersAssignmentTarget"}
        else:
            target = {
                "@odata.type": "#microsoft.graph.groupAssignmentTarget",
                "groupId": target_group_id
            }

        body = {
            "@odata.type": "#microsoft.graph.mobileAppAssignment",
            "intent": intent,
            "target": target
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps/{app_id}/assignments"
            resp = await client.post(url, headers=self._headers(), json=body)
            if resp.status_code not in [200, 201]:
                raise ValueError(f"Failed to assign application: {resp.text}")
            
            if progress_cb:
                progress_cb("Deployment and assignment successfully completed!", 100)
            return resp.json()
