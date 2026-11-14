import React from 'react';
import {
  LayoutDashboard,
  Mic,
  Users,
  Package,
  ArrowLeftRight,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { PageId } from '../types';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  shopName: string;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  collapsed,
  onToggleCollapse,
  shopName,
}) => {
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'voice-assistant', label: 'Voice Assistant', icon: Mic, badge: 'AI' },
    { id: 'customers', label: 'Customers & Khata', icon: Users },
    { id: 'products', label: 'Products & Inventory', icon: Package },
    { id: 'sales', label: 'Sales & Transactions', icon: ArrowLeftRight },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`glass-panel relative flex flex-col justify-between transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      {collapsed ? (
        <div className="py-3 px-1 flex flex-col items-center justify-center gap-2 border-b border-[var(--border-color)]">
          <div className="w-10 h-10 rounded-xl bg-[#FFD026] text-black flex items-center justify-center font-black text-xl shrink-0 shadow-sm border border-[#E6B800]">
            द
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-4 flex items-center justify-between border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#FFD026] text-black flex items-center justify-center font-black text-xl shrink-0 shadow-sm border border-[#E6B800]">
              द
            </div>
            <div className="truncate">
              <h1 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                Dukaan<span className="text-[#FFD026] drop-shadow-sm">AI</span>
              </h1>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] truncate max-w-[140px]">
                {shopName}
              </p>
            </div>
          </div>

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer shrink-0"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#FFD026] text-black font-bold border border-[#E6B800] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent font-medium'
              } ${collapsed ? 'justify-center px-0 w-11 h-11 mx-auto' : ''}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-black' : 'text-[var(--text-muted)]'}`} />
              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-black text-[#FFD026]'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Store Status Pill */}
      <div className="p-3 border-t border-[var(--border-color)]">
        {collapsed ? (
          <div className="flex justify-center" title="Voice AI Engine Ready">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border-color)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <div className="truncate text-left">
              <p className="text-[11px] font-bold text-[var(--text-primary)] truncate">Voice AI Ready</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">Multilingual Voice Engine</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
