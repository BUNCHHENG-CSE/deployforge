import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Search,
  RefreshCw,
  CheckCircle2,
  Shield,
  Calendar,
  HardDrive,
  Copy,
  Check,
  Info,
  X,
  FileCode,
  Package,
  Layers,
  ExternalLink
} from 'lucide-react';
import { ApiService } from '../services/api';

export const DeployedAppsList: React.FC = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getDeployedApps();
      setApps(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = apps.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.displayName && a.displayName.toLowerCase().includes(q)) ||
      (a.publisher && a.publisher.toLowerCase().includes(q)) ||
      (a.fileName && a.fileName.toLowerCase().includes(q)) ||
      (a.id && a.id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Cloud className="w-3.5 h-3.5" />
            <span>Intune Win32 LobApp Registry</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Tenant Application Inventory</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Live catalog of Win32 Line-of-Business packages registered, committed, and assigned via Microsoft Graph API in your active tenant.
          </p>
        </div>

        <button
          onClick={loadApps}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/90 border border-white/[0.08] hover:border-white/20 rounded-xl text-xs font-semibold text-slate-200 transition-all shadow-md hover:bg-slate-800"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Sync Tenant Apps</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Committed Apps</p>
            <p className="text-2xl font-extrabold text-white mt-1">{apps.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Intune Health</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">100%</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Storage Engine</p>
            <p className="text-base font-extrabold text-indigo-300 mt-1">Azure Blob SAS</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by app name, publisher, payload file, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 bg-slate-900/80 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-inner"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-0.5 rounded-full hover:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          <span className="text-sm font-medium">Fetching Intune application inventory via Graph API...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-white/[0.06] p-8">
          <Cloud className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No applications found in this tenant</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            Deploy packages from the catalog or custom packager to see them listed here.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-white/[0.08] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Application Name</th>
                  <th className="px-5 py-3.5">Publisher</th>
                  <th className="px-5 py-3.5">Package File</th>
                  <th className="px-5 py-3.5">Install Command</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                            {app.displayName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                            ID: {app.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-300 font-medium">
                      {app.publisher || '—'}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-white/[0.06] font-mono text-[11px] text-slate-300">
                        <FileCode className="w-3 h-3 text-indigo-400" />
                        <span className="truncate max-w-[130px]">{app.fileName || '—'}</span>
                      </span>
                    </td>

                    <td className="px-5 py-4 max-w-[260px]">
                      <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-white/[0.06] font-mono text-[11px] text-indigo-300">
                        <span className="truncate select-all">{app.installCommandLine || '—'}</span>
                        {app.installCommandLine && (
                          <button
                            onClick={() => handleCopy(app.installCommandLine, app.id)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
                            title="Copy command"
                          >
                            {copiedId === app.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Committed</span>
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APP OBJECT INSPECT MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0b1120] border border-white/[0.1] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/[0.08] bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{selectedApp.displayName}</h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedApp.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-white text-xs p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Intune Win32 LobApp Properties
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-white/[0.06] font-mono text-xs text-slate-300 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Publisher:</span>
                    <span className="text-white">{selectedApp.publisher || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payload File:</span>
                    <span className="text-indigo-400">{selectedApp.fileName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">App Type:</span>
                    <span className="text-slate-300">microsoft.graph.win32LobApp</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Install Command Line
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-white/[0.06] font-mono text-xs text-indigo-300 break-all select-all">
                  {selectedApp.installCommandLine || 'N/A'}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Raw Graph Resource Object
                </label>
                <pre className="p-3 bg-slate-950 rounded-xl border border-white/[0.06] font-mono text-[11px] text-slate-400 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedApp, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.08] bg-slate-950/70 flex justify-end">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

