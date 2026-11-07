import { NextRequest, NextResponse } from 'next/server';
import { AzureAuthManager } from '@/lib/auth';
import { currentTenantSession } from '@/lib/data';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenant_id = 'common', device_code, client_id } = body;

    if (!device_code) {
      return NextResponse.json({ detail: 'device_code is required' }, { status: 400 });
    }

    const result = await AzureAuthManager.pollDeviceCodeToken(tenant_id, client_id, device_code);

    if (result.status === 'success' && result.access_token) {
      currentTenantSession.tenant_id = tenant_id;
      currentTenantSession.tenant_name = 'Entra ID Connected Tenant';
      currentTenantSession.mode = 'live';
      currentTenantSession.connected = true;
      currentTenantSession.access_token = result.access_token;

      // Update Prisma
      try {
        await prisma.tenant.upsert({
          where: { id: tenant_id },
          update: {
            authMode: 'device_code',
            accessToken: result.access_token,
            refreshToken: result.refresh_token || null,
            tokenExpiresAt: result.expires_at ? new Date(result.expires_at) : null,
            isSimulation: false,
          },
          create: {
            id: tenant_id,
            displayName: currentTenantSession.tenant_name,
            authMode: 'device_code',
            accessToken: result.access_token,
            refreshToken: result.refresh_token || null,
            tokenExpiresAt: result.expires_at ? new Date(result.expires_at) : null,
            isSimulation: false,
          },
        });
      } catch {
        // ignore
      }
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Polling failed' }, { status: 500 });
  }
}
