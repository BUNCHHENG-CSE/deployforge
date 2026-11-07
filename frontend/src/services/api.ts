import {
  CatalogApp,
  InstallerAnalysis,
  EntraGroup,
  DeploymentJob,
  TenantStatus,
  DetectionRule,
  FleetBaseline,
  WinGetPackage,
  CuratedScript,
  RuleSimulationResult,
  TenantProfile
} from '../types';

const API_BASE = '/api';

export const ApiService = {
  // Catalog & Baselines
  async getCatalog(query?: string, category?: string): Promise<{ apps: CatalogApp[]; categories: string[]; total: number }> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (category) params.append('category', category);
    const res = await fetch(`${API_BASE}/catalog?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch catalog');
    return res.json();
  },

  async getFleetBaselines(): Promise<FleetBaseline[]> {
    const res = await fetch(`${API_BASE}/catalog/baselines`);
    if (!res.ok) throw new Error('Failed to fetch fleet baselines');
    const data = await res.json();
    return data.baselines || [];
  },

  // WinGet Integration
  async searchWinGet(query: string): Promise<WinGetPackage[]> {
    const res = await fetch(`${API_BASE}/winget/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search WinGet');
    const data = await res.json();
    return data.packages || [];
  },

  async getWinGetPackage(packageId: string): Promise<CatalogApp> {
    const res = await fetch(`${API_BASE}/winget/${encodeURIComponent(packageId)}`);
    if (!res.ok) throw new Error('Failed to fetch WinGet package');
    return res.json();
  },

  // PowerShell Script Studio
  async getCuratedScripts(): Promise<CuratedScript[]> {
    const res = await fetch(`${API_BASE}/scripts/curated`);
    if (!res.ok) throw new Error('Failed to fetch curated scripts');
    const data = await res.json();
    return data.scripts || [];
  },

  async packageScript(payload: {
    script_id: string;
    script_name: string;
    script_content: string;
    version?: string;
  }): Promise<{ intunewin_filename: string; install_command: string; uninstall_command: string; detection_rule: DetectionRule }> {
    const res = await fetch(`${API_BASE}/scripts/package`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to package PowerShell script');
    return res.json();
  },

  async deployScript(payload: {
    script_id: string;
    script_name: string;
    script_content: string;
    version?: string;
    publisher?: string;
    description?: string;
    target_group_id: string;
    assignment_intent: string;
  }): Promise<{ job_id: string; status: string; script_name: string; intunewin_filename: string }> {
    const res = await fetch(`${API_BASE}/scripts/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Deploy script failed' }));
      throw new Error(err.detail || 'Deploy script failed');
    }
    return res.json();
  },

  // Detection Rule Simulator
  async simulateDetectionRule(rule: DetectionRule): Promise<RuleSimulationResult> {
    const res = await fetch(`${API_BASE}/rules/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule }),
    });
    if (!res.ok) throw new Error('Failed to simulate detection rule');
    return res.json();
  },

  // Binary Upload & Analysis
  async uploadInstaller(file: File): Promise<{ file_token: string; filename: string; size_bytes: number; analysis: InstallerAnalysis }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  // Tenant Authentication & MSP Profiles
  async getTenantStatus(): Promise<TenantStatus> {
    const res = await fetch(`${API_BASE}/tenant/status`);
    if (!res.ok) throw new Error('Failed to fetch tenant status');
    return res.json();
  },

  async listTenantProfiles(): Promise<TenantProfile[]> {
    const res = await fetch(`${API_BASE}/tenant/profiles`);
    if (!res.ok) throw new Error('Failed to fetch tenant profiles');
    const data = await res.json();
    return data.profiles || [];
  },

  async activateTenantProfile(profileId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/tenant/profiles/${encodeURIComponent(profileId)}/activate`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to activate tenant profile');
    return res.json();
  },

  async toggleSimulation(enable: boolean): Promise<{ status: string; mode: string }> {
    const res = await fetch(`${API_BASE}/tenant/toggle-simulation?enable=${enable}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to toggle simulation mode');
    return res.json();
  },

  async connectServicePrincipal(tenantId: string, clientId: string, clientSecret: string) {
    const res = await fetch(`${API_BASE}/tenant/connect-sp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, client_id: clientId, client_secret: clientSecret }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Authentication failed' }));
      throw new Error(err.detail || 'Failed to connect tenant');
    }
    return res.json();
  },

  async initDeviceCode(tenantId?: string, clientId?: string) {
    const res = await fetch(`${API_BASE}/tenant/device-code/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId || 'common', client_id: clientId }),
    });
    if (!res.ok) throw new Error('Failed to initiate device code login');
    return res.json();
  },

  async pollDeviceCode(tenantId: string, deviceCode: string, clientId?: string) {
    const res = await fetch(`${API_BASE}/tenant/device-code/poll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, device_code: deviceCode, client_id: clientId }),
    });
    return res.json();
  },

  async getGroups(): Promise<EntraGroup[]> {
    const res = await fetch(`${API_BASE}/tenant/groups`);
    if (!res.ok) throw new Error('Failed to fetch Entra groups');
    const data = await res.json();
    return data.groups || [];
  },

  async getDeployedApps(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/tenant/apps`);
    if (!res.ok) throw new Error('Failed to fetch deployed apps');
    const data = await res.json();
    return data.apps || [];
  },

  // Deployment Single & Batch
  async triggerDeploy(payload: any): Promise<{ job_id: string; status: string; app_name: string }> {
    const res = await fetch(`${API_BASE}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Deploy failed' }));
      throw new Error(err.detail || 'Deploy failed');
    }
    return res.json();
  },

  async triggerBatchDeploy(payload: {
    apps: any[];
    target_group_id: string;
    assignment_intent: string;
    batch_name?: string;
  }): Promise<{ batch_id: string; count: number; job_ids: string[]; status: string }> {
    const res = await fetch(`${API_BASE}/deploy/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Batch deploy failed' }));
      throw new Error(err.detail || 'Batch deploy failed');
    }
    return res.json();
  },

  async listJobs(): Promise<DeploymentJob[]> {
    const res = await fetch(`${API_BASE}/jobs`);
    if (!res.ok) throw new Error('Failed to list jobs');
    const data = await res.json();
    return data.jobs || [];
  },

  async getJob(jobId: string): Promise<DeploymentJob> {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`);
    if (!res.ok) throw new Error('Failed to get job');
    return res.json();
  },

  subscribeJob(jobId: string, onUpdate: (job: DeploymentJob) => void): () => void {
    const eventSource = new EventSource(`${API_BASE}/jobs/${jobId}/stream`);
    eventSource.onmessage = (event) => {
      try {
        const job = JSON.parse(event.data);
        onUpdate(job);
      } catch (e) {
        // Heartbeat or parse error
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => eventSource.close();
  },
};
