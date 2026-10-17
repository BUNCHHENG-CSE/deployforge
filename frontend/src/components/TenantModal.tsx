import React, { useState, useEffect } from 'react';
import { X, Shield, Key, ExternalLink, CheckCircle2, AlertTriangle, RefreshCw, Server, Lock } from 'lucide-react';
import { TenantStatus } from '../types';
import { ApiService } from '../services/api';

interface TenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: TenantStatus | null;
  onStatusUpdated: () => void;
}

export const TenantModal: React.FC<TenantModalProps> = ({
  isOpen,
  onClose,
  status,
  onStatusUpdated,
}) => {
  const [tab, setTab] = useState<'device' | 'sp' | 'sandbox'>('sandbox');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Device Code state
  const [deviceCodeData, setDeviceCodeData] = useState<{
    user_code?: string;
    verification_uri?: string;
    device_code?: string;
    message?: string;
  } | null>(null);
  const [polling, setPolling] = useState(false);

  // Service Principal state
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  if (!isOpen) return null;

  const handleToggleSandbox = async () => {
    setLoading(true);
    setError(null);
    try {
      await ApiService.toggleSimulation(true);
      setSuccess('Switched to Sandbox Simulation Mode (Contoso Corp)');
      onStatusUpdated();
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to switch to sandbox');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDeviceCode = async () => {
    setLoading(true);
    setError(null);
    setDeviceCodeData(null);
    try {
      const res = await ApiService.initDeviceCode();
      setDeviceCodeData(res);
      setPolling(true);

      // Start polling
      const pollInterval = setInterval(async () => {
        try {
          const pollRes = await ApiService.pollDeviceCode('common', res.device_code);
          if (pollRes.status === 'success') {
            clearInterval(pollInterval);
            setPolling(false);
            setSuccess('Authenticated successfully with Microsoft Entra ID!');
            onStatusUpdated();
            setTimeout(() => {
              onClose();
              setSuccess(null);
            }, 1500);
          } else if (pollRes.status === 'expired' || pollRes.status === 'failed') {
            clearInterval(pollInterval);
            setPolling(false);
            setError(pollRes.error || 'Device login expired');
          }
        } catch (e: any) {
          clearInterval(pollInterval);
          setPolling(false);
          setError(e.message);
        }
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate device code login');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !clientId || !clientSecret) {
      setError('Please fill in Tenant ID, Client ID, and Client Secret');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await ApiService.connectServicePrincipal(tenantId, clientId, clientSecret);
      setSuccess('Successfully connected to Microsoft Intune via Service Principal!');
      onStatusUpdated();
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Service Principal connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Microsoft Intune Tenant Settings</h2>
              <p className="text-xs text-slate-400">Configure Graph API authentication and deployment target</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Overview */}
        <div className="p-6 pb-2">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${status?.is_simulation ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <div>
                <p className="text-xs text-slate-400">Current Active Environment</p>
                <p className="text-sm font-semibold text-white">
                  {status?.tenant_name || 'Sandbox (Simulation)'}
                </p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                status?.is_simulation
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              }`}
            >
              {status?.is_simulation ? 'Sandbox Mode' : 'Live Graph API'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => { setTab('sandbox'); setError(null); }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'sandbox' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Sandbox Mode</span>
            </button>
            <button
              onClick={() => { setTab('device'); setError(null); }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'device' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Device Login</span>
            </button>
            <button
              onClick={() => { setTab('sp'); setError(null); }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'sp' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>App Registration</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* SANDBOX TAB */}
          {tab === 'sandbox' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                The built-in Sandbox Simulation environment allows full testing of binary inspection, genuine <code className="text-indigo-400 font-mono">.intunewin</code> AES-256 packaging, detection rule generation, and simulated Graph API responses without connecting an active Azure subscription.
              </p>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Simulated Tenant:</span>
                  <span className="text-slate-200 font-medium">Contoso Corp (Sandbox)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Available Target Groups:</span>
                  <span className="text-slate-200 font-medium">All Devices, All Users, IT Engineering, Pilot Ring</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Package Download:</span>
                  <span className="text-emerald-400 font-medium">Full Real .intunewin Generation & Export</span>
                </div>
              </div>

              <button
                onClick={handleToggleSandbox}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                <span>Activate Sandbox Mode</span>
              </button>
            </div>
          )}

          {/* DEVICE CODE TAB */}
          {tab === 'device' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Log in directly using your Microsoft 365 / Entra ID Administrator account via Microsoft's secure Device Code flow. No need to pre-create Azure App Registrations.
              </p>

              {!deviceCodeData ? (
                <button
                  onClick={handleStartDeviceCode}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  <span>Generate Device Login Code</span>
                </button>
              ) : (
                <div className="space-y-4 bg-slate-950/80 border border-slate-800 p-4 rounded-xl text-center">
                  <p className="text-xs text-slate-400">Open Microsoft Device Login in your browser:</p>
                  <a
                    href="https://microsoft.com/devicelogin"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-blue-400 hover:underline font-mono text-sm font-semibold"
                  >
                    <span>https://microsoft.com/devicelogin</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <div className="pt-2">
                    <p className="text-xs text-slate-400 mb-1">Enter this Code:</p>
                    <div className="font-mono text-xl font-bold tracking-widest text-indigo-400 bg-slate-900 border border-indigo-500/30 py-2 px-4 rounded-lg inline-block select-all">
                      {deviceCodeData.user_code}
                    </div>
                  </div>

                  {polling && (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      <span>Waiting for admin approval in browser...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SERVICE PRINCIPAL TAB */}
          {tab === 'sp' && (
            <form onSubmit={handleConnectSP} className="space-y-3">
              <p className="text-xs text-slate-300">
                Connect via Azure App Registration credentials for unattended automation or CI/CD pipelines. Requires <code className="text-indigo-400">DeviceManagementApps.ReadWrite.All</code> permissions.
              </p>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Tenant ID (Directory ID)</label>
                <input
                  type="text"
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Application (Client) ID</label>
                <input
                  type="text"
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Client Secret</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>Connect Tenant via App Registration</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
