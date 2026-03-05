import { useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Target,
  MessageSquareText,
  Sparkles,
  BookOpen,
  Clock,
  Award,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from './ui/button';

// ─── Types ─────────────────────────────────────────────
export interface EvalConfig {
  type: string;
  difficulty: string;
  duration: string;
  mode: string;
  company: string;
}

interface SkillDimension {
  skill: string;
  score: number;
  fullMark: number;
  label: string;
  tip: string;
}

interface HighlightItem {
  text: string;
  context: string;
}

interface AnswerComparison {
  question: string;
  original: string;
  improved: string;
  annotations: string[];
}

// ─── Mock evaluation data ──────────────────────────────
const SKILL_DATA: SkillDimension[] = [
  { skill: 'Communication', score: 78, fullMark: 100, label: 'Communication', tip: 'Your clarity improved mid-session. Try opening with a concise 1-sentence summary before diving into details.' },
  { skill: 'Structure', score: 65, fullMark: 100, label: 'Structure', tip: 'Use STAR or a similar framework consistently. Your second answer had better structure than your first.' },
  { skill: 'Specificity', score: 82, fullMark: 100, label: 'Specificity', tip: 'Strong concrete examples. Push further by quantifying outcomes when possible.' },
  { skill: 'Relevance', score: 70, fullMark: 100, label: 'Relevance', tip: 'Some tangents in your first answer. Pause to re-anchor yourself to the question\'s core ask.' },
  { skill: 'Impact', score: 58, fullMark: 100, label: 'Impact', tip: 'Clearly articulate the business or team outcome of your actions — this is where most candidates leave points on the table.' },
  { skill: 'Composure', score: 85, fullMark: 100, label: 'Composure', tip: 'Excellent poise throughout. Your pauses felt natural and confident, not uncertain.' },
];

const HIGHLIGHTS: HighlightItem[] = [
  { text: 'Used specific metrics (40% drop-off rate) to ground your argument', context: 'Q1 — Influence without authority' },
  { text: 'Demonstrated empathy by acknowledging engineering capacity constraints before proposing solutions', context: 'Q1 — Influence without authority' },
  { text: 'Natural speaking pace with confident pauses', context: 'Across session' },
  { text: 'Structured your second answer more tightly using a situation → action → result flow', context: 'Q2 — Delivering difficult feedback' },
];

const PITFALLS: HighlightItem[] = [
  { text: 'First answer took 90 seconds before reaching the core action — tighten the setup', context: 'Q1 — Influence without authority' },
  { text: 'Missed the opportunity to state the measurable outcome of the onboarding revamp', context: 'Q1 — Influence without authority' },
  { text: 'Second answer lacked a clear resolution — what changed after the feedback?', context: 'Q2 — Delivering difficult feedback' },
];

const ANSWER_COMPARISON: AnswerComparison = {
  question: 'Tell me about a time you had to influence a decision without having direct authority.',
  original:
    "At my previous company, I was a product manager leading a cross-functional initiative to revamp our onboarding flow. The engineering director was hesitant because his team was already at capacity. I pulled together a dashboard showing the 40% drop-off rate during onboarding and mapped it to projected revenue impact. Then I proposed a phased rollout that wouldn't disrupt the current sprint...",
  improved:
    "As a PM at [Company], I identified a 40% onboarding drop-off costing an estimated $2.1M annually in lost conversions. The engineering director pushed back — his team was at sprint capacity. I reframed the project: instead of asking for dedicated resources, I proposed a phased rollout that embedded onboarding fixes into their existing sprint work. I presented a shared dashboard tying our drop-off metrics to his team's performance goals, making it a shared win. Within one quarter, we reduced drop-off by 18% and the engineering director later cited the project as a model for cross-team collaboration.",
  annotations: [
    'Opens with a quantified problem statement — immediate clarity on stakes',
    'Names the friction point directly instead of narrating chronologically',
    'Reframes from "my project" to "shared win" — shows influence thinking',
    'Ends with a measurable result AND a character endorsement',
  ],
};

const RETRY_QUESTION = {
  question: 'Tell me about a time you had to influence a decision without having direct authority.',
  reason: 'Your setup was strong, but the outcome was left hanging. Retrying with a tighter structure will make this your best answer.',
};

const NEXT_STEPS = [
  {
    icon: Target,
    title: 'Practice impact framing',
    description: 'Your weakest dimension. Try the "So what?" test: after every statement, ask yourself what business outcome it drove.',
    actionLabel: 'Start drill',
  },
  {
    icon: BookOpen,
    title: 'Review STAR deep-dive',
    description: 'A 5-minute refresher on structuring behavioral answers with tighter Situation setups.',
    actionLabel: 'Read guide',
  },
  {
    icon: RotateCcw,
    title: 'Retry this session',
    description: 'Same questions, fresh start. See if your scores improve with what you\'ve learned.',
    actionLabel: 'Retry session',
  },
];

// ─── Helpers ───────────────────────────────────────────
function getOverallScore(skills: SkillDimension[]): number {
  return Math.round(skills.reduce((s, d) => s + d.score, 0) / skills.length);
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 65) return 'Developing';
  if (score >= 50) return 'Needs Work';
  return 'Foundational';
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 65) return 'text-amber-600';
  return 'text-orange-600';
}

