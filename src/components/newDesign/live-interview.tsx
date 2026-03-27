import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  PhoneOff,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Volume2,
  Clock,
  MessageSquareText,
} from 'lucide-react';
import LiveKitService from '@/services/LiveKitService';
import { createInterviewSession } from '@/services/IntervewSesstionServices';
import type { SessionCredentials } from '@/pages/newDesign/ai-mock';

// ─── Types ─────────────────────────────────────────────
export type AIState = 'listening' | 'thinking' | 'speaking';

export interface LiveConfig {
  type: string;
  difficulty: string;
  duration: string;
  mode: string;
  company: string;
}

interface TranscriptEntry {
  id: number;
  role: 'ai' | 'user';
  text: string;
  timestamp: string;
}

// ─── Scripted demo data ────────────────────────────────
const DEMO_SCRIPT: { state: AIState; duration: number; text?: string; role?: 'ai' | 'user' }[] = [
  {
    state: 'speaking',
    duration: 6000,
    role: 'ai',
    text: "Tell me about a time you had to influence a decision without having direct authority. Walk me through the situation and your approach.",
  },
  {
    state: 'listening',
    duration: 14000,
    role: 'user',
    text: "At my previous company, I was a product manager leading a cross-functional initiative to revamp our onboarding flow. The engineering director was hesitant because his team was already at capacity...",
  },
  {
    state: 'thinking',
    duration: 3000,
  },
  {
    state: 'speaking',
    duration: 5500,
    role: 'ai',
    text: "That's a strong start. Can you walk me through the specific tactics you used to get buy-in? What data or framing helped shift the conversation?",
  },
  {
    state: 'listening',
    duration: 16000,
    role: 'user',
    text: "I pulled together a dashboard showing the 40% drop-off rate during onboarding and mapped it to projected revenue impact. Then I proposed a phased rollout that wouldn't disrupt the current sprint...",
  },
  {
    state: 'thinking',
    duration: 2500,
  },
  {
    state: 'speaking',
    duration: 5000,
    role: 'ai',
    text: "Excellent use of data to frame the problem. Now let's shift gears — tell me about a time you had to deliver difficult feedback to a peer or manager.",
  },
];

