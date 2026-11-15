import React from 'react';
import { DocPageItem } from '../types';
import { CodeBlock } from '../components/CodeBlock';
import { Callout } from '../components/Callout';
import { FolderTree, Terminal, Key, FileCheck, CheckCircle2, Wrench, GitPullRequest } from 'lucide-react';

export const SECTION_09_PAGES: Record<string, DocPageItem> = {
  'project-structure': {
    id: 'project-structure',
    title: 'Project Structure',
    subtitle: 'Directory breakdown of backend, frontend, and tests',
    categoryNumber: '09',
    categoryTitle: 'Development',
    headings: [
      { id: 'directory-tree', text: 'Repository Tree', level: 2 },
      { id: 'module-responsibilities', text: 'Module Responsibilities', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="directory-tree" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-blue-400" />
            Repository Tree
          </h2>
          <CodeBlock
            language="text"
            filename="Project Tree"
            code={`DukaanAI/
├── app/                        # FastAPI Backend Application
│   ├── authentication/         # PBKDF2 Password Hashing & JWT Verification
│   ├── database/               # Supabase Client & Connection Pool
│   ├── grpc_service/           # Optional High-Throughput gRPC Service
│   ├── models/                 # Pydantic Request & Response Schemas
│   ├── queries/                # Parameterized Shop-Scoped SQL Queries
│   ├── security/               # Rate Limiting, Exception Filters, Redacted Logger
│   ├── services/               # Intent Dispatcher, STT, TTS, PDF Generator
│   ├── config.py               # Central Settings & Environment Bindings
│   └── main.py                 # FastAPI App Factory & Route Mounts
├── frontend/                   # React 19 + TypeScript + Tailwind Application
│   ├── src/
│   │   ├── components/         # Reusable UI Widgets (Modals, Headers, Sidebar)
│   │   ├── docs/               # Technical Documentation Website Engine
│   │   ├── pages/              # Overview, Voice, Khata, Products, Sales, Settings
│   │   ├── App.tsx             # Main Application Routing
│   │   └── main.tsx            # React DOM Mount
│   └── package.json            # Frontend Dependencies & Scripts
├── tests/                      # Automated Python Unittest Suite (39 Tests)
├── supabase_schema.sql         # 11 PostgreSQL Database Tables & Index DDL
├── requirements.txt            # Python Dependencies
└── .env                        # Local Environment Configuration`}
          />
        </section>

        <section id="module-responsibilities" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Module Responsibilities</h2>
          <p className="text-slate-300 text-sm">
            Backend logic is strictly segregated: data access happens only in <code className="text-blue-300">app/queries/</code>, 
            business rules reside in <code className="text-blue-300">app/services/</code>, and security policies are centralized in <code className="text-blue-300">app/security/</code>.
          </p>
        </section>
      </div>
    ),
  },

  'dev-environment': {
    id: 'dev-environment',
    title: 'Development Environment',
    subtitle: 'Python 3.11/3.14 virtual environment and Node.js setup',
    categoryNumber: '09',
    categoryTitle: 'Development',
    headings: [
      { id: 'local-setup', text: 'Local Setup Walkthrough', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="local-setup" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-400" />
            Local Setup Walkthrough
          </h2>
          <p className="text-slate-300 text-sm">
            Ensure Python 3.11+ and Node 18+ are installed. Execute:
          </p>
          <CodeBlock
            language="powershell"
            filename="Terminal (PowerShell)"
            code={`# 1. Setup Python Environment
python -m venv .venv-voice
.\\.venv-voice\\Scripts\\activate
pip install -r requirements.txt

# 2. Setup Frontend Workspace
cd frontend
npm install
npm run build
cd ..

# 3. Launch Server
.\\.venv-voice\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`}
          />
        </section>
      </div>
    ),
  },

  'env-variables': {
    id: 'env-variables',
    title: 'Environment Variables',
    subtitle: 'Complete template of all configuration parameters',
    categoryNumber: '09',
    categoryTitle: 'Development',
    headings: [
      { id: 'env-template', text: 'Safe Production & Dev Template', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="env-template" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            Safe Production & Dev Template
          </h2>
          <p className="text-slate-300 text-sm">
            Copy the following block to your local <code className="text-blue-300">.env</code> file. Replace placeholders with your actual keys:
          </p>
          <CodeBlock
            language="env"
            filename=".env"
            code={`# Supabase Cloud Database Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key

# Security & Session Tokens
SECRET_KEY=your_jwt_signing_secret_here
ENVIRONMENT=development

# Voice AI & LLM Cloud Endpoints
GROQ_API_KEY=your_groq_api_key
BODHAN_AI_STT_API_KEY=your_bodhan_stt_key
BODHAN_AI_STT_URL=https://api.bodhan.ai/v1/audio/transcriptions
BODHAN_AI_TTS_API_KEY=your_bodhan_tts_key
BODHAN_AI_TTS_URL=https://api.bodhan.ai/v1/audio/speech`}
          />
          <Callout type="security" title="Security Warning">
            Never paste raw database service role keys or real secrets into public chat channels, commit messages, or client-side assets.
          </Callout>
        </section>
      </div>
    ),
  },

  'code-standards': {
    id: 'code-standards',
    title: 'Code Standards',
    subtitle: 'PEP 8 guidelines, TypeScript strict mode, and commit policies',
    categoryNumber: '09',
    categoryTitle: 'Development',
    headings: [
      { id: 'python-standards', text: 'Python Engineering Guidelines', level: 2 },
      { id: 'typescript-standards', text: 'TypeScript Guidelines', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="python-standards" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-400" />
            Python Engineering Guidelines
          </h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            <li>Strict adherence to PEP 8 naming conventions.</li>
            <li>Async/await syntax used across all database queries and external HTTP calls.</li>
            <li>Zero hardcoded API secrets in source files.</li>
            <li>Zero comments rule applied where required by project policy.</li>
          </ul>
        </section>

        <section id="typescript-standards" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">TypeScript Guidelines</h2>
          <p className="text-slate-300 text-sm">
            All React components use typed props interfaces with zero <code className="text-blue-300">any</code> types in production code.
          </p>
        </section>
      </div>
    ),
  },

  testing: {
    id: 'testing',
    title: 'Testing',
    subtitle: 'Running backend unittest suite and frontend build verification',
    categoryNumber: '09',
    categoryTitle: 'Development',
    headings: [
      { id: 'running-tests', text: 'Running the Test Suite', level: 2 },
      { id: 'coverage-areas', text: 'Verified Test Coverage', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="running-tests" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
            Running the Test Suite
          </h2>
          <p className="text-slate-300 text-sm">Execute Python's built-in unittest discover command:</p>
          <CodeBlock
            language="powershell"
            filename="Terminal (PowerShell)"
            code={`.\\.venv-voice\\Scripts\\python.exe -m unittest discover tests`}
          />
        </section>

        <section id="coverage-areas" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Verified Test Coverage</h2>
          <p className="text-slate-300 text-sm">
            All 39 tests cover authentication, PBKDF2 hashing, JWT validity, shop-level query scoping, rate limiting, and intent parsing.
          </p>
        </section>
      </div>
    ),
  },

  troubleshooting: {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    subtitle: 'Common errors, port conflicts, and resolution steps',
    categoryNumber: '09',
    categoryTitle: 'Development',
    headings: [
      { id: 'port-conflicts', text: 'Port 8000 Conflict', level: 2 },
      { id: 'mic-permissions', text: 'Microphone Permission Denied', level: 2 },
      { id: 'db-connection-timeout', text: 'Supabase Connection Timeout', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="port-conflicts" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-400" />
            Port 8000 Conflict
          </h2>
          <p className="text-slate-300 text-sm">
            If port 8000 is occupied, bind to an alternate port:
          </p>
          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`uvicorn app.main:app --port 8080 --reload`}
          />
        </section>

        <section id="mic-permissions" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Microphone Permission Denied</h2>
          <p className="text-slate-300 text-sm">
            Modern browsers restrict microphone access on non-secure origins. Ensure you are accessing via <code className="text-blue-300">http://localhost:8000</code>, <code className="text-blue-300">http://127.0.0.1:8000</code>, or over HTTPS.
          </p>
        </section>

        <section id="db-connection-timeout" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Supabase Connection Timeout</h2>
          <p className="text-slate-300 text-sm">
            Verify that your <code className="text-blue-300">SUPABASE_URL</code> begins with <code className="text-blue-300">https://</code> and that the project is not in a paused state.
          </p>
        </section>
      </div>
    ),
  },

  'contribution-guide': {
    id: 'contribution-guide',
    title: 'Contribution Guide',
    subtitle: 'Branching, PR guidelines, and code review process',
    categoryNumber: '09',
    categoryTitle: 'Development',
    headings: [
      { id: 'pr-workflow', text: 'Pull Request Lifecycle', level: 2 },
      { id: 'commit-standards', text: 'Commit Standards', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="pr-workflow" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <GitPullRequest className="w-5 h-5 text-blue-400" />
            Pull Request Lifecycle
          </h2>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
            <li>Create a feature branch from <code className="text-blue-300">main</code>.</li>
            <li>Ensure all 39 automated tests pass before opening a PR.</li>
            <li>Verify frontend builds without errors (<code className="text-blue-300">npm run build</code>).</li>
            <li>Submit PR with clear testing verification steps.</li>
          </ol>
        </section>

        <section id="commit-standards" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Commit Standards</h2>
          <p className="text-slate-300 text-sm">
            Use conventional commits: <code className="text-blue-300">feat:</code>, <code className="text-blue-300">fix:</code>, <code className="text-blue-300">docs:</code>, <code className="text-blue-300">refactor:</code>.
          </p>
        </section>
      </div>
    ),
  },
};
