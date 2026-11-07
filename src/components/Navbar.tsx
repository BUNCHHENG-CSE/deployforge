'use client';

import React, { useState } from 'react';
import {
  Package,
  UploadCloud,
  Activity,
  Cloud,
  Sparkles,
  Zap,
  LayoutDashboard,
  Terminal,
  Search,
  ChevronDown,
  Menu,
  X,
  Server,
  ShieldCheck
} from 'lucide-react';
import { TenantStatus } from '../types';

export type NavTab = 'dashboard' | 'catalog' | 'scripts' | 'custom' | 'deployments' | 'inventory';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  tenantStatus: TenantStatus | null;
  onOpenTenantModal: () => void;
  activeJobsCount: number;
  onOpenCommandPalette?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  tenantStatus,
  onOpenTenantModal,
  activeJobsCount,
  onOpenCommandPalette,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      label: 'Catalog',
      icon: Sparkles,
      badge: 'WinGet',
    },
    {
      id: 'scripts' as const,
      label: 'Scripts',
      icon: Terminal,
      badge: null,
    },
    {
      id: 'custom' as const,
      label: 'Packager',
      icon: UploadCloud,
      badge: 'Auto-PE',
    },
    {
      id: 'deployments' as const,
      label: 'Deployments',
      icon: Activity,
      badge: activeJobsCount > 0 ? `${activeJobsCount}` : null,
      badgeLive: activeJobsCount > 0,
    },
    {
      id: 'inventory' as const,
      label: 'Inventory',
      icon: Cloud,
      badge: null,
    },
  ];

  const handleTabClick = (tabId: NavTab) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#060a16]/90 backdrop-blur-2xl border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      {/* Top luminous accent gradient line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 lg:gap-6">
        {/* Brand Logo & Identifier */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            onClick={() => handleTabClick('dashboard')}
            className="group relative flex items-center gap-2.5 cursor-pointer select-none"
            title="TCT DeployForge Command Center"
          >
            {/* Glowing Icon */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-indigo-500 to-cyan-400 rounded-xl blur-[6px] opacity-40 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-slate-900 to-[#0b1224] border border-white/20 group-hover:border-indigo-400/50 flex items-center justify-center shadow-inner transition-colors">
                <Package className="w-4 h-4 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
              </div>
            </div>

            {/* Brand Typography & Engine Tag */}
            <div className="flex items-center gap-2">
              <div className="flex items-center tracking-tight font-extrabold text-[15px] sm:text-base">
                <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent font-black tracking-wider mr-1.5">
                  TCT
                </span>
                <span className="text-white">Deploy</span>
                <span className="text-slate-300 font-semibold">Forge</span>
              </div>

              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                <Zap className="w-2.5 h-2.5 text-indigo-400 fill-indigo-400" />
                Intune
              </span>
            </div>
          </div>
        </div>

        {/* Center Segmented Navigation Bar */}
        <nav className="hidden lg:flex items-center p-1 bg-slate-950/70 rounded-2xl border border-white/[0.08] shadow-inner backdrop-blur-md">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600/25 text-white font-semibold border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 transition-colors ${
                    isActive ? 'text-indigo-300' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>

                {item.badge && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold tracking-tight uppercase ${
                      item.badgeLive
                        ? 'bg-emerald-400 text-slate-950 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                        : isActive
                        ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/30'
                        : 'bg-white/[0.08] text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Command Search & Sleek Tenant Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Quick Command Search Button */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-white/[0.08] hover:border-indigo-500/40 text-xs text-slate-400 hover:text-slate-200 transition-all shadow-sm group"
            title="Open Command Palette (Ctrl+K or ⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-300 transition-colors" />
            <span className="text-xs text-slate-400 group-hover:text-slate-200">Search</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-slate-900 border border-white/[0.1] text-[9px] font-mono text-slate-400 group-hover:border-indigo-500/40">
              Ctrl+K
            </kbd>
          </button>

          {/* Sleek Tenant Status Pill */}
          <button
            onClick={onOpenTenantModal}
            className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 ${
              isSim
                ? 'bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30 text-amber-200 hover:border-amber-500/50'
                : 'bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30 text-emerald-200 hover:border-emerald-500/50'
            }`}
            title="Click to switch tenant profile or configure credentials"
          >
            {/* Live Status Pulse Dot */}
            <div className="relative flex items-center justify-center shrink-0">
              <span
                className={`absolute w-2.5 h-2.5 rounded-full ${
                  isSim ? 'bg-amber-400/40 animate-ping' : 'bg-emerald-400/40 animate-ping'
                }`}
              />
              <span
                className={`relative w-2 h-2 rounded-full ${isSim ? 'bg-amber-400' : 'bg-emerald-400'}`}
              />
            </div>

            {/* Tenant Name */}
            <span className="font-semibold text-slate-200 group-hover:text-white truncate max-w-[120px] sm:max-w-[160px]">
              {tenantStatus?.tenant_name || (isSim ? 'Contoso Sandbox' : 'Intune Live')}
            </span>

            {/* Environment Badge */}
            <span
              className={`hidden sm:inline-flex px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                isSim
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {isSim ? 'Sandbox' : 'Production'}
            </span>

            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition-transform" />
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-950/70 border border-white/[0.08] text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/[0.08] bg-[#070b16]/98 backdrop-blur-2xl px-4 py-3 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/30 text-white font-semibold border border-indigo-500/40'
                    : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-indigo-400" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      item.badgeLive
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
