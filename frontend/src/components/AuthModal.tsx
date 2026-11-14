import React, { useState } from 'react';
import { Store, Lock, Mail, User, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (data: any) => void;
  apiBase: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess, apiBase }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const endpoint = isRegister ? `${apiBase}/api/auth/register` : `${apiBase}/api/auth/login`;
    const bodyData = isRegister
      ? { name, email, password, shop_name: shopName }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      localStorage.setItem('dukaanai_token', data.access_token);
      localStorage.setItem('dukaanai_user', JSON.stringify({
        id: data.user_id,
        name: data.name,
        email: data.email,
        shop_id: data.shop_id,
        shop_name: data.shop_name,
      }));

      onSuccess(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-slate-900/90 border border-white/10 shadow-2xl flex flex-col gap-4 text-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/30 to-purple-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Dukaan<span className="text-cyan-400">AI</span> Shopkeeper Access
            </h2>
            <p className="text-xs text-slate-400">
              {isRegister ? 'Register your store & account' : 'Sign in to access your voice copilot'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {isRegister && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Shop Owner Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Subham Maharana"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Shop / Store Name
                </label>
                <div className="relative flex items-center">
                  <Store className="absolute left-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Mahabir Kirana Store"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/60"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Owner Email
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@dukaan.ai"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-400/60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 font-bold text-sm text-white flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-[0_0_15px_rgba(0,210,255,0.4)] disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register & Start' : 'Sign In to DukaanAI'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
            }}
            className="text-xs text-cyan-400 hover:underline cursor-pointer"
          >
            {isRegister
              ? 'Already have an account? Sign In'
              : "Don't have an account? Register your shop"}
          </button>
        </div>
      </div>
    </div>
  );
};
