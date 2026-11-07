import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CatalogView } from './components/CatalogView';
import { ScriptStudioView } from './components/ScriptStudioView';
import { CustomPackageWizard } from './components/CustomPackageWizard';
import { DeploymentTracker } from './components/DeploymentTracker';
import { DeployedAppsList } from './components/DeployedAppsList';
import { TenantModal } from './components/TenantModal';
import { TenantStatus, EntraGroup, FleetBaseline } from './types';
import { ApiService } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [tenantStatus, setTenantStatus] = useState<TenantStatus | null>(null);
  const [groups, setGroups] = useState<EntraGroup[]>([]);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [activeJobsCount, setActiveJobsCount] = useState(0);

  useEffect(() => {
    loadTenantAndGroups();
    checkActiveJobs();
    const interval = setInterval(checkActiveJobs, 8000);

    // Global keyboard shortcuts (Ctrl+K or / jumps to catalog)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveTab('catalog');
      } else if (e.key === 'Escape') {
        setIsTenantModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const loadTenantAndGroups = async () => {
    try {
      const status = await ApiService.getTenantStatus();
      setTenantStatus(status);
      const grps = await ApiService.getGroups();
      setGroups(grps);
    } catch (e) {
      console.error(e);
    }
  };

  const checkActiveJobs = async () => {
    try {
      const jobs = await ApiService.listJobs();
      const running = jobs.filter((j) => j.status === 'running' || j.status === 'pending');
      setActiveJobsCount(running.length);
    } catch (e) {
      // ignore
    }
  };

  const handleStartDeploy = async (payload: any) => {
    try {
      if (payload.job_id) {
        // Already initiated (e.g. from script deploy or batch deploy)
        setCurrentJobId(payload.job_id);
      } else {
        const res = await ApiService.triggerDeploy(payload);
        setCurrentJobId(res.job_id);
      }
      setActiveTab('deployments');
      checkActiveJobs();
    } catch (err: any) {
      alert(`Deployment failed to initiate: ${err.message}`);
    }
  };

  const handleDeployBaseline = async (baseline: FleetBaseline) => {
    try {
      const catalogData = await ApiService.getCatalog();
      const matched = catalogData.apps.filter((a) => baseline.app_ids.includes(a.id));
      if (matched.length === 0) {
        alert('Could not locate baseline applications in catalog.');
        return;
      }

      const payloadList = matched.map((app) => ({
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
        target_group_id: 'all-devices',
        assignment_intent: 'required',
      }));

      const res = await ApiService.triggerBatchDeploy({
        apps: payloadList,
        target_group_id: 'all-devices',
        assignment_intent: 'required',
        batch_name: baseline.name,
      });

      setCurrentJobId(res.job_ids[0]);
      setActiveTab('deployments');
      checkActiveJobs();
    } catch (e: any) {
      alert(`Baseline deployment error: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* Ambient background glow and grid */}
      <div className="ambient-glow" />
      <div className="fixed inset-0 bg-cyber-grid pointer-events-none opacity-40 z-0" />

      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tenantStatus={tenantStatus}
        onOpenTenantModal={() => setIsTenantModalOpen(true)}
        activeJobsCount={activeJobsCount}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigateTab={setActiveTab}
            onDeployBaseline={handleDeployBaseline}
            tenantStatus={tenantStatus}
            groups={groups}
          />
        )}
        {activeTab === 'catalog' && (
          <CatalogView onStartDeploy={handleStartDeploy} groups={groups} />
        )}
        {activeTab === 'scripts' && (
          <ScriptStudioView onStartDeploy={handleStartDeploy} groups={groups} />
        )}
        {activeTab === 'custom' && (
          <CustomPackageWizard onStartDeploy={handleStartDeploy} groups={groups} />
        )}
        {activeTab === 'deployments' && (
          <DeploymentTracker currentJobId={currentJobId} />
        )}
        {activeTab === 'inventory' && (
          <DeployedAppsList />
        )}
      </main>

      {/* Modern High-Tech Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#050811]/90 backdrop-blur-xl py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight">TCT DeployForge</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Intune 1-Click Endpoint Automation</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PostgreSQL 16 + Prisma ORM
            </span>
            <span>•</span>
            <span className="text-slate-400">AES-256 .intunewin Engine</span>
            <span>•</span>
            <span className="text-indigo-400">WinGet & PowerShell Studio</span>
          </div>
        </div>
      </footer>

      {/* Tenant Settings Modal */}
      <TenantModal
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
        status={tenantStatus}
        onStatusUpdated={loadTenantAndGroups}
      />
    </div>
  );
}

export default App;
