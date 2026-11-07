import { NextResponse } from 'next/server';
import { IntuneGraphClient } from '@/lib/graph-client';
import { currentTenantSession } from '@/lib/data';

export async function GET() {
  try {
    const isSim =
      currentTenantSession.mode === 'simulation' || !currentTenantSession.access_token;
    const client = new IntuneGraphClient(currentTenantSession.access_token, isSim);
    const apps = await client.listWin32Apps();
    return NextResponse.json({ apps });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Failed to fetch apps' }, { status: 500 });
  }
}
