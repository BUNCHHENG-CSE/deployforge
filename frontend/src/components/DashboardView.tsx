import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Sparkles,
  UploadCloud,
  Terminal,
  Cloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Package,
  ExternalLink,
  ChevronRight,
  Code,
  ShieldAlert,
  Search,
  Check,
  Server
} from 'lucide-react';
import { DeploymentJob, TenantStatus, EntraGroup, FleetBaseline, CatalogApp } from '../types';
import { ApiService } from '../services/api';

interface DashboardViewProps {
  onNavigateTab: (tab: 'catalog' | 'scripts' | 'custom' | 'deployments' | 'inventory') => void;
  onDeployBaseline: (baseline: FleetBaseline) => void;
  tenantStatus: TenantStatus | null;
  groups: EntraGroup[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onDeployBaseline,
  tenantStatus,
  groups
}) => {
  const [jobs, setJobs] = useState<DeploymentJob[]>([]);
  const [baselines, setBaselines] = useState<FleetBaseline[]>([]);
  const [tenantAppsCount, setTenantAppsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedErrorCode, setSelectedErrorCode] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [jobsData, baseData, appsData] = await Promise.all([
        ApiService.listJobs().catch(() => []),
        ApiService.getFleetBaselines().catch(() => []),
        ApiService.getDeployedApps().catch(() => [])
      ]);
      setJobs(jobsData);
      setBaselines(baseData);
      setTenantAppsCount(appsData.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const failedCount = jobs.filter(j => j.status === 'failed').length;
  const activeCount = jobs.filter(j => j.status === 'running' || j.status === 'pending').length;
  const totalCount = jobs.length;
  const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  const ERROR_CODES = [
    {
      code: '0x87D1041C',
      name: 'Application Not Detected',
      meaning: 'Installation completed (exit code 0), but detection rules evaluated to false.',
      solution: 'Test detection rule in Custom Packager. Verify registry key path or file path exists. Ensure 32-bit vs 64-bit architecture flag matches.'
    },
    {
      code: '1603',
      name: 'Fatal MSI Error',
      meaning: 'Generic installer error from msiexec. Typically caused by missing admin rights, locked files, or missing prerequisites.',
      solution: 'Run with "ALLUSERS=1" switch, run as "system", or inspect Windows Event Viewer (Application log).'
    },
    {
      code: '3010',
      name: 'Soft Reboot Required',
      meaning: 'Installation succeeded, but a system reboot is required to finalize files.',
      solution: 'TCT DeployForge already includes 3010 in standard success return codes. Add /norestart flag to silent install command.'
    },
    {
      code: '1618',
      name: 'Fast Retry (Another Install Running)',
      meaning: 'Another msiexec or Windows Update session is currently holding the global installation lock.',
      solution: 'Intune will automatically retry based on the fastRetry return code configured by TCT DeployForge.'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Welcome & Quick Stats */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-white/[0.08] p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Intune Endpoint Operations Command Center</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Enterprise 1-Click Deployment Engine
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Automated Win32 packaging, detection rule derivation, chunked Azure Blob SAS uploads, and Entra ID fleet targeting in seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('catalog')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all"
            >
              <Package className="w-4 h-4" />
              <span>Deploy Software</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigateTab('custom')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/[0.1] text-slate-200 text-xs font-semibold transition-all"
            >
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              <span>Custom Installer</span>
            </button>
          </div>
        </div>

        {/* Subtle grid background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-slate-900/70 border border-white/[0.08] p-5 backdrop-blur-xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Deployments</p>
            <p className="text-3xl font-extrabold text-white mt-1">{totalCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">{activeCount} currently active</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-white/[0.08] p-5 backdrop-blur-xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Success Rate</p>
            <p className="text-3xl font-extrabold text-emerald-400 mt-1">{successRate}%</p>
            <p className="text-[11px] text-emerald-500/80 mt-1">{completedCount} verified deployments</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-white/[0.08] p-5 backdrop-blur-xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Tenant Apps</p>
            <p className="text-3xl font-extrabold text-cyan-400 mt-1">{tenantAppsCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Win32 LOB committed</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Cloud className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-white/[0.08] p-5 backdrop-blur-xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tenant Mode</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full ${tenantStatus?.is_simulation ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
              <p className="text-xl font-bold text-white capitalize">{tenantStatus?.mode || 'Simulation'}</p>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[140px]">{tenantStatus?.tenant_name || 'Sandbox'}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Server className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Fleet Baselines (1-Click Rollouts) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              <span>Fleet Workstation Baselines (1-Click Rollout)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rapidly deploy curated software profiles to all endpoints or target groups with a single click.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {baselines.map((baseline) => (
            <div
              key={baseline.id}
              className="group relative rounded-2xl bg-slate-900/80 border border-white/[0.08] hover:border-indigo-500/40 p-5 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {baseline.badge}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{baseline.app_ids.length} Apps Included</span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {baseline.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {baseline.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {baseline.app_ids.map((appId) => (
                    <span
                      key={appId}
                      className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-slate-800/80 border border-white/[0.06] text-slate-300 font-mono"
                    >
                      {appId}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => onDeployBaseline(baseline)}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 font-semibold text-xs transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Deploy Baseline Batch</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Operations & Tools Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Deployment Jobs Stream */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/80 border border-white/[0.08] p-5 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Recent Deployment Pipelines</h3>
            </div>
            <button
              onClick={() => onNavigateTab('deployments')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
            >
              <span>View Live Tracker</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No deployments initiated yet. Select an application or fleet baseline above to deploy!
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {jobs.slice(0, 5).map((job) => (
                <div key={job.job_id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white truncate">{job.app_name}</p>
                      <span className="text-[10px] text-slate-500 font-mono">v{job.version}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{job.current_step}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        job.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : job.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse'
                      }`}
                    >
                      {job.status === 'completed' && <Check className="w-3 h-3" />}
                      {job.status === 'running' && <Activity className="w-3 h-3 animate-spin" />}
                      {job.status}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{job.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Intune Error Code Troubleshooter */}
        <div className="rounded-2xl bg-slate-900/80 border border-white/[0.08] p-5 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">Intune Return Codes Guide</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Click on common Intune deployment failure codes to understand their root cause and instant fix:
          </p>

          <div className="space-y-2">
            {ERROR_CODES.map((err) => (
              <div
                key={err.code}
                onClick={() => setSelectedErrorCode(selectedErrorCode === err.code ? null : err.code)}
                className={`p-3 rounded-xl cursor-pointer border transition-all text-xs ${
                  selectedErrorCode === err.code
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
                    : 'bg-slate-950/50 border-white/[0.06] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-amber-400">{err.code}</span>
                  <span className="text-slate-300 font-medium">{err.name}</span>
                </div>

                {selectedErrorCode === err.code && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/[0.08] space-y-1.5 text-[11px]">
                    <p className="text-slate-400">
                      <strong className="text-slate-300">Cause:</strong> {err.meaning}
                    </p>
                    <p className="text-emerald-400">
                      <strong className="text-emerald-300">Fix:</strong> {err.solution}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
