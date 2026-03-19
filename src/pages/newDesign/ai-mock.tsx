import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Mic,
  Video,
  MessageSquareText,
  Clock,
  ChevronRight,
  Shield,
  Wifi,
  Volume2,
  Sparkles,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/newDesign/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/newDesign/ui/select';
import { Label } from '@/components/newDesign/ui/label';
import { VideoInterview } from '@/components/newDesign/video-interview';
import { CooldownScreen } from '@/components/newDesign/cooldown-screen';
import { endTrainingModule } from '@/services/InterviewServices';

// ─── Session credentials from API ──────────────────────
export interface SessionCredentials {
  sessionId: string;
  url: string;   // LiveKit server URL
  token: string; // LiveKit access token
  roomName?: string;
  maxDuration?: number;
}

// ─── Types ─────────────────────────────────────────────
type Stage = 'modeSelect' | 'warmup' | 'live' | 'cooldown';
type InterviewType = 'behavioral' | 'product' | 'system-design' | 'resume';
type Difficulty = 'junior' | 'intermediate' | 'senior' | 'staff';
type Mode = 'text' | 'voice' | 'video';
type ThemeMode = 'dark' | 'light';

interface SetupConfig {
  type: InterviewType;
  difficulty: Difficulty;
  duration: string;
  mode: Mode;
  company: string;
}

// ─── Warm-up loading messages ──────────────────────────
const WARMUP_STEPS = [
  { text: 'Preparing your environment', duration: 2200 },
  { text: 'Calibrating AI interviewer', duration: 2400 },
  { text: 'Tailoring questions to your profile', duration: 2000 },
  { text: 'Almost ready', duration: 1800 },
];

const BREATHING_PROMPTS = [
  'Take a slow, deep breath in...',
  'Hold gently...',
  'And breathe out...',
  'You\'re doing great.',
];

// ─── Helpers ───────────────────────────────────────────
function getTypeLabel(t: InterviewType) {
  const map: Record<InterviewType, string> = {
    behavioral: 'Behavioral',
    product: 'Product Sense',
    'system-design': 'System Design',
    resume: 'Resume Deep-Dive',
  };
  return map[t];
}

function getUserName(): string {
  try {
    const raw = localStorage.getItem('screnaUserData');
    if (raw) {
      const data = JSON.parse(raw);
      return data.firstName || 'there';
    }
  } catch { /* ignore */ }
  return 'there';
}

