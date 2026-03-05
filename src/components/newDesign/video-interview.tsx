import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Lightbulb,
  Clock,
  MessageSquareText,
  Eye,
  EyeOff,
  CircleDot,
  AlertTriangle,
  X,
  FileText,
  HelpCircle,
  User,
} from 'lucide-react';
import LiveKitService from '@/services/LiveKitService';
import type { SessionCredentials } from '@/pages/newDesign/ai-mock';

// ─── Types ─────────────────────────────────────────────
export type AIState = 'listening' | 'thinking' | 'speaking';

export interface VideoInterviewConfig {
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

// ─── Demo script ───────────────────────────────────────
const DEMO_SCRIPT: { state: AIState; duration: number; text?: string; role?: 'ai' | 'user' }[] = [
  {
    state: 'speaking',
    duration: 7000,
    role: 'ai',
    text: "Welcome! I'm glad you could join us today. Let's start with a behavioral question — tell me about a time you had to influence a decision without having direct authority.",
  },
  {
    state: 'listening',
    duration: 15000,
    role: 'user',
    text: "At my previous company, I was a product manager leading a cross-functional initiative to revamp our onboarding flow. The engineering director was hesitant because his team was already at capacity...",
  },
  { state: 'thinking', duration: 3500 },
  {
    state: 'speaking',
    duration: 6000,
    role: 'ai',
    text: "That's a strong start. Can you walk me through the specific tactics you used to get buy-in? What data or framing helped shift the conversation?",
  },
  {
    state: 'listening',
    duration: 16000,
    role: 'user',
    text: "I pulled together a dashboard showing the 40% drop-off rate during onboarding and mapped it to projected revenue impact. Then I proposed a phased rollout that wouldn't disrupt the current sprint...",
  },
  { state: 'thinking', duration: 3000 },
  {
    state: 'speaking',
    duration: 5500,
    role: 'ai',
    text: "Excellent use of data to frame the problem. Now let's shift gears — tell me about a time you had to deliver difficult feedback to a peer or manager.",
  },
];

const TOTAL_QUESTIONS = 6;

// ─── Helpers ───────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    behavioral: 'Behavioral Mock',
    product: 'Product Sense',
    'system-design': 'System Design',
    resume: 'Resume Deep-Dive',
  };
  return map[type] || 'Mock Interview';
}

