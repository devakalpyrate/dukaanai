import React, { useState } from 'react';
import {
  Receipt,
  FileText,
  Download,
  QrCode,
  CheckCircle2,
  Share2,
  Printer,
  Calendar,
} from 'lucide-react';
import { Invoice } from '../types';

export const BillingPage: React.FC = () => {
  const [invoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
            Billing, Invoices & UPI Khata Slips
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Print customer receipts, share instant WhatsApp billing links, and generate dynamic UPI QR codes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-[var(--text-primary)] hover:bg-white/10 cursor-pointer">
            <Calendar className="w-4 h-4 text-cyan-400" /> Daily Statement
          </button>
        </div>
      </div>

      {/* Main View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 glass-card rounded-2xl p-4 flex flex-col gap-3 min-h-[400px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
            Store Invoices
          </h3>

          {invoices.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-[var(--text-muted)] text-xs p-4">
              <Receipt className="w-10 h-10 mb-2 opacity-30 text-cyan-400" />
              <p className="font-semibold">No invoices generated yet.</p>
              <p className="text-[11px] mt-1">Invoices will appear here as transactions occur.</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className="p-3 rounded-xl border bg-white/5 border-transparent hover:border-white/10 cursor-pointer"
                >
                  <span className="font-mono text-cyan-400 font-bold text-xs">{inv.id}</span>
                  <p className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">{inv.customer_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[400px] text-[var(--text-muted)]">
          <QrCode className="w-12 h-12 mb-3 opacity-30 text-cyan-400" />
          <h4 className="text-sm font-bold text-[var(--text-primary)]">Printable Invoice & UPI Slip Canvas</h4>
          <p className="text-xs max-w-sm mt-1 text-[var(--text-muted)]">
            Select an existing customer invoice or create a sale to generate an instant printable receipt with embedded UPI collection QR.
          </p>
        </div>
      </div>
    </div>
  );
};
