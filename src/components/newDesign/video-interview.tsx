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
import { createInterviewSession } from '@/services/IntervewSesstionServices';
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
  interviewId,
  onEnd,
  theme = 'light',
  sessionCredentials = null,
  prefetchedSession = null,
  prefetchedStream = null,
  prefetchedConnected = false,
}: {
  config: VideoInterviewConfig;
  interviewId?: string;
  onEnd: () => void;
  theme?: 'dark' | 'light';
  sessionCredentials?: SessionCredentials | null;
  prefetchedSession?: { liveKitUrl: string; liveKitToken: string; maxInterviewDuration: number | null } | null;
  prefetchedStream?: MediaStream | null;
  prefetchedConnected?: boolean;
}) {
  const isDark = theme === 'dark';

  // ── AI state (driven by LiveKit / RTVI callbacks) ──
  const [aiState, setAiState] = useState('speaking');
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [currentSpeakingText, setCurrentSpeakingText] = useState('');
  const [questionNum, setQuestionNum] = useState(1);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  // Refs
  const elapsedRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const hintTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiSpeakingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const botHasSpokenRef = useRef(false);
  const endCalledRef = useRef(false);

  // ── UI state ──
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(config.mode === 'video');
  const [elapsed, setElapsed] = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [selfViewHidden, setSelfViewHidden] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [sessionStartError, setSessionStartError] = useState<string | null>(null);

// ── Derived ──
  const isLiveMode = liveConnected;
  const aiSpeaking = aiState === 'speaking';
  const totalSeconds = parseInt(config.duration) * 60;
  const remaining = Math.max(totalSeconds - elapsed, 0);

  // ── Stubs for ai-interview deps ──
  const mediaState = {
    get mediaReady() { return !!localStreamRef.current; },
    get audioTestStream() { return localStreamRef.current; },
    get videoTestStream() { return localStreamRef.current; },
    get cameraEnabled() { return cameraOn; },
  };
  
  const setError = (msg: string) => console.error('[VideoInterview]', msg);
  const setOpenSnackbar = (_open: boolean) => {};
  const setSuccess = (msg: string) => console.log('[VideoInterview]', msg);

  // endMeeting: ends the interview
  const endMeeting = () => {
    if (!endCalledRef.current) {
      endCalledRef.current = true;
      LiveKitService.disconnect({ intentional: true }).catch(() => {});
      onEnd();
    }
  };
  const safeEnd = endMeeting;

  const generateRandomAI = () => ({ name: 'Alex Chen', role: 'Interviewer' });

  // Build the LiveKit callbacks object
  const buildLiveKitCallbacks = () => ({
    onConnected: () => {
      console.log('[VideoInterview] ✅ LiveKit connected');
      setLiveConnected(true);
    },
    onDisconnected: ({ reason }: { reason?: string }) => {
      console.log('[VideoInterview] LiveKit disconnected:', reason);
      setLiveConnected(false);
      if (botHasSpokenRef.current && !endCalledRef.current) endMeeting();
    },
    onInterviewEnded: () => {
      if (botHasSpokenRef.current && !endCalledRef.current) endMeeting();
    },
    onActiveSpeakersChanged: ({ isAISpeaking, isUserSpeaking: userSpeaking }: { isAISpeaking: boolean; isUserSpeaking: boolean }) => {
      setIsUserSpeaking(userSpeaking);
    },
    onDataReceived: (message: any) => {
      console.log('[VideoInterview] 📨 Data received:', message);
      
      if (message?.type === 'bot-caption') {
        const { text, sentence_index } = message.data ?? {};
        if (text) {
          setTranscript((prev) => [
            ...prev,
            { id: sentence_index ?? Date.now(), role: 'ai', text, timestamp: formatTime(elapsedRef.current) },
          ]);
        }
        return;
      }
      
      if (message?.label === 'rtvi-ai') {
        switch (message.type) {
          case 'bot-started-speaking':
            console.log('[VideoInterview] 🤖 RTVI: bot started speaking');
            botHasSpokenRef.current = true;
            if (aiSpeakingTimerRef.current) { clearTimeout(aiSpeakingTimerRef.current); aiSpeakingTimerRef.current = null; }
            setAiState('speaking');
            break;
          case 'bot-stopped-speaking':
            console.log('[VideoInterview] 🎧 RTVI: bot stopped speaking');
            if (aiSpeakingTimerRef.current) clearTimeout(aiSpeakingTimerRef.current);
            break;
          case 'transcript': {
            const d = message.data;
            const text = d?.text;
            const isFinal = d?.final ?? true;
            if (text && isFinal && d?.role === 'bot') {
              setCurrentSpeakingText(text);
              setQuestionNum((q) => q + 1);
              setTranscript((prev) => [...prev, { id: Date.now(), role: 'ai', text, timestamp: formatTime(elapsed) }]);
            }
            break;
          }
          default: break;
        }
        return;
      }
      
      if (message?.type === 'transcript' && message.text && message.role === 'bot') {
        setCurrentSpeakingText(message.text);
        setQuestionNum((q) => q + 1);
        setTranscript((prev) => [...prev, { id: Date.now(), role: 'ai', text: message.text, timestamp: formatTime(elapsed) }]);
      }
    },
    onError: (err: any) => console.error('[VideoInterview] LiveKit error:', err),
  });

  const connectToInterview = async (session: { liveKitUrl: string; liveKitToken: string }) => {
    await LiveKitService.connect(
      { url: session.liveKitUrl, token: session.liveKitToken },
      buildLiveKitCallbacks()
    );
  };

  // ── Elapsed timer + keep ref in sync ──
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => {
      elapsedRef.current = e + 1;
      return e + 1;
    }), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Pre-capture camera & mic (or use stream pre-captured during warmup) ──
  useEffect(() => {
    if (prefetchedStream) {
      localStreamRef.current = prefetchedStream;
      setLocalStream(prefetchedStream);
      console.log('[VideoInterview] 📷 Using pre-captured media from warmup');
      return () => {
        localStreamRef.current = null;
      };
    }

    let stream: MediaStream | null = null;
    let isCancelled = false;
    const capture = async () => {
      try {
        const constraints: MediaStreamConstraints = config.mode !== 'video'
          ? { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }
          : { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
              video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        console.log('[VideoInterview] 📷 Local media pre-captured');
      } catch (err) {
        console.warn('[VideoInterview] Could not pre-capture media:', err);
      }
    };
    capture();
    return () => {
      isCancelled = true;
      localStreamRef.current = null;
    };
  }, [config.mode, prefetchedStream]);

  // ── Auto-start interview once media is ready ──
  const autoStartedRef = useRef(false);
  const startInterview = async () => {
    try {
      if (!mediaState.mediaReady) {
        console.warn('Media not ready');
        return;
      }

      if (!mediaState.audioTestStream) {
        console.warn('Audio stream not available');
        return;
      }

      let session;
      if (prefetchedSession?.liveKitUrl && prefetchedSession?.liveKitToken) {
        console.log('✅ Using pre-fetched session credentials');
        session = prefetchedSession;
      } else {
        console.log('📝 Creating interview session...');
        const res = await createInterviewSession(interviewId, config.mode !== 'video');
        const d = res.data?.data ?? res.data;
        const url = d?.liveKitUrl ?? d?.url;
        const token = d?.liveKitToken ?? d?.token;
        if (!url || !token) throw new Error('Missing LiveKit credentials in response');
        session = { liveKitUrl: url, liveKitToken: token, maxInterviewDuration: d?.max_interview_duration ?? null };
      }

      if (!LiveKitService.getIsConnected()) {
        console.log('🔌 Connecting to LiveKit...');
        await connectToInterview(session);
      } else {
        console.log('✅ LiveKit already connected, registering callbacks');
        LiveKitService.updateCallbacks(buildLiveKitCallbacks());
        setLiveConnected(true);
      }

      await LiveKitService.publishExistingTracks(
        mediaState.audioTestStream,
        mediaState.cameraEnabled ? mediaState.videoTestStream : null
      );

      console.log('✅ Interview started successfully');
    } catch (error) {
      console.error('Interview startup error:', error);
      setSessionStartError(error instanceof Error ? error.message : 'Failed to start interview');
    }
  };

  useEffect(() => {
    if (!localStream || autoStartedRef.current) return;
    autoStartedRef.current = true;
    startInterview();
  }, [localStream]);

  // ── Hint after long pause ──
  useEffect(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    if (aiState === 'listening') {
      hintTimerRef.current = setTimeout(() => setShowHint(true), 10000);
    } else {
      setShowHint(false);
      setHintRevealed(false);
    }
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); };
  }, [aiState]);

  // ── Scroll transcript to bottom ──
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      LiveKitService.updateCallbacks({});
      LiveKitService.disconnect({ intentional: true }).catch(() => {});
    };
  }, []);

  const [aiProfile] = useState(generateRandomAI());
  
  // Audio level detection state
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef(0);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Countdown state
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Interview timer state
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Connection monitoring state
  const [connectionStatus, setConnectionStatus] = useState({
    aiWebSocket: 'disconnected',
    mediaStream: 'disconnected'
  });

  const connectionMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Set up video preview
  useEffect(() => {
    if (localVideoRef.current && mediaState.videoTestStream && mediaState.cameraEnabled) {
      const videoEl = localVideoRef.current;
      videoEl.srcObject = mediaState.videoTestStream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.play().catch(err => {
        console.warn("Video preview autoplay prevented:", err);
      });
    }
  }, [mediaState.videoTestStream, mediaState.cameraEnabled]);

  // Audio level detection functions
  const startAudioLevelDetection = (audioStream: MediaStream) => {
    if (!audioStream || audioLevelIntervalRef.current) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(audioStream);
      const analyser = audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      
      audioAnalyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (!audioAnalyserRef.current) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const normalizedLevel = Math.min(100, (rms / 255) * 100);
        
        audioLevelRef.current = normalizedLevel;
        setAudioLevel(normalizedLevel);
      };
      
      audioLevelIntervalRef.current = setInterval(updateAudioLevel, 50);
    } catch (err) {
      console.error('Audio level detection setup failed:', err);
    }
  };

  const stopAudioLevelDetection = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    audioAnalyserRef.current = null;
    setAudioLevel(0);
  };

  // Start audio detection when stream is ready
  useEffect(() => {
    if (localStream && !audioLevelIntervalRef.current) {
      startAudioLevelDetection(localStream);
    }
    return () => stopAudioLevelDetection();
  }, [localStream]);

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
      <div className="flex-1 flex items-center justify-center gap-3 px-3 py-3 min-h-0 relative">
        {/* ── Left Panel: Interviewer ── */}
        <InterviewerPanel
          aiState={aiState as AIState}
          currentText={currentSpeakingText}
          isDark={isDark}
        />

        {/* ── Right Panel: User (You) ── */}
        <UserPanel
          aiState={aiState as AIState}
          isUserSpeaking={isUserSpeaking}
          localStream={localStream}
          cameraOn={cameraOn}
          muted={muted}
          selfViewHidden={selfViewHidden}
          showHint={showHint}
          hintRevealed={hintRevealed}
          onRevealHint={() => setHintRevealed(true)}
          isDark={isDark}
          videoRef={localVideoRef}
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

      {/* ════ Start Interview Overlay (error states) ════ */}
      <AnimatePresence>
        {(interviewId || sessionCredentials) && !localStream && (sessionStartError) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <div className={`rounded-2xl p-8 flex flex-col items-center gap-6 shadow-2xl ${isDark ? 'bg-[#0c1120]' : 'bg-white'}`}>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-2xl font-bold">!</span>
              </div>
              <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Session Unavailable</p>
              <p className={`text-sm text-center max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {sessionStartError}
              </p>
              <button
                onClick={() => window.history.back()}
                className={`px-8 py-3 rounded-xl font-semibold text-base transition-colors text-white ${isDark ? 'bg-slate-600 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Go Back
              </button>
            </div>
          </motion.div>
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
    <div className={`w-[calc(50%-6px)] aspect-video rounded-xl overflow-hidden relative border ${isDark ? 'bg-gradient-to-br from-[#0e1628] via-[#111d33] to-[#0d1424] border-white/[0.04]' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100 border-slate-200'}`}>
      {/* Ambient glow */}
      <InterviewerAmbient aiState={aiState} isDark={isDark} />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        {/* Avatar */}
        <div className="relative mb-5">
          <VirtualAvatar aiState={aiState} isDark={isDark} />
        </div>

        {/* Name + role */}
        <motion.div
          className="flex flex-col items-center gap-1 mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className={`text-[14px] ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Alex Chen</h3>
          <p className={`text-[10px] tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Interviewer <span className={`mx-1 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>•</span> Hiring Manager (Simulation)
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
            <InterviewerStateLabel aiState={aiState} isDark={isDark} />
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
              className={`mt-4 max-w-sm mx-6 px-4 py-3 rounded-2xl backdrop-blur-sm ${isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-slate-100/80 border border-slate-200'}`}
            >
              <p className={`text-[12.5px] leading-relaxed text-center ${isDark ? 'text-slate-300/80' : 'text-slate-600'}`}>
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
                    className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-violet-400/50' : 'bg-violet-500/60'}`}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                  />
                ))}
              </div>
              <span className={`text-[11px] ${isDark ? 'text-violet-300/60' : 'text-violet-600/70'}`}>Analyzing your answer…</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom-left name badge */}
      <div className={`absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md backdrop-blur-sm ${isDark ? 'bg-black/40' : 'bg-white/70 border border-slate-200/80'}`}>
        <span className={`text-[11px] ${isDark ? 'text-white/80' : 'text-slate-700'}`}>Alex Chen</span>
        <span className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>(AI)</span>
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
  videoRef,
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
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const isActive = aiState === 'listening';

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
            <>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />

              {/* VAD waveform + status label */}
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
            /* Fallback: stream not yet available */
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative flex flex-col items-center">
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
                </div>

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
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-black/5 pointer-events-none" />
        </div>
      ) : !cameraOn ? (
        <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'bg-[#0d1320]' : 'bg-slate-100'}`}>
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border ${isDark ? 'bg-slate-800/50 border-white/[0.04]' : 'bg-slate-200/60 border-slate-300/40'}`}>
              <VideoOff className={`w-6 h-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
            </div>
            <p className={`text-[12px] ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>Camera is off</p>
          </div>
        </div>
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'bg-[#0d1320]' : 'bg-slate-100'}`}>
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border ${isDark ? 'bg-slate-800/50 border-white/[0.04]' : 'bg-slate-200/60 border-slate-300/40'}`}>
              <EyeOff className={`w-6 h-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
            </div>
            <p className={`text-[12px] ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>Self-view hidden</p>
            <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>Camera is still on for recording</p>
          </div>
        </div>
      )}

      {/* Muted indicator */}
      {muted && (
        <div className="absolute top-3 right-3 z-10 w-7 h-7 rounded-lg bg-red-500/80 flex items-center justify-center shadow-lg shadow-red-500/20">
          <MicOff className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      {/* Bottom-left name badge */}
      <div className={`absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md backdrop-blur-sm ${isDark ? 'bg-black/40' : 'bg-white/70 border border-slate-200/80'}`}>
        <span className={`text-[11px] ${isDark ? 'text-white/80' : 'text-slate-700'}`}>You</span>
        {muted && <MicOff className="w-2.5 h-2.5 text-red-400/80" />}
      </div>

      {/* Hint overlay */}
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
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[12px] transition-all duration-300 backdrop-blur-md ${isDark ? 'bg-amber-500/[0.08] border-amber-400/[0.12] text-amber-300/80 hover:bg-amber-500/[0.15]' : 'bg-amber-50 border-amber-300/60 text-amber-700 hover:bg-amber-100'}`}
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
                <div className={`px-4 py-3 rounded-xl border backdrop-blur-md ${isDark ? 'bg-[#151d2e]/95 border-amber-400/[0.1]' : 'bg-amber-50/95 border-amber-200'}`}>
                  <p className={`text-[10px] mb-1 flex items-center gap-1 ${isDark ? 'text-amber-300/60' : 'text-amber-600'}`}>
                    <Lightbulb className="w-2.5 h-2.5" /> Hint
                  </p>
                  <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-300/80' : 'text-slate-700'}`}>
                    Try using the STAR method: <span className={isDark ? 'text-amber-200/90' : 'text-amber-700'}>Situation</span>,{' '}
                    <span className={isDark ? 'text-amber-200/90' : 'text-amber-700'}>Task</span>,{' '}
                    <span className={isDark ? 'text-amber-200/90' : 'text-amber-700'}>Action</span>,{' '}
                    <span className={isDark ? 'text-amber-200/90' : 'text-amber-700'}>Result</span>.
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
function VirtualAvatar({ aiState, isDark }: { aiState: AIState; isDark: boolean }) {
  const cfg = useMemo(
    () =>
      isDark
        ? {
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
          }
        : {
            speaking: {
              borderColor: 'rgba(59, 130, 246, 0.45)',
              glowColor: 'rgba(59, 130, 246, 0.12)',
              ringScale: [1, 1.04, 1] as number[],
              ringDuration: 1.5,
              avatarBreath: [1, 1.02, 0.99, 1.01, 1] as number[],
              avatarDuration: 1.2,
            },
            listening: {
              borderColor: 'rgba(20, 184, 166, 0.4)',
              glowColor: 'rgba(20, 184, 166, 0.1)',
              ringScale: [1, 1.01, 1] as number[],
              ringDuration: 3.5,
              avatarBreath: [1, 1.005, 1] as number[],
              avatarDuration: 5,
            },
            thinking: {
              borderColor: 'rgba(139, 92, 246, 0.4)',
              glowColor: 'rgba(139, 92, 246, 0.1)',
              ringScale: [1, 1.05, 1] as number[],
              ringDuration: 2,
              avatarBreath: [1, 1.02, 1] as number[],
              avatarDuration: 2.5,
            },
          },
    [isDark],
  );

  const c = cfg[aiState];

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className="absolute w-40 h-40 rounded-full"
        animate={{ scale: c.ringScale, boxShadow: `0 0 50px 15px ${c.glowColor}` }}
        transition={{ duration: c.ringDuration, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-32 h-32 rounded-full"
        style={{ border: '1.5px solid' }}
        animate={{ borderColor: c.borderColor, scale: c.ringScale }}
        transition={{ duration: c.ringDuration, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
      />
      {aiState === 'speaking' && <SpeakingWaveRing isDark={isDark} />}
      <motion.div
        className="relative w-24 h-24 rounded-full overflow-hidden"
        animate={{ scale: c.avatarBreath }}
        transition={{ duration: c.avatarDuration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-[#192640] via-[#1c2c4a] to-[#15203a]' : 'bg-gradient-to-br from-slate-100 via-white to-slate-50'}`} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isDark ? 'bg-gradient-to-b from-slate-500/18 to-slate-600/12 border-slate-400/[0.06]' : 'bg-gradient-to-b from-slate-200/60 to-slate-100/40 border-slate-300/40'}`}>
            <span className={`text-[14px] ${isDark ? 'text-slate-300/45' : 'text-slate-500'}`}>AC</span>
          </div>
          <div className={`mt-1 w-14 h-5 rounded-t-[50%] bg-gradient-to-b to-transparent border-t border-x ${isDark ? 'from-slate-500/10 border-slate-400/[0.05]' : 'from-slate-300/20 border-slate-300/20'}`} />
        </div>
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
        <div className={`absolute inset-0 rounded-full border ${isDark ? 'border-white/[0.05]' : 'border-slate-300/30'}`} />
      </motion.div>
    </div>
  );
}

function SpeakingWaveRing({ isDark }: { isDark: boolean }) {
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
            className={`absolute rounded-full ${isDark ? 'bg-blue-400/20' : 'bg-blue-500/35'}`}
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

function InterviewerStateLabel({ aiState, isDark }: { aiState: AIState; isDark: boolean }) {
  if (aiState === 'listening') {
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${isDark ? 'bg-teal-500/[0.06] border-teal-400/[0.07]' : 'bg-teal-50 border-teal-200'}`}>
        <motion.div
          className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-teal-400/60' : 'bg-teal-500'}`}
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className={`text-[10px] tracking-wide ${isDark ? 'text-teal-300/60' : 'text-teal-600'}`}>Listening</span>
      </div>
    );
  }

  if (aiState === 'thinking') {
    return (
      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${isDark ? 'bg-violet-500/[0.06] border-violet-400/[0.07]' : 'bg-violet-50 border-violet-200'}`}>
        <div className="relative w-3 h-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`absolute w-1 h-1 rounded-full ${isDark ? 'bg-violet-400/50' : 'bg-violet-500'}`}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', delay: i * 0.6 }}
              style={{ top: '50%', left: '50%', transformOrigin: '0 -3px' }}
            />
          ))}
        </div>
        <span className={`text-[10px] tracking-wide ${isDark ? 'text-violet-300/60' : 'text-violet-600'}`}>Thinking</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${isDark ? 'bg-blue-500/[0.06] border-blue-400/[0.07]' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-center gap-[2px]">
        {[...Array(4)].map((_, i) => (
          <motion.span
            key={i}
            className={`w-[2px] rounded-full ${isDark ? 'bg-blue-400/45' : 'bg-blue-500/70'}`}
            animate={{ height: ['2px', `${4 + Math.sin(i * 1.5) * 4}px`, '2px'] }}
            transition={{ duration: 0.45 + i * 0.08, repeat: Infinity, ease: 'easeInOut', delay: i * 0.08 }}
          />
        ))}
      </div>
      <span className={`text-[10px] tracking-wide ${isDark ? 'text-blue-300/60' : 'text-blue-600'}`}>Speaking</span>
    </div>
  );
}

function InterviewerAmbient({ aiState, isDark }: { aiState: AIState; isDark: boolean }) {
  const c = useMemo(
    () =>
      isDark
        ? {
            listening: { primary: 'rgba(45, 212, 191, 0.02)', secondary: 'rgba(59, 130, 246, 0.012)' },
            thinking: { primary: 'rgba(139, 92, 246, 0.02)', secondary: 'rgba(59, 130, 246, 0.015)' },
            speaking: { primary: 'rgba(59, 130, 246, 0.025)', secondary: 'rgba(45, 212, 191, 0.012)' },
          }
        : {
            listening: { primary: 'rgba(45, 212, 191, 0.07)', secondary: 'rgba(59, 130, 246, 0.05)' },
            thinking: { primary: 'rgba(139, 92, 246, 0.07)', secondary: 'rgba(59, 130, 246, 0.05)' },
            speaking: { primary: 'rgba(59, 130, 246, 0.08)', secondary: 'rgba(45, 212, 191, 0.05)' },
          },
    [isDark],
  )[aiState];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {isDark && (
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(8,12,28,0.5) 100%)' }}
        />
      )}
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

      <div className="overflow-y-auto px-5 py-2 space-y-2 h-[calc(100%-36px)] scrollbar-thin">
        {transcript.filter((t) => t.role === 'ai').length === 0 && (
          <p className={`text-[11px] text-center py-6 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            Transcript will appear here as the conversation progresses...
          </p>
        )}
        {transcript.filter((t) => t.role === 'ai').map((entry) => (
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
      <div className="flex items-center gap-2 min-w-[120px]">
        {/* <button
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
        </button> */}
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleMic}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            muted
              ? 'bg-red-500/15 border border-red-400/20 text-red-400'
              : isDark
                ? 'bg-white/[0.06] border border-white/[0.06] text-slate-400 hover:bg-white/[0.1] hover:text-slate-300'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'
          }`}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          onClick={onToggleCamera}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            !cameraOn
              ? 'bg-red-500/15 border border-red-400/20 text-red-400'
              : isDark
                ? 'bg-white/[0.06] border border-white/[0.06] text-slate-400 hover:bg-white/[0.1] hover:text-slate-300'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'
          }`}
          title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
        >
          {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>

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

        {/* <button
          onClick={onShowHint}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            isDark
              ? 'bg-white/[0.04] border border-white/[0.04] text-slate-500 hover:bg-white/[0.08] hover:text-slate-400'
              : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-500 shadow-sm'
          }`}
          title="Get a hint"
        >
          <HelpCircle className="w-4 h-4" />
        </button> */}
      </div>

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