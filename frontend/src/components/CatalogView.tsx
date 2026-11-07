import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Layers,
  Cpu,
  Download,
  CheckCircle2,
  RefreshCw,
  Copy,
  ExternalLink,
  Info,
  Terminal,
  Grid,
  List as ListIcon,
  X,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  FolderGit2,
  CheckSquare,
  Square,
  Zap,
  Globe,
  Plus
} from 'lucide-react';
import { CatalogApp, EntraGroup, FleetBaseline, WinGetPackage } from '../types';
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Source toggle: Curated vs WinGet Live
  const [sourceMode, setSourceMode] = useState<'curated' | 'winget'>('curated');
  const [wingetResults, setWingetResults] = useState<WinGetPackage[]>([]);
  const [wingetSearching, setWingetSearching] = useState(false);

  // Baselines
  const [baselines, setBaselines] = useState<FleetBaseline[]>([]);

  // Multi-select batch cart
  const [selectedApps, setSelectedApps] = useState<CatalogApp[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchTargetGroup, setBatchTargetGroup] = useState<string>('all-devices');
  const [batchIntent, setBatchIntent] = useState<'required' | 'available'>('required');
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  // Single Inspect & Deploy modals
  const [inspectApp, setInspectApp] = useState<CatalogApp | null>(null);
  const [deployingApp, setDeployingApp] = useState<CatalogApp | null>(null);
  const [targetGroup, setTargetGroup] = useState<string>('all-devices');
  const [assignmentIntent, setAssignmentIntent] = useState<'required' | 'available'>('required');
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadBaselines();
  }, []);

  useEffect(() => {
    if (sourceMode === 'curated') {
      loadCatalog();
    } else {
      searchWinGetRepo();
    }
  }, [selectedCategory, searchQuery, sourceMode]);

  const loadBaselines = async () => {
    try {
      const data = await ApiService.getFleetBaselines();
      setBaselines(data);
    } catch (e) {
      console.error(e);
    }
  };

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

  const searchWinGetRepo = async () => {
    setWingetSearching(true);
    try {
      const data = await ApiService.searchWinGet(searchQuery);
      setWingetResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setWingetSearching(false);
    }
  };

  const handleCopyCommand = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelectApp = (app: CatalogApp) => {
    setSelectedApps((prev) => {
      const exists = prev.some((a) => a.id === app.id);
      if (exists) {
        return prev.filter((a) => a.id !== app.id);
      } else {
        return [...prev, app];
      }
    });
  };

  const handleSelectBaseline = (baseline: FleetBaseline) => {
    const matched = apps.filter((a) => baseline.app_ids.includes(a.id));
    if (matched.length > 0) {
      setSelectedApps(matched);
      setIsBatchModalOpen(true);
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

  const handleConfirmBatchDeploy = async () => {
    if (selectedApps.length === 0) return;
    setBatchSubmitting(true);
    try {
      const payloadList = selectedApps.map((app) => ({
        catalog_app_id: app.id,
        app_name: app.name,
        publisher: app.publisher,
        version: app.version,
        filename: app.filename,
        download_url: app.download_url,
        architecture: app.architecture,
        install_command: app.install_command,
        uninstall_command: app.uninstall_command,
        install_behavior: app.install_behavior,
        device_restart_behavior: 'suppress',
        detection_rules: [app.detection_rule],
        target_group_id: batchTargetGroup,
        assignment_intent: batchIntent,
      }));

      await ApiService.triggerBatchDeploy({
        apps: payloadList,
        target_group_id: batchTargetGroup,
        assignment_intent: batchIntent,
        batch_name: `Batch (${selectedApps.length} Apps)`,
      });

      onStartDeploy({
        job_id: 'batch-triggered',
        app_name: `Batch Rollout (${selectedApps.length} Apps)`,
        is_simulation: true,
      });

      setSelectedApps([]);
      setIsBatchModalOpen(false);
    } catch (e: any) {
      alert(`Batch deployment error: ${e.message}`);
    } finally {
      setBatchSubmitting(false);
    }
  };

  const getRuleBadgeColor = (ruleType: string) => {
    switch (ruleType) {
      case 'file':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'registry':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'msi':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const displayedList = sourceMode === 'curated' ? apps : (wingetResults as CatalogApp[]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner with Stats & Baselines */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-white/[0.08] p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Enterprise Catalog + WinGet 5,000+ Packages</span>
              <span className="w-1 h-1 rounded-full bg-indigo-400" />
              <span className="text-slate-400 font-normal">Pre-tested Silent Switches</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              Instant 1-Click Win32 Deployment & Fleet Baselines
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Select individual applications or deploy entire workstation baselines at once. Auto-derives PE/MSI detection rules and Azure Blob SAS uploads.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="bg-slate-950/70 border border-white/[0.06] rounded-2xl p-3.5 text-center shadow-inner">
              <p className="text-[10px] uppercase font-semibold text-slate-400">Vetted Apps</p>
              <p className="text-xl font-bold text-white mt-0.5">{apps.length}+</p>
              <span className="text-[9px] text-emerald-400 flex items-center justify-center gap-1 mt-0.5 font-medium">
                <CheckCircle2 className="w-2.5 h-2.5" /> Verified
              </span>
            </div>
            <div className="bg-slate-950/70 border border-white/[0.06] rounded-2xl p-3.5 text-center shadow-inner">
              <p className="text-[10px] uppercase font-semibold text-slate-400">Packaging</p>
              <p className="text-xl font-bold text-indigo-400 mt-0.5">AES-256</p>
              <span className="text-[9px] text-slate-400 mt-0.5 block">Native .intunewin</span>
            </div>
            <div className="bg-slate-950/70 border border-white/[0.06] rounded-2xl p-3.5 text-center shadow-inner">
              <p className="text-[10px] uppercase font-semibold text-slate-400">Reboot</p>
              <p className="text-xl font-bold text-emerald-400 mt-0.5">Zero</p>
              <span className="text-[9px] text-slate-400 mt-0.5 block">Suppressed</span>
            </div>
          </div>
        </div>

        {/* Fleet Baseline Quick Launch Chips */}
        {baselines.length > 0 && (
          <div className="relative z-10 mt-6 pt-5 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Fleet Baselines:</span>
            </span>
            {baselines.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSelectBaseline(b)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/70 hover:bg-indigo-600/30 border border-white/[0.08] hover:border-indigo-500/50 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm"
              >
                <span className="font-semibold text-indigo-300">{b.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">({b.app_ids.length} apps)</span>
                <ArrowRight className="w-3 h-3 text-indigo-400 ml-0.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Source Toggle & Control Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          {/* Search Box & Source Toggle */}
          <div className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={
                  sourceMode === 'curated'
                    ? 'Search 60+ curated apps, publishers, switches...'
                    : 'Search 5,000+ WinGet packages (e.g. Slack, Docker, VLC)...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-900/80 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-0.5 rounded-full hover:bg-slate-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Source Mode Tabs */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-white/[0.08]">
              <button
                onClick={() => setSourceMode('curated')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  sourceMode === 'curated' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Curated
              </button>
              <button
                onClick={() => setSourceMode('winget')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  sourceMode === 'winget' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3 h-3 text-cyan-400" />
                <span>WinGet</span>
              </button>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Showing <span className="text-white font-semibold">{displayedList.length}</span> apps
            </span>
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-white/[0.08]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Detailed Table View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills Bar (only for Curated mode) */}
        {sourceMode === 'curated' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-400/30'
                      : 'bg-slate-900/70 border border-white/[0.06] text-slate-300 hover:text-white hover:border-white/20 hover:bg-slate-800/80'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Software Catalog: Loading / Content */}
      {loading && sourceMode === 'curated' ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
          <span className="text-sm font-medium text-slate-300">Filtering software catalog...</span>
        </div>
      ) : displayedList.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-white/[0.06] p-8">
          <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No applications match your filter</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            Try adjusting your search query or selecting a different category from above.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedList.map((app) => {
            const isSelected = selectedApps.some((a) => a.id === app.id);
            return (
              <div
                key={app.id}
                className={`group relative flex flex-col justify-between rounded-2xl p-5 transition-all duration-200 backdrop-blur-md border ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-xl shadow-indigo-600/15'
                    : 'bg-slate-900/70 hover:bg-slate-900/95 border-white/[0.07] hover:border-indigo-500/50'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/10 p-2.5 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-indigo-500/40 transition-all shadow-inner">
                        <img
                          src={app.icon}
                          alt={app.name}
                          className="w-full h-full object-contain"
                          onError={(e: any) => {
                            e.target.src =
                              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23818cf8" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg>';
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                          {app.name}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-1">{app.publisher}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Checkbox for batch */}
                      <button
                        onClick={() => toggleSelectApp(app)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800/80 text-slate-400 hover:text-white'
                        }`}
                        title={isSelected ? 'Remove from batch' : 'Add to batch rollout'}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-950 text-indigo-300 border border-indigo-500/20 shrink-0">
                        {app.architecture}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mt-3 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {app.description}
                  </p>

                  {/* Technical Meta Tags */}
                  <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-950 text-slate-300 border border-slate-800">
                      <Cpu className="w-2.5 h-2.5 text-slate-400" />
                      {app.install_behavior === 'system' ? 'System Context' : 'User Context'}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${getRuleBadgeColor(
                        app.detection_rule.type
                      )}`}
                    >
                      <ShieldCheck className="w-2.5 h-2.5" />
                      {app.detection_rule.type.toUpperCase()} Rule
                    </span>

                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-950 text-slate-400 border border-slate-800">
                      {app.category}
                    </span>
                  </div>

                  {/* Silent Switch Box */}
                  <div className="mt-3.5 relative bg-slate-950/90 border border-white/[0.06] rounded-xl p-2.5 font-mono text-[11px] text-slate-300 flex items-center justify-between gap-2 overflow-hidden">
                    <div className="truncate flex items-center gap-1.5">
                      <span className="text-indigo-400 font-bold select-none">$</span>
                      <span className="truncate text-slate-300 select-all">{app.install_command}</span>
                    </div>
                    <button
                      onClick={() => handleCopyCommand(app.install_command, app.id)}
                      className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
                      title="Copy silent install switch"
                    >
                      {copiedId === app.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="mt-4 pt-3.5 border-t border-white/[0.07] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setInspectApp(app)}
                    className="text-xs font-medium text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Inspect Spec</span>
                  </button>

                  <button
                    onClick={() => setDeployingApp(app)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all group/btn"
                  >
                    <span>1-Click Deploy</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-white/[0.08] text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5 w-10">Select</th>
                  <th className="px-5 py-3.5">Software</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Arch</th>
                  <th className="px-5 py-3.5">Silent Switch</th>
                  <th className="px-5 py-3.5">Detection Method</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {displayedList.map((app) => {
                  const isSelected = selectedApps.some((a) => a.id === app.id);
                  return (
                    <tr key={app.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => toggleSelectApp(app)}
                          className={`p-1 rounded ${
                            isSelected ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/10 p-1 flex items-center justify-center shrink-0">
                            <img src={app.icon} alt={app.name} className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                              {app.name}
                            </p>
                            <p className="text-[11px] text-slate-400">{app.publisher}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">{app.category}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 font-bold">
                          {app.architecture}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 max-w-[220px]">
                        <div className="font-mono text-[11px] text-slate-400 truncate bg-slate-950 px-2 py-1 rounded border border-slate-800/80">
                          {app.install_command}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${getRuleBadgeColor(
                            app.detection_rule.type
                          )}`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {app.detection_rule.type.toUpperCase()} Rule
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setInspectApp(app)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                            title="Inspect spec"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeployingApp(app)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all"
                          >
                            Deploy
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FLOATING BATCH CART DRAWER */}
      {selectedApps.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-full px-4 animate-in slide-in-from-bottom duration-200">
          <div className="bg-[#0b1120]/95 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
                {selectedApps.length}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Batch Rollout Queue</p>
                <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                  {selectedApps.map((a) => a.name).join(', ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setSelectedApps([])}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Clear
              </button>
              <button
                onClick={() => setIsBatchModalOpen(true)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Deploy Batch ({selectedApps.length} Apps)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH TARGET MODAL */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0b1120] border border-white/[0.1] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/[0.08] bg-slate-950/70 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Deploy Fleet Batch ({selectedApps.length} Applications)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Roll out all queued applications to target devices simultaneously</p>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Selected Apps Review */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Applications in Batch
                </label>
                <div className="flex flex-wrap gap-1.5 bg-slate-950/60 p-3 rounded-xl border border-white/[0.06] max-h-36 overflow-y-auto">
                  {selectedApps.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium"
                    >
                      <span>{a.name}</span>
                      <button
                        onClick={() => toggleSelectApp(a)}
                        className="hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Target Entra Group */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Target Entra ID Group / Audience
                </label>
                <select
                  value={batchTargetGroup}
                  onChange={(e) => setBatchTargetGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.displayName} {g.description ? `(${g.description})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignment Intent */}
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Assignment Intent
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBatchIntent('required')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      batchIntent === 'required'
                        ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-600/10'
                        : 'bg-slate-950 border-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Required</span>
                      {batchIntent === 'required' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">Installs automatically on all targeted devices.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchIntent('available')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      batchIntent === 'available'
                        ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-600/10'
                        : 'bg-slate-950 border-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Available</span>
                      {batchIntent === 'available' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">Users can install on demand from Company Portal.</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.08] bg-slate-950/70 flex justify-end gap-2">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBatchDeploy}
                disabled={batchSubmitting}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
              >
                {batchSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Queuing Batch Jobs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Deploy All ({selectedApps.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT SPEC MODAL */}
      {inspectApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0b1120] border border-white/[0.1] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/[0.08] bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 p-2 flex items-center justify-center">
                  <img src={inspectApp.icon} alt={inspectApp.name} className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{inspectApp.name} — Technical Specification</h3>
                  <p className="text-xs text-slate-400">{inspectApp.publisher} • {inspectApp.category}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectApp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-white/[0.06]">
                  <span className="text-slate-400 block text-[11px] mb-0.5">Execution Context</span>
                  <span className="text-white font-semibold capitalize">{inspectApp.install_behavior} (Elevated)</span>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-white/[0.06]">
                  <span className="text-slate-400 block text-[11px] mb-0.5">Target Architecture</span>
                  <span className="text-white font-mono font-semibold">{inspectApp.architecture}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Silent Execution Switch
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-white/[0.06] font-mono text-xs text-indigo-300 break-all select-all">
                  {inspectApp.install_command}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Intune Detection Method
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-white/[0.06] space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-white/[0.05]">
                    <span className="text-slate-400">Rule Type:</span>
                    <span className="font-semibold text-white capitalize">{inspectApp.detection_rule.type}</span>
                  </div>
                  {inspectApp.detection_rule.path && (
                    <div className="space-y-1">
                      <span className="text-slate-400 block">Directory / Path:</span>
                      <code className="block bg-slate-900 p-1.5 rounded text-[11px] text-slate-300 break-all font-mono">
                        {inspectApp.detection_rule.path}\{inspectApp.detection_rule.fileOrFolderName}
                      </code>
                    </div>
                  )}
                  {inspectApp.detection_rule.keyPath && (
                    <div className="space-y-1">
                      <span className="text-slate-400 block">Registry Key:</span>
                      <code className="block bg-slate-900 p-1.5 rounded text-[11px] text-slate-300 break-all font-mono">
                        {inspectApp.detection_rule.keyPath}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.08] bg-slate-950/60 flex justify-end gap-2">
              <button
                onClick={() => setInspectApp(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = inspectApp;
                  setInspectApp(null);
                  setDeployingApp(target);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/30"
              >
                <span>Proceed to Deploy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE DEPLOY TARGET MODAL */}
      {deployingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0b1120] border border-white/[0.1] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/[0.08] bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-white/10 p-2 flex items-center justify-center shrink-0">
                  <img src={deployingApp.icon} alt={deployingApp.name} className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Deploy {deployingApp.name}</h3>
                  <p className="text-xs text-slate-400">Configure Microsoft Intune target group & assignment intent</p>
                </div>
              </div>
              <button
                onClick={() => setDeployingApp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Target Entra ID Group / Audience
                </label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/[0.09] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.displayName} {g.description ? `(${g.description})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                  Assignment Intent
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAssignmentIntent('required')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      assignmentIntent === 'required'
                        ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-600/10'
                        : 'bg-slate-950 border-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Required</span>
                      {assignmentIntent === 'required' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">Installs automatically on all targeted devices.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentIntent('available')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      assignmentIntent === 'available'
                        ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-600/10'
                        : 'bg-slate-950 border-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Available</span>
                      {assignmentIntent === 'available' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">Users can install on demand from Company Portal.</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.08] bg-slate-950/70 flex justify-end gap-2">
              <button
                onClick={() => setDeployingApp(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeploy}
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Initiating Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Confirm & Deploy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
