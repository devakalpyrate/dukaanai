import React from 'react';
import { DocPageItem } from '../types';
import { CodeBlock } from '../components/CodeBlock';
import { Callout } from '../components/Callout';
import { Database, Cpu, Bot, Mic, Volume2, Share2 } from 'lucide-react';

export const SECTION_08_PAGES: Record<string, DocPageItem> = {
  'integration-supabase': {
    id: 'integration-supabase',
    title: 'Supabase',
    subtitle: 'PostgreSQL database connection and client configuration',
    categoryNumber: '08',
    categoryTitle: 'Integrations',
    headings: [
      { id: 'supabase-client', text: 'Supabase Python Client', level: 2 },
      { id: 'connection-pooling', text: 'Connection Lifecycle', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="supabase-client" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            Supabase Python Client
          </h2>
          <p className="text-slate-300 leading-relaxed">
            DukaanAI connects to Supabase Cloud using the official <code className="text-blue-300">supabase-py</code> client library. 
            The client is instantiated in <code className="text-blue-300">app/database/supabase_client.py</code> using environment variables:
          </p>
          <CodeBlock
            language="python"
            filename="app/database/supabase_client.py"
            code={`import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)`}
          />
        </section>

        <section id="connection-pooling" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Connection Lifecycle</h2>
          <p className="text-slate-300 text-sm">
            Requests reuse persistent HTTP connection pools managed by <code className="text-blue-300">httpx</code>, 
            minimizing TLS handshake overhead on database queries.
          </p>
        </section>
      </div>
    ),
  },

  'integration-groq': {
    id: 'integration-groq',
    title: 'Groq',
    subtitle: 'Ultra-low-latency LLaMA-3 inference client',
    categoryNumber: '08',
    categoryTitle: 'Integrations',
    headings: [
      { id: 'groq-sdk', text: 'Groq Cloud SDK Integration', level: 2 },
      { id: 'inference-metrics', text: 'Inference Parameters', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="groq-sdk" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            Groq Cloud SDK Integration
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Intent parsing is powered by Groq's low-latency inference API using the <code className="text-blue-300">llama3-70b-8192</code> model:
          </p>
          <CodeBlock
            language="python"
            filename="Groq LLM Client"
            code={`from groq import Groq
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

completion = client.chat.completions.create(
    model="llama3-70b-8192",
    messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": transcript}],
    temperature=0.1,
    response_format={"type": "json_object"}
)`}
          />
        </section>

        <section id="inference-metrics" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Inference Parameters</h2>
          <p className="text-slate-300 text-sm">
            Temperature is pinned to <code className="text-blue-300">0.1</code> to guarantee deterministic JSON output without hallucinating amounts or customers.
          </p>
        </section>
      </div>
    ),
  },

  'integration-bodhan-ai': {
    id: 'integration-bodhan-ai',
    title: 'Bodhan AI',
    subtitle: 'Indian languages Speech-to-Text and Text-to-Speech platform',
    categoryNumber: '08',
    categoryTitle: 'Integrations',
    headings: [
      { id: 'bodhan-platform', text: 'Bodhan AI Acoustic Platform', level: 2 },
      { id: 'supported-dialects', text: 'Supported Dialects & Vernacular Speech', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="bodhan-platform" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            Bodhan AI Acoustic Platform
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Bodhan AI provides specialized acoustic models tuned for Indian spoken environments, ambient market noise, 
            and colloquial retail terminology.
          </p>
        </section>

        <section id="supported-dialects" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Supported Dialects & Vernacular Speech</h2>
          <p className="text-slate-300 text-sm">
            Optimized for Standard Hindi (<code className="text-blue-300">hi-IN</code>), urban Hinglish mixtures, and Indian English accents.
          </p>
        </section>
      </div>
    ),
  },

  'integration-stt': {
    id: 'integration-stt',
    title: 'STT Integration',
    subtitle: 'Audio file upload and multipart transcription bridge',
    categoryNumber: '08',
    categoryTitle: 'Integrations',
    headings: [
      { id: 'stt-flow', text: 'STT Bridge Pipeline', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="stt-flow" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Mic className="w-5 h-5 text-blue-400" />
            STT Bridge Pipeline
          </h2>
          <p className="text-slate-300 leading-relaxed">
            The FastAPI endpoint <code className="text-blue-300">/api/voice/stt</code> accepts recorded binary audio via multipart upload, 
            relays it to Bodhan AI Cloud, and returns the transcribed text string within 400 milliseconds.
          </p>
        </section>
      </div>
    ),
  },

  'integration-tts': {
    id: 'integration-tts',
    title: 'TTS Integration',
    subtitle: 'Audio binary synthesis and client-side playback',
    categoryNumber: '08',
    categoryTitle: 'Integrations',
    headings: [
      { id: 'tts-bridge', text: 'TTS Audio Streaming Bridge', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="tts-bridge" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-blue-400" />
            TTS Audio Streaming Bridge
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Synthesizes confirmation phrases into streaming MP3 audio. The browser decodes and plays the audio chunk 
            through HTML5 <code className="text-blue-300">AudioContext</code>.
          </p>
        </section>
      </div>
    ),
  },

  'integration-external-services': {
    id: 'integration-external-services',
    title: 'External Services',
    subtitle: 'UPI payment standard and local network printer bridges',
    categoryNumber: '08',
    categoryTitle: 'Integrations',
    headings: [
      { id: 'upi-standard', text: 'NPCI UPI Deep Link Specification', level: 2 },
      { id: 'hardware-printers', text: 'Thermal Receipt Printers', level: 2 },
    ],
    content: (
      <div className="space-y-6">
        <section id="upi-standard" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-400" />
            NPCI UPI Deep Link Specification
          </h2>
          <p className="text-slate-300 leading-relaxed">
            DukaanAI integrates directly with the Unified Payments Interface (UPI) standard. Dynamic QR codes encode:
          </p>
          <CodeBlock
            language="text"
            filename="UPI Deep Link"
            code={`upi://pay?pa={vpa}&pn={merchant_name}&am={amount}&cu=INR&tn={ref_id}`}
          />
        </section>

        <section id="hardware-printers" className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">Thermal Receipt Printers</h2>
          <p className="text-slate-300 text-sm">
            PDF invoices are rendered with 58mm and 80mm ESC/POS thermal printer compatibility in mind for instant hardcopy generation.
          </p>
        </section>
      </div>
    ),
  },
};
