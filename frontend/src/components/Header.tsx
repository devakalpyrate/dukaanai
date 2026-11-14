import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  Bell,
  User,
  Store,
  Settings,
  LogOut,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  X,
  Trash2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { UserProfile, PageId, AppNotification } from '../types';

interface HeaderProps {
  user: UserProfile;
  onNavigate: (page: PageId) => void;
  onLogout: () => void;
  onOpenVoice: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onNavigate,
  onLogout,
  onOpenVoice,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('dukaanai_token');
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to load notifications from database:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem('dukaanai_token');
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (!token) return;
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Failed to delete notification from database:', err);
    }
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem('dukaanai_token');
    setNotifications([]);
    if (!token) return;
    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Failed to clear notifications from database:', err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
      case 'credit':
        return <ArrowUpRight className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
      case 'system':
      case 'announcement':
      default:
        return <Sparkles className="w-4 h-4 text-[#FFD026] shrink-0 mt-0.5" />;
    }
  };

  return (
    <header className="glass-panel h-16 px-6 flex items-center justify-between border-b border-[var(--border-color)] z-20">
      {/* Header Left: Current Store Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/5 dark:bg-white/5 border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)]">
          <Store className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
          <span>{user.shop_name}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-1" />
        </div>
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>DukaanAI Cloud Sync Active</span>
        </div>
      </div>

      {/* Header Right: Controls & Profile */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-hover)] transition-all cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-[#FFD026]" /> : <Moon className="w-4 h-4 text-black" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              fetchNotifications();
            }}
            className="relative p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-hover)] transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FFD026] text-black text-[10px] font-black flex items-center justify-center border border-white dark:border-black shadow-xs">
                {notifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl glass-panel-elevated p-4 shadow-2xl space-y-3 z-50 border border-[var(--border-color)]">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                    Notifications (सूचनाएं)
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-muted)] font-mono">
                    {notifications.length}
                  </span>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[11px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-[var(--text-muted)] text-xs">
                    <p className="font-semibold">No new notifications</p>
                    <p className="text-[10px] mt-0.5">Alerts & transactions will appear here automatically from database.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl bg-black/3 dark:bg-white/5 border border-[var(--border-color)] hover:border-[#FFD026] transition-all flex gap-2.5 items-start relative group"
                    >
                      {getNotifIcon(n.type)}
                      <div className="flex-1 pr-6">
                        <p className="font-bold text-xs text-[var(--text-primary)]">{n.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{n.message}</p>
                        <span className="text-[9px] text-[var(--text-muted)] font-mono block mt-1">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {/* Dismiss / Delete Button (काटना) */}
                      <button
                        onClick={(e) => handleDeleteNotification(n.id, e)}
                        className="absolute right-2.5 top-2.5 p-1 rounded-md text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-all"
                        title="Delete notification from database"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-hover)] transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#FFD026] border border-[#E6B800] flex items-center justify-center text-black font-extrabold text-xs shadow-sm">
              {user.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold leading-tight text-[var(--text-primary)]">{user.name}</p>
              <p className="text-[10px] font-medium text-[var(--text-muted)] leading-tight">{user.role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel-elevated p-2 shadow-xl space-y-1 z-50">
              <div className="px-3 py-2 border-b border-[var(--border-color)]">
                <p className="text-sm font-bold text-[var(--text-primary)]">{user.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
              </div>

              <button
                onClick={() => {
                  onNavigate('settings');
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all text-left cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[var(--text-muted)]" /> Account Settings
              </button>

              <div className="pt-1 border-t border-[var(--border-color)]">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all text-left cursor-pointer font-bold"
                >
                  <LogOut className="w-4 h-4 text-rose-500" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
