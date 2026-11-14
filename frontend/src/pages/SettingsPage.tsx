import React, { useState } from 'react';
import {
  User,
  Store,
  CreditCard,
  Shield,
  Palette,
  Check,
  Save,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { UserProfile } from '../types';

interface SettingsPageProps {
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onUpdateUser }) => {
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'shop' | 'payments' | 'security' | 'appearance'>('profile');

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');

  const [shopName, setShopName] = useState(user.shop_name);
  const [gstin, setGstin] = useState(user.gstin || '');
  const [address, setAddress] = useState(user.address || '');

  const [upiId, setUpiId] = useState(user.upi_id || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({
      name,
      email,
      phone,
      shop_name: shopName,
      gstin,
      address,
      upi_id: upiId,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
          Account & Store Settings
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Manage your personal profile, business identity, UPI payout IDs, and UI appearance preferences.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" /> Settings updated successfully in session state.
        </div>
      )}

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Tabs */}
        <div className="glass-card rounded-2xl p-2 space-y-1 h-fit">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-neutral-900 light:bg-neutral-200 text-white light:text-black border border-neutral-700 light:border-neutral-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900/40 light:hover:bg-neutral-100'
            }`}
          >
            <User className="w-4 h-4 text-[var(--text-primary)]" /> Personal Profile
          </button>

          <button
            onClick={() => setActiveTab('shop')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
              activeTab === 'shop'
                ? 'bg-neutral-900 light:bg-neutral-200 text-white light:text-black border border-neutral-700 light:border-neutral-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900/40 light:hover:bg-neutral-100'
            }`}
          >
            <Store className="w-4 h-4 text-[var(--text-primary)]" /> Shop Information
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-neutral-900 light:bg-neutral-200 text-white light:text-black border border-neutral-700 light:border-neutral-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900/40 light:hover:bg-neutral-100'
            }`}
          >
            <CreditCard className="w-4 h-4 text-[var(--text-primary)]" /> Payment & UPI Details
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
              activeTab === 'appearance'
                ? 'bg-neutral-900 light:bg-neutral-200 text-white light:text-black border border-neutral-700 light:border-neutral-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900/40 light:hover:bg-neutral-100'
            }`}
          >
            <Palette className="w-4 h-4 text-[var(--text-primary)]" /> Theme & Appearance
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
              activeTab === 'security'
                ? 'bg-neutral-900 light:bg-neutral-200 text-white light:text-black border border-neutral-700 light:border-neutral-400'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-neutral-900/40 light:hover:bg-neutral-100'
            }`}
          >
            <Shield className="w-4 h-4 text-[var(--text-primary)]" /> Security & Passwords
          </button>
        </div>

        {/* Form Body */}
        <div className="md:col-span-3 glass-card rounded-2xl p-6">
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-white/10 pb-2">
                  Personal Owner Information
                </h3>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Mobile Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            {activeTab === 'shop' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-white/10 pb-2">
                  Store & Business Details
                </h3>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Store / Kirana Name</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">GSTIN / Registration No.</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="Optional GSTIN"
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Physical Shop Address</label>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter store location"
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-white/10 pb-2">
                  Payment Collection & UPI Configuration
                </h3>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Merchant UPI ID (VPA)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. yourname@upi"
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-primary)] focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
                  UI Theme & Styling Preferences
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-xl border cursor-pointer flex flex-col items-center gap-2 ${
                      theme === 'dark'
                        ? 'bg-neutral-900 border-white text-white font-bold'
                        : 'bg-neutral-900/30 border-neutral-800 text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="w-12 h-8 rounded bg-black border border-white" />
                    <span className="font-bold text-xs">Pure Black (Dark)</span>
                  </div>

                  <div
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-xl border cursor-pointer flex flex-col items-center gap-2 ${
                      theme === 'light'
                        ? 'bg-neutral-100 border-black text-black font-bold'
                        : 'bg-neutral-100/50 border-neutral-300 text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="w-12 h-8 rounded bg-white border border-black" />
                    <span className="font-bold text-xs">Pure White (Light)</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
                  Password & Session Security
                </h3>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full p-2.5 rounded-xl bg-neutral-900/50 light:bg-neutral-100 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-white light:focus:border-black"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full p-2.5 rounded-xl bg-neutral-900/50 light:bg-neutral-100 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-white light:focus:border-black"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border-color)] flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black light:bg-neutral-900 light:text-white font-bold cursor-pointer hover:opacity-90 shadow-sm"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
