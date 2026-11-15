import React from 'react';
import { Info, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface CalloutProps {
  type?: 'info' | 'warning' | 'success' | 'security';
  title?: string;
  children: React.ReactNode;
}

export const Callout: React.FC<CalloutProps> = ({ type = 'info', title, children }) => {
  const configs = {
    info: {
      border: 'border-[#FFD026]/30',
      bg: 'bg-[#FFD026]/5',
      text: 'text-[#FFD026]',
      icon: <Info className="w-5 h-5 text-[#FFD026] shrink-0 mt-0.5" />,
      defaultTitle: 'Note',
    },
    warning: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      text: 'text-amber-300',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Warning',
    },
    success: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-300',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Best Practice',
    },
    security: {
      border: 'border-rose-500/30',
      bg: 'bg-rose-500/10',
      text: 'text-rose-300',
      icon: <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
      defaultTitle: 'Security Critical',
    },
  };

  const c = configs[type];

  return (
    <div className={`my-4 p-4 rounded-xl border ${c.border} ${c.bg} flex items-start space-x-3 text-sm`}>
      {c.icon}
      <div className="flex-1 space-y-1">
        <h4 className={`font-semibold ${c.text}`}>{title || c.defaultTitle}</h4>
        <div className="text-[#C9D1D9] leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
