import React, { useState } from 'react';
import { Database, Store, Users, Receipt, Package, Truck, QrCode, ArrowRight } from 'lucide-react';

interface BusinessDomain {
  id: string;
  title: string;
  icon: React.ReactNode;
  subtitle: string;
  description: string;
  connectsTo: string[];
}

const BUSINESS_DOMAINS: BusinessDomain[] = [
  {
    id: 'store',
    title: 'Store & Merchant Identity',
    icon: <Store className="w-5 h-5 text-[#FFD026]" />,
    subtitle: 'Tenant Hub',
    description: 'Central multi-tenant container managing merchant profile, GSTIN, and settlement VPA.',
    connectsTo: ['Customer Khata', 'Product Catalog', 'Supplier Directory', 'Ledger Transactions'],
  },
  {
    id: 'customer',
    title: 'Customer Khata',
    icon: <Users className="w-5 h-5 text-emerald-400" />,
    subtitle: 'Credit & Debit Accounts',
    description: 'Digital khata ledger directory recording customer contact cards and net balances.',
    connectsTo: ['Ledger Transactions', 'Billing & Payments'],
  },
  {
    id: 'transactions',
    title: 'Ledger Transactions',
    icon: <Receipt className="w-5 h-5 text-amber-400" />,
    subtitle: 'Dual-Entry Entries',
    description: 'Audited financial transaction stream tracking debit (jama) and credit (udhaar).',
    connectsTo: ['Customer Khata', 'Billing & Payments'],
  },
  {
    id: 'products',
    title: 'Product Catalog',
    icon: <Package className="w-5 h-5 text-blue-400" />,
    subtitle: 'Merchandise Master',
    description: 'Store inventory items, price benchmarks, and packaging unit definitions.',
    connectsTo: ['Inventory Balance', 'Supplier Directory'],
  },
  {
    id: 'suppliers',
    title: 'Supplier Directory',
    icon: <Truck className="w-5 h-5 text-purple-400" />,
    subtitle: 'Procurement Channels',
    description: 'Distributor networks and supply-chain partners organized by merchandise category.',
    connectsTo: ['Product Catalog', 'Store & Merchant Identity'],
  },
  {
    id: 'billing',
    title: 'Billing & Payments',
    icon: <QrCode className="w-5 h-5 text-rose-400" />,
    subtitle: 'Settlement Engine',
    description: 'Dynamic NPCI UPI deep links and printable invoice statements.',
    connectsTo: ['Ledger Transactions', 'Store & Merchant Identity'],
  },
];

export const ERDiagramView: React.FC = () => {
  const [activeDomain, setActiveDomain] = useState<string>('store');

  const selected = BUSINESS_DOMAINS.find((d) => d.id === activeDomain) || BUSINESS_DOMAINS[0];

  return (
    <div className="my-6 rounded-2xl border border-[#1E232B] bg-[#0E1217] p-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1E232B] gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#FFD026]/10 border border-[#FFD026]/30 flex items-center justify-center text-[#FFD026]">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Entity-Relationship Diagram
              <span className="w-2 h-2 rounded-full bg-[#FFD026]" />
            </h3>
            <p className="text-xs text-[#8B949E]">High-Level Conceptual Business Entity Map</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded bg-[#161B22] text-[#FFD026] text-xs font-mono font-semibold border border-[#1E232B] w-fit">
          Conceptual Model
        </span>
      </div>

      {/* Conceptual Visual Entity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 my-5">
        {BUSINESS_DOMAINS.map((domain) => {
          const isSelected = domain.id === activeDomain;
          return (
            <div
              key={domain.id}
              onClick={() => setActiveDomain(domain.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'border-[#FFD026] bg-[#FFD026]/10 shadow-lg scale-[1.01]'
                  : 'border-[#1E232B] bg-[#12161F] hover:border-[#30363D] hover:bg-[#161B22]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-[#090B0E] border border-[#1E232B]">
                  {domain.icon}
                </div>
                <span className="text-[10px] font-mono font-bold text-[#8B949E] uppercase tracking-wider">
                  {domain.subtitle}
                </span>
              </div>
              <h4 className={`text-sm font-bold ${isSelected ? 'text-[#FFD026]' : 'text-white'}`}>
                {domain.title}
              </h4>
              <p className="text-xs text-[#8B949E] mt-1.5 line-clamp-2 leading-relaxed">
                {domain.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Active Domain Connection Overview */}
      <div className="rounded-xl border border-[#1E232B] bg-[#12161F] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#8B949E]">Active Domain:</span>
            <span className="text-xs font-bold text-[#FFD026]">{selected.title}</span>
          </div>
          <p className="text-xs text-[#C9D1D9]">{selected.description}</p>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="text-[#8B949E] text-[11px] font-semibold">Integrates with:</span>
          {selected.connectsTo.map((target, idx) => (
            <span
              key={idx}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#090B0E] border border-[#1E232B] text-white font-medium text-[11px]"
            >
              <ArrowRight className="w-3 h-3 text-[#FFD026]" />
              <span>{target}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
