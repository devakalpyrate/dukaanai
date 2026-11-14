import React, { useState } from 'react';
import {
  Zap,
  Clock,
  MessageSquare,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { AutomationTask } from '../types';

export const AutomationPage: React.FC = () => {
  const [tasks, setTasks] = useState<AutomationTask[]>([
    {
      id: 'auto-1',
      title: 'Daily WhatsApp Khata Summary',
      description: 'Send automatic closing balance statement to customers with outstanding > ₹500',
      schedule: 'Every day at 08:30 PM',
      type: 'statement',
      enabled: false,
    },
    {
      id: 'auto-2',
      title: 'Payment Reminder Alert',
      description: 'Polite reminder message for credit balances older than 15 days',
      schedule: 'Every Monday at 10:00 AM',
      type: 'reminder',
      enabled: false,
    },
  ]);

  const handleToggle = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
          Communication & Workflow Automation
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Configure automated customer reminder notifications, WhatsApp daily ledger digests, and stock replenishment alerts.
        </p>
      </div>

      {/* Automation Rules Cards */}
      <div className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-600/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{task.title}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      task.enabled
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : 'bg-white/5 text-[var(--text-muted)] border border-white/10'
                    }`}
                  >
                    {task.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl">{task.description}</p>
                <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)] mt-2">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" /> {task.schedule}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggle(task.id)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer"
              >
                {task.enabled ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-emerald-400" /> Disable
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-[var(--text-muted)]" /> Enable
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* WhatsApp Template Preview Box */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" /> WhatsApp Template Preview
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Verified transactional template format sent to customers on credit addition.
        </p>

        <div className="max-w-md p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-200 font-sans space-y-2">
          <p className="font-semibold text-emerald-300">Namaskar Customer ji,</p>
          <p>Aapke khata account mein udhar transaction record kiya gaya hai.</p>
          <p className="font-mono bg-black/30 p-2 rounded border border-emerald-500/10 text-emerald-100">
            DukaanAI Automated Ledger Notification
          </p>
        </div>
      </div>
    </div>
  );
};
