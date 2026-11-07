import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Code,
  Sparkles,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Play,
  Layers,
  Trash2,
  Clock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { CuratedScript, EntraGroup } from '../types';
import { ApiService } from '../services/api';

interface ScriptStudioViewProps {
  onStartDeploy: (payload: any) => void;
  groups: EntraGroup[];
}

export const ScriptStudioView: React.FC<ScriptStudioViewProps> = ({ onStartDeploy, groups }) => {
  const [curatedScripts, setCuratedScripts] = useState<CuratedScript[]>([]);
  const [selectedScript, setSelectedScript] = useState<CuratedScript | null>(null);
  const [loading, setLoading] = useState(true);

  // Editor states
  const [customName, setCustomName] = useState('Custom Enterprise Script');
  const [customVersion, setCustomVersion] = useState('1.0.0');
  const [customContent, setCustomContent] = useState('');
  const [customCategory, setCustomCategory] = useState('System Configuration');
  const [targetGroup, setTargetGroup] = useState('all-devices');
  const [assignmentIntent, setAssignmentIntent] = useState('required');

  // Action states
  const [packaging, setPackaging] = useState(false);
  const [packageResult, setPackageResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'curated' | 'editor'>('curated');

  useEffect(() => {
    loadCurated();
  }, []);

  const loadCurated = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getCuratedScripts();
      setCuratedScripts(data);
      if (data.length > 0) {
        setSelectedScript(data[0]);
        setCustomName(data[0].name);
        setCustomContent(data[0].script);
        setCustomVersion(data[0].version);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCurated = (s: CuratedScript) => {
    setSelectedScript(s);
    setCustomName(s.name);
    setCustomContent(s.script);
    setCustomVersion(s.version);
    setPackageResult(null);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(customContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePackageOnly = async () => {
    setPackaging(true);
    setPackageResult(null);
    try {
      const scriptId = selectedScript ? selectedScript.id : `ps-custom-${Date.now()}`;
      const res = await ApiService.packageScript({
        script_id: scriptId,
        script_name: customName,
        script_content: customContent,
        version: customVersion,
      });
      setPackageResult(res);
    } catch (e: any) {
      alert(`Packaging error: ${e.message}`);
    } finally {
      setPackaging(false);
    }
  };

  const handleDeployScript = async () => {
    const scriptId = selectedScript ? selectedScript.id : `ps-custom-${Date.now()}`;
    try {
      const res = await ApiService.deployScript({
        script_id: scriptId,
        script_name: customName,
        script_content: customContent,
        version: customVersion,
        target_group_id: targetGroup,
        assignment_intent: assignmentIntent,
      });
      onStartDeploy({
        job_id: res.job_id,
        app_name: res.script_name,
        is_simulation: true,
      });
    } catch (e: any) {
      alert(`Deployment failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>PowerShell Win32 Wrapper Studio</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Script & Remediation Engine</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Package raw PowerShell scripts into secure, AES-256 encrypted Win32 `.intunewin` containers with automated execution-policy bypass, exit code tracking, and tag-file detection.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-white/[0.06]">
          <button
            onClick={() => setActiveTab('curated')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'curated'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Curated Library
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'editor'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom Script Editor
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List of Curated Scripts */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
            <span>Enterprise Script Repository</span>
            <span>{curatedScripts.length} Scripts</span>
          </div>

          <div className="space-y-2.5">
            {curatedScripts.map((s) => {
              const isSelected = selectedScript?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => handleSelectCurated(s)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-600/10'
                      : 'bg-slate-900/70 border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                        {s.category}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-1.5">{s.name}</h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded">
                      v{s.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                    {s.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Editor & Action Panel */}
        <div className="lg:col-span-8 rounded-2xl bg-slate-900/80 border border-white/[0.08] p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Metadata Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Script Title</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/[0.08] text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Version</label>
                <input
                  type="text"
                  value={customVersion}
                  onChange={(e) => setCustomVersion(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/[0.08] text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Target Entra Group</label>
                <select
                  value={targetGroup}
                  onChange={(e) => setTargetGroup(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/[0.08] text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.displayName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Code Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-mono text-[11px] flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-cyan-400" />
                  <span>deploy_script.ps1 (PowerShell Core / Windows PowerShell)</span>
                </span>
                <button
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <textarea
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                rows={14}
                className="w-full font-mono text-xs bg-slate-950/90 text-indigo-100 p-4 rounded-xl border border-white/[0.08] focus:outline-none focus:border-indigo-500 leading-relaxed selection:bg-indigo-500/30"
                placeholder="# Enter PowerShell automation commands..."
              />
            </div>

            {/* Packaging Result Box */}
            {packageResult && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Package Compiled Successfully!</span>
                  </div>
                  <a
                    href={`/api/packages/download/${packageResult.intunewin_filename}`}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .intunewin</span>
                  </a>
                </div>
                <div className="font-mono text-[11px] text-slate-300 space-y-1 bg-black/40 p-2.5 rounded-lg">
                  <p><strong>Package:</strong> {packageResult.intunewin_filename}</p>
                  <p><strong>Execution Command:</strong> {packageResult.install_command}</p>
                  <p><strong>Detection Tag:</strong> {packageResult.detection_rule.fileOrFolderName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.06]">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Auto-generates tag-file detection in <code>%ProgramData%\DeployForge\Scripts\</code></span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handlePackageOnly}
                disabled={packaging || !customContent.trim()}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.1] text-xs font-semibold transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>{packaging ? 'Packaging...' : 'Package .intunewin Only'}</span>
              </button>

              <button
                onClick={handleDeployScript}
                disabled={!customContent.trim()}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>1-Click Deploy to Intune</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
