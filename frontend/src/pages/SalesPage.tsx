import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Download,
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Transaction } from '../types';

export const SalesPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'payment'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const data = await ApiService.getTransactions();
    setTransactions(data);
  };

  const filtered = transactions.filter((t) => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesSearch =
      t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Sales & Ledger Transactions
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Complete transaction records saved in your shop ledger.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer name or transaction ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-900/50 light:bg-neutral-100 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-white light:focus:border-black"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'credit', 'payment'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                filterType === t
                  ? 'bg-neutral-900 light:bg-neutral-200 text-white light:text-black border border-neutral-700 light:border-neutral-400'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
              }`}
            >
              {t === 'all' ? 'All Transactions' : t === 'credit' ? 'Udhar (Credit)' : 'Jama (Payment)'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="glass-card rounded-2xl p-6 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)] text-xs">
            No transactions found. Record your first transaction using Voice Copilot or Customer Ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[var(--text-muted)] border-b border-[var(--border-color)] uppercase font-semibold">
                <tr>
                  <th className="pb-3">Transaction ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-900/40 light:hover:bg-neutral-100 transition-colors">
                    <td className="py-3.5 font-mono text-[var(--text-primary)] font-bold">{t.id}</td>
                    <td className="py-3.5 font-bold text-[var(--text-primary)]">{t.customer_name}</td>
                    <td className="py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          t.type === 'credit'
                            ? 'bg-neutral-900 light:bg-rose-500/10 text-white light:text-rose-600 border border-neutral-700 light:border-rose-500/30'
                            : 'bg-neutral-900 light:bg-emerald-500/10 text-white light:text-emerald-600 border border-neutral-700 light:border-emerald-500/30'
                        }`}
                      >
                        {t.type === 'credit' ? 'Credit Issued' : 'Payment Received'}
                      </span>
                    </td>
                    <td
                      className={`py-3.5 text-right font-black ${
                        t.type === 'credit' ? 'text-white light:text-rose-600' : 'text-white light:text-emerald-600'
                      }`}
                    >
                      {t.type === 'credit' ? '-' : '+'}₹{t.amount.toLocaleString('en-IN')}
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
