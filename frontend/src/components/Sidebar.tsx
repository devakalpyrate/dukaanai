import React from 'react';
import {
  LayoutDashboard,
  Mic,
  Users,
  Package,
  ArrowLeftRight,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
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
        <div className="py-4 px-2 flex flex-col items-center justify-center border-b border-[var(--border-color)]">
          <button
            onClick={onToggleCollapse}
            className="relative group w-11 h-11 rounded-xl bg-[#FFD026] text-black flex items-center justify-center font-black text-xl shrink-0 shadow-sm border border-[#E6B800] cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
            title="Open Sidebar"
            aria-label="Open Sidebar"
          >
            {/* Clean logo by default */}
            <span className="group-hover:opacity-0 transition-opacity duration-200">
              द
            </span>
            {/* Opening switch icon appears on hover over the logo */}
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-black">
              <PanelLeftOpen className="w-5 h-5 stroke-[2.2]" />
            </span>
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
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[#FFD026] hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer shrink-0 border border-transparent hover:border-[var(--border-color)] active:scale-95 shadow-xs"
            title="Close Sidebar"
            aria-label="Close Sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
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

      {/* Bottom Documentation Link */}
      <div className="p-3 border-t border-[var(--border-color)]">
        {collapsed ? (
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            title="Documentation"
            className="flex justify-center p-2.5 rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-5 h-5 text-[#FFD026]" />
          </a>
        ) : (
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-[var(--border-color)] hover:border-[#FFD026]/40 transition-all cursor-pointer group text-decoration-none"
          >
            <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[#FFD026] transition-colors">
              Documentation
            </span>
            <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[#FFD026] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        )}
      </div>
    </aside>
  );
};
