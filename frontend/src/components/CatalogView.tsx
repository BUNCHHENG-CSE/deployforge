import React, { useState, useEffect } from 'react';
import { Search, Sparkles, ArrowRight, ShieldCheck, Check, Layers, Cpu, Download, CheckCircle2, RefreshCw } from 'lucide-react';
import { CatalogApp, EntraGroup } from '../types';
import { ApiService } from '../services/api';

interface CatalogViewProps {
  onStartDeploy: (payload: any) => void;
  groups: EntraGroup[];
}

export const CatalogView: React.FC<CatalogViewProps> = ({ onStartDeploy, groups }) => {
  const [apps, setApps] = useState<CatalogApp[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Deploy target modal
  const [deployingApp, setDeployingApp] = useState<CatalogApp | null>(null);
  const [targetGroup, setTargetGroup] = useState<string>('all-devices');
  const [assignmentIntent, setAssignmentIntent] = useState<'required' | 'available'>('required');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCatalog();
  }, [selectedCategory, searchQuery]);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getCatalog(
        searchQuery || undefined,
        selectedCategory !== 'All' ? selectedCategory : undefined
      );
      setApps(data.apps);
      setCategories(data.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeploy = async () => {
    if (!deployingApp) return;
    setSubmitting(true);
    try {
      const payload = {
        catalog_app_id: deployingApp.id,
        app_name: deployingApp.name,
        publisher: deployingApp.publisher,
        version: deployingApp.version,
        filename: deployingApp.filename,
        download_url: deployingApp.download_url,
        architecture: deployingApp.architecture,
        install_command: deployingApp.install_command,
        uninstall_command: deployingApp.uninstall_command,
        install_behavior: deployingApp.install_behavior,
        device_restart_behavior: 'suppress',
        detection_rules: [deployingApp.detection_rule],
        target_group_id: targetGroup,
        assignment_intent: assignmentIntent,
      };
      await onStartDeploy(payload);
      setDeployingApp(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Value Proposition */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-blue-900/30 border border-indigo-500/20 p-6 sm:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pre-Configured Enterprise Catalog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Deploy in Seconds, Not Hours
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Eliminate manual <code className="text-indigo-300 font-mono">IntuneWinAppUtil</code> packaging, silent switch research, and detection rule configuration. Select any app, choose your Entra group, and deploy instantly via Microsoft Graph API.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search software, publisher, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Software Catalog Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-sm">Loading enterprise application catalog...</span>
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800">
          <p className="text-slate-400 text-sm">No applications found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => (
            <div
              key={app.id}
              className="group relative flex flex-col justify-between bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 p-2 flex items-center justify-center shrink-0 group-hover:border-indigo-500/30 transition-colors">
                      <img
                        src={app.icon}
                        alt={app.name}
                        className="w-full h-full object-contain"
                        onError={(e: any) => {
                          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23818cf8" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg>';
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-white group-hover:text-indigo-400 transition-colors">
                        {app.name}
                      </h3>
                      <p className="text-xs text-slate-400">{app.publisher}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 shrink-0">
                    {app.architecture}
                  </span>
                </div>

                <p className="mt-3 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {app.description}
                </p>

                {/* Silent command preview snippet */}
                <div className="mt-4 p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-[11px] text-slate-400 truncate">
                  <span className="text-indigo-400 font-semibold">$ </span>
                  {app.install_command}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Pre-configured Rule
                </span>
                <button
                  onClick={() => setDeployingApp(app)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all group/btn"
                >
                  <span>1-Click Deploy</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DEPLOY TARGET MODAL */}
      {deployingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 p-2 flex items-center justify-center">
                  <img src={deployingApp.icon} alt={deployingApp.name} className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white">Deploy {deployingApp.name}</h3>
                  <p className="text-xs text-slate-400">Configure Intune targeting and assignment intent</p>
                </div>
              </div>
              <button
                onClick={() => setDeployingApp(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Target Entra Group */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target Entra ID Group / Audience
                </label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.displayName} {g.description ? `(${g.description})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Select "All Devices" to silently push across your entire managed fleet.
                </p>
              </div>

              {/* Assignment Intent */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Assignment Intent
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignmentIntent('required')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      assignmentIntent === 'required'
                        ? 'bg-indigo-600/10 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">Required</span>
                      {assignmentIntent === 'required' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Automatic silent install on endpoints.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentIntent('available')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      assignmentIntent === 'available'
                        ? 'bg-indigo-600/10 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">Available</span>
                      {assignmentIntent === 'available' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Published in Intune Company Portal.</p>
                  </button>
                </div>
              </div>

              {/* Package Summary Box */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Silent Install Command:</span>
                  <span className="font-mono text-slate-200">{deployingApp.install_command}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Detection Method:</span>
                  <span className="text-indigo-400 capitalize">{deployingApp.detection_rule.type} Rule</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Packaging:</span>
                  <span className="text-emerald-400">Automatic Native .intunewin</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeployingApp(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeploy}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Push to Intune Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
