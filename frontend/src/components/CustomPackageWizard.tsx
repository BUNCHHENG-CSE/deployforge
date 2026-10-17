import React, { useState } from 'react';
import { UploadCloud, FileCode, CheckCircle2, AlertCircle, ArrowRight, Shield, Terminal, Download, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { InstallerAnalysis, DetectionRule, EntraGroup } from '../types';
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

  // Editable fields
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

  const handleAddRule = () => {
    const newRule: DetectionRule = {
      type: 'registry',
      keyPath: `HKEY_LOCAL_MACHINE\\SOFTWARE\\${appName || 'MyApp'}`,
      valueName: 'DisplayVersion',
      detectionType: 'version',
      operator: 'greaterThanOrEqual',
      detectionValue: version || '1.0.0',
      description: 'Custom Registry Detection Rule',
    };
    setDetectionRules([...detectionRules, newRule]);
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Custom Installer Packager</h1>
        <p className="text-xs text-slate-400 mt-1">
          Drop any Windows executable (.exe), MSI package (.msi), or multi-file ZIP archive. The engine auto-inspects PE/MSI metadata, determines installer engine flags, and generates detection rules.
        </p>
      </div>

      {/* Upload Zone */}
      {!analysis && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
            analyzing
              ? 'border-indigo-500 bg-indigo-500/5'
              : 'border-slate-800 bg-slate-900/50 hover:border-indigo-500/50 hover:bg-slate-900'
          }`}
        >
          {analyzing ? (
            <div className="flex flex-col items-center justify-center py-6">
              <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mb-3" />
              <p className="text-sm font-semibold text-white">Analyzing Binary Headers & Engine...</p>
              <p className="text-xs text-slate-400 mt-1">Extracting PE version info, MSI tables, and silent flags</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">
                Drag & drop installer binary here, or{' '}
                <label className="text-indigo-400 hover:underline cursor-pointer">
                  browse files
                  <input
                    type="file"
                    accept=".exe,.msi,.zip"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                  />
                </label>
              </p>
              <p className="text-xs text-slate-500">Supports .EXE (Inno, NSIS, WiX, InstallShield), .MSI databases, and .ZIP bundles</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Analysis Result & Configuration Form */}
      {analysis && (
        <div className="space-y-6">
          {/* Engine Detection Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white">{analysis.filename}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {analysis.engine}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{(analysis.size_bytes / 1024 / 1024).toFixed(2)} MB • {analysis.notes}</p>
              </div>
            </div>

            <button
              onClick={() => { setAnalysis(null); setFile(null); }}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Change file
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form Fields */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-3">
                  App Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">App Name</label>
                    <input
                      type="text"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Publisher</label>
                    <input
                      type="text"
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Version</label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Architecture</label>
                    <select
                      value={architecture}
                      onChange={(e) => setArchitecture(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="x64">x64 (64-bit)</option>
                      <option value="x86">x86 (32-bit)</option>
                      <option value="arm64">ARM64</option>
                      <option value="all">All Architectures</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Silent Install Command</label>
                  <input
                    type="text"
                    value={installCommand}
                    onChange={(e) => setInstallCommand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-indigo-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Silent Uninstall Command</label>
                  <input
                    type="text"
                    value={uninstallCommand}
                    onChange={(e) => setUninstallCommand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Install Behavior</label>
                    <select
                      value={installBehavior}
                      onChange={(e) => setInstallBehavior(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="system">System (LocalSystem Context)</option>
                      <option value="user">User (Current User Context)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Device Restart Behavior</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      disabled
                    >
                      <option value="suppress">Suppress Reboot (Standard)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Detection Rules Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Intune Detection Rules</h3>
                    <p className="text-xs text-slate-400">Rules evaluated by Intune Management Extension agent to confirm install</p>
                  </div>
                  <button
                    onClick={handleAddRule}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Rule</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {detectionRules.map((rule, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                          {rule.type} Detection Rule
                        </span>
                        <button
                          onClick={() => handleRemoveRule(idx)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {rule.type === 'msi' && (
                        <div className="text-xs font-mono text-slate-300 bg-slate-900 p-2 rounded">
                          ProductCode: {rule.productCode}
                        </div>
                      )}

                      {rule.type === 'file' && (
                        <div className="text-xs font-mono text-slate-300 bg-slate-900 p-2 rounded">
                          Path: {rule.path}\{rule.fileOrFolderName}
                        </div>
                      )}

                      {rule.type === 'registry' && (
                        <div className="text-xs font-mono text-slate-300 bg-slate-900 p-2 rounded">
                          Key: {rule.keyPath} <br />
                          Value: {rule.valueName || '(Default)'}
                        </div>
                      )}

                      {rule.type === 'script' && (
                        <div className="text-[11px] font-mono text-slate-400 bg-slate-900 p-2 rounded max-h-24 overflow-y-auto">
                          {rule.scriptContent}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 1 Col: Deployment Action */}
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-3">
                  Target & Deployment
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Entra ID Group</label>
                  <select
                    value={targetGroup}
                    onChange={(e) => setTargetGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assignment Intent</label>
                  <select
                    value={assignmentIntent}
                    onChange={(e) => setAssignmentIntent(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="required">Required (Silent auto-install)</option>
                    <option value="available">Available in Company Portal</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <button
                    onClick={handleDeploy}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    <span>1-Click Package & Push to Intune</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
