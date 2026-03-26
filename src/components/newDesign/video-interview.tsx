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
  theme = 'dark',
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
  const [transcript, setTranscript] = useState([]);
  const transcriptEndRef = useRef(null);
  const hintTimerRef = useRef(null);
  const aiSpeakingTimerRef = useRef(null);
  const botHasSpokenRef = useRef(false);
  const endCalledRef = useRef(false);

  // ── UI state ──
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [selfViewHidden, setSelfViewHidden] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const localStreamRef = useRef(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [sessionStartError, setSessionStartError] = useState<string | null>(null);

  // ── Derived ──
  const isLiveMode = liveConnected;
  const aiSpeaking = aiState === 'speaking';
  const interviewEndedRef = endCalledRef;
  const interviewEnded = endCalledRef.current;
  const totalSeconds = parseInt(config.duration) * 60;
  const remaining = Math.max(totalSeconds - elapsed, 0);

  // ── Stubs for ai-interview deps not present in this component ──
  // mediaState: ai-interview reads from MediaContext; here we use own getUserMedia capture
  const mediaState = {
    get mediaReady() { return !!localStreamRef.current; },
    get audioTestStream() { return localStreamRef.current; },
    get videoTestStream() { return localStreamRef.current; },
    get cameraEnabled() { return cameraOn; },
  };
  // setError/setOpenSnackbar/setSuccess: no MUI Snackbar in this component
  const setError = (msg) => console.error('[VideoInterview]', msg);
  const setOpenSnackbar = (_open) => {};
  const setSuccess = (msg) => console.log('[VideoInterview]', msg);

  // endMeeting: ai-interview calls this to end; maps to onEnd() prop here
  const endMeeting = () => {
    if (!endCalledRef.current) {
      endCalledRef.current = true;
      LiveKitService.disconnect({ intentional: true }).catch(() => {});
      onEnd();
    }
  };
  const safeEnd = endMeeting;

  // generateRandomAI: ai-interview imports this from a module; stub it here
  const generateRandomAI = () => ({ name: 'Alex Chen', role: 'Interviewer' });

  // Build the LiveKit callbacks object (used both when connecting fresh and when updating after warmup)
  const buildLiveKitCallbacks = () => ({
    onConnected: () => {
      console.log('[VideoInterview] ✅ LiveKit connected');
      setLiveConnected(true);
    },
    onDisconnected: ({ reason }) => {
      console.log('[VideoInterview] LiveKit disconnected:', reason);
      setLiveConnected(false);
      if (botHasSpokenRef.current && !endCalledRef.current) endMeeting();
    },
    onInterviewEnded: () => {
      if (botHasSpokenRef.current && !endCalledRef.current) endMeeting();
    },
    onActiveSpeakersChanged: ({ isAISpeaking, isUserSpeaking: userSpeaking }) => {
      if (userSpeaking) console.log('[VideoInterview] 🗣️ User speaking');
      if (isAISpeaking) console.log('[VideoInterview] 🤖 AI is speaking');
      setIsUserSpeaking(userSpeaking);
    },
    onDataReceived: (message) => {
      console.log('[VideoInterview] 📨 Data received:', message);
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
            if (text && isFinal) {
              const role = d?.role === 'bot' ? 'ai' : 'user';
              if (role === 'ai') { setCurrentSpeakingText(text); setQuestionNum((q) => q + 1); }
              setTranscript((prev) => [...prev, { id: Date.now(), role, text, timestamp: formatTime(elapsed) }]);
            }
            break;
          }
          default: break;
        }
        return;
      }
      if (message?.type === 'transcript' && message.text) {
        const role = message.role === 'bot' ? 'ai' : 'user';
        if (role === 'ai') { setCurrentSpeakingText(message.text); setQuestionNum((q) => q + 1); }
        setTranscript((prev) => [...prev, { id: Date.now(), role, text: message.text, timestamp: formatTime(elapsed) }]);
      }
    },
    onError: (err) => console.error('[VideoInterview] LiveKit error:', err),
  });

  // connectToInterview: defined in ai-interview; we provide it here with LiveKit + RTVI callbacks
  const connectToInterview = async (session) => {
    await LiveKitService.connect(
      { url: session.liveKitUrl, token: session.liveKitToken },
      buildLiveKitCallbacks()
    );
  };

  // ── Elapsed timer ──
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Pre-capture camera & mic (or use stream pre-captured during warmup) ──
  // NOTE: cleanup must NOT stop tracks — React StrictMode runs effects twice
  // (mount → cleanup → mount), which would kill the stream before publishing.
  // Tracks are stopped when the interview ends (endMeeting / disconnect).
  useEffect(() => {
    if (prefetchedStream) {
      // Stream was captured during warmup - use it directly
      localStreamRef.current = prefetchedStream;
      setLocalStream(prefetchedStream);
      console.log('[VideoInterview] 📷 Using pre-captured media from warmup');
      return () => {
        localStreamRef.current = null;
      };
    }

    // No pre-captured stream - capture now
    let stream: MediaStream | null = null;
    let isCancelled = false;
    const capture = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-start interview once media is ready ──
  useEffect(() => {
    if (!localStream || autoStartedRef.current) return;
    autoStartedRef.current = true;
    startInterview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

 // Local state
  const [openEndDialog, setOpenEndDialog] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const autoStartedRef = useRef(false);
  const [aiProfile] = useState(generateRandomAI());
  
  // Audio level detection state
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelRef = useRef(0);
  const audioAnalyserRef = useRef(null);
  const audioLevelIntervalRef = useRef(null);
  
  // Countdown state
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Interview timer state
  const [remainingTime, setRemainingTime] = useState(null);
  const [totalDuration, setTotalDuration] = useState(null);
  const timerIntervalRef = useRef(null);

  // Connection monitoring state
  const [connectionStatus, setConnectionStatus] = useState({
    aiWebSocket: 'disconnected',
    mediaStream: 'disconnected'
  });

  // Connection monitoring refs
  const connectionMonitorRef = useRef(null);

  // Video ref for local preview
  const localVideoRef = useRef(null);

  // Set up video preview when component mounts or video stream changes
  useEffect(() => {
    if (localVideoRef.current && mediaState.videoTestStream && mediaState.cameraEnabled) {
      const videoEl = localVideoRef.current;
      videoEl.srcObject = mediaState.videoTestStream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.play().catch(err => {
        console.warn("Video preview autoplay prevented:", err);
      });
      console.log('✅ Video preview updated from mediaState');
    }
  }, [mediaState.videoTestStream, mediaState.cameraEnabled]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      stopAudioLevelDetection();
      stopConnectionMonitoring();
      stopInterviewTimer();
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    };
  }, []);
  
  useEffect(() => {
    if (interviewEnded) {
      console.log('🧹 InterviewStep: interviewEnded detected, cleaning up...');

      stopAudioLevelDetection();
      stopConnectionMonitoring();
      stopInterviewTimer();

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }

      setInterviewStarted(false);
      setConnectionStatus({
        aiWebSocket: 'disconnected',
        mediaStream: 'disconnected'
      });
    }
  }, [interviewEnded]);

  // Audio level detection functions
  const startAudioLevelDetection = (audioStream) => {
    if (!audioStream || audioLevelIntervalRef.current) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
      
    } catch (error) {
      console.error('Audio level detection setup failed:', error);
    }
  };

  const stopAudioLevelDetection = () => {
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
    
    if (audioAnalyserRef.current) {
      audioAnalyserRef.current = null;
    }
    
    setAudioLevel(0);
  };

  // Connection monitoring functions
  // Note: Per Pipecat design, any disconnect = session ends
  // So we don't show "connection lost" errors - the session just ends gracefully
  const updateConnectionStatus = (component, status) => {
    setTimeout(() => {
      setConnectionStatus(prev => {
        const newStatus = { ...prev, [component]: status };
        
        if (prev[component] !== status) {
          console.log(`🔄 Connection Status Changed: ${component} -> ${status}`);

          // Only show error for media stream issues (user can fix these)
          // Don't show error for AI WebSocket disconnect - session will end gracefully
          if (component === 'mediaStream' && (status === 'error' || status === 'disconnected')) {
            setError(`Media stream lost! Please check your microphone/camera.`);
            setOpenSnackbar(true);
          }
        }
        
        return newStatus;
      });
    }, 0);
  };

  const startConnectionMonitoring = () => {
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
    }

    connectionMonitorRef.current = setInterval(() => {
      if (!interviewStarted) return;

      // Check LiveKit connection status
      if (LiveKitService.getIsConnected()) {
        updateConnectionStatus('aiWebSocket', 'connected');
      } else {
        updateConnectionStatus('aiWebSocket', 'disconnected');
      }

      // Check media stream
      if (mediaState?.audioTestStream) {
        const audioTracks = mediaState.audioTestStream.getAudioTracks();
        const hasActiveAudio = audioTracks.some(track => track.readyState === 'live');
        
        if (hasActiveAudio) {
          updateConnectionStatus('mediaStream', 'connected');
        } else {
          updateConnectionStatus('mediaStream', 'error');
        }
      } else {
        updateConnectionStatus('mediaStream', 'disconnected');
      }

    }, 2000);
  };

  const stopConnectionMonitoring = () => {
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
      connectionMonitorRef.current = null;
    }
  };

  // Interview timer functions
  const startInterviewTimer = (durationInSeconds) => {
    if (!durationInSeconds || timerIntervalRef.current) return;

    console.log(`⏱️ Starting interview timer: ${durationInSeconds} seconds`);
    setRemainingTime(durationInSeconds);
    setTotalDuration(durationInSeconds);

    timerIntervalRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev === null || prev <= 0) {
          stopInterviewTimer();
          // Auto-end interview when time runs out
          if (prev === 0) {
            console.log('⏱️ Interview time expired, auto-ending...');
            setTimeout(() => {
              setError('Interview time has expired');
              setOpenSnackbar(true);
              endInterview();
            }, 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopInterviewTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setRemainingTime(null);
    setTotalDuration(null);
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage for circular timer
  const getProgressPercentage = () => {
    if (!totalDuration || remainingTime === null) return 100;
    return (remainingTime / totalDuration) * 100;
  };

  useEffect(() => {
    if (interviewStarted) {
      startConnectionMonitoring();
    } else {
      stopConnectionMonitoring();
    }

    return () => {
      stopConnectionMonitoring();
    };
  }, [interviewStarted]);

  // Creates session ONLY when user clicks "Start Interview"
  const startInterview = async () => {
    try {
      if (!mediaState.mediaReady) {
        setTimeout(() => {
          setError("Media not ready. Please go back and set up your audio.");
          setOpenSnackbar(true);
        }, 0);
        return;
      }

      if (!mediaState.audioTestStream) {
        setTimeout(() => {
          setError("Audio stream not available");
          setOpenSnackbar(true);
        }, 0);
        return;
      }

      setIsConnecting(true);

      // Ensure video preview is set up
      if (localVideoRef.current && mediaState.videoTestStream && !localVideoRef.current.srcObject) {
        const videoEl = localVideoRef.current;
        videoEl.srcObject = mediaState.videoTestStream;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.play().catch(err => {
          console.warn("Video autoplay prevented:", err);
        });
      }

      // STEP 1: CREATE SESSION (gets LiveKit credentials)
      // Use pre-fetched session from warmup if available, otherwise fetch now
      updateConnectionStatus('aiWebSocket', 'connecting');

      let session;
      if (prefetchedSession?.liveKitUrl && prefetchedSession?.liveKitToken) {
        console.log('✅ Using pre-fetched session credentials');
        session = prefetchedSession;
      } else {
        setIsCreatingSession(true);
        try {
          console.log('📝 Creating interview session...');
          const res = await createInterviewSession(interviewId);
          const d = res.data?.data ?? res.data;
          const url = d?.liveKitUrl ?? d?.url;
          const token = d?.liveKitToken ?? d?.token;
          if (!url || !token) throw new Error('Missing LiveKit credentials in response');
          session = { liveKitUrl: url, liveKitToken: token, maxInterviewDuration: d?.max_interview_duration ?? null };
          console.log('✅ Session created, url:', url?.slice(0, 40));
          setIsCreatingSession(false);
        } catch (sessionError) {
          console.error("❌ Session creation failed:", sessionError);
          setIsCreatingSession(false);
          updateConnectionStatus('aiWebSocket', 'error');
          setIsConnecting(false);
          setSessionStartError("This session has already been initialized. Please go back and select a different module, or contact support.");
          return;
        }
      }

      // STEP 2: Connect to LiveKit (or register callbacks if already connected during warmup)
      if (!LiveKitService.getIsConnected()) {
        try {
          console.log('🔌 Connecting to LiveKit...');
          await connectToInterview(session);
          updateConnectionStatus('aiWebSocket', 'connected');
        } catch (connectError) {
          console.error("❌ LiveKit connection failed:", connectError);
          setTimeout(() => {
            updateConnectionStatus('aiWebSocket', 'error');
            setError("Failed to connect to AI interview system. Please try again.");
            setOpenSnackbar(true);
            setIsConnecting(false);
          }, 0);
          return;
        }
      } else {
        // Already connected during warmup - register real React callbacks now
        console.log('✅ LiveKit already connected from warmup, registering callbacks');
        LiveKitService.updateCallbacks(buildLiveKitCallbacks());
        setLiveConnected(true);
        updateConnectionStatus('aiWebSocket', 'connected');
      }
      // STEP 3: Publish existing media tracks to LiveKit (reuse streams from warmup/capture)
      try {
        console.log('📤 Publishing media tracks to LiveKit...');

        await LiveKitService.publishExistingTracks(
          mediaState.audioTestStream,
          mediaState.cameraEnabled ? mediaState.videoTestStream : null
        );

        console.log('✅ Media tracks published');
      } catch (mediaError) {
        console.warn('⚠️ Failed to publish some media tracks:', mediaError);
        // Continue anyway - audio might still work
      }
      
      // STEP 5: Start the interview
      setInterviewStarted(true);

      // Start audio level detection for UI feedback
      startAudioLevelDetection(mediaState.audioTestStream);

      // Start interview timer if duration is available
      if (session?.maxInterviewDuration) {
        startInterviewTimer(session.maxInterviewDuration * 60);
      }

      setSuccess('Interview started!');
      setOpenSnackbar(true);
      setIsConnecting(false);

    } catch (error) {
      console.error('Interview startup error:', error);
      setTimeout(() => {
        setError('Cannot start interview: ' + error.message);
        setOpenSnackbar(true);
        setInterviewStarted(false);
        setIsConnecting(false);
        setIsCreatingSession(false);
        updateConnectionStatus('aiWebSocket', 'error');
      }, 0);
    }
  };

  const endInterview = async () => {
    console.log('🔴 Ending interview...');

    stopConnectionMonitoring();
    stopAudioLevelDetection();
    stopInterviewTimer();

    setInterviewStarted(false);

    setConnectionStatus({
      aiWebSocket: 'disconnected',
      mediaStream: 'disconnected'
    });

    // Clear video element
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    console.log('✅ Interview ended');

    endMeeting();
  };

  const handleEndDialogOpen = () => setOpenEndDialog(true);
  const handleEndDialogClose = () => setOpenEndDialog(false);

  const getAIStatus = () => {
    if (interviewEnded) return 'ended';
    if (aiSpeaking) return 'speaking';
    return 'listening';
  };

  // Get button text based on current state
  const getStartButtonText = () => {
    if (isCreatingSession) return 'Creating Session...';
    if (isConnecting) return 'Connecting...';
    if (interviewStarted) return 'Interview Active';
    return 'Start Interview';
  };

  // Timer color based on remaining time
  const getTimerColor = () => {
    if (remainingTime === null) return '#5341f4';
    if (remainingTime < 60) return '#ef4444';
    if (remainingTime < 300) return '#f59e0b';
    return '#5341f4';
  };

  // JSX calls handleStartInterview; maps to startInterview from pasted ai-interview logic
  const handleStartInterview = startInterview;

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

      {/* ════ Countdown Overlay ════ */}
      <AnimatePresence>
        {showCountdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md"
          >
            <motion.p
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-[120px] font-bold text-white leading-none"
              style={{ textShadow: '0 0 40px rgba(83,65,244,0.8)' }}
            >
              {countdown}
            </motion.p>
            <p className="mt-6 text-white/80 font-medium tracking-widest uppercase text-lg">
              {countdown === 1 ? 'Get Ready!' : 'Starting in…'}
            </p>
            <div className="mt-6 w-48 h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                style={{ width: `${((4 - countdown) / 3) * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════ Start Interview Overlay (loading/error states only) ════ */}
      <AnimatePresence>
        {(interviewId || sessionCredentials) && !interviewStarted && (isCreatingSession || isConnecting || sessionStartError) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <div className={`rounded-2xl p-8 flex flex-col items-center gap-6 shadow-2xl ${isDark ? 'bg-[#0c1120]' : 'bg-white'}`}>
              {isCreatingSession ? (
                <>
                  <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                  <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    Creating session…
                  </p>
                </>
              ) : isConnecting ? (
                <>
                  <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                  <p className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    Connecting to AI interviewer…
                  </p>
                </>
              ) : sessionStartError ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 text-2xl font-bold">!</span>
                  </div>
                  <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Session Unavailable</p>
                  <p className={`text-sm text-center max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {sessionStartError}
                  </p>
                  <button
                    onClick={() => window.history.back()}
                    className="px-8 py-3 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-semibold text-base transition-colors"
                  >
                    Go Back
                  </button>
                </>
              ) : null}
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