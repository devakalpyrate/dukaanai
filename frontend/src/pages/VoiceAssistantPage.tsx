import React, { useState, useEffect, useRef } from 'react';
import {
  Square,
  Mic,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Volume2,
  VolumeX,
  Play,
  X,
  Download,
  Loader2,
  History,
  Clock,
  Trash2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Orb } from '../components/Orb';
import { Waveform } from '../components/Waveform';
import { AssistantState, VoiceHistoryItem } from '../types';
import { useTheme } from '../context/ThemeContext';

interface VoiceAssistantPageProps {
  initialState?: AssistantState;
}

const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000';

export const VoiceAssistantPage: React.FC<VoiceAssistantPageProps> = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [state, setState] = useState<AssistantState>('idle');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [selectedLang, setSelectedLang] = useState<'auto' | 'hi' | 'en' | 'or'>('auto');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const [transcript, setTranscript] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');
  const [statusSubtitle, setStatusSubtitle] = useState<string>(
    'Tap the microphone or choose a quick prompt to execute store transactions.'
  );

  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressLabel, setProgressLabel] = useState<string>('Ready for store instruction');

  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState<boolean>(true);
  const [showAudioGenModal, setShowAudioGenModal] = useState<boolean>(false);
  const [genTextInput, setGenTextInput] = useState<string>('रमेश के खाते में ₹500 का उधार लिख दिया गया है।');
  const [genAudioUrl, setGenAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [genAudioError, setGenAudioError] = useState<string | null>(null);

  const [history, setHistory] = useState<VoiceHistoryItem[]>([]);
  const [activeSpeechText, setActiveSpeechText] = useState<string | null>(null);
  const [speakingWords, setSpeakingWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);

  const [lastResult, setLastResult] = useState<{
    action?: string;
    customer?: string;
    amount?: string;
    message?: string;
    success?: boolean;
    txId?: number;
    audioUrl?: string;
  } | null>(null);

  const timerIntervalRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechRecRef = useRef<any>(null);

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

  // Load persistent history on mount
  useEffect(() => {
    const shopId = getShopId();
    try {
      const saved = localStorage.getItem(`dukaanai_voice_history_${shopId}`);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveToHistory = (item: VoiceHistoryItem) => {
    const shopId = getShopId();
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.id !== item.id);
      const updated = [item, ...filtered].slice(0, 50);
      try {
        localStorage.setItem(`dukaanai_voice_history_${shopId}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearHistory = () => {
    const shopId = getShopId();
    setHistory([]);
    try {
      localStorage.removeItem(`dukaanai_voice_history_${shopId}`);
    } catch {}
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
        } catch {}
      }
      if (speechRecRef.current) {
        try {
          speechRecRef.current.stop();
        } catch {}
      }
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

  const playSpeechWithWordHighlight = (audioUrl: string, speechText: string) => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
    }

    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;

    const words = speechText.trim().split(/\s+/).filter(Boolean);
    setSpeakingWords(words);
    setCurrentWordIndex(0);
    setActiveSpeechText(speechText);
    setState('speaking');

    audio.ontimeupdate = () => {
      if (audio.duration && audio.duration > 0) {
        const progress = audio.currentTime / audio.duration;
        const index = Math.min(words.length - 1, Math.floor(progress * words.length));
        setCurrentWordIndex(index);
      }
    };

    audio.onplay = () => {
      setState('speaking');
    };

    audio.onended = () => {
      setState('success');
      setCurrentWordIndex(words.length);
    };

    audio.onerror = () => {
      setState('success');
    };

    audio.play().catch(() => {});
  };

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

  const executeCommand = async (commandText: string) => {
    const text = commandText.trim();
    if (!text) return;

    setTranscript(text);
    setTextInput('');
    setState('thinking');
    setStatusSubtitle('Processing...');
    setProgressPercent(35);
    setProgressLabel('35%');
    setLastResult(null);

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
        throw new Error(errJson.error?.message || errJson.detail || 'Failed to understand instruction');
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
      setStatusSubtitle('Updating ledger...');
      setProgressPercent(75);
      setProgressLabel('75%');

      // 2. Execute Action
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
        throw new Error(errJson.error?.message || errJson.detail || 'Failed to update ledger');
      }

      const execData = await execRes.json();
      const txResult = execData.result || {};
      const speechText = execData.spoken_message || execData.message || 'Done';

      setState('success');
      setStatusSubtitle(speechText);
      setProgressPercent(100);
      setProgressLabel('100%');

      let currentAudioUrl: string | undefined = undefined;

      if (autoSpeakEnabled && speechText) {
        try {
          const speakRes = await fetch(`${API_BASE}/api/voice/speak`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ text: speechText }),
          });
          if (speakRes.ok) {
            const audioBlob = await speakRes.blob();
            currentAudioUrl = URL.createObjectURL(audioBlob);
            setGenAudioUrl(currentAudioUrl);
            playSpeechWithWordHighlight(currentAudioUrl, speechText);
          } else {
            setActiveSpeechText(speechText);
            setSpeakingWords(speechText.trim().split(/\s+/).filter(Boolean));
            setCurrentWordIndex(-1);
          }
        } catch {
          setActiveSpeechText(speechText);
          setSpeakingWords(speechText.trim().split(/\s+/).filter(Boolean));
          setCurrentWordIndex(-1);
        }
      } else {
        setActiveSpeechText(speechText);
        setSpeakingWords(speechText.trim().split(/\s+/).filter(Boolean));
        setCurrentWordIndex(-1);
      }

      const histItem: VoiceHistoryItem = {
        id: `vh_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: Date.now(),
        command: text,
        responseMessage: speechText,
        customer: customerName !== 'Customer' ? customerName : undefined,
        amount: amountVal && amountVal !== '0' ? `₹${amountVal}` : undefined,
        action: execData.action || intentData.action,
        success: true,
        audioUrl: currentAudioUrl,
      };
      saveToHistory(histItem);

      setLastResult({
        action: execData.action || intentData.action,
        customer: customerName,
        amount: amountVal && amountVal !== '0' ? `₹${amountVal}` : undefined,
        message: speechText,
        success: true,
        txId: txResult.id,
        audioUrl: currentAudioUrl,
      });
    } catch (err: any) {
      setState('error');
      setStatusSubtitle('Could not process request.');
      setProgressPercent(0);
      setProgressLabel('');

      setLastResult({
        message: err.message,
        success: false,
      });
    }
  };

  const handleGenerateCustomAudio = async (textToSpeak: string) => {
    if (!textToSpeak.trim()) return;
    setIsGeneratingAudio(true);
    setGenAudioError(null);
    try {
      const res = await fetch(`${API_BASE}/api/voice/speak`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: textToSpeak.trim() }),
      });
      if (!res.ok) {
        throw new Error('Speech synthesis failed.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setGenAudioUrl(url);
      playSpeechWithWordHighlight(url, textToSpeak.trim());
    } catch (err: any) {
      setGenAudioError(err.message || 'Audio generation error.');
    } finally {
      setIsGeneratingAudio(false);
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

      // Web Speech recognition for streaming live words directly inside RECOGNIZED COMMAND box
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'or' ? 'or-IN' : selectedLang === 'en' ? 'en-IN' : 'hi-IN';
          rec.onresult = (ev: any) => {
            let interim = '';
            for (let i = ev.resultIndex; i < ev.results.length; ++i) {
              interim += ev.results[i][0].transcript;
            }
            if (interim.trim()) {
              setTranscript(interim);
            }
          };
          rec.start();
          speechRecRef.current = rec;
        } catch {}
      }

      setIsRecording(true);
      setState('listening');
      setTranscript('');
      setStatusSubtitle('Listening...');
      setProgressPercent(20);
      setProgressLabel('20%');
      setRecordDuration(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setStatusSubtitle('Microphone unavailable.');
      setIsRecording(false);
      setProgressPercent(0);
      setProgressLabel('');
    }
  };

  const stopListeningAndProcess = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {}
    }
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
    setStatusSubtitle('Processing...');
    setProgressPercent(45);
    setProgressLabel('45%');
    const token = localStorage.getItem('dukaanai_token');

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
        throw new Error(errJson.error?.message || errJson.detail || 'Voice transcription failed');
      }

      const data = await res.json();
      const recognized = data.transcribed_text || '';
      if (!recognized.trim()) {
        setState('clarification');
        setStatusSubtitle('No speech detected.');
        setProgressPercent(0);
        setProgressLabel('');
        return;
      }

      setTranscript(recognized);
      await executeCommand(recognized);
    } catch (err: any) {
      setState('error');
      setStatusSubtitle('Error processing audio.');
      setProgressPercent(0);
      setProgressLabel('');
    }
  };

  const getStateTitle = () => {
    switch (state) {
      case 'listening': return 'Listening...';
      case 'transcribing': return 'Processing Voice...';
      case 'thinking': return 'Analyzing Command...';
      case 'executing': return 'Updating Khata...';
      case 'speaking': return 'Responding';
      case 'clarification': return 'Clarification Required';
      case 'success': return 'Ledger Updated';
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
    <div className="h-full w-full flex flex-col lg:flex-row gap-3 py-1 px-1 select-none overflow-hidden">
      {/* LEFT: MAIN VOICE ASSISTANT AREA */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden gap-2 min-w-0">
        {/* 1. TOP STATUS BAR */}
        <div className="w-full flex flex-wrap items-center justify-between px-2 shrink-0 gap-2">
          <div
            className={`flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-bold tracking-wide transition-all ${getStatusColor()}`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>{getStateTitle()}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Speech Toggle */}
            <button
              onClick={() => setAutoSpeakEnabled(!autoSpeakEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                autoSpeakEnabled
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-black/5 dark:bg-white/5 text-[var(--text-muted)] border-[var(--border-color)]'
              }`}
              title="Toggle automatic speech synthesis after transactions"
            >
              {autoSpeakEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span>Auto-Speech {autoSpeakEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Audio Generator Button */}
            <button
              onClick={() => setShowAudioGenModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFD026] text-black border border-[#E6B800] hover:bg-[#F6B511] transition-all cursor-pointer shadow-xs"
              title="Open AI Audio Generator"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Audio Generator</span>
            </button>

            {/* Language Selector */}
            <div className="hidden sm:flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-full border border-[var(--border-color)] text-xs font-bold text-[var(--text-muted)]">
              {(['auto', 'hi', 'en', 'or'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`px-3 py-0.5 rounded-full transition-all cursor-pointer text-[11px] ${
                    selectedLang === lang
                      ? 'bg-[#FFD026] text-black font-extrabold shadow-xs'
                      : 'hover:text-[var(--text-primary)] font-semibold'
                  }`}
                >
                  {lang === 'auto' ? '🇮🇳 Auto' : lang === 'hi' ? 'हिंदी' : lang === 'en' ? 'EN' : 'ଓଡ଼ିଆ'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. CENTER ORB & WAVEFORM */}
        <div className="flex flex-col items-center justify-center my-auto shrink min-h-0">
          <div className="scale-85 sm:scale-95 md:scale-105 transition-transform origin-center">
            <Orb state={state} audioLevel={audioLevel} />
          </div>

          <div className="w-52 sm:w-72 h-8 mt-2">
            <Waveform state={state} audioLevel={audioLevel} />
          </div>

          <div className="text-center mt-2">
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-[var(--text-primary)]">
              {getStateTitle()}
            </h3>
            <p className="text-xs sm:text-sm font-medium text-[var(--text-muted)] max-w-md mt-0.5 line-clamp-1">
              {statusSubtitle}
            </p>
          </div>
        </div>

        {/* 3. YOUTUBE-STYLE LIVE FLOATING TRANSCRIPT & CAPTIONS (NO BOX/CARD) */}
        <div className="w-full max-w-xl mx-auto flex flex-col items-center justify-center min-h-[72px] px-4 my-auto shrink-0">
          {speakingWords.length > 0 ? (
            /* AI Spoken Output (Karaoke Highlight like YouTube CC) */
            <div className="flex flex-wrap gap-2 items-center justify-center text-center px-5 py-2.5 rounded-2xl bg-black/80 dark:bg-black/90 backdrop-blur-md border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <span className="text-[10px] uppercase font-black tracking-wider text-[#FFD026] flex items-center gap-1 mr-1">
                <Volume2 className="w-3.5 h-3.5" /> DukaanAI
              </span>
              {speakingWords.map((word, idx) => {
                const isCurrent = idx === currentWordIndex;
                const isPast = idx < currentWordIndex;
                return (
                  <span
                    key={idx}
                    className={`transition-all duration-150 inline-block px-1 rounded text-sm sm:text-base font-bold ${
                      isCurrent
                        ? 'text-[#FFD026] scale-110 drop-shadow-[0_0_14px_rgba(255,208,38,0.95)] font-black'
                        : isPast
                        ? 'text-white/40 line-through opacity-60'
                        : 'text-white/95'
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          ) : lastResult?.message ? (
            /* Confirmed Transaction / Result Caption */
            <div className="flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-2xl bg-black/80 dark:bg-black/90 backdrop-blur-md border border-white/10 text-emerald-400 font-bold text-xs sm:text-sm shadow-xl animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{lastResult.message}</span>
              {lastResult.audioUrl && (
                <button
                  type="button"
                  onClick={() => playSpeechWithWordHighlight(lastResult.audioUrl!, lastResult.message!)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer ml-1 transition-transform active:scale-95"
                  title="Listen again"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : isRecording ? (
            /* Live User Speaking Caption */
            <div className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-black/75 dark:bg-black/85 backdrop-blur-md border border-rose-500/30 text-rose-400 font-semibold text-xs sm:text-sm shadow-lg animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span>{transcript ? `"${transcript}"` : 'Listening... (बोलिए...)'}</span>
            </div>
          ) : transcript ? (
            /* Last Recognized Command Caption */
            <div className="flex items-center justify-center gap-2 px-5 py-2 rounded-2xl bg-black/60 dark:bg-black/80 backdrop-blur-md border border-white/10 text-white/90 font-medium text-xs sm:text-sm shadow-md">
              <Mic className="w-3.5 h-3.5 text-[#FFD026] shrink-0" />
              <span>"{transcript}"</span>
            </div>
          ) : (
            <div className="text-[11px] font-medium text-[var(--text-muted)] italic text-center">
              "Shubham ka ₹2000 udhaar likho" ya "Ramesh ka udhaar clear ho gaya"
            </div>
          )}
        </div>

        {/* 4. BOTTOM CONTROL BAR (Mic + Input) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 px-4 pb-3 shrink-0 max-w-2xl mx-auto w-full">
          {/* Big Mic Button */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-full glass-panel-elevated shadow-lg border border-[var(--border-color)]">
            <button
              type="button"
              onClick={isRecording ? stopListeningAndProcess : startListening}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse scale-105'
                  : 'bg-[#FFD026] text-black hover:scale-105 border border-[#E6B800] shadow-sm'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-5 h-5 font-black" />}
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
            className="flex-1 max-w-md w-full flex items-center gap-2 bg-white dark:bg-[#1A1B20] border border-[var(--border-color)] rounded-full px-4 py-2 shadow-sm"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type command e.g. Shubham ka 2000 udhaar..."
              className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder-[#A1A1AA] focus:outline-none font-medium"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || state === 'thinking' || state === 'executing'}
              className="p-2 rounded-full bg-[#18181B] hover:bg-black dark:bg-[#FFD026] text-white dark:text-black disabled:opacity-30 cursor-pointer transition-all shadow-xs"
              title="Execute Command"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* 5. SQUARE EDGE TOGGLE BUTTON (DOCKS ON RIGHT EDGE, FACING LEFT) */}
      <button
        type="button"
        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-40 w-10 h-11 rounded-l-xl bg-[#FFD026] hover:bg-[#F6B511] text-black shadow-2xl flex items-center justify-center border-y-2 border-l-2 border-[#E6B800] transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 ${
          isHistoryOpen ? 'right-80 sm:right-96' : 'right-0'
        }`}
        title={isHistoryOpen ? 'Close Voice History' : 'Open Voice History'}
      >
        {isHistoryOpen ? (
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        ) : (
          <History className="w-5 h-5 stroke-[2.5]" />
        )}
      </button>

      {/* 6. SLIDING RIGHT SIDEBAR: VOICE HISTORY */}
      <aside
        className={`fixed top-16 bottom-0 right-0 z-30 w-80 sm:w-96 bg-white/95 dark:bg-[#16171D]/95 backdrop-blur-2xl border-l border-[var(--border-color)] shadow-2xl flex flex-col p-4 transition-transform duration-300 ease-in-out ${
          isHistoryOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#FFD026] text-black font-black">
              <History className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black tracking-tight text-[var(--text-primary)]">
              Voice History
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-muted)]">
              {history.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="px-2 py-1 text-[11px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-500/10 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear all saved voice history"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(false)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable History Cards */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin min-h-0">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[var(--text-muted)]">
              <Clock className="w-8 h-8 stroke-1 mb-2 opacity-40" />
              <p className="text-xs font-semibold">No voice history yet</p>
              <p className="text-[10px] mt-0.5 opacity-75">
                Every spoken command and ledger update is saved here automatically.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-black/3 dark:bg-white/5 border border-[var(--border-color)] hover:border-[#FFD026] transition-all flex flex-col gap-1.5 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {item.amount && (
                    <span className="text-rose-600 dark:text-rose-400 font-extrabold px-1.5 py-0.5 rounded bg-rose-500/10">
                      {item.amount}
                    </span>
                  )}
                </div>

                <div className="font-bold text-[var(--text-primary)] flex items-start gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#FFD026] mt-0.5 shrink-0" />
                  <span className="line-clamp-2">"{item.command}"</span>
                </div>

                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center justify-between pt-1.5 border-t border-[var(--border-color)]/60">
                  <span className="line-clamp-1">{item.responseMessage}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.audioUrl) {
                        playSpeechWithWordHighlight(item.audioUrl, item.responseMessage);
                      } else {
                        handleGenerateCustomAudio(item.responseMessage);
                      }
                    }}
                    className="p-1 rounded bg-[#FFD026] text-black hover:bg-[#F6B511] cursor-pointer shrink-0 ml-1.5 transition-transform active:scale-95 shadow-xs"
                    title="Replay Audio"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* 6. AI AUDIO GENERATOR MODAL */}
      {showAudioGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl glass-panel-elevated p-6 space-y-4 border border-[var(--border-color)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FFD026] text-black flex items-center justify-center font-black text-base border border-[#E6B800] shadow-xs">
                  द
                </div>
                <div>
                  <h3 className="text-sm font-black text-[var(--text-primary)]">AI Audio Generator</h3>
                  <p className="text-[11px] font-medium text-[var(--text-muted)]">Audio matches whichever language you input</p>
                </div>
              </div>
              <button
                onClick={() => setShowAudioGenModal(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Language Presets */}
            <div>
              <span className="text-[11px] font-bold text-[var(--text-muted)] block mb-1.5 uppercase tracking-wider">
                Quick Language Presets (क्लिक करके टेस्ट करें):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '🇮🇳 Hindi', text: 'रमेश के खाते में ₹500 का उधार दर्ज कर दिया गया है।' },
                  { label: '🇮🇳 Odia', text: 'ରମେଶଙ୍କ ଖାତାରେ ₹୫୦୦ ଉଧାର ଯୋଡ଼ାଗଲା।' },
                  { label: '🇮🇳 Hinglish', text: 'Ramesh ke khate mein ₹500 ka udhaar likh diya gaya hai.' },
                  { label: '🇬🇧 English', text: 'Credit of Rs 500 recorded for Ramesh.' },
                  { label: '🇮🇳 Punjabi', text: 'ਰਮੇਸ਼ ਦੇ ਖਾਤੇ ਵਿੱਚ ₹500 ਦਾ ਉਧਾਰ ਦਰਜ ਕਰ ਦਿੱਤਾ ਗਿਆ ਹੈ।' },
                  { label: '🇮🇳 Bengali', text: 'রমেশের খাতায় ₹৫০০ বাকি জমা করা হয়েছে।' },
                  { label: '🇮🇳 Gujarati', text: 'રમેશના ખાતામાં ₹500 નું ઉધાર લખાઈ ગયું છે.' },
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setGenTextInput(preset.text);
                      handleGenerateCustomAudio(preset.text);
                    }}
                    className="px-2.5 py-1 rounded-full text-xs bg-black/5 dark:bg-white/5 hover:bg-[#FFD026] hover:text-black border border-[var(--border-color)] text-[var(--text-primary)] font-semibold transition-all cursor-pointer shadow-xs"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Input Area */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Enter Text to Generate Speech (किसी भी भाषा में लिखें):
              </label>
              <textarea
                rows={3}
                value={genTextInput}
                onChange={(e) => setGenTextInput(e.target.value)}
                placeholder="Type in Hindi, Odia, English, Hinglish, Bengali, Punjabi..."
                className="w-full p-3 rounded-2xl bg-white dark:bg-white/5 border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-black dark:focus:border-[#FFD026] font-medium resize-none"
              />
            </div>

            {genAudioError && (
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 font-semibold">
                {genAudioError}
              </div>
            )}

            {/* Actions & Player */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border-color)]">
              {genAudioUrl ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <audio controls src={genAudioUrl} className="h-8 max-w-[260px]" autoPlay />
                </div>
              ) : (
                <span className="text-[11px] text-[var(--text-muted)] italic">
                  Press Generate to synthesize speech
                </span>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowAudioGenModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isGeneratingAudio || !genTextInput.trim()}
                  onClick={() => handleGenerateCustomAudio(genTextInput)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#18181B] hover:bg-black dark:bg-[#FFD026] text-white dark:text-black font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isGeneratingAudio ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-[#FFD026] dark:text-black" />
                      <span>Generate Audio</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
