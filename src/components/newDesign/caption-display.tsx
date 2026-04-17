import { useState, useEffect, useRef, useCallback } from 'react';
import { Captions, CaptionsOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Constants ────────────────────────────────────────────
const CHAR_INTERVAL_MS = 50;
const MIN_DWELL_MS = 1500;
const MAX_DWELL_MS = 3500;
const ACCEL_FACTOR = 4;          // chars per tick when accelerating
const DENSE_THRESHOLD_MS = 5000; // interval below which dwell applies
const QUEUE_OVERFLOW = 3;        // queue depth that triggers acceleration

// ─── Types ────────────────────────────────────────────────
type Phase = 'idle' | 'typing' | 'displayed' | 'transitioning';

export interface CaptionDisplayState {
  topText: string;
  topErasedCount: number;  // chars hidden from start (visibility: hidden)
  bottomText: string;
  bottomVisibleCount: number;
  phase: Phase;
}

// ────────────────────────────────────────────────────────────
// CaptionAnimator — all mutable animation state lives here.
// Not a React component: React interface is through useCaptionAnimator.
// ────────────────────────────────────────────────────────────
class CaptionAnimator {
  private state: CaptionDisplayState = {
    topText: '', topErasedCount: 0,
    bottomText: '', bottomVisibleCount: 0,
    phase: 'idle',
  };
  private queue: string[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private dwellTimer: ReturnType<typeof setTimeout> | null = null;
  private accelerating = false;
  private readonly onUpdate: (state: CaptionDisplayState) => void;

  constructor(onUpdate: (state: CaptionDisplayState) => void) {
    this.onUpdate = onUpdate;
  }

  addCaption(text: string) {
    if (!text?.trim()) return;

    if (this.queue.length >= QUEUE_OVERFLOW) {
      this.accelerating = true;
    }

    this.queue.push(text);
    this.processQueue();
  }

  private processQueue() {
    const { phase } = this.state;

    if (this.queue.length === 0) return;

    if (phase === 'idle') {
      this.startTyping(this.queue.shift()!);
    } else if (phase === 'typing' || phase === 'transitioning') {
      // Accelerate in-progress animation; next caption will be picked up after dwell
      this.accelerating = true;
    } else if (phase === 'displayed') {
      // Skip remaining dwell, start transition now
      this.clearTimers();
      this.startTransition(this.state.bottomText, this.queue.shift()!);
    }
  }

  private emit() {
    this.onUpdate({ ...this.state });
  }

  private clearTimers() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.dwellTimer) { clearTimeout(this.dwellTimer); this.dwellTimer = null; }
  }

  private startTyping(text: string) {
    this.clearTimers();
    this.accelerating = false;
    this.state = { ...this.state, bottomText: text, bottomVisibleCount: 0, phase: 'typing' };
    this.emit();

    this.timer = setInterval(() => {
      const chars = this.accelerating ? ACCEL_FACTOR : 1;
      const next = Math.min(this.state.bottomVisibleCount + chars, text.length);
      this.state = { ...this.state, bottomVisibleCount: next };
      this.emit();

      if (next >= text.length) {
        this.clearTimers();
        this.accelerating = false;
        this.state = { ...this.state, phase: 'displayed' };
        this.emit();

        // If already queued, skip dwell
        if (this.queue.length > 0) {
          this.startTransition(this.state.bottomText, this.queue.shift()!);
          return;
        }

        const dwell = Math.max(MIN_DWELL_MS, Math.min(MAX_DWELL_MS, text.length * CHAR_INTERVAL_MS));
        this.dwellTimer = setTimeout(() => {
          if (this.queue.length > 0) {
            this.startTransition(this.state.bottomText, this.queue.shift()!);
          }
        }, dwell);
      }
    }, CHAR_INTERVAL_MS);
  }

  private startTransition(oldText: string, newText: string) {
    this.clearTimers();
    this.accelerating = false;
    this.state = {
      topText: oldText,
      topErasedCount: 0,
      bottomText: newText,
      bottomVisibleCount: 0,
      phase: 'transitioning',
    };
    this.emit();

    this.timer = setInterval(() => {
      const chars = this.accelerating ? ACCEL_FACTOR : 1;
      const newErased = Math.min(this.state.topErasedCount + chars, oldText.length);
      const newVisible = Math.min(this.state.bottomVisibleCount + chars, newText.length);

      this.state = { ...this.state, topErasedCount: newErased, bottomVisibleCount: newVisible };
      this.emit();

      if (newErased >= oldText.length && newVisible >= newText.length) {
        this.clearTimers();
        this.accelerating = false;
        this.state = {
          topText: '',
          topErasedCount: 0,
          bottomText: newText,
          bottomVisibleCount: newText.length,
          phase: 'displayed',
        };
        this.emit();

        // If already queued, skip dwell
        if (this.queue.length > 0) {
          this.startTransition(this.state.bottomText, this.queue.shift()!);
          return;
        }

        const dwell = Math.max(MIN_DWELL_MS, Math.min(MAX_DWELL_MS, newText.length * CHAR_INTERVAL_MS));
        this.dwellTimer = setTimeout(() => {
          if (this.queue.length > 0) {
            this.startTransition(this.state.bottomText, this.queue.shift()!);
          }
        }, dwell);
      }
    }, CHAR_INTERVAL_MS);
  }

  reset() {
    this.clearTimers();
    this.queue = [];
    this.accelerating = false;
    this.state = { topText: '', topErasedCount: 0, bottomText: '', bottomVisibleCount: 0, phase: 'idle' };
    this.emit();
  }

  destroy() {
    this.clearTimers();
    this.queue = [];
  }
}

