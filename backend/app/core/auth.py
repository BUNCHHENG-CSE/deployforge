import time
import httpx
from typing import Dict, Any, Optional

class AzureAuthManager:
    """
    Handles Azure AD / Microsoft Entra ID authentication:
    1. Service Principal (Client ID + Client Secret + Tenant ID)
    2. Device Code Flow (Interactive login for IT administrators)
    3. Simulated / Sandbox credentials
    """

    WELL_KNOWN_CLIENT_ID = "d1ddf0e6-50e0-4d8b-924c-0c15012899c4" # Microsoft Intune PowerShell Client ID
    DEFAULT_SCOPES = ["https://graph.microsoft.com/.default"]
    DEVICE_CODE_SCOPES = [
        "DeviceManagementApps.ReadWrite.All",
        "Group.Read.All",
        "Directory.Read.All",
        "offline_access"
    ]

    @classmethod
    async def get_service_principal_token(cls, tenant_id: str, client_id: str, client_secret: str) -> Dict[str, Any]:
        """Obtains OAuth2 token via Client Credentials grant."""
        token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": "https://graph.microsoft.com/.default",
            "grant_type": "client_credentials"
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(token_url, data=data)
            if resp.status_code != 200:
                err_json = resp.json() if "application/json" in resp.headers.get("content-type", "") else {}
                err_msg = err_json.get("error_description", resp.text)
                raise ValueError(f"Azure authentication failed ({resp.status_code}): {err_msg}")
            
            token_data = resp.json()
            return {
                "access_token": token_data["access_token"],
                "expires_in": token_data.get("expires_in", 3600),
                "expires_at": time.time() + token_data.get("expires_in", 3600),
                "token_type": token_data.get("token_type", "Bearer"),
                "mode": "service_principal"
            }

    @classmethod
    async def initiate_device_code(cls, tenant_id: Optional[str] = "common", client_id: Optional[str] = None) -> Dict[str, Any]:
        """Initiates Device Code OAuth flow."""
        c_id = client_id or cls.WELL_KNOWN_CLIENT_ID
        endpoint = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/devicecode"
        data = {
            "client_id": c_id,
            "scope": " ".join(cls.DEVICE_CODE_SCOPES)
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(endpoint, data=data)
            if resp.status_code != 200:
                raise ValueError(f"Failed to initiate device code flow: {resp.text}")
            return resp.json()

    @classmethod
    async def poll_device_code_token(cls, tenant_id: str, client_id: str, device_code: str) -> Dict[str, Any]:
        """Polls for device code completion."""
        endpoint = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        data = {
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "client_id": client_id or cls.WELL_KNOWN_CLIENT_ID,
            "device_code": device_code
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(endpoint, data=data)
            resp_data = resp.json()

            if resp.status_code == 200:
                return {
                    "status": "success",
                    "access_token": resp_data["access_token"],
                    "refresh_token": resp_data.get("refresh_token"),
                    "expires_in": resp_data.get("expires_in", 3600),
                    "expires_at": time.time() + resp_data.get("expires_in", 3600)
                }
            
            error = resp_data.get("error")
            if error in ["authorization_pending", "slow_down"]:
                return {"status": "pending", "error": error}
            elif error == "code_expired":
                return {"status": "expired", "error": "The device login code has expired. Please initiate login again."}
            else:
                return {"status": "failed", "error": resp_data.get("error_description", error)}
