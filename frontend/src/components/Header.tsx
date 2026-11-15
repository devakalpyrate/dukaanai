import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Menu,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { UserProfile, PageId, AppNotification } from '../types';
import { ApiService } from '../services/api';

const DISMISSED_STORAGE_KEY = 'dukaanai_dismissed_notifications_v1';
const DISMISSED_TTL_MS = 24 * 60 * 60 * 1000;

const getValidDismissedIds = (): Set<number> => {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (!raw) return new Set();
    const map: Record<string, number> = JSON.parse(raw);
    const now = Date.now();
    const valid = new Set<number>();
    let hasExpired = false;
    const cleanMap: Record<string, number> = {};

    for (const [idStr, timestamp] of Object.entries(map)) {
      if (now - timestamp < DISMISSED_TTL_MS) {
        valid.add(Number(idStr));
        cleanMap[idStr] = timestamp;
      } else {
        hasExpired = true;
      }
    }
    if (hasExpired) {
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(cleanMap));
    }
    return valid;
  } catch {
    return new Set();
  }
};

const storeDismissedIds = (ids: number[]) => {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    ids.forEach((id) => {
      map[id] = now;
    });
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to write to localStorage:', err);
  }
};

const sanitizeRetailNotification = (n: AppNotification): AppNotification => {
  const forbiddenRegex = /(mysql|postgresql|sqlite|database|schema|table|fastapi|uvicorn|gunicorn|backend|endpoint|rest api|grpc|cold-start|cors|rowcount|lastrowid|architecture|infrastructure)/i;

  let title = n.title;
  let message = n.message;

  if (forbiddenRegex.test(title) || forbiddenRegex.test(message)) {
    if (/system active/i.test(title) || /welcome/i.test(message)) {
      title = 'Welcome to DukaanAI!';
      message = 'Your voice khata and smart retail ledger are active. You can record transactions via voice or keyboard.';
    } else if (/payment/i.test(title) || /upi/i.test(title)) {
      title = 'Digital QR & UPI Ready';
      message = 'Your store QR code is ready to receive instant payments from customers.';
    } else {
      message = message
        .replace(/mysql/gi, 'ledger records')
        .replace(/database/gi, 'digital records')
        .replace(/fastapi/gi, 'store server')
        .replace(/architecture/gi, 'system')
        .replace(/backend/gi, 'system');
    }
  }

  return {
    ...n,
    title,
    message,
  };
};

interface HeaderProps {
  user: UserProfile;
  onNavigate: (page: PageId) => void;
  onLogout: () => void;
  onOpenVoice: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onNavigate,
  onLogout,
  onOpenVoice,
  onToggleMobileMenu,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const readQueueRef = useRef<Set<number>>(new Set());
  const dismissQueueRef = useRef<Set<number>>(new Set());
  const readTimerRef = useRef<any>(null);
  const dismissTimerRef = useRef<any>(null);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('dukaanai_token');
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const incoming: AppNotification[] = data.notifications || [];
        const dismissedCache = getValidDismissedIds();
        const pendingDismiss = dismissQueueRef.current;

        const filtered = incoming
          .filter((n) => !dismissedCache.has(n.id) && !pendingDismiss.has(n.id))
          .map(sanitizeRetailNotification);

        setNotifications(filtered);
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

  const flushReadQueue = useCallback(() => {
    if (readTimerRef.current) {
      clearTimeout(readTimerRef.current);
      readTimerRef.current = null;
    }
    const ids = Array.from(readQueueRef.current);
    readQueueRef.current.clear();
    if (ids.length > 0) {
      ApiService.markNotificationsBatchRead(ids);
    }
  }, []);