// ════════════════════════════════════════════════════════
// THEME TOGGLE BUTTON
// ════════════════════════════════════════════════════════
function ThemeToggle({ theme, onToggle }: { theme: ThemeMode; onToggle: () => void }) {
  return (
    <motion.button
      onClick={onToggle}
      className={`fixed top-6 right-6 z-50 p-2.5 rounded-full border backdrop-blur-sm transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-white/[0.08] border-white/[0.1] text-slate-300 hover:bg-white/[0.12] hover:text-white'
          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 shadow-sm'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === 'dark' ? (
          <motion.div
            key="sun"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="w-4 h-4" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="w-4 h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════
export function AIMockPage({ defaultTheme = 'dark' }: { defaultTheme?: ThemeMode }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // If mode is already provided via URL params, skip mode selection and go straight to warmup
  const initialStage: Stage = searchParams.get('mode') ? 'warmup' : 'modeSelect';
  const [stage, setStage] = useState<Stage>(initialStage);
  const [theme, setTheme] = useState<ThemeMode>(defaultTheme);
  const interviewId = searchParams.get('interviewId') ?? undefined;

  const [config, setConfig] = useState<SetupConfig>(() => {
    // Pre-fill from URL params when navigating from InterviewPrep or dashboard
    const typeParam = (searchParams.get('type') as InterviewType) || 'behavioral';
    const difficultyParam = (searchParams.get('difficulty') as Difficulty) || 'intermediate';
    const durationParam = searchParams.get('duration') || '20';
    const modeParam = (searchParams.get('mode') as Mode) || 'voice';
    const companyParam = searchParams.get('company') || '';
    console.log('[AIMock] Init — interviewId:', interviewId, 'type:', typeParam);
    return {
      type: typeParam,
      difficulty: difficultyParam,
      duration: durationParam,
      mode: modeParam,
      company: companyParam,
    };
  });

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      // Update URL to match theme without remounting
      window.history.replaceState(null, '', next === 'dark' ? '/ai-mock' : '/ai-mockwhite');
      return next;
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Theme toggle - always visible */}
      <ThemeToggle theme={theme} onToggle={toggleTheme} />

      <AnimatePresence mode="wait">
        {stage === 'modeSelect' && (
          <motion.div
            key="modeSelect"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <ModeSelectStage
              onSelect={(mode) => {
                setConfig((c) => ({ ...c, mode }));
                setStage('warmup');
              }}
              theme={theme}
            />
          </motion.div>
        )}
        {stage === 'warmup' && (
          <motion.div
            key="warmup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <WarmupStage
              config={config}
              interviewId={interviewId}
              onReady={() => {
                setStage('live');
              }}
              onCancel={() => navigate(-1)}
              theme={theme}
            />
          </motion.div>
        )}
        {stage === 'live' && (
          <motion.div
            key="live"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <VideoInterview
              config={config}
              interviewId={interviewId}
              onEnd={() => setStage('cooldown')}
              theme={theme}
            />
          </motion.div>
        )}
        {stage === 'cooldown' && (
          <motion.div
            key="cooldown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <CooldownScreen config={config} onComplete={() => {
              const interviewId = searchParams.get('interviewId');
              if (interviewId) endTrainingModule(interviewId).catch(() => {});
              navigate(interviewId ? `/evaluation?interviewId=${interviewId}` : '/evaluation');
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// STAGE 1: MODE SELECTION
// ════════════════════════════════════════════════════════
function ModeSelectStage({
  onSelect,
  theme,
}: {
  onSelect: (mode: Mode) => void;
  theme: ThemeMode;
}) {
  const isDark = theme === 'dark';
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-b from-[#0f172a] via-[#131c33] to-[#0c1322]'
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-50/80'
    }`}>
      <div className="w-full max-w-sm px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-10"
        >
          <div className={`w-12 h-12 mx-auto mb-5 rounded-2xl flex items-center justify-center ${
            isDark
              ? 'bg-gradient-to-br from-blue-500/20 to-teal-500/20'
              : 'bg-gradient-to-br from-blue-500/10 to-teal-500/10'
          }`}>
            <Sparkles className="w-5 h-5 text-blue-500" />
          </div>
          <h1 className={`text-2xl mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            How would you like to practice?
          </h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            Choose your interview mode to get started.
          </p>
        </motion.div>

        {/* Mode cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 gap-4"
        >
          {/* Voice */}
          <button
            onClick={() => onSelect('voice')}
            className={`group flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all duration-200 ${
              isDark
                ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-blue-400/40'
                : 'bg-white border-slate-100 hover:border-blue-400/60 hover:shadow-md shadow-sm'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200 ${
              isDark
                ? 'bg-blue-500/10 group-hover:bg-blue-500/20'
                : 'bg-blue-50 group-hover:bg-blue-100'
            }`}>
              <Mic className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-center">
              <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Voice</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Speak your answers</p>
            </div>
          </button>

          {/* Video */}
          <button
            onClick={() => onSelect('video')}
            className={`group flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all duration-200 ${
              isDark
                ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-blue-400/40'
                : 'bg-white border-slate-100 hover:border-blue-400/60 hover:shadow-md shadow-sm'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200 ${
              isDark
                ? 'bg-blue-500/10 group-hover:bg-blue-500/20'
                : 'bg-blue-50 group-hover:bg-blue-100'
            }`}>
              <Video className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-center">
              <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Video</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Face-to-face practice</p>
            </div>
          </button>
        </motion.div>

        {/* Privacy note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={`text-center text-xs mt-8 flex items-center justify-center gap-1.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}
        >
          <Shield className="w-3 h-3" />
          Private session · No recordings stored
        </motion.p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// STAGE 2 (OLD SETUP — KEPT FOR REFERENCE, NO LONGER USED IN MAIN FLOW)
// ════════════════════════════════════════════════════════
function SetupStage({
  config,
  setConfig,
  onStart,
  theme,
}: {
  config: SetupConfig;
  setConfig: React.Dispatch<React.SetStateAction<SetupConfig>>;
  onStart: () => void;
  theme: ThemeMode;
}) {
  const isDark = theme === 'dark';
  const modes: { value: Mode; icon: React.ReactNode; label: string }[] = [
    { value: 'voice', icon: <Mic className="w-4 h-4" />, label: 'Voice' },
    { value: 'video', icon: <Video className="w-4 h-4" />, label: 'Video' },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      isDark 
        ? 'bg-gradient-to-b from-[#0f172a] via-[#131c33] to-[#0c1322]' 
        : 'bg-gradient-to-b from-slate-50 via-white to-slate-50/80'
    }`}>
      {/* Minimal header */}
      <div className="max-w-2xl mx-auto px-6 pt-8 pb-4">
        <Link
          to="/dashboard/mock-interview"
          className={`inline-flex items-center gap-2 text-sm transition-colors ${
            isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sessions
        </Link>
      </div>

      {/* Main content */}
      <div className="max-w-xl mx-auto px-6 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center mb-10"
        >
          <div className={`w-12 h-12 mx-auto mb-5 rounded-2xl flex items-center justify-center ${
            isDark 
              ? 'bg-gradient-to-br from-blue-500/20 to-teal-500/20' 
              : 'bg-gradient-to-br from-blue-500/10 to-teal-500/10'
          }`}>
            <Sparkles className="w-5 h-5 text-blue-500" />
          </div>
          <h1 className={`text-2xl mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Set up your practice</h1>
          <p className={`text-sm max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            Customize your session. We'll tailor the questions and pacing to fit you.
          </p>
        </motion.div>

        {/* Setup card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`rounded-2xl border p-6 space-y-6 ${
            isDark 
              ? 'bg-white/[0.04] border-white/[0.08] backdrop-blur-sm' 
              : 'bg-white border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
          }`}
        >
          {/* Interview type */}
          <div className="space-y-2">
            <Label className={`text-xs uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Interview Type
            </Label>
            <Select
              value={config.type}
              onValueChange={(v) => setConfig((c) => ({ ...c, type: v as InterviewType }))}
            >
              <SelectTrigger className={`h-11 transition-all ${
                isDark 
                  ? 'bg-white/[0.06] border-white/[0.1] text-white focus:ring-blue-500/20 focus:border-blue-400' 
                  : 'bg-slate-50/50 border-slate-150 focus:ring-blue-500/20 focus:border-blue-400'
              }`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="behavioral">Behavioral</SelectItem>
                <SelectItem value="product">Product Sense</SelectItem>
                <SelectItem value="system-design">System Design</SelectItem>
                <SelectItem value="resume">Resume Deep-Dive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label className={`text-xs uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Difficulty
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {(['junior', 'intermediate', 'senior', 'staff'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setConfig((c) => ({ ...c, difficulty: d }))}
                  className={`h-10 rounded-xl text-sm capitalize transition-all duration-200 ${
                    config.difficulty === d
                      ? isDark 
                        ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/30' 
                        : 'bg-slate-900 text-white shadow-sm'
                      : isDark 
                        ? 'bg-white/[0.06] text-slate-400 hover:bg-white/[0.1] border border-white/[0.08]' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          

          {/* Mode */}
          <div className="space-y-2">
            <Label className={`text-xs uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Response Mode
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {modes.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setConfig((c) => ({ ...c, mode: m.value }))}
                  className={`h-11 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                    config.mode === m.value
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20'
                      : isDark
                        ? 'bg-white/[0.06] text-slate-400 hover:bg-white/[0.1] border border-white/[0.08]'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                  }`}
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target company (optional) */}
          
        </motion.div>

        {/* Session summary + CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-6 space-y-4"
        >
          {/* Summary pill */}
          <div className={`flex items-center justify-center gap-3 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Private session
            </span>
            <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
            <span>No recordings stored</span>
            <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`} />
            <span>{config.duration} min</span>
          </div>

          <Button
            onClick={onStart}
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 text-[15px] gap-2"
          >
            Begin Session
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// STAGE 2: WARM-UP LOADING ROOM
// ════════════════════════════════════════════════════════
function WarmupStage({
  config,
  onReady,
  onCancel,
  theme,
  interviewId,
}: {
  config: SetupConfig;
  onReady: () => void;
  onCancel: () => void;
  theme: ThemeMode;
  interviewId?: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [breathIndex, setBreathIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stepsComplete, setStepsComplete] = useState(false);

  // Transition once steps complete
  useEffect(() => {
    if (!stepsComplete) return;
    const t = setTimeout(() => onReady(), 600);
    return () => clearTimeout(t);
  }, [stepsComplete, onReady]);

  // Walk through warm-up steps
  useEffect(() => {
    if (stepIndex >= WARMUP_STEPS.length) {
      setStepsComplete(true);
      return;
    }
    const t = setTimeout(() => {
      setStepIndex((i) => i + 1);
    }, WARMUP_STEPS[stepIndex].duration);
    return () => clearTimeout(t);
  }, [stepIndex]);

  // Smooth progress bar
  useEffect(() => {
    const totalDuration = WARMUP_STEPS.reduce((s, step) => s + step.duration, 0);
    let elapsed = 0;
    for (let i = 0; i < stepIndex; i++) elapsed += WARMUP_STEPS[i].duration;
    const targetPct = Math.min((elapsed / totalDuration) * 100, 100);
    setProgress(targetPct);
  }, [stepIndex]);

  // Breathing cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setBreathIndex((i) => (i + 1) % BREATHING_PROMPTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const currentStep = stepIndex < WARMUP_STEPS.length
    ? WARMUP_STEPS[stepIndex]
    : null;
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-b from-[#0f172a] via-[#131c33] to-[#0c1322]'
        : 'bg-gradient-to-b from-slate-50 via-white to-blue-50/30'
    }`}>
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] ${
          isDark ? 'bg-blue-500/[0.03]' : 'bg-blue-400/[0.08]'
        }`} />
        <div className={`absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full blur-[100px] animate-pulse ${
          isDark ? 'bg-teal-500/[0.04]' : 'bg-teal-400/[0.06]'
        }`} />
      </div>

      {/* Exit button - offset to avoid theme toggle */}
      <button
        onClick={onCancel}
        className={`absolute top-6 right-20 z-10 transition-colors p-2 rounded-full ${
          isDark 
            ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5' 
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        }`}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Central orb */}
      <div className="relative mb-14">
        <Orb stage="warmup" theme={theme} />
      </div>

      {/* Status text */}
      <div className="text-center z-10 space-y-4 max-w-sm">
        <AnimatePresence mode="wait">
          {currentStep && (
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center gap-2.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className={`text-sm tracking-wide ${isDark ? 'text-blue-100/80' : 'text-slate-600'}`}>
                {currentStep.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <div className={`w-48 mx-auto h-[2px] rounded-full overflow-hidden ${
          isDark ? 'bg-white/[0.06]' : 'bg-slate-200'
        }`}>
          <motion.div
            className={`h-full rounded-full ${
              isDark 
                ? 'bg-gradient-to-r from-blue-400/60 to-teal-400/40' 
                : 'bg-gradient-to-r from-blue-500 to-teal-400'
            }`}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        </div>

        {/* Breathing prompt */}
        <AnimatePresence mode="wait">
          <motion.p
            key={breathIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className={`text-xs tracking-wider mt-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
          >
            {BREATHING_PROMPTS[breathIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Session info footer */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[11px] ${
        isDark ? 'text-slate-600' : 'text-slate-400'
      }`}>
        <span className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3" />
          Connected
        </span>
        <span className={`w-0.5 h-0.5 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
        <span>{getTypeLabel(config.type)}</span>
        <span className={`w-0.5 h-0.5 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
        <span>{config.duration} min</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// STAGE 3: INTERVIEW OPENING
// ════════════════════════════════════════════════════════
function OpeningStage({
  config,
  onBack,
  onBegin,
  theme,
}: {
  config: SetupConfig;
  onBack: () => void;
  onBegin: () => void;
  theme: ThemeMode;
}) {
  const [showGreeting, setShowGreeting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const userName = getUserName();
  const isDark = theme === 'dark';

  useEffect(() => {
    const t1 = setTimeout(() => setShowGreeting(true), 600);
    const t2 = setTimeout(() => setShowDetails(true), 1400);
    const t3 = setTimeout(() => setShowCta(true), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${
      isDark
        ? 'bg-gradient-to-b from-[#0f172a] via-[#131c33] to-[#0c1322]'
        : 'bg-gradient-to-b from-slate-50 via-white to-blue-50/30'
    }`}>
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[140px] ${
          isDark ? 'bg-blue-500/[0.04]' : 'bg-blue-400/[0.08]'
        }`} />
        <div className={`absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full blur-[80px] ${
          isDark ? 'bg-teal-400/[0.03]' : 'bg-teal-400/[0.06]'
        }`} />
      </div>

      {/* Exit / Back */}
      <button
        onClick={onBack}
        className={`absolute top-6 left-6 z-10 flex items-center gap-2 text-sm p-2 rounded-full transition-colors ${
          isDark
            ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* Central orb - now with waveform */}
      <div className="relative mb-12">
        <Orb stage="opening" theme={theme} />
        {/* Waveform ring */}
        <WaveformRing active={sessionStarted} />
      </div>

      {/* Greeting */}
      <div className="text-center z-10 space-y-3 max-w-md px-6">
        <AnimatePresence>
          {showGreeting && (
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={`text-xl ${isDark ? 'text-blue-50/90' : 'text-slate-800'}`}
            >
              Hi {userName}, I'm ready when you are.
            </motion.h2>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-2"
            >
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                We'll go through a {config.duration}-minute {getTypeLabel(config.type).toLowerCase()} session
                {config.company && config.company !== 'any' ? (
                  <> tailored for <span className={`capitalize ${isDark ? 'text-blue-300/80' : 'text-blue-600'}`}>{config.company}</span></>
                ) : null}
                . Take your time with each answer — there's no rush.
              </p>

              {/* Session meta pills */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${
                  isDark
                    ? 'bg-white/[0.06] text-slate-400 border-white/[0.04]'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  <Clock className="w-3 h-3" />
                  {config.duration} min
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] capitalize border ${
                  isDark
                    ? 'bg-white/[0.06] text-slate-400 border-white/[0.04]'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  {config.mode === 'voice' && <Mic className="w-3 h-3" />}
                  {config.mode === 'video' && <Video className="w-3 h-3" />}
                  {config.mode === 'text' && <MessageSquareText className="w-3 h-3" />}
                  {config.mode}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] capitalize border ${
                  isDark
                    ? 'bg-white/[0.06] text-slate-400 border-white/[0.04]'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  {config.difficulty}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCta && !sessionStarted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="pt-6"
            >
              <Button
                onClick={onBegin}
                className="h-12 px-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/35 text-[15px] gap-2"
              >
                I'm Ready
                <Mic className="w-4 h-4" />
              </Button>
              <p className={`text-[11px] mt-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                Press when you're comfortable to begin
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post-start state */}
        <AnimatePresence>
          {sessionStarted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="pt-6 space-y-3"
            >
              <p className={`text-sm ${isDark ? 'text-blue-100/70' : 'text-slate-500'}`}>
                Let's start with your first question...
              </p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.8 }}
                className={`text-base max-w-sm mx-auto ${isDark ? 'text-blue-50/90' : 'text-slate-800'}`}
              >
                "Tell me about a time you had to influence a decision without having direct authority."
              </motion.p>

              {/* Response mode indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5, duration: 0.5 }}
                className="flex items-center justify-center gap-2 pt-4"
              >
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${
                  isDark
                    ? 'bg-white/[0.06] border-white/[0.06]'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  {config.mode === 'voice' ? (
                    <>
                      <Volume2 className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                      <span className={`text-xs ${isDark ? 'text-blue-200/60' : 'text-slate-500'}`}>Listening...</span>
                      <span className="flex gap-0.5">
                        {[...Array(4)].map((_, i) => (
                          <motion.span
                            key={i}
                            className={`w-0.5 rounded-full ${isDark ? 'bg-blue-400/60' : 'bg-blue-500/60'}`}
                            animate={{ height: ['4px', '12px', '4px'] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: 'easeInOut',
                            }}
                          />
                        ))}
                      </span>
                    </>
                  ) : config.mode === 'video' ? (
                    <>
                      <Video className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                      <span className={`text-xs ${isDark ? 'text-blue-200/60' : 'text-slate-500'}`}>Recording...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquareText className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                      <span className={`text-xs ${isDark ? 'text-blue-200/60' : 'text-slate-500'}`}>Type your response below</span>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Subtle footer */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[11px] ${
        isDark ? 'text-slate-600' : 'text-slate-400'
      }`}>
        <span className="flex items-center gap-1.5">
          <Shield className="w-3 h-3" />
          End-to-end encrypted
        </span>
        <span className={`w-0.5 h-0.5 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-300'}`} />
        <span>Session is private</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// ORB COMPONENT — Central animated element
// ════════════════════════════════════════════════════════
function Orb({ stage, theme }: { stage: 'warmup' | 'opening'; theme: ThemeMode }) {
  const isOpening = stage === 'opening';
  const isDark = theme === 'dark';

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
        }}
        animate={{
          scale: isOpening ? [1, 1.3, 1] : [1, 1.2, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: isOpening ? 3 : 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Middle pulse ring */}
      <motion.div
        className="absolute inset-3 rounded-full border border-blue-400/[0.08]"
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: isOpening ? 2.5 : 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 0.5,
        }}
      />

      {/* Core orb */}
      <motion.div
        className="relative w-20 h-20 rounded-full overflow-hidden shadow-[0_0_60px_rgba(59,130,246,0.2)]"
        animate={{
          scale: isOpening ? [1, 1.06, 1] : [1, 1.04, 1],
        }}
        transition={{
          duration: isOpening ? 2 : 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/80 via-blue-600/60 to-teal-500/40" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-tl from-teal-400/30 via-transparent to-blue-400/20"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
        />
        {/* Inner light */}
        <div className="absolute top-2 left-3 w-6 h-4 rounded-full bg-white/20 blur-sm" />
      </motion.div>

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-blue-300/30"
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${20 + Math.random() * 60}%`,
          }}
          animate={{
            y: [0, -10 - Math.random() * 10, 0],
            x: [0, (Math.random() - 0.5) * 8, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// WAVEFORM RING — surrounds orb in opening stage
// ════════════════════════════════════════════════════════
function WaveformRing({ active }: { active: boolean }) {
  const bars = 32;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative w-44 h-44">
        {[...Array(bars)].map((_, i) => {
          const angle = (i / bars) * 360;
          const rad = (angle * Math.PI) / 180;
          const radius = 88;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;

          return (
            <motion.div
              key={i}
              className="absolute bg-blue-400/20 rounded-full"
              style={{
                width: '2px',
                left: '50%',
                top: '50%',
                transform: `translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
                transformOrigin: 'center',
              }}
              animate={{
                height: active
                  ? [`${4 + Math.random() * 4}px`, `${8 + Math.random() * 14}px`, `${4 + Math.random() * 4}px`]
                  : ['3px', '5px', '3px'],
                opacity: active ? [0.3, 0.7, 0.3] : [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: active ? 0.6 + Math.random() * 0.4 : 2 + Math.random(),
                repeat: Infinity,
                ease: 'easeInOut',
                delay: (i / bars) * 0.8,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

