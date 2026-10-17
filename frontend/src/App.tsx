import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CatalogView } from './components/CatalogView';
import { CustomPackageWizard } from './components/CustomPackageWizard';
import { DeploymentTracker } from './components/DeploymentTracker';
import { DeployedAppsList } from './components/DeployedAppsList';
import { TenantModal } from './components/TenantModal';
import { TenantStatus, EntraGroup, DeploymentJob } from './types';
import { ApiService } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom' | 'deployments' | 'inventory'>('catalog');
  const [tenantStatus, setTenantStatus] = useState<TenantStatus | null>(null);
  const [groups, setGroups] = useState<EntraGroup[]>([]);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [activeJobsCount, setActiveJobsCount] = useState(0);

  useEffect(() => {
    loadTenantAndGroups();
    checkActiveJobs();
    const interval = setInterval(checkActiveJobs, 8000);
    return () => clearInterval(interval);
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
      const res = await ApiService.triggerDeploy(payload);
      setCurrentJobId(res.job_id);
      setActiveTab('deployments');
      checkActiveJobs();
    } catch (err: any) {
      alert(`Deployment failed to initiate: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tenantStatus={tenantStatus}
        onOpenTenantModal={() => setIsTenantModalOpen(true)}
        activeJobsCount={activeJobsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'catalog' && (
          <CatalogView onStartDeploy={handleStartDeploy} groups={groups} />
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

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DeployForge — Intune One-Click Deploy Tool</span>
          <span className="font-mono text-slate-600">Spec-compliant AES-256 .intunewin & Microsoft Graph Engine</span>
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
