import { NextResponse } from 'next/server';
import { currentTenantSession } from '@/lib/data';

export async function GET() {
  return NextResponse.json({
    connected: currentTenantSession.connected,
    mode: currentTenantSession.mode,
    tenant_name: currentTenantSession.tenant_name,
    tenant_id: currentTenantSession.tenant_id,
    is_simulation: currentTenantSession.mode === 'simulation',
  });
}
