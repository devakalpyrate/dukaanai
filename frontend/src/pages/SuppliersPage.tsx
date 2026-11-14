import React, { useEffect, useState } from 'react';
import {
  Truck,
  Plus,
  Phone,
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Supplier, PurchaseOrder } from '../types';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [sData, oData] = await Promise.all([
      ApiService.getSuppliers(),
      ApiService.getOrders(),
    ]);
    setSuppliers(sData);
    setOrders(oData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Suppliers & Purchase Orders
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Maintain wholesale distributor relationships and stock procurement cycles.
          </p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-12 text-center text-[var(--text-muted)] text-xs">
        <Truck className="w-12 h-12 mx-auto mb-3 opacity-30 text-cyan-400" />
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Supplier Directory Empty</h3>
        <p className="mt-1 max-w-sm mx-auto">
          No external wholesalers or purchase orders registered yet. New distributors will be listed here.
        </p>
      </div>
    </div>
  );
};
