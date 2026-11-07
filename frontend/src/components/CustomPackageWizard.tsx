import React, { useState } from 'react';
import {
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  ShieldCheck,
  Terminal,
  Download,
  RefreshCw,
  Plus,
  Trash2,
  Sparkles,
  Cpu,
  Layers,
  Check,
  Copy,
  FolderOpen,
  Info,
  Zap,
  Settings2,
  ChevronRight
} from 'lucide-react';
import { InstallerAnalysis, DetectionRule, EntraGroup, RuleSimulationResult } from '../types';
import { ApiService } from '../services/api';

interface CustomPackageWizardProps {
  onStartDeploy: (payload: any) => void;
  groups: EntraGroup[];
}

export const CustomPackageWizard: React.FC<CustomPackageWizardProps> = ({ onStartDeploy, groups }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileToken, setFileToken] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<InstallerAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [appName, setAppName] = useState('');
  const [publisher, setPublisher] = useState('');
  const [version, setVersion] = useState('');
  const [architecture, setArchitecture] = useState('x64');
  const [installCommand, setInstallCommand] = useState('');
  const [uninstallCommand, setUninstallCommand] = useState('');
  const [installBehavior, setInstallBehavior] = useState('system');
  const [targetGroup, setTargetGroup] = useState('all-devices');
  const [assignmentIntent, setAssignmentIntent] = useState('required');
  const [detectionRules, setDetectionRules] = useState<DetectionRule[]>([]);
  const [activeFormTab, setActiveFormTab] = useState<'general' | 'commands' | 'detection'>('general');

  // Rule creation modal / inline state
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [newRuleType, setNewRuleType] = useState<'registry' | 'file' | 'msi' | 'script'>('registry');
  const [newRuleKeyPath, setNewRuleKeyPath] = useState('');
  const [newRuleValueName, setNewRuleValueName] = useState('DisplayVersion');
  const [newRulePath, setNewRulePath] = useState('%ProgramFiles%');
  const [newRuleFileName, setNewRuleFileName] = useState('');
  const [newRuleProductCode, setNewRuleProductCode] = useState('');
  const [newRuleScriptContent, setNewRuleScriptContent] = useState<string>(
    'if (Test-Path "$env:ProgramFiles\\App\\app.exe") {\n    Write-Output "Detected"\n    exit 0\n} else {\n    exit 1\n}'
  );

  // Simulation states
  const [simulationResults, setSimulationResults] = useState<Record<number, RuleSimulationResult>>({});
  const [simulatingIdx, setSimulatingIdx] = useState<number | null>(null);

  const handleSimulateRule = async (rule: DetectionRule, idx: number) => {
    setSimulatingIdx(idx);
    try {
      const res = await ApiService.simulateDetectionRule(rule);
      setSimulationResults((prev) => ({ ...prev, [idx]: res }));
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulatingIdx(null);
    }
  };

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setAnalyzing(true);
    setError(null);
    try {
      const res = await ApiService.uploadInstaller(uploadedFile);
      setFileToken(res.file_token);
      setAnalysis(res.analysis);

      // Populate form
      setAppName(res.analysis.app_name);
      setPublisher(res.analysis.publisher);
      setVersion(res.analysis.version);
      setArchitecture(res.analysis.architecture);
      setInstallCommand(res.analysis.install_command);
      setUninstallCommand(res.analysis.uninstall_command);
      setInstallBehavior(res.analysis.install_behavior || 'system');
      setDetectionRules(res.analysis.suggested_detection_rules || []);
    } catch (err: any) {
      setError(err.message || 'Failed to upload and analyze binary');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleInjectSwitch = (flag: string) => {
    if (!installCommand.includes(flag)) {
      setInstallCommand((prev) => (prev ? `${prev.trim()} ${flag}` : flag));
    }
  };

  const handleConfirmAddRule = () => {
    let rule: DetectionRule;
    if (newRuleType === 'registry') {
      rule = {
        type: 'registry',
        keyPath: newRuleKeyPath || `HKEY_LOCAL_MACHINE\\SOFTWARE\\${appName || 'App'}`,
        valueName: newRuleValueName,
        detectionType: 'exists',
        operator: 'greaterThanOrEqual',
        detectionValue: version || '1.0.0',
        description: 'Registry Key Detection',
      };
    } else if (newRuleType === 'file') {
      rule = {
        type: 'file',
        path: newRulePath,
        fileOrFolderName: newRuleFileName || `${appName.toLowerCase()}.exe`,
        detectionType: 'exists',
        operator: 'greaterThanOrEqual',
      };
    } else if (newRuleType === 'msi') {
      rule = {
        type: 'msi',
        productCode: newRuleProductCode || '{00000000-0000-0000-0000-000000000000}',
        checkProductVersion: false,
      };
    } else {
      rule = {
        type: 'script',
        scriptContent: newRuleScriptContent,
        description: 'Custom PowerShell Detection Script',
      };
    }

    setDetectionRules([...detectionRules, rule]);
    setShowAddRuleModal(false);
  };

  const handleRemoveRule = (index: number) => {
    setDetectionRules(detectionRules.filter((_, idx) => idx !== index));
  };

  const handleDeploy = () => {
    if (!analysis || !file) return;
    const payload = {
      app_name: appName,
      publisher: publisher,
      version: version,
      filename: file.name,
      file_token: fileToken || undefined,
      architecture: architecture,
      install_command: installCommand,
      uninstall_command: uninstallCommand,
      install_behavior: installBehavior,
      device_restart_behavior: 'suppress',
      detection_rules: detectionRules,
      target_group_id: targetGroup,
      assignment_intent: assignmentIntent,
    };
    onStartDeploy(payload);
  };

  return (
    <div className="space-y-6">
      {/* Header with Step Indicators */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>Automated PE / MSI Inspection</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Custom Installer Packager</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Drop any Windows executable (.exe), MSI database (.msi), or multi-file ZIP archive. TCT DeployForge automatically extracts internal binary headers, engine signatures, and silent execution switches.
          </p>
        </div>

        {/* Step progression indicator */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-2xl border border-white/[0.08] shadow-inner text-xs font-medium shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all ${
            !analysis ? 'bg-indigo-600 text-white shadow-md' : 'text-emerald-400'
          }`}>
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            <span>Upload</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all ${
            analysis ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'
          }`}>
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            <span>Configure & Rules</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-slate-500">
            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
            <span>Deploy</span>
          </div>
        </div>
      </div>

      {/* Upload Zone (Futuristic High-Tech Drop Area) */}
      {!analysis && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`relative overflow-hidden border-2 border-dashed rounded-3xl p-12 text-center transition-all backdrop-blur-xl ${
            analyzing
              ? 'border-indigo-500 bg-indigo-500/10 shadow-2xl shadow-indigo-500/10'
              : 'border-white/10 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-900/90 hover:shadow-2xl hover:shadow-indigo-500/5'
          }`}
        >
          {analyzing ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
                <span className="absolute -inset-2 rounded-full border border-indigo-500/30 animate-ping pointer-events-none" />
              </div>
              <h3 className="text-base font-bold text-white">Inspecting Binary PE Headers & MSI Tables...</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Parsing version resources, detecting Inno/WiX/NSIS setup engine, and generating silent switches.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-5 shadow-inner">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">
                Drop your Windows installer binary here
              </h3>
              <p className="text-xs text-slate-400 max-w-md mb-4">
                Supports standalone executables, Windows Installer packages, and compressed archives with setup scripts.
              </p>

              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-indigo-600/30 transition-all hover:scale-105">
                <FolderOpen className="w-4 h-4" />
                <span>Browse from Computer</span>
                <input
                  type="file"
                  accept=".exe,.msi,.zip"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                />
              </label>

              {/* Supported Engines Chips */}
              <div className="mt-8 flex flex-wrap justify-center items-center gap-2 text-[11px] text-slate-400">
                <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Recognized Engines:</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300">MSI (Windows Installer)</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300">Inno Setup</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300">Nullsoft (NSIS)</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300">WiX Toolset</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300">InstallShield</span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Result & Configuration Studio */}
      {analysis && (
        <div className="space-y-6">
          {/* Engine Detection Card */}
          <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-white">{analysis.filename}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {analysis.engine}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800">
                    {analysis.architecture}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {(analysis.size_bytes / 1024 / 1024).toFixed(2)} MB • {analysis.notes || 'Analyzed successfully'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setAnalysis(null);
                setFile(null);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium px-3 py-1.5 rounded-xl bg-slate-950 border border-white/[0.08] hover:border-indigo-500/40 transition-colors"
            >
              Change Installer Binary
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Configuration Workstation */}
            <div className="lg:col-span-2 space-y-5">
              {/* Tabs for Form navigation */}
              <div className="flex border-b border-white/[0.08] gap-4">
                <button
                  type="button"
                  onClick={() => setActiveFormTab('general')}
                  className={`pb-3 text-xs font-semibold flex items-center gap-2 transition-colors relative ${
                    activeFormTab === 'general' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Package Identity</span>
                  {activeFormTab === 'general' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab('commands')}
                  className={`pb-3 text-xs font-semibold flex items-center gap-2 transition-colors relative ${
                    activeFormTab === 'commands' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Silent Switches</span>
                  {activeFormTab === 'commands' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormTab('detection')}
                  className={`pb-3 text-xs font-semibold flex items-center gap-2 transition-colors relative ${
                    activeFormTab === 'detection' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Detection Rules ({detectionRules.length})</span>
                  {activeFormTab === 'detection' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </button>
              </div>

              {/* TAB 1: GENERAL IDENTITY */}
              {activeFormTab === 'general' && (
                <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-6 space-y-4 shadow-xl backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white border-b border-white/[0.06] pb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-indigo-400" />
                    <span>Application Metadata</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Application Name</label>
                      <input
                        type="text"
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Publisher</label>
                      <input
                        type="text"
                        value={publisher}
                        onChange={(e) => setPublisher(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Version</label>
                      <input
                        type="text"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Architecture</label>
                      <select
                        value={architecture}
                        onChange={(e) => setArchitecture(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                      >
                        <option value="x64">x64 (64-bit)</option>
                        <option value="x86">x86 (32-bit)</option>
                        <option value="arm64">ARM64</option>
                        <option value="all">All Architectures</option>
                      </select>
                    </div>
                  </div>

                  {/* Install context selection */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Install Behavior (Execution Context)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setInstallBehavior('system')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          installBehavior === 'system'
                            ? 'bg-indigo-600/15 border-indigo-500 text-white'
                            : 'bg-slate-950 border-white/[0.06] text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">System (LocalSystem Context)</span>
                          {installBehavior === 'system' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Elevated administrator privileges for machine-wide install.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInstallBehavior('user')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          installBehavior === 'user'
                            ? 'bg-indigo-600/15 border-indigo-500 text-white'
                            : 'bg-slate-950 border-white/[0.06] text-slate-400 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">User (Current User Context)</span>
                          {installBehavior === 'user' && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">Executes without admin elevation inside user AppData.</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: COMMANDS & SWITCHES */}
              {activeFormTab === 'commands' && (
                <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-6 space-y-4 shadow-xl backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white border-b border-white/[0.06] pb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-indigo-400" />
                      <span>Execution Parameters & Silent Switches</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Click switch chips below to inject</span>
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Silent Install Command Line
                    </label>
                    <input
                      type="text"
                      value={installCommand}
                      onChange={(e) => setInstallCommand(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/[0.08] rounded-xl font-mono text-xs text-indigo-300 focus:outline-none focus:border-indigo-500 shadow-inner"
                    />

                    {/* Quick Switch Injectors */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">Quick Add:</span>
                      {['/quiet', '/norestart', '/qn', 'ALLUSERS=1', '/VERYSILENT', '/S', '/s', '/passive'].map((flag) => (
                        <button
                          key={flag}
                          type="button"
                          onClick={() => handleInjectSwitch(flag)}
                          className="px-2 py-0.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-indigo-300 hover:text-white transition-colors"
                        >
                          +{flag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Silent Uninstall Command Line
                    </label>
                    <input
                      type="text"
                      value={uninstallCommand}
                      onChange={(e) => setUninstallCommand(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/[0.08] rounded-xl font-mono text-xs text-slate-300 focus:outline-none focus:border-indigo-500 shadow-inner"
                    />
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-xl border border-white/[0.06] text-xs text-slate-400 flex items-center justify-between">
                    <span>Device Restart Behavior:</span>
                    <span className="text-emerald-400 font-semibold">Suppress Reboot (Intune Default)</span>
                  </div>
                </div>
              )}

              {/* TAB 3: DETECTION RULES */}
              {activeFormTab === 'detection' && (
                <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-6 space-y-4 shadow-xl backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Shield className="w-4 h-4 text-indigo-400" />
                        <span>Intune Detection Rules</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Rules evaluated by the Intune Management Extension agent to confirm install success
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddRuleModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Rule</span>
                    </button>
                  </div>

                  {detectionRules.length === 0 ? (
                    <div className="text-center py-8 bg-slate-950/50 rounded-xl border border-white/[0.05]">
                      <p className="text-xs text-slate-400">No detection rules added yet.</p>
                      <button
                        onClick={() => setShowAddRuleModal(true)}
                        className="mt-2 text-xs text-indigo-400 hover:underline"
                      >
                        + Add a registry or file detection rule
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {detectionRules.map((rule, idx) => (
                        <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-white/[0.06] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              {rule.type} Rule
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSimulateRule(rule, idx)}
                                disabled={simulatingIdx === idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold border border-indigo-500/30 transition-all"
                              >
                                <Zap className={`w-3 h-3 ${simulatingIdx === idx ? 'animate-spin' : ''}`} />
                                <span>{simulatingIdx === idx ? 'Testing...' : 'Test & Simulate Rule'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveRule(idx)}
                                className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-900 transition-colors"
                                title="Delete Rule"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Simulation Result Badge */}
                          {simulationResults[idx] && (
                            <div
                              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                                simulationResults[idx].status === 'success' || simulationResults[idx].status === 'simulated_pass'
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                  : simulationResults[idx].status === 'warning'
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                              }`}
                            >
                              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <p className="font-semibold">{simulationResults[idx].message}</p>
                                {simulationResults[idx].recommendation && (
                                  <p className="text-[11px] opacity-80">{simulationResults[idx].recommendation}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {rule.type === 'msi' && (
                            <div className="text-xs font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                              <span className="text-slate-500">ProductCode:</span> {rule.productCode}
                            </div>
                          )}

                          {rule.type === 'file' && (
                            <div className="text-xs font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                              <span className="text-slate-500">Path:</span> {rule.path}\{rule.fileOrFolderName}
                            </div>
                          )}

                          {rule.type === 'registry' && (
                            <div className="text-xs font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                              <div><span className="text-slate-500">Key:</span> {rule.keyPath}</div>
                              <div><span className="text-slate-500">Value:</span> {rule.valueName || '(Default)'}</div>
                            </div>
                          )}

                          {rule.type === 'script' && (
                            <div className="text-[11px] font-mono text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800 max-h-24 overflow-y-auto">
                              {rule.scriptContent}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right 1 Col: Deployment Target & Live Blueprint Sidebar */}
            <div className="space-y-4">
              <div className="bg-slate-900/80 border border-white/[0.08] rounded-2xl p-6 space-y-5 shadow-2xl backdrop-blur-xl sticky top-20">
                <h3 className="text-sm font-bold text-white border-b border-white/[0.06] pb-3 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-indigo-400" />
                  <span>Deployment Target & Push</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Entra ID Group
                  </label>
                  <select
                    value={targetGroup}
                    onChange={(e) => setTargetGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Assignment Intent
                  </label>
                  <select
                    value={assignmentIntent}
                    onChange={(e) => setAssignmentIntent(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                  >
                    <option value="required">Required (Silent auto-install)</option>
                    <option value="available">Available in Company Portal</option>
                  </select>
                </div>

                {/* Packaging Blueprint Manifest Preview */}
                <div className="p-3.5 bg-slate-950/90 rounded-xl border border-white/[0.06] text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Artifact Name:</span>
                    <span className="font-mono text-indigo-300 truncate max-w-[140px]">{appName || 'App'}.intunewin</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Encryption:</span>
                    <span className="text-emerald-400 font-semibold">AES-256-CBC</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Detection Rules:</span>
                    <span className="text-white font-medium">{detectionRules.length} Defined</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleDeploy}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Compile & Push to Intune</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD DETECTION RULE MODAL */}
      {showAddRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#0b1120] border border-white/[0.1] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/[0.08] bg-slate-950/70 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Add Detection Rule</h3>
              <button
                onClick={() => setShowAddRuleModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Rule Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['registry', 'file', 'msi', 'script'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewRuleType(t)}
                      className={`py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border ${
                        newRuleType === t
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                          : 'bg-slate-950 border-white/[0.06] text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {newRuleType === 'registry' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Key Path</label>
                    <input
                      type="text"
                      placeholder="e.g. HKEY_LOCAL_MACHINE\SOFTWARE\MyCompany\App"
                      value={newRuleKeyPath}
                      onChange={(e) => setNewRuleKeyPath(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Value Name</label>
                    <input
                      type="text"
                      placeholder="e.g. DisplayVersion or leave empty for (Default)"
                      value={newRuleValueName}
                      onChange={(e) => setNewRuleValueName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              {newRuleType === 'file' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Directory Path</label>
                    <input
                      type="text"
                      placeholder="e.g. %ProgramFiles%\MyCompany\App"
                      value={newRulePath}
                      onChange={(e) => setNewRulePath(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">File or Folder Name</label>
                    <input
                      type="text"
                      placeholder="e.g. app.exe"
                      value={newRuleFileName}
                      onChange={(e) => setNewRuleFileName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              {newRuleType === 'msi' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">MSI Product Code GUID</label>
                  <input
                    type="text"
                    placeholder="e.g. {12345678-1234-1234-1234-123456789012}"
                    value={newRuleProductCode}
                    onChange={(e) => setNewRuleProductCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {newRuleType === 'script' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    PowerShell Detection Script (must output text & exit 0 if detected)
                  </label>
                  <textarea
                    rows={4}
                    value={newRuleScriptContent}
                    onChange={(e) => setNewRuleScriptContent(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/[0.08] rounded-xl font-mono text-xs text-indigo-200 focus:outline-none focus:border-indigo-500"
                    placeholder='Write-Output "Detected"; exit 0'
                  />
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddRuleModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/[0.08] hover:bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddRule}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Add Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

