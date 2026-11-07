import { NextRequest, NextResponse } from 'next/server';
import { AzureAuthManager } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tenantId = body.tenant_id || 'common';
    const clientId = body.client_id;

    const data = await AzureAuthManager.initiateDeviceCode(tenantId, clientId);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Failed to initiate device code' }, { status: 500 });
  }
}