// ─── Helpers ───────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ════════════════════════════════════════════════════════
// MAIN LIVE INTERVIEW COMPONENT
// ════════════════════════════════════════════════════════
export function LiveInterview({
  config,
  interviewId,
  onEnd,
  theme = 'dark',
  sessionCredentials = null,
  prefetchedStream = null,
}: {
  config: LiveConfig;
  interviewId?: string;
  onEnd: () => void;
  theme?: 'dark' | 'light';
  sessionCredentials?: SessionCredentials | null;
  prefetchedStream?: MediaStream | null;
}) {
  const isDark = theme === 'dark';
  // Demo runs ONLY when no interviewId provided.
  const isDemoMode = !interviewId;
  const isLiveMode = !isDemoMode;
  const [aiState, setAiState] = useState<AIState>(isDemoMode ? 'speaking' : 'listening');
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [scriptIdx, setScriptIdx] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [questionNum, setQuestionNum] = useState(1);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  // Guard: prevent calling onEnd() more than once
  const endCalledRef = useRef(false);
  // Guard: prevent auto-start from firing more than once
  const autoStartedRef = useRef(false);
  // Guard: only end interview after bot has spoken (prevents StrictMode premature end)
  const botHasSpokenRef = useRef(false);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const safeEnd = useCallback(() => {
    if (!endCalledRef.current) {
      endCalledRef.current = true;
      onEnd();
    }
  }, [onEnd]);
  // Whether the user is actually speaking right now (LiveKit VAD)
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  const totalSeconds = parseInt(config.duration) * 60;
  const progress = Math.min((elapsed / totalSeconds) * 100, 100);

  // ── Timer ──
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Capture audio (or reuse prefetched stream from warmup) ──
  useEffect(() => {
    if (!interviewId && !sessionCredentials) return; // demo mode — skip
    if (prefetchedStream) {
      audioStreamRef.current = prefetchedStream;
      setLocalStream(prefetchedStream);
      console.log('[LiveInterview] 🎤 Using pre-captured audio from warmup');
      return () => { audioStreamRef.current = null; };
    }
    let stream: MediaStream | null = null;
    let isCancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (isCancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        audioStreamRef.current = stream;
        setLocalStream(stream);
        console.log('[LiveInterview] 🎤 Audio captured');
      } catch (err) {
        console.warn('[LiveInterview] Could not capture audio:', err);
      }
    })();
    return () => {
      isCancelled = true;
      audioStreamRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Build LiveKit callbacks (plain function, re-created fresh on each call) ──
  const buildLiveKitCallbacks = () => ({
    onConnected: () => {
      console.log('[LiveInterview] ✅ LiveKit connected');
      setLiveConnected(true);
      setAiState('listening');
      LiveKitService.publishExistingTracks(audioStreamRef.current, null)
        .then(() => console.log('[LiveInterview] 🎤 Audio track published'))
        .catch((err: unknown) => console.error('[LiveInterview] Failed to publish audio:', err));
    },
    onDisconnected: ({ reason }: { reason?: string }) => {
      console.log('[LiveInterview] LiveKit disconnected:', reason);
      setLiveConnected(false);
      // Only end interview if bot has spoken — prevents StrictMode/cleanup from ending prematurely
      if (botHasSpokenRef.current && !endCalledRef.current) {
        setTimeout(() => safeEnd(), 0);
      }
    },
    onInterviewEnded: () => {
      console.log('[LiveInterview] Bot participant disconnected');
      if (botHasSpokenRef.current && !endCalledRef.current) {
        setTimeout(() => safeEnd(), 0);
      }
    },
    onActiveSpeakersChanged: ({ isAISpeaking, isUserSpeaking: userSpeaking }: { isAISpeaking: boolean; isUserSpeaking: boolean }) => {
      if (isAISpeaking) botHasSpokenRef.current = true;
      setIsUserSpeaking(userSpeaking);
      setAiState(isAISpeaking ? 'speaking' : 'listening');
    },
    onDataReceived: (message: { type?: string; text?: string; role?: string; label?: string }) => {
      if (message?.label === 'rtvi-ai') {
        if (message.type === 'bot-started-speaking') {
          botHasSpokenRef.current = true;
          setAiState('speaking');
        } else if (message.type === 'bot-stopped-speaking') {
          setAiState('listening');
        }
        return;
      }
      if (message?.type === 'transcript' && message.text) {
        const role = message.role === 'bot' ? 'ai' : 'user';
        setTranscript((prev) => [
          ...prev,
          { id: Date.now(), role, text: message.text!, timestamp: formatTime(elapsed) },
        ]);
        if (role === 'ai') setQuestionNum((q) => q + 1);
      }
    },
    onError: (err: unknown) => {
      console.error('[LiveInterview] LiveKit error:', err);
    },
  });

  // ── Start interview: connect to LiveKit using pre-fetched or fresh credentials ──
  const startInterview = async () => {
    let session: { liveKitUrl: string; liveKitToken: string } | null = null;

    if (sessionCredentials) {
      session = { liveKitUrl: sessionCredentials.url, liveKitToken: sessionCredentials.token };
    } else {
      console.log('[LiveInterview] Creating interview session for:', interviewId);
      try {
        const res = await createInterviewSession(interviewId!, true);
        const data = res.data?.data ?? res.data;
        const url = data.liveKitUrl ?? data.url;
        const token = data.liveKitToken ?? data.token;
        if (!url || !token) throw new Error('Missing LiveKit credentials in response');
        session = { liveKitUrl: url, liveKitToken: token };
      } catch (err) {
        console.error('[LiveInterview] Failed to create session:', err);
        return;
      }
    }

    if (LiveKitService.getIsConnected()) {
      console.log('[LiveInterview] Already connected, registering callbacks and publishing tracks');
      LiveKitService.updateCallbacks(buildLiveKitCallbacks());
      setLiveConnected(true);
      setAiState('listening');
      await LiveKitService.publishExistingTracks(audioStreamRef.current, null)
        .catch((err: unknown) => console.error('[LiveInterview] Failed to publish audio:', err));
    } else {
      console.log('[LiveInterview] Connecting to LiveKit…');
      try {
        await LiveKitService.connect(
          { url: session.liveKitUrl, token: session.liveKitToken },
          buildLiveKitCallbacks()
        );
      } catch (err: unknown) {
        console.error('[LiveInterview] LiveKit connect failed:', err);
      }
    }
  };

  // ── Auto-start once audio stream is ready ──
  useEffect(() => {
    if (!localStream || autoStartedRef.current) return;
    autoStartedRef.current = true;
    startInterview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);

  // ── Disconnect on unmount ──
  useEffect(() => {
    return () => {
      LiveKitService.updateCallbacks({});
      LiveKitService.disconnect({ intentional: true }).catch(() => {});
    };
  }, []);

  // ── Demo script cycle (only when NOT in live mode) ──
  useEffect(() => {
    if (isLiveMode) return;
    if (scriptIdx >= DEMO_SCRIPT.length) return;
    const step = DEMO_SCRIPT[scriptIdx];
    setAiState(step.state);
    setShowHint(false);
    setHintRevealed(false);

    // Add transcript entry when step starts
    if (step.text && step.role) {
      setTranscript((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: step.role!,
          text: step.text!,
          timestamp: formatTime(elapsed),
        },
      ]);
    }

    // Track question number (each AI speaking with text = new question context)
    if (step.role === 'ai') {
      setQuestionNum((prev) => {
        if (scriptIdx === 0) return 1;
        if (step.text && step.text.includes('tell me')) return prev + 1;
        return prev;
      });
    }

    const timer = setTimeout(() => {
      setScriptIdx((i) => i + 1);
    }, step.duration);

    return () => clearTimeout(timer);
  }, [scriptIdx, isLiveMode]);

  // ── "Need a hint?" after long listening pause ──
  useEffect(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    if (aiState === 'listening') {
      hintTimerRef.current = setTimeout(() => setShowHint(true), 10000);
    } else {
      setShowHint(false);
      setHintRevealed(false);
    }
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, [aiState, scriptIdx]);

  // ── Auto-scroll transcript ──
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, transcriptOpen]);

  // ── Demo mode only: restart script when done ──
  useEffect(() => {
    if (isLiveMode) return;
    if (scriptIdx >= DEMO_SCRIPT.length) {
      const t = setTimeout(() => setScriptIdx(0), 2000);
      return () => clearTimeout(t);
    }
  }, [scriptIdx, isLiveMode]);

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden select-none transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-b from-[#0b1120] via-[#0f172a] to-[#0b1120]'
        : 'bg-gradient-to-b from-slate-50 via-white to-blue-50/30'
    }`}>
      {/* ── Ambient background ── */}
      <AmbientBackground aiState={aiState} isDark={isDark} />

      {/* ── Top bar: progress + timer + question ── */}
      <div className="relative z-10 px-6 pt-5 pb-2">
        <div className="max-w-lg mx-auto">
          {/* Question + timer row */}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[11px] tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Question {questionNum}
              <span className={`mx-1 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>·</span>
              <span className="capitalize">{config.type?.replace('-', ' ') || 'Behavioral'}</span>
            </span>
            <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <Clock className="w-3 h-3" />
              <span className="tabular-nums">{formatTime(elapsed)}</span>
              <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>/</span>
              <span className={`tabular-nums ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>{formatTime(totalSeconds)}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className={`w-full h-[2px] rounded-full overflow-hidden ${isDark ? 'bg-white/[0.04]' : 'bg-slate-200'}`}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background: isDark
                  ? 'linear-gradient(90deg, rgba(59,130,246,0.5) 0%, rgba(45,212,191,0.3) 100%)'
                  : 'linear-gradient(90deg, rgba(59,130,246,0.8) 0%, rgba(45,212,191,0.6) 100%)',
              }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        {/* Orb */}
        <div className="relative mb-6">
          <LiveOrb aiState={aiState} />
          <LiveWaveformRing aiState={aiState} />
        </div>

        {/* State label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={aiState}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 mb-2"
          >
            <StateIndicator aiState={aiState} isUserSpeaking={isUserSpeaking} isDark={isDark} />
          </motion.div>
        </AnimatePresence>

        {/* Current question text (subtle, only in listening state) */}
        <AnimatePresence>
          {aiState === 'listening' && transcript.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className={`text-xs max-w-xs text-center px-6 mt-1 line-clamp-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
            >
              {transcript.filter((t) => t.role === 'ai').slice(-1)[0]?.text}
            </motion.p>
          )}
        </AnimatePresence>

        {/* "Need a hint?" prompt */}
        <AnimatePresence>
          {showHint && aiState === 'listening' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.4 }}
              className="mt-5"
            >
              {!hintRevealed ? (
                <button
                  onClick={() => setHintRevealed(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs transition-all duration-300 group ${
                    isDark
                      ? 'bg-amber-500/[0.08] border border-amber-400/[0.1] text-amber-300/70 hover:bg-amber-500/[0.12]'
                      : 'bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100'
                  }`}
                >
                  <Lightbulb className={`w-3.5 h-3.5 transition-colors ${isDark ? 'group-hover:text-amber-300' : 'group-hover:text-amber-700'}`} />
                  Need a hint?
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="max-w-xs text-center"
                >
                  <div className={`px-4 py-3 rounded-xl ${
                    isDark
                      ? 'bg-amber-500/[0.06] border border-amber-400/[0.08]'
                      : 'bg-amber-50 border border-amber-200'
                  }`}>
                    <p className={`text-xs mb-1 flex items-center justify-center gap-1.5 ${isDark ? 'text-amber-200/60' : 'text-amber-600'}`}>
                      <Lightbulb className="w-3 h-3" />
                      Hint
                    </p>
                    <p className={`text-[13px] ${isDark ? 'text-slate-300/70' : 'text-slate-600'}`}>
                      Try using the STAR method: describe the <span className={isDark ? 'text-amber-200/80' : 'text-amber-700'}>Situation</span>,
                      your <span className={isDark ? 'text-amber-200/80' : 'text-amber-700'}>Task</span>,
                      the <span className={isDark ? 'text-amber-200/80' : 'text-amber-700'}>Action</span> you took,
                      and the <span className={isDark ? 'text-amber-200/80' : 'text-amber-700'}>Result</span>.
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom controls ── */}
      <div className="relative z-10 pb-6 px-6">
        {/* Collapsible transcript — only show in live mode if there are real entries, always show in demo */}
        <div className="max-w-lg mx-auto mb-4">
          {(isDemoMode || transcript.length > 0) && (
            <>
          <button
            onClick={() => setTranscriptOpen((o) => !o)}
            className={`w-full flex items-center justify-center gap-2 py-2 text-[11px] transition-colors ${
              isDark ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <MessageSquareText className="w-3 h-3" />
            Transcript
            {transcriptOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
          </button>

          <AnimatePresence>
            {transcriptOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className={`rounded-xl p-3 max-h-44 overflow-y-auto space-y-2.5 scrollbar-thin ${
                  isDark
                    ? 'bg-white/[0.03] border border-white/[0.05]'
                    : 'bg-white border border-slate-200 shadow-sm'
                }`}>
                  {transcript.length === 0 && (
                    <p className={`text-xs text-center py-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                      Transcript will appear here...
                    </p>
                  )}
                  {transcript.map((entry) => (
                    <div key={entry.id} className="flex gap-2.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          entry.role === 'ai'
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-teal-500/15 text-teal-400'
                        }`}
                      >
                        <span className="text-[9px] font-medium">
                          {entry.role === 'ai' ? 'AI' : 'You'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-300/70' : 'text-slate-600'}`}>
                          {entry.text}
                        </p>
                        <span className={`text-[10px] mt-0.5 block ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                          {entry.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
            </>
          )}
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-center gap-5">
          {/* Mute */}
          <button
            onClick={() => {
              setMuted((m) => {
                const next = !m;
                // Sync mute state to LiveKit when in live mode
                if (isLiveMode) {
                  try { LiveKitService.getRoom()?.localParticipant?.setMicrophoneEnabled(!next); } catch { /* ignore */ }
                }
                return next;
              });
            }}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
              muted
                ? 'bg-red-500/15 border border-red-400/20 text-red-400'
                : isDark
                  ? 'bg-white/[0.06] border border-white/[0.06] text-slate-400 hover:bg-white/[0.1] hover:text-slate-300'
                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm'
            }`}
          >
            {muted ? <MicOff className="w-[18px] h-[18px]" /> : <Mic className="w-[18px] h-[18px]" />}
          </button>

          {/* End call */}
          <div className="relative">
            {showEndConfirm ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className={`h-10 px-4 rounded-full text-xs transition-colors ${
                    isDark
                      ? 'bg-white/[0.06] border border-white/[0.06] text-slate-400 hover:bg-white/[0.1]'
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={safeEnd}
                  className="h-10 px-5 rounded-full bg-red-500/90 text-white text-xs hover:bg-red-500 transition-colors shadow-lg shadow-red-500/20"
                >
                  End Session
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => setShowEndConfirm(true)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDark
                    ? 'bg-red-500/10 border border-red-400/15 text-red-400 hover:bg-red-500/20 hover:border-red-400/25'
                    : 'bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 hover:border-red-300'
                }`}
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Spacer for visual balance */}
          <div className="w-12 h-12" />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// AMBIENT BACKGROUND — shifts color with state
// ════════════════════════════════════════════════════════
function AmbientBackground({ aiState, isDark }: { aiState: AIState; isDark: boolean }) {
  const colors = useMemo(
    () => ({
      listening: {
        primary: 'rgba(45, 212, 191, 0.035)',
        secondary: 'rgba(59, 130, 246, 0.02)',
      },
      thinking: {
        primary: 'rgba(139, 92, 246, 0.03)',
        secondary: 'rgba(59, 130, 246, 0.025)',
      },
      speaking: {
        primary: 'rgba(59, 130, 246, 0.04)',
        secondary: 'rgba(45, 212, 191, 0.02)',
      },
    }),
    [],
  );

  const c = colors[aiState];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[150px]"
        animate={{ backgroundColor: c.primary }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 right-1/3 w-[400px] h-[400px] rounded-full blur-[100px]"
        animate={{ backgroundColor: c.secondary }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
      {/* Grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════
// STATE INDICATOR — label + micro-animation
// ════════════════════════════════════════════════════════
function StateIndicator({ aiState, isUserSpeaking, isDark }: { aiState: AIState; isUserSpeaking: boolean; isDark: boolean }) {
  if (aiState === 'listening') {
    return (
      <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border transition-colors duration-300 ${
        isDark
          ? 'bg-teal-500/[0.06] border-teal-400/[0.08]'
          : 'bg-teal-50 border-teal-200'
      }`}>
        <motion.div
          className={`w-2 h-2 rounded-full ${isDark ? 'bg-teal-400/70' : 'bg-teal-500'}`}
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className={`text-xs tracking-wide ${isDark ? 'text-teal-300/70' : 'text-teal-600'}`}>
          {isUserSpeaking ? "You're speaking…" : 'Listening'}
        </span>
        {/* Mini waveform — energetic when user speaks, subtle when waiting */}
        <div className="flex items-center gap-[2px]">
          {[4, 7, 10, 6].map((amp, i) => (
            <motion.span
              key={i}
              className={`w-[2px] rounded-full ${isDark ? 'bg-teal-400/50' : 'bg-teal-500/60'}`}
              animate={isUserSpeaking
                ? { height: ['3px', `${amp + 6}px`, '3px'] }
                : { height: ['3px', `${amp / 2 + 2}px`, '3px'] }
              }
              transition={{
                duration: isUserSpeaking ? 0.25 + i * 0.05 : 1.4 + i * 0.2,
                repeat: Infinity,
                delay: i * 0.07,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (aiState === 'thinking') {
    return (
      <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border ${
        isDark
          ? 'bg-violet-500/[0.06] border-violet-400/[0.08]'
          : 'bg-violet-50 border-violet-200'
      }`}>
        {/* Orbiting dots */}
        <div className="relative w-4 h-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`absolute w-1.5 h-1.5 rounded-full ${isDark ? 'bg-violet-400/60' : 'bg-violet-500/70'}`}
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 0.6,
              }}
              style={{
                top: '50%',
                left: '50%',
                transformOrigin: '0 -4px',
              }}
            />
          ))}
        </div>
        <span className={`text-xs tracking-wide ${isDark ? 'text-violet-300/70' : 'text-violet-600'}`}>Thinking</span>
      </div>
    );
  }

  // speaking
  return (
    <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border ${
      isDark
        ? 'bg-blue-500/[0.06] border-blue-400/[0.08]'
        : 'bg-blue-50 border-blue-200'
    }`}>
      <Volume2 className={`w-3.5 h-3.5 ${isDark ? 'text-blue-400/70' : 'text-blue-500'}`} />
      <span className={`text-xs tracking-wide ${isDark ? 'text-blue-300/70' : 'text-blue-600'}`}>Speaking</span>
      {/* Rhythmic bars */}
      <div className="flex items-center gap-[2px]">
        {[...Array(5)].map((_, i) => (
          <motion.span
            key={i}
            className={`w-[2px] rounded-full ${isDark ? 'bg-blue-400/40' : 'bg-blue-500/50'}`}
            animate={{ height: ['2px', `${6 + Math.sin(i * 1.2) * 6}px`, '2px'] }}
            transition={{
              duration: 0.5 + i * 0.08,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.08,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// LIVE ORB — state-reactive central element
// ════════════════════════════════════════════════════════
function LiveOrb({ aiState }: { aiState: AIState }) {
  const orbConfig = useMemo(
    () => ({
      listening: {
        gradient: 'from-teal-400/60 via-blue-500/50 to-teal-500/30',
        shadow: 'shadow-[0_0_80px_rgba(45,212,191,0.15)]',
        breathe: [1, 1.03, 1],
        breatheDuration: 3.5,
        rotateSpeed: 20,
        glowColor: 'rgba(45,212,191,0.10)',
      },
      thinking: {
        gradient: 'from-violet-400/50 via-blue-500/60 to-indigo-500/40',
        shadow: 'shadow-[0_0_80px_rgba(139,92,246,0.15)]',
        breathe: [1, 1.08, 1],
        breatheDuration: 2,
        rotateSpeed: 6,
        glowColor: 'rgba(139,92,246,0.10)',
      },
      speaking: {
        gradient: 'from-blue-400/70 via-blue-500/60 to-sky-400/40',
        shadow: 'shadow-[0_0_80px_rgba(59,130,246,0.20)]',
        breathe: [1, 1.06, 0.97, 1.04, 1],
        breatheDuration: 1.2,
        rotateSpeed: 14,
        glowColor: 'rgba(59,130,246,0.12)',
      },
    }),
    [],
  );

  const cfg = orbConfig[aiState];

  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.4, 0.8, 0.4],
          background: `radial-gradient(circle, ${cfg.glowColor} 0%, transparent 70%)`,
        }}
        transition={{
          duration: cfg.breatheDuration * 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Second pulse ring */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{ border: '1px solid' }}
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.15, 0.35, 0.15],
          borderColor:
            aiState === 'listening'
              ? 'rgba(45,212,191,0.15)'
              : aiState === 'thinking'
                ? 'rgba(139,92,246,0.15)'
                : 'rgba(59,130,246,0.15)',
        }}
        transition={{
          duration: cfg.breatheDuration * 1.2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.3,
        }}
      />

      {/* Core orb */}
      <motion.div
        className={`relative w-24 h-24 rounded-full overflow-hidden ${cfg.shadow}`}
        animate={{ scale: cfg.breathe }}
        transition={{
          duration: cfg.breatheDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Base gradient — cross-fades */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient}`}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Rotating secondary gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-tl from-white/[0.06] via-transparent to-white/[0.04]"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: cfg.rotateSpeed, repeat: Infinity, ease: 'linear' }}
        />

        {/* Light sweep */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{
            duration: aiState === 'thinking' ? 1.5 : 3,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatDelay: aiState === 'thinking' ? 0.5 : 2,
          }}
        />

        {/* Inner highlight */}
        <div className="absolute top-2.5 left-3.5 w-7 h-5 rounded-full bg-white/15 blur-sm" />

        {/* Thinking: inner rotation overlay */}
        {aiState === 'thinking' && (
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0%, rgba(139,92,246,0.12) 25%, transparent 50%, rgba(59,130,246,0.08) 75%, transparent 100%)',
            }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </motion.div>

      {/* Floating particles (fewer, calmer) */}
      {[...Array(5)].map((_, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const r = 48 + (i % 2) * 12;
        return (
          <motion.div
            key={i}
            className={`absolute w-1 h-1 rounded-full ${
              aiState === 'listening'
                ? 'bg-teal-300/25'
                : aiState === 'thinking'
                  ? 'bg-violet-300/25'
                  : 'bg-blue-300/25'
            }`}
            style={{
              left: `calc(50% + ${Math.cos(angle) * r}px)`,
              top: `calc(50% + ${Math.sin(angle) * r}px)`,
            }}
            animate={{
              y: [0, -8 - i * 2, 0],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.7,
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// LIVE WAVEFORM RING — reactive to state
// ════════════════════════════════════════════════════════
function LiveWaveformRing({ aiState }: { aiState: AIState }) {
  const bars = 40;

  const getBarConfig = useCallback(
    (i: number) => {
      const phase = (i / bars) * Math.PI * 2;
      if (aiState === 'listening') {
        return {
          heights: [`${3 + Math.abs(Math.sin(phase)) * 3}px`, `${5 + Math.random() * 10}px`, `${3 + Math.abs(Math.sin(phase)) * 3}px`],
          opacity: [0.15, 0.45, 0.15],
          duration: 0.8 + Math.random() * 0.5,
          color: 'bg-teal-400/30',
        };
      }
      if (aiState === 'thinking') {
        return {
          heights: ['2px', '4px', '2px'],
          opacity: [0.06, 0.15, 0.06],
          duration: 2.5 + Math.random() * 1,
          color: 'bg-violet-400/20',
        };
      }
      // speaking — rhythmic, structured
      const amp = Math.abs(Math.sin(phase * 2));
      return {
        heights: [`${3 + amp * 2}px`, `${6 + amp * 14}px`, `${3 + amp * 2}px`],
        opacity: [0.2, 0.55, 0.2],
        duration: 0.4 + amp * 0.3,
        color: 'bg-blue-400/25',
      };
    },
    [aiState],
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative w-52 h-52">
        {[...Array(bars)].map((_, i) => {
          const angle = (i / bars) * 360;
          const rad = (angle * Math.PI) / 180;
          const radius = 104;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;
          const cfg = getBarConfig(i);

          return (
            <motion.div
              key={`${aiState}-${i}`}
              className={`absolute rounded-full ${cfg.color}`}
              style={{
                width: '1.5px',
                left: '50%',
                top: '50%',
                transform: `translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
                transformOrigin: 'center',
              }}
              animate={{
                height: cfg.heights,
                opacity: cfg.opacity,
              }}
              transition={{
                duration: cfg.duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: (i / bars) * (aiState === 'speaking' ? 0.3 : 0.8),
              }}
            />
          );
        })}
      </div>
    </div>
  );
}