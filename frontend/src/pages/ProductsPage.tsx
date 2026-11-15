import React, { useEffect, useState } from 'react';
import {
  Package,
  Search,
  Plus,
  X,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Scale,
  IndianRupee,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Product } from '../types';
import { sanitizeErrorMessage, SAFE_MESSAGES } from '../utils/errorHandler';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState<number | ''>('');
  const [lowStockLimit, setLowStockLimit] = useState<number | ''>(5);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getProducts();
      setProducts(data);
    } finally {
      setLoading(false);
    }
  };

  // Enforce Unit strictly characters only (No numbers allowed as requested)
  const handleUnitChange = (val: string) => {
    // Strip all numeric digits, allow English and letter characters and spaces
    const cleanUnit = val.replace(/[0-9]/g, '');
    setUnit(cleanUnit);
    if (val !== cleanUnit) {
      setFormError('Unit must contain characters only (e.g. kg, liter, packet). Numbers are not allowed.');
    } else {
      setFormError(null);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Product name is required.');
      return;
    }

    const cleanUnit = unit.trim().replace(/[0-9]/g, '');
    if (!cleanUnit) {
      setFormError('Unit is required and must contain characters only (e.g. kg, liter).');
      return;
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setFormError('Please enter a valid price per unit.');
      return;
    }

    const numQty = quantity === '' ? 0 : Number(quantity);
    if (isNaN(numQty) || numQty < 0) {
      setFormError('Please enter a valid stock quantity.');
      return;
    }

    try {
      const newProd = await ApiService.addProduct({
        name: name.trim(),
        price: numPrice,
        unit: cleanUnit,
        quantity: numQty,
        low_stock_limit: Number(lowStockLimit) || 5,
      });

      if (newProd) {
        setProducts((prev) => [newProd, ...prev]);
        setName('');
        setQuantity('');
        setPrice('');
        setUnit('kg');
        setLowStockLimit(5);
        setShowAddModal(false);
      }
    } catch (err: any) {
      setFormError(sanitizeErrorMessage(err, SAFE_MESSAGES.PRODUCT_FAILED));
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.unit && p.unit.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Summary Metrics
  const totalStockQuantity = products.reduce((acc, p) => acc + (p.stock || p.quantity || 0), 0);
  const totalStockValuation = products.reduce(
    (acc, p) => acc + (p.total_value || (p.stock || 0) * (p.price || 0)),
    0
  );
  const lowStockCount = products.filter(
    (p) => (p.stock || p.quantity || 0) <= (p.min_stock_alert || 5) && (p.stock || p.quantity || 0) > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Products &amp; Inventory
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage store inventory, stock quantities, units, and rates.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#18181B] hover:bg-black dark:bg-[#FFD026] text-white dark:text-black text-xs font-bold shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#FFD026] dark:text-black" /> Add New Inventory Product
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFD026]/10 text-[#FFD026] flex items-center justify-center shrink-0 border border-[#FFD026]/20">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Total Products</p>
            <p className="text-lg font-black text-[var(--text-primary)] mt-0.5">{products.length}</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Total Stock Items</p>
            <p className="text-lg font-black text-[var(--text-primary)] mt-0.5">{totalStockQuantity}</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Inventory Valuation</p>
            <p className="text-lg font-black text-emerald-500 mt-0.5">
              ₹{totalStockValuation.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Low Stock Alerts</p>
            <p className="text-lg font-black text-amber-500 mt-0.5">{lowStockCount}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search products by name or unit (e.g. Rice, kg, Sugar)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
          />
        </div>
      </div>

      {/* Products & Inventory Table */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-[var(--text-muted)] text-xs">
            Loading products...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)] text-xs">
            {searchQuery ? 'No products found matching your search.' : 'No products found. Click "Add New Inventory Product" to add stock.'}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[580px] text-left text-xs border-collapse">
              <thead className="text-[var(--text-muted)] border-b border-[var(--border-color)] uppercase font-semibold text-[11px]">
                <tr>
                  <th className="pb-3">Product Name</th>
                  <th className="pb-3 text-right">Quantity</th>
                  <th className="pb-3 text-center">Unit</th>
                  <th className="pb-3 text-right">Price / Unit</th>
                  <th className="pb-3 text-right">Total Stock Value</th>
                  <th className="pb-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filtered.map((prod) => {
                  const qty = prod.stock ?? prod.quantity ?? 0;
                  const unitPrice = prod.price || 0;
                  const total = prod.total_value ?? Math.round(qty * unitPrice * 100) / 100;
                  const lowLimit = prod.min_stock_alert || 5;

                  return (
                    <tr key={prod.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors">
                      {/* Name */}
                      <td className="py-3.5 font-bold text-[var(--text-primary)]">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center font-mono text-[11px] text-[#FFD026]">
                            📦
                          </span>
                          <span>{prod.name}</span>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 text-right font-black text-sm text-[var(--text-primary)]">
                        {qty}
                      </td>

                      {/* Unit (Characters only) */}
                      <td className="py-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-md bg-white/5 border border-[var(--border-color)] text-[var(--text-secondary)] font-mono text-[11px] font-bold">
                          {prod.unit}
                        </span>
                      </td>

                      {/* Per Unit Price */}
                      <td className="py-3.5 text-right font-bold text-[var(--text-primary)]">
                        <span className="text-[#FFD026] font-black">₹{unitPrice}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-normal ml-1">/ {prod.unit}</span>
                      </td>

                      {/* Total Value (Quantity x Price) */}
                      <td className="py-3.5 text-right font-black text-emerald-500 text-sm">
                        ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 text-center">
                        {qty <= 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            Out of Stock
                          </span>
                        ) : qty <= lowLimit ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Low Stock ({qty})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl glass-panel-elevated p-6 space-y-4 border border-[var(--border-color)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="text-base font-black text-[var(--text-primary)]">Add New Inventory Product</h3>
                <p className="text-[10px] text-[var(--text-muted)]">Save product and stock records</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddProduct} className="space-y-4 text-xs">
              {/* Product Name */}
              <div>
                <label className="block font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider text-[11px]">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice, Sugar, Mustard Oil"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
                />
              </div>

              {/* Quantity & Unit Row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Quantity */}
                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider text-[11px]">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 50"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
                  />
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">Numeric quantity</span>
                </div>

                {/* Unit (Characters only) */}
                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider text-[11px]">
                    Unit (Letters only) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="kg, liter, gm, packet"
                    value={unit}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
                  />
                  <span className="text-[10px] text-[#FFD026] mt-0.5 block">Characters only (no numbers)</span>
                </div>
              </div>

              {/* Quick Unit Suggestion Chips */}
              <div className="flex gap-1.5 flex-wrap">
                {['kg', 'gm', 'liter', 'ml', 'packet', 'piece', 'box', 'bag'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => handleUnitChange(u)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      unit === u
                        ? 'bg-[#FFD026] text-black border-[#FFD026]'
                        : 'bg-white/5 border-[var(--border-color)] text-[var(--text-muted)] hover:text-white'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>

              {/* Price per unit & Low stock threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider text-[11px]">
                    Price per Unit (Rate per {unit || 'unit'}) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-[var(--text-muted)] font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 30"
                      value={price}
                      onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] font-mono font-bold focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">₹ per {unit || 'unit'}</span>
                </div>

                <div>
                  <label className="block font-bold text-[var(--text-muted)] mb-1 uppercase tracking-wider text-[11px]">
                    Low Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    value={lowStockLimit}
                    onChange={(e) => setLowStockLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-black dark:focus:border-[#FFD026]"
                  />
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">Alert when stock falls below</span>
                </div>
              </div>

              {/* Live Total Value Calculation Card */}
              {Number(quantity) > 0 && Number(price) > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <div className="text-emerald-400 font-semibold">
                    <span>Total Stock Value:</span>
                    <span className="block text-[10px] text-[var(--text-muted)]">
                      {quantity} {unit} × ₹{price} / {unit}
                    </span>
                  </div>
                  <div className="text-base font-black text-emerald-400">
                    ₹{(Number(quantity) * Number(price)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#18181B] hover:bg-black dark:bg-[#FFD026] text-white dark:text-black font-extrabold cursor-pointer shadow-sm transition-all"
                >
                  Save to Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
