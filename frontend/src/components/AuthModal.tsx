import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ShieldCheck, ArrowLeft, KeyRound, Store, MapPin, Phone, Mail, User } from 'lucide-react';

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
  { name: 'Sunita', amount: '₹1,200', action: 'reminder sent', type: 'sent' },
  { name: 'Imran bhai', amount: '₹300', action: 'paid, cleared', type: 'cleared' },
  { name: 'Gupta ji', amount: '₹780', action: 'udhaar added', type: 'credit' },
  { name: 'Meena', amount: '₹95', action: 'reminder sent', type: 'sent' },
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
  const [regStep, setRegStep] = useState<'form' | 'otp'>('form');

  const [loginMode, setLoginMode] = useState<'mobile' | 'email'>('mobile');
  const [loginMobile, setLoginMobile] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [loginOtp, setLoginOtp] = useState('');
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginGeneratedOtp, setLoginGeneratedOtp] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [systemSender, setSystemSender] = useState('dukaanai@india');

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

  const handleSendLoginOtp = async () => {
    setErrorMsg('');
    const cleanPhone = loginMobile.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number first.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error?.message || 'Failed to send verification code.');
      }
      const code = data.otp || data.code;
      setLoginGeneratedOtp(code);
      setLoginOtp(code);
      setLoginOtpSent(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const identifier = loginMode === 'mobile' ? loginMobile.trim() : loginEmail.trim();
    if (!identifier) {
      setErrorMsg(loginMode === 'mobile' ? 'Please enter your mobile number.' : 'Please enter your email address.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          phone: loginMode === 'mobile' ? identifier : '',
          email: identifier,
          password: loginMethod === 'password' ? loginPassword : '',
          otp: loginMode === 'mobile' && loginMethod === 'otp' ? loginOtp.trim() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.detail || 'Login failed. Invalid mobile/email or password.');
      }

      localStorage.setItem('dukaanai_token', data.access_token);
      localStorage.setItem(
        'dukaanai_user',
        JSON.stringify({
          id: data.user_id,
          name: data.name,
          email: data.email,
          phone: data.phone || '',
          shop_id: data.shop_id,
          shop_name: data.shop_name,
          address: data.shop_address || '',
        })
      );

      onSuccess(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!shopName.trim()) {
      setErrorMsg('Shop Name is required.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Shop physical location/address is required.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error?.message || 'Failed to generate confirmation code.');
      }

      setGeneratedOtp(data.otp);
      setSystemSender(data.sent_from || 'dukaanai@india');
      setRegStep('otp');
      setOtpInput('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending confirmation code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const entered = otpInput.trim();
    if (!entered || entered.length !== 6) {
      setErrorMsg('Please enter the 6-digit confirmation code.');
      return;
    }

    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || firstName.trim() || 'Store Owner';

    try {
      const res = await fetch(`${apiBase}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email: email.trim() || `${phone.trim()}@dukaan.ai`,
          phone: phone.trim(),
          shop_name: shopName.trim(),
          shop_address: address.trim(),
          password,
          otp: entered,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = data.error?.message || data.detail || 'Registration failed.';
        throw new Error(message);
      }

      localStorage.setItem('dukaanai_token', data.access_token);
      localStorage.setItem(
        'dukaanai_user',
        JSON.stringify({
          id: data.user_id,
          name: data.name,
          email: data.email,
          phone: data.phone || phone.trim(),
          shop_id: data.shop_id,
          shop_name: data.shop_name,
          address: data.shop_address || address.trim(),
        })
      );

      onSuccess(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the code.');
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
        {/* LEFT: FULL-SCREEN SHOP SHOWCASE WITH ANIMATION SYSTEM */}
        <section className="relative hidden lg:flex flex-col justify-between p-8 xl:p-10 bg-[radial-gradient(ellipse_at_48%_68%,#202127_0%,#111114_48%,#09090B_100%)] text-white overflow-hidden border-r border-[#303036]">
          {/* Floating Coins */}
          <div className="absolute inset-0 pointer-events-none">
            <span className="anim-coin-1 absolute bottom-[-30px] left-[8%] text-2xl font-bold text-[#FFD026]">₹</span>
            <span className="anim-coin-2 absolute bottom-[-30px] left-[24%] text-2xl font-bold text-[#FFD026]">₹</span>
            <span className="anim-coin-3 absolute bottom-[-30px] left-[41%] text-2xl font-bold text-[#FFD026]">₹</span>
            <span className="anim-coin-4 absolute bottom-[-30px] left-[58%] text-2xl font-bold text-[#FFD026]">₹</span>
            <span className="anim-coin-5 absolute bottom-[-30px] left-[74%] text-2xl font-bold text-[#FFD026]">₹</span>
            <span className="anim-coin-6 absolute bottom-[-30px] left-[90%] text-2xl font-bold text-[#FFD026]">₹</span>
          </div>

          {/* Brand Logo Header */}
          <div className="z-10 flex items-center gap-2.5 font-bold text-2xl">
            <i className="w-10 h-10 rounded-xl bg-[#FFD026] text-[#09090B] flex items-center justify-center not-italic font-black text-xl shadow-[0_0_15px_rgba(255,208,38,0.4)] border border-[#E6B800]">
              द
            </i>
            <span className="tracking-tight text-xl font-black">
              Dukaan<span className="text-[#FFD026]">AI</span>
            </span>
          </div>

          {/* Shop Heading & Subtitle */}
          <div className="z-10 mt-6 max-w-md">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white">
              India's Voice Copilot for Kirana & Retail.
            </h1>
            <p className="text-sm text-[#C5CAF0] mt-2 leading-relaxed">
              Record daily customer credits, clear debts, and manage your store ledger hands-free with voice recognition in Indian languages.
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
                <span className="text-xs text-[#7A6B30]">Live Sync</span>
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
                <path d="M50 70h420l-20 50H70z" fill="#FFD026" />
                <path d="M120 70h50l-8 50h-34zM220 70h50l-4 50h-42zM320 70h50l0 50h-42zM420 70h50l-12 50h-38z" fill="#E2452D" />
              </g>
              <rect x="90" y="140" width="150" height="122" fill="#101A57" />
              <rect x="100" y="150" width="130" height="22" rx="3" fill="#FFD026" opacity=".9" />
              <text x="165" y="167" fontSize="14" fontWeight="700" textAnchor="middle" fill="#14205C" fontFamily="sans-serif">
                DukaanAI
              </text>
              <g fill="#E2452D">
                <rect x="104" y="184" width="18" height="24" rx="3" />
                <rect x="126" y="184" width="18" height="24" rx="3" fill="#2E9A5B" />
                <rect x="148" y="184" width="18" height="24" rx="3" fill="#FFD026" />
                <rect x="170" y="184" width="18" height="24" rx="3" />
                <rect x="192" y="184" width="18" height="24" rx="3" fill="#2E9A5B" />
              </g>
              <rect x="260" y="150" width="170" height="112" rx="6" fill="#101A57" />
              <rect x="270" y="205" width="150" height="14" fill="#8A5A2B" />

              {/* Voice Agent Hub */}
              <g transform="translate(345 175)">
                <circle className="anim-ring" r="22" fill="none" stroke="#FFD026" strokeWidth="3" />
                <circle className="anim-ring-2" r="22" fill="none" stroke="#FFD026" strokeWidth="3" />
                <circle r="22" fill="#FFD026" />
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
                  <rect x="-10" y="229" width="20" height="31" rx="9" fill="#FFD026" />
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

          <div className="z-10 text-[11px] text-[#A1A1AA] pt-2">
            DukaanAI Smart Store OS • Ultra-Fast Multilingual Voice Assistant
          </div>
        </section>

        {/* RIGHT: AUTH FORM CONTAINER (100% ENGLISH) */}
        <main className="flex flex-col justify-center px-6 sm:px-12 xl:px-16 py-8 overflow-y-auto custom-scrollbar bg-[#09090B]">
          <div className="w-full max-w-md mx-auto">
            {/* Header Tabs */}
            <div className="flex bg-[#1E1F26] p-1 rounded-xl mb-6 border border-[#2E3038]">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  tab === 'login'
                    ? 'bg-[#2B2C36] text-white shadow-xs'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('reg');
                  setRegStep('form');
                  setErrorMsg('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  tab === 'reg'
                    ? 'bg-[#FFD026] text-black shadow-xs'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Register Store
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 text-xs rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium">
                {errorMsg}
              </div>
            )}

            {/* TAB 1: LOGIN FORM */}
            {tab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Welcome Back</h2>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Sign in to your DukaanAI store with your Mobile Number or Email.
                  </p>
                </div>

                {/* Sub-tabs: Mobile Number vs Email */}
                <div className="flex bg-[#121316] p-1 rounded-xl border border-[#2E3038] gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('mobile');
                      setErrorMsg('');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      loginMode === 'mobile'
                        ? 'bg-[#FFD026] text-black shadow-xs'
                        : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" /> Mobile Number
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('email');
                      setErrorMsg('');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      loginMode === 'email'
                        ? 'bg-[#FFD026] text-black shadow-xs'
                        : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" /> Email Address
                  </button>
                </div>

                {/* Field: Mobile Input or Email Input */}
                {loginMode === 'mobile' ? (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#F4F4F5] uppercase tracking-wider">
                      Mobile Number (मोबाइल नंबर)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 font-semibold text-xs text-[#FFD026] bg-[#2E3038]/70 px-1.5 py-0.5 rounded border border-[#3E404D]">
                        🇮🇳 +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={loginMobile}
                        onChange={(e) => setLoginMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="98765 43210"
                        className="w-full pl-20 pr-3.5 py-2.5 text-xs rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026] font-mono tracking-wider"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#F4F4F5] uppercase tracking-wider">
                      Email Address (ईमेल पता)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="store@dukaan.ai"
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026]"
                      />
                    </div>
                  </div>
                )}

                {/* Quick Toggle for Mobile: Password vs Instant OTP */}
                {loginMode === 'mobile' && (
                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="text-[#A1A1AA]">Login verification:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMethod(loginMethod === 'password' ? 'otp' : 'password');
                        setErrorMsg('');
                      }}
                      className="text-[#FFD026] font-bold hover:underline cursor-pointer"
                    >
                      {loginMethod === 'password' ? 'Switch to OTP Login' : 'Switch to Password Login'}
                    </button>
                  </div>
                )}

                {/* Password Input (shown when email mode or mobile password method) */}
                {(loginMode === 'email' || loginMethod === 'password') && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#F4F4F5] uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your account password"
                        className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Mobile OTP Section */}
                {loginMode === 'mobile' && loginMethod === 'otp' && (
                  <div className="space-y-3 pt-1">
                    {!loginOtpSent ? (
                      <button
                        type="button"
                        onClick={handleSendLoginOtp}
                        disabled={loading || loginMobile.length < 10}
                        className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[#FFD026] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                      >
                        {loading ? 'Sending Code...' : 'Get 6-Digit Login Code'}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        {loginGeneratedOtp && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1">
                            <span className="text-[10px] uppercase font-bold text-amber-300">Your Login Code:</span>
                            <div className="text-xl font-mono font-black text-[#FFD026] tracking-widest select-all">
                              {loginGeneratedOtp}
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-bold text-[#F4F4F5] uppercase tracking-wider mb-1">
                            Enter 6-Digit Code
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={loginOtp}
                            onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="Enter 6-digit code"
                            className="w-full text-center tracking-[0.3em] font-mono text-base py-2.5 rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026]"
                          />
                        </div>
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={handleSendLoginOtp}
                            className="text-[11px] text-[#A1A1AA] hover:text-[#FFD026] cursor-pointer underline"
                          >
                            Resend Code
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    (loginMode === 'mobile' && loginMobile.length < 10) ||
                    (loginMode === 'email' && !loginEmail) ||
                    (loginMode === 'mobile' && loginMethod === 'otp' && (!loginOtpSent || loginOtp.length !== 6))
                  }
                  className="w-full py-2.5 rounded-xl bg-[#FFD026] hover:bg-[#F6B511] text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50 mt-2"
                >
                  {loading
                    ? 'Signing in...'
                    : loginMode === 'mobile'
                    ? loginMethod === 'otp'
                      ? 'Verify Code & Sign In'
                      : 'Sign In with Mobile'
                    : 'Sign In with Email'}
                </button>

                <div className="text-center pt-2 text-xs text-[#A1A1AA]">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setTab('reg');
                      setRegStep('form');
                      setErrorMsg('');
                    }}
                    className="text-[#FFD026] font-bold hover:underline cursor-pointer"
                  >
                    Register your store
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: REGISTER STORE FORM */}
            {tab === 'reg' && regStep === 'form' && (
              <form onSubmit={handleInitiateRegister} className="space-y-3.5">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Register Your Store</h2>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    Fill in your store details. Mobile number is required.
                  </p>
                </div>

                {/* Name Row */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[#F4F4F5] uppercase tracking-wider">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Ramesh"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[#F4F4F5] uppercase tracking-wider">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Kumar"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026]"
                    />
                  </div>
                </div>

                {/* Contact Row */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[#F4F4F5] uppercase tracking-wider flex items-center justify-between">
                      <span>Mobile Number</span>
                      <span className="text-[10px] text-amber-500 font-bold">*Required</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A1A1AA]" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit number"
                        className="w-full pl-8 pr-2.5 py-2 text-xs rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[#F4F4F5] uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A1A1AA]" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="store@dukaan.ai"
                        className="w-full pl-8 pr-2.5 py-2 text-xs rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026]"
                      />
                    </div>
                  </div>
                </div>

                {/* Store Name & Address */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#F4F4F5] uppercase tracking-wider flex items-center justify-between">
                    <span>Shop / Store Name</span>
                    <span className="text-[10px] text-amber-500 font-bold">*Required</span>
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A1A1AA]" />
                    <input
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Mahabir Kirana & General Store"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-[#F4F4F5] uppercase tracking-wider flex items-center justify-between">
                    <span>Shop Physical Address</span>
                    <span className="text-[10px] text-amber-500 font-bold">*Required</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#A1A1AA]" />
                    <textarea
                      required
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Shop No. 12, Main Market Road, Bhubaneswar, Odisha"
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026] resize-none"
                    />
                  </div>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[#F4F4F5] uppercase tracking-wider">
                      Set Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-[#F4F4F5] uppercase tracking-wider">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Type again"
                        className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {password && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-[#2E3038] rounded-full overflow-hidden">
                      <div className="h-full transition-all duration-200" style={{ width: pwdMeterWidth, backgroundColor: pwdMeterColor }} />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-[#FFD026] hover:bg-[#F6B511] text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50 mt-2"
                >
                  {loading ? 'Generating Code...' : 'Continue to Verification'}
                </button>

                <div className="text-center pt-1 text-xs text-[#A1A1AA]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setTab('login');
                      setErrorMsg('');
                    }}
                    className="text-[#FFD026] font-bold hover:underline cursor-pointer"
                  >
                    Log In
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2 - STEP 2: OTP CONFIRMATION */}
            {tab === 'reg' && regStep === 'otp' && (
              <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setRegStep('form')}
                  className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to details
                </button>

                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Verify Your Account</h2>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    We generated a 6-digit confirmation code for <strong>{phone}</strong>.
                  </p>
                </div>

                {/* Display Confirmation Code Banner */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Confirmation Code
                    </span>
                    <span className="font-mono text-[10px] text-amber-400">{systemSender}</span>
                  </div>
                  <div className="text-2xl font-black tracking-widest text-[#FFD026] font-mono select-all">
                    {generatedOtp}
                  </div>
                  <p className="text-[10px] text-amber-400/80">
                    Enter this 6-digit code below to activate your store.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#F4F4F5] uppercase tracking-wider">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter code"
                    className="w-full text-center tracking-[0.3em] font-mono text-lg py-2.5 rounded-xl bg-[#1C1C22] border border-[#2E3038] text-white placeholder-[#71717A] focus:outline-none focus:border-[#FFD026]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpInput.length !== 6}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Complete Setup'}
                </button>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