// ════════════════════════════════════════════════════════
// MAIN VIDEO INTERVIEW COMPONENT
// ════════════════════════════════════════════════════════
export function VideoInterview({
  config,
  onEnd,
  theme = 'dark',
  sessionCredentials = null,
}: {
  config: VideoInterviewConfig;
  onEnd: () => void;
  theme?: 'dark' | 'light';
  sessionCredentials?: SessionCredentials | null;
}) {
  const isDark = theme === 'dark';
  const [aiState, setAiState] = useState<AIState>('speaking');
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [scriptIdx, setScriptIdx] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [questionNum, setQuestionNum] = useState(1);
  const [showEndModal, setShowEndModal] = useState(false);
  const [selfViewHidden, setSelfViewHidden] = useState(false);
  const [currentSpeakingText, setCurrentSpeakingText] = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True only after LiveKit successfully connects (not just when credentials exist)
  const [liveConnected, setLiveConnected] = useState(false);
  // Demo runs when credentials are absent OR when LiveKit failed to connect
  const isLiveMode = liveConnected;
  // Guard: only auto-end after bot has actually spoken at least once
  const botHasSpokenRef = useRef(false);
  // Guard: prevent calling onEnd() more than once
  const endCalledRef = useRef(false);
  const safeEnd = useCallback(() => {
    if (!endCalledRef.current) {
      endCalledRef.current = true;
      onEnd();
    }
  }, [onEnd]);
  // Debounce: keeps visual 'speaking' for a moment after AI audio stops to
  // prevent flickering during brief natural pauses in the AI's speech.
  const aiSpeakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether the user is actually speaking right now (LiveKit VAD)
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  // Pre-captured media stream — captured on mount so tracks are ready before
  // onConnected fires. Avoids triggering a new getUserMedia() call during AI
  // speech (which can cause an audio context interruption).
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const totalSeconds = parseInt(config.duration) * 60;
  const remaining = Math.max(totalSeconds - elapsed, 0);

  // ── Timer ──
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Pre-capture camera & mic on mount ──
  // Grab the stream early so that when onConnected fires we can call
  // publishExistingTracks() immediately without any new getUserMedia() call
  // that could interrupt the AI's audio context.
  useEffect(() => {
    let stream: MediaStream | null = null;
    const capture = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        console.log('[VideoInterview] 📷 Local media pre-captured');
      } catch (err) {
        console.warn('[VideoInterview] Could not pre-capture media:', err);
      }
    };
    capture();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, []);

  // ── LiveKit connection (when sessionCredentials are available) ──
  useEffect(() => {
    if (!sessionCredentials) return;

    console.log('[VideoInterview] Connecting to LiveKit…');

    LiveKitService.connect(
      { url: sessionCredentials.url, token: sessionCredentials.token },
      {
        onConnected: () => {
          console.log('[VideoInterview] ✅ LiveKit connected');
          setLiveConnected(true);
          setAiState('listening');
          // Publish the pre-captured tracks so the AI can hear/see the user.
          // Using publishExistingTracks avoids a new getUserMedia() call which
          // would create a new audio context and can interrupt AI speech.
          const stream = localStreamRef.current;
          if (stream) {
            LiveKitService.publishExistingTracks(stream, stream)
              .then(() => console.log('[VideoInterview] 🎤📹 Pre-captured tracks published'))
              .catch((err: unknown) => {
                console.error('[VideoInterview] publishExistingTracks failed — falling back:', err);
                LiveKitService.setMicrophoneEnabled(true).catch(console.error);
                LiveKitService.setCameraEnabled(true).catch(console.error);
              });
          } else {
            // No pre-captured stream (e.g. permissions denied) — request now
            LiveKitService.setMicrophoneEnabled(true)
              .then(() => console.log('[VideoInterview] 🎤 Microphone enabled (fallback)'))
              .catch((err: unknown) => console.error('[VideoInterview] Failed to enable microphone:', err));
            LiveKitService.setCameraEnabled(true)
              .catch((err: unknown) => console.error('[VideoInterview] Failed to enable camera:', err));
          }
          // Also subscribe to per-participant speaking events for lower-latency
          // visual sync (fires at the same cadence as ActiveSpeakersChanged but
          // individual participant granularity is more reliable).
          const room = LiveKitService.getRoom();
          if (room) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const attachSpeakingHandler = (p: any) => {
              p.on('isSpeakingChanged', (speaking: boolean) => {
                if (speaking) {
                  botHasSpokenRef.current = true;
                  if (aiSpeakingTimerRef.current) {
                    clearTimeout(aiSpeakingTimerRef.current);
                    aiSpeakingTimerRef.current = null;
                  }
                  setAiState('speaking');
                }
              });
            };
            room.remoteParticipants.forEach(attachSpeakingHandler);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            room.on('participantConnected', (p: any) => attachSpeakingHandler(p));
          }
        },
        onDisconnected: ({ reason }: { reason?: string }) => {
          console.log('[VideoInterview] LiveKit disconnected:', reason);
          // Only auto-end after the bot has actually spoken — prevents premature exit
          // during the initial room setup / bot warm-up phase.
          if (botHasSpokenRef.current) {
            safeEnd();
          } else {
            console.warn('[VideoInterview] Disconnect before bot spoke — staying on screen');
          }
        },
        onInterviewEnded: () => {
          // Bot participant disconnected. Only treat as interview end if bot already spoke.
          console.log('[VideoInterview] Bot participant disconnected');
          if (botHasSpokenRef.current) {
            safeEnd();
          }
        },
        onActiveSpeakersChanged: ({ isAISpeaking, isUserSpeaking: userSpeaking }: { isAISpeaking: boolean; isUserSpeaking: boolean }) => {
          setIsUserSpeaking(userSpeaking);
          if (isAISpeaking) {
            botHasSpokenRef.current = true;
            // Cancel any pending debounce so we don't flicker back to 'listening'
            if (aiSpeakingTimerRef.current) {
              clearTimeout(aiSpeakingTimerRef.current);
              aiSpeakingTimerRef.current = null;
            }
            setAiState('speaking');
          } else {
            // Debounce: keep 'speaking' visual for 600 ms after AI goes quiet
            // to absorb natural inter-sentence pauses without flickering.
            if (aiSpeakingTimerRef.current) clearTimeout(aiSpeakingTimerRef.current);
            aiSpeakingTimerRef.current = setTimeout(() => {
              aiSpeakingTimerRef.current = null;
              setAiState('listening');
            }, 600);
          }
        },
        onDataReceived: (message: { type?: string; text?: string; role?: string }) => {
          if (message?.type === 'transcript' && message.text) {
            const role = message.role === 'bot' ? 'ai' : 'user';
            if (role === 'ai') setCurrentSpeakingText(message.text);
            setTranscript((prev) => [
              ...prev,
              { id: Date.now(), role, text: message.text!, timestamp: formatTime(elapsed) },
            ]);
            if (role === 'ai') setQuestionNum((q) => q + 1);
          }
        },
        onError: (err: unknown) => {
          console.error('[VideoInterview] LiveKit error:', err);
        },
      }
    ).catch((err: unknown) => {
      console.error('[VideoInterview] LiveKit connect failed — falling back to demo', err);
      // liveConnected stays false → demo script will run as fallback
    });

    return () => {
      if (aiSpeakingTimerRef.current) clearTimeout(aiSpeakingTimerRef.current);
      LiveKitService.disconnect({ intentional: true }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCredentials]);

  // ── Demo script cycle (only when NOT in live mode) ──
  useEffect(() => {
    if (isLiveMode) return;
    if (scriptIdx >= DEMO_SCRIPT.length) return;
    const step = DEMO_SCRIPT[scriptIdx];
    setAiState(step.state);
    setShowHint(false);
    setHintRevealed(false);

    if (step.role === 'ai' && step.text) {
      setCurrentSpeakingText(step.text);
    } else if (step.state === 'thinking') {
      setCurrentSpeakingText('');
    }

    if (step.text && step.role) {
      setTranscript((prev) => [
        ...prev,
        { id: Date.now(), role: step.role!, text: step.text!, timestamp: formatTime(elapsed) },
      ]);
    }

    if (step.role === 'ai') {
      setQuestionNum((prev) => {
        if (scriptIdx === 0) return 1;
        if (step.text && step.text.toLowerCase().includes('tell me')) return prev + 1;
        return prev;
      });
    }

    const timer = setTimeout(() => setScriptIdx((i) => i + 1), step.duration);
    return () => clearTimeout(timer);
  }, [scriptIdx, isLiveMode]);

  // ── Hint after long pause ──
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
    <div className={`h-screen flex flex-col relative overflow-hidden select-none transition-colors duration-500 ${
      isDark ? 'bg-[#0a0f1c]' : 'bg-slate-100'
    }`}>
      {/* ════ Top Info Bar ════ */}
      <TopInfoBar
        type={config.type}
        questionNum={questionNum}
        totalQuestions={TOTAL_QUESTIONS}
        remaining={remaining}
        isDark={isDark}
      />

      {/* ════ Split-Screen Video Area ════ */}
      <div className="flex-1 flex items-center justify-center gap-3 px-3 py-3 min-h-0">
        {/* ── Left Panel: Interviewer ── */}
        <InterviewerPanel
          aiState={aiState}
          currentText={currentSpeakingText}
          isDark={isDark}
        />

        {/* ── Right Panel: User (You) ── */}
        <UserPanel
          aiState={aiState}
          isUserSpeaking={isUserSpeaking}
          localStream={localStream}
          cameraOn={cameraOn}
          muted={muted}
          selfViewHidden={selfViewHidden}
          showHint={showHint}
          hintRevealed={hintRevealed}
          onRevealHint={() => setHintRevealed(true)}
          isDark={isDark}
        />
      </div>

      {/* ════ Transcript Drawer ════ */}
      <AnimatePresence>
        {transcriptOpen && (
          <TranscriptDrawer
            transcript={transcript}
            transcriptEndRef={transcriptEndRef}
            onClose={() => setTranscriptOpen(false)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* ════ Bottom Control Bar ════ */}
      <BottomControlBar
        muted={muted}
        cameraOn={cameraOn}
        transcriptOpen={transcriptOpen}
        selfViewHidden={selfViewHidden}
        onToggleMic={() => {
          setMuted((m) => {
            const next = !m;
            if (isLiveMode) {
              try { LiveKitService.getRoom()?.localParticipant?.setMicrophoneEnabled(!next); } catch { /* ignore */ }
            }
            return next;
          });
        }}
        onToggleCamera={() => {
          setCameraOn((c) => {
            const next = !c;
            if (isLiveMode) {
              try { LiveKitService.getRoom()?.localParticipant?.setCameraEnabled(next); } catch { /* ignore */ }
            }
            return next;
          });
        }}
        onToggleTranscript={() => setTranscriptOpen((o) => !o)}
        onToggleSelfView={() => setSelfViewHidden((h) => !h)}
        onShowHint={() => setShowHint(true)}
        onEndInterview={() => setShowEndModal(true)}
        isDark={isDark}
      />

      {/* ════ End Confirmation Modal ════ */}
      <AnimatePresence>
        {showEndModal && (
          <EndConfirmationModal
            onCancel={() => setShowEndModal(false)}
            onConfirm={safeEnd}
            elapsed={elapsed}
            questionNum={questionNum}
            isDark={isDark}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TOP INFO BAR
// ════════════════════════════════════════════════════════
function TopInfoBar({
  type,
  questionNum,
  totalQuestions,
  remaining,
  isDark,
}: {
  type: string;
  questionNum: number;
  totalQuestions: number;
  remaining: number;
  isDark: boolean;
}) {
  return (
    <div className={`relative z-20 flex items-center justify-between px-5 py-2.5 border-b backdrop-blur-sm transition-colors duration-500 ${
      isDark
        ? 'bg-[#0c1120]/90 border-white/[0.04]'
        : 'bg-white/90 border-slate-200'
    }`}>
      {/* Left: Interview title */}
      <div className="flex items-center gap-2.5">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span className={`text-[12px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {getTypeLabel(type)}
          <span className={`mx-1.5 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>•</span>
          <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Product Manager</span>
          <span className={`mx-1.5 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>•</span>
          <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>30 min</span>
        </span>
      </div>

      {/* Center: Progress */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border ${
          isDark
            ? 'bg-white/[0.04] border-white/[0.05]'
            : 'bg-blue-50 border-blue-100'
        }`}>
          <span className="text-[11px] text-blue-400 tabular-nums">Q{questionNum}</span>
          <span className={`text-[9px] ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>/</span>
          <span className={`text-[11px] tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{totalQuestions}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-1 rounded-full transition-all duration-300 ${
                i < questionNum
                  ? 'bg-blue-400'
                  : i === questionNum
                    ? 'bg-blue-400/40'
                    : isDark ? 'bg-white/[0.08]' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Right: Timer + recording */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1 text-[11px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          <CircleDot className="w-2.5 h-2.5 text-red-400/50" />
          <span>REC</span>
        </div>
        <div className={`h-2.5 w-px ${isDark ? 'bg-white/[0.05]' : 'bg-slate-200'}`} />
        <div className="flex items-center gap-1 text-[11px]">
          <Clock className={`w-2.5 h-2.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <span className={`tabular-nums ${remaining < 300 ? 'text-amber-400/80' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {formatTime(remaining)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// LEFT PANEL: INTERVIEWER
// ════════════════════════════════════════════════════════
function InterviewerPanel({
  aiState,
  currentText,
  isDark,
}: {
  aiState: AIState;
  currentText: string;
  isDark: boolean;
}) {
  return (
    <div className="w-[calc(50%-6px)] aspect-video rounded-xl overflow-hidden relative bg-gradient-to-br from-[#0e1628] via-[#111d33] to-[#0d1424] border border-white/[0.04]">
      {/* Ambient glow */}
      <InterviewerAmbient aiState={aiState} />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        {/* Avatar */}
        <div className="relative mb-5">
          <VirtualAvatar aiState={aiState} />
        </div>

        {/* Name + role */}
        <motion.div
          className="flex flex-col items-center gap-1 mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-[14px] text-slate-200">Alex Chen</h3>
          <p className="text-[10px] text-slate-500 tracking-wide">
            Interviewer <span className="text-slate-600 mx-1">•</span> Hiring Manager (Simulation)
          </p>
        </motion.div>

        {/* State indicator */}
        <AnimatePresence mode="wait">
          <motion.div
            key={aiState}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <InterviewerStateLabel aiState={aiState} />
          </motion.div>
        </AnimatePresence>

        {/* Speaking text bubble */}
        <AnimatePresence>
          {aiState === 'speaking' && currentText && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="mt-4 max-w-sm mx-6 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-sm"
            >
              <p className="text-[12.5px] text-slate-300/80 leading-relaxed text-center">
                "{currentText}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thinking indicator */}
        <AnimatePresence>
          {aiState === 'thinking' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex items-center gap-2"
            >
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-violet-400/50"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                  />
                ))}
              </div>
              <span className="text-[11px] text-violet-300/60">Analyzing your answer…</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom-left name badge (Zoom-style) */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/40 backdrop-blur-sm">
        <span className="text-[11px] text-white/80">Alex Chen</span>
        <span className="text-[9px] text-slate-400">(AI)</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// RIGHT PANEL: USER (YOU)
// ════════════════════════════════════════════════════════
function UserPanel({
  aiState,
  isUserSpeaking,
  localStream,
  cameraOn,
  muted,
  selfViewHidden,
  showHint,
  hintRevealed,
  onRevealHint,
  isDark,
}: {
  aiState: AIState;
  isUserSpeaking: boolean;
  localStream: MediaStream | null;
  cameraOn: boolean;
  muted: boolean;
  selfViewHidden: boolean;
  showHint: boolean;
  hintRevealed: boolean;
  onRevealHint: () => void;
  isDark: boolean;
}) {
  const isActive = aiState === 'listening';

  // Attach the local webcam stream to the video element whenever it's available
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div
      className={`w-[calc(50%-6px)] aspect-video rounded-xl overflow-hidden relative border transition-all duration-700 ${
        isActive
          ? 'border-teal-400/20 shadow-[inset_0_0_80px_rgba(45,212,191,0.02)]'
          : 'border-white/[0.04]'
      }`}
    >
      {/* Video / Camera feed area */}
      {cameraOn && !selfViewHidden ? (
        <div className="absolute inset-0 bg-gradient-to-br from-[#13192b] via-[#111827] to-[#0f1521]">
          {localStream ? (
            /* ── Real webcam feed ── */
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />

              {/* VAD waveform + status label — overlaid at bottom center */}
              <div className="absolute bottom-12 left-0 right-0 flex justify-center z-10 pointer-events-none">
                <AnimatePresence mode="wait">
                  {isActive ? (
                    <motion.div
                      key="active"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-[3px]">
                        {[3, 6, 9, 5].map((amp, i) => (
                          <motion.span
                            key={i}
                            className="w-[2px] rounded-full bg-teal-400/70"
                            animate={isUserSpeaking
                              ? { height: ['3px', `${amp + 8}px`, '3px'] }
                              : { height: ['3px', `${amp / 2 + 2}px`, '3px'] }
                            }
                            transition={{
                              duration: isUserSpeaking ? 0.25 + i * 0.05 : 1.5 + i * 0.2,
                              repeat: Infinity,
                              delay: i * 0.07,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-teal-300/80">
                        {isUserSpeaking ? 'Speaking…' : 'Your turn to speak'}
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="inactive"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm"
                    >
                      <span className="text-[11px] text-slate-400/80">
                        {aiState === 'speaking' ? 'Listening to interviewer…' : 'Please wait…'}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            /* ── Fallback: stream not yet available — show avatar placeholder ── */
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative flex flex-col items-center">
                {/* User avatar */}
                <div className="relative">
                  <motion.div
                    className={`w-24 h-24 rounded-full flex items-center justify-center border transition-all duration-700 ${
                      isActive
                        ? 'bg-gradient-to-br from-teal-900/30 via-[#152030] to-teal-950/20 border-teal-400/15'
                        : 'bg-gradient-to-br from-slate-700/20 via-[#1a2035] to-slate-800/15 border-white/[0.06]'
                    }`}
                    animate={isActive ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <User className={`w-10 h-10 transition-colors duration-700 ${isActive ? 'text-teal-400/40' : 'text-slate-500/30'}`} />
                  </motion.div>

                  {isActive && (
                    <motion.div
                      className="absolute -inset-2 rounded-full border-2 border-teal-400/20"
                      animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  {isActive && (
                    <motion.div
                      className="absolute -inset-6 rounded-full"
                      animate={{ opacity: [0, 0.15, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 70%)' }}
                    />
                  )}
                </div>

                {/* Status text */}
                <AnimatePresence mode="wait">
                  {isActive ? (
                    <motion.div
                      key="active"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="mt-4 flex items-center gap-2"
                    >
                      <div className="flex items-center gap-[3px]">
                        {[3, 6, 9, 5].map((amp, i) => (
                          <motion.span
                            key={i}
                            className="w-[2px] rounded-full bg-teal-400/50"
                            animate={isUserSpeaking
                              ? { height: ['3px', `${amp + 8}px`, '3px'] }
                              : { height: ['3px', `${amp / 2 + 2}px`, '3px'] }
                            }
                            transition={{
                              duration: isUserSpeaking ? 0.25 + i * 0.05 : 1.5 + i * 0.2,
                              repeat: Infinity,
                              delay: i * 0.07,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-teal-300/60">
                        {isUserSpeaking ? 'Speaking…' : 'Your turn to speak'}
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="inactive"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="mt-4"
                    >
                      <span className="text-[11px] text-slate-600">
                        {aiState === 'speaking' ? 'Listening to interviewer…' : 'Please wait…'}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Webcam ambient gradient — subtle vignette over the video */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-black/5 pointer-events-none" />
        </div>
      ) : !cameraOn ? (
        /* Camera off */
        <div className="absolute inset-0 bg-[#0d1320] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-3 border border-white/[0.04]">
              <VideoOff className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-[12px] text-slate-600">Camera is off</p>
          </div>
        </div>
      ) : (
        /* Self-view hidden */
        <div className="absolute inset-0 bg-[#0d1320] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-3 border border-white/[0.04]">
              <EyeOff className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-[12px] text-slate-600">Self-view hidden</p>
            <p className="text-[10px] text-slate-700 mt-1">Camera is still on for recording</p>
          </div>
        </div>
      )}

      {/* Muted indicator */}
      {muted && (
        <div className="absolute top-3 right-3 z-10 w-7 h-7 rounded-lg bg-red-500/80 flex items-center justify-center shadow-lg shadow-red-500/20">
          <MicOff className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      {/* Bottom-left name badge (Zoom-style) */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/40 backdrop-blur-sm">
        <span className="text-[11px] text-white/80">You</span>
        {muted && <MicOff className="w-2.5 h-2.5 text-red-400/80" />}
      </div>

      {/* Hint overlay (appears on user's panel) */}
      <AnimatePresence>
        {showHint && aiState === 'listening' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20"
          >
            {!hintRevealed ? (
              <button
                onClick={onRevealHint}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/[0.08] border border-amber-400/[0.12] text-amber-300/80 text-[12px] hover:bg-amber-500/[0.15] transition-all duration-300 backdrop-blur-md"
              >
                <Lightbulb className="w-3 h-3" />
                Need a hint?
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-xs"
              >
                <div className="px-4 py-3 rounded-xl bg-[#151d2e]/95 border border-amber-400/[0.1] backdrop-blur-md">
                  <p className="text-[10px] text-amber-300/60 mb-1 flex items-center gap-1">
                    <Lightbulb className="w-2.5 h-2.5" /> Hint
                  </p>
                  <p className="text-[12px] text-slate-300/80 leading-relaxed">
                    Try using the STAR method: <span className="text-amber-200/90">Situation</span>,{' '}
                    <span className="text-amber-200/90">Task</span>,{' '}
                    <span className="text-amber-200/90">Action</span>,{' '}
                    <span className="text-amber-200/90">Result</span>.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// VIRTUAL AVATAR
// ════════════════════════════════════════════════════════
function VirtualAvatar({ aiState }: { aiState: AIState }) {
  const cfg = useMemo(
    () => ({
      speaking: {
        borderColor: 'rgba(59, 130, 246, 0.25)',
        glowColor: 'rgba(59, 130, 246, 0.06)',
        ringScale: [1, 1.04, 1] as number[],
        ringDuration: 1.5,
        avatarBreath: [1, 1.02, 0.99, 1.01, 1] as number[],
        avatarDuration: 1.2,
      },
      listening: {
        borderColor: 'rgba(45, 212, 191, 0.15)',
        glowColor: 'rgba(45, 212, 191, 0.03)',
        ringScale: [1, 1.01, 1] as number[],
        ringDuration: 3.5,
        avatarBreath: [1, 1.005, 1] as number[],
        avatarDuration: 5,
      },
      thinking: {
        borderColor: 'rgba(139, 92, 246, 0.2)',
        glowColor: 'rgba(139, 92, 246, 0.05)',
        ringScale: [1, 1.05, 1] as number[],
        ringDuration: 2,
        avatarBreath: [1, 1.02, 1] as number[],
        avatarDuration: 2.5,
      },
    }),
    [],
  );

  const c = cfg[aiState];

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow */}
      <motion.div
        className="absolute w-40 h-40 rounded-full"
        animate={{ scale: c.ringScale, boxShadow: `0 0 50px 15px ${c.glowColor}` }}
        transition={{ duration: c.ringDuration, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Ring border */}
      <motion.div
        className="absolute w-32 h-32 rounded-full"
        style={{ border: '1.5px solid' }}
        animate={{ borderColor: c.borderColor, scale: c.ringScale }}
        transition={{ duration: c.ringDuration, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
      />

      {/* Speaking waveform */}
      {aiState === 'speaking' && <SpeakingWaveRing />}

      {/* Core avatar */}
      <motion.div
        className="relative w-24 h-24 rounded-full overflow-hidden"
        animate={{ scale: c.avatarBreath }}
        transition={{ duration: c.avatarDuration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#192640] via-[#1c2c4a] to-[#15203a]" />

        {/* Abstract silhouette */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-b from-slate-500/18 to-slate-600/12 border border-slate-400/[0.06] flex items-center justify-center">
            <span className="text-[14px] text-slate-300/45">AC</span>
          </div>
          <div className="mt-1 w-14 h-5 rounded-t-[50%] bg-gradient-to-b from-slate-500/10 to-transparent border-t border-x border-slate-400/[0.05]" />
        </div>

        {/* State color overlay */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background:
              aiState === 'speaking'
                ? 'radial-gradient(circle at 50% 40%, rgba(59,130,246,0.06) 0%, transparent 70%)'
                : aiState === 'thinking'
                  ? 'radial-gradient(circle at 50% 40%, rgba(139,92,246,0.05) 0%, transparent 70%)'
                  : 'radial-gradient(circle at 50% 40%, rgba(45,212,191,0.03) 0%, transparent 70%)',
          }}
          transition={{ duration: 0.8 }}
        />

        {/* Thinking spinner */}
        {aiState === 'thinking' && (
          <motion.div
            className="absolute inset-0 opacity-25"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0%, rgba(139,92,246,0.1) 25%, transparent 50%, rgba(59,130,246,0.06) 75%, transparent 100%)',
            }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        )}

        <div className="absolute inset-0 rounded-full border border-white/[0.05]" />
      </motion.div>
    </div>
  );
}

// ── Speaking wave ring ──
function SpeakingWaveRing() {
  const bars = 28;
  return (
    <div
      className="absolute pointer-events-none"
      style={{ width: 148, height: 148, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const angle = (i / bars) * 360;
        const rad = (angle * Math.PI) / 180;
        const radius = 64;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        const amp = Math.abs(Math.sin((i / bars) * Math.PI * 3));
        return (
          <motion.div
            key={i}
            className="absolute rounded-full bg-blue-400/20"
            style={{
              width: '1.5px',
              left: '50%',
              top: '50%',
              transform: `translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
              transformOrigin: 'center',
            }}
            animate={{ height: [`${2 + amp}px`, `${3 + amp * 8}px`, `${2 + amp}px`], opacity: [0.1, 0.35, 0.1] }}
            transition={{ duration: 0.5 + amp * 0.3, repeat: Infinity, ease: 'easeInOut', delay: (i / bars) * 0.35 }}
          />
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// INTERVIEWER STATE LABEL
// ════════════════════════════════════════════════════════
function InterviewerStateLabel({ aiState }: { aiState: AIState }) {
  if (aiState === 'listening') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/[0.06] border border-teal-400/[0.07]">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-teal-400/60"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="text-[10px] text-teal-300/60 tracking-wide">Listening</span>
      </div>
    );
  }

  if (aiState === 'thinking') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/[0.06] border border-violet-400/[0.07]">
        <div className="relative w-3 h-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-violet-400/50"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', delay: i * 0.6 }}
              style={{ top: '50%', left: '50%', transformOrigin: '0 -3px' }}
            />
          ))}
        </div>
        <span className="text-[10px] text-violet-300/60 tracking-wide">Thinking</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/[0.06] border border-blue-400/[0.07]">
      <div className="flex items-center gap-[2px]">
        {[...Array(4)].map((_, i) => (
          <motion.span
            key={i}
            className="w-[2px] rounded-full bg-blue-400/45"
            animate={{ height: ['2px', `${4 + Math.sin(i * 1.5) * 4}px`, '2px'] }}
            transition={{ duration: 0.45 + i * 0.08, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
          />
        ))}
      </div>
      <span className="text-[10px] text-blue-300/60 tracking-wide">Speaking</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// AMBIENT BACKGROUND (interviewer panel)
// ════════════════════════════════════════════════════════
function InterviewerAmbient({ aiState }: { aiState: AIState }) {
  const c = useMemo(
    () => ({
      listening: { primary: 'rgba(45, 212, 191, 0.02)', secondary: 'rgba(59, 130, 246, 0.012)' },
      thinking: { primary: 'rgba(139, 92, 246, 0.02)', secondary: 'rgba(59, 130, 246, 0.015)' },
      speaking: { primary: 'rgba(59, 130, 246, 0.025)', secondary: 'rgba(45, 212, 191, 0.012)' },
    }),
    [],
  )[aiState];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(8,12,28,0.5) 100%)' }}
      />
      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full blur-[100px]"
        animate={{ backgroundColor: c.primary }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] rounded-full blur-[70px]"
        animate={{ backgroundColor: c.secondary }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TRANSCRIPT DRAWER (bottom)
// ════════════════════════════════════════════════════════
function TranscriptDrawer({
  transcript,
  transcriptEndRef,
  onClose,
  isDark,
}: {
  transcript: TranscriptEntry[];
  transcriptEndRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  isDark: boolean;
}) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 180, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`relative z-20 border-t backdrop-blur-md overflow-hidden transition-colors duration-500 ${
        isDark
          ? 'bg-[#0c1120]/95 border-white/[0.05]'
          : 'bg-white/95 border-slate-200'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-2 border-b ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
        <div className="flex items-center gap-2">
          <FileText className={`w-3 h-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Live Transcript</span>
        </div>
        <button
          onClick={onClose}
          className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
            isDark
              ? 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.06]'
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Transcript content */}
      <div className="overflow-y-auto px-5 py-2 space-y-2 h-[calc(100%-36px)] scrollbar-thin">
        {transcript.length === 0 && (
          <p className={`text-[11px] text-center py-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            Transcript will appear here as the conversation progresses...
          </p>
        )}
        {transcript.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2">
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                entry.role === 'ai' ? 'bg-blue-500/15 text-blue-400' : 'bg-teal-500/15 text-teal-400'
              }`}
            >
              <span className="text-[7px]">{entry.role === 'ai' ? 'AI' : 'You'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[11.5px] leading-relaxed ${isDark ? 'text-slate-300/70' : 'text-slate-600'}`}>{entry.text}</p>
              <span className={`text-[9px] mt-0.5 block ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{entry.timestamp}</span>
            </div>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════
// BOTTOM CONTROL BAR
// ════════════════════════════════════════════════════════
function BottomControlBar({
  muted,
  cameraOn,
  transcriptOpen,
  selfViewHidden,
  onToggleMic,
  onToggleCamera,
  onToggleTranscript,
  onToggleSelfView,
  onShowHint,
  onEndInterview,
  isDark,
}: {
  muted: boolean;
  cameraOn: boolean;
  transcriptOpen: boolean;
  selfViewHidden: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleTranscript: () => void;
  onToggleSelfView: () => void;
  onShowHint: () => void;
  onEndInterview: () => void;
  isDark: boolean;
}) {
  return (
    <div className={`relative z-20 flex items-center justify-between px-5 py-3 border-t backdrop-blur-sm transition-colors duration-500 ${
      isDark
        ? 'bg-[#090e1a]/95 border-white/[0.04]'
        : 'bg-white/95 border-slate-200'
    }`}>
      {/* Left: self-view toggle */}
      <div className="flex items-center gap-2 min-w-[120px]">
        <button
          onClick={onToggleSelfView}
          className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] transition-all duration-200 ${
            !selfViewHidden
              ? isDark
                ? 'bg-white/[0.06] text-slate-400 hover:bg-white/[0.1]'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              : isDark
                ? 'bg-white/[0.03] text-slate-600 hover:bg-white/[0.06]'
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
          }`}
          title={selfViewHidden ? 'Show self-view' : 'Hide self-view'}
        >
          {!selfViewHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span className="hidden sm:inline">{selfViewHidden ? 'Show self' : 'Hide self'}</span>
        </button>
      </div>

      {/* Center: primary controls */}
      <div className="flex items-center gap-2.5">
        {/* Mic */}
        

        {/* Camera */}
        

        

        {/* Transcript */}
        <button
          onClick={onToggleTranscript}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            transcriptOpen
              ? 'bg-blue-500/15 border border-blue-400/15 text-blue-400'
              : isDark
                ? 'bg-white/[0.06] border border-white/[0.06] text-slate-400 hover:bg-white/[0.1] hover:text-slate-300'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'
          }`}
          title="Toggle transcript"
        >
          <MessageSquareText className="w-4 h-4" />
        </button>

        {/* Hint */}
        <button
          onClick={onShowHint}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            isDark
              ? 'bg-white/[0.04] border border-white/[0.04] text-slate-500 hover:bg-white/[0.08] hover:text-slate-400'
              : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-500 shadow-sm'
          }`}
          title="Get a hint"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Right: end interview */}
      <div className="flex items-center min-w-[120px] justify-end">
        <button
          onClick={onEndInterview}
          className={`flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-[11px] transition-all duration-200 ${
            isDark
              ? 'bg-red-500/10 border border-red-400/15 text-red-400 hover:bg-red-500/20 hover:border-red-400/25'
              : 'bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 hover:border-red-300'
          }`}
        >
          <PhoneOff className="w-3 h-3" />
          <span>End Interview</span>
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// END CONFIRMATION MODAL
// ════════════════════════════════════════════════════════
function EndConfirmationModal({
  onCancel,
  onConfirm,
  elapsed,
  questionNum,
  isDark,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  elapsed: number;
  questionNum: number;
  isDark: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md mx-4"
      >
        <div className={`rounded-2xl shadow-2xl overflow-hidden border ${
          isDark
            ? 'bg-[#141c2e] border-white/[0.08]'
            : 'bg-white border-slate-200'
        }`}>
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                isDark
                  ? 'bg-red-500/10 border border-red-400/15'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <AlertTriangle className={`w-5 h-5 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
              </div>
              <div>
                <h3 className={`text-[16px] mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>End this interview?</h3>
                <p className={`text-[13px] leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  Your session will end and AI-powered feedback will be generated based on your responses so far.
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className={`mx-6 px-4 py-3 rounded-xl border mb-5 ${
            isDark
              ? 'bg-white/[0.03] border-white/[0.04]'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-[12px]">
              <div className={`flex items-center gap-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <Clock className="w-3 h-3" />
                <span>Duration</span>
              </div>
              <span className={`tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{formatTime(elapsed)}</span>
            </div>
            <div className={`h-px my-2 ${isDark ? 'bg-white/[0.04]' : 'bg-slate-200'}`} />
            <div className="flex items-center justify-between text-[12px]">
              <div className={`flex items-center gap-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <MessageSquareText className="w-3 h-3" />
                <span>Questions covered</span>
              </div>
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{questionNum}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex items-center gap-3">
            <button
              onClick={onCancel}
              className={`flex-1 h-10 rounded-xl text-[13px] transition-all ${
                isDark
                  ? 'bg-white/[0.06] border border-white/[0.06] text-slate-400 hover:bg-white/[0.1]'
                  : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Continue Interview
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-[13px] hover:from-red-600 hover:to-red-700 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              End & Generate Feedback
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}