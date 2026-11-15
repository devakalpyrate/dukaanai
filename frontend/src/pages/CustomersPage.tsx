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
  QrCode,
  MessageSquare,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Customer, Transaction } from '../types';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTxns, setCustomerTxns] = useState<Transaction[]>([]);
  const [loadingTxns, setLoadingTxns] = useState(false);

  const [storeUpiId, setStoreUpiId] = useState('');
  const [storeShopName, setStoreShopName] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [showTxModal, setShowTxModal] = useState<'credit' | 'payment' | null>(null);
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
    const fetchSettings = async () => {
      const token = localStorage.getItem('dukaanai_token');
      if (!token) return;
      try {
        const res = await fetch('/api/settings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.upi_id) setStoreUpiId(data.settings.upi_id);
          if (data.settings?.shop_name) setStoreShopName(data.settings.shop_name);
        }
      } catch {}
    };
    fetchSettings();
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

  const handleSendWhatsApp = (c?: Customer) => {
    const target = c || selectedCustomer;
    if (!target) return;

    if (!storeUpiId) {
      alert('Please configure your Merchant UPI ID in Settings -> Payment & UPI Details before generating or sending payment links.');
      return;
    }

    let phone = target.phone && target.phone !== 'N/A' ? target.phone.replace(/[^0-9]/g, '') : '';
    if (!phone || phone.length < 10) {
      const promptPhone = window.prompt(
        `Enter 10-digit WhatsApp mobile number for ${target.name}:`,
        phone || ''
      );
      if (!promptPhone) return;
      phone = promptPhone.replace(/[^0-9]/g, '');
      if (phone.length < 10) {
        alert('Please enter a valid 10-digit mobile number.');
        return;
      }
    }

    const cleanPhone = phone.startsWith('91') && phone.length > 10 ? phone : `91${phone.slice(-10)}`;
    const balance = target.balance || 0;
    const displayName = storeShopName || 'Store';
    const upiUri = `upi://pay?pa=${encodeURIComponent(storeUpiId)}&pn=${encodeURIComponent(displayName)}&am=${balance}&cu=INR&tn=KhataPayment`;
    const qrImageUrl = `${window.location.origin}/api/payments/qr-code?data=${encodeURIComponent(upiUri)}`;

    const message = 
`*नमस्ते ${target.name} जी,* 🙏

*${displayName}* से आपका खाता विवरण:
💰 *कुल बकाया उधार:* *₹${balance.toLocaleString('en-IN')}*

📲 *सीधे UPI (Google Pay / PhonePe / Paytm) से भुगतान लिंक:*
${upiUri}

🖼️ *बिल का QR कोड देखकर स्कैन करें:*
${qrImageUrl}

_UPI ID:_ \`${storeUpiId}\`

धन्यवाद! 🙏
*${displayName}*`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const filtered = customers.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
    );
  });

  return (
    <div className="h-full flex flex-col min-h-0 gap-4 overflow-hidden select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Customers & Khata Ledger
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Real customer records, outstanding balances, and store ledger history.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#18181B] hover:bg-black dark:bg-[#FFD026] text-white dark:text-black text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-[#FFD026] dark:text-black" /> Add New Customer
        </button>
      </div>

      {/* Main Two-Column View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 overflow-hidden">
        {/* Customer List Column */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-4 flex flex-col gap-3 h-full min-h-0 overflow-hidden">
          <div className="relative shrink-0">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search store customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 min-h-0">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)] text-xs">
                No customers found. Add your first customer or use Voice Assistant.
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
                        ? 'bg-[#FFD026] text-black border-[#E6B800] shadow-sm font-bold'
                        : 'bg-black/[0.02] dark:bg-white/5 border-[var(--border-color)] hover:border-black/30 dark:hover:border-white/30'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className={`text-xs truncate ${isSelected ? 'text-black font-extrabold' : 'text-[var(--text-primary)] font-bold'}`}>{c.name}</p>
                      <p className={`text-[11px] flex items-center gap-1 mt-0.5 ${isSelected ? 'text-neutral-800 font-medium' : 'text-[var(--text-muted)]'}`}>
                        <Phone className="w-3 h-3" /> {c.phone}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      {hasBalance && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendWhatsApp(c);
                          }}
                          title={`Send WhatsApp bill of ₹${(c.balance || 0).toLocaleString('en-IN')} to ${c.name}`}
                          className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span
                        className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                          hasBalance
                            ? isSelected ? 'bg-rose-600 text-white' : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                            : isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
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
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 flex flex-col h-full min-h-0 overflow-hidden">
          {selectedCustomer ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Customer Header & Quick Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#FFD026] text-black flex items-center justify-center font-black text-xl border border-[#E6B800] shadow-sm shrink-0">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)]">{selectedCustomer.name}</h3>
                    <p className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                      <span>Phone: {selectedCustomer.phone || 'N/A'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowQrModal(true)}
                    title="Show live UPI QR Code for instant scanning"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Show QR
                  </button>

                  <button
                    onClick={() => handleSendWhatsApp()}
                    title="Send instant WhatsApp Khata bill and UPI QR link directly to customer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Send on WhatsApp
                  </button>

                  <button
                    onClick={() => setShowTxModal('credit')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 text-xs font-bold transition-all cursor-pointer active:scale-95"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" /> + Add Udhaar
                  </button>

                  <button
                    onClick={() => setShowTxModal('payment')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 text-xs font-bold transition-all cursor-pointer active:scale-95"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" /> ✓ Record Payment
                  </button>
                </div>
              </div>

              {/* 3 Summary KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3 shrink-0">
                <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-[var(--border-color)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Outstanding Udhaar
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    ₹{(selectedCustomer.balance || 0).toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">Due to shop</span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-[var(--border-color)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Total Credit Given
                  </span>
                  <p className="text-lg sm:text-xl font-black text-[var(--text-primary)] mt-1">
                    ₹{(selectedCustomer.total_credit || 0).toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">Lifetime credit</span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-[var(--border-color)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Total Paid Back
                  </span>
                  <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    ₹{(selectedCustomer.total_paid || 0).toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">Payments received</span>
                </div>
              </div>

              {/* Transaction Ledger Table */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2 flex items-center justify-between shrink-0">
                  <span className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#FFD026]" /> Customer Khata Ledger
                  </span>
                  <span className="text-[10px] font-normal text-[var(--text-muted)]">
                    {customerTxns.length} records found
                  </span>
                </h4>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 min-h-0">
                  {loadingTxns ? (
                    <div className="p-8 text-center text-xs text-[var(--text-muted)] animate-pulse">
                      Loading customer ledger transactions...
                    </div>
                  ) : customerTxns.length === 0 ? (
                    <div className="p-8 rounded-xl border border-[var(--border-color)] text-center text-xs text-[var(--text-muted)] bg-black/[0.02] dark:bg-white/5">
                      No transactions recorded yet for {selectedCustomer.name}.
                      <br />
                      Speak <em>"{selectedCustomer.name} ka 2000 rupaye udhaar likh do"</em> in Voice Assistant to record immediately.
                    </div>
                  ) : (
                    customerTxns.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-[var(--border-color)] flex items-center justify-between text-xs"
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
                  placeholder="e.g. Customer Name"
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

      {/* Live UPI QR Code Modal */}
      {showQrModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-card rounded-3xl p-6 w-full max-w-sm border border-[var(--border-color)] bg-[#12161F] text-center shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-xl bg-[#FFD026] text-black font-extrabold flex items-center justify-center text-sm">
                  द
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Instant UPI QR Bill</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">{storeShopName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {selectedCustomer.name}'s Outstanding Bill
              </span>
              <p className="text-3xl font-black text-[#FFD026] mt-0.5">
                ₹{(selectedCustomer.balance || 0).toLocaleString('en-IN')}
              </p>
            </div>

            {/* Scannable QR Code */}
            {storeUpiId ? (
              <>
                <div className="p-3 bg-white rounded-2xl mx-auto w-fit shadow-inner">
                  <img
                    src={`/api/payments/qr-code?data=${encodeURIComponent(
                      `upi://pay?pa=${storeUpiId}&pn=${encodeURIComponent(storeShopName || 'Store')}&am=${selectedCustomer.balance || 0}&cu=INR&tn=KhataPayment`
                    )}`}
                    alt="Customer UPI QR Code"
                    className="w-52 h-52 block mx-auto rounded-lg"
                  />
                </div>

                <div className="text-[11px] text-[var(--text-muted)] space-y-1 bg-white/5 p-2.5 rounded-xl border border-white/5 font-mono">
                  <div>UPI ID: <span className="text-white font-bold">{storeUpiId}</span></div>
                  <div className="text-[10px] text-emerald-400">Scan using GPay &bull; PhonePe &bull; Paytm &bull; BHIM</div>
                </div>
              </>
            ) : (
              <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-2">
                <p className="font-bold">No Merchant UPI ID Configured</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Please go to Settings &rarr; Payment &amp; UPI Details to enter your store UPI ID. It will be saved permanently to your store profile.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleSendWhatsApp()}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <MessageSquare className="w-4 h-4" /> Send WhatsApp
              </button>
              <button
                onClick={() => {
                  const upiUri = `upi://pay?pa=${storeUpiId}&pn=${encodeURIComponent(storeShopName)}&am=${selectedCustomer.balance || 0}&cu=INR&tn=KhataPayment`;
                  navigator.clipboard.writeText(upiUri);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all cursor-pointer active:scale-95 border border-white/10"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy UPI Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
