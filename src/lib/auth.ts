export class AzureAuthManager {
  static readonly WELL_KNOWN_CLIENT_ID = 'd1ddf0e6-50e0-4d8b-924c-0c15012899c4'; // Microsoft Intune PowerShell Client ID
  static readonly DEFAULT_SCOPES = ['https://graph.microsoft.com/.default'];
  static readonly DEVICE_CODE_SCOPES = [
    'DeviceManagementApps.ReadWrite.All',
    'Group.Read.All',
    'Directory.Read.All',
    'offline_access',
  ];

  static async getServicePrincipalToken(tenantId: string, clientId: string, clientSecret: string) {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(`Azure authentication failed (${resp.status}): ${err.error_description || resp.statusText}`);
    }

    const data = await resp.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 3600,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      token_type: data.token_type || 'Bearer',
      mode: 'service_principal',
    };
  }

  static async initiateDeviceCode(tenantId: string = 'common', clientId?: string) {
    const cId = clientId || this.WELL_KNOWN_CLIENT_ID;
    const endpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/devicecode`;

    const params = new URLSearchParams();
    params.append('client_id', cId);
    params.append('scope', this.DEVICE_CODE_SCOPES.join(' '));

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Failed to initiate device code flow: ${err}`);
    }

    return resp.json();
  }

  static async pollDeviceCodeToken(tenantId: string, clientId: string, deviceCode: string) {
    const endpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
    params.append('client_id', clientId || this.WELL_KNOWN_CLIENT_ID);
    params.append('device_code', deviceCode);

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await resp.json();

    if (resp.ok) {
      return {
        status: 'success',
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in || 3600,
        expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      };
    }

    const error = data.error;
    if (error === 'authorization_pending' || error === 'slow_down') {
      return { status: 'pending', error };
    } else if (error === 'code_expired') {
      return {
        status: 'expired',
        error: 'The device login code has expired. Please initiate login again.',
      };
    } else {
      return { status: 'failed', error: data.error_description || error };
    }
  }
}
