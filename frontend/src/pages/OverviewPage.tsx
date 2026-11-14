import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Mic,
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Transaction, Product } from '../types';

interface OverviewPageProps {
  onOpenVoice: () => void;
  onNavigate: (page: any) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onOpenVoice, onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [sData, tData, pData] = await Promise.all([
        ApiService.getDashboardStats(),
        ApiService.getTransactions(),
        ApiService.getProducts(),
      ]);
      setStats(sData);
      setRecentTxns(tData.slice(0, 5));
      setProducts(pData);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Store Overview
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time shop sales, outstanding khata ledgers, and inventory indicators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenVoice}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black light:bg-neutral-900 light:text-white text-xs font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer"
          >
            <Mic className="w-4 h-4" /> Speak Command
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-900 light:bg-emerald-500/10 text-white light:text-emerald-500 flex items-center justify-center border border-neutral-700 light:border-transparent">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-primary)]">
            ₹{stats.todaySales.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-muted)]">
            {stats.todayTransactions} transactions recorded
          </div>
        </div>

        {/* Total Outstanding Khata */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Outstanding Khata</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-900 light:bg-rose-500/10 text-white light:text-rose-500 flex items-center justify-center border border-neutral-700 light:border-transparent">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white light:text-rose-600">
            ₹{stats.totalOutstandingCredit.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
            <span>Store credit due</span>
            <button
              onClick={() => onNavigate('customers')}
              className="text-white light:text-neutral-900 hover:underline cursor-pointer font-medium"
            >
              View ledger
            </button>
          </div>
        </div>

        {/* Payments Collected Today */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Payments Received</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-900 light:bg-cyan-500/10 text-white light:text-cyan-600 flex items-center justify-center border border-neutral-700 light:border-transparent">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white light:text-cyan-600">
            ₹{stats.paymentsReceivedToday.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-muted)]">
            Cleared ledger payments
          </div>
        </div>

        {/* Products in Store */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Store Products</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-900 light:bg-amber-500/10 text-white light:text-amber-600 flex items-center justify-center border border-neutral-700 light:border-transparent">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white light:text-amber-600">
            {products.length} items
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
            <span>In active catalog</span>
            <button
              onClick={() => onNavigate('products')}
              className="text-white light:text-neutral-900 hover:underline cursor-pointer font-medium"
            >
              Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Recent Store Activity</h3>
            <p className="text-xs text-[var(--text-muted)]">Audit trail of transactions in your shop ledger</p>
          </div>
          <button
            onClick={() => onNavigate('sales')}
            className="text-xs font-semibold text-white light:text-neutral-900 hover:underline cursor-pointer"
          >
            View all transactions →
          </button>
        </div>

        {recentTxns.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-xs">
            No transactions recorded yet. Use Voice Copilot or Customer Ledger to record your first transaction.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[var(--text-muted)] border-b border-[var(--border-color)] uppercase font-semibold">
                <tr>
                  <th className="pb-3">Transaction ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {recentTxns.map((txn) => (
                  <tr key={txn.id} className="hover:bg-neutral-900/40 light:hover:bg-neutral-100 transition-colors">
                    <td className="py-3.5 font-mono text-[var(--text-primary)] font-semibold">{txn.id}</td>
                    <td className="py-3.5 font-bold text-[var(--text-primary)]">{txn.customer_name}</td>
                    <td className="py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          txn.type === 'credit'
                            ? 'bg-neutral-900 light:bg-rose-500/10 text-white light:text-rose-600 border border-neutral-700 light:border-rose-500/30'
                            : 'bg-neutral-900 light:bg-emerald-500/10 text-white light:text-emerald-600 border border-neutral-700 light:border-emerald-500/30'
                        }`}
                      >
                        {txn.type === 'credit' ? 'Udhar (Credit)' : 'Jama (Paid)'}
                      </span>
                    </td>
                    <td
                      className={`py-3.5 text-right font-extrabold ${
                        txn.type === 'credit' ? 'text-white light:text-rose-600' : 'text-white light:text-emerald-600'
                      }`}
                    >
                      {txn.type === 'credit' ? '-' : '+'}₹{txn.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
