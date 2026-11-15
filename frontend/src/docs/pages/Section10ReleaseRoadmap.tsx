import React from 'react';
import { DocPageItem } from '../types';
import { CodeBlock } from '../components/CodeBlock';
import { History, Milestone, AlertCircle, Compass, FileCheck } from 'lucide-react';

export const SECTION_10_PAGES: Record<string, DocPageItem> = {
  changelog: {
    id: 'changelog',
    title: 'Changelog',
    subtitle: 'Chronological record of feature additions, fixes, and updates',
    categoryNumber: '10',
    categoryTitle: 'Release & Roadmap',
    headings: [
      { id: 'v120', text: 'v1.2.0 — Unified Voice & Multilingual Polish', level: 2 },
      { id: 'v110', text: 'v1.1.0 — Security Hardening & Rate Limiting', level: 2 },
      { id: 'v100', text: 'v1.0.0 — Initial Release', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="v120" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            v1.2.0 — Unified Voice & Multilingual Polish
          </h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            <li>Added integrated Bodhan AI cloud STT and natural Hindi TTS audio playback.</li>
            <li>Implemented benchmark market commodity pricing lookups.</li>
            <li>Created 3-column professional developer documentation portal.</li>
            <li>Added customer PDF statement downloads and dynamic NPCI UPI QR code billing.</li>
          </ul>
        </section>

        <section id="v110" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">v1.1.0 — Security Hardening & Rate Limiting</h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            <li>Introduced PBKDF2 password stretching with 200,000 iterations.</li>
            <li>Enforced sliding-window rate limiters across sensitive endpoints.</li>
            <li>Added log redaction for sensitive keys and tokens.</li>
          </ul>
        </section>

        <section id="v100" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">v1.0.0 — Initial Release</h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            <li>Core multi-tenant retail schema on PostgreSQL.</li>
            <li>Voice-assisted customer khata credit/debit tracking.</li>
            <li>FastAPI backend with React TypeScript frontend.</li>
          </ul>
        </section>
      </div>
    ),
  },

  'version-history': {
    id: 'version-history',
    title: 'Version History',
    subtitle: 'Semantic version releases from v1.0.0 to current v1.2.0',
    categoryNumber: '10',
    categoryTitle: 'Release & Roadmap',
    headings: [
      { id: 'semver-policy', text: 'Semantic Versioning Strategy', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="semver-policy" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Milestone className="w-5 h-5 text-blue-400" />
            Semantic Versioning Strategy
          </h2>
          <p className="text-slate-300 leading-relaxed text-sm">
            DukaanAI follows SemVer (MAJOR.MINOR.PATCH):
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            <li><strong>MAJOR:</strong> Breaking database schema changes or incompatible API contracts.</li>
            <li><strong>MINOR:</strong> New retail capabilities, additional language models, or report formats.</li>
            <li><strong>PATCH:</strong> Bug fixes, security hardening, and performance optimizations.</li>
          </ul>
        </section>
      </div>
    ),
  },

  'known-limitations': {
    id: 'known-limitations',
    title: 'Known Limitations',
    subtitle: 'Current operational boundaries and hardware prerequisites',
    categoryNumber: '10',
    categoryTitle: 'Release & Roadmap',
    headings: [
      { id: 'connectivity', text: 'Internet Connectivity Requirement', level: 2 },
      { id: 'audio-hardware', text: 'Acoustic Quality in Noisy Environments', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="connectivity" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            Internet Connectivity Requirement
          </h2>
          <p className="text-slate-300 text-sm">
            Current version relies on cloud STT/TTS and Supabase PostgreSQL. Offline SQLite synchronization is slated for future release.
          </p>
        </section>

        <section id="audio-hardware" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Acoustic Quality in Noisy Environments</h2>
          <p className="text-slate-300 text-sm">
            High ambient background noise (above 85 dB in busy bazaars) may require the merchant to hold the microphone closer to speech input.
          </p>
        </section>
      </div>
    ),
  },

  roadmap: {
    id: 'roadmap',
    title: 'Roadmap',
    subtitle: 'Upcoming features: WhatsApp Khata Bot, Offline Sync, and Multi-branch',
    categoryNumber: '10',
    categoryTitle: 'Release & Roadmap',
    headings: [
      { id: 'q1-milestones', text: 'Phase 1: WhatsApp Khata Reminders', level: 2 },
      { id: 'q2-milestones', text: 'Phase 2: Local Offline First Sync', level: 2 },
      { id: 'q3-milestones', text: 'Phase 3: Multi-Counter Support', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="q1-milestones" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-400" />
            Phase 1: WhatsApp Khata Reminders
          </h2>
          <p className="text-slate-300 text-sm">
            Automated WhatsApp message dispatch with instant UPI payment links sent to credit customers on scheduled billing cycles.
          </p>
        </section>

        <section id="q2-milestones" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Phase 2: Local Offline First Sync</h2>
          <p className="text-slate-300 text-sm">
            IndexedDB and local SQLite replication allowing full shop ledger entry during internet outages with automatic background reconciliation.
          </p>
        </section>

        <section id="q3-milestones" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Phase 3: Multi-Counter Support</h2>
          <p className="text-slate-300 text-sm">
            Support for multiple staff logins and sales counters feeding into a centralized shop owner master khata.
          </p>
        </section>
      </div>
    ),
  },

  license: {
    id: 'license',
    title: 'License',
    subtitle: 'Software licensing terms and usage permissions',
    categoryNumber: '10',
    categoryTitle: 'Release & Roadmap',
    headings: [
      { id: 'license-summary', text: 'MIT Open Source License', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="license-summary" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-400" />
            MIT Open Source License
          </h2>
          <p className="text-slate-300 leading-relaxed text-sm">
            DukaanAI is released under the permissive MIT License. You are free to inspect, modify, run, 
            and deploy the software for commercial and private retail use without royalty charges.
          </p>
          <CodeBlock
            language="text"
            filename="LICENSE"
            code={`Copyright (c) 2026 DukaanAI Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files, to deal in the Software
without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so.`}
          />
        </section>
      </div>
    ),
  },
};
