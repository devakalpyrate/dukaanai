import React, { useState, useEffect, useRef } from 'react';
import {
  Square,
  Mic,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  User,
  CreditCard,
  Layers,
  Cpu,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Orb } from '../components/Orb';
import { Waveform } from '../components/Waveform';
import { AssistantState } from '../types';
import { useTheme } from '../context/ThemeContext';

interface VoiceAssistantPageProps {
  initialState?: AssistantState;
}

const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000';

const SAMPLE_COMMANDS = [
  'Shubham ka 2000 rupees ka udhaar likh do',
  'Shubham is taking udhaar from 10 rupees',
  'Shaashwat ne ₹500 cash jama kar diye',
  'Sugar ka stock check karo',
];

interface FlowStep {
  name: string;
  detail: string;
  status: 'pending' | 'active' | 'success' | 'error';
}

export const VoiceAssistantPage: React.FC<VoiceAssistantPageProps> = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [state, setState] = useState<AssistantState>('idle');
  const [selectedLang, setSelectedLang] = useState<'auto' | 'hi' | 'en' | 'or'>('auto');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const [transcript, setTranscript] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');
  const [statusSubtitle, setStatusSubtitle] = useState<string>(
    'Tap the microphone or choose a quick prompt to execute store transactions.'
  );

  const [pipelineSteps, setPipelineSteps] = useState<FlowStep[]>([
    { name: 'Voice Input', detail: 'Waiting for audio / instruction', status: 'pending' },
    { name: 'Groq AI Parsing', detail: 'Extract customer & amount', status: 'pending' },
    { name: 'Shop Verification', detail: 'Verify customer & shop boundary', status: 'pending' },
    { name: 'SQLite DB Ledger', detail: 'Record transaction & update balance', status: 'pending' },
  ]);

  const [lastResult, setLastResult] = useState<{
    action?: string;
    customer?: string;
    amount?: string;
    message?: string;
    success?: boolean;
    txId?: number;
  } | null>(null);

  const timerIntervalRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {}
      }
    };
  }, []);

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('dukaanai_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const getShopId = (): number => {
    const userStr = localStorage.getItem('dukaanai_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.shop_id) return u.shop_id;
      } catch {}
    }
    return 1;
  };

  const executeCommand = async (commandText: string) => {
    const text = commandText.trim();
    if (!text) return;

    setTranscript(text);
    setTextInput('');
    setState('thinking');
    setStatusSubtitle('Extracting canonical intent via Groq LLM...');
    setLastResult(null);

    // Update Step 1: Input Captured
    setPipelineSteps([
      { name: 'Voice / Text Input', detail: `Captured: "${text}"`, status: 'success' },
      { name: 'Groq AI Parsing', detail: 'Analyzing customer & amount...', status: 'active' },
      { name: 'Shop Verification', detail: 'Pending', status: 'pending' },
      { name: 'SQLite DB Ledger', detail: 'Pending', status: 'pending' },
    ]);

    const token = localStorage.getItem('dukaanai_token');
    const shopId = getShopId();

    try {
      // 1. Understand Intent
      const intentRes = await fetch(`${API_BASE}/api/ai/understand-intent`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          text,
          shop_id: shopId,
        }),
      });

      if (!intentRes.ok) {
        const errJson = await intentRes.json().catch(() => ({}));
        throw new Error(errJson.error?.message || errJson.detail || 'Failed to understand intent');
      }

      const intentData = await intentRes.json();
      const customerName =
        intentData.entities?.customer ||
        intentData.parameters?.customer_name ||
        'Customer';
      const amountVal =
        intentData.parameters?.amount ||
        intentData.entities?.amount ||
        '0';

      setState('executing');
      setStatusSubtitle(`Executing action: ${intentData.action || intentData.intent}...`);

      // Update Step 2: Intent Extracted & Step 3: Active
      setPipelineSteps([
        { name: 'Voice / Text Input', detail: `Captured: "${text}"`, status: 'success' },
        {
          name: 'Groq AI Parsing',
          detail: `Target: ${customerName} • Amt: ₹${amountVal} • Action: ${intentData.action}`,
          status: 'success',
        },
        { name: 'Shop Verification', detail: `Shop #${shopId} • Checking customer record...`, status: 'active' },
        { name: 'SQLite DB Ledger', detail: 'Writing entry to database...', status: 'pending' },
      ]);

      // 2. Execute Validated Action into Database
      const execRes = await fetch(`${API_BASE}/api/action/execute`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          intent_data: intentData,
          confirmed: true,
        }),
      });

      if (!execRes.ok) {
        const errJson = await execRes.json().catch(() => ({}));
        throw new Error(errJson.error?.message || errJson.detail || 'Failed to execute database action');
      }

      const execData = await execRes.json();
      const txResult = execData.result || {};

      setState('success');
      setStatusSubtitle('Database modified and recorded in Khata ledger.');

      // Update All Steps to Complete
      setPipelineSteps([
        { name: 'Voice / Text Input', detail: `Captured: "${text}"`, status: 'success' },
        {
          name: 'Groq AI Parsing',
          detail: `Identified: ${customerName} • ₹${amountVal} • ${intentData.action}`,
          status: 'success',
        },
        {
          name: 'Shop Verification',
          detail: `Verified Shop #${shopId} & Customer ${customerName}`,
          status: 'success',
        },
        {
          name: 'SQLite DB Ledger',
          detail: `✓ Logged in transactions table • Tx #${txResult.id || 'OK'}`,
          status: 'success',
        },
      ]);

      setLastResult({
        action: execData.action || intentData.action,
        customer: customerName,
        amount: amountVal ? `₹${amountVal}` : undefined,
        message: execData.message,
        success: true,
        txId: txResult.id,
      });
    } catch (err: any) {
      setState('error');
      setStatusSubtitle('Could not process request. Please try again.');

      setPipelineSteps((prev) =>
        prev.map((step, idx) => {
          if (step.status === 'active') {
            return { ...step, status: 'error', detail: err.message || 'Failed' };
          }
          return step;
        })
      );

      setLastResult({
        message: err.message,
        success: false,
      });
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyserRef.current = analyser;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateWave = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length / 255;
          setAudioLevel(Math.min(1, avg * 2.2));
          animFrameRef.current = requestAnimationFrame(updateWave);
        };
        updateWave();
      }

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          try {
            audioContextRef.current.close();
          } catch {}
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleAudioUpload(audioBlob);
      };

      recorder.start(250);
      setIsRecording(true);
      setState('listening');
      setTranscript('');
      setStatusSubtitle('Listening to speech...');
      setRecordDuration(0);

      setPipelineSteps([
        { name: 'Voice Input', detail: 'Recording audio from microphone...', status: 'active' },
        { name: 'Groq AI Parsing', detail: 'Pending', status: 'pending' },
        { name: 'Shop Verification', detail: 'Pending', status: 'pending' },
        { name: 'SQLite DB Ledger', detail: 'Pending', status: 'pending' },
      ]);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setStatusSubtitle('Microphone permission not granted or unsupported. You can type or click the quick commands below.');
      setIsRecording(false);
    }
  };

  const stopListeningAndProcess = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsRecording(false);
    setAudioLevel(0);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  };

  const handleAudioUpload = async (blob: Blob) => {
    setState('transcribing');
    setStatusSubtitle('Transcribing speech using SraVaani STT...');
    const token = localStorage.getItem('dukaanai_token');

    setPipelineSteps([
      { name: 'Voice Input', detail: 'Transcribing via local SraVaani STT...', status: 'active' },
      { name: 'Groq AI Parsing', detail: 'Pending', status: 'pending' },
      { name: 'Shop Verification', detail: 'Pending', status: 'pending' },
      { name: 'SQLite DB Ledger', detail: 'Pending', status: 'pending' },
    ]);

    try {
      const formData = new FormData();
      const ext = blob.type.includes('wav') ? 'wav' : blob.type.includes('ogg') ? 'ogg' : 'webm';
      formData.append('file', blob, `voice_recording.${ext}`);

      const res = await fetch(`${API_BASE}/api/voice/transcribe`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || errJson.detail || 'STT transcription failed');
      }

      const data = await res.json();
      const recognized = data.transcribed_text || '';
      if (!recognized.trim()) {
        setState('clarification');
        setStatusSubtitle('No speech detected in audio. Please try again.');
        return;
      }

      await executeCommand(recognized);
    } catch (err: any) {
      setState('error');
      setStatusSubtitle('Could not transcribe audio.');
      setPipelineSteps((prev) =>
        prev.map((step, idx) => (idx === 0 ? { ...step, status: 'error', detail: err.message } : step))
      );
    }
  };

  const getStateTitle = () => {
    switch (state) {
      case 'listening': return 'Listening...';
      case 'transcribing': return 'Transcribing Speech...';
      case 'thinking': return 'Analyzing Intent...';
      case 'executing': return 'Updating Dukaan Ledger...';
      case 'speaking': return 'Assistant Responding';
      case 'clarification': return 'Clarification Required';
      case 'success': return 'Action Recorded in DB';
      case 'error': return 'Request Failed';
      case 'idle':
      default:
        return 'Tap mic or click prompt';
    }
  };

  const getStatusColor = () => {
    if (isDark) {
      return 'text-white border-neutral-700 bg-neutral-900';
    }
    switch (state) {
      case 'listening': return 'text-red-600 border-red-500/30 bg-red-500/10';
      case 'transcribing':
      case 'thinking': return 'text-amber-600 border-amber-500/30 bg-amber-500/10';
      case 'executing': return 'text-purple-600 border-purple-500/30 bg-purple-500/10';
      case 'speaking': return 'text-cyan-600 border-cyan-500/30 bg-cyan-500/10';
      case 'clarification': return 'text-amber-600 border-amber-500/40 bg-amber-500/15';
      case 'success': return 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10';
      case 'error': return 'text-rose-600 border-rose-500/30 bg-rose-500/10';
      case 'idle':
      default:
        return 'text-[var(--text-secondary)] border-[var(--border-color)] bg-neutral-100';
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full w-full flex flex-col justify-between py-1 px-1 select-none overflow-hidden gap-2">
      {/* 1. TOP STATUS BAR (Non-overlapping single row) */}
      <div className="w-full flex items-center justify-between px-2 shrink-0">
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold tracking-wide transition-all ${getStatusColor()}`}
        >
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span>{getStateTitle()}</span>
        </div>

        <div className="flex items-center gap-1 bg-neutral-900/60 p-1 rounded-full border border-[var(--border-color)] text-xs font-semibold text-[var(--text-muted)]">
          {(['auto', 'hi', 'en', 'or'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer text-[11px] ${
                selectedLang === lang
                  ? 'bg-neutral-800 text-white font-bold border border-neutral-600 shadow-sm'
                  : 'hover:text-[var(--text-primary)]'
              }`}
            >
              {lang === 'auto' ? '🇮🇳 Auto' : lang === 'hi' ? 'हिंदी' : lang === 'en' ? 'EN' : 'ଓଡ଼ିଆ'}
            </button>
          ))}
        </div>
      </div>

      {/* 2. CENTER ORB & WAVEFORM (Proportionally scaled) */}
      <div className="flex flex-col items-center justify-center my-auto shrink min-h-0">
        <div className="scale-75 sm:scale-85 md:scale-95 transition-transform origin-center">
          <Orb state={state} audioLevel={audioLevel} />
        </div>

        <div className="w-48 sm:w-64 h-7 mt-1">
          <Waveform state={state} audioLevel={audioLevel} />
        </div>

        <div className="text-center mt-1">
          <h3 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
            {getStateTitle()}
          </h3>
          <p className="text-[11px] sm:text-xs text-[var(--text-muted)] max-w-sm mt-0.5 line-clamp-1">
            {statusSubtitle}
          </p>
        </div>
      </div>

      {/* 3. DUAL PANELS: LEFT (RECOGNIZED COMMAND) & RIGHT (LIVE EXECUTION PIPELINE FLOW) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-4xl mx-auto px-1 shrink-0">
        {/* Left: Recognized Command Input */}
        <div className="glass-card rounded-xl p-3 flex flex-col justify-between min-h-[110px] border border-[var(--border-color)]">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-[#F6B511]" /> Recognized Command
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {state === 'listening' ? 'Listening...' : 'Ready'}
            </span>
          </div>

          <div className="text-xs text-[var(--text-primary)] font-medium my-1">
            {transcript ? (
              <span className="text-white font-semibold">"{transcript}"</span>
            ) : (
              <span className="text-[var(--text-muted)] italic">"Say e.g. Shubham ka 2000 rupees ka udhaar likh do"</span>
            )}
          </div>

          {lastResult?.message && (
            <div className="mt-auto pt-1 border-t border-[var(--border-color)] text-[11px] flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{lastResult.message}</span>
            </div>
          )}
        </div>

        {/* Right: Live Execution Pipeline Flow (Visualizing each step, data flow, and DB status) */}
        <div className="glass-card rounded-xl p-3 flex flex-col justify-between min-h-[110px] border border-[var(--border-color)]">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#F6B511]" /> Execution Pipeline Flow
            </span>
            {lastResult?.amount && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                Flow: {lastResult.amount}
              </span>
            )}
          </div>

          {/* 4 Pipeline Flow Steps */}
          <div className="space-y-1 my-1">
            {pipelineSteps.map((step, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0">
                    {step.status === 'success' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : step.status === 'active' ? (
                      <RefreshCw className="w-3 h-3 text-[#F6B511] animate-spin" />
                    ) : step.status === 'error' ? (
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                    )}
                  </div>
                  <span
                    className={`font-semibold ${
                      step.status === 'success'
                        ? 'text-[var(--text-primary)]'
                        : step.status === 'active'
                        ? 'text-[#F6B511]'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[170px] text-right font-mono">
                  {step.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. QUICK CLICKABLE PROMPTS (Including Shubham ka 2000 rupees ka udhaar) */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap px-1 shrink-0">
        <span className="text-[11px] text-[var(--text-muted)] font-semibold mr-1">Quick click:</span>
        {SAMPLE_COMMANDS.map((cmd, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => executeCommand(cmd)}
            className="px-2.5 py-1 rounded-full text-[11px] bg-neutral-900/80 hover:bg-[#F6B511] hover:text-[#09090B] border border-neutral-700 text-[#F4F4F5] transition-all cursor-pointer font-medium shadow-sm hover:scale-102"
            title="Click to execute this command directly"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* 5. BOTTOM CONTROL BAR (Mic + Input) */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 px-2 shrink-0 max-w-4xl mx-auto w-full">
        {/* Big Mic Button */}
        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full glass-panel-elevated shadow-lg border border-neutral-700">
          <button
            type="button"
            onClick={isRecording ? stopListeningAndProcess : startListening}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
              isRecording
                ? 'bg-red-600 text-white animate-pulse scale-105 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : 'bg-[#F6B511] text-[#09090B] hover:bg-[#FFD04A] hover:scale-105 shadow-[0_0_15px_rgba(246,181,17,0.3)]'
            }`}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-5 h-5 font-bold" />}
          </button>
          <span className="font-mono text-xs font-bold text-[var(--text-secondary)] w-11 text-center">
            {formatTimer(recordDuration)}
          </span>
        </div>

        {/* Manual Text Command Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeCommand(textInput);
          }}
          className="flex-1 max-w-md w-full flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-700 rounded-full px-3 py-1.5 shadow-md"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type voice command e.g. Shubham ka 2000 udhaar..."
            className="flex-1 bg-transparent text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || state === 'thinking' || state === 'executing'}
            className="p-1.5 rounded-full bg-[#F6B511] hover:bg-[#FFD04A] text-[#09090B] disabled:opacity-30 cursor-pointer transition-all"
            title="Execute Command"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
