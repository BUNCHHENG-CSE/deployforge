import { NextRequest, NextResponse } from 'next/server';
import { AzureAuthManager } from '@/lib/auth';
import { currentTenantSession } from '@/lib/data';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenant_id, client_id, client_secret } = body;

    if (!tenant_id || !client_id || !client_secret) {
      return NextResponse.json(
        { detail: 'tenant_id, client_id, and client_secret are required' },
        { status: 400 }
      );
    }

    const tokenData = await AzureAuthManager.getServicePrincipalToken(
      tenant_id,
      client_id,
      client_secret
    );

    currentTenantSession.tenant_id = tenant_id;
    currentTenantSession.tenant_name = `Tenant (${tenant_id.substring(0, 8)}...)`;
    currentTenantSession.mode = 'live';
    currentTenantSession.connected = true;
    currentTenantSession.access_token = tokenData.access_token;

    // Persist tenant to Prisma
    try {
      await prisma.tenant.upsert({
        where: { id: tenant_id },
        update: {
          displayName: currentTenantSession.tenant_name,
          authMode: 'service_principal',
          clientId: client_id,
          accessToken: tokenData.access_token,
          tokenExpiresAt: new Date(tokenData.expires_at),
          isSimulation: false,
        },
        create: {
          id: tenant_id,
          displayName: currentTenantSession.tenant_name,
          authMode: 'service_principal',
          clientId: client_id,
          accessToken: tokenData.access_token,
          tokenExpiresAt: new Date(tokenData.expires_at),
          isSimulation: false,
        },
      });
    } catch {
      // ignore
    }

    return NextResponse.json({
      status: 'connected',
      tenant_id,
      mode: 'live',
      expires_in: tokenData.expires_in,
    });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Authentication failed' }, { status: 400 });
  }
}
