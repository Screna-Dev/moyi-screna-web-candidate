import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────
type CountdownLevel = 'hidden' | 'gentle' | 'moderate' | 'urgent';

interface SessionCountdownProps {
  /** Seconds remaining in the session */
  remaining: number;
  /** Total session duration in seconds */
  totalSeconds: number;
  /** Theme support */
  isDark: boolean;
}

// ─── Thresholds (in seconds) ───────────────────────────
const GENTLE_THRESHOLD = 300; // 5 min
const MODERATE_THRESHOLD = 120; // 2 min
const URGENT_THRESHOLD = 30; // 30 sec

function getLevel(remaining: number): CountdownLevel {
  if (remaining <= URGENT_THRESHOLD) return 'urgent';
  if (remaining <= MODERATE_THRESHOLD) return 'moderate';
  if (remaining <= GENTLE_THRESHOLD) return 'gentle';
  return 'hidden';
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ════════════════════════════════════════════════════════
// SESSION COUNTDOWN PILL
// ════════════════════════════════════════════════════════
export function SessionCountdown({ remaining, totalSeconds, isDark }: SessionCountdownProps) {
  const [dismissed, setDismissed] = useState(false);
  const [hasAppeared, setHasAppeared] = useState(false);
  const level = getLevel(remaining);

  // Track first appearance for entrance glow
  useEffect(() => {
    if (level !== 'hidden' && !hasAppeared) {
      setHasAppeared(true);
    }
  }, [level, hasAppeared]);

  // Don't render if hidden or dismissed
  if (level === 'hidden' || dismissed) return null;

  // Progress within the 5-min countdown window
  const countdownWindow = GENTLE_THRESHOLD; // 300s
  const progressFraction = Math.max(0, Math.min(1, 1 - remaining / countdownWindow));

  return (
    <AnimatePresence>
      <motion.div
        key="session-countdown"
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="z-40"
      >
        <CountdownPill
          remaining={remaining}
          level={level}
          progressFraction={progressFraction}
          isDark={isDark}
          onDismiss={() => setDismissed(true)}
        />
      </motion.div>
    </AnimatePresence>
  );
}

// ════════════════════════════════════════════════════════
// COUNTDOWN PILL — The visual badge
// ════════════════════════════════════════════════════════
function CountdownPill({
  remaining,
  level,
  progressFraction,
  isDark,
  onDismiss,
}: {
  remaining: number;
  level: Exclude<CountdownLevel, 'hidden'>;
  progressFraction: number;
  isDark: boolean;
  onDismiss: () => void;
}) {
  const config = useMemo(() => {
    const styles = {
      gentle: {
        bg: isDark ? 'bg-slate-800/60' : 'bg-white/80',
        border: isDark ? 'border-slate-600/30' : 'border-slate-200',
        text: isDark ? 'text-slate-300' : 'text-slate-600',
        ringColor: isDark ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.4)',
        ringTrack: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)',
        glow: 'none',
        label: `Ending in ${formatCountdown(remaining)}`,
      },
      moderate: {
        bg: isDark ? 'bg-amber-950/40' : 'bg-amber-50/90',
        border: isDark ? 'border-amber-700/30' : 'border-amber-200',
        text: isDark ? 'text-amber-200' : 'text-amber-700',
        ringColor: isDark ? 'rgba(251,191,36,0.7)' : 'rgba(217,119,6,0.6)',
        ringTrack: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(217,119,6,0.12)',
        glow: isDark
          ? '0 0 12px rgba(251,191,36,0.12)'
          : '0 0 12px rgba(217,119,6,0.08)',
        label: `${formatCountdown(remaining)} left \u2014 wrap up your answer`,
      },
      urgent: {
        bg: isDark ? 'bg-orange-950/50' : 'bg-orange-50/90',
        border: isDark ? 'border-orange-700/35' : 'border-orange-200',
        text: isDark ? 'text-orange-200' : 'text-orange-700',
        ringColor: isDark ? 'rgba(251,146,60,0.8)' : 'rgba(234,88,12,0.7)',
        ringTrack: isDark ? 'rgba(251,146,60,0.18)' : 'rgba(234,88,12,0.14)',
        glow: isDark
          ? '0 0 16px rgba(251,146,60,0.15)'
          : '0 0 16px rgba(234,88,12,0.10)',
        label: `${remaining}s \u2014 final thought`,
      },
    };
    return styles[level];
  }, [level, remaining, isDark]);

  const pillSize = level === 'gentle' ? 'py-1.5 px-3' : 'py-2 px-3.5';

  return (
    <div
      className={`
        inline-flex items-center gap-2.5 rounded-full border backdrop-blur-md
        ${config.bg} ${config.border} ${pillSize}
        transition-all duration-500
      `}
      style={{ boxShadow: config.glow }}
    >
      {/* Mini progress ring */}
      <ProgressRing
        fraction={progressFraction}
        size={level === 'gentle' ? 16 : 18}
        strokeWidth={level === 'gentle' ? 1.5 : 2}
        color={config.ringColor}
        trackColor={config.ringTrack}
      />

      {/* Label */}
      <span
        className={`text-xs tabular-nums whitespace-nowrap ${config.text}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {config.label}
      </span>

      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className={`
          p-0.5 rounded-full transition-colors duration-200
          ${isDark
            ? 'text-slate-500 hover:text-slate-300 hover:bg-white/10'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/60'
          }
        `}
        title="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// PROGRESS RING — Thin circular progress indicator
// ════════════════════════════════════════════════════════
function ProgressRing({
  fraction,
  size,
  strokeWidth,
  color,
  trackColor,
}: {
  fraction: number;
  size: number;
  strokeWidth: number;
  color: string;
  trackColor: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 -rotate-90"
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
      />
    </svg>
  );
}
