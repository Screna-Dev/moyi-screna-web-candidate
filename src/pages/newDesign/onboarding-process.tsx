import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Target,
  Brain,
  Code2,
  BarChart3,
  Cpu,
  Layers,
  MonitorPlay,
  BookOpen,
  Mic,
  Rocket,
  ChevronRight,
  Zap,
  Shield,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserProfile {
  careerStage: string;
  primaryGoal: string;
  targetRole: string;
  companyType: string[];
  timeline: string;
  biggestChallenge: string[];
}

// ─── Inline SVG icon (defined before constants that reference it) ─────────────

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Get Started' },
  { id: 2, label: 'Your Journey' },
  { id: 3, label: 'Target Role' },
  { id: 4, label: 'AI Matching' },
  { id: 5, label: 'Your Hub' },
];

const CAREER_STAGES = [
  { id: 'student', label: 'Student', sub: 'Still in school or bootcamp' },
  { id: 'newgrad', label: 'New Graduate', sub: 'Graduated within the last year' },
  { id: 'early', label: '1–3 Years Exp', sub: 'Building my foundation' },
  { id: 'mid', label: '4+ Years Exp', sub: 'Leveling up or switching' },
];

const PRIMARY_GOALS = [
  { id: 'first', label: 'Land my first tech role', icon: Rocket },
  { id: 'switch', label: 'Switch into tech', icon: Layers },
  { id: 'level', label: 'Level up to senior', icon: TrendingUpIcon },
  { id: 'faang', label: 'Break into FAANG', icon: Target },
];

const TARGET_ROLES = [
  { id: 'swe', label: 'Software Engineer', icon: Code2 },
  { id: 'frontend', label: 'Frontend', icon: MonitorPlay },
  { id: 'backend', label: 'Backend', icon: Cpu },
  { id: 'fullstack', label: 'Full-Stack', icon: Layers },
  { id: 'data', label: 'Data Engineer', icon: BarChart3 },
  { id: 'ml', label: 'ML / AI Engineer', icon: Brain },
  { id: 'pm', label: 'Product Manager', icon: Target },
  { id: 'analyst', label: 'Data Analyst', icon: BarChart3 },
];

const COMPANY_TYPES = [
  { id: 'faang', label: 'FAANG / Big Tech' },
  { id: 'unicorn', label: 'Unicorn / Scale-up' },
  { id: 'mid', label: 'Mid-size Company' },
  { id: 'startup', label: 'Startup' },
  { id: 'open', label: 'Open to all' },
];

const TIMELINES = [
  { id: 'asap', label: 'ASAP', sub: '< 1 month' },
  { id: '1-3', label: '1–3 months', sub: 'Steady pace' },
  { id: '3-6', label: '3–6 months', sub: 'Building up' },
  { id: 'explore', label: 'Just Exploring', sub: 'No rush' },
];

const CHALLENGES = [
  { id: 'coding', label: 'Coding / LeetCode' },
  { id: 'system', label: 'System Design' },
  { id: 'behavioral', label: 'Behavioral / STAR' },
  { id: 'resume', label: 'Resume & Screening' },
  { id: 'negotiation', label: 'Offer Negotiation' },
  { id: 'confidence', label: 'Interview Confidence' },
];

const AI_STEPS_TEXT = [
  'Analyzing your career stage…',
  'Matching role-specific requirements…',
  'Curating your practice question bank…',
  'Calibrating difficulty & pacing…',
  'Building your personalized plan…',
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 w-full">
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-[hsl(142,70%,45%)] text-white'
                    : isActive
                    ? 'bg-[hsl(221,91%,60%)] text-white shadow-[0_0_14px_rgba(67,118,248,0.3)]'
                    : 'bg-[hsl(220,18%,96%)] border border-[hsl(220,16%,90%)] text-[hsl(222,12%,65%)]'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                ) : (
                  <span className="text-[11px] font-bold">{step.id}</span>
                )}
              </div>
              <span
                className={`text-[10.5px] font-medium whitespace-nowrap transition-colors duration-300 ${
                  isCompleted
                    ? 'text-[hsl(142,70%,40%)]'
                    : isActive
                    ? 'text-[hsl(221,91%,60%)]'
                    : 'text-[hsl(222,12%,65%)]'
                }`}
              >
                {step.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={`w-12 h-[1.5px] mx-1 mb-5 transition-all duration-500 ${
                  currentStep > step.id
                    ? 'bg-[hsl(142,70%,45%)]'
                    : 'bg-[hsl(220,16%,90%)]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SelectionChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-full border text-[13px] font-medium transition-all duration-200 ${
        selected
          ? 'bg-[hsl(221,91%,60%)] border-[hsl(221,91%,60%)] text-white shadow-[0_2px_10px_rgba(67,118,248,0.25)]'
          : 'bg-white border-[hsl(220,16%,90%)] text-[hsl(222,22%,15%)] hover:border-[hsl(221,91%,60%)] hover:text-[hsl(221,91%,60%)]'
      }`}
    >
      {label}
    </button>
  );
}

// ─── Step Screens ─────────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center text-center"
    >
      {/* Icon badge */}
      <div className="w-14 h-14 rounded-2xl bg-[hsl(221,91%,60%)]/10 border border-[hsl(221,91%,60%)]/20 flex items-center justify-center mb-6">
        <Sparkles className="w-6 h-6 text-[hsl(221,91%,60%)]" />
      </div>

      <span className="text-[12px] font-semibold text-[hsl(221,91%,60%)] tracking-[0.5px] uppercase mb-3">
        Welcome to Screna
      </span>

      <h1
        className="text-[30px] font-bold text-[hsl(222,22%,15%)] max-w-[480px] mb-4"
        style={{ fontFamily: 'var(--font-sans)', lineHeight: 1.15, letterSpacing: '-0.02em' }}
      >
        Let's build your personalized
        <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'hsl(221,91%,60%)', marginLeft: 8 }}>
          interview path
        </span>
      </h1>

      <p className="text-[15px] text-[hsl(222,12%,45%)] max-w-[420px] leading-[1.7] mb-8">
        Answer a few quick questions — no long forms, no fluff. In under 2 minutes, Screna will build a practice plan tailored to your exact target role and career stage.
      </p>

      {/* Value props */}
      <div className="flex gap-3 mb-9 flex-wrap justify-center">
        {[
          { icon: Target, text: 'Role-specific questions' },
          { icon: Brain, text: 'AI-powered coaching' },
          { icon: Zap, text: 'Ready in 2 minutes' },
        ].map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[hsl(220,18%,97%)] border border-[hsl(220,16%,92%)]"
          >
            <Icon className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" />
            <span className="text-[12.5px] font-medium text-[hsl(222,22%,25%)]">{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="flex items-center gap-2 px-7 py-3 rounded-xl bg-[hsl(221,91%,60%)] text-white text-[14px] font-semibold hover:bg-[hsl(221,91%,55%)] transition-all duration-200 shadow-[0_4px_14px_rgba(67,118,248,0.3)] hover:shadow-[0_6px_20px_rgba(67,118,248,0.4)] hover:-translate-y-[1px]"
      >
        Get started
        <ArrowRight className="w-4 h-4" />
      </button>

      <p className="mt-4 text-[11.5px] text-[hsl(222,12%,60%)]">
        Takes about 2 minutes · No credit card required
      </p>
    </motion.div>
  );
}

