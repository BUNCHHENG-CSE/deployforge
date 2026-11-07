import { NextRequest, NextResponse } from 'next/server';
import { tenantProfiles, currentTenantSession } from '@/lib/data';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = tenantProfiles.find((p) => p.id === id);

  if (!profile) {
    return NextResponse.json({ detail: `Profile not found: ${id}` }, { status: 404 });
  }

  tenantProfiles.forEach((p) => {
    p.is_active = p.id === id;
  });

  currentTenantSession.tenant_id = profile.tenant_id;
  currentTenantSession.tenant_name = profile.name;
  currentTenantSession.mode = profile.mode;
  currentTenantSession.connected = true;

  return NextResponse.json({
    status: 'activated',
    profile,
    current_session: currentTenantSession,
  });
}
