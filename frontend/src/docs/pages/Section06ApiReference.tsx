import React from 'react';
import { DocPageItem } from '../types';
import { CodeBlock } from '../components/CodeBlock';
import { Callout } from '../components/Callout';
import { ApiTable } from '../components/ApiTable';
import { Code2, Key, User, ShoppingBag, Users, Package, Layers, ArrowLeftRight, Mic, Bell, AlertTriangle } from 'lucide-react';

export const SECTION_06_PAGES: Record<string, DocPageItem> = {
  'api-overview': {
    id: 'api-overview',
    title: 'API Overview',
    subtitle: 'Base URL, authentication headers, and JSON standards',
    categoryNumber: '06',
    categoryTitle: 'API Reference',
    headings: [
      { id: 'base-url', text: 'Base URL & Protocol', level: 2 },
      { id: 'auth-headers', text: 'Authentication Headers', level: 2 },
      { id: 'json-format', text: 'Response Standards', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="base-url" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-400" />
            Base URL & Protocol
          </h2>
          <p className="text-slate-300 leading-relaxed">
            All API endpoints are relative to the root origin. When running locally:
          </p>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-sm text-blue-300">
            http://127.0.0.1:8000/api
          </div>
          <p className="text-slate-400 text-xs">All API communication occurs over HTTP/1.1 or HTTP/2 using JSON serialization.</p>
        </section>

        <section id="auth-headers" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Authentication Headers</h2>
          <p className="text-slate-300 text-sm">
            Protected endpoints require an HMAC-SHA256 JWT bearer token in the HTTP Authorization header:
          </p>
          <CodeBlock
            language="http"
            filename="HTTP Request Header"
            code={`Authorization: Bearer <your_jwt_access_token>`}
          />
        </section>

        <section id="json-format" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Response Standards</h2>
          <p className="text-slate-300 text-sm">Standard JSON response envelope:</p>
          <CodeBlock
            language="json"
            filename="Standard Response"
            code={`{
  "status": "success",
  "data": { ... },
  "message": "Operation completed successfully"
}`}
          />
        </section>
      </div>
    ),
  },

  'api-auth': {
    id: 'api-auth',
    title: 'Authentication',
    subtitle: 'Register, login, and token issuance endpoints',
    categoryNumber: '06',
    categoryTitle: 'API Reference',
    headings: [
      { id: 'post-login', text: 'POST /api/auth/login', level: 2 },
      { id: 'post-register', text: 'POST /api/auth/register', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="post-login" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            POST /api/auth/login
          </h2>
          <p className="text-slate-300 text-sm">Authenticates merchant credentials and issues a JWT token.</p>
          <ApiTable
            title="Request Body (application/json)"
            parameters={[
              { name: 'email', type: 'string', required: true, description: 'Registered email address', example: 'owner@dukaan.in' },
              { name: 'password', type: 'string', required: true, description: 'Plain text password', example: 'SecurePassword123' },
            ]}
          />
          <CodeBlock
            language="json"
            filename="Response 200 OK"
            code={`{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "name": "Ramesh Gupta",
    "email": "owner@dukaan.in",
    "shop_id": 1,
    "shop_name": "Gupta Kirana Store"
  }
}`}
          />
        </section>

        <section id="post-register" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">POST /api/auth/register</h2>
          <p className="text-slate-300 text-sm">Creates a new user, a default shop tenant, and settings row atomically.</p>
        </section>
      </div>
    ),
  },

  'api-user': {
    id: 'api-user',
    title: 'User APIs',
    subtitle: 'User profile inspection and credential verification',
    categoryNumber: '06',
    categoryTitle: 'API Reference',
    headings: [
      { id: 'get-me', text: 'GET /api/auth/me', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="get-me" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            GET /api/auth/me
          </h2>
          <p className="text-slate-300 text-sm">Returns authenticated user profile and associated shop metadata.</p>
          <CodeBlock
            language="bash"
            filename="cURL Request"
            code={`curl -X GET "http://127.0.0.1:8000/api/auth/me" \\
  -H "Authorization: Bearer <your_jwt_access_token>"`}
          />
        </section>
      </div>
    ),
  },

  'api-shop': {
    id: 'api-shop',
    title: 'Shop APIs',
    subtitle: 'Shop metadata and business settings management',
    categoryNumber: '06',
    categoryTitle: 'API Reference',
    headings: [
      { id: 'get-shop-settings', text: 'GET /api/shops/current', level: 2 },
      { id: 'put-shop-settings', text: 'PUT /api/shops/settings', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="get-shop-settings" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-400" />
            GET /api/shops/current
          </h2>
          <p className="text-slate-300 text-sm">Retrieves the shop profile, GSTIN, UPI ID, and theme settings.</p>
        </section>

        <section id="put-shop-settings" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">PUT /api/shops/settings</h2>
          <p className="text-slate-300 text-sm">Updates shop metadata, UPI VPA, and low stock alert thresholds.</p>
        </section>
      </div>
    ),
  },

  'api-customer': {
    id: 'api-customer',
    title: 'Customer APIs',
    subtitle: 'Customer khata profiles and balance retrieval',
    categoryNumber: '06',
    categoryTitle: 'API Reference',
    headings: [
      { id: 'get-customers', text: 'GET /api/customers', level: 2 },
      { id: 'post-customer', text: 'POST /api/customers', level: 2 },
      { id: 'get-customer-tx', text: 'GET /api/customers/{customer_id}/transactions', level: 2 },
      { id: 'get-customer-invoice', text: 'GET /api/customers/{customer_id}/invoice.pdf', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="get-customers" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            GET /api/customers
          </h2>
          <p className="text-slate-300 text-sm">Returns all customers belonging to the authenticated shop with their net khata balance.</p>
        </section>

        <section id="post-customer" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">POST /api/customers</h2>
          <ApiTable
            title="Request Parameters"
            parameters={[
              { name: 'name', type: 'string', required: true, description: 'Customer full name', example: 'Ramesh Sharma' },
              { name: 'phone', type: 'string', required: false, description: '10-digit mobile number', example: '9876543210' },
            ]}
          />
        </section>

        <section id="get-customer-invoice" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">GET /api/customers/{'{customer_id}'}/invoice.pdf</h2>
          <p className="text-slate-300 text-sm">Generates and streams an itemized customer ledger statement in binary PDF format.</p>
        </section>
      </div>
    ),
  },

  'api-product': {
    id: 'api-product',
    title: 'Product APIs',
    subtitle: 'Catalog listings and price discovery endpoints',
    categoryNumber: '06',
    categoryTitle: 'API Reference',
    headings: [
      { id: 'get-products', text: 'GET /api/products', level: 2 },
      { id: 'post-products', text: 'POST /api/products', level: 2 },
      { id: 'get-market-price', text: 'GET /api/market-price', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="get-products" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            GET /api/products
          </h2>
          <p className="text-slate-300 text-sm">Lists products registered to the current shop with pricing and unit metrics.</p>
        </section>

        <section id="get-market-price" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">GET /api/market-price?item=atta</h2>
          <p className="text-slate-300 text-sm">Looks up wholesale benchmark price for commodity auto-fill.</p>
        </section>
      </div>
    ),
  },

  'api-inventory': {
    id: 'api-inventory',
    title: 'Inventory APIs',
    subtitle: 'Stock balance updates and audit logs',
    categoryNumber: '06',
    categoryTitle: 'API Reference',
    headings: [
      { id: 'get-inventory', text: 'GET /api/inventory', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="get-inventory" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            GET /api/inventory
          </h2>
          <p className="text-slate-300 text-sm">Returns current inventory levels and low-stock alerts for all shop products.</p>
        </section>
      </div>
    ),
  },

  'api-transaction': {
    id: 'api-transaction',
    title: 'Transaction APIs',
    subtitle: 'Recording khata transactions and ledger history',
    categoryNumber: '06',
    categoryTitle: 'API Reference',
    headings: [
      { id: 'get-transactions', text: 'GET /api/transactions', level: 2 },
      { id: 'post-transactions', text: 'POST /api/transactions', level: 2 },
      { id: 'get-stats', text: 'GET /api/stats', level: 2 },
      { id: 'get-qr-code', text: 'GET /api/payments/qr-code', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="get-transactions" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            GET /api/transactions
          </h2>
          <p className="text-slate-300 text-sm">Lists paginated transaction logs with customer names, types, and amounts.</p>
        </section>

        <section id="post-transactions" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">POST /api/transactions</h2>
          <ApiTable
            title="Request Body"
            parameters={[
              { name: 'customer_id', type: 'integer', required: true, description: 'Recipient customer ID', example: '10' },
              { name: 'type', type: 'string', required: true, description: '"credit" or "debit"', example: 'credit' },
              { name: 'amount', type: 'number', required: true, description: 'Transaction amount in INR', example: '500.00' },
              { name: 'description', type: 'string', required: false, description: 'Memo / notes', example: '2kg Atta' },
              { name: 'idempotency_key', type: 'string', required: false, description: 'Optional unique request ID' },
            ]}
          />
        </section>

        <section id="get-qr-code" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">GET /api/payments/qr-code</h2>
          <p className="text-slate-300 text-sm">Generates a dynamic base64 PNG QR code encoding an NPCI UPI payment deep link.</p>
        </section>
      </div>
    ),
  },

  'api-voice': {
    id: 'api-voice',
    title: 'Voice APIs',
    subtitle: 'End-to-end voice processing and standalone STT/TTS',
    categoryNumber: '06',
    categoryTitle: 'API Reference',
    headings: [
      { id: 'post-voice-process', text: 'POST /api/voice/process', level: 2 },
      { id: 'post-voice-stt', text: 'POST /api/voice/stt', level: 2 },
      { id: 'post-voice-tts', text: 'POST /api/voice/tts', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="post-voice-process" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Mic className="w-5 h-5 text-blue-400" />
            POST /api/voice/process
          </h2>
          <p className="text-slate-300 leading-relaxed text-sm">
            End-to-end voice pipeline: accepts audio binary, transcribes with Bodhan STT, extracts intent via Groq LLaMA-3, 
            executes database mutations, synthesizes spoken Hindi confirmation with Bodhan TTS, and returns all results in a single call.
          </p>
          <CodeBlock
            language="json"
            filename="Response 200 OK"
            code={`{
  "transcript": "रमेश को 500 रुपये का उधार लिखो",
  "intent": {
    "intent": "add_transaction",
    "customer_name": "Ramesh",
    "type": "credit",
    "amount": 500
  },
  "execution": {
    "status": "success",
    "transaction_id": 4921,
    "new_balance": 1500.00
  },
  "audio_response_url": "/api/voice/audio/4921.mp3"
}`}
          />
        </section>
      </div>
    ),
  },

  'api-notification': {
    id: 'api-notification',
    title: 'Notification APIs',
    subtitle: 'System alert retrieval and read state marking',
    categoryNumber: '06',
    categoryTitle: 'API Reference',
    headings: [
      { id: 'get-notifications', text: 'GET /api/notifications', level: 2 },
      { id: 'patch-notification', text: 'PATCH /api/notifications/{id}/read', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="get-notifications" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            GET /api/notifications
          </h2>
          <p className="text-slate-300 text-sm">Returns unread and recent notifications for the shop.</p>
        </section>

        <section id="patch-notification" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">PATCH /api/notifications/{'{id}'}/read</h2>
          <p className="text-slate-300 text-sm">Marks an alert as acknowledged by the store owner.</p>
        </section>
      </div>
    ),
  },

  'api-errors': {
    id: 'api-errors',
    title: 'Error Responses',
    subtitle: 'Standardized HTTP status codes and error schemas',
    categoryNumber: '06',
    categoryTitle: 'API Reference',
    headings: [
      { id: 'error-schema', text: 'Error Response Format', level: 2 },
      { id: 'error-codes', text: 'Standard Status Codes', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="error-schema" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-400" />
            Error Response Format
          </h2>
          <p className="text-slate-300 text-sm">All error responses follow a uniform structure:</p>
          <CodeBlock
            language="json"
            filename="Standard Error Envelope"
            code={`{
  "detail": "Customer not found or unauthorized access",
  "error_code": "RESOURCE_NOT_FOUND",
  "status_code": 404
}`}
          />
        </section>

        <section id="error-codes" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Standard Status Codes</h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            <li><strong>400 Bad Request:</strong> Invalid request format or negative monetary values.</li>
            <li><strong>401 Unauthorized:</strong> Missing or expired JWT token.</li>
            <li><strong>403 Forbidden:</strong> Tenant mismatch (attempt to access another shop's customer).</li>
            <li><strong>404 Not Found:</strong> Resource ID does not exist in the current shop.</li>
            <li><strong>429 Too Many Requests:</strong> Exceeded rate limit (60 requests per minute).</li>
            <li><strong>500 Internal Error:</strong> Server exception (internal tracebacks are redacted).</li>
          </ul>
        </section>
      </div>
    ),
  },
};
