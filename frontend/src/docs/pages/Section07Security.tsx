import React from 'react';
import { DocPageItem } from '../types';
import { CodeBlock } from '../components/CodeBlock';
import { Callout } from '../components/Callout';
import { ShieldCheck, Lock, Key, Clock, Filter, EyeOff, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';

export const SECTION_07_PAGES: Record<string, DocPageItem> = {
  'security-overview': {
    id: 'security-overview',
    title: 'Security Overview',
    subtitle: 'Defense-in-depth security model for retail financial data',
    categoryNumber: '07',
    categoryTitle: 'Security',
    headings: [
      { id: 'defense-in-depth', text: 'Defense-in-Depth Model', level: 2 },
      { id: 'compliance-standards', text: 'Financial Integrity Standards', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="defense-in-depth" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            Defense-in-Depth Model
          </h2>
          <p className="text-slate-300 leading-relaxed">
            DukaanAI manages sensitive retail accounting records, khata balances, and customer phone directories. 
            The system employs a multi-layered security architecture comprising cryptographic password hashing, 
            stateless HMAC JWT tokens, in-memory sliding window rate limiting, Pydantic input sanitization, 
            mandatory shop-level tenant isolation, and strict redaction of credentials in application logs.
          </p>
        </section>

        <section id="compliance-standards" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Financial Integrity Standards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <strong className="text-blue-300">Tenant Segregation:</strong> Absolute isolation between rival shopkeepers.
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <strong className="text-emerald-300">Auditable Ledger:</strong> Immutable transaction history with idempotency.
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <strong className="text-amber-300">Zero Secret Leakage:</strong> No database keys or JWT secrets in client responses.
            </div>
          </div>
        </section>
      </div>
    ),
  },

  'security-auth': {
    id: 'security-auth',
    title: 'Authentication & Authorization',
    subtitle: 'HMAC-SHA256 JWT tokens and PBKDF2 password hashing',
    categoryNumber: '07',
    categoryTitle: 'Security',
    headings: [
      { id: 'password-hashing', text: 'Password Security (PBKDF2-SHA256)', level: 2 },
      { id: 'jwt-specs', text: 'JWT Token Specification', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="password-hashing" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-400" />
            Password Security (PBKDF2-SHA256)
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Passwords are never stored in plaintext. DukaanAI uses <strong>PBKDF2 with SHA-256 and 200,000 hash iterations</strong>, 
            incorporating a unique cryptographic salt per user to resist rainbow table and brute-force attacks.
          </p>
          <CodeBlock
            language="python"
            filename="app/authentication/auth.py"
            code={`import hashlib, secrets

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    iterations = 200000
    derived = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
    return f"{salt}:{iterations}:{derived.hex()}"`}
          />
        </section>

        <section id="jwt-specs" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">JWT Token Specification</h2>
          <p className="text-slate-300 text-sm">
            Upon successful login, the server issues an HMAC-SHA256 signed JWT containing <code className="text-blue-300">sub</code> (user_id), 
            <code className="text-blue-300">shop_id</code>, and an expiration timestamp (<code className="text-blue-300">exp</code>) set to 24 hours.
          </p>
        </section>
      </div>
    ),
  },

  'security-encryption': {
    id: 'security-encryption',
    title: 'Encryption',
    subtitle: 'TLS in transit and encrypted database storage at rest',
    categoryNumber: '07',
    categoryTitle: 'Security',
    headings: [
      { id: 'in-transit', text: 'Encryption in Transit (TLS 1.3)', level: 2 },
      { id: 'at-rest', text: 'Encryption at Rest (AES-256)', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="in-transit" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            Encryption in Transit (TLS 1.3)
          </h2>
          <p className="text-slate-300 leading-relaxed">
            All client-to-server and server-to-cloud traffic (FastAPI to Supabase, Groq, and Bodhan AI) is strictly encrypted 
            over TLS 1.3. Plain HTTP connections are upgraded to HTTPS.
          </p>
        </section>

        <section id="at-rest" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Encryption at Rest (AES-256)</h2>
          <p className="text-slate-300 text-sm">
            Supabase Cloud PostgreSQL storage volumes are encrypted at rest using industry-standard AES-256.
          </p>
        </section>
      </div>
    ),
  },

  'security-rate-limiting': {
    id: 'security-rate-limiting',
    title: 'Rate Limiting',
    subtitle: 'In-memory sliding window protection against abuse',
    categoryNumber: '07',
    categoryTitle: 'Security',
    headings: [
      { id: 'rate-limiter-specs', text: 'Rate Limiting Policy', level: 2 },
      { id: 'sliding-window', text: 'Sliding Window Algorithm', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="rate-limiter-specs" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Rate Limiting Policy
          </h2>
          <p className="text-slate-300 leading-relaxed">
            To prevent Denial of Service (DoS) and brute-force attacks on login and voice synthesis endpoints, 
            <code className="text-blue-300">app/security/rate_limiter.py</code> enforces sliding window rate limits:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            <li><strong>Voice Processing (<code className="text-blue-300">/api/voice/process</code>):</strong> 30 requests per minute per IP.</li>
            <li><strong>Authentication (<code className="text-blue-300">/api/auth/login</code>):</strong> 10 attempts per minute per IP.</li>
            <li><strong>Standard APIs:</strong> 60 requests per minute per authenticated shop.</li>
          </ul>
        </section>

        <section id="sliding-window" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Sliding Window Algorithm</h2>
          <p className="text-slate-300 text-sm">
            Maintains per-IP circular timestamp buffers in memory. If request volume exceeds the quota, 
            the server immediately terminates processing with <code className="text-blue-300">429 Too Many Requests</code> and a <code className="text-blue-300">Retry-After</code> header.
          </p>
        </section>
      </div>
    ),
  },

  'security-input-validation': {
    id: 'security-input-validation',
    title: 'Input Validation',
    subtitle: 'Pydantic strict typing and sanitization of user strings',
    categoryNumber: '07',
    categoryTitle: 'Security',
    headings: [
      { id: 'pydantic-validation', text: 'Type-Safe Pydantic Schemas', level: 2 },
      { id: 'sql-injection', text: 'SQL Injection Prevention', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="pydantic-validation" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-400" />
            Type-Safe Pydantic Schemas
          </h2>
          <p className="text-slate-300 leading-relaxed">
            All user inputs are parsed through Pydantic v2 data models. String lengths are bounded (names capped at 100 characters, 
            phone numbers sanitized with regex), and transaction quantities are strictly validated as non-negative floats.
          </p>
        </section>

        <section id="sql-injection" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">SQL Injection Prevention</h2>
          <p className="text-slate-300 text-sm">
            All queries execute via Supabase PostgREST client bindings with parameterized arguments, preventing SQL injection vulnerabilities.
          </p>
        </section>
      </div>
    ),
  },

  'security-isolation': {
    id: 'security-isolation',
    title: 'Shop-Level Data Isolation',
    subtitle: 'Mandatory tenant boundary enforcement on all SQL queries',
    categoryNumber: '07',
    categoryTitle: 'Security',
    headings: [
      { id: 'tenant-boundaries', text: 'Tenant Boundary Enforcement', level: 2 },
      { id: 'cross-shop-prevention', text: 'Cross-Shop Access Prevention', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="tenant-boundaries" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-400" />
            Tenant Boundary Enforcement
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Every database query throughout <code className="text-blue-300">app/queries/</code> mandates an explicit <code className="text-blue-300">shop_id</code> check. 
            The <code className="text-blue-300">shop_id</code> is extracted directly from the verified JWT payload—never from untrusted client URL parameters or request bodies.
          </p>
          <CodeBlock
            language="python"
            filename="app/queries/customer.py (Shop Scoping)"
            code={`async def get_customers_by_shop(shop_id: int):
    # shop_id is verified from the caller's JWT token
    return supabase.table("customers").select("*").eq("shop_id", shop_id).execute()`}
          />
        </section>

        <section id="cross-shop-prevention" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Cross-Shop Access Prevention</h2>
          <p className="text-slate-300 text-sm">
            If a malicious user attempts to query or mutate a customer ID belonging to another shop, 
            the query condition <code className="text-blue-300">.eq("id", customer_id).eq("shop_id", current_shop_id)</code> evaluates to empty, 
            triggering a 404 response without leaking the existence of rival store records.
          </p>
        </section>
      </div>
    ),
  },

  'security-error-handling': {
    id: 'security-error-handling',
    title: 'Secure Error Handling',
    subtitle: 'Redaction of database internals and stack traces from clients',
    categoryNumber: '07',
    categoryTitle: 'Security',
    headings: [
      { id: 'traceback-masking', text: 'Production Traceback Masking', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="traceback-masking" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-blue-400" />
            Production Traceback Masking
          </h2>
          <p className="text-slate-300 leading-relaxed">
            In production mode, the central exception handler in <code className="text-blue-300">app/security/exceptions.py</code> captures all unhandled exceptions, 
            writes a structured log on the server, and returns a sanitized JSON error response to the client. 
            Internal file paths, database connection URLs, and SQL syntax errors are never exposed.
          </p>
        </section>
      </div>
    ),
  },

  'security-logging': {
    id: 'security-logging',
    title: 'Logging & Monitoring',
    subtitle: 'Redacted structured logs omitting passwords and secret keys',
    categoryNumber: '07',
    categoryTitle: 'Security',
    headings: [
      { id: 'secret-redaction', text: 'Automated Secret Redaction', level: 2 },
      { id: 'audit-logging', text: 'Operational Audit Trails', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="secret-redaction" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Automated Secret Redaction
          </h2>
          <p className="text-slate-300 leading-relaxed">
            The logging filter in <code className="text-blue-300">app/security/logger.py</code> scans log payloads for sensitive patterns 
            (passwords, authorization headers, API keys, and Supabase secrets) and replaces them with <code className="text-blue-300">***REDACTED***</code>.
          </p>
        </section>

        <section id="audit-logging" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Operational Audit Trails</h2>
          <p className="text-slate-300 text-sm">
            Critical events—including user logins, large credit adjustments, and inventory stock changes—are logged with timestamp, shop ID, and IP hash for audit compliance.
          </p>
        </section>
      </div>
    ),
  },

  'security-testing': {
    id: 'security-testing',
    title: 'Security Testing',
    subtitle: 'Automated test suite verifying authorization and boundary checks',
    categoryNumber: '07',
    categoryTitle: 'Security',
    headings: [
      { id: 'test-coverage', text: 'Automated Test Verification', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="test-coverage" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
            Automated Test Verification
          </h2>
          <p className="text-slate-300 leading-relaxed">
            The project includes <strong>39 automated unit and security tests</strong> located in <code className="text-blue-300">tests/</code>. 
            These tests verify:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
            <li>PBKDF2 password generation and constant-time verification.</li>
            <li>JWT token expiry and invalid signature rejection.</li>
            <li>Shop isolation enforcement across customer and transaction queries.</li>
            <li>Voice intent validation and boundary condition handling.</li>
          </ul>
        </section>
      </div>
    ),
  },
};
