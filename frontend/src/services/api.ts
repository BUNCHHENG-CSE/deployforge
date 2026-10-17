import { CatalogApp, InstallerAnalysis, EntraGroup, DeploymentJob, TenantStatus, DetectionRule } from '../types';

const API_BASE = '/api';

export const ApiService = {
  // Catalog
  async getCatalog(query?: string, category?: string): Promise<{ apps: CatalogApp[]; categories: string[]; total: number }> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (category) params.append('category', category);
    const res = await fetch(`${API_BASE}/catalog?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch catalog');
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

  // Tenant Authentication
  async getTenantStatus(): Promise<TenantStatus> {
    const res = await fetch(`${API_BASE}/tenant/status`);
    if (!res.ok) throw new Error('Failed to fetch tenant status');
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

  // Deployment
  async triggerDeploy(payload: {
    catalog_app_id?: string;
    app_name: string;
    description?: string;
    publisher: string;
    version: string;
    filename: string;
    file_token?: string;
    download_url?: string;
    architecture: string;
    install_command: string;
    uninstall_command: string;
    install_behavior: string;
    device_restart_behavior: string;
    detection_rules: DetectionRule[];
    target_group_id: string;
    assignment_intent: string;
  }): Promise<{ job_id: string; status: string; app_name: string }> {
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
