import React, { useState, useEffect } from 'react';
import {
  User,
  Store,
  CreditCard,
  Shield,
  Palette,
  Check,
  Save,
  QrCode,
  CheckCircle2,
  ChevronDown,
  X,
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const tabs = [
    { id: 'profile' as const, label: 'Personal Profile', icon: User },
    { id: 'shop' as const, label: 'Shop Information', icon: Store },
    { id: 'payments' as const, label: 'Payment & UPI Details', icon: CreditCard },
    { id: 'appearance' as const, label: 'Theme & Appearance', icon: Palette },
    { id: 'security' as const, label: 'Security & Passwords', icon: Shield },
  ];

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');

  const [shopName, setShopName] = useState(user.shop_name);
  const [gstin, setGstin] = useState(user.gstin || '');
  const [address, setAddress] = useState(user.address || '');

  const [upiId, setUpiId] = useState(user.upi_id || '');
  const [payeeName, setPayeeName] = useState(user.shop_name || '');
  const [paymentPhone, setPaymentPhone] = useState(user.phone || '');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem('dukaanai_token');
      if (!token) return;
      try {
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            const s = data.settings;
            if (s.upi_id !== undefined) setUpiId(s.upi_id || '');
            if (s.phone) {
              setPhone(s.phone);
              setPaymentPhone(s.phone);
            }
            if (s.shop_name) {
              setShopName(s.shop_name);
              setPayeeName(s.shop_name);
            }
            if (s.shop_address) setAddress(s.shop_address);
            if (s.gstin) setGstin(s.gstin);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem('dukaanai_token');
    if (token) {
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            upi_id: upiId,
            phone,
            shop_name: shopName,
            shop_address: address,
            gstin,
            theme,
          }),
        });
      } catch (err) {
        console.error('Failed to persist settings:', err);
      }
    }

    onUpdateUser({
      name,
      email,
      phone,
      shop_name: shopName,
      gstin,
      address,
      upi_id: upiId,
    });
    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
              Account & Store Settings
            </h2>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFD026] text-black text-xs font-black shadow-xs active:scale-95 cursor-pointer"
              title="Change Settings Section"
            >
              <span>{tabs.find((t) => t.id === activeTab)?.label}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 hidden sm:block">
            Manage your personal profile, business identity, UPI payments, and store preferences.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" /> Settings updated and saved successfully.
        </div>
      )}

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Tabs - Hidden on mobile, shown on md+ */}
        <div className="hidden md:block md:col-span-1 glass-card rounded-2xl p-2 space-y-1 h-fit">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#FFD026] text-black border border-[#E6B800] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <User className="w-4 h-4 text-current" /> Personal Profile
          </button>

          <button
            onClick={() => setActiveTab('shop')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeTab === 'shop'
                ? 'bg-[#FFD026] text-black border border-[#E6B800] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Store className="w-4 h-4 text-current" /> Shop Information
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-[#FFD026] text-black border border-[#E6B800] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-4 h-4 text-current" /> Payment & UPI Details
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeTab === 'appearance'
                ? 'bg-[#FFD026] text-black border border-[#E6B800] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Palette className="w-4 h-4 text-current" /> Theme & Appearance
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
              activeTab === 'security'
                ? 'bg-[#FFD026] text-black border border-[#E6B800] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Shield className="w-4 h-4 text-current" /> Security & Passwords
          </button>
        </div>

        {/* Form Body - Takes full width on mobile, 3 cols on desktop */}
        <div className="col-span-1 md:col-span-3 glass-card rounded-2xl p-4 sm:p-6">
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
                  Personal Owner Information
                </h3>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">
                    Mobile Number <span className="text-[#E2452D] font-bold">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
                  />
                </div>
              </div>
            )}

            {activeTab === 'shop' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
                  Store & Business Details
                </h3>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Store / Kirana Name</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Physical Shop Address / Location</label>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Shop address or location where store operates"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">GSTIN / Registration No. (Optional)</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="e.g. 21AAAAA0000A1Z5"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-black dark:focus:border-[#FFD026] font-mono"
                  />
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
                  Payment Collection & UPI Configuration
                </h3>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <div className="font-bold text-emerald-300">Official NPCI & Banking Standard</div>
                    <div className="text-[11px] text-emerald-400/90 mt-0.5">
                      To receive customer payments, only your UPI ID and Merchant Name are required. Under NPCI security guidelines, an application should never ask for or store your secret UPI PIN.
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Merchant UPI ID (VPA)</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. storename@okhdfcbank or 9876543210@paytm"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-black dark:focus:border-[#FFD026] font-mono"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Customer payments sent to this UPI ID are deposited directly into your linked bank account.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">
                    Payee / Merchant Display Name
                  </label>
                  <input
                    type="text"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    placeholder="e.g. Store Name"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    The name displayed on the customer's payment app (Google Pay, PhonePe, Paytm) when scanning your store QR code.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">
                    Payment Alert Phone Number
                  </label>
                  <input
                    type="tel"
                    value={paymentPhone}
                    onChange={(e) => setPaymentPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-black dark:focus:border-[#FFD026] font-mono"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Receives real-time payment alerts and audio confirmations.
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  <QrCode className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Your Store QR code is dynamically rendered using standard UPI URI specifications (<code className="font-mono text-[10px] bg-black/20 px-1 py-0.5 rounded">upi://pay?pa=...</code>).
                  </span>
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
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-2xl border cursor-pointer flex flex-col items-center gap-2 transition-all ${
                      theme === 'light'
                        ? 'bg-[#FFD026] text-black border-[#E6B800] font-bold shadow-sm'
                        : 'bg-black/[0.02] dark:bg-white/5 border-[var(--border-color)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="w-12 h-8 rounded-lg bg-[#FAF8F5] border border-[#E5E0D8]" />
                    <span className="font-bold text-xs">Warm Cream (Signature)</span>
                  </div>

                  <div
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-2xl border cursor-pointer flex flex-col items-center gap-2 transition-all ${
                      theme === 'dark'
                        ? 'bg-neutral-900 border-white text-white font-bold shadow-sm'
                        : 'bg-black/[0.02] dark:bg-white/5 border-[var(--border-color)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <div className="w-12 h-8 rounded-lg bg-[#121316] border border-[#2E3038]" />
                    <span className="font-bold text-xs">Dark Contrast</span>
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
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border-color)] flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#18181B] hover:bg-black dark:bg-[#FFD026] text-white dark:text-black font-bold cursor-pointer shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-[#FFD026] dark:text-black" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Settings Section Off-Canvas Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="flex-1"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="w-full bg-[var(--surface-color)] border-t border-[var(--border-color)] rounded-t-3xl p-5 max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#FFD026]" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Settings Sections</h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 space-y-1.5 overflow-y-auto">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFD026] text-black shadow-xs font-black'
                        : 'text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-[var(--text-secondary)]'}`} />
                      <span>{tab.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-black" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
