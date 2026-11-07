import { NextResponse } from 'next/server';
import { IntuneGraphClient } from '@/lib/graph-client';
import { currentTenantSession } from '@/lib/data';

export async function GET() {
  try {
    const isSim =
      currentTenantSession.mode === 'simulation' || !currentTenantSession.access_token;
    const client = new IntuneGraphClient(currentTenantSession.access_token, isSim);
    const groups = await client.listSecurityGroups();
    return NextResponse.json({ groups });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Failed to fetch groups' }, { status: 500 });
  }
}
