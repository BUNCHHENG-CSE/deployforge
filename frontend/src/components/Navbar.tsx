import React from 'react';
import {
  Package,
  UploadCloud,
  Activity,
  Cloud,
  ShieldCheck,
  Sparkles,
  Server,
  Zap,
  Radio,
  LayoutDashboard,
  Terminal,
  Command
} from 'lucide-react';
import { TenantStatus } from '../types';

export type NavTab = 'dashboard' | 'catalog' | 'scripts' | 'custom' | 'deployments' | 'inventory';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
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

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'catalog' as const,
      label: 'App Catalog',
      icon: Sparkles,
      badge: 'WinGet',
    },
    {
      id: 'scripts' as const,
      label: 'Scripts Studio',
      icon: Terminal,
      badge: null,
    },
    {
      id: 'custom' as const,
      label: 'Custom Packager',
      icon: UploadCloud,
      badge: 'Auto-PE',
    },
    {
      id: 'deployments' as const,
      label: 'Deployments',
      icon: Activity,
      badge: activeJobsCount > 0 ? `${activeJobsCount} Active` : null,
      badgeLive: activeJobsCount > 0,
    },
    {
      id: 'inventory' as const,
      label: 'Tenant Inventory',
      icon: Cloud,
      badge: null,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#070b14]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Identity */}
        <div className="flex items-center gap-3.5">
          <div className="relative group cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 rounded-xl blur-sm opacity-50 group-hover:opacity-100 transition duration-300" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-[#0c1322] border border-white/20 flex items-center justify-center shadow-inner">
              <Package className="w-5 h-5 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                TCT DeployForge
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <Zap className="w-2.5 h-2.5 text-indigo-400 fill-indigo-400" />
                Intune 1-Click
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
              Enterprise Win32 Engine & Graph Pipeline
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-white/[0.06] shadow-inner overflow-x-auto scrollbar-none max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="hidden lg:inline">{item.label}</span>
                <span className="lg:hidden text-[11px]">
                  {item.id === 'dashboard'
                    ? 'Dash'
                    : item.id === 'catalog'
                    ? 'Catalog'
                    : item.id === 'scripts'
                    ? 'Scripts'
                    : item.id === 'custom'
                    ? 'Custom'
                    : item.id === 'deployments'
                    ? 'Jobs'
                    : 'Apps'}
                </span>

                {item.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold tracking-tight uppercase ${
                      item.badgeLive
                        ? 'bg-emerald-400 text-slate-950 animate-pulse'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Keyboard Shortcut & Tenant Status */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('catalog')}
            className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/60 border border-white/[0.06] text-[11px] text-slate-400 hover:text-white transition-colors"
            title="Press / or Ctrl+K to jump to catalog"
          >
            <Command className="w-3 h-3 text-slate-500" />
            <span>Search</span>
            <kbd className="px-1 py-0.5 rounded bg-slate-800 text-[9px] font-mono border border-white/[0.08]">
              Ctrl+K
            </kbd>
          </button>

          <button
            onClick={onOpenTenantModal}
            className={`group relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 ${
              isSim
                ? 'bg-amber-500/10 border-amber-500/25 text-amber-200 hover:bg-amber-500/15 hover:border-amber-500/40'
                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200 hover:bg-emerald-500/15 hover:border-emerald-500/40'
            }`}
            title="Click to switch tenant profile or configure credentials"
          >
            <div className="relative flex items-center justify-center">
              <span
                className={`absolute w-2.5 h-2.5 rounded-full ${
                  isSim ? 'bg-amber-400/40 animate-ping' : 'bg-emerald-400/40 animate-ping'
                }`}
              />
              <span
                className={`relative w-2 h-2 rounded-full ${isSim ? 'bg-amber-400' : 'bg-emerald-400'}`}
              />
            </div>

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                {isSim ? (
                  <Server className="w-3 h-3 text-amber-400 shrink-0" />
                ) : (
                  <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                )}
                <span className="truncate max-w-[85px] sm:max-w-[140px] font-semibold text-slate-200 group-hover:text-white">
                  {tenantStatus?.tenant_name || (isSim ? 'Sandbox Mode' : 'Connected')}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono tracking-tight hidden sm:block">
                {isSim ? 'Contoso Simulation' : 'Live Microsoft Graph'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
