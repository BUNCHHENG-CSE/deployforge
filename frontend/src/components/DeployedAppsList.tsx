import React, { useState, useEffect } from 'react';
import { Cloud, Search, RefreshCw, CheckCircle2, Shield, Calendar, HardDrive } from 'lucide-react';
import { ApiService } from '../services/api';

export const DeployedAppsList: React.FC = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filtered = apps.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.displayName && a.displayName.toLowerCase().includes(q)) ||
      (a.publisher && a.publisher.toLowerCase().includes(q)) ||
      (a.fileName && a.fileName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Intune Deployed Apps</h1>
          <p className="text-xs text-slate-400 mt-1">Live Win32 Line-of-Business applications registered in your Intune tenant</p>
        </div>
        <button
          onClick={loadApps}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Tenant Apps</span>
        </button>
      </div>

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter deployed applications..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-sm">Fetching Intune application inventory...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800">
          <Cloud className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No applications found in this tenant.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Application Name</th>
                  <th className="px-5 py-3.5">Publisher</th>
                  <th className="px-5 py-3.5">Payload File</th>
                  <th className="px-5 py-3.5">Install Command</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4 font-medium text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <HardDrive className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate max-w-[200px]">{app.displayName}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-400">{app.publisher || '—'}</td>
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-300">{app.fileName || '—'}</td>
                    <td className="px-5 py-4 font-mono text-[11px] text-indigo-300 truncate max-w-[240px]">
                      {app.installCommandLine || '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Committed</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
