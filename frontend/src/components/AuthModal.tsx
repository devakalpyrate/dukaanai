import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (data: any) => void;
  apiBase: string;
}

interface KhataEntry {
  name: string;
  amount: string;
  action: string;
  type: 'sent' | 'cleared' | 'credit';
}

const KHATA_FEED: KhataEntry[] = [
  { name: 'Ramesh ji', amount: '₹450', action: 'udhaar added', type: 'credit' },
  { name: 'Sunita', amount: '₹1,200', action: 'reminder sent on WhatsApp', type: 'sent' },
  { name: 'Imran bhai', amount: '₹300', action: 'paid, cleared', type: 'cleared' },
  { name: 'Gupta ji', amount: '₹780', action: 'udhaar added', type: 'credit' },
  { name: 'Meena', amount: '₹95', action: 'reminder sent on WhatsApp', type: 'sent' },
];

const VOICE_SAYS: string[] = [
  'Ramesh ji ka ₹450 udhaar likh do.',
  'Sunita ko reminder bhej do.',
  'Aaj ka total udhaar kitna hai?',
  'Imran bhai ne paise de diye.',
  'Gupta ji ka khata dikhao.',
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess, apiBase }) => {
  const [tab, setTab] = useState<'login' | 'reg'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [khataList, setKhataList] = useState<KhataEntry[]>(KHATA_FEED.slice(0, 3));
  const [voiceLine, setVoiceLine] = useState<string>(VOICE_SAYS[0]);

  useEffect(() => {
    let idx = 3;
    const interval = setInterval(() => {
      const nextEntry = KHATA_FEED[idx % KHATA_FEED.length];
      setKhataList((prev) => [nextEntry, ...prev.slice(0, 2)]);
      setVoiceLine(VOICE_SAYS[idx % VOICE_SAYS.length]);
      idx++;
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  const calculatePasswordScore = (pass: string) => {
    let s = 0;
    if (pass.length >= 8) s++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) s++;
    if (/\d/.test(pass)) s++;
    if (/[^A-Za-z0-9]/.test(pass)) s++;
    return s;
  };

  const pwdScore = calculatePasswordScore(password);
  const pwdMeterWidth = password ? `${Math.max(pwdScore, 1) * 25}%` : '0%';
  const pwdMeterColors = ['#E2452D', '#E2452D', '#F6B511', '#2E9A5B', '#2E9A5B'];
  const pwdMeterColor = pwdMeterColors[pwdScore] || '#E2452D';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (tab === 'reg') {
      if (password.length < 8) {
        setErrorMsg('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    const endpoint = tab === 'reg' ? `${apiBase}/api/auth/register` : `${apiBase}/api/auth/login`;
    const payload =
      tab === 'reg'
        ? { name, email, password, shop_name: shopName }
        : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = data.error?.message || data.detail || 'Authentication failed';
        throw new Error(message);
      }

      localStorage.setItem('dukaanai_token', data.access_token);
      localStorage.setItem(
        'dukaanai_user',
        JSON.stringify({
          id: data.user_id,
          name: data.name,
          email: data.email,
          shop_id: data.shop_id,
          shop_name: data.shop_name,
        })
      );

      onSuccess(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-[#09090B] text-[#F4F4F5] font-sans">
      <style>{`
        @keyframes riseCoin {
          0% { transform: translateY(0) rotate(0); opacity: 0; }
          15% { opacity: 0.6; }
          100% { transform: translateY(-110vh) rotate(25deg); opacity: 0; }
        }
        @keyframes custWalk1 {
          from { transform: translateX(-80px); }
          to { transform: translateX(760px); }
        }
        @keyframes custWalk2 {
          from { transform: translateX(-80px); }
          to { transform: translateX(760px); }
        }
        @keyframes custWalk3 {
          from { transform: translateX(-80px); }
          to { transform: translateX(760px); }
        }
        @keyframes bobAnim {
          to { transform: translateY(-4px); }
        }
        @keyframes ringAnim {
          from { transform: scale(0.6); opacity: 0.8; }
          to { transform: scale(2.2); opacity: 0; }
        }
        @keyframes eqAnim {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
        .anim-coin-1 { animation: riseCoin 9s linear infinite; }
        .anim-coin-2 { animation: riseCoin 9s linear infinite -3s; }
        .anim-coin-3 { animation: riseCoin 9s linear infinite -6s; }
        .anim-coin-4 { animation: riseCoin 9s linear infinite -1.5s; }
        .anim-coin-5 { animation: riseCoin 9s linear infinite -4.5s; }
        .anim-coin-6 { animation: riseCoin 9s linear infinite -7.5s; }
        .anim-walk-1 { animation: custWalk1 14s linear infinite; }
        .anim-walk-2 { animation: custWalk2 17s linear infinite -5s; }
        .anim-walk-3 { animation: custWalk3 12s linear infinite -10s; }
        .anim-bob { animation: bobAnim 0.6s ease-in-out infinite alternate; }
        .anim-ring { transform-origin: center; transform-box: fill-box; animation: ringAnim 1.8s ease-out infinite; }
        .anim-ring-2 { transform-origin: center; transform-box: fill-box; animation: ringAnim 1.8s ease-out infinite 0.9s; }
        .anim-eq-1 { transform-origin: center bottom; transform-box: fill-box; animation: eqAnim 1s ease-in-out infinite alternate; }
        .anim-eq-2 { transform-origin: center bottom; transform-box: fill-box; animation: eqAnim 1s ease-in-out infinite alternate 0.15s; }
        .anim-eq-3 { transform-origin: center bottom; transform-box: fill-box; animation: eqAnim 1s ease-in-out infinite alternate 0.3s; }
        .anim-eq-4 { transform-origin: center bottom; transform-box: fill-box; animation: eqAnim 1s ease-in-out infinite alternate 0.45s; }
        .anim-eq-5 { transform-origin: center bottom; transform-box: fill-box; animation: eqAnim 1s ease-in-out infinite alternate 0.6s; }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] h-screen w-screen overflow-hidden">
        {/* LEFT: FULL-SCREEN SHOP SHOWCASE */}
        <section className="relative hidden lg:flex flex-col justify-between p-8 xl:p-10 bg-[radial-gradient(ellipse_at_48%_68%,#202127_0%,#111114_48%,#09090B_100%)] text-white overflow-hidden border-r border-[#303036]">
          {/* Floating Coins */}
          <div className="absolute inset-0 pointer-events-none">
            <span className="anim-coin-1 absolute bottom-[-30px] left-[8%] text-2xl font-bold text-[#F6B511]">₹</span>
            <span className="anim-coin-2 absolute bottom-[-30px] left-[24%] text-2xl font-bold text-[#F6B511]">₹</span>
            <span className="anim-coin-3 absolute bottom-[-30px] left-[41%] text-2xl font-bold text-[#F6B511]">₹</span>
            <span className="anim-coin-4 absolute bottom-[-30px] left-[58%] text-2xl font-bold text-[#F6B511]">₹</span>
            <span className="anim-coin-5 absolute bottom-[-30px] left-[74%] text-2xl font-bold text-[#F6B511]">₹</span>
            <span className="anim-coin-6 absolute bottom-[-30px] left-[90%] text-2xl font-bold text-[#F6B511]">₹</span>
          </div>

          {/* Brand Logo Header */}
          <div className="z-10 flex items-center gap-2.5 font-bold text-2xl">
            <i className="w-9 h-9 rounded-xl bg-[#F6B511] text-[#09090B] flex items-center justify-center not-italic font-black text-xl shadow-[0_0_15px_rgba(246,181,17,0.4)]">
              द
            </i>
            <span className="tracking-tight">Dukaan AI</span>
          </div>

          {/* Shop Heading & Subtitle */}
          <div className="z-10 mt-6 max-w-md">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white">
              India's Voice Copilot for Kirana & Retail.
            </h1>
            <p className="text-sm text-[#C5CAF0] mt-2 leading-relaxed">
              Record daily customer credits, update inventory, and manage your shop ledger hands-free without typing in English.
            </p>
          </div>

          {/* Living Canvas Scene */}
          <div className="relative flex-1 flex items-end mt-4 min-h-[320px] z-10">
            {/* Spoken Voice Bubble */}
            <div className="absolute left-[4%] top-[18px] bg-white text-[#09090B] rounded-2xl rounded-bl-sm px-3.5 py-2.5 font-semibold text-xs max-w-[240px] shadow-[0_8px_24px_rgba(0,0,0,0.3)] z-20">
              "{voiceLine}"
            </div>

            {/* Khata Ledger Pad */}
            <div className="absolute right-0 top-[6px] w-[min(300px,52%)] bg-[#FFF8E1] text-[#2A2410] rounded-xl p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] rotate-1 z-20 border border-[#E9D99F]">
              <div className="flex items-center justify-between font-bold text-sm border-b border-[#D9C88A] pb-1.5 mb-2">
                <span>Khata Ledger</span>
                <span className="text-xs text-[#7A6B30]">Live आज</span>
              </div>
              <ul className="space-y-1.5 text-xs">
                {khataList.map((entry, idx) => (
                  <li key={idx} className="flex items-center justify-between border-t border-dashed border-[#D9C88A] pt-1">
                    <div>
                      <p className="font-bold text-[#2A2410]">{entry.name}</p>
                      <p className="text-[10px] text-[#7A6B30]">{entry.action}</p>
                    </div>
                    <b className={entry.type === 'cleared' || entry.type === 'sent' ? 'text-[#48B879]' : 'text-[#F06A55]'}>
                      {entry.amount}
                    </b>
                  </li>
                ))}
              </ul>
            </div>

            {/* Animated Scene SVG with Walking Customers */}
            <svg viewBox="0 0 720 300" className="w-full h-auto block drop-shadow-2xl">
              <rect x="0" y="262" width="720" height="38" fill="#0E1744" />
              <rect x="60" y="70" width="400" height="192" rx="6" fill="#26379A" />
              <g>
                <path d="M50 70h420l-20 50H70z" fill="#F6B511" />
                <path d="M120 70h50l-8 50h-34zM220 70h50l-4 50h-42zM320 70h50l0 50h-42zM420 70h50l-12 50h-38z" fill="#E2452D" />
              </g>
              <rect x="90" y="140" width="150" height="122" fill="#101A57" />
              <rect x="100" y="150" width="130" height="22" rx="3" fill="#F6B511" opacity=".9" />
              <text x="165" y="167" fontSize="14" fontWeight="700" textAnchor="middle" fill="#14205C" fontFamily="sans-serif">
                DukaanAI
              </text>
              <g fill="#E2452D">
                <rect x="104" y="184" width="18" height="24" rx="3" />
                <rect x="126" y="184" width="18" height="24" rx="3" fill="#2E9A5B" />
                <rect x="148" y="184" width="18" height="24" rx="3" fill="#F6B511" />
                <rect x="170" y="184" width="18" height="24" rx="3" />
                <rect x="192" y="184" width="18" height="24" rx="3" fill="#2E9A5B" />
              </g>
              <rect x="260" y="150" width="170" height="112" rx="6" fill="#101A57" />
              <rect x="270" y="205" width="150" height="14" fill="#8A5A2B" />

              {/* Voice Agent Hub */}
              <g transform="translate(345 175)">
                <circle className="anim-ring" r="22" fill="none" stroke="#F6B511" strokeWidth="3" />
                <circle className="anim-ring-2" r="22" fill="none" stroke="#F6B511" strokeWidth="3" />
                <circle r="22" fill="#F6B511" />
                <rect x="-5" y="-12" width="10" height="16" rx="5" fill="#14205C" />
                <path d="M-10 0a10 10 0 0020 0M0 10v6" stroke="#14205C" strokeWidth="3" fill="none" strokeLinecap="round" />
              </g>
              <g fill="#fff">
                <rect className="anim-eq-1" x="378" y="160" width="6" height="30" rx="3" />
                <rect className="anim-eq-2" x="388" y="152" width="6" height="46" rx="3" />
                <rect className="anim-eq-3" x="398" y="158" width="6" height="34" rx="3" />
                <rect className="anim-eq-4" x="408" y="150" width="6" height="50" rx="3" />
                <rect className="anim-eq-5" x="418" y="162" width="6" height="26" rx="3" />
              </g>

              {/* Shopkeeper Bob */}
              <g className="anim-bob">
                <circle cx="290" cy="188" r="11" fill="#E8B48A" />
                <path d="M276 215q14-24 28 0z" fill="#2E9A5B" />
              </g>

              {/* Walking Customers */}
              <g className="anim-walk-1">
                <g className="anim-bob">
                  <circle cx="0" cy="214" r="12" fill="#E8B48A" />
                  <rect x="-11" y="226" width="22" height="34" rx="9" fill="#E2452D" />
                </g>
              </g>
              <g className="anim-walk-2">
                <g className="anim-bob">
                  <circle cx="0" cy="218" r="11" fill="#C98E64" />
                  <rect x="-10" y="229" width="20" height="31" rx="9" fill="#F6B511" />
                </g>
              </g>
              <g className="anim-walk-3">
                <g className="anim-bob">
                  <circle cx="0" cy="212" r="12" fill="#E8B48A" />
                  <rect x="-11" y="224" width="22" height="36" rx="9" fill="#8F7AE6" />
                </g>
              </g>
            </svg>
          </div>
        </section>

        {/* RIGHT: AUTHENTICATION PANEL */}
        <main className="flex items-center justify-center p-6 sm:p-10 bg-[#09090B] overflow-y-auto">
          <div className="w-full max-w-[440px] my-auto">
            {/* Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#18181B] border border-[#29292F] mb-6 relative">
              <span
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#F6B511] rounded-xl transition-transform duration-250 ${
                  tab === 'reg' ? 'translate-x-[calc(100%+8px)]' : 'translate-x-1'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg('');
                }}
                className={`py-2.5 text-base font-semibold z-10 transition-colors cursor-pointer ${
                  tab === 'login' ? 'text-[#17130A] font-bold' : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('reg');
                  setErrorMsg('');
                }}
                className={`py-2.5 text-base font-semibold z-10 transition-colors cursor-pointer ${
                  tab === 'reg' ? 'text-[#17130A] font-bold' : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Register shop
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Login Form */}
            {tab === 'login' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Welcome back</h2>
                  <p className="text-sm text-[#A1A1AA]">Log in to see today’s udhaar and reminders.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#F4F4F5]">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@shop.com"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#1C1C20] border border-[#303036] text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#F6B511] focus:ring-1 focus:ring-[#F6B511]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#F4F4F5]">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      className="w-full pl-3.5 pr-11 py-2.5 text-sm rounded-xl bg-[#1C1C20] border border-[#303036] text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#F6B511] focus:ring-1 focus:ring-[#F6B511]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#A1A1AA] hover:text-white px-2 py-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#F6B511] hover:bg-[#FFD04A] text-[#17130A] font-bold text-base tracking-wide transition-all cursor-pointer disabled:opacity-50 mt-2 shadow-[0_0_15px_rgba(246,181,17,0.3)]"
                >
                  {loading ? 'Logging in...' : 'Log in'}
                </button>

                <div className="flex justify-between items-center text-xs text-[#A1A1AA] pt-1">
                  <span>
                    New shop?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setTab('reg');
                        setErrorMsg('');
                      }}
                      className="text-[#F6B511] font-semibold underline cursor-pointer"
                    >
                      Register
                    </button>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-[#303036] text-[#A1A1AA] text-xs mt-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-[#F6B511]">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0014 0M12 18v3" />
                  </svg>
                  <span>
                    <b className="text-[#F4F4F5]">Voice agent</b> starts after login. Just say <em>“Sunita ka udhaar kitna hai?”</em>
                  </span>
                </div>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Set up your shop</h2>
                  <p className="text-sm text-[#A1A1AA]">Register your dukaan and start hands-free voice logging.</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#F4F4F5]">Shop name</label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Sharma Kirana Store"
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-[#1C1C20] border border-[#303036] text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#F6B511] focus:ring-1 focus:ring-[#F6B511]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#F4F4F5]">Your name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Rajesh Sharma"
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-[#1C1C20] border border-[#303036] text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#F6B511] focus:ring-1 focus:ring-[#F6B511]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#F4F4F5]">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@shop.com"
                      className="w-full px-3 py-2 text-sm rounded-xl bg-[#1C1C20] border border-[#303036] text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#F6B511] focus:ring-1 focus:ring-[#F6B511]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-[#F4F4F5]">Phone number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="98765 43210"
                      className="w-full px-3 py-2 text-sm rounded-xl bg-[#1C1C20] border border-[#303036] text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#F6B511] focus:ring-1 focus:ring-[#F6B511]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#F4F4F5]">Set password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full pl-3.5 pr-11 py-2 text-sm rounded-xl bg-[#1C1C20] border border-[#303036] text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#F6B511] focus:ring-1 focus:ring-[#F6B511]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#A1A1AA] hover:text-white px-2 py-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="h-1.5 w-full bg-[#303036] rounded-full overflow-hidden mt-1.5">
                      <div className="h-full transition-all duration-250" style={{ width: pwdMeterWidth, backgroundColor: pwdMeterColor }} />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#F4F4F5]">Confirm password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Type it again"
                      className="w-full pl-3.5 pr-11 py-2 text-sm rounded-xl bg-[#1C1C20] border border-[#303036] text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#F6B511] focus:ring-1 focus:ring-[#F6B511]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#A1A1AA] hover:text-white px-2 py-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#F6B511] hover:bg-[#FFD04A] text-[#17130A] font-bold text-base tracking-wide transition-all cursor-pointer disabled:opacity-50 mt-1 shadow-[0_0_15px_rgba(246,181,17,0.3)]"
                >
                  {loading ? 'Creating...' : 'Create my shop'}
                </button>

                <div className="text-xs text-[#A1A1AA] pt-1 text-center">
                  <span>
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setTab('login');
                        setErrorMsg('');
                      }}
                      className="text-[#F6B511] font-semibold underline cursor-pointer"
                    >
                      Log in
                    </button>
                  </span>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
