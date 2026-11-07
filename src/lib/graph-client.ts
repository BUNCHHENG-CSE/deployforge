const GRAPH_BASE_URL = 'https://graph.microsoft.com';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class IntuneGraphClient {
  accessToken?: string | null;
  isSimulation: boolean;

  constructor(accessToken?: string | null, isSimulation: boolean = false) {
    this.accessToken = accessToken;
    this.isSimulation = isSimulation || !Boolean(accessToken);
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async getTenantDetails() {
    if (this.isSimulation) {
      return {
        id: 'tenant-simulated-contoso-corp',
        displayName: 'Contoso Corp (Sandbox)',
        verifiedDomains: [{ name: 'contoso.onmicrosoft.com', isDefault: true }],
        is_simulation: true,
      };
    }

    const resp = await fetch(`${GRAPH_BASE_URL}/v1.0/organization`, {
      headers: this.headers(),
    });
    if (!resp.ok) {
      throw new Error(`Failed to fetch organization: ${await resp.text()}`);
    }
    const data = await resp.json();
    return data.value?.[0] || { displayName: 'Connected Tenant', id: 'unknown' };
  }

  async listSecurityGroups() {
    if (this.isSimulation) {
      return [
        { id: 'all-devices', displayName: 'All Devices (Virtual Target)', securityEnabled: true },
        { id: 'all-users', displayName: 'All Users (Virtual Target)', securityEnabled: true },
        {
          id: 'grp-it-workstations',
          displayName: 'IT Engineering Workstations',
          description: 'High-perf engineering hardware',
        },
        {
          id: 'grp-finance-corp',
          displayName: 'Finance & Accounting Laptops',
          description: 'Standard corporate finance devices',
        },
        {
          id: 'grp-pilot-ring',
          displayName: 'Ring 0 - Pilot Fast Ring',
          description: 'Early preview and validation group',
        },
      ];
    }

    const url = `${GRAPH_BASE_URL}/v1.0/groups?$filter=securityEnabled eq true&$select=id,displayName,description&$top=50`;
    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) {
      throw new Error(`Failed to list groups: ${await resp.text()}`);
    }
    const data = await resp.json();
    return [
      { id: 'all-devices', displayName: 'All Devices (Virtual Target)' },
      { id: 'all-users', displayName: 'All Users (Virtual Target)' },
      ...(data.value || []),
    ];
  }

  async listWin32Apps() {
    if (this.isSimulation) {
      return [
        {
          id: 'app-sim-001',
          displayName: 'Google Chrome (Enterprise)',
          publisher: 'Google LLC',
          fileName: 'ChromeStandaloneSetup64.exe',
          installCommandLine: 'ChromeStandaloneSetup64.exe /silent /install',
          createdDateTime: '2026-10-15T10:00:00Z',
          size: 104857600,
          status: 'Committed & Assigned',
        },
        {
          id: 'app-sim-002',
          displayName: 'Visual Studio Code (System Installer)',
          publisher: 'Microsoft Corporation',
          fileName: 'VSCodeSetup-x64.exe',
          installCommandLine: 'VSCodeSetup-x64.exe /VERYSILENT /NORESTART',
          createdDateTime: '2026-10-16T14:30:00Z',
          size: 95420100,
          status: 'Committed & Assigned',
        },
      ];
    }

    const url = `${GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps?$filter=isof('microsoft.graph.win32LobApp')&$top=50`;
    const resp = await fetch(url, { headers: this.headers() });
    if (!resp.ok) {
      throw new Error(`Failed to list Win32 apps: ${await resp.text()}`);
    }
    const data = await resp.json();
    return data.value || [];
  }

  async createWin32LobApp(
    payload: Record<string, any>,
    progressCb?: (msg: string, pct: number) => void
  ) {
    if (progressCb) progressCb('Creating Win32 LOB application object in Microsoft Graph...', 35);

    if (this.isSimulation) {
      await sleep(600);
      return {
        id: `win32-sim-${Math.random().toString(36).substring(2, 9)}`,
        displayName: payload.displayName,
        publisher: payload.publisher,
      };
    }

    const url = `${GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      throw new Error(`Failed to create Win32 App: ${await resp.text()}`);
    }
    return resp.json();
  }

  async createContentVersion(appId: string, progressCb?: (msg: string, pct: number) => void) {
    if (progressCb) progressCb('Allocating application content version in Intune...', 50);

    if (this.isSimulation) {
      await sleep(400);
      return { id: '1' };
    }

    const url = `${GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps/${appId}/contentVersions`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({}),
    });
    if (!resp.ok) {
      throw new Error(`Failed to create content version: ${await resp.text()}`);
    }
    return resp.json();
  }

  async createContentFile(
    appId: string,
    contentVersionId: string,
    filename: string,
    encryptedSize: number,
    manifestBase64: string,
    progressCb?: (msg: string, pct: number) => void
  ) {
    if (progressCb)
      progressCb('Requesting encrypted Azure Blob Storage upload SAS token...', 60);

    if (this.isSimulation) {
      await sleep(500);
      return {
        id: `file-sim-${Math.random().toString(36).substring(2, 9)}`,
        azureStorageUri: 'https://mockblob.azure.com/intunewin-simulated',
      };
    }

    const body = {
      name: `${filename}.intunewin`,
      size: encryptedSize,
      manifest: manifestBase64,
      isDependency: false,
    };

    const url = `${GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps/${appId}/contentVersions/${contentVersionId}/files`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      throw new Error(`Failed to create content file: ${await resp.text()}`);
    }
    return resp.json();
  }

  async uploadEncryptedContent(
    azureStorageUri: string,
    encryptedData: Buffer,
    progressCb?: (msg: string, pct: number) => void
  ) {
    if (progressCb)
      progressCb('Streaming AES-256 encrypted .intunewin payload to Azure Blob Storage...', 75);

    if (this.isSimulation) {
      await sleep(1000);
      return;
    }

    const resp = await fetch(azureStorageUri, {
      method: 'PUT',
      headers: {
        'x-ms-blob-type': 'BlockBlob',
      },
      body: new Uint8Array(encryptedData),
    });
    if (!resp.ok) {
      throw new Error(`Azure Blob Storage upload failed (${resp.status}): ${await resp.text()}`);
    }
  }

  async commitContentFile(
    appId: string,
    contentVersionId: string,
    fileId: string,
    encryptionInfo: Record<string, any>,
    progressCb?: (msg: string, pct: number) => void
  ) {
    if (progressCb)
      progressCb('Committing file and verifying HMAC cryptographic digest with Intune...', 85);

    if (this.isSimulation) {
      await sleep(600);
      return;
    }

    const body = { fileEncryptionInfo: encryptionInfo };
    const url = `${GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps/${appId}/contentVersions/${contentVersionId}/files/${fileId}/commit`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!resp.ok && resp.status !== 204) {
      throw new Error(`Failed to commit content file: ${await resp.text()}`);
    }
  }

  async commitApp(
    appId: string,
    contentVersionId: string,
    progressCb?: (msg: string, pct: number) => void
  ) {
    if (progressCb) progressCb('Finalizing application version commit in Intune...', 90);

    if (this.isSimulation) {
      await sleep(500);
      return;
    }

    const body = {
      '@odata.type': '#microsoft.graph.win32LobApp',
      committedContentVersion: contentVersionId,
    };
    const url = `${GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps/${appId}`;
    const resp = await fetch(url, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!resp.ok && resp.status !== 204) {
      throw new Error(`Failed to commit app version: ${await resp.text()}`);
    }
  }

  async assignApp(
    appId: string,
    targetGroupId: string,
    intent: string = 'required',
    progressCb?: (msg: string, pct: number) => void
  ) {
    if (progressCb)
      progressCb(`Assigning package to target: ${targetGroupId} (Intent: ${intent})...`, 95);

    if (this.isSimulation) {
      await sleep(500);
      if (progressCb) progressCb('Deployment and assignment successfully completed!', 100);
      return { id: 'sim-assign-123', target: targetGroupId, intent };
    }

    let target: Record<string, any>;
    if (targetGroupId === 'all-devices') {
      target = { '@odata.type': '#microsoft.graph.allDevicesAssignmentTarget' };
    } else if (targetGroupId === 'all-users') {
      target = { '@odata.type': '#microsoft.graph.allLicensedUsersAssignmentTarget' };
    } else {
      target = {
        '@odata.type': '#microsoft.graph.groupAssignmentTarget',
        groupId: targetGroupId,
      };
    }

    const body = {
      '@odata.type': '#microsoft.graph.mobileAppAssignment',
      intent,
      target,
    };

    const url = `${GRAPH_BASE_URL}/beta/deviceAppManagement/mobileApps/${appId}/assignments`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      throw new Error(`Failed to assign application: ${await resp.text()}`);
    }
    if (progressCb) progressCb('Deployment and assignment successfully completed!', 100);
    return resp.json();
  }
}
