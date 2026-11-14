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
          <p className="text-xs font-medium text-[var(--text-muted)] mt-1">
            Real-time shop sales, outstanding khata ledgers, and inventory indicators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenVoice}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#18181B] hover:bg-black dark:bg-[#FFD026] dark:hover:bg-[#F6B511] text-white dark:text-black text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Mic className="w-4 h-4 text-[#FFD026] dark:text-black" /> Speak Command
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Store Transactions */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Store Activity</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)]">
            {stats.todayTransactions} Logged
          </div>
          <div className="mt-2 text-[11px] font-medium text-[var(--text-muted)]">
            Khata credit & payment entries
          </div>
        </div>

        {/* Total Outstanding Khata */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Outstanding Khata</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            ₹{stats.totalOutstandingCredit.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
            <span>Store credit due</span>
            <button
              onClick={() => onNavigate('customers')}
              className="text-[var(--text-primary)] font-bold hover:underline cursor-pointer"
            >
              View ledger →
            </button>
          </div>
        </div>

        {/* Payments Collected Today */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Payments Received</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{stats.paymentsReceivedToday.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-[11px] font-medium text-[var(--text-muted)]">
            Cleared ledger payments
          </div>
        </div>

        {/* Products in Store */}
        <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-[var(--text-secondary)] mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Store Products</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)]">
            {products.length} items
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-muted)] flex items-center justify-between">
            <span>In active catalog</span>
            <button
              onClick={() => onNavigate('products')}
              className="text-[var(--text-primary)] font-bold hover:underline cursor-pointer"
            >
              Catalog →
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
            className="text-xs font-bold text-[var(--text-primary)] hover:underline cursor-pointer"
          >
            View all transactions →
          </button>
        </div>

        {recentTxns.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-xs">
            No transactions recorded yet. Use Voice Assistant or Customer Ledger to record your first transaction.
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
                  <tr key={txn.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors">
                    <td className="py-3.5 font-mono text-[var(--text-primary)] font-semibold">{txn.id}</td>
                    <td className="py-3.5 font-bold text-[var(--text-primary)]">{txn.customer_name}</td>
                    <td className="py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          txn.type === 'credit'
                            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {txn.type === 'credit' ? 'Udhar (Credit)' : 'Jama (Paid)'}
                      </span>
                    </td>
                    <td
                      className={`py-3.5 text-right font-black ${
                        txn.type === 'credit' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
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