function getScoreBg(score: number): string {
  if (score >= 85) return 'bg-emerald-50 border-emerald-100';
  if (score >= 75) return 'bg-blue-50 border-blue-100';
  if (score >= 65) return 'bg-amber-50 border-amber-100';
  return 'bg-orange-50 border-orange-100';
}

// ════════════════════════════════════════════════════════
// MAIN EVALUATION REPORT COMPONENT
// ════════════════════════════════════════════════════════
export function EvaluationReport({
  config,
  onRetry,
  onNewSession,
}: {
  config: EvalConfig;
  onRetry: () => void;
  onNewSession: () => void;
}) {
  const overall = getOverallScore(SKILL_DATA);
  const weakest = [...SKILL_DATA].sort((a, b) => a.score - b.score)[0];
  const strongest = [...SKILL_DATA].sort((a, b) => b.score - a.score)[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
      {/* Compact header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-100/80">
        <div className="max-w-3xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link
            to="/dashboard/mock-interview"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to sessions</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-8 text-xs gap-1.5 border-slate-200"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </Button>
            <Button
              size="sm"
              onClick={onNewSession}
              className="h-8 text-xs gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-sm shadow-blue-500/15"
            >
              New Session
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* ─── Hero summary ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-start gap-5 sm:gap-6">
            {/* Score circle */}
            <div className={`shrink-0 w-20 h-20 rounded-2xl border ${getScoreBg(overall)} flex flex-col items-center justify-center`}>
              <span className={`text-2xl tabular-nums ${getScoreColor(overall)}`}>{overall}</span>
              <span className={`text-[10px] ${getScoreColor(overall)} opacity-70`}>{getScoreLabel(overall)}</span>
            </div>
            {/* Summary text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <h1 className="text-lg text-slate-900">Session Feedback</h1>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-500 capitalize">
                  {config.type?.replace('-', ' ') || 'Behavioral'}
                </span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                You showed strong composure and used concrete examples with real metrics —
                that's rare and valuable. Your biggest opportunity is <span className="text-slate-700">articulating measurable outcomes</span>.
                A few structural adjustments will move you from "good story" to "unbeatable answer."
              </p>
              {/* Session meta */}
              <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {config.duration || '20'} min
                </span>
                <span className="w-0.5 h-0.5 rounded-full bg-slate-200" />
                <span className="capitalize">{config.difficulty || 'medium'}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-slate-200" />
                <span>2 questions covered</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ─── Skill breakdown chart ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Skill Breakdown
            </h2>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
                Strongest: {strongest.skill}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400/60" />
                Focus area: {weakest.skill}
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-5">
            {/* Radar chart */}
            <div className="w-full lg:w-1/2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={SKILL_DATA}>
                  <PolarGrid
                    gridType="polygon"
                    stroke="rgba(148,163,184,0.12)"
                  />
                  <PolarAngleAxis
                    dataKey="label"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="rgba(59,130,246,0.7)"
                    fill="rgba(59,130,246,0.12)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Skill list with tips */}
            <div className="w-full lg:w-1/2 space-y-2.5">
              {SKILL_DATA.map((dim) => (
                <SkillRow key={dim.skill} dim={dim} />
              ))}
            </div>
          </div>
        </motion.section>

        {/* ─── Highlights & Pitfalls ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid md:grid-cols-2 gap-4"
        >
          {/* Highlights */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
            <h2 className="text-sm text-slate-900 flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              What Went Well
            </h2>
            <div className="space-y-3">
              {HIGHLIGHTS.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex gap-2.5"
                >
                  <div className="w-1 shrink-0 rounded-full bg-emerald-400/40 mt-1" style={{ height: 'auto' }} />
                  <div>
                    <p className="text-[13px] text-slate-700 leading-relaxed">{item.text}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.context}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Pitfalls */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
            <h2 className="text-sm text-slate-900 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Areas to Strengthen
            </h2>
            <div className="space-y-3">
              {PITFALLS.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.08 }}
                  className="flex gap-2.5"
                >
                  <div className="w-1 shrink-0 rounded-full bg-amber-400/40 mt-1" style={{ height: 'auto' }} />
                  <div>
                    <p className="text-[13px] text-slate-700 leading-relaxed">{item.text}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.context}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ─── Stronger Answer Example ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5"
        >
          <h2 className="text-sm text-slate-900 flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Stronger Answer Example
          </h2>
          <p className="text-[11px] text-slate-400 mb-5">
            Your answer rewritten to maximize impact — study the differences, don't memorize it.
          </p>

          <div className="mb-4 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
              <MessageSquareText className="w-3 h-3" />
              Question
            </p>
            <p className="text-[13px] text-slate-700">{ANSWER_COMPARISON.question}</p>
          </div>

          <AnswerComparisonBlock comparison={ANSWER_COMPARISON} />
        </motion.section>

        {/* ─── Targeted Retry ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-gradient-to-r from-blue-50/80 to-indigo-50/40 rounded-2xl border border-blue-100/60 p-5"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm text-slate-900 mb-1">Targeted Retry</h2>
              <p className="text-[13px] text-slate-500 leading-relaxed mb-1.5">
                <span className="text-slate-700">"{RETRY_QUESTION.question}"</span>
              </p>
              <p className="text-xs text-slate-400 mb-4">
                {RETRY_QUESTION.reason}
              </p>
              <Button
                onClick={onRetry}
                className="h-9 text-xs gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-sm shadow-blue-500/15"
              >
                <RotateCcw className="w-3 h-3" />
                Retry This Question
              </Button>
            </div>
          </div>
        </motion.section>

        {/* ─── Next Steps ─── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h2 className="text-sm text-slate-900 flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Recommended Next Steps
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {NEXT_STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 + i * 0.08 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 flex flex-col"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
                  <step.icon className="w-4 h-4 text-slate-500" />
                </div>
                <h3 className="text-[13px] text-slate-800 mb-1">{step.title}</h3>
                <p className="text-[12px] text-slate-400 leading-relaxed flex-1 mb-3">
                  {step.description}
                </p>
                <button className="text-[12px] text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1 self-start">
                  {step.actionLabel}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ─── Footer ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center py-8 space-y-3"
        >
          <p className="text-xs text-slate-400">
            This feedback is AI-generated based on your session performance.
            Use it as coaching input, not a final verdict.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="h-8 text-xs gap-1.5 border-slate-200"
            >
              <RotateCcw className="w-3 h-3" />
              Retry Session
            </Button>
            <Button
              size="sm"
              onClick={onNewSession}
              className="h-8 text-xs gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-sm shadow-blue-500/15"
            >
              New Session
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// SKILL ROW — individual dimension with expandable tip
// ════════════════════════════════════════════════════════
function SkillRow({ dim }: { dim: SkillDimension }) {
  const [expanded, setExpanded] = useState(false);

  const barColor =
    dim.score >= 80
      ? 'bg-emerald-400'
      : dim.score >= 65
        ? 'bg-blue-400'
        : dim.score >= 50
          ? 'bg-amber-400'
          : 'bg-orange-400';

  const barBg =
    dim.score >= 80
      ? 'bg-emerald-100/60'
      : dim.score >= 65
        ? 'bg-blue-100/60'
        : dim.score >= 50
          ? 'bg-amber-100/60'
          : 'bg-orange-100/60';

  return (
    <div className="group">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 py-1.5 hover:bg-slate-50/50 rounded-lg px-2 -mx-2 transition-colors"
      >
        <span className="text-[12px] text-slate-600 w-24 text-left shrink-0">{dim.skill}</span>
        <div className={`flex-1 h-1.5 ${barBg} rounded-full overflow-hidden`}>
          <motion.div
            className={`h-full ${barColor} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${dim.score}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <span className="text-[12px] text-slate-500 tabular-nums w-8 text-right">{dim.score}</span>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-slate-300" />
        ) : (
          <ChevronDown className="w-3 h-3 text-slate-300" />
        )}
      </button>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="pl-[6.5rem] pr-2 pb-2">
            <div className="flex items-start gap-2 text-[12px] text-slate-500 leading-relaxed bg-slate-50/80 rounded-lg p-2.5 border border-slate-100/60">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              {dim.tip}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// ANSWER COMPARISON BLOCK
// ════════════════════════════════════════════════════════
function AnswerComparisonBlock({ comparison }: { comparison: AnswerComparison }) {
  const [copied, setCopied] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(comparison.improved);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Side by side on larger screens */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* Original */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-5 h-5 rounded-full bg-slate-200/60 flex items-center justify-center">
              <span className="text-[9px] text-slate-500">You</span>
            </div>
            <span className="text-[11px] text-slate-400">Your response</span>
          </div>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            {comparison.original}
          </p>
        </div>

        {/* Improved */}
        <div className="rounded-xl border border-blue-100/60 bg-blue-50/30 p-4 relative">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-blue-500" />
              </div>
              <span className="text-[11px] text-blue-500/70">Stronger version</span>
            </div>
            <button
              onClick={handleCopy}
              className="text-[11px] text-blue-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="text-[13px] text-slate-700 leading-relaxed">
            {comparison.improved}
          </p>
        </div>
      </div>

      {/* Annotations */}
      <div>
        <button
          onClick={() => setShowAnnotations((s) => !s)}
          className="flex items-center gap-2 text-[12px] text-slate-400 hover:text-slate-600 transition-colors mb-2"
        >
          <Award className="w-3.5 h-3.5" />
          What makes it stronger
          {showAnnotations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {showAnnotations && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <div className="grid sm:grid-cols-2 gap-2">
              {comparison.annotations.map((note, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50/40 border border-blue-100/40"
                >
                  <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] text-blue-500 tabular-nums">{i + 1}</span>
                  </span>
                  <span className="text-[12px] text-slate-600 leading-relaxed">{note}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
