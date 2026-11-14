import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Square,
  History,
  X,
  Store,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { Orb } from './components/Orb';
import { Waveform } from './components/Waveform';
import { AuthModal } from './components/AuthModal';
import type { AssistantState, CanonicalIntent, ActionExecutionResponse, HistoryItem } from './types';

const API_BASE = 'http://127.0.0.1:8000';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  const [state, setState] = useState<AssistantState>('idle');
  const [selectedLang, setSelectedLang] = useState<'auto' | 'hi' | 'en' | 'or'>('auto');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const [transcript, setTranscript] = useState<string>('');
  const [statusSubtitle, setStatusSubtitle] = useState<string>('Try "Ramesh ne 500 rupaye udhar liye" or "Sugar ka stock check karo"');
  const [responseText, setResponseText] = useState<string>("I'm ready to manage your khata transactions, inventory stock, and customer ledgers.");
  const [canonicalIntent, setCanonicalIntent] = useState<CanonicalIntent | null>(null);

  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const currentRequestIdRef = useRef<string>('');

  useEffect(() => {
    const savedUser = localStorage.getItem('dukaanai_user');
    const token = localStorage.getItem('dukaanai_token');
    if (savedUser && token) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        setShowAuthModal(true);
      }
    } else {
      setShowAuthModal(true);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('dukaanai_token');
    localStorage.removeItem('dukaanai_user');
    setCurrentUser(null);
    setShowAuthModal(true);
    setState('idle');
  };

  const getStateTitle = () => {
    switch (state) {
      case 'listening': return 'Listening...';
      case 'transcribing': return 'Transcribing Speech...';
      case 'thinking': return 'Analyzing Intent...';
      case 'executing': return 'Updating Dukaan Ledger...';
      case 'speaking': return 'Assistant Responding';
      case 'clarification': return 'Clarification Required';
      case 'success': return 'Action Completed';
      case 'error': return 'Request Failed';
      case 'idle':
      default:
        return 'Tap mic to speak';
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case 'listening': return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'transcribing':
      case 'thinking': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'executing': return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      case 'speaking': return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
      case 'clarification': return 'text-amber-300 border-amber-500/40 bg-amber-500/15';
      case 'success': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'error': return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      case 'idle':
      default:
        return 'text-slate-300 border-white/10 bg-white/5';
    }
  };

  const startRecording = async () => {
    const token = localStorage.getItem('dukaanai_token');
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const pcmData = new Uint8Array(analyser.frequencyBinCount);
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(pcmData);
        let sum = 0;
        for (let i = 0; i < pcmData.length; i++) sum += pcmData[i];
        const avg = sum / pcmData.length;
        setAudioLevel(Math.min(1, avg / 128));
        animFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach((track) => track.stop());
        setAudioLevel(0);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleAudioProcess(audioBlob);
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;

      setIsRecording(true);
      setState('listening');
      setTranscript('');
      setStatusSubtitle('Listening to your store instructions...');
      setRecordDuration(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setState('error');
      setResponseText('Microphone permission denied or audio device unavailable. Please allow microphone access in your browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const handleAudioProcess = async (audioBlob: Blob) => {
    const token = localStorage.getItem('dukaanai_token');
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    setState('transcribing');
    setStatusSubtitle('Transcribing speech using local SraVaani STT...');

    try {
      const ext = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
      const file = new File([audioBlob], `recording.${ext}`, { type: audioBlob.type });
      const formData = new FormData();
      formData.append('file', file);

      const sttRes = await fetch(`${API_BASE}/api/voice/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (sttRes.status === 401) {
        handleLogout();
        return;
      }

      if (!sttRes.ok) {
        throw new Error(`STT failed with status ${sttRes.status}`);
      }

      const sttData = await sttRes.json();
      const recognized = sttData.transcribed_text || '';
      setTranscript(recognized);

      if (!recognized.trim()) {
        setState('error');
        setResponseText('No clear speech was recognized. Please speak clearly into your microphone.');
        return;
      }

      await handleIntentUnderstanding(recognized);
    } catch (err: any) {
      console.error('Audio pipeline error:', err);
      setState('error');
      setResponseText(`Audio transcription failed: ${err.message || 'Please check backend connection.'}`);
    }
  };

  const handleIntentUnderstanding = async (text: string) => {
    const token = localStorage.getItem('dukaanai_token');
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    setState('thinking');
    setStatusSubtitle('Groq LLM is extracting canonical shopkeeper intent...');

    try {
      const intentRes = await fetch(`${API_BASE}/api/ai/understand-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: text,
        }),
      });

      if (intentRes.status === 401) {
        handleLogout();
        return;
      }

      if (!intentRes.ok) {
        throw new Error(`Intent extraction failed with status ${intentRes.status}`);
      }

      const intentData: CanonicalIntent = await intentRes.json();
      setCanonicalIntent(intentData);

      currentRequestIdRef.current = `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      if (intentData.clarification_needed) {
        setState('clarification');
        const q = intentData.clarification_question || 'Kripya thoda aur vistar se batayein.';
        setResponseText(q);
        setStatusSubtitle('Clarification required by business rules');
        return;
      }

      if (intentData.requires_confirmation) {
        setState('clarification');
        setResponseText(
          intentData.normalized_text
            ? `Normalized intent: ${intentData.normalized_text}`
            : `Please verify and confirm this action.`
        );
        setStatusSubtitle('User confirmation required for this financial action');
        return;
      }

      await executeBackendAction(intentData, false);
    } catch (err: any) {
      console.error('Intent understanding error:', err);
      setState('error');
      setResponseText(`Intent understanding failed: ${err.message || 'Server error'}`);
    }
  };

  const executeBackendAction = async (intentData: CanonicalIntent, confirmed: boolean) => {
    const token = localStorage.getItem('dukaanai_token');
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    setState('executing');
    setStatusSubtitle('Executing validated database business transaction with idempotency...');

    try {
      const execRes = await fetch(`${API_BASE}/api/action/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          intent_data: intentData,
          confirmed: confirmed,
          request_id: currentRequestIdRef.current,
        }),
      });

      if (execRes.status === 401) {
        handleLogout();
        return;
      }

      if (!execRes.ok) {
        throw new Error(`Execution failed with status ${execRes.status}`);
      }

      const execData: ActionExecutionResponse = await execRes.json();

      if (execData.requires_confirmation) {
        setState('clarification');
        setResponseText(execData.message);
        setStatusSubtitle('Confirmation required before executing database changes');
        return;
      }

      if (!execData.success) {
        setState('clarification');
        setResponseText(execData.message);
        setStatusSubtitle(execData.clarification_question || 'Validation blocked action');
        return;
      }

      setState('success');
      setResponseText(execData.message);
      setStatusSubtitle('Database operation completed safely');

      const newHistoryItem: HistoryItem = {
        id: `hist-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        query: transcript || intentData.original_text,
        action: execData.action,
        response: execData.message,
        status: 'success',
      };
      setHistory((prev) => [newHistoryItem, ...prev]);

      setTimeout(() => {
        setState((current) => (current === 'success' ? 'idle' : current));
        setStatusSubtitle('Try "Ramesh ne 500 rupaye udhar liye" or "Sugar ka stock check karo"');
      }, 5000);
    } catch (err: any) {
      console.error('Execution error:', err);
      setState('error');
      setResponseText(`Execution error: ${err.message || 'Database write failed'}`);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060913] text-slate-100 flex flex-col justify-between p-4 md:p-6 select-none font-sans">
      <AuthModal
        isOpen={showAuthModal}
        apiBase={API_BASE}
        onSuccess={(data) => {
          setCurrentUser({
            id: data.user_id,
            name: data.name,
            email: data.email,
            shop_id: data.shop_id,
            shop_name: data.shop_name,
          });
          setShowAuthModal(false);
        }}
      />

      {/* Background Glows */}
      <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 right-1/4 w-[550px] h-[550px] bg-violet-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:36px_36px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3.5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/30 to-purple-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,210,255,0.3)]">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Dukaan<span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">AI</span>
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
              {currentUser ? currentUser.shop_name : 'Voice Copilot'}
            </span>
          </div>
        </div>

        {/* State Status Badge */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold tracking-wide transition-all ${getStatusColor()}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]" />
          <span>{getStateTitle()}</span>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 bg-black/30 p-1 rounded-full border border-white/10 text-xs font-semibold text-slate-400">
            {(['auto', 'hi', 'en', 'or'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className={`px-3 py-1 rounded-full transition-all ${
                  selectedLang === lang
                    ? 'bg-gradient-to-r from-cyan-500/30 to-purple-600/30 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(0,210,255,0.2)]'
                    : 'hover:text-white'
                }`}
              >
                {lang === 'auto' ? '🇮🇳 Auto' : lang === 'hi' ? 'हिंदी' : lang === 'en' ? 'EN' : 'ଓଡ଼ିଆ'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="relative p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            title="Activity History"
          >
            <History className="w-4 h-4" />
            {history.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-600 text-[10px] font-bold flex items-center justify-center text-white shadow-[0_0_8px_rgba(121,40,202,0.6)]">
                {history.length}
              </span>
            )}
          </button>

          {currentUser && (
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 transition-all cursor-pointer"
              title={`Sign out (${currentUser.name})`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Stage */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center gap-4 min-h-0 py-2">
        <Orb state={state} audioLevel={audioLevel} />

        <Waveform state={state} audioLevel={audioLevel} />

        <div className="text-center mt-[-0.5rem]">
          <h2 className="text-2xl font-bold tracking-tight text-white transition-all">
            {getStateTitle()}
          </h2>
          <p className="text-sm text-slate-400 max-w-lg mt-1 line-clamp-2">
            {statusSubtitle}
          </p>
        </div>

        {/* Interaction Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-4xl px-2">
          {/* Transcript Panel */}
          <div className="rounded-xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-4 shadow-xl flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-cyan-400" /> Live Speech Recognition
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {state === 'listening' ? 'Streaming...' : 'Ready'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto text-sm text-slate-200 font-medium">
              {transcript || <span className="text-slate-500 italic">Tap mic and speak your command...</span>}
            </div>
          </div>

          {/* Assistant Response Panel */}
          <div className="rounded-xl bg-slate-900/40 backdrop-blur-xl border border-white/10 p-4 shadow-xl flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Assistant Response
              </span>
              {canonicalIntent && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                  {canonicalIntent.action}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto text-sm text-slate-100 font-medium">
              {responseText}
            </div>

            {/* Confirmation CTA */}
            {state === 'clarification' && canonicalIntent && canonicalIntent.requires_confirmation && (
              <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Confirm execution?
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => executeBackendAction(canonicalIntent, true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all shadow-[0_0_10px_rgba(16,185,129,0.4)] cursor-pointer"
                  >
                    Confirm & Record
                  </button>
                  <button
                    onClick={() => {
                      setState('idle');
                      setStatusSubtitle('Transaction cancelled by user');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs font-bold border border-red-500/30 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="relative z-10 flex items-center justify-center py-2">
        <div className="flex items-center gap-4 px-6 py-2.5 rounded-full bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-2xl">
          <div className="relative flex items-center justify-center">
            {isRecording && (
              <div className="absolute w-full h-full rounded-full border-2 border-red-500 animate-ping opacity-75" />
            )}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                isRecording
                  ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.7)] scale-105'
                  : 'bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 text-white shadow-[0_0_25px_rgba(0,210,255,0.5)] hover:scale-105'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-7 h-7" />}
            </button>
          </div>
          <span className="font-mono text-sm font-semibold text-slate-300 w-12 text-center">
            {formatTimer(recordDuration)}
          </span>
        </div>
      </footer>

      {/* History Slide-over Drawer */}
      <AnimatePresence>
        {historyOpen && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-4 right-4 bottom-4 w-96 z-50 rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col p-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <History className="w-4 h-4 text-cyan-400" /> Recent Session Activity
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-sm">
                  <p>No actions yet.</p>
                  <span className="text-xs mt-1">Recorded voice operations will appear here.</span>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-mono font-semibold text-cyan-400">{item.action}</span>
                      <span>{item.timestamp}</span>
                    </div>
                    <div className="text-xs text-slate-300 italic font-medium">"{item.query}"</div>
                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {item.response}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
