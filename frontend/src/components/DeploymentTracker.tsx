import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, Clock, AlertTriangle, Download, Terminal, RefreshCw, Layers, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { DeploymentJob } from '../types';
import { ApiService } from '../services/api';

interface DeploymentTrackerProps {
  currentJobId?: string | null;
}

const PHASES = [
  { label: 'Acquisition', minPct: 15 },
  { label: 'IntuneWin Packaging', minPct: 30 },
  { label: 'Intune App Object', minPct: 45 },
  { label: 'Azure Blob Upload', minPct: 80 },
  { label: 'HMAC Commit', minPct: 92 },
  { label: 'Target Assignment', minPct: 100 },
];

export const DeploymentTracker: React.FC<DeploymentTrackerProps> = ({ currentJobId }) => {
  const [jobs, setJobs] = useState<DeploymentJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<DeploymentJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, [currentJobId]);

  useEffect(() => {
    if (!selectedJob || selectedJob.status === 'completed' || selectedJob.status === 'failed') {
      return;
    }
    // Subscribe to SSE stream for live updates
    const unsubscribe = ApiService.subscribeJob(selectedJob.job_id, (updatedJob) => {
      setSelectedJob(updatedJob);
      setJobs((prev) =>
        prev.map((j) => (j.job_id === updatedJob.job_id ? updatedJob : j))
      );
    });

    return () => unsubscribe();
  }, [selectedJob?.job_id, selectedJob?.status]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Deployment Pipeline & Jobs</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time Microsoft Graph API & Azure Blob Storage execution log</p>
        </div>
        <button
          onClick={loadJobs}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {loading && jobs.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-sm">Loading deployment history...</span>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800">
          <Activity className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No deployment jobs recorded yet.</p>
          <p className="text-slate-500 text-xs mt-1">Deploy an app from the Catalog or Custom Packager to see live logs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 1 Col: Jobs List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 h-[640px] overflow-y-auto">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
              Recent Deployments ({jobs.length})
            </h3>
            {jobs.map((j) => {
              const isSelected = selectedJob?.job_id === j.job_id;
              const isDone = j.status === 'completed';
              const isFailed = j.status === 'failed';
              const isRunning = j.status === 'running' || j.status === 'pending';

              return (
                <button
                  key={j.job_id}
                  onClick={() => setSelectedJob(j)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500/50 shadow'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white truncate max-w-[170px]">
                      {j.app_name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        isDone
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : isFailed
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-indigo-500/10 text-indigo-400 animate-pulse'
                      }`}
                    >
                      {j.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{j.publisher}</span>
                    <span>{j.progress}%</span>
                  </div>

                  {/* Tiny progress bar */}
                  <div className="w-full bg-slate-900 rounded-full h-1 mt-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isDone ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${j.progress}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right 2 Cols: Selected Job Details & Live Console */}
          <div className="lg:col-span-2 space-y-4">
            {selectedJob && (
              <>
                {/* Status Card & 6-Phase Stepper */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">{selectedJob.app_name}</h2>
                        <span className="text-xs text-slate-400 font-mono">v{selectedJob.version}</span>
                        {selectedJob.is_simulation && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Sandbox
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Job ID: <span className="font-mono text-slate-300">{selectedJob.job_id}</span> • {selectedJob.publisher}
                      </p>
                    </div>

                    {selectedJob.intunewin_filename && (
                      <a
                        href={`/api/packages/download/${selectedJob.intunewin_filename}`}
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Download .intunewin</span>
                      </a>
                    )}
                  </div>

                  {/* 6-Phase Stepper */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {PHASES.map((p, idx) => {
                      const completed = selectedJob.progress >= p.minPct;
                      const active = selectedJob.progress < p.minPct && (idx === 0 || selectedJob.progress >= PHASES[idx - 1].minPct);

                      return (
                        <div
                          key={p.label}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            completed
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : active
                              ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300 animate-pulse'
                              : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center justify-center mb-1">
                            {completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : active ? (
                              <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                          <p className="text-[10px] font-semibold tracking-tight leading-tight">{p.label}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300 font-medium">{selectedJob.current_step}</span>
                      <span className="font-mono text-indigo-400 font-semibold">{selectedJob.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300"
                        style={{ width: `${selectedJob.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Live Console Terminal */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-mono font-semibold text-slate-300">
                        Intune Graph API Execution Console
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {selectedJob.logs.length} messages
                    </span>
                  </div>

                  <div className="p-4 font-mono text-xs text-slate-300 space-y-1.5 h-[340px] overflow-y-auto selection:bg-indigo-500">
                    {selectedJob.logs.map((log, idx) => {
                      const isSuccess = log.level === 'success';
                      const isError = log.level === 'error';
                      const isWarn = log.level === 'warn';

                      return (
                        <div key={idx} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-slate-600 shrink-0">
                            [{new Date(log.timestamp).toLocaleTimeString()}]
                          </span>
                          <span
                            className={
                              isSuccess
                                ? 'text-emerald-400'
                                : isError
                                ? 'text-red-400 font-bold'
                                : isWarn
                                ? 'text-amber-400'
                                : 'text-slate-300'
                            }
                          >
                            {isSuccess ? '✓ ' : isError ? '✗ ' : '→ '}
                            {log.message}
                          </span>
                        </div>
                      );
                    })}
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