function StepJourney({
  profile,
  setProfile,
  onNext,
  onBack,
}: {
  profile: UserProfile;
  setProfile: (p: Partial<UserProfile>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canProceed = profile.careerStage && profile.primaryGoal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center w-full"
    >
      <h2
        className="text-[24px] font-bold text-[hsl(222,22%,15%)] mb-1.5 text-center"
        style={{ letterSpacing: '-0.02em' }}
      >
        Where are you in your journey?
      </h2>
      <p className="text-[14px] text-[hsl(222,12%,50%)] mb-8 text-center">
        This helps us calibrate difficulty and question types.
      </p>

      {/* Career stage cards */}
      <div className="grid grid-cols-2 gap-3 w-full mb-8">
        {CAREER_STAGES.map((stage) => {
          const isSelected = profile.careerStage === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setProfile({ careerStage: stage.id })}
              className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 ${
                isSelected
                  ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/5 shadow-[0_0_0_1px_hsl(221,91%,60%)]'
                  : 'border-[hsl(220,16%,90%)] bg-white hover:border-[hsl(221,91%,60%)]/50 hover:bg-[hsl(221,91%,60%)]/3'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className={`text-[14px] font-semibold ${
                    isSelected ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,22%,15%)]'
                  }`}
                >
                  {stage.label}
                </span>
                {isSelected && (
                  <div className="w-4.5 h-4.5 rounded-full bg-[hsl(221,91%,60%)] flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              <span className="text-[12px] text-[hsl(222,12%,55%)]">{stage.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Primary goal */}
      <div className="w-full mb-8">
        <p className="text-[13px] font-semibold text-[hsl(222,22%,15%)] mb-3">
          What's your primary goal right now?
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {PRIMARY_GOALS.map(({ id, label, icon: Icon }) => {
            const isSelected = profile.primaryGoal === id;
            return (
              <button
                key={id}
                onClick={() => setProfile({ primaryGoal: id })}
                className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/5 shadow-[0_0_0_1px_hsl(221,91%,60%)]'
                    : 'border-[hsl(220,16%,90%)] bg-white hover:border-[hsl(221,91%,60%)]/50'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-[hsl(221,91%,60%)] text-white'
                      : 'bg-[hsl(220,18%,96%)] text-[hsl(222,12%,55%)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[13px] font-medium leading-snug ${
                    isSelected ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,22%,20%)]'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
            canProceed
              ? 'bg-[hsl(221,91%,60%)] text-white hover:bg-[hsl(221,91%,55%)] shadow-[0_4px_12px_rgba(67,118,248,0.25)]'
              : 'bg-[hsl(220,18%,96%)] text-[hsl(222,12%,60%)] cursor-not-allowed'
          }`}
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function StepTargetRole({
  profile,
  setProfile,
  onNext,
  onBack,
}: {
  profile: UserProfile;
  setProfile: (p: Partial<UserProfile>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canProceed = profile.targetRole && profile.timeline;

  const toggleCompanyType = (id: string) => {
    const current = profile.companyType || [];
    if (current.includes(id)) {
      setProfile({ companyType: current.filter((c) => c !== id) });
    } else {
      setProfile({ companyType: [...current, id] });
    }
  };

  const toggleChallenge = (id: string) => {
    const current = profile.biggestChallenge || [];
    if (current.includes(id)) {
      setProfile({ biggestChallenge: current.filter((c) => c !== id) });
    } else {
      setProfile({ biggestChallenge: [...current, id] });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center w-full"
    >
      <h2
        className="text-[24px] font-bold text-[hsl(222,22%,15%)] mb-1.5 text-center"
        style={{ letterSpacing: '-0.02em' }}
      >
        Set your target role
      </h2>
      <p className="text-[14px] text-[hsl(222,12%,50%)] mb-7 text-center">
        We'll tailor every question and resource to your specific path.
      </p>

      {/* Target role */}
      <div className="w-full mb-6">
        <p className="text-[13px] font-semibold text-[hsl(222,22%,15%)] mb-3">
          Target role <span className="text-[hsl(221,91%,60%)]">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {TARGET_ROLES.map(({ id, label, icon: Icon }) => {
            const isSelected = profile.targetRole === id;
            return (
              <button
                key={id}
                onClick={() => setProfile({ targetRole: id })}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[13px] font-medium transition-all duration-200 ${
                  isSelected
                    ? 'bg-[hsl(221,91%,60%)] border-[hsl(221,91%,60%)] text-white shadow-[0_2px_8px_rgba(67,118,248,0.25)]'
                    : 'bg-white border-[hsl(220,16%,90%)] text-[hsl(222,22%,20%)] hover:border-[hsl(221,91%,60%)]/60 hover:text-[hsl(221,91%,60%)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Company type */}
      <div className="w-full mb-6">
        <p className="text-[13px] font-semibold text-[hsl(222,22%,15%)] mb-3">
          Company type{' '}
          <span className="text-[12px] font-normal text-[hsl(222,12%,60%)]">(select all that apply)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {COMPANY_TYPES.map(({ id, label }) => (
            <SelectionChip
              key={id}
              label={label}
              selected={(profile.companyType || []).includes(id)}
              onClick={() => toggleCompanyType(id)}
            />
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="w-full mb-6">
        <p className="text-[13px] font-semibold text-[hsl(222,22%,15%)] mb-3">
          When are you planning to interview? <span className="text-[hsl(221,91%,60%)]">*</span>
        </p>
        <div className="grid grid-cols-4 gap-2">
          {TIMELINES.map(({ id, label, sub }) => {
            const isSelected = profile.timeline === id;
            return (
              <button
                key={id}
                onClick={() => setProfile({ timeline: id })}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/5 shadow-[0_0_0_1px_hsl(221,91%,60%)]'
                    : 'border-[hsl(220,16%,90%)] bg-white hover:border-[hsl(221,91%,60%)]/50'
                }`}
              >
                <span
                  className={`text-[13px] font-semibold ${
                    isSelected ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,22%,15%)]'
                  }`}
                >
                  {label}
                </span>
                <span className="text-[10.5px] text-[hsl(222,12%,60%)] mt-0.5">{sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Challenges */}
      <div className="w-full mb-7">
        <p className="text-[13px] font-semibold text-[hsl(222,22%,15%)] mb-3">
          Biggest challenge?{' '}
          <span className="text-[12px] font-normal text-[hsl(222,12%,60%)]">(pick up to 2)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {CHALLENGES.map(({ id, label }) => (
            <SelectionChip
              key={id}
              label={label}
              selected={(profile.biggestChallenge || []).includes(id)}
              onClick={() => toggleChallenge(id)}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] font-medium text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-200 ${
            canProceed
              ? 'bg-[hsl(221,91%,60%)] text-white hover:bg-[hsl(221,91%,55%)] shadow-[0_4px_12px_rgba(67,118,248,0.25)]'
              : 'bg-[hsl(220,18%,96%)] text-[hsl(222,12%,60%)] cursor-not-allowed'
          }`}
        >
          Build my plan
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function StepAISynthesis({ onDone }: { onDone: () => void }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Animate through steps
    const stepDuration = 700;
    const timers: ReturnType<typeof setTimeout>[] = [];

    AI_STEPS_TEXT.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setActiveIdx(i);
          setProgress(Math.round(((i + 1) / AI_STEPS_TEXT.length) * 90));
        }, i * stepDuration)
      );
    });

    // Final
    timers.push(
      setTimeout(() => {
        setProgress(100);
        setDone(true);
      }, AI_STEPS_TEXT.length * stepDuration + 400)
    );

    timers.push(
      setTimeout(() => {
        onDone();
      }, AI_STEPS_TEXT.length * stepDuration + 1200)
    );

    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center text-center py-6"
    >
      {/* Animated orb */}
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 rounded-full bg-[hsl(221,91%,60%)]/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-2 rounded-full bg-[hsl(221,91%,60%)]/15" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[hsl(221,91%,60%)] flex items-center justify-center shadow-[0_0_40px_rgba(67,118,248,0.4)]">
            <Brain className="w-7 h-7 text-white" />
          </div>
        </div>
        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-[hsl(221,91%,60%)]"
            style={{
              top: '50%',
              left: '50%',
              transformOrigin: '0 0',
              animation: `orbit ${2 + i * 0.5}s linear infinite`,
              animationDelay: `${i * 0.4}s`,
              transform: `rotate(${i * 120}deg) translateX(44px) translateY(-4px)`,
            }}
          />
        ))}
      </div>

      <h2
        className="text-[24px] font-bold text-[hsl(222,22%,15%)] mb-2"
        style={{ letterSpacing: '-0.02em' }}
      >
        {done ? 'Your plan is ready ✨' : 'Screna is building your plan…'}
      </h2>
      <p className="text-[14px] text-[hsl(222,12%,50%)] mb-8 max-w-[360px]">
        {done
          ? 'We\'ve personalized everything based on your profile.'
          : 'Hang tight — this only takes a moment.'}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-[360px] mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[12px] font-medium text-[hsl(222,12%,55%)]">Personalizing…</span>
          <span className="text-[12px] font-semibold text-[hsl(221,91%,60%)]">{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-[hsl(220,18%,94%)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[hsl(221,91%,60%)] rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="w-full max-w-[360px] flex flex-col gap-2">
        {AI_STEPS_TEXT.map((text, i) => {
          const isActive = i === activeIdx && !done;
          const isDone2 = done || i < activeIdx;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: i <= activeIdx || done ? 1 : 0.3, x: 0 }}
              transition={{ delay: i * 0.12 }}
              className="flex items-center gap-3 text-left"
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isDone2
                    ? 'bg-[hsl(142,70%,45%)] text-white'
                    : isActive
                    ? 'bg-[hsl(221,91%,60%)] text-white'
                    : 'bg-[hsl(220,18%,94%)] text-transparent'
                }`}
              >
                {isDone2 ? (
                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <span
                className={`text-[13px] transition-colors duration-300 ${
                  isDone2
                    ? 'text-[hsl(222,22%,30%)] font-medium'
                    : isActive
                    ? 'text-[hsl(221,91%,60%)] font-semibold'
                    : 'text-[hsl(222,12%,65%)]'
                }`}
              >
                {text}
              </span>
            </motion.div>
          );
        })}
      </div>

      <style>{`
        @keyframes orbit {
          from { transform: rotate(var(--start-deg, 0deg)) translateX(44px) translateY(-4px); }
          to { transform: rotate(calc(var(--start-deg, 0deg) + 360deg)) translateX(44px) translateY(-4px); }
        }
      `}</style>
    </motion.div>
  );
}

function StepCommandCenter({ profile }: { profile: UserProfile }) {
  const roleLabel = TARGET_ROLES.find((r) => r.id === profile.targetRole)?.label || 'Software Engineer';
  const stageLabel = CAREER_STAGES.find((s) => s.id === profile.careerStage)?.label || 'Early Career';
  const timelineLabel = TIMELINES.find((t) => t.id === profile.timeline)?.label || '1–3 months';

  const actions = [
    {
      primary: true,
      icon: Mic,
      title: 'Start AI Mock Interview',
      subtitle: `${roleLabel} · Behavioral + Technical`,
      badge: 'Recommended',
      href: '/ai-mock',
    },
    {
      primary: false,
      icon: BookOpen,
      title: 'Explore Question Bank',
      subtitle: `${profile.biggestChallenge?.length ? profile.biggestChallenge.map(c => CHALLENGES.find(ch => ch.id === c)?.label).join(', ') : 'All categories'}`,
      badge: null,
      href: '/question-bank',
    },
    {
      primary: false,
      icon: Rocket,
      title: 'View Training Plan',
      subtitle: `Optimized for ${timelineLabel} timeline`,
      badge: null,
      href: '/jobs-training-plan',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-center w-full"
    >
      {/* Header */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(142,70%,45%)]/10 border border-[hsl(142,70%,45%)]/20 mb-4">
          <Check className="w-3.5 h-3.5 text-[hsl(142,70%,40%)]" strokeWidth={2.5} />
          <span className="text-[12px] font-semibold text-[hsl(142,70%,38%)]">Profile ready</span>
        </div>

        <h2
          className="text-[26px] font-bold text-[hsl(222,22%,15%)] mb-2"
          style={{ letterSpacing: '-0.02em' }}
        >
          Your command center is ready
        </h2>
        <p className="text-[14px] text-[hsl(222,12%,50%)] max-w-[400px] mx-auto">
          Screna has personalized your experience based on your profile. Here's where to start.
        </p>
      </div>

      {/* Profile summary chips */}
      <div className="flex flex-wrap gap-2 justify-center mb-7">
        {[
          { label: roleLabel, color: 'blue' },
          { label: stageLabel, color: 'gray' },
          { label: timelineLabel, color: 'gray' },
        ].map(({ label, color }) => (
          <span
            key={label}
            className={`px-3 py-1 rounded-full text-[12px] font-medium ${
              color === 'blue'
                ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,55%)] border border-[hsl(221,91%,60%)]/20'
                : 'bg-[hsl(220,18%,96%)] text-[hsl(222,12%,45%)] border border-[hsl(220,16%,90%)]'
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Action cards */}
      <div className="flex flex-col gap-3 w-full mb-6">
        {actions.map(({ primary, icon: Icon, title, subtitle, badge, href }, i) => (
          <motion.a
            key={title}
            href={href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className={`group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
              primary
                ? 'bg-[hsl(221,91%,60%)] border-[hsl(221,91%,60%)] text-white shadow-[0_4px_20px_rgba(67,118,248,0.3)] hover:bg-[hsl(221,91%,55%)] hover:shadow-[0_6px_24px_rgba(67,118,248,0.4)] hover:-translate-y-[1px]'
                : 'bg-white border-[hsl(220,16%,90%)] hover:border-[hsl(221,91%,60%)]/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:-translate-y-[1px]'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                primary ? 'bg-white/20' : 'bg-[hsl(220,18%,96%)]'
              }`}
            >
              <Icon
                className={`w-5 h-5 ${primary ? 'text-white' : 'text-[hsl(221,91%,60%)]'}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`text-[14px] font-semibold ${
                    primary ? 'text-white' : 'text-[hsl(222,22%,15%)]'
                  }`}
                >
                  {title}
                </span>
                {badge && (
                  <span className="px-2 py-0.5 rounded-full bg-white/25 text-[10px] font-semibold text-white">
                    {badge}
                  </span>
                )}
              </div>
              <p
                className={`text-[12px] truncate ${
                  primary ? 'text-white/75' : 'text-[hsl(222,12%,55%)]'
                }`}
              >
                {subtitle}
              </p>
            </div>
            <ChevronRight
              className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                primary ? 'text-white/70' : 'text-[hsl(222,12%,65%)]'
              }`}
            />
          </motion.a>
        ))}
      </div>

      {/* Readiness insight */}
      <div className="w-full p-4 rounded-xl bg-[hsl(220,18%,98%)] border border-[hsl(220,16%,92%)] flex items-start gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[hsl(221,91%,60%)]/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-[hsl(221,91%,60%)]" />
        </div>
        <div>
          <p className="text-[12.5px] font-semibold text-[hsl(222,22%,15%)] mb-0.5">
            Screna's take on your readiness
          </p>
          <p className="text-[12px] text-[hsl(222,12%,50%)] leading-relaxed">
            Based on your profile, we recommend starting with behavioral mock interviews to build confidence, then progressively tackling {roleLabel.toLowerCase()}-specific system design. Your{' '}
            <span className="font-medium text-[hsl(222,22%,25%)]">{timelineLabel}</span> timeline is achievable with consistent practice.
          </p>
        </div>
      </div>

      {/* Trust badge */}
      <div className="flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-[hsl(222,12%,60%)]" />
        <span className="text-[11.5px] text-[hsl(222,12%,60%)]">
          Your data is private and never shared without consent.
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OnboardingProcessPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>({
    careerStage: '',
    primaryGoal: '',
    targetRole: '',
    companyType: [],
    timeline: '',
    biggestChallenge: [],
  });

  const updateProfile = (partial: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...partial }));
  };

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 5));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top nav */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-[hsl(220,16%,94%)]">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[hsl(221,91%,60%)] flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span
            className="text-[15px] font-bold text-[hsl(222,22%,15%)]"
            style={{ fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}
          >
            Screna
          </span>
        </a>

        <div className="flex items-center gap-2 text-[12.5px] text-[hsl(222,12%,55%)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[hsl(142,70%,45%)]" />
          Setting up your profile
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-4 py-10">
        {/* Progress */}
        <div className="w-full max-w-[580px] mb-10">
          <ProgressBar currentStep={currentStep} />
        </div>

        {/* Card */}
        <div
          className={`w-full bg-white rounded-2xl border border-[hsl(220,16%,92%)] shadow-[0_2px_24px_rgba(0,0,0,0.06)] p-8 overflow-hidden ${
            currentStep === 3 ? 'max-w-[600px]' : 'max-w-[540px]'
          }`}
        >
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <StepWelcome key="step1" onNext={goNext} />
            )}
            {currentStep === 2 && (
              <StepJourney
                key="step2"
                profile={profile}
                setProfile={updateProfile}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {currentStep === 3 && (
              <StepTargetRole
                key="step3"
                profile={profile}
                setProfile={updateProfile}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {currentStep === 4 && (
              <StepAISynthesis key="step4" onDone={goNext} />
            )}
            {currentStep === 5 && (
              <StepCommandCenter key="step5" profile={profile} />
            )}
          </AnimatePresence>
        </div>

        {/* Skip link — only on triage steps */}
        {(currentStep === 2 || currentStep === 3) && (
          <button
            onClick={() => setCurrentStep(4)}
            className="mt-4 text-[12px] text-[hsl(222,12%,60%)] hover:text-[hsl(222,22%,30%)] transition-colors underline underline-offset-2"
          >
            Skip for now
          </button>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 px-8 border-t border-[hsl(220,16%,94%)] flex items-center justify-center">
        <p className="text-[11.5px] text-[hsl(222,12%,65%)]">
          © 2026 Screna · Privacy Policy · Terms
        </p>
      </footer>
    </div>
  );
}