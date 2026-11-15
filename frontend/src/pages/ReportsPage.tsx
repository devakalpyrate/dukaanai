import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Users,
  Package,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Transaction, Customer, Product } from '../types';

export const ReportsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRealStoreData();
  }, []);

  const loadRealStoreData = async () => {
    setLoading(true);
    try {
      const [txs, custs, prods] = await Promise.all([
        ApiService.getTransactions(),
        ApiService.getCustomers(),
        ApiService.getProducts(),
      ]);
      setTransactions(txs);
      setCustomers(custs);
      setProducts(prods);
    } finally {
      setLoading(false);
    }
  };

  const totalCredit = transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalPaid = transactions
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const outstandingKhata = customers.reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

  const categoryCounts = products.reduce((acc, p) => {
    const cat = p.category || 'General';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Store Reports & Ledger Audit
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real data aggregated from your store transactions, khata balances, and product inventory.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#18181B] hover:bg-black dark:bg-[#FFD026] text-white dark:text-black text-xs font-bold cursor-pointer shadow-sm"
        >
          <Download className="w-4 h-4 text-[#FFD026] dark:text-black" /> Print / Export Ledger
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--text-muted)] animate-pulse">
          Loading store ledger and inventory reports...
        </div>
      ) : (
        <>
          {/* Real Analytics Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-5 border border-[var(--border-color)]">
              <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Udhaar Given</span>
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-black text-rose-400">
                ₹{totalCredit.toLocaleString('en-IN')}
              </p>
              <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                {transactions.filter((t) => t.type === 'credit').length} credit entries
              </span>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-[var(--border-color)]">
              <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Payments (Jama)</span>
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400">
                ₹{totalPaid.toLocaleString('en-IN')}
              </p>
              <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                {transactions.filter((t) => t.type === 'payment').length} payment entries
              </span>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-[var(--border-color)]">
              <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Net Outstanding Due</span>
                <CreditCard className="w-4 h-4 text-[#F6B511]" />
              </div>
              <p className="text-2xl font-black text-[var(--text-primary)]">
                ₹{outstandingKhata.toLocaleString('en-IN')}
              </p>
              <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                Across {customers.length} registered customers
              </span>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-[var(--border-color)]">
              <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Active Inventory</span>
                <Package className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-black text-[var(--text-primary)]">
                {products.length} Items
              </p>
              <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                {Object.keys(categoryCounts).length} product categories
              </span>
            </div>
          </div>

          {/* Real Inventory Distribution & Ledger Audit Trail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Category Breakdown */}
            <div className="glass-card rounded-2xl p-6 border border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" /> Real Product Categories
              </h3>
              {products.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No products added to catalog yet. Add products in Products & Inventory.
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(categoryCounts).map(([cat, count]) => {
                    const pct = Math.round((count / products.length) * 100);
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-[var(--text-secondary)]">{cat} ({pct}%)</span>
                          <span className="text-[var(--text-primary)] font-mono">{count} items</span>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Store Audit Summary */}
            <div className="glass-card rounded-2xl p-6 border border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#F6B511]" /> Audit Activity Overview
              </h3>
              {transactions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No transactions recorded yet.
                  <br />
                  Speak or record transactions in Voice Assistant to see real audit trail.
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[260px]">
                  {transactions.slice(0, 6).map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-[var(--border-color)] flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{tx.customer_name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {tx.timestamp} • {tx.type === 'credit' ? 'Udhaar' : 'Jama'}
                        </p>
                      </div>
                      <span
                        className={`font-black ${
                          tx.type === 'credit' ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {tx.type === 'credit' ? '+' : '-'}₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