  const flushDismissQueue = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    const ids = Array.from(dismissQueueRef.current);
    dismissQueueRef.current.clear();
    if (ids.length > 0) {
      ApiService.dismissNotificationsBatch(ids);
    }
  }, []);

  useEffect(() => {
    return () => {
      flushReadQueue();
      flushDismissQueue();
    };
  }, [flushReadQueue, flushDismissQueue]);

  const queueMarkAsRead = useCallback((ids: number[]) => {
    if (!ids.length) return;
    ids.forEach((id) => readQueueRef.current.add(id));
    if (readTimerRef.current) clearTimeout(readTimerRef.current);
    readTimerRef.current = setTimeout(() => {
      flushReadQueue();
    }, 450);
  }, [flushReadQueue]);

  const queueDismiss = useCallback((ids: number[]) => {
    if (!ids.length) return;
    ids.forEach((id) => {
      dismissQueueRef.current.add(id);
      readQueueRef.current.delete(id);
    });
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      flushDismissQueue();
    }, 400);
  }, [flushDismissQueue]);

  const handleOpenDropdown = () => {
    const nextState = !notifOpen;
    setNotifOpen(nextState);

    if (nextState) {
      fetchNotifications();
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length > 0) {
        setNotifications((prev) =>
          prev.map((n) => (unreadIds.includes(n.id) ? { ...n, is_read: 1 } : n))
        );
        queueMarkAsRead(unreadIds);
      }
    } else {
      flushReadQueue();
      flushDismissQueue();
    }
  };

  const handleDeleteNotification = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    storeDismissedIds([id]);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    queueDismiss([id]);

    const token = localStorage.getItem('dukaanai_token');
    if (token) {
      fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allIds = notifications.map((n) => n.id);
    if (allIds.length > 0) {
      storeDismissedIds(allIds);
    }
    setNotifications([]);
    if (allIds.length > 0) {
      queueDismiss(allIds);
      flushDismissQueue();
    }

    const token = localStorage.getItem('dukaanai_token');
    if (token) {
      fetch('/api/notifications', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
        flushReadQueue();
        flushDismissQueue();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [flushReadQueue, flushDismissQueue]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
    <header className="glass-panel h-16 px-3 sm:px-6 flex items-center justify-between border-b border-[var(--border-color)] z-20 shrink-0 select-none">
      {/* Header Left: Current Store Badge & Mobile Menu Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-color)] cursor-pointer transition-all active:scale-95 shrink-0"
            title="Open Navigation Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] min-w-0">
          <Store className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 shrink-0" />
          <span className="truncate max-w-[95px] xs:max-w-[130px] sm:max-w-none">{user.shop_name}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-0.5 shrink-0" />
        </div>
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>DukaanAI Cloud Sync Active</span>
        </div>
      </div>

      {/* Header Right: Controls & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-hover)] transition-all cursor-pointer shrink-0"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-[#FFD026]" /> : <Moon className="w-4 h-4 text-black" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleOpenDropdown}
            className="relative p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-hover)] transition-all cursor-pointer shrink-0"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FFD026] text-black text-[10px] font-black flex items-center justify-center border border-white dark:border-black shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl glass-panel-elevated p-4 shadow-2xl space-y-3 z-50 border border-[var(--border-color)]">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                    Notifications
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-muted)] font-mono">
                    {notifications.length}
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#FFD026]/20 text-[#D97706] dark:text-[#FFD026]">
                      {unreadCount} new
                    </span>
                  )}
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
                      className={`p-3 rounded-xl border transition-all flex gap-2.5 items-start relative group ${
                        !n.is_read
                          ? 'bg-[#FFD026]/5 border-[#FFD026]/40 shadow-xs'
                          : 'bg-black/3 dark:bg-white/5 border-[var(--border-color)] hover:border-[#FFD026]/40 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {getNotifIcon(n.type)}
                      <div className="flex-1 pr-6">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs text-[var(--text-primary)]">{n.title}</p>
                          {!n.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFD026] shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">{n.message}</p>
                        <span className="text-[9px] text-[var(--text-muted)] font-mono block mt-1">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {/* Dismiss / Delete Button (काटना) */}
                      <button
                        onClick={(e) => handleDeleteNotification(n.id, e)}
                        className="absolute right-2.5 top-2.5 p-1 rounded-md text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-all"
                        title="Dismiss notification"
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
            className="flex items-center gap-2 p-1 sm:p-1.5 sm:pr-3 rounded-full hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[var(--border-hover)] transition-all cursor-pointer shrink-0"
            title={user.name}
          >
            <div className="w-8 h-8 rounded-full bg-[#FFD026] border border-[#E6B800] flex items-center justify-center text-black font-extrabold text-xs shadow-sm shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold leading-tight text-[var(--text-primary)]">{user.name}</p>
              <p className="text-[10px] font-medium text-[var(--text-muted)] leading-tight">{user.role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] hidden sm:block shrink-0" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 sm:w-56 max-w-[calc(100vw-1.5rem)] rounded-2xl glass-panel-elevated p-2 shadow-xl space-y-1 z-50">
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
