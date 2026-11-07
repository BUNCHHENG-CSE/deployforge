import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Lock,
  Copy,
  Check,
  Zap,
  Globe,
  Building,
  ArrowRight
} from 'lucide-react';
import { TenantStatus, TenantProfile } from '../types';
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
  const [tab, setTab] = useState<'profiles' | 'sandbox' | 'device' | 'sp'>('profiles');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Multi-tenant profiles state
  const [profiles, setProfiles] = useState<TenantProfile[]>([]);

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

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
    }
  }, [isOpen]);

  const loadProfiles = async () => {
    try {
      const data = await ApiService.listTenantProfiles();
      setProfiles(data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleActivateProfile = async (profileId: string) => {
    setLoading(true);
    setError(null);
    try {
      await ApiService.activateTenantProfile(profileId);
      await loadProfiles();
      setSuccess('Tenant Profile activated successfully!');
      onStatusUpdated();
      setTimeout(() => {
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to switch tenant profile');
    } finally {
      setLoading(false);
    }
  };

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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b1120] border border-white/[0.1] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Microsoft Intune Tenant Settings</h2>
              <p className="text-xs text-slate-400">Configure Graph API authentication and deployment target</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Status Banner */}
        <div className="p-6 pb-2">
          <div className="bg-slate-950/80 border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className={`absolute w-3 h-3 rounded-full ${status?.is_simulation ? 'bg-amber-400/30 animate-ping' : 'bg-emerald-400/30 animate-ping'}`} />
                <span className={`relative w-2.5 h-2.5 rounded-full ${status?.is_simulation ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Tenant</p>
                <p className="text-sm font-bold text-white">
                  {status?.tenant_name || 'Sandbox (Simulation)'}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                status?.is_simulation
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              }`}
            >
              {status?.is_simulation ? 'Sandbox Simulation' : 'Live Graph API'}
            </span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-6 pt-3">
          <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1.5 rounded-2xl border border-white/[0.06] text-xs font-semibold">
            <button
              onClick={() => { setTab('profiles'); setError(null); }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                tab === 'profiles' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Profiles</span>
            </button>
            <button
              onClick={() => { setTab('sandbox'); setError(null); }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                tab === 'sandbox' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Sandbox</span>
            </button>
            <button
              onClick={() => { setTab('device'); setError(null); }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                tab === 'device' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Device Login</span>
            </button>
            <button
              onClick={() => { setTab('sp'); setError(null); }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                tab === 'sp' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>App Reg</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* PROFILES TAB */}
          {tab === 'profiles' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Managed Service Provider (MSP) multi-tenant switcher. Rapidly jump between Sandbox, Internal Corporate IT, and Client Tenants with 1 click.
              </p>

              <div className="space-y-2.5">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      p.is_active
                        ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md'
                        : 'bg-slate-950/60 border-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{p.name}</span>
                        {p.is_active && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {p.tenant_id} • Mode: {p.mode}
                      </p>
                    </div>

                    {!p.is_active && (
                      <button
                        onClick={() => handleActivateProfile(p.id)}
                        disabled={loading}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        <span>Switch</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SANDBOX TAB */}
          {tab === 'sandbox' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                The Sandbox Simulation environment provides a complete playground for testing PE inspection, genuine <code className="text-indigo-400 font-mono bg-indigo-950/60 px-1 py-0.5 rounded border border-indigo-800/40">.intunewin</code> AES-256 encryption, detection rule generation, and Graph API mock deployments without connecting an active Azure tenant.
              </p>

              <div className="bg-slate-950/80 border border-white/[0.06] rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Simulated Tenant:</span>
                  <span className="text-slate-200 font-bold">Contoso Corp (Sandbox)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Available Audiences:</span>
                  <span className="text-slate-200">All Devices, IT Engineering, Pilot Ring</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Package Compilation:</span>
                  <span className="text-emerald-400 font-semibold">Real .intunewin Generation & Export</span>
                </div>
              </div>

              <button
                onClick={handleToggleSandbox}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>Use Sandbox Simulation Mode</span>
              </button>
            </div>
          )}

          {/* DEVICE LOGIN TAB */}
          {tab === 'device' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                The easiest way to connect without creating Azure App Registrations. Enter the one-time code on Microsoft's device login page using your normal Intune administrator credentials.
              </p>

              {!deviceCodeData ? (
                <button
                  onClick={handleStartDeviceCode}
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  <span>Generate Device Login Code</span>
                </button>
              ) : (
                <div className="bg-slate-950 p-4 rounded-2xl border border-white/[0.08] space-y-3">
                  <div className="text-center space-y-1">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Your Device Code</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-xl font-extrabold text-white bg-slate-900 px-4 py-1.5 rounded-xl border border-white/10 tracking-widest">
                        {deviceCodeData.user_code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(deviceCodeData.user_code || '')}
                        className="p-2 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 hover:text-white"
                        title="Copy code"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <a
                    href={deviceCodeData.verification_uri || 'https://microsoft.com/devicelogin'}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    <span>Open microsoft.com/devicelogin</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {polling && (
                    <div className="flex items-center justify-center gap-2 text-xs text-indigo-300 font-medium pt-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Waiting for admin approval in browser...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SERVICE PRINCIPAL TAB */}
          {tab === 'sp' && (
            <form onSubmit={handleConnectSP} className="space-y-3.5">
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect TCT DeployForge unattended via Microsoft Entra Application Credentials with <code className="text-indigo-400 font-mono">DeviceManagementApps.ReadWrite.All</code> permissions.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Entra Directory (Tenant) ID</label>
                <input
                  type="text"
                  placeholder="e.g. 72f988bf-86f1-41af-91ab-2d7cd011db47"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Application (Client) ID</label>
                <input
                  type="text"
                  placeholder="e.g. a3f1c9d2-45e6-42bb-92e1-456789abcdef"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Client Secret Value</label>
                <input
                  type="password"
                  placeholder="Enter secret from Certificates & secrets"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>Authenticate Service Principal</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
