import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────
export interface CooldownConfig {
  type: string;
  duration: string;
}

// ─── Processing steps ──────────────────────────────────
const PROCESSING_STEPS = [
  { text: 'Processing your responses', duration: 2600 },
  { text: 'Analyzing communication patterns', duration: 2200 },
  { text: 'Evaluating framework usage', duration: 2400 },
  { text: 'Identifying strengths & growth areas', duration: 2000 },
  { text: 'Preparing personalized feedback', duration: 2200 },
];

const ENCOURAGEMENTS = [
  'Great effort — every session makes you sharper.',
  'You showed up and practiced. That matters.',
  'Feedback is a gift. Let\'s see what we found.',
];

// ════════════════════════════════════════════════════════
// COOLDOWN PROCESSING SCREEN
// ════════════════════════════════════════════════════════
export function CooldownScreen({
  config,
  onComplete,
}: {
  config: CooldownConfig;
  onComplete: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [encourageIdx] = useState(() => Math.floor(Math.random() * ENCOURAGEMENTS.length));

  // Walk through processing steps
  useEffect(() => {
    if (stepIndex >= PROCESSING_STEPS.length) {
      const t = setTimeout(onComplete, 800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setStepIndex((i) => i + 1);
    }, PROCESSING_STEPS[stepIndex].duration);
    return () => clearTimeout(t);
  }, [stepIndex, onComplete]);

  // Smooth progress
  useEffect(() => {
    const total = PROCESSING_STEPS.reduce((s, step) => s + step.duration, 0);
    let elapsed = 0;
    for (let i = 0; i < stepIndex; i++) elapsed += PROCESSING_STEPS[i].duration;
    setProgress(Math.min((elapsed / total) * 100, 100));
  }, [stepIndex]);

  const currentStep = stepIndex < PROCESSING_STEPS.length ? PROCESSING_STEPS[stepIndex] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b1120] via-[#0f172a] to-[#0b1120] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[140px]"
          animate={{
            backgroundColor: [
              'rgba(59,130,246,0.03)',
              'rgba(139,92,246,0.035)',
              'rgba(45,212,191,0.03)',
              'rgba(59,130,246,0.03)',
            ],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Processing orb */}
      <div className="relative mb-16">
        <ProcessingOrb progress={progress} />
      </div>

      {/* Status text */}
      <div className="text-center z-10 space-y-5 max-w-sm px-6">
        <AnimatePresence mode="wait">
          {currentStep ? (
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="flex items-center justify-center gap-2.5"
            >
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-blue-400"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="text-blue-100/70 text-sm tracking-wide">
                {currentStep.text}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2"
            >
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: 2 }}
              />
              <span className="text-emerald-200/70 text-sm tracking-wide">
                Your feedback is ready
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <div className="w-56 mx-auto h-[2px] bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, rgba(59,130,246,0.6) 0%, rgba(139,92,246,0.4) 50%, rgba(45,212,191,0.5) 100%)',
            }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>

        {/* Step counter */}
        <p className="text-[11px] text-slate-600 tabular-nums">
          {Math.min(stepIndex + 1, PROCESSING_STEPS.length)} of {PROCESSING_STEPS.length}
        </p>

        {/* Encouragement text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ delay: 2, duration: 1.2 }}
          className="text-slate-500 text-xs tracking-wide pt-4"
        >
          {ENCOURAGEMENTS[encourageIdx]}
        </motion.p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[11px] text-slate-600">
        <span className="flex items-center gap-1.5">
          <Shield className="w-3 h-3" />
          Analysis is private
        </span>
        <span className="w-0.5 h-0.5 rounded-full bg-slate-700" />
        <span>Only you can see results</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// PROCESSING ORB — data-visualization morphing
// ════════════════════════════════════════════════════════
function ProcessingOrb({ progress }: { progress: number }) {
  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      {/* Outer scanning ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: '1px solid rgba(139,92,246,0.08)' }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

      {/* Progress arc (simulated) */}
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle
          cx="80" cy="80" r="72"
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="1"
        />
        <motion.circle
          cx="80" cy="80" r="72"
          fill="none"
          stroke="url(#progressGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 72}`}
          initial={{
            strokeDashoffset: 2 * Math.PI * 72,
          }}
          animate={{
            strokeDashoffset: 2 * Math.PI * 72 * (1 - progress / 100),
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(59,130,246,0.5)" />
            <stop offset="50%" stopColor="rgba(139,92,246,0.4)" />
            <stop offset="100%" stopColor="rgba(45,212,191,0.5)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Pulsing glow */}
      <motion.div
        className="absolute inset-4 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Core orb */}
      <motion.div
        className="relative w-20 h-20 rounded-full overflow-hidden shadow-[0_0_60px_rgba(139,92,246,0.15)]"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/50 via-violet-500/50 to-teal-500/30" />
        {/* Conic sweep */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(139,92,246,0.15) 30%, transparent 60%, rgba(59,130,246,0.1) 80%, transparent 100%)',
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
        {/* Light sweep */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
        />
        <div className="absolute top-2.5 left-3.5 w-6 h-4 rounded-full bg-white/15 blur-sm" />
      </motion.div>

      {/* Data particles */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const r = 55 + (i % 3) * 8;
        return (
          <motion.div
            key={i}
            className="absolute w-[3px] h-[3px] rounded-full bg-violet-300/20"
            style={{
              left: `calc(50% + ${Math.cos(angle) * r}px)`,
              top: `calc(50% + ${Math.sin(angle) * r}px)`,
            }}
            animate={{
              opacity: [0, 0.6, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.4,
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </div>
  );
}