import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Terminal,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Copy,
  Check,
  Filter,
  FileCode,
  Zap,
  Radio,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { DeploymentJob } from '../types';
import { ApiService } from '../services/api';

interface DeploymentTrackerProps {
  currentJobId?: string | null;
}

const PHASES = [
  { label: 'Acquisition', minPct: 15, desc: 'Download / File Ingestion' },
  { label: 'IntuneWin Packaging', minPct: 30, desc: 'AES-256 & SHA256 Manifest' },
  { label: 'Intune App Object', minPct: 45, desc: 'Graph win32LobApp Creation' },
  { label: 'Azure Blob Upload', minPct: 80, desc: 'Chunked Azure SAS Transfer' },
  { label: 'HMAC Commit', minPct: 92, desc: 'Commit & Encryption Seal' },
  { label: 'Target Assignment', minPct: 100, desc: 'Entra Group Targeting' },
];

export const DeploymentTracker: React.FC<DeploymentTrackerProps> = ({ currentJobId }) => {
  const [jobs, setJobs] = useState<DeploymentJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<DeploymentJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'success'>('all');
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadJobs();
  }, [currentJobId]);

  useEffect(() => {
    if (!selectedJob || selectedJob.status === 'completed' || selectedJob.status === 'failed') {
      return;
    }
    // Subscribe to SSE stream for real-time updates
    const unsubscribe = ApiService.subscribeJob(selectedJob.job_id, (updatedJob) => {
      setSelectedJob(updatedJob);
      setJobs((prev) =>
        prev.map((j) => (j.job_id === updatedJob.job_id ? updatedJob : j))
      );
    });

    return () => unsubscribe();
  }, [selectedJob?.job_id, selectedJob?.status]);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedJob?.logs, autoScroll]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await ApiService.listJobs();
      setJobs(data);
      if (currentJobId) {
        const found = data.find((j) => j.job_id === currentJobId);
        if (found) setSelectedJob(found);
      } else if (data.length > 0 && !selectedJob) {
        setSelectedJob(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLogs = () => {
    if (!selectedJob) return;
    const text = selectedJob.logs
      .map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  // Filter jobs list
  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      j.app_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      j.publisher.toLowerCase().includes(filterQuery.toLowerCase()) ||
      j.job_id.toLowerCase().includes(filterQuery.toLowerCase());

    const isRunning = j.status === 'running' || j.status === 'pending';
    if (statusFilter === 'running') return matchesSearch && isRunning;
    if (statusFilter === 'completed') return matchesSearch && j.status === 'completed';
    if (statusFilter === 'failed') return matchesSearch && j.status === 'failed';
    return matchesSearch;
  });

  // Calculate statistics
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter((j) => j.status === 'running' || j.status === 'pending').length;
  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const failedJobs = jobs.filter((j) => j.status === 'failed').length;

  // Filter logs inside current job
  const filteredLogs = selectedJob?.logs.filter((l) => {
    if (logFilter === 'all') return true;
    return l.level === logFilter;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Radio className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Real-time Telemetry & SSE Stream</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Deployment Pipeline & Jobs</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Live monitoring of Win32 packaging, Azure Blob SAS file transmission, Graph API lobApp creation, and target group policy assignments.
          </p>
        </div>

        <button
          onClick={loadJobs}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/90 border border-white/[0.08] hover:border-white/20 rounded-xl text-xs font-semibold text-slate-200 transition-all shadow-md hover:bg-slate-800 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Pipeline</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Deployments</p>
            <p className="text-2xl font-extrabold text-white mt-1">{totalJobs}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active In Pipeline</p>
            <p className="text-2xl font-extrabold text-indigo-400 mt-1">{activeJobs}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Activity className={`w-5 h-5 ${activeJobs > 0 ? 'animate-pulse' : ''}`} />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Succeeded</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{completedJobs}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Failures / Errors</p>
            <p className="text-2xl font-extrabold text-red-400 mt-1">{failedJobs}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Container: Left Jobs List + Right Mission Control */}
      {loading && jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-sm font-medium">Fetching deployment jobs from database...</span>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-white/[0.06] p-8">
          <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No deployments triggered yet</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            Deploy an application from the Enterprise Catalog or Custom Packager to start tracking live Intune packaging and Graph API upload jobs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Jobs Feed */}
          <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-4 space-y-3 shadow-xl backdrop-blur-xl h-[680px] flex flex-col">
            {/* Search and Filters */}
            <div className="space-y-2 pb-2 border-b border-white/[0.06]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter jobs..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Status chips */}
              <div className="flex items-center gap-1 text-[11px]">
                {(['all', 'running', 'completed', 'failed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2 py-0.5 rounded-lg font-medium capitalize transition-colors ${
                      statusFilter === s
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredJobs.map((j) => {
                const isSelected = selectedJob?.job_id === j.job_id;
                const isDone = j.status === 'completed';
                const isFailed = j.status === 'failed';
                const isRunning = j.status === 'running' || j.status === 'pending';

                return (
                  <button
                    key={j.job_id}
                    onClick={() => setSelectedJob(j)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 shadow-lg shadow-indigo-500/10'
                        : 'bg-slate-950/70 border-white/[0.05] hover:border-white/20 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-white truncate max-w-[170px]">
                        {j.app_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          isDone
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : isFailed
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 animate-pulse'
                        }`}
                      >
                        {j.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate max-w-[130px]">{j.publisher}</span>
                      <span className="font-mono font-semibold text-slate-300">{j.progress}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-900 rounded-full h-1.5 mt-2.5 overflow-hidden border border-white/[0.04]">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isDone ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                        }`}
                        style={{ width: `${j.progress}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 2 Columns: Selected Job Workspace */}
          <div className="lg:col-span-2 space-y-4">
            {selectedJob && (
              <>
                {/* Job Hero Card & 6-Phase Stepper */}
                <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-2xl backdrop-blur-xl">
                  {/* Top line with title, ID, download */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-white tracking-tight">{selectedJob.app_name}</h2>
                        <span className="text-xs text-indigo-300 font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 font-semibold">
                          v{selectedJob.version}
                        </span>
                        {selectedJob.is_simulation && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Sandbox Sim
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        Job ID: <span className="text-slate-300">{selectedJob.job_id}</span> • {selectedJob.publisher}
                      </p>
                    </div>

                    {selectedJob.intunewin_filename && (
                      <a
                        href={`/api/packages/download/${selectedJob.intunewin_filename}`}
                        download
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-white/10 transition-all shadow-md hover:scale-105"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Download .intunewin</span>
                      </a>
                    )}
                  </div>

                  {/* 6-Phase Visual Stepper */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Graph API Deployment Stages</span>
                      <span className="font-mono text-indigo-400 font-bold">{selectedJob.progress}% Complete</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {PHASES.map((p, idx) => {
                        const completed = selectedJob.progress >= p.minPct;
                        const active =
                          selectedJob.progress < p.minPct &&
                          (idx === 0 || selectedJob.progress >= PHASES[idx - 1].minPct);

                        return (
                          <div
                            key={p.label}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              completed
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : active
                                ? 'bg-indigo-500/15 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/10'
                                : 'bg-slate-950/60 border-white/[0.05] text-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-center mb-1.5">
                              {completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : active ? (
                                <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                              ) : (
                                <Clock className="w-4 h-4 text-slate-600" />
                              )}
                            </div>
                            <p className="text-[10px] font-bold leading-tight">{p.label}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5 truncate">{p.desc}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-300 font-medium">{selectedJob.current_step}</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/[0.08]">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 transition-all duration-300"
                          style={{ width: `${selectedJob.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cloud Shell / Live Terminal */}
                <div className="bg-[#070b14] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
                  {/* Terminal Header */}
                  <div className="px-4 py-3 bg-slate-950/90 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Window Controls */}
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500/80" />
                        <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-mono font-semibold text-slate-200">
                          Intune Graph API Live Console
                        </span>
                      </div>
                    </div>

                    {/* Terminal Filters and Controls */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-900 rounded-lg p-0.5 text-[10px] font-mono border border-slate-800">
                        {(['all', 'success', 'warn', 'error'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setLogFilter(lvl)}
                            className={`px-2 py-0.5 rounded capitalize ${
                              logFilter === lvl ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleCopyLogs}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition-colors flex items-center gap-1"
                        title="Copy All Logs"
                      >
                        {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-colors ${
                          autoScroll
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                        }`}
                      >
                        Auto-scroll
                      </button>
                    </div>
                  </div>

                  {/* Terminal Log Output */}
                  <div className="p-4 font-mono text-xs text-slate-300 space-y-1.5 h-[340px] overflow-y-auto selection:bg-indigo-500/40">
                    {filteredLogs.length === 0 ? (
                      <div className="text-center py-10 text-slate-600 font-mono text-xs">
                        No logs match current level filter
                      </div>
                    ) : (
                      filteredLogs.map((log, idx) => {
                        const isSuccess = log.level === 'success';
                        const isError = log.level === 'error';
                        const isWarn = log.level === 'warn';

                        return (
                          <div key={idx} className="flex items-start gap-2.5 leading-relaxed hover:bg-white/[0.02] px-1 rounded transition-colors">
                            <span className="text-slate-600 shrink-0 select-none">
                              [{new Date(log.timestamp).toLocaleTimeString()}]
                            </span>
                            <span
                              className={`shrink-0 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase select-none ${
                                isSuccess
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                  : isError
                                  ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                                  : isWarn
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {log.level}
                            </span>
                            <span
                              className={
                                isSuccess
                                  ? 'text-emerald-300'
                                  : isError
                                  ? 'text-red-300 font-bold'
                                  : isWarn
                                  ? 'text-amber-300'
                                  : 'text-slate-300'
                              }
                            >
                              {log.message}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={terminalEndRef} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

