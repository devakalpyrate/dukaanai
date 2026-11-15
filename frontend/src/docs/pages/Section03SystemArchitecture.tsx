import React from 'react';
import { DocPageItem } from '../types';
import { CodeBlock } from '../components/CodeBlock';
import { Callout } from '../components/Callout';
import { Layers, Cpu, Server, Workflow, Mic, Bot, AlertOctagon } from 'lucide-react';

export const SECTION_03_PAGES: Record<string, DocPageItem> = {
  'architecture-overview': {
    id: 'architecture-overview',
    title: 'Architecture Overview',
    subtitle: 'High-level system topology and service boundaries',
    categoryNumber: '03',
    categoryTitle: 'System Architecture',
    headings: [
      { id: 'topology', text: 'System Topology', level: 2 },
      { id: 'service-boundaries', text: 'Service Boundaries', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="topology" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            System Topology
          </h2>
          <p className="text-slate-300 leading-relaxed">
            DukaanAI follows a decoupled hybrid architecture consisting of a lightweight browser client, an asynchronous 
            FastAPI orchestration engine, an optional gRPC high-throughput service, and managed cloud infrastructure:
          </p>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 font-mono text-xs text-slate-300 space-y-2">
            <div className="text-blue-400 font-bold">[ React 19 Frontend ] (Web Audio API, Tailwind CSS, Lucide)</div>
            <div className="pl-6 text-slate-500">│  ▲ HTTPS REST / multipart/form-data</div>
            <div className="pl-6 text-slate-500">▼  │</div>
            <div className="text-emerald-400 font-bold">[ FastAPI Backend Server ] (Python 3.11/3.14, Uvicorn)</div>
            <div className="pl-6 text-slate-500">├──► [ Security & Auth ] (PBKDF2-SHA256, HMAC JWT, Rate Limiter)</div>
            <div className="pl-6 text-slate-500">├──► [ Bodhan AI Cloud ] (Indian Languages STT & Natural TTS)</div>
            <div className="pl-6 text-slate-500">├──► [ Groq Cloud ] (LLaMA-3-70b-versatile Ultra-Fast Inference)</div>
            <div className="pl-6 text-slate-500">└──► [ Supabase Cloud ] (PostgreSQL 15+, Multi-tenant RLS)</div>
          </div>
        </section>

        <section id="service-boundaries" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Service Boundaries</h2>
          <p className="text-slate-300 text-sm">
            The frontend never directly talks to Groq or Supabase; all requests pass through the FastAPI security gateway 
            where JWT tokens are decrypted, tenant identifiers (<code className="text-blue-300">shop_id</code>) are injected, and rate limits are enforced.
          </p>
        </section>
      </div>
    ),
  },

  'frontend-architecture': {
    id: 'frontend-architecture',
    title: 'Frontend Architecture',
    subtitle: 'React 19, TypeScript, Tailwind CSS, and state flow',
    categoryNumber: '03',
    categoryTitle: 'System Architecture',
    headings: [
      { id: 'tech-stack', text: 'Core Technology Stack', level: 2 },
      { id: 'state-management', text: 'State Management & Storage', level: 2 },
      { id: 'audio-streaming', text: 'Audio Capture Pipeline', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="tech-stack" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            Core Technology Stack
          </h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            <li><strong>React 19.3:</strong> Concurrent rendering and zero-overhead component trees.</li>
            <li><strong>TypeScript 7.0:</strong> Strict type checking across API payloads and user sessions.</li>
            <li><strong>Tailwind CSS 4.3:</strong> Just-in-time styling with bespoke dark navy theme tokens.</li>
            <li><strong>Lucide React:</strong> Standardized SVG icon system.</li>
            <li><strong>Vite 8.3:</strong> Lightning-fast compilation and HMR bundling.</li>
          </ul>
        </section>

        <section id="state-management" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">State Management & Storage</h2>
          <p className="text-slate-300 text-sm">
            Session tokens and shop metadata are safely cached in browser <code className="text-blue-300">localStorage</code>. 
            Reactive state hooks manage active page tabs, real-time transaction updates, and modal visibility without redundant external state libraries.
          </p>
        </section>

        <section id="audio-streaming" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Audio Capture Pipeline</h2>
          <p className="text-slate-300 text-sm">
            Captures 16kHz mono audio via <code className="text-blue-300">navigator.mediaDevices.getUserMedia</code>, 
            encodes chunks into audio blobs (WAV/WebM), and streams them via multipart POST to <code className="text-blue-300">/api/voice/process</code>.
          </p>
        </section>
      </div>
    ),
  },

  'backend-architecture': {
    id: 'backend-architecture',
    title: 'Backend Architecture',
    subtitle: 'FastAPI async runtime, gRPC service, and service layer',
    categoryNumber: '03',
    categoryTitle: 'System Architecture',
    headings: [
      { id: 'fastapi-layer', text: 'FastAPI Async Routing Layer', level: 2 },
      { id: 'service-layer', text: 'Service & Domain Business Logic', level: 2 },
      { id: 'grpc-service', text: 'Optional gRPC Intent Engine', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="fastapi-layer" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-400" />
            FastAPI Async Routing Layer
          </h2>
          <p className="text-slate-300 leading-relaxed">
            FastAPI handles concurrent requests using Python's asyncio event loop. Middleware enforces CORS policies, 
            request timing, structured logging, and token verification.
          </p>
        </section>

        <section id="service-layer" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Service & Domain Business Logic</h2>
          <p className="text-slate-300 text-sm">
            Located in <code className="text-blue-300">app/services/</code>:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
            <li><code className="text-blue-300">intent_executor.py:</code> Validates extracted intent data and performs transactional ledger writes.</li>
            <li><code className="text-blue-300">price_discovery.py:</code> Resolves commodity market benchmarks if the speaker omits prices.</li>
            <li><code className="text-blue-300">language_detection.py:</code> Distinguishes Hindi, Hinglish, and English transcripts.</li>
            <li><code className="text-blue-300">pdf_generator.py:</code> Builds customer invoice PDFs.</li>
          </ul>
        </section>

        <section id="grpc-service" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Optional gRPC Intent Engine</h2>
          <p className="text-slate-300 text-sm">
            For microservice architectures and hardware terminals, DukaanAI includes a gRPC server in <code className="text-blue-300">app/grpc_service/</code> 
            defined via Protocol Buffers (<code className="text-blue-300">intent.proto</code>).
          </p>
        </section>
      </div>
    ),
  },

  'request-lifecycle': {
    id: 'request-lifecycle',
    title: 'Request Lifecycle',
    subtitle: 'Tracing an API call from client to database and back',
    categoryNumber: '03',
    categoryTitle: 'System Architecture',
    headings: [
      { id: 'lifecycle-trace', text: 'Step-by-Step Execution Sequence', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="lifecycle-trace" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Workflow className="w-5 h-5 text-blue-400" />
            Step-by-Step Execution Sequence
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed">
            <li><strong>Client Dispatch:</strong> React frontend sends an HTTP request with <code className="text-blue-300">Authorization: Bearer &lt;JWT&gt;</code>.</li>
            <li><strong>Rate Limiting:</strong> In-memory sliding window checks IP and user limits (rejecting with 429 if exceeded).</li>
            <li><strong>Auth Dependency:</strong> <code className="text-blue-300">get_current_user</code> verifies JWT HMAC signature, extracts <code className="text-blue-300">user_id</code> and <code className="text-blue-300">shop_id</code>.</li>
            <li><strong>Input Validation:</strong> Pydantic models parse and sanitize incoming JSON or multipart form fields.</li>
            <li><strong>Database Execution:</strong> Supabase client executes parameterized SQL queries strictly filtered by the authenticated <code className="text-blue-300">shop_id</code>.</li>
            <li><strong>Response Serialization:</strong> FastAPI serializes data to JSON and transmits response with CORS headers.</li>
          </ol>
        </section>
      </div>
    ),
  },

  'voice-processing-pipeline': {
    id: 'voice-processing-pipeline',
    title: 'Voice Processing Pipeline',
    subtitle: 'Audio capture, STT, NLU intent parsing, execution, and TTS',
    categoryNumber: '03',
    categoryTitle: 'System Architecture',
    headings: [
      { id: 'pipeline-stages', text: 'The 5 Pipeline Stages', level: 2 },
      { id: 'latency-budget', text: 'End-to-End Latency Profile', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="pipeline-stages" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Mic className="w-5 h-5 text-blue-400" />
            The 5 Pipeline Stages
          </h2>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60">
              <strong className="text-blue-400">Stage 1 — Speech-to-Text (STT):</strong> Bodhan AI converts recorded audio into text with high accuracy on Indian accents and vernacular Hindi terms.
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60">
              <strong className="text-emerald-400">Stage 2 — Natural Language Understanding (NLU):</strong> Groq LLaMA-3 classifies the retailer's intent and extracts parameters (amount, customer, item, mode).
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60">
              <strong className="text-purple-400">Stage 3 — Validation & Price Discovery:</strong> If item quantity is present but price is omitted, price discovery searches <code className="text-blue-300">global_market_prices</code>.
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60">
              <strong className="text-amber-400">Stage 4 — Transaction Execution:</strong> Atomically writes the transaction, updates customer balance, and adjusts inventory.
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/60">
              <strong className="text-rose-400">Stage 5 — Speech Synthesis (TTS):</strong> Bodhan AI synthesizes Hindi speech confirming the operation to the merchant.
            </div>
          </div>
        </section>

        <section id="latency-budget" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">End-to-End Latency Profile</h2>
          <p className="text-slate-300 text-sm">
            Average end-to-end processing time is under 1.2 seconds, allowing natural retail conversational flow without halting shopkeeper activity.
          </p>
        </section>
      </div>
    ),
  },

  'ai-integration-architecture': {
    id: 'ai-integration-architecture',
    title: 'AI Integration Architecture',
    subtitle: 'Hybrid Groq LLaMA-3 + Bodhan Cloud orchestration',
    categoryNumber: '03',
    categoryTitle: 'System Architecture',
    headings: [
      { id: 'hybrid-ai', text: 'Dual AI Cloud Providers', level: 2 },
      { id: 'prompt-contract', text: 'Structured JSON Prompt Contract', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="hybrid-ai" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            Dual AI Cloud Providers
          </h2>
          <p className="text-slate-300 leading-relaxed">
            DukaanAI pairs two specialized AI engines: Bodhan AI for specialized Indian linguistic phonetics (Hindi, Tamil, Hinglish audio), 
            and Groq's custom LPU (Language Processing Unit) running LLaMA-3-70b for instantaneous JSON intent extraction.
          </p>
        </section>

        <section id="prompt-contract" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Structured JSON Prompt Contract</h2>
          <p className="text-slate-300 text-sm">
            The LLM prompt strictly demands JSON output conforming to the system intent schema, eliminating markdown wrapping or conversational conversational chatter.
          </p>
        </section>
      </div>
    ),
  },

  'error-handling-architecture': {
    id: 'error-handling-architecture',
    title: 'Error Handling Architecture',
    subtitle: 'Centralized exception sanitization and safe user messaging',
    categoryNumber: '03',
    categoryTitle: 'System Architecture',
    headings: [
      { id: 'exception-sanitization', text: 'Exception Redaction & Sanitization', level: 2 },
      { id: 'status-mapping', text: 'HTTP Error Mapping', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="exception-sanitization" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-blue-400" />
            Exception Redaction & Sanitization
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Internal database errors, raw PostgREST exceptions, and internal tracebacks are intercepted by 
            <code className="text-blue-300">app/security/exceptions.py</code>. The server logs the sanitized traceback internally while returning safe, 
            generic error messages to the client to avoid leaking schema topology.
          </p>
        </section>

        <section id="status-mapping" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">HTTP Error Mapping</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <span className="font-mono text-amber-400 font-bold">400 Bad Request</span>
              <p className="text-slate-400 mt-1">Malformed JSON or negative balance amounts.</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <span className="font-mono text-rose-400 font-bold">401 / 403 Forbidden</span>
              <p className="text-slate-400 mt-1">Missing JWT, expired signature, or cross-shop access.</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <span className="font-mono text-blue-400 font-bold">429 Rate Limit</span>
              <p className="text-slate-400 mt-1">Request threshold exceeded (sliding window).</p>
            </div>
          </div>
        </section>
      </div>
    ),
  },
};
