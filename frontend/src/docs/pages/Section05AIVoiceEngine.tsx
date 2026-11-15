import React from 'react';
import { DocPageItem } from '../types';
import { CodeBlock } from '../components/CodeBlock';
import { Callout } from '../components/Callout';
import { Mic, Volume2, Bot, Target, FileSearch, CheckCircle2, Play, Globe } from 'lucide-react';

export const SECTION_05_PAGES: Record<string, DocPageItem> = {
  'speech-to-text': {
    id: 'speech-to-text',
    title: 'Speech-to-Text',
    subtitle: 'Bodhan AI Cloud STT integration and audio payload specs',
    categoryNumber: '05',
    categoryTitle: 'AI & Voice Engine',
    headings: [
      { id: 'stt-overview', text: 'Bodhan AI STT Engine', level: 2 },
      { id: 'audio-specs', text: 'Audio Payload Specifications', level: 2 },
      { id: 'stt-request-sample', text: 'STT Request Implementation', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="stt-overview" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Mic className="w-5 h-5 text-blue-400" />
            Bodhan AI STT Engine
          </h2>
          <p className="text-slate-300 leading-relaxed">
            DukaanAI connects to the <strong>Bodhan AI Speech-to-Text Cloud API</strong> (<code className="text-blue-300">https://api.bodhan.ai/v1/audio/transcriptions</code>). 
            Bodhan AI is tuned for Indian phonetics, accents, and mixed language retail vocabulary (e.g., "khata", "udhaar", "jama", "kilo", "bhav").
          </p>
        </section>

        <section id="audio-specs" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Audio Payload Specifications</h2>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300">
            <li><strong>Formats:</strong> WAV, MP3, WebM, OGG.</li>
            <li><strong>Sample Rate:</strong> 16,000 Hz (16 kHz mono recommended for lowest bandwidth).</li>
            <li><strong>Content-Type:</strong> <code className="text-blue-300">multipart/form-data</code> with <code className="text-blue-300">file</code> parameter.</li>
          </ul>
        </section>

        <section id="stt-request-sample" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">STT Request Implementation</h2>
          <CodeBlock
            language="python"
            filename="app/services/business_logic.py (STT Snippet)"
            code={`async def transcribe_audio(audio_bytes: bytes) -> str:
    headers = {"Authorization": f"Bearer {BODHAN_AI_STT_API_KEY}"}
    files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(BODHAN_AI_STT_URL, headers=headers, files=files)
        data = response.json()
        return data.get("text", "")`}
          />
        </section>
      </div>
    ),
  },

  'text-to-speech': {
    id: 'text-to-speech',
    title: 'Text-to-Speech',
    subtitle: 'Natural Hindi/English speech synthesis for audio confirmation',
    categoryNumber: '05',
    categoryTitle: 'AI & Voice Engine',
    headings: [
      { id: 'tts-overview', text: 'Bodhan AI TTS Engine', level: 2 },
      { id: 'tts-payload', text: 'Audio Synthesis Call', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="tts-overview" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-blue-400" />
            Bodhan AI TTS Engine
          </h2>
          <p className="text-slate-300 leading-relaxed">
            DukaanAI delivers immediate auditory feedback to the retailer. After updating customer ledgers or verifying inventory, 
            the server calls <code className="text-blue-300">https://api.bodhan.ai/v1/audio/speech</code> to synthesize an MP3 audio wave 
            returned directly in the response payload.
          </p>
        </section>

        <section id="tts-payload" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Audio Synthesis Call</h2>
          <CodeBlock
            language="json"
            filename="TTS Request Payload"
            code={`{
  "input": "रमेश के खाते में ₹500 का उधार जोड़ दिया गया है",
  "voice": "hi-IN-Standard-A",
  "response_format": "mp3"
}`}
          />
        </section>
      </div>
    ),
  },

  'llm-integration': {
    id: 'llm-integration',
    title: 'LLM Integration',
    subtitle: 'Groq LLaMA-3-70b-versatile prompt engineering and few-shot parsing',
    categoryNumber: '05',
    categoryTitle: 'AI & Voice Engine',
    headings: [
      { id: 'groq-lpu', text: 'Groq LPU Acceleration', level: 2 },
      { id: 'system-prompt', text: 'System Prompt Architecture', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="groq-lpu" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            Groq LPU Acceleration
          </h2>
          <p className="text-slate-300 leading-relaxed">
            LLaMA-3-70b is hosted on Groq's Language Processing Units (LPUs), delivering intent classification 
            in under 250 milliseconds. This near-instant inference ensures conversational fluidity.
          </p>
        </section>

        <section id="system-prompt" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">System Prompt Architecture</h2>
          <p className="text-slate-300 text-sm">
            The system prompt instructs the model to act as a Kirana accounting parser and emit purely valid JSON:
          </p>
          <CodeBlock
            language="text"
            filename="System Prompt"
            code={`You are DukaanAI, an expert Indian Kirana store accountant.
Analyze the user utterance (in Hindi, Hinglish, or English) and extract:
- intent: 'add_transaction', 'add_customer', 'add_product', 'update_inventory', 'check_balance', 'generate_bill', 'general_query'
- customer_name: string or null
- type: 'credit' (udhaar) or 'debit' (jama / payment)
- amount: number or null
- item_name: string or null
- quantity: number or null
- unit: 'kg', 'packet', 'litre', 'unit' or null

Output ONLY valid JSON. Never output conversational prose.`}
          />
        </section>
      </div>
    ),
  },

  'intent-detection': {
    id: 'intent-detection',
    title: 'Intent Detection',
    subtitle: 'Classification of retail intents across billing, khata, and stock',
    categoryNumber: '05',
    categoryTitle: 'AI & Voice Engine',
    headings: [
      { id: 'supported-intents', text: 'Supported Retail Intents', level: 2 },
      { id: 'intent-examples', text: 'Utterance Mapping Matrix', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="supported-intents" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Supported Retail Intents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <span className="font-mono text-blue-300 font-bold">add_transaction</span>
              <p className="text-slate-400 mt-1">Record credit (udhaar) or payment (jama) for a customer.</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <span className="font-mono text-emerald-300 font-bold">check_balance</span>
              <p className="text-slate-400 mt-1">Inquire about a customer's outstanding balance or total ledger debt.</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <span className="font-mono text-amber-300 font-bold">update_inventory</span>
              <p className="text-slate-400 mt-1">Add received stock or manually adjust inventory quantity.</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40">
              <span className="font-mono text-purple-300 font-bold">generate_bill</span>
              <p className="text-slate-400 mt-1">Calculate customer cart total and render a dynamic UPI QR code.</p>
            </div>
          </div>
        </section>

        <section id="intent-examples" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Utterance Mapping Matrix</h2>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300">
              "Vikram ko 100 rupaye udhaar do" ➔ <span className="text-blue-300 font-semibold">&#123; intent: "add_transaction", type: "credit", amount: 100, customer_name: "Vikram" &#125;</span>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300">
              "Ramesh ka kitna baaki hai?" ➔ <span className="text-emerald-300 font-semibold">&#123; intent: "check_balance", customer_name: "Ramesh" &#125;</span>
            </div>
          </div>
        </section>
      </div>
    ),
  },

  'entity-extraction': {
    id: 'entity-extraction',
    title: 'Entity Extraction',
    subtitle: 'Extracting amount, customer name, items, and transaction type',
    categoryNumber: '05',
    categoryTitle: 'AI & Voice Engine',
    headings: [
      { id: 'entity-taxonomy', text: 'Extracted Entity Taxonomy', level: 2 },
      { id: 'fuzzy-matching', text: 'Fuzzy Customer & Product Matching', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="entity-taxonomy" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-blue-400" />
            Extracted Entity Taxonomy
          </h2>
          <p className="text-slate-300 leading-relaxed text-sm">
            DukaanAI extracts six core entity types from unstructured retailer speech:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300 font-mono">
            <li><span className="text-blue-300">customer_name:</span> Proper nouns denoting customers (e.g., "Ramesh", "Sharma ji").</li>
            <li><span className="text-emerald-300">amount:</span> Numerical monetary values in INR.</li>
            <li><span className="text-amber-300">type:</span> "credit" (udhaar/baaki) vs "debit" (jama/vasooli/paid).</li>
            <li><span className="text-purple-300">item_name:</span> Retail commodities (e.g., "atta", "cheeni", "doodh").</li>
            <li><span className="text-rose-300">quantity & unit:</span> Measurements (e.g., "2 kilo", "5 packet").</li>
          </ul>
        </section>

        <section id="fuzzy-matching" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Fuzzy Customer & Product Matching</h2>
          <p className="text-slate-300 text-sm">
            The backend executes case-insensitive string matching across existing shop customer records. 
            If "Ramesh" is transcribed as "Ramesh Kumar" or "Ramesh Bhai", the system resolves to the closest customer ID.
          </p>
        </section>
      </div>
    ),
  },

  'intent-validation': {
    id: 'intent-validation',
    title: 'Intent Validation',
    subtitle: 'Strict schema verification before financial ledger mutations',
    categoryNumber: '05',
    categoryTitle: 'AI & Voice Engine',
    headings: [
      { id: 'validation-rules', text: 'Pydantic Validation Gate', level: 2 },
      { id: 'clarification-triggers', text: 'Ambiguity & Clarification Triggers', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="validation-rules" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
            Pydantic Validation Gate
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Raw LLM outputs are never written directly into the database. They must pass through Pydantic validators 
            defined in <code className="text-blue-300">app/services/validators.py</code>:
          </p>
          <CodeBlock
            language="python"
            filename="app/services/validators.py"
            code={`from pydantic import BaseModel, Field
from typing import Optional

class VoiceIntentPayload(BaseModel):
    intent: str
    customer_name: Optional[str] = None
    type: Optional[str] = Field(None, pattern="^(credit|debit)$")
    amount: Optional[float] = Field(None, ge=0.0)
    item_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None`}
          />
        </section>

        <section id="clarification-triggers" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Ambiguity & Clarification Triggers</h2>
          <p className="text-slate-300 text-sm">
            If the speaker states <em>"Udhaar likh do"</em> without naming the customer or amount, 
            the validation gate halts execution and prompts: <em>"Kripya grahak ka naam aur rashi batayein."</em>
          </p>
        </section>
      </div>
    ),
  },

  'action-execution': {
    id: 'action-execution',
    title: 'Action Execution',
    subtitle: 'Atomic execution of business logic through intent executors',
    categoryNumber: '05',
    categoryTitle: 'AI & Voice Engine',
    headings: [
      { id: 'executor-dispatch', text: 'Intent Dispatcher', level: 2 },
      { id: 'transaction-commit', text: 'Atomic Ledger Commit', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="executor-dispatch" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-400" />
            Intent Dispatcher
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Located in <code className="text-blue-300">app/services/intent_executor.py</code>, the dispatcher routes the validated intent:
          </p>
          <CodeBlock
            language="python"
            filename="app/services/intent_executor.py"
            code={`async def execute_intent(intent_data: dict, shop_id: int):
    intent = intent_data.get("intent")
    if intent == "add_transaction":
        return await handle_add_transaction(intent_data, shop_id)
    elif intent == "check_balance":
        return await handle_check_balance(intent_data, shop_id)
    elif intent == "update_inventory":
        return await handle_update_inventory(intent_data, shop_id)
    elif intent == "generate_bill":
        return await handle_generate_bill(intent_data, shop_id)
    return {"status": "unhandled_intent"}`}
          />
        </section>

        <section id="transaction-commit" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Atomic Ledger Commit</h2>
          <p className="text-slate-300 text-sm">
            If the named customer doesn't exist, the executor creates a customer row on-the-fly within the current shop, 
            inserts the transaction record, logs any inventory quantity change, and generates a real-time notification.
          </p>
        </section>
      </div>
    ),
  },

  'multilingual-processing': {
    id: 'multilingual-processing',
    title: 'Multilingual Processing',
    subtitle: 'Language detection and transliteration handling for Hinglish',
    categoryNumber: '05',
    categoryTitle: 'AI & Voice Engine',
    headings: [
      { id: 'language-detection', text: 'Automatic Language Detection', level: 2 },
      { id: 'hinglish-normalization', text: 'Hinglish Transliteration Normalization', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="language-detection" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            Automatic Language Detection
          </h2>
          <p className="text-slate-300 leading-relaxed">
            The service in <code className="text-blue-300">app/services/language_detection.py</code> inspects script unicode blocks 
            (Devanagari vs Latin) and keyword dictionaries to tag transcripts as <code className="text-blue-300">hi</code> (Hindi), 
            <code className="text-blue-300">en</code> (English), or <code className="text-blue-300">hi-en</code> (Hinglish).
          </p>
        </section>

        <section id="hinglish-normalization" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Hinglish Transliteration Normalization</h2>
          <p className="text-slate-300 text-sm">
            Common retail colloquialisms ("jama", "jamaa", "deposit", "paid", "udhaar", "credit", "baki") are mapped 
            into canonical accounting states through vocabulary normalization tables.
          </p>
        </section>
      </div>
    ),
  },
};
