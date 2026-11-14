import React from 'react';
import {
  LayoutDashboard,
  Mic,
  Users,
  Package,
  ArrowLeftRight,
  Truck,
  Receipt,
  Zap,
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
    { id: 'suppliers', label: 'Suppliers & Orders', icon: Truck },
    { id: 'billing', label: 'Billing & Invoices', icon: Receipt },
    { id: 'automation', label: 'Communication & Auto', icon: Zap },
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
      <div className="p-4 flex items-center justify-between border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-700 light:bg-neutral-100 light:border-neutral-300 flex items-center justify-center text-[var(--text-primary)] shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <h1 className="text-lg font-black tracking-tight flex items-center gap-1 text-[var(--text-primary)]">
                Dukaan<span className="text-[var(--text-primary)] underline decoration-neutral-500">AI</span>
              </h1>
              <p className="text-[11px] font-medium text-[var(--text-muted)] truncate max-w-[150px]">
                {shopName}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 light:hover:bg-black/5 transition-all cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-neutral-900 light:bg-neutral-200 text-white light:text-black border border-neutral-700 light:border-neutral-400 font-semibold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900/40 light:hover:bg-neutral-100 border border-transparent'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white light:text-black' : 'text-[var(--text-muted)]'}`} />
              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-neutral-800 light:bg-neutral-300 text-neutral-300 light:text-neutral-800 border border-neutral-700 light:border-neutral-400">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Voice Assistant Shortcut Card */}
      {!collapsed && (
        <div className="p-3 m-3 rounded-xl bg-neutral-900/60 light:bg-neutral-100 border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-1.5">
            <Mic className="w-4 h-4 text-white light:text-black animate-pulse" />
            <span className="text-xs font-bold text-white light:text-black">Voice Copilot</span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            Hands-free recording for khata credits and stock updates.
          </p>
        </div>
      )}
    </aside>
  );
};