// ────────────────────────────────────────────────────────────
// useCaptionAnimator hook
// ────────────────────────────────────────────────────────────
export function useCaptionAnimator() {
  const [displayState, setDisplayState] = useState<CaptionDisplayState>({
    topText: '', topErasedCount: 0,
    bottomText: '', bottomVisibleCount: 0,
    phase: 'idle',
  });

  const animatorRef = useRef<CaptionAnimator | null>(null);

  useEffect(() => {
    const animator = new CaptionAnimator(setDisplayState);
    animatorRef.current = animator;
    return () => animator.destroy();
  }, []);

  const addCaption = useCallback((text: string) => {
    animatorRef.current?.addCaption(text);
  }, []);

  const resetCaptions = useCallback(() => {
    animatorRef.current?.reset();
  }, []);

  return { displayState, addCaption, resetCaptions };
}

// ────────────────────────────────────────────────────────────
// CaptionDisplay — overlaid caption renderer
// ────────────────────────────────────────────────────────────
export function CaptionDisplay({
  displayState,
  visible,
}: {
  displayState: CaptionDisplayState;
  visible: boolean;
}) {
  const { topText, topErasedCount, bottomText, bottomVisibleCount, phase } = displayState;

  const hasTop = phase === 'transitioning' && !!topText;
  const hasBottom = !!bottomText && phase !== 'idle';

  return (
    <AnimatePresence>
      {visible && phase !== 'idle' && (
        <motion.div
          key="caption-overlay"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-full max-w-2xl px-6"
        >
          <div className="flex flex-col items-center gap-0.5">
            {/* Top line: erasing from left using visibility:hidden to preserve layout */}
            {hasTop && (
              <p className="text-[13px] text-white/60 text-center leading-relaxed font-medium">
                {topText.split('').map((char, i) => (
                  <span
                    key={i}
                    style={{ visibility: i < topErasedCount ? 'hidden' : 'visible' }}
                  >
                    {char}
                  </span>
                ))}
              </p>
            )}
            {/* Bottom line: typing in */}
            {hasBottom && (
              <p className="text-[13.5px] text-white/90 text-center leading-relaxed font-medium drop-shadow-lg"
                style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
              >
                {bottomText.slice(0, bottomVisibleCount)}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ────────────────────────────────────────────────────────────
// useUserSpeechTranscript — browser SpeechRecognition → user transcript entries
//
// start()  — called once when the interview goes live
// pause()  — called when AI starts speaking (stops mic so AI voice isn't captured)
// resume() — called when AI stops speaking (restarts mic for user)
// stop()   — called when interview ends
//
// onTranscript is stored in a ref so callbacks are always fresh
// (no stale-closure issues with elapsed timers in the parent).
// ────────────────────────────────────────────────────────────
export function useUserSpeechTranscript({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const recognitionRef = useRef<any>(null);
  // activeRef: interview is live — we want recognition running when not paused
  const activeRef = useRef(false);
  // pausedRef: AI is speaking — hold off until resume() is called
  const pausedRef = useRef(false);
  // Always call the latest version of onTranscript (avoids stale closure)
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; });

  // Internal: create and start a recognition instance
  const _startInstance = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn('[SpeechRecognition] Not supported in this browser');
      return;
    }
    if (recognitionRef.current) return; // instance already running

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) onTranscriptRef.current(text);
        }
      }
    };

    // Auto-restart after silence gaps — but only when active and not paused
    recognition.onend = () => {
      recognitionRef.current = null;
      if (activeRef.current && !pausedRef.current) {
        _startInstance();
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[SpeechRecognition] Error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        activeRef.current = false;
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn('[SpeechRecognition] Start failed:', e);
      recognitionRef.current = null;
    }
  }, []);

  // Called once when the interview connects
  const start = useCallback(() => {
    activeRef.current = true;
    pausedRef.current = false;
    console.log('[SpeechRecognition] Starting user transcript');
    _startInstance();
  }, [_startInstance]);

  // Called when AI starts speaking — silences mic capture
  const pause = useCallback(() => {
    pausedRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      // recognitionRef is cleared in onend
    }
  }, []);

  // Called when AI stops speaking — resumes mic capture
  const resume = useCallback(() => {
    if (!activeRef.current) return;
    pausedRef.current = false;
    _startInstance();
  }, [_startInstance]);

  // Called when the interview ends
  const stop = useCallback(() => {
    activeRef.current = false;
    pausedRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    console.log('[SpeechRecognition] Stopped user transcript');
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  return { start, pause, resume, stop };
}

// ────────────────────────────────────────────────────────────
// CaptionToggleButton — small button to show/hide captions
// ────────────────────────────────────────────────────────────
export function CaptionToggleButton({
  visible,
  onToggle,
  isDark,
}: {
  visible: boolean;
  onToggle: () => void;
  isDark: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
        visible
          ? 'bg-blue-500/15 border border-blue-400/15 text-blue-400'
          : isDark
            ? 'bg-white/[0.06] border border-white/[0.06] text-slate-400 hover:bg-white/[0.1] hover:text-slate-300'
            : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'
      }`}
      title={visible ? 'Hide captions' : 'Show captions'}
    >
      {visible ? <Captions className="w-4 h-4" /> : <CaptionsOff className="w-4 h-4" />}
    </button>
  );
}
