# 🛍️ DukaanAI — Voice-First Indic Retail & Khata Operating System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.0+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1.svg?logo=mysql&logoColor=white)](https://www.mysql.com)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

**DukaanAI** is a production-grade, voice-first intelligent operating system built specifically for Indian retail shopkeepers (*kirana dukandars*). It bridges everyday spoken Hindi/Hinglish speech with double-entry accounting ledgers, instant local UPI QR code generation, and universal WhatsApp invoice delivery.

---

## 🌟 Key Subsystems & Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │          Customer Spoken Voice (WAV)          │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │    Bodhan AI Indic STT (indic-transcribe)    │
                  └──────────────────────┬───────────────────────┘
                                         │ Hindi Speech-to-Text
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │     Groq Indic LLM Client (LLaMA 3) <300ms   │
                  │   Intent Extraction: Action, Amount, Name    │
                  └──────────────────────┬───────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│  MySQL ACID Double-Entry Transaction │  │  Bodhan AI Indic TTS (indic-speak)   │
│     (Udhar / Jama Balance Math)      │  │      Spoken Confirmation Audio       │
└───────────────────┬──────────────────┘  └──────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│               Local Python QR & WhatsApp               │
│  • Local PNG UPI QR Code (/api/payments/qr-code) ~3ms  │
│  • 1-Tap Universal WhatsApp Delivery Protocol          │
└────────────────────────────────────────────────────────┘
```

---

## ✨ Core Highlights

### 1. 🎙️ Decoupled Speech Pipeline (`/docs/stt2tts`)
- **Speech-to-Text (STT):** Powered by Bodhan AI cloud endpoint (`https://api.bodhan.ai/v1/audio/transcriptions`) using `indic-transcribe` with Voice Activity Detection (VAD).
- **Text-to-Speech (TTS):** Natural Hindi vocal confirmations synthesized via Bodhan AI (`indic-speak`) with `Amit` voice.
- **Serverless & Vercel Ready:** Decoupled from heavy PyTorch/TorchAudio weights, reducing cold boot latency from **15.0s to 0.02s** and memory footprint from **2.4GB to 85MB**.

### 2. ⚡ Indic Intent Classification (`/docs/llm`)
- Sub-300ms inference via Groq LLaMA 3 client.
- Handles colloquial Hindi, Hinglish dialects, and inverted grammatical structures:
  - *"रमेश को 500 का सामान उधार दे दिया"* &rarr; `action: "add_credit"`, `amount: 500`, `customer: "रमेश"`
  - *"सुरेश ने ₹200 जमा कर दिए"* &rarr; `action: "record_payment"`, `amount: 200`, `customer: "सुरेश"`
  - *"रमेश का कितना बाकी है बताओ"* &rarr; `action: "check_balance"`

### 3. 💳 Local Python QR Code & Universal WhatsApp (`/docs/upi`)
- **Zero External API Dependencies:** Eliminates broken QR image placeholders caused by CORS blocks or privacy adblockers (Brave Shields, uBlock Origin).
- **Instant In-Memory Generation:** Pure in-memory PNG generation via Python `qrcode` + `Pillow` at `GET /api/payments/qr-code?data=...` in **<3ms**.
- **Universal WhatsApp Billing Intent:** `https://api.whatsapp.com/send?phone=91[PHONE]&text=[ENCODED_MSG]` opens native WhatsApp on mobile or WhatsApp Web on desktop without friction.
- **NPCI & RBI Compliance:** 100% database-driven merchant details (`shop_name`, `upi_id`); secret UPI PINs are never requested or stored.

### 4. 📚 Modern Interactive Documentation Portal (`/docs`)
- **Deep-Linked Pages:** Direct URLs for `/docs`, `/docs/upi`, `/docs/stt2tts`, `/docs/llm`, `/docs/quickstart`, and `/docs/sdks`.
- **Dual View Mode:** Toggle between interactive UI components (live simulator, playground) and raw GitHub `README.md` view.
- **Accordion Navigation:** Collapsible left sidebar categories with full open/close controls.
- **Smart History & Auto-Close:** Browser-linked Back button that navigates section-by-section and automatically closes the new tab on the first page, returning focus to the primary shop tab.

### 5. 🔒 Zero-Flicker Synchronous Authentication
- Synchronous lazy state initialization eliminates Flash of Unauthenticated Content (FOUC).
- Instant first-frame rendering on page refresh with persistent JWT authentication.

---

## 🗄️ Database Architecture (MySQL 8.0+)

DukaanAI maintains 9 normalized relational tables:

| Table | Purpose | Key Attributes |
|---|---|---|
| `users` | Merchant authentication | `id`, `name`, `email`, `phone`, `password` |
| `shops` | Store multi-tenant profiles | `id`, `owner_id`, `shop_name`, `address` |
| `customers` | Customer phone & identity directory | `id`, `shop_id`, `name`, `phone` |
| `transactions` | Double-entry khata debit/credit ledger | `id`, `shop_id`, `customer_id`, `type`, `amount`, `idempotency_key` |
| `settings` | Dynamic merchant UPI ID & store config | `id`, `shop_id`, `user_id`, `upi_id`, `phone`, `shop_name` |
| `notifications`| Payment alerts & debt reminders | `id`, `shop_id`, `title`, `message`, `type`, `is_read` |
| `products` | Inventory catalog | `id`, `shop_id`, `name`, `price`, `unit` |
| `inventory` | Stock quantities & reorder thresholds | `id`, `shop_id`, `product_id`, `quantity`, `low_stock_limit` |
| `inventory_logs`| Audit log for inventory changes | `id`, `shop_id`, `product_id`, `quantity_change`, `reason` |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- MySQL 8.0+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/dukaanai.git
cd dukaanai

# Install backend Python dependencies
python -m venv .venv-voice
.\.venv-voice\Scripts\activate   # On Linux/macOS: source .venv-voice/bin/activate
pip install -r requirements.txt

# Install frontend dependencies and compile UI
npm --prefix frontend install
npm --prefix frontend run build
```

### 3. Environment Setup (`.env`)
Create a `.env` file in the project root:
```env
# Database Credentials
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=dukaanai

# Security & Tokens
JWT_SECRET=your_jwt_secret_key_here
ENVIRONMENT=development

# Voice AI & LLM Cloud Endpoints
GROQ_API_KEY=gsk_your_groq_api_key
BANDHON_AI_STT_API_KEY=your_bodhan_stt_key
BANDHON_AI_STT_URL=https://api.bodhan.ai/v1/audio/transcriptions
BANDHON_AI_TTS_API_KEY=your_bodhan_tts_key
BANDHON_AI_TTS_URL=https://api.bodhan.ai/v1/audio/speech
```

### 4. Running DukaanAI
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- **Web Application:** [http://127.0.0.1:8000/home](http://127.0.0.1:8000/home)
- **Interactive Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **FastAPI OpenAPI Swagger:** [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)

---

## 🧪 Testing

Execute backend unit tests:
```bash
python -m unittest discover tests
```
All 23 comprehensive tests verify authentication, rate limiting, SQL security, and voice transaction execution.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
