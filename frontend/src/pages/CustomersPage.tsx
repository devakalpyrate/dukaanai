import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  X,
  History,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Customer, Transaction } from '../types';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTxns, setCustomerTxns] = useState<Transaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [showTxModal, setShowTxModal] = useState<'credit' | 'payment' | null>(null);
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const data = await ApiService.getCustomers();
    setCustomers(data);
    if (data.length > 0) {
      const target = selectedCustomer ? data.find((c) => c.id === selectedCustomer.id) || data[0] : data[0];
      setSelectedCustomer(target);
      loadTransactions(target.id);
    }
  };

  const loadTransactions = async (customerId: number) => {
    setLoadingTxns(true);
    try {
      const txs = await ApiService.getCustomerTransactions(customerId);
      setCustomerTxns(txs);
    } finally {
      setLoadingTxns(false);
    }
  };

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    loadTransactions(c.id);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const added = await ApiService.addCustomer({ name: newName, phone: newPhone });
    if (added) {
      await loadCustomers();
      setSelectedCustomer(added);
      setCustomerTxns([]);
    }
    setNewName('');
    setNewPhone('');
    setShowAddModal(false);
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !txAmount || !showTxModal) return;
    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) return;

    setTxLoading(true);
    try {
      const ok = await ApiService.recordTransaction({
        customer_name: selectedCustomer.name,
        amount: amt,
        type: showTxModal,
        description: txNote || (showTxModal === 'credit' ? 'Store credit' : 'Cash settlement'),
      });
      if (ok) {
        await loadCustomers();
        await loadTransactions(selectedCustomer.id);
        setShowTxModal(null);
        setTxAmount('');
        setTxNote('');
      }
    } finally {
      setTxLoading(false);
    }
  };

  const filtered = customers.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Customers & Khata Ledger
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real customer records, outstanding balances, and store ledger history.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F6B511] text-[#09090B] hover:bg-[#FFD04A] text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Customer
        </button>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List Column */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-4 flex flex-col gap-3 min-h-[500px]">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search store customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-900/50 light:bg-neutral-100 border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#F6B511]"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)] text-xs">
                No customers found. Add your first customer or use Voice Copilot.
              </div>
            ) : (
              filtered.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                const hasBalance = (c.balance || 0) > 0;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-neutral-900 border-[#F6B511] shadow-sm'
                        : 'bg-neutral-900/30 border-transparent hover:border-[var(--border-color)] hover:bg-neutral-900/60'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{c.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                          hasBalance
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {hasBalance ? `₹${(c.balance || 0).toLocaleString('en-IN')} Udhaar` : 'Cleared'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Customer Detailed Ledger */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col justify-between min-h-[500px]">
          {selectedCustomer ? (
            <div className="space-y-6 flex-1 flex flex-col">
              {/* Customer Header & Quick Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#F6B511] text-[#09090B] flex items-center justify-center font-black text-xl shadow-[0_0_15px_rgba(246,181,17,0.3)]">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[var(--text-primary)]">{selectedCustomer.name}</h3>
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                      <span>Phone: {selectedCustomer.phone || 'N/A'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTxModal('credit')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> + Add Udhaar
                  </button>
                  <button
                    onClick={() => setShowTxModal('payment')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" /> ✓ Record Payment
                  </button>
                </div>
              </div>

              {/* 3 Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-neutral-900/60 border border-[var(--border-color)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Outstanding Udhaar
                  </span>
                  <p className="text-2xl font-black text-rose-400 mt-1">
                    ₹{(selectedCustomer.balance || 0).toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-[var(--text-muted)]">Due to shop</span>
                </div>

                <div className="p-4 rounded-xl bg-neutral-900/60 border border-[var(--border-color)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Total Credit Given
                  </span>
                  <p className="text-xl font-bold text-[var(--text-primary)] mt-1">
                    ₹{(selectedCustomer.total_credit || 0).toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-[var(--text-muted)]">Lifetime credit</span>
                </div>

                <div className="p-4 rounded-xl bg-neutral-900/60 border border-[var(--border-color)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Total Paid Back
                  </span>
                  <p className="text-xl font-bold text-emerald-400 mt-1">
                    ₹{(selectedCustomer.total_paid || 0).toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-[var(--text-muted)]">Payments received</span>
                </div>
              </div>

              {/* Transaction Ledger Table */}
              <div className="flex-1 flex flex-col min-h-0">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#F6B511]" /> Customer Khata Ledger
                  </span>
                  <span className="text-[10px] font-normal text-[var(--text-muted)]">
                    {customerTxns.length} records found
                  </span>
                </h4>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[280px]">
                  {loadingTxns ? (
                    <div className="p-8 text-center text-xs text-[var(--text-muted)] animate-pulse">
                      Loading customer ledger transactions...
                    </div>
                  ) : customerTxns.length === 0 ? (
                    <div className="p-8 rounded-xl border border-[var(--border-color)] text-center text-xs text-[var(--text-muted)] bg-neutral-900/30">
                      No transactions recorded yet for {selectedCustomer.name}.
                      <br />
                      Speak <em>"{selectedCustomer.name} ka 2000 rupaye udhaar likh do"</em> in Voice Assistant to record immediately.
                    </div>
                  ) : (
                    customerTxns.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl bg-neutral-900/40 border border-[var(--border-color)] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              tx.type === 'credit'
                                ? 'bg-rose-500/15 text-rose-400'
                                : 'bg-emerald-500/15 text-emerald-400'
                            }`}
                          >
                            {tx.type === 'credit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-bold text-[var(--text-primary)]">
                              {tx.type === 'credit' ? 'Udhaar (Credit)' : 'Cash Payment Received'}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)]">
                              {tx.timestamp} • {tx.items || 'Standard entry'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-sm font-black ${
                              tx.type === 'credit' ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[350px] text-center text-[var(--text-muted)]">
              <Users className="w-12 h-12 mb-2 text-neutral-500" />
              <p className="text-sm font-semibold">Select a customer from the left to view their private khata ledger.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl glass-panel-elevated p-6 space-y-4 border border-[var(--border-color)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Add New Customer</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Customer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Subham Dash"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-900/60 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#F6B511]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Phone Number</label>
                <input
                  type="tel"
                  placeholder="Optional mobile number"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-900/60 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#F6B511]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-[var(--text-muted)] hover:bg-white/5 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#F6B511] text-[#09090B] font-bold cursor-pointer hover:bg-[#FFD04A] shadow-sm"
                >
                  Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Quick Transaction Modal (Credit or Payment) */}
      {showTxModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl glass-panel-elevated p-6 space-y-4 border border-[var(--border-color)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                {showTxModal === 'credit' ? `Add Udhaar for ${selectedCustomer.name}` : `Record Payment from ${selectedCustomer.name}`}
              </h3>
              <button
                onClick={() => setShowTxModal(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 2000"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-900/60 border border-[var(--border-color)] text-[var(--text-primary)] text-base font-bold focus:outline-none focus:border-[#F6B511]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Notes / Item Description</label>
                <input
                  type="text"
                  placeholder="e.g. Rice, Dal, or Cash payment"
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-900/60 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[#F6B511]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTxModal(null)}
                  className="px-4 py-2 rounded-xl text-[var(--text-muted)] hover:bg-white/5 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={txLoading}
                  className={`px-4 py-2 rounded-xl font-bold cursor-pointer shadow-sm text-[#09090B] ${
                    showTxModal === 'credit' ? 'bg-rose-400 hover:bg-rose-300' : 'bg-emerald-400 hover:bg-emerald-300'
                  }`}
                >
                  {txLoading ? 'Saving...' : showTxModal === 'credit' ? 'Save Udhaar' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
