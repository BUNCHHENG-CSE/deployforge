import React from 'react';
import { Package, UploadCloud, Activity, Cloud, ShieldCheck, Sparkles, Server } from 'lucide-react';
import { TenantStatus } from '../types';

interface NavbarProps {
  activeTab: 'catalog' | 'custom' | 'deployments' | 'inventory';
  setActiveTab: (tab: 'catalog' | 'custom' | 'deployments' | 'inventory') => void;
  tenantStatus: TenantStatus | null;
  onOpenTenantModal: () => void;
  activeJobsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  tenantStatus,
  onOpenTenantModal,
  activeJobsCount,
}) => {
  const isSim = tenantStatus?.is_simulation ?? true;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">DeployForge</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Intune 1-Click
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Automated Win32 Packaging & Graph Deploy</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'catalog'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>App Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'custom'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Custom Packager</span>
          </button>

          <button
            onClick={() => setActiveTab('deployments')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all relative ${
              activeTab === 'deployments'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Deployments</span>
            {activeJobsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-black animate-pulse">
                {activeJobsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'inventory'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span className="hidden md:inline">Intune Apps</span>
          </button>
        </nav>

        {/* Tenant Connection Status Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTenantModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isSim
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
            }`}
            title="Click to configure Microsoft Intune connection"
          >
            {isSim ? (
              <Server className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="truncate max-w-[120px] sm:max-w-[180px]">
              {tenantStatus?.tenant_name || (isSim ? 'Sandbox Mode' : 'Connected')}
            </span>
            <span className={`w-2 h-2 rounded-full ${isSim ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
