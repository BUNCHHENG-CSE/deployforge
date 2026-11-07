'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  LayoutDashboard,
  Sparkles,
  Terminal,
  UploadCloud,
  Activity,
  Cloud,
  Server,
  Zap,
  ArrowRight,
  X,
  Package,
  Layers,
  ShieldCheck,
  ChevronRight,
  Command
} from 'lucide-react';
import { NavTab } from './Navbar';
import { FleetBaseline, TenantStatus } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  onOpenTenantModal: () => void;
  onDeployBaseline?: (baseline: FleetBaseline) => void;
  tenantStatus: TenantStatus | null;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Baselines' | 'Quick Actions' | 'Tenant';
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenTenantModal,
  tenantStatus,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset query when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const items: CommandItem[] = useMemo(() => {
    return [
      // Navigation
      {
        id: 'nav-dashboard',
        title: 'Dashboard Overview',
        subtitle: 'Command Center telemetry, fleet baselines & deployment activity',
        category: 'Navigation',
        icon: LayoutDashboard,
        action: () => {
          onNavigate('dashboard');
          onClose();
        },
      },
      {
        id: 'nav-catalog',
        title: 'Application Catalog & WinGet',
        subtitle: 'Browse 5,000+ curated Win32 apps and live WinGet repository',
        category: 'Navigation',
        icon: Sparkles,
        badge: 'WinGet',
        action: () => {
          onNavigate('catalog');
          onClose();
        },
      },
      {
        id: 'nav-scripts',
        title: 'PowerShell Scripts Studio',
        subtitle: 'Detection, remediation, and system maintenance scripts library',
        category: 'Navigation',
        icon: Terminal,
        badge: 'PowerShell',
        action: () => {
          onNavigate('scripts');
          onClose();
        },
      },
      {
        id: 'nav-custom',
        title: 'Custom Win32 Packager (Auto-PE)',
        subtitle: 'Upload .exe/.msi and auto-generate .intunewin packages with detection rules',
        category: 'Navigation',
        icon: UploadCloud,
        badge: 'Auto-PE',
        action: () => {
          onNavigate('custom');
          onClose();
        },
      },
      {
        id: 'nav-deployments',
        title: 'Live Deployment Pipelines',
        subtitle: 'Real-time job logs, Azure Blob SAS upload telemetry & Graph sync',
        category: 'Navigation',
        icon: Activity,
        action: () => {
          onNavigate('deployments');
          onClose();
        },
      },
      {
        id: 'nav-inventory',
        title: 'Tenant App Inventory',
        subtitle: 'View synchronized Win32 LOB applications inside Microsoft Intune',
        category: 'Navigation',
        icon: Cloud,
        action: () => {
          onNavigate('inventory');
          onClose();
        },
      },

      // Tenant / Security
      {
        id: 'tenant-manage',
        title: 'Manage Intune Tenant & Credentials',
        subtitle: `Currently connected to: ${tenantStatus?.tenant_name || 'Contoso Corp (Sandbox)'}`,
        category: 'Tenant',
        icon: Server,
        badge: tenantStatus?.is_simulation ? 'Sandbox' : 'Production',
        action: () => {
          onOpenTenantModal();
          onClose();
        },
      },

      // Quick Actions
      {
        id: 'action-custom-package',
        title: 'Package New Win32 Executable',
        subtitle: 'Convert installer into encrypted .intunewin format with auto-silent switches',
        category: 'Quick Actions',
        icon: Package,
        action: () => {
          onNavigate('custom');
          onClose();
        },
      },
      {
        id: 'action-batch-deploy',
        title: 'Create Multi-App Batch Rollout',
        subtitle: 'Select multiple catalog applications and deploy them in parallel',
        category: 'Quick Actions',
        icon: Layers,
        action: () => {
          onNavigate('catalog');
          onClose();
        },
      },
      {
        id: 'action-run-script',
        title: 'Deploy PowerShell Remediation Script',
        subtitle: 'Push detection/remediation script to all Intune managed endpoints',
        category: 'Quick Actions',
        icon: Terminal,
        action: () => {
          onNavigate('scripts');
          onClose();
        },
      },
    ];
  }, [onNavigate, onOpenTenantModal, onClose, tenantStatus]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q))
    );
  }, [items, query]);

  // Keyboard navigation within list
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#090d18]/95 border border-white/[0.12] shadow-2xl shadow-indigo-950/50 backdrop-blur-2xl overflow-hidden z-10 transition-all">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command, search views, apps, or scripts..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06]"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-white/[0.08]">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No matching commands or destinations found for &quot;{query}&quot;.
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600/30 via-blue-600/20 to-indigo-600/10 border border-indigo-500/40 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          : 'bg-slate-900 border border-white/[0.06] text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate text-white">{item.title}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                      {item.category}
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        isSelected ? 'text-indigo-400 translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3 font-mono">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/[0.08] text-[10px]">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/[0.08] text-[10px]">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/[0.08] text-[10px]">Esc</kbd> Close
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-indigo-400 font-medium text-[11px]">
            <Command className="w-3 h-3" />
            <span>TCT DeployForge Command</span>
          </div>
        </div>
      </div>
    </div>
  );
};
