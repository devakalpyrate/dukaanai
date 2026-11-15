import React from 'react';
import { DocPageItem } from '../types';
import { Callout } from '../components/Callout';
import { ERDiagramView } from '../components/ERDiagramView';
import { Database, ShieldCheck, Layers, RefreshCw, Key, CheckCircle2 } from 'lucide-react';

export const SECTION_04_PAGES: Record<string, DocPageItem> = {
  'database-overview': {
    id: 'database-overview',
    title: 'Database Overview',
    subtitle: 'High-reliability cloud data platform for retail operations',
    categoryNumber: '04',
    categoryTitle: 'Database',
    headings: [
      { id: 'cloud-storage', text: 'Managed Cloud Architecture', level: 2 },
      { id: 'data-privacy', text: 'Multi-Tenant Data Privacy', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="cloud-storage" className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-[#FFD026]" />
            Managed Cloud Architecture
          </h2>
          <p className="text-[#C9D1D9] leading-relaxed">
            DukaanAI utilizes a high-availability cloud database infrastructure engineered for fast retail throughput, 
            instant ledger reads, and automatic failover. All data is backed by point-in-time recovery and continuous snapshots 
            to guarantee zero data loss.
          </p>
        </section>

        <section id="data-privacy" className="space-y-3">
          <h2 className="text-xl font-bold text-white">Multi-Tenant Data Privacy</h2>
          <p className="text-[#C9D1D9] text-sm">
            Retail stores operate in strict, isolated data partitions. Each merchant's customer khata records, sales history, 
            and catalog details are cryptographically bounded to their authenticated store account.
          </p>
        </section>
      </div>
    ),
  },

  'er-diagram': {
    id: 'er-diagram',
    title: 'ER Diagram',
    subtitle: 'Entity-relationship conceptual architecture and business domains',
    categoryNumber: '04',
    categoryTitle: 'Database',
    headings: [
      { id: 'conceptual-model', text: 'High-Level Business Entity Map', level: 2 },
      { id: 'domain-boundaries', text: 'Domain Boundaries & Flow', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="conceptual-model" className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#FFD026]" />
            High-Level Business Entity Map
          </h2>
          <p className="text-[#C9D1D9] leading-relaxed text-sm">
            Below is the conceptual entity-relationship architecture showing the major retail domains and how they integrate:
          </p>
          <ERDiagramView />
        </section>

        <section id="domain-boundaries" className="space-y-3">
          <h2 className="text-xl font-bold text-white">Domain Boundaries & Flow</h2>
          <p className="text-[#C9D1D9] text-sm leading-relaxed">
            Transactions cleanly flow from Voice & Billing inputs directly into Customer Khata and Stock Inventories, 
            ensuring synchronized double-entry balancing without exposing underlying database mechanics.
          </p>
        </section>
      </div>
    ),
  },

  'schema-reference': {
    id: 'schema-reference',
    title: 'Schema Reference',
    subtitle: 'Core data domains and retail records overview',
    categoryNumber: '04',
    categoryTitle: 'Database',
    headings: [
      { id: 'core-domains', text: 'Core Data Domains', level: 2 },
      { id: 'retention-policy', text: 'Audit & Record Retention', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="core-domains" className="space-y-3">
          <h2 className="text-xl font-bold text-white">Core Data Domains</h2>
          <p className="text-[#C9D1D9] text-sm leading-relaxed">
            The data layer is partitioned into six functional business domains:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-[#1E232B] bg-[#12161F] space-y-1">
              <span className="font-bold text-[#FFD026]">Merchant Accounts & Settings</span>
              <p className="text-[#8B949E]">Store profile, settlement VPA, and language preferences.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-[#1E232B] bg-[#12161F] space-y-1">
              <span className="font-bold text-emerald-400">Customer Directory & Balances</span>
              <p className="text-[#8B949E]">Customer identity cards and aggregated net khata debt.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-[#1E232B] bg-[#12161F] space-y-1">
              <span className="font-bold text-blue-400">Catalog & Real-time Stock</span>
              <p className="text-[#8B949E]">Merchandise master, price discovery, and re-order radar.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-[#1E232B] bg-[#12161F] space-y-1">
              <span className="font-bold text-purple-400">Financial Ledger Transactions</span>
              <p className="text-[#8B949E]">Immutable chronological stream of credit and debit events.</p>
            </div>
          </div>
        </section>

        <section id="retention-policy" className="space-y-3">
          <h2 className="text-xl font-bold text-white">Audit & Record Retention</h2>
          <p className="text-[#C9D1D9] text-sm">
            All ledger records are immutable and retained for historical auditing, tax reporting, and dispute resolution.
          </p>
        </section>
      </div>
    ),
  },

  'tables-relationships': {
    id: 'tables-relationships',
    title: 'Tables & Relationships',
    subtitle: 'Relational model and business entity linkages',
    categoryNumber: '04',
    categoryTitle: 'Database',
    headings: [
      { id: 'relational-cardinality', text: 'Entity Cardinality & Flows', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="relational-cardinality" className="space-y-3">
          <h2 className="text-xl font-bold text-white">Entity Cardinality & Flows</h2>
          <p className="text-[#C9D1D9] text-sm leading-relaxed">
            Entity relationships reflect real-world retail workflows:
          </p>
          <ul className="list-disc list-inside space-y-2 text-xs text-[#C9D1D9]">
            <li><strong>Stores to Customers:</strong> Each store manages its own private directory of local patrons.</li>
            <li><strong>Customers to Transactions:</strong> A customer can have multiple historical entries representing credit purchases and settlement payments.</li>
            <li><strong>Products to Inventory:</strong> Every catalog item tracks live quantity on hand with threshold alerts.</li>
            <li><strong>Stores to Suppliers:</strong> Merchants connect with local distributors across merchandise categories.</li>
          </ul>
        </section>
      </div>
    ),
  },

  indexing: {
    id: 'indexing',
    title: 'Indexing',
    subtitle: 'High-speed query acceleration and responsive searches',
    categoryNumber: '04',
    categoryTitle: 'Database',
    headings: [
      { id: 'acceleration', text: 'Query Acceleration Strategy', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="acceleration" className="space-y-3">
          <h2 className="text-xl font-bold text-white">Query Acceleration Strategy</h2>
          <p className="text-[#C9D1D9] leading-relaxed text-sm">
            High-traffic queries—such as looking up customer phone numbers during rapid checkout, calculating daily ledger totals, 
            and filtering low-stock warnings—are accelerated via automated index pipelines to guarantee response times under 10 milliseconds.
          </p>
        </section>
      </div>
    ),
  },

  'data-integrity': {
    id: 'data-integrity',
    title: 'Data Integrity',
    subtitle: 'Idempotency keys, atomic ledger transactions, and shop isolation',
    categoryNumber: '04',
    categoryTitle: 'Database',
    headings: [
      { id: 'atomic-transactions', text: 'Atomic Ledger Guarantees', level: 2 },
      { id: 'deduplication', text: 'Idempotency & Deduplication', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="atomic-transactions" className="space-y-3">
          <h2 className="text-xl font-bold text-white">Atomic Ledger Guarantees</h2>
          <p className="text-[#C9D1D9] leading-relaxed text-sm">
            All financial balance calculations follow ACID guarantees. Credit entries and debit deductions are committed atomically, 
            ensuring balances always match verified transaction history.
          </p>
        </section>

        <section id="deduplication" className="space-y-3">
          <h2 className="text-xl font-bold text-white">Idempotency & Deduplication</h2>
          <p className="text-[#C9D1D9] text-sm">
            Requests are tagged with idempotency tokens to prevent accidental double-billing in case of spotty network retries.
          </p>
        </section>
      </div>
    ),
  },

  migrations: {
    id: 'migrations',
    title: 'Migrations',
    subtitle: 'Safe schema updates and version transitions',
    categoryNumber: '04',
    categoryTitle: 'Database',
    headings: [
      { id: 'managed-migrations', text: 'Automated Migration Process', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="managed-migrations" className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#FFD026]" />
            Automated Migration Process
          </h2>
          <p className="text-[#C9D1D9] text-sm leading-relaxed">
            Database migrations are executed via declarative version scripts that apply non-destructive updates, 
            preserving all existing store data and historical ledgers.
          </p>
        </section>
      </div>
    ),
  },
};
