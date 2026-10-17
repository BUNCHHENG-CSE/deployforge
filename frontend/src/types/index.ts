export interface DetectionRule {
  type: 'msi' | 'file' | 'registry' | 'script';
  productCode?: string;
  productVersion?: string;
  productVersionOperator?: string;
  checkProductVersion?: boolean;
  path?: string;
  fileOrFolderName?: string;
  detectionType?: string;
  operator?: string;
  detectionValue?: string;
  check32BitOn64System?: boolean;
  keyPath?: string;
  valueName?: string;
  scriptContent?: string;
  enforceSignatureCheck?: boolean;
  runAs32Bit?: boolean;
  runAsAccount?: string;
  description?: string;
}

export interface CatalogApp {
  id: string;
  name: string;
  publisher: string;
  category: string;
  version: string;
  architecture: string;
  icon: string;
  description: string;
  download_url: string;
  filename: string;
  install_command: string;
  uninstall_command: string;
  install_behavior: string;
  detection_rule: DetectionRule;
}

export interface InstallerAnalysis {
  filename: string;
  file_type: string;
  size_bytes: number;
  app_name: string;
  publisher: string;
  version: string;
  architecture: string;
  engine: string;
  product_code?: string;
  upgrade_code?: string;
  install_command: string;
  uninstall_command: string;
  install_behavior: string;
  device_restart_behavior: string;
  suggested_detection_rules: DetectionRule[];
  notes?: string;
  error?: string;
}

export interface EntraGroup {
  id: string;
  displayName: string;
  description?: string;
  securityEnabled?: boolean;
}

export interface DeploymentJobLog {
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
  progress: number;
}

export interface DeploymentJob {
  job_id: string;
  app_name: string;
  publisher: string;
  version: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  current_step: string;
  logs: DeploymentJobLog[];
  created_at: string;
  completed_at?: string;
  error?: string;
  intunewin_filename?: string;
  intune_app_id?: string;
  is_simulation: boolean;
}

export interface TenantStatus {
  connected: boolean;
  mode: 'live' | 'simulation';
  tenant_name?: string;
  tenant_id?: string;
  is_simulation: boolean;
  error?: string;
}
