import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  PieChart,
  Users,
  Package,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Business Reports & Analytics
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Analyze profit margins, sales velocity, customer credit recovery cycles, and top-selling FMCG products.
          </p>
        </div>

        <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-[var(--text-primary)] hover:bg-white/10 cursor-pointer">
          <Download className="w-4 h-4 text-cyan-400" /> Export Full Audit Report (PDF/Excel)
        </button>
      </div>

      {/* Analytics Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Monthly Gross Volume</span>
          <p className="text-2xl font-black text-[var(--text-primary)] mt-2">₹4,82,500</p>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">+8.5% compared to October</span>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Credit Recovery Rate</span>
          <p className="text-2xl font-black text-cyan-400 mt-2">92.4%</p>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Average recovery cycle: 11 days</span>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Inventory Turnover Ratio</span>
          <p className="text-2xl font-black text-purple-400 mt-2">4.8x</p>
          <span className="text-[11px] text-[var(--text-muted)] mt-1 block">Fastest: Atta & Edible Oils</span>
        </div>
      </div>

      {/* Category Performance Breakdown */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Product Category Revenue Contribution</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-[var(--text-secondary)]">Grains, Flour & Staples (42%)</span>
              <span className="text-[var(--text-primary)] font-mono">₹2,02,650</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-cyan-400" style={{ width: '42%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-[var(--text-secondary)]">Edible Oils & Ghee (28%)</span>
              <span className="text-[var(--text-primary)] font-mono">₹1,35,100</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-purple-500" style={{ width: '28%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-[var(--text-secondary)]">Dairy, Butter & Milk (18%)</span>
              <span className="text-[var(--text-primary)] font-mono">₹86,850</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: '18%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-[var(--text-secondary)]">Instant Foods & Snacks (12%)</span>
              <span className="text-[var(--text-primary)] font-mono">₹57,900</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-amber-400" style={{ width: '12%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
