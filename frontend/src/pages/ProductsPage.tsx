import React, { useEffect, useState } from 'react';
import {
  Package,
  Search,
  Plus,
  X,
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Product } from '../types';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [unit, setUnit] = useState('packet');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await ApiService.getProducts();
    setProducts(data);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newProd = await ApiService.addProduct({
      name,
      price: Number(price),
      unit,
    });
    if (newProd) {
      setProducts((prev) => [newProd, ...prev]);
    }
    setName('');
    setPrice(0);
    setShowAddModal(false);
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Products & Inventory Catalog
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real products and stock items saved in your store database.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black light:bg-neutral-900 light:text-white text-xs font-bold shadow-sm hover:opacity-90 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Product
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search store inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-neutral-900/50 light:bg-neutral-100 border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-white light:focus:border-black"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-card rounded-2xl p-6 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)] text-xs">
            No products found in this store. Add your first product above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[var(--text-muted)] border-b border-[var(--border-color)] uppercase font-semibold">
                <tr>
                  <th className="pb-3">Product Name</th>
                  <th className="pb-3 text-right">Selling Price</th>
                  <th className="pb-3 text-center">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filtered.map((prod) => (
                  <tr key={prod.id} className="hover:bg-neutral-900/40 light:hover:bg-neutral-100 transition-colors">
                    <td className="py-3.5 font-bold text-[var(--text-primary)]">{prod.name}</td>
                    <td className="py-3.5 text-right font-black text-[var(--text-primary)]">
                      ₹{prod.price}
                    </td>
                    <td className="py-3.5 text-center text-[var(--text-secondary)] font-medium">
                      {prod.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl glass-panel-elevated p-6 space-y-4 border border-[var(--border-color)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Add New Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parle-G 100g"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-neutral-900/60 light:bg-neutral-100 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-white light:focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={price || ''}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-neutral-900/60 light:bg-neutral-100 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-white light:focus:border-black"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--text-muted)] mb-1 uppercase">Unit Type</label>
                  <input
                    type="text"
                    required
                    placeholder="packet, kg, pouch"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-neutral-900/60 light:bg-neutral-100 border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-white light:focus:border-black"
                  />
                </div>
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
                  className="px-4 py-2 rounded-xl bg-white text-black light:bg-neutral-900 light:text-white font-bold cursor-pointer hover:opacity-90 shadow-sm"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
