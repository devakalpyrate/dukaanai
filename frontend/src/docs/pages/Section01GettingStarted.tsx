import React from 'react';
import { DocPageItem } from '../types';
import { CodeBlock } from '../components/CodeBlock';
import { Callout } from '../components/Callout';
import { Sparkles, Terminal, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export const SECTION_01_PAGES: Record<string, DocPageItem> = {
  intro: {
    id: 'intro',
    title: 'Introduction',
    subtitle: 'Welcome to the DukaanAI Developer & System Documentation',
    categoryNumber: '01',
    categoryTitle: 'Getting Started',
    headings: [
      { id: 'overview', text: 'Overview', level: 2 },
      { id: 'architecture-philosophy', text: 'Architecture Philosophy', level: 2 },
      { id: 'target-audience', text: 'Target Audience & Use Cases', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="overview" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            Overview
          </h2>
          <p className="text-slate-300 leading-relaxed">
            DukaanAI is an enterprise-grade, voice-first retail intelligence system engineered specifically for 
            Indian micro, small, and medium businesses (MSMEs), Kirana stores, and retailers. It unifies natural Hindi and Hinglish 
            speech recognition, conversational NLU parsing, dual-entry khata bookkeeping, multi-tenant inventory synchronization, 
            and dynamic UPI QR code payments into a resilient, high-speed platform.
          </p>
          <p className="text-slate-300 leading-relaxed">
            This technical documentation provides a comprehensive reference of the system architecture, internal database models, 
            REST and gRPC endpoints, security isolation safeguards, and the AI voice pipeline. Every component documented here 
            reflects verified code present in the production repository.
          </p>
        </section>

        <section id="architecture-philosophy" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Architecture Philosophy</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
              <h3 className="font-semibold text-blue-300 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Voice-First Low Latency
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sub-second voice processing through Bodhan AI speech streaming and Groq LLaMA-3-70b quantized inference.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
              <h3 className="font-semibold text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Shop Data Isolation
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Strict multi-tenant boundary checks on every database query using immutable shop foreign keys.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
              <h3 className="font-semibold text-amber-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Idempotent Accounting
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cryptographic transaction idempotency keys prevent duplicate credit entries or double deductions.
              </p>
            </div>
          </div>
        </section>

        <section id="target-audience" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Target Audience & Use Cases</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm">
            <li><strong>Indian Retail Merchants:</strong> Shop owners managing fast-paced counters who cannot type on smartphones while packing groceries.</li>
            <li><strong>Software Engineers & Integrators:</strong> Developers connecting point-of-sale hardware, thermal printers, and custom inventory databases to DukaanAI APIs.</li>
            <li><strong>Security Auditors:</strong> Verifying data isolation, PBKDF2 password stretching, and API rate limiting mechanisms.</li>
          </ul>
        </section>
      </div>
    ),
  },

  'what-is-dukaanai': {
    id: 'what-is-dukaanai',
    title: 'What is DukaanAI?',
    subtitle: 'AI-first Voice Operating System for Indian Retail',
    categoryNumber: '01',
    categoryTitle: 'Getting Started',
    headings: [
      { id: 'core-problem', text: 'The Core Retail Problem', level: 2 },
      { id: 'dukaanai-solution', text: 'The DukaanAI Solution', level: 2 },
      { id: 'design-principles', text: 'Core Design Principles', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="core-problem" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">The Core Retail Problem</h2>
          <p className="text-slate-300 leading-relaxed">
            Over 12 million Kirana stores in India operate on traditional paper diaries (Khata bahi). During peak rush hours, 
            recording credit (udhaar), checking stock, or generating bills manually leads to three chronic failure modes:
          </p>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/20">
              <strong className="text-rose-300">1. Unrecorded Credit:</strong> Shopkeepers frequently forget to write down Rs 50 - 200 items during rush, causing 5% - 8% monthly revenue leakage.
            </div>
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20">
              <strong className="text-amber-300">2. Typing Barrier:</strong> Traditional POS software requires navigating menus, selecting items, and typing numbers, disrupting customer service.
            </div>
            <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/20">
              <strong className="text-blue-300">3. Language Mismatch:</strong> Most retail systems demand formal English, whereas Indian merchants think and speak in natural Hindi, Hinglish, or regional dialects.
            </div>
          </div>
        </section>

        <section id="dukaanai-solution" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">The DukaanAI Solution</h2>
          <p className="text-slate-300 leading-relaxed">
            DukaanAI replaces manual inputs with voice. A shopkeeper simply speaks: 
            <span className="italic text-blue-300"> "Ramesh ko 2 kilo chawal 96 rupaye udhaar likho"</span>. 
            The system instantly transcribes the audio, extracts entities (Customer: Ramesh, Item: chawal, Quantity: 2kg, Amount: 96, Type: credit), 
            updates the customer ledger, logs the inventory reduction, and generates an auditory spoken confirmation in Hindi.
          </p>
        </section>

        <section id="design-principles" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Core Design Principles</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm">
            <li><strong>Zero Learning Curve:</strong> Speak naturally without memorizing rigid command syntax.</li>
            <li><strong>Fail-Safe Validation:</strong> Ambiguous intents trigger clarifying prompts before recording ledger debts.</li>
            <li><strong>Local Cloud Hybrid:</strong> Works seamlessly with Supabase cloud databases and local network peripherals.</li>
          </ul>
        </section>
      </div>
    ),
  },

  'key-features': {
    id: 'key-features',
    title: 'Key Features',
    subtitle: 'Voice Khata, Real-time Inventory, UPI QRs, and Multilingual AI',
    categoryNumber: '01',
    categoryTitle: 'Getting Started',
    headings: [
      { id: 'voice-khata', text: '1. Voice-Activated Khata Ledger', level: 2 },
      { id: 'smart-inventory', text: '2. Real-Time Inventory & Price Discovery', level: 2 },
      { id: 'instant-upi', text: '3. Dynamic UPI QR Billing', level: 2 },
      { id: 'multilingual-nlu', text: '4. Multilingual NLU Engine', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="voice-khata" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">1. Voice-Activated Khata Ledger</h2>
          <p className="text-slate-300 leading-relaxed">
            Automatic credit and debit balancing with complete historical transaction logs. Customers can be created on-the-fly 
            during a transaction, with automated balance recalculation and invoice generation.
          </p>
        </section>

        <section id="smart-inventory" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">2. Real-Time Inventory & Price Discovery</h2>
          <p className="text-slate-300 leading-relaxed">
            Integrated stock tracking with automated deduction on sales transactions. Contains a pre-seeded 
            benchmark database (<code className="text-blue-300">global_market_prices</code>) covering common commodities (Atta, Dal, Oil, Milk, Spices) 
            allowing the AI to auto-fill market prices when the merchant doesn't specify an amount.
          </p>
        </section>

        <section id="instant-upi" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">3. Dynamic UPI QR Billing</h2>
          <p className="text-slate-300 leading-relaxed">
            Generates standardized NPCI-compliant UPI deep links (<code className="text-blue-300">upi://pay?pa=...</code>) rendered as real-time QR codes 
            directly in the merchant's browser or via the Python backend QR generator.
          </p>
        </section>

        <section id="multilingual-nlu" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">4. Multilingual NLU Engine</h2>
          <p className="text-slate-300 leading-relaxed">
            Understands Hindi, Hinglish, and English with automatic language detection, entity disambiguation, and phonetic matching 
            for customer and commodity names.
          </p>
        </section>
      </div>
    ),
  },

  installation: {
    id: 'installation',
    title: 'Installation',
    subtitle: 'Setting up the Python virtual environment and frontend workspace',
    categoryNumber: '01',
    categoryTitle: 'Getting Started',
    headings: [
      { id: 'prerequisites', text: 'System Prerequisites', level: 2 },
      { id: 'backend-setup', text: 'Backend Setup (Python)', level: 2 },
      { id: 'frontend-setup', text: 'Frontend Setup (Node.js)', level: 2 },
      { id: 'verification', text: 'Environment Verification', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="prerequisites" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">System Prerequisites</h2>
          <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-sm">
            <li><strong>Python:</strong> Version 3.11 or higher (Python 3.11 / 3.14 recommended).</li>
            <li><strong>Node.js:</strong> Version 18.0.0 or higher with npm 9+.</li>
            <li><strong>Database:</strong> Supabase PostgreSQL instance (Cloud or Local Docker).</li>
            <li><strong>Git:</strong> Standard version control CLI.</li>
          </ul>
        </section>

        <section id="backend-setup" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Backend Setup (Python)</h2>
          <p className="text-slate-300 text-sm">Create and activate an isolated Python virtual environment:</p>
          <CodeBlock
            language="powershell"
            filename="Terminal (PowerShell)"
            code={`# 1. Create Python virtual environment
python -m venv .venv-voice

# 2. Activate virtual environment (Windows)
.\\.venv-voice\\Scripts\\Activate.ps1

# (On Linux/macOS use: source .venv-voice/bin/activate)

# 3. Install backend dependencies
pip install -r requirements.txt`}
          />
        </section>

        <section id="frontend-setup" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Frontend Setup (Node.js)</h2>
          <p className="text-slate-300 text-sm">Navigate to the frontend directory and install dependencies:</p>
          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`cd frontend
npm install
npm run build`}
          />
        </section>

        <section id="verification" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Environment Verification</h2>
          <p className="text-slate-300 text-sm">Run the automated verification suite to confirm all 39 tests pass:</p>
          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`.\\.venv-voice\\Scripts\\python.exe -m unittest discover tests`}
          />
        </section>
      </div>
    ),
  },

  'quick-start': {
    id: 'quick-start',
    title: 'Quick Start',
    subtitle: 'Launch the DukaanAI unified development server in under 2 minutes',
    categoryNumber: '01',
    categoryTitle: 'Getting Started',
    headings: [
      { id: 'env-setup', text: '1. Configure Environment File', level: 2 },
      { id: 'start-server', text: '2. Start Unified Server', level: 2 },
      { id: 'access-ui', text: '3. Access Application', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="env-setup" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">1. Configure Environment File</h2>
          <p className="text-slate-300 text-sm">
            Create a <code className="text-blue-300">.env</code> file in the project root with the following variables:
          </p>
          <CodeBlock
            language="env"
            filename=".env"
            code={`# Supabase Database Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Security & Session Tokens
SECRET_KEY=your_secure_jwt_secret_min_32_characters
ENVIRONMENT=development

# Voice AI & LLM Endpoints
GROQ_API_KEY=your_groq_api_key
BODHAN_AI_STT_API_KEY=your_bodhan_stt_api_key
BODHAN_AI_STT_URL=https://api.bodhan.ai/v1/audio/transcriptions
BODHAN_AI_TTS_API_KEY=your_bodhan_tts_api_key
BODHAN_AI_TTS_URL=https://api.bodhan.ai/v1/audio/speech`}
          />
          <Callout type="security" title="Safe Configuration Rules">
            Never commit real keys or production secrets to version control. Always keep <code className="text-blue-300">.env</code> inside <code className="text-blue-300">.gitignore</code>.
          </Callout>
        </section>

        <section id="start-server" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">2. Start Unified Server</h2>
          <p className="text-slate-300 text-sm">
            Start the FastAPI server. It serves both the backend API and the compiled React frontend:
          </p>
          <CodeBlock
            language="powershell"
            filename="Terminal (PowerShell)"
            code={`.\\.venv-voice\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`}
          />
        </section>

        <section id="access-ui" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">3. Access Application</h2>
          <p className="text-slate-300 text-sm">
            Open your browser and navigate to:
          </p>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-sm text-blue-300">
            http://127.0.0.1:8000
          </div>
          <p className="text-slate-400 text-xs">
            Log in with demo credentials or register a new shop to immediately begin voice-based retail accounting.
          </p>
        </section>
      </div>
    ),
  },

  configuration: {
    id: 'configuration',
    title: 'Configuration',
    subtitle: 'Configuring application parameters, ports, and runtime modes',
    categoryNumber: '01',
    categoryTitle: 'Getting Started',
    headings: [
      { id: 'config-reference', text: 'Configuration Reference', level: 2 },
      { id: 'runtime-modes', text: 'Runtime Modes', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="config-reference" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Configuration Reference</h2>
          <p className="text-slate-300 text-sm">
            DukaanAI reads configuration parameters from environment variables via <code className="text-blue-300">app/config.py</code>:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                  <th className="py-2.5 px-4 font-medium">Variable</th>
                  <th className="py-2.5 px-4 font-medium">Default</th>
                  <th className="py-2.5 px-4 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                <tr>
                  <td className="py-2.5 px-4 text-blue-300">SUPABASE_URL</td>
                  <td className="py-2.5 px-4 text-slate-500">-</td>
                  <td className="py-2.5 px-4 font-sans">Full Supabase project HTTPS URL.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-blue-300">SUPABASE_KEY</td>
                  <td className="py-2.5 px-4 text-slate-500">-</td>
                  <td className="py-2.5 px-4 font-sans">Public anonymous or service role key.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-blue-300">SECRET_KEY</td>
                  <td className="py-2.5 px-4 text-slate-500">dukaanai_dev_secret</td>
                  <td className="py-2.5 px-4 font-sans">HMAC signing secret for JWT tokens.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-blue-300">ENVIRONMENT</td>
                  <td className="py-2.5 px-4 text-slate-500">development</td>
                  <td className="py-2.5 px-4 font-sans">Enables reload and verbose errors in dev mode.</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-blue-300">GROQ_API_KEY</td>
                  <td className="py-2.5 px-4 text-slate-500">-</td>
                  <td className="py-2.5 px-4 font-sans">Groq Cloud API key for LLaMA-3 NLU execution.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="runtime-modes" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Runtime Modes</h2>
          <p className="text-slate-300 text-sm">
            When <code className="text-blue-300">ENVIRONMENT=production</code> is set, FastAPI disables Swagger UI documentation on public routes, 
            masks all database stack traces, and enforces strict HTTP headers.
          </p>
        </section>
      </div>
    ),
  },

  deployment: {
    id: 'deployment',
    title: 'Deployment',
    subtitle: 'Production deployment guide for Supabase, FastAPI, and Cloud Hosts',
    categoryNumber: '01',
    categoryTitle: 'Getting Started',
    headings: [
      { id: 'production-build', text: '1. Production Frontend Build', level: 2 },
      { id: 'server-daemon', text: '2. Running as System Service', level: 2 },
      { id: 'reverse-proxy', text: '3. Nginx Reverse Proxy & SSL', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="production-build" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">1. Production Frontend Build</h2>
          <p className="text-slate-300 text-sm">
            Compile the React TypeScript application into static distribution assets:
          </p>
          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`cd frontend
npm run build
# Compiled assets are output to frontend/dist/ and served by FastAPI static mounting`}
          />
        </section>

        <section id="server-daemon" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">2. Running as System Service</h2>
          <p className="text-slate-300 text-sm">
            Configure a systemd service file on Linux production hosts:
          </p>
          <CodeBlock
            language="ini"
            filename="/etc/systemd/system/dukaanai.service"
            code={`[Unit]
Description=DukaanAI Retail Voice Operating System
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/DukaanAI
Environment="PATH=/var/www/DukaanAI/.venv-voice/bin"
ExecStart=/var/www/DukaanAI/.venv-voice/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target`}
          />
        </section>

        <section id="reverse-proxy" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">3. Nginx Reverse Proxy & SSL</h2>
          <p className="text-slate-300 text-sm">
            Route incoming HTTPS traffic to the internal Uvicorn server:
          </p>
          <CodeBlock
            language="nginx"
            filename="nginx.conf"
            code={`server {
    listen 443 ssl http2;
    server_name dukaan.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/dukaan.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dukaan.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`}
          />
        </section>
      </div>
    ),
  },
};
