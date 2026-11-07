'use client';

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
  Server,
  RefreshCw,
  Cpu,
  Boxes,
  Compass,
  Copy
} from 'lucide-react';
import { DeploymentJob, TenantStatus, EntraGroup, FleetBaseline } from '../types';
import { ApiService } from '../services/api';
import { NavTab } from './Navbar';

interface DashboardViewProps {
  onNavigateTab: (tab: NavTab) => void;
  onDeployBaseline: (baseline: FleetBaseline) => void;
  tenantStatus: TenantStatus | null;
  groups: EntraGroup[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onDeployBaseline,
  tenantStatus,
}) => {
  const [jobs, setJobs] = useState<DeploymentJob[]>([]);
  const [baselines, setBaselines] = useState<FleetBaseline[]>([]);
  const [tenantAppsCount, setTenantAppsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [deployingBaselineId, setDeployingBaselineId] = useState<string | null>(null);
  const [selectedErrorCode, setSelectedErrorCode] = useState<string | null>('0x87D1041C');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const handleBaselineDeployClick = async (baseline: FleetBaseline) => {
    setDeployingBaselineId(baseline.id);
    try {
      await onDeployBaseline(baseline);
    } finally {
      setDeployingBaselineId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
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
      badge: 'Detection Rule Failure',
      meaning: 'Installation completed with exit code 0, but configured registry key, file path, or script rule returned false.',
      solution: 'Verify 32-bit vs 64-bit architecture flag. Test detection path in Custom Packager or inspect HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall.',
      tip: 'Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"'
    },
    {
      code: '1603',
      name: 'Fatal MSI Execution Error',
      badge: 'Installer Failure',
      meaning: 'Generic fatal error from msiexec. Usually indicates missing admin privileges, files locked by another process, or unfulfilled prerequisites.',
      solution: 'Ensure install command runs with "ALLUSERS=1 /qn /norestart" and execution context is set to "System".',
      tip: 'msiexec /i package.msi ALLUSERS=1 /qn /norestart /l*v "C:\\Windows\\Temp\\install.log"'
    },
    {
      code: '3010',
      name: 'Soft Reboot Required',
      badge: 'Reboot Pending',
      meaning: 'Installation succeeded, but a system reboot is required before files are fully operational.',
      solution: 'TCT DeployForge maps 3010 to soft-reboot success automatically. Append "/norestart" switch to prevent unexpected user reboots.',
      tip: 'Exit code 3010 is handled as Success (Reboot Pending) by Intune management engine.'
    },
    {
      code: '1618',
      name: 'Another Install In Progress',
      badge: 'Concurrency Lock',
      meaning: 'Another msiexec or Windows Update session is currently holding the global installation mutex.',
      solution: 'TCT DeployForge marks this code as Fast Retry. Intune will automatically re-attempt installation without failing the policy.',
      tip: 'Get-Process -Name msiexec -ErrorAction SilentlyContinue | Select-Object Id, ProcessName'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Command Center Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-[#0c142b]/80 to-slate-900/90 border border-white/[0.09] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-indigo-950/30">
        {/* Glow orb */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500/20 via-blue-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Top Status & Capabilities Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-400" />
              </span>
              <span>TCT DeployForge • Endpoint Operations Command Center</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>Unified x64 / ARM64</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>AES-256 .intunewin</span>
              </span>
            </div>
          </div>

          {/* Headline & Description */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Enterprise 1-Click Deployment Engine
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Automated Win32 packaging, detection rule derivation, chunked Azure Blob SAS uploads, and Entra ID fleet targeting in seconds.
              </p>
            </div>

            {/* Quick Action CTAs */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => onNavigateTab('catalog')}
                className="group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 border border-indigo-400/40 transition-all duration-200"
              >
                <Package className="w-4 h-4 text-indigo-100 group-hover:scale-110 transition-transform" />
                <span>Deploy Software</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-200 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => onNavigateTab('custom')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/[0.1] hover:border-cyan-500/40 text-slate-200 hover:text-white text-xs font-semibold shadow-sm transition-all duration-200"
              >
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <span>Custom Packager</span>
              </button>
            </div>
          </div>

          {/* Quick Engine Telemetry Bar */}
          <div className="pt-4 border-t border-white/[0.07] grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${tenantStatus?.is_simulation ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span className="font-mono text-[11px] text-slate-300">
                {tenantStatus?.is_simulation ? 'Contoso Sandbox (Sim)' : 'Microsoft Graph (Active)'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="font-mono text-[11px] text-slate-300">WinGet Index: 5,000+ cached</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="font-mono text-[11px] text-slate-300">Local Packager: Ready</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-[11px] text-slate-300">Fleet Rollout: 1-Click</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deployments Card */}
        <div
          onClick={() => onNavigateTab('deployments')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-white/[0.08] hover:border-indigo-500/40 p-5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:shadow-indigo-500/10"
        >
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Deployments</p>
              <p className="text-3xl font-extrabold text-white mt-1 group-hover:text-indigo-300 transition-colors">
                {totalCount}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                {activeCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                <span>{activeCount} currently active</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 group-hover:text-indigo-300 transition-all">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Success Rate Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-white/[0.08] hover:border-emerald-500/40 p-5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:shadow-emerald-500/10">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Success Rate</p>
              <p className="text-3xl font-extrabold text-emerald-400 mt-1">{successRate}%</p>
              <p className="text-[11px] text-emerald-500/80 mt-1">
                {completedCount} of {totalCount} verified
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-all">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Active Tenant Apps Card */}
        <div
          onClick={() => onNavigateTab('inventory')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-white/[0.08] hover:border-cyan-500/40 p-5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:shadow-cyan-500/10"
        >
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Tenant Apps</p>
              <p className="text-3xl font-extrabold text-cyan-400 mt-1 group-hover:text-cyan-300 transition-colors">
                {tenantAppsCount}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Win32 LOB committed</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-all">
              <Cloud className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tenant Mode Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-white/[0.08] hover:border-amber-500/40 p-5 backdrop-blur-xl shadow-lg transition-all duration-300 hover:shadow-amber-500/10">
          <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tenant Mode</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full ${tenantStatus?.is_simulation ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
                <p className="text-xl font-bold text-white capitalize">
                  {tenantStatus?.mode || 'Simulation'}
                </p>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[130px]" title={tenantStatus?.tenant_name}>
                {tenantStatus?.tenant_name || 'Contoso Corp (Sandbox)'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-all">
              <Server className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Fleet Workstation Baselines (1-Click Rollouts) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
              <span>Fleet Workstation Baselines (1-Click Rollout)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rapidly deploy curated software profiles to all endpoints or target groups with a single click.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {baselines.map((baseline) => {
            const isDeploying = deployingBaselineId === baseline.id;
            const badgeTheme =
              baseline.badge?.toUpperCase() === 'STANDARD'
                ? 'from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-500/30'
                : baseline.badge?.toUpperCase() === 'ENGINEERING'
                ? 'from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30'
                : 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30';

            return (
              <div
                key={baseline.id}
                className="group relative rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-white/[0.08] hover:border-indigo-500/50 p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between"
              >
                {/* Top decorative gradient bar */}
                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent group-hover:via-indigo-400 transition-colors" />

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r border ${badgeTheme}`}
                    >
                      {baseline.badge}
                    </span>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Boxes className="w-3.5 h-3.5 text-slate-500" />
                      <span>{baseline.app_ids.length} Apps Included</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {baseline.name}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">
                      {baseline.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      Bundled Win32 Packages
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {baseline.app_ids.map((appId) => (
                        <span
                          key={appId}
                          className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/[0.06] text-slate-300 font-mono hover:text-white transition-colors"
                        >
                          {appId}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-white/[0.07]">
                  <button
                    disabled={isDeploying}
                    onClick={() => handleBaselineDeployClick(baseline)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600/30 to-blue-600/30 hover:from-indigo-600 hover:to-blue-600 text-indigo-200 hover:text-white border border-indigo-500/40 font-semibold text-xs transition-all shadow-sm group-hover:shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {isDeploying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Initiating Fleet Rollout...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white transition-colors" />
                        <span>Deploy Baseline Batch</span>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Operations & Tools Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Deployment Pipelines Stream */}
        <div className="lg:col-span-2 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-white/[0.08] p-5 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Recent Deployment Pipelines</h3>
            </div>
            <button
              onClick={() => onNavigateTab('deployments')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 group"
            >
              <span>View Live Tracker</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto text-slate-500">
                <Compass className="w-5 h-5" />
              </div>
              <p className="text-slate-400 text-xs">No deployments initiated yet.</p>
              <p className="text-slate-500 text-[11px]">
                Select an application from the Catalog or deploy a fleet baseline above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {jobs.slice(0, 5).map((job) => (
                <div key={job.job_id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white truncate">{job.app_name}</p>
                      <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06]">
                        v{job.version}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-slate-500" />
                      <span>{job.current_step}</span>
                    </p>

                    {/* Mini progress bar */}
                    <div className="w-full bg-slate-800/80 rounded-full h-1 mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          job.status === 'completed'
                            ? 'bg-emerald-400'
                            : job.status === 'failed'
                            ? 'bg-rose-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${job.progress || 0}%` }}
                      />
                    </div>
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
                    <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
                      {job.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Intune Error Code Troubleshooter */}
        <div className="rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-white/[0.08] p-5 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Intune Return Codes Guide</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Quick Fixes</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Click on common Intune deployment failure codes to inspect root causes and copy remediation commands:
          </p>

          <div className="space-y-2">
            {ERROR_CODES.map((err) => {
              const isSelected = selectedErrorCode === err.code;

              return (
                <div
                  key={err.code}
                  onClick={() => setSelectedErrorCode(isSelected ? null : err.code)}
                  className={`p-3 rounded-xl cursor-pointer border transition-all text-xs ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
                      : 'bg-slate-950/50 border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-400">{err.code}</span>
                    <span className="text-slate-300 font-medium">{err.name}</span>
                  </div>

                  {isSelected && (
                    <div className="mt-2.5 pt-2.5 border-t border-white/[0.08] space-y-2 text-[11px] animate-in fade-in duration-200">
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Cause: </strong>
                        {err.meaning}
                      </p>
                      <p className="text-emerald-400">
                        <strong className="text-emerald-300">Fix: </strong>
                        {err.solution}
                      </p>

                      {/* Snippet */}
                      <div className="mt-2 p-2 rounded-lg bg-black/60 border border-white/[0.06] flex items-center justify-between gap-2 font-mono text-[10px] text-slate-300">
                        <span className="truncate">{err.tip}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(err.tip, err.code);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-white shrink-0 hover:bg-white/[0.06]"
                          title="Copy command"
                        >
                          {copiedCode === err.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
