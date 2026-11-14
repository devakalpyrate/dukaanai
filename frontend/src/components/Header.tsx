import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  Bell,
  User,
  Store,
  CreditCard,
  Shield,
  Palette,
  LogOut,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { UserProfile, PageId } from '../types';

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
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="glass-panel h-16 px-6 flex items-center justify-between border-b border-[var(--border-color)] z-20">
      {/* Header Left: Current Store Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 light:bg-neutral-100 border border-neutral-700 light:border-neutral-300 text-xs font-semibold text-[var(--text-primary)]">
          <Store className="w-3.5 h-3.5 text-neutral-400 light:text-neutral-600" />
          <span>{user.shop_name}</span>
        </div>
        <span className="hidden md:inline text-xs text-[var(--text-muted)]">
          Store Management System
        </span>
      </div>

      {/* Header Right: Controls & Profile */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900 light:hover:bg-neutral-100 border border-transparent hover:border-[var(--border-hover)] transition-all cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-black" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900 light:hover:bg-neutral-100 border border-transparent hover:border-[var(--border-hover)] transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white light:bg-black" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-panel-elevated p-4 shadow-2xl space-y-3 z-50">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Notifications
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold cursor-pointer hover:underline">
                  Mark all read
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 flex gap-2.5 items-start">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Low Stock: Fortune Oil</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Only 4 pouches left. Minimum limit: 6.</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 flex gap-2.5 items-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Payment Received: ₹1,200</p>
                    <p className="text-[11px] text-[var(--text-muted)]">From Sunita Jena via UPI.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-neutral-900 light:hover:bg-neutral-100 border border-transparent hover:border-[var(--border-hover)] transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-neutral-900 light:bg-neutral-200 border border-neutral-700 light:border-neutral-400 flex items-center justify-center text-white light:text-black font-bold text-xs shadow-sm">
              {user.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold leading-tight text-[var(--text-primary)]">{user.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] leading-tight">{user.role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl glass-panel-elevated p-2 shadow-2xl space-y-1 z-50">
              <div className="px-3 py-2 border-b border-[var(--border-color)]">
                <p className="text-sm font-bold text-[var(--text-primary)]">{user.name}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
              </div>

              <button
                onClick={() => {
                  onNavigate('settings');
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900 light:hover:bg-neutral-100 transition-all text-left cursor-pointer"
              >
                <User className="w-4 h-4 text-neutral-400 light:text-neutral-600" /> My Profile & Personal Info
              </button>

              <button
                onClick={() => {
                  onNavigate('settings');
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900 light:hover:bg-neutral-100 transition-all text-left cursor-pointer"
              >
                <Store className="w-4 h-4 text-neutral-400 light:text-neutral-600" /> Shop Information & GSTIN
              </button>

              <button
                onClick={() => {
                  onNavigate('settings');
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900 light:hover:bg-neutral-100 transition-all text-left cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-neutral-400 light:text-neutral-600" /> UPI & Payment Details
              </button>

              <button
                onClick={() => {
                  onNavigate('settings');
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900 light:hover:bg-neutral-100 transition-all text-left cursor-pointer"
              >
                <Shield className="w-4 h-4 text-neutral-400 light:text-neutral-600" /> Account Security & Password
              </button>

              <button
                onClick={() => {
                  toggleTheme();
                  setProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900 light:hover:bg-neutral-100 transition-all text-left cursor-pointer"
              >
                <Palette className="w-4 h-4 text-neutral-400 light:text-neutral-600" /> Theme Preferences ({theme === 'dark' ? 'Dark' : 'Light'})
              </button>

              <div className="pt-1 border-t border-[var(--border-color)]">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-300 light:text-neutral-700 hover:text-white light:hover:text-black hover:bg-neutral-900 light:hover:bg-neutral-100 transition-all text-left cursor-pointer font-semibold"
                >
                  <LogOut className="w-4 h-4 text-neutral-400 light:text-neutral-600" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
