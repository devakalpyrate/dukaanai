import React from 'react';
import { DocPageItem } from '../types';
import { CodeBlock } from '../components/CodeBlock';
import { Callout } from '../components/Callout';
import { LayoutDashboard, Mic, Users, Package, ArrowLeftRight, Truck, QrCode, Bell, BarChart3, Settings } from 'lucide-react';

export const SECTION_02_PAGES: Record<string, DocPageItem> = {
  'dashboard-overview': {
    id: 'dashboard-overview',
    title: 'Dashboard Overview',
    subtitle: 'Daily sales metrics, quick actions, and revenue counters',
    categoryNumber: '02',
    categoryTitle: 'Product Guide',
    headings: [
      { id: 'kpi-cards', text: 'Real-Time KPI Cards', level: 2 },
      { id: 'quick-actions', text: 'One-Click Quick Actions', level: 2 },
      { id: 'recent-activity', text: 'Recent Activity Ledger', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="kpi-cards" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-blue-400" />
            Real-Time KPI Cards
          </h2>
          <p className="text-slate-300 leading-relaxed">
            The DukaanAI merchant overview dashboard fetches live metrics from <code className="text-blue-300">/api/stats</code>. 
            It computes total daily sales, outstanding customer debt (Udhaar), collected payments (Jama), and the count of critical low-stock items.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1">
              <span className="text-slate-400">Total Today Sales</span>
              <p className="text-lg font-bold text-emerald-400">₹14,250.00</p>
              <p className="text-slate-500">Calculated over all paid transactions today.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-1">
              <span className="text-slate-400">Total Outstanding Khata (Udhaar)</span>
              <p className="text-lg font-bold text-amber-400">₹8,420.00</p>
              <p className="text-slate-500">Sum of net positive balances across all customers.</p>
            </div>
          </div>
        </section>

        <section id="quick-actions" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">One-Click Quick Actions</h2>
          <p className="text-slate-300 text-sm">
            Shop owners can trigger instant modal workflows directly from the dashboard: Record Credit, Add Customer, Generate Instant UPI QR, or Launch Voice Assistant.
          </p>
        </section>

        <section id="recent-activity" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Recent Activity Ledger</h2>
          <p className="text-slate-300 text-sm">
            Displays a streaming chronological list of transactions with customer badges, timestamps, transaction types, and amounts.
          </p>
        </section>
      </div>
    ),
  },

  'voice-assistant': {
    id: 'voice-assistant',
    title: 'Voice Assistant',
    subtitle: 'Hands-free voice accounting in Hindi, Hinglish, and English',
    categoryNumber: '02',
    categoryTitle: 'Product Guide',
    headings: [
      { id: 'voice-interface', text: 'Voice Interface & Wave Visualizer', level: 2 },
      { id: 'sample-phrases', text: 'Supported Retail Phrases', level: 2 },
      { id: 'audit-feedback', text: 'Audio & Visual Execution Feedback', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="voice-interface" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Mic className="w-5 h-5 text-blue-400" />
            Voice Interface & Wave Visualizer
          </h2>
          <p className="text-slate-300 leading-relaxed">
            The Voice Assistant records audio directly through the HTML5 Web Audio API using the MediaRecorder interface. 
            An animated sound-wave visualizer indicates live microphone listening status before sending encoded audio to the server.
          </p>
        </section>

        <section id="sample-phrases" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Supported Retail Phrases</h2>
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 font-mono text-slate-300">
              <span className="text-blue-400">Hindi Credit:</span> "रमेश को 500 रुपये का उधार लिखो"
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 font-mono text-slate-300">
              <span className="text-emerald-400">Hinglish Payment:</span> "Suresh ne 200 rupaye jama kar diye"
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 font-mono text-slate-300">
              <span className="text-purple-400">Stock Inquiry:</span> "Atta ka kitna stock bacha hai?"
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 font-mono text-slate-300">
              <span className="text-amber-400">Bill Generation:</span> "Mahesh ka 350 ka bill banao QR ke saath"
            </div>
          </div>
        </section>

        <section id="audit-feedback" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Audio & Visual Execution Feedback</h2>
          <p className="text-slate-300 text-sm">
            Upon successful intent execution, the voice engine returns both an updated UI notification and a high-fidelity 
            synthesized TTS speech response (e.g. <em>"रमेश के खाते में ₹500 का उधार जोड़ दिया गया है"</em>) played directly through the browser speaker.
          </p>
        </section>
      </div>
    ),
  },

  'customers-khata': {
    id: 'customers-khata',
    title: 'Customers & Khata',
    subtitle: 'Digital ledger tracking debit (jama) and credit (udhaar)',
    categoryNumber: '02',
    categoryTitle: 'Product Guide',
    headings: [
      { id: 'khata-ledger', text: 'Khata Bahi Digitalization', level: 2 },
      { id: 'balance-computation', text: 'Balance Computation Logic', level: 2 },
      { id: 'export-statement', text: 'PDF Invoice & Ledger Download', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="khata-ledger" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Khata Bahi Digitalization
          </h2>
          <p className="text-slate-300 leading-relaxed">
            The Customers view displays every customer affiliated with the authenticated shop, showing phone numbers, registration dates, 
            and real-time net balances.
          </p>
        </section>

        <section id="balance-computation" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Balance Computation Logic</h2>
          <p className="text-slate-300 text-sm">
            Every transaction is categorized into two fundamental ledger states:
          </p>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
            Net Balance = SUM(credit transactions) - SUM(debit transactions)
          </div>
          <p className="text-slate-400 text-xs">
            Positive values denote money owed to the store (Udhaar); zero or negative values denote settled or advance balances.
          </p>
        </section>

        <section id="export-statement" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">PDF Invoice & Ledger Download</h2>
          <p className="text-slate-300 text-sm">
            Clicking the PDF download button calls <code className="text-blue-300">/api/customers/{'{customer_id}'}/invoice.pdf</code>, 
            which generates a clean invoice using Python's PDF generator with shop header, itemized ledger entries, and payment status.
          </p>
        </section>
      </div>
    ),
  },

  'products-inventory': {
    id: 'products-inventory',
    title: 'Products & Inventory',
    subtitle: 'Stock balance tracking, low stock limits, and auto-logging',
    categoryNumber: '02',
    categoryTitle: 'Product Guide',
    headings: [
      { id: 'product-catalog', text: 'Product Catalog & Pricing', level: 2 },
      { id: 'inventory-thresholds', text: 'Inventory Thresholds & Low Stock Radar', level: 2 },
      { id: 'audit-logs', text: 'Inventory Mutation Logs', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="product-catalog" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            Product Catalog & Pricing
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Products are stored in the <code className="text-blue-300">products</code> table with unit descriptions (kg, litre, packet, piece). 
            Merchants can adjust selling prices and search through the product inventory instantly.
          </p>
        </section>

        <section id="inventory-thresholds" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Inventory Thresholds & Low Stock Radar</h2>
          <p className="text-slate-300 text-sm">
            Each item in the <code className="text-blue-300">inventory</code> table maintains a <code className="text-blue-300">low_stock_limit</code>. 
            When remaining quantity dips below this threshold, DukaanAI automatically triggers an alert badge and a system notification.
          </p>
        </section>

        <section id="audit-logs" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Inventory Mutation Logs</h2>
          <p className="text-slate-300 text-sm">
            All inventory additions, adjustments, and voice-initiated deductions generate immutable audit rows in <code className="text-blue-300">inventory_logs</code>, 
            recording the timestamp, reason, and quantity change.
          </p>
        </section>
      </div>
    ),
  },

  'sales-transactions': {
    id: 'sales-transactions',
    title: 'Sales & Transactions',
    subtitle: 'Idempotent recording of cash, credit, and digital transactions',
    categoryNumber: '02',
    categoryTitle: 'Product Guide',
    headings: [
      { id: 'transaction-flow', text: 'Transaction Ledger Architecture', level: 2 },
      { id: 'idempotency-protection', text: 'Idempotency Protection', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="transaction-flow" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            Transaction Ledger Architecture
          </h2>
          <p className="text-slate-300 leading-relaxed">
            The Sales page offers comprehensive tabular inspection of every transaction. Filters allow isolation by customer name, 
            date range, and transaction mode (Credit vs Debit).
          </p>
        </section>

        <section id="idempotency-protection" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Idempotency Protection</h2>
          <p className="text-slate-300 text-sm">
            Every transaction created via voice or manual entry generates an <code className="text-blue-300">idempotency_key</code>. 
            If network retries or repeated voice commands send identical payloads, the backend rejects duplicate commits, protecting financial integrity.
          </p>
        </section>
      </div>
    ),
  },

  'suppliers-orders': {
    id: 'suppliers-orders',
    title: 'Suppliers & Orders',
    subtitle: 'Category-based vendor management and purchase routing',
    categoryNumber: '02',
    categoryTitle: 'Product Guide',
    headings: [
      { id: 'vendor-directory', text: 'Vendor Directory & Categories', level: 2 },
      { id: 'voice-order-routing', text: 'Voice Order Routing', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="vendor-directory" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" />
            Vendor Directory & Categories
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Manage distributor and vendor relationships categorized by product lines: Dairy (doodh/paneer), Grains (atta/chawal), 
            FMCG snacks, or Spices.
          </p>
        </section>

        <section id="voice-order-routing" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Voice Order Routing</h2>
          <p className="text-slate-300 text-sm">
            Saying <em>"Doodh wale ko 20 packet ka order lagao"</em> matches the supplier category for dairy and prepares a supplier purchase draft.
          </p>
        </section>
      </div>
    ),
  },

  'billing-invoices': {
    id: 'billing-invoices',
    title: 'Billing & Invoices',
    subtitle: 'Dynamic UPI QR billing and auto-generated PDF receipts',
    categoryNumber: '02',
    categoryTitle: 'Product Guide',
    headings: [
      { id: 'dynamic-upi-qr', text: 'Dynamic NPCI UPI QR Codes', level: 2 },
      { id: 'pdf-receipts', text: 'Digital PDF Receipts', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="dynamic-upi-qr" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-400" />
            Dynamic NPCI UPI QR Codes
          </h2>
          <p className="text-slate-300 leading-relaxed">
            When completing a bill, DukaanAI constructs an official NPCI UPI payload:
          </p>
          <CodeBlock
            language="text"
            filename="UPI Payload"
            code={`upi://pay?pa=merchant@okaxis&pn=Dukaan%20Store&am=450.00&cu=INR&tn=Bill_Invoice_4812`}
          />
          <p className="text-slate-300 text-xs">
            Customers scan this QR code with Google Pay, PhonePe, or Paytm. The exact bill amount is pre-filled, eliminating customer typing errors.
          </p>
        </section>

        <section id="pdf-receipts" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Digital PDF Receipts</h2>
          <p className="text-slate-300 text-sm">
            Automated PDF invoices can be downloaded or shared via WhatsApp with itemized breakdowns and shop GST details.
          </p>
        </section>
      </div>
    ),
  },

  notifications: {
    id: 'notifications',
    title: 'Notifications',
    subtitle: 'Stock threshold alerts and system ledger notifications',
    categoryNumber: '02',
    categoryTitle: 'Product Guide',
    headings: [
      { id: 'notification-types', text: 'System Notification Types', level: 2 },
      { id: 'read-state', text: 'Acknowledgment & State Tracking', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="notification-types" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            System Notification Types
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Notifications are grouped into three severity types:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            <li><strong className="text-amber-300">warning:</strong> Low stock alerts triggered when an item reaches its re-order limit.</li>
            <li><strong className="text-blue-300">info:</strong> New customer registrations and voice pipeline events.</li>
            <li><strong className="text-emerald-300">success:</strong> High-value payment settlements and ledger clearances.</li>
          </ul>
        </section>

        <section id="read-state" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Acknowledgment & State Tracking</h2>
          <p className="text-slate-300 text-sm">
            The top header bell icon reflects unread counts. Clicking an alert marks it as read via <code className="text-blue-300">PATCH /api/notifications/{'{id}'}/read</code>.
          </p>
        </section>
      </div>
    ),
  },

  'reports-analytics': {
    id: 'reports-analytics',
    title: 'Reports & Analytics',
    subtitle: 'Sales analytics, profit metrics, and ledger summaries',
    categoryNumber: '02',
    categoryTitle: 'Product Guide',
    headings: [
      { id: 'sales-trends', text: 'Sales Trends & Revenue Breakdown', level: 2 },
      { id: 'debt-distribution', text: 'Credit (Udhaar) Aging & Risk Analysis', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="sales-trends" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Sales Trends & Revenue Breakdown
          </h2>
          <p className="text-slate-300 leading-relaxed">
            The Reports module aggregates transaction volumes across weekly and monthly cohorts, helping merchants identify 
            busiest shopping hours and top-selling commodities.
          </p>
        </section>

        <section id="debt-distribution" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Credit (Udhaar) Aging & Risk Analysis</h2>
          <p className="text-slate-300 text-sm">
            Categorizes outstanding customer credit into 7-day, 14-day, and 30-day buckets, providing warning flags for delinquent accounts.
          </p>
        </section>
      </div>
    ),
  },

  settings: {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Merchant profile, UPI VPA, GSTIN, language, and theme control',
    categoryNumber: '02',
    categoryTitle: 'Product Guide',
    headings: [
      { id: 'shop-profile', text: 'Store Profile & GSTIN', level: 2 },
      { id: 'upi-settlement', text: 'UPI Settlement VPA', level: 2 },
      { id: 'preferences', text: 'Language & Theme Preferences', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="shop-profile" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            Store Profile & GSTIN
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Manage legal business name, physical store address, and 15-digit GSTIN used in printed PDF invoices.
          </p>
        </section>

        <section id="upi-settlement" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">UPI Settlement VPA</h2>
          <p className="text-slate-300 text-sm">
            Enter the merchant's Virtual Payment Address (e.g. <code className="text-blue-300">store@okaxis</code> or <code className="text-blue-300">9876543210@paytm</code>). 
            All dynamically generated billing QR codes direct payments straight into this bank account with zero platform fees.
          </p>
        </section>

        <section id="preferences" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Language & Theme Preferences</h2>
          <p className="text-slate-300 text-sm">
            Toggle between Dark Navy and Adaptive mode, and select voice synthesis language: Hindi (<code className="text-blue-300">hi</code>), 
            Hinglish (<code className="text-blue-300">hi-en</code>), or English (<code className="text-blue-300">en</code>).
          </p>
        </section>
      </div>
    ),
  },
};
