import seedData from './data.json';
import { CatalogApp, FleetBaseline, WinGetPackage, CuratedScript, TenantProfile } from '@/types';

export const CATALOG_APPS: CatalogApp[] = seedData.catalog as CatalogApp[];
export const WINGET_PACKAGES_CACHE: WinGetPackage[] = seedData.winget as WinGetPackage[];
export const CURATED_POWERSHELL_SCRIPTS: CuratedScript[] = seedData.scripts as CuratedScript[];
export const FLEET_BASELINES: FleetBaseline[] = seedData.baselines as FleetBaseline[];

export const tenantProfiles: TenantProfile[] = [
  {
    id: 'sandbox-tenant-12345',
    name: 'Contoso Corp (Sandbox)',
    mode: 'simulation',
    tenant_id: 'sandbox-tenant-12345',
    client_id: 'mock-client-id-001',
    is_active: true,
  },
  {
    id: 'acme-corp-prod',
    name: 'Acme Corp (Production)',
    mode: 'live',
    tenant_id: '89b53874-5111-4f81-8fb7-449339e14511',
    client_id: 'acme-client-id',
    is_active: false,
  },
  {
    id: 'fabrikam-msp-client',
    name: 'Fabrikam Ltd (MSP Client)',
    mode: 'live',
    tenant_id: '31b14a90-3342-411a-a1e4-857c79313abc',
    client_id: 'fabrikam-client-id',
    is_active: false,
  },
];

export const currentTenantSession = {
  connected: true,
  mode: 'simulation' as 'simulation' | 'live',
  tenant_name: 'Contoso Corp (Sandbox)',
  tenant_id: 'sandbox-tenant-12345',
  access_token: null as string | null,
  user_email: 'admin@contoso.onmicrosoft.com',
};
