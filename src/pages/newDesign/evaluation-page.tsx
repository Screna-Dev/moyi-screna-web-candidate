import {
  X, Maximize2, Minimize2, RotateCcw, Bookmark,
  ChevronRight, Target, TrendingUp, Brain,
  MessageSquare, Users, Shield, Lightbulb, Crown,
  Scale, Quote, ArrowRight, Zap, BookOpen, Dumbbell,
  CheckCircle2, AlertTriangle, Clock, CalendarDays, Mic,
  Play, Plus, Library, Video, Lock,
  Pause, SkipForward, SkipBack, Volume2, Sparkles,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from 'recharts';
import { Button } from '@/components/newDesign/ui/button';
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from '@/components/newDesign/ui/tooltip';

// ════════════════════════════════════════════════════════
// DATA LAYER
// ════════════════════════════════════════════════════════

interface Dimension {
  id: string;
  name: string;
  icon: React.ElementType;
  score: number;
  status: 'Strong' | 'Developing' | 'Needs work' | 'Inconsistent';
  reasoning: string;
  evidence: EvidenceItem[];
  nextSteps: string[];
}

interface EvidenceItem {
  quote: string;
  source: string;
  timestamp?: string;
  whyItMatters: string;
}

interface QuestionItem {
  id: string;
  prompt: string;
  dimensions: string[];
  dimScores: { dim: string; score: number; note: string }[];
  evidence: EvidenceItem[];
  improvements: string[];
}

interface TrendPoint {
  session: string;
  problemSolving: number;
  communication: number;
  ownership: number;
  leadership: number;
}

// ─── Session meta ─────────────────────────────────────
const SESSION_META = {
  type: 'Behavioral',
  role: 'Software Engineer',
  duration: '22 min',
  completedAt: 'Feb 23, 2026 · 3:47 PM',
  questionsCount: 3,
};

// ─── 7 Dimensions ─────────────────────────────────────
const DIMENSIONS: Dimension[] = [
  {
    id: 'problem-solving',
    name: 'Problem Solving',
    icon: Brain,
    score: 74,
    status: 'Developing',
    reasoning: 'You identified the core problem in Q1 and Q3, but your approach was mostly linear — you jumped to solutions before fully mapping the constraints. In Q2, you recognized the trade-off between speed and quality, which was strong, but you did not articulate why you chose one path over another.',
    evidence: [
      {
        quote: '"We noticed the onboarding drop-off was at 40%, so I built a dashboard to track it and proposed a phased rollout."',
        source: 'Question 1',
        timestamp: '02:14',
        whyItMatters: 'Shows you can quantify problems, but jumped to the solution without discussing alternative approaches or constraints you considered.',
      },
      {
        quote: '"I chose to optimize for speed because the team was under pressure from a Q3 deadline."',
        source: 'Question 2',
        timestamp: '09:32',
        whyItMatters: 'Good trade-off awareness, but missing: what did you sacrifice? What risk did that create?',
      },
    ],
    nextSteps: [
      'Before stating your solution, spend 15–20 seconds mapping constraints: timeline, resources, and trade-offs.',
      'Practice the "Two Paths" technique: briefly name an alternative approach you considered and explain why you rejected it.',
      'Quantify the impact of your decision — don\'t just say what you did, say what changed because of it.',
    ],
  },
  {
    id: 'communication',
    name: 'Communication Clarity',
    icon: MessageSquare,
    score: 81,
    status: 'Strong',
    reasoning: 'Your answers were generally clear and well-paced. You used concrete language and avoided excessive jargon. However, your first answer took ~90 seconds to reach the core action, which risks losing the interviewer\'s attention. Your second and third answers had much tighter openings.',
    evidence: [
      {
        quote: '"The engineering director was hesitant because his team was already at capacity — so I reframed the project as a shared win."',
        source: 'Question 1',
        timestamp: '03:40',
        whyItMatters: 'Clean cause-and-effect phrasing. The interviewer can follow your logic without effort.',
      },
      {
        quote: '"Let me start with some context about the team structure…" [90 seconds of background before the main action]',
        source: 'Question 1',
        timestamp: '00:12',
        whyItMatters: 'Over-indexing on context signals lack of structure. Lead with the punchline, then fill in context as needed.',
      },
    ],
    nextSteps: [
      'Open every answer with a 1-sentence preview: "This is a story about [X outcome] that I achieved by [Y approach]."',
      'Cap your Situation/Task setup at 30 seconds — practice with a timer.',
    ],
  },
  {
    id: 'collaboration',
    name: 'Collaboration & Stakeholder Mgmt',
    icon: Users,
    score: 77,
    status: 'Strong',
    reasoning: 'You consistently referenced cross-functional partners and showed awareness of competing priorities. In Q1, you named the engineering director and described how you aligned incentives. In Q3, you mentioned aligning with design and data science. You could strengthen this by describing how you handled disagreement or pushback more explicitly.',
    evidence: [
      {
        quote: '"I presented a shared dashboard tying our drop-off metrics to his team\'s performance goals, making it a shared win."',
        source: 'Question 1',
        timestamp: '04:18',
        whyItMatters: 'Demonstrates strategic stakeholder alignment — you turned opposition into partnership.',
      },
    ],
    nextSteps: [
      'When describing collaboration, name the specific friction point first, then your alignment strategy.',
      'Include at least one moment of disagreement and how you navigated it — interviewers look for conflict resolution skills.',
      'Mention the outcome from the stakeholder\'s perspective, not just yours.',
    ],
  },
  {
    id: 'ownership',
    name: 'Ownership & Accountability',
    icon: Shield,
    score: 62,
    status: 'Needs work',
    reasoning: 'You described what happened, but often used passive language or attributed outcomes to the team generically. In Q2, you said "the team decided" without clarifying your specific role in that decision. Interviewers need to see what you personally drove.',
    evidence: [
      {
        quote: '"The team decided to prioritize the quick fix over the long-term refactor."',
        source: 'Question 2',
        timestamp: '10:05',
        whyItMatters: 'Who made this call? If it was you, own it. If it was a group decision, explain your specific input and advocacy.',
      },
      {
        quote: '"We shipped it and the metrics improved."',
        source: 'Question 3',
        timestamp: '17:22',
        whyItMatters: 'Vague team attribution. What was YOUR contribution to shipping? What did the metrics look like?',
      },
    ],
    nextSteps: [
      'Replace "we decided" with "I recommended X because…" in at least 2 key moments per answer.',
      'When describing team outcomes, carve out your specific contribution with "My role was…" or "I personally drove…"',
      'Own failures too — saying "I underestimated X" is more powerful than "things didn\'t go as planned."',
    ],
  },
  {
    id: 'self-awareness',
    name: 'Self-awareness & Reflection',
    icon: Lightbulb,
    score: 70,
    status: 'Developing',
    reasoning: 'You showed moments of reflection in Q3 when you mentioned what you\'d do differently. However, your reflections were surface-level — "I would have communicated earlier" is common; what would have been more powerful is explaining what you learned about yourself from the experience.',
    evidence: [
      {
        quote: '"Looking back, I would have communicated the timeline risk earlier to the stakeholders."',
        source: 'Question 3',
        timestamp: '18:44',
        whyItMatters: 'Good start, but generic. Push deeper: why didn\'t you communicate earlier? What belief or habit held you back?',
      },
    ],
    nextSteps: [
      'For every "I would have done X differently," follow up with "because I learned that I tend to Y."',
      'Prepare one answer that centers on a genuine failure and what it taught you about your working style.',
      'Practice the distinction between hindsight ("I should have…") and genuine insight ("I learned that I…").',
    ],
  },
  {
    id: 'decision-making',
    name: 'Decision Making & Prioritization',
    icon: Scale,
    score: 68,
    status: 'Inconsistent',
    reasoning: 'Your Q1 answer showed clear prioritization logic — you mapped impact vs. effort. But in Q2 and Q3, your decision-making rationale was implicit rather than stated. Interviewers at top companies want to hear how you think, not just what you decided.',
    evidence: [
      {
        quote: '"I mapped each initiative on a 2×2 of impact vs. engineering effort, which made the priority clear."',
        source: 'Question 1',
        timestamp: '05:20',
        whyItMatters: 'Excellent — this is exactly the kind of structured thinking interviewers look for.',
      },
      {
        quote: '"I just felt like the first option was better, so we went with that."',
        source: 'Question 2',
        timestamp: '11:48',
        whyItMatters: '"I felt" is a red flag in decision-making answers. Replace with data, frameworks, or explicit trade-off analysis.',
      },
    ],
    nextSteps: [
      'Name 2–3 explicit trade-offs before explaining your final decision in every answer.',
      'Use micro-frameworks: "I evaluated on three axes: speed, quality, and team morale."',
      'Avoid "gut feel" language — even if intuition played a role, frame it as pattern recognition from experience.',
    ],
  },
  {
    id: 'leadership',
    name: 'Leadership',
    icon: Crown,
    score: 59,
    status: 'Needs work',
    reasoning: 'Leadership signals were present but underdeveloped. You described situations where you coordinated work, but didn\'t clearly demonstrate how you inspired, mentored, or elevated others. For senior roles, interviewers look for evidence that you multiplied the team\'s output, not just managed tasks.',
    evidence: [
      {
        quote: '"I assigned tasks to the team members and we met the deadline."',
        source: 'Question 3',
        timestamp: '16:30',
        whyItMatters: 'Task assignment is coordination, not leadership. What did you do to help team members grow or perform at their best?',
      },
    ],
    nextSteps: [
      'Include at least one moment where you helped a teammate succeed — mentoring, unblocking, or advocating for them.',
      'Describe how you set direction or vision, not just how you executed tasks.',
      'For "Tell me about leadership" questions, use the formula: Context → Your initiative → How others benefited → Lasting impact.',
    ],
  },
];

// ─── Questions ────────────────────────────────────────
const QUESTIONS: QuestionItem[] = [
  {
    id: 'q1',
    prompt: 'Tell me about a time you had to influence a decision without having direct authority.',
    dimensions: ['Problem Solving', 'Communication Clarity', 'Collaboration & Stakeholder Mgmt'],
    dimScores: [
      { dim: 'Problem Solving', score: 78, note: 'Identified the problem clearly; solution-first approach.' },
      { dim: 'Communication Clarity', score: 75, note: 'Strong mid-answer, but slow start with too much context.' },
      { dim: 'Collaboration & Stakeholder Mgmt', score: 82, note: 'Excellent stakeholder alignment strategy.' },
    ],
    evidence: [
      {
        quote: '"I pulled together a dashboard showing the 40% drop-off rate during onboarding and mapped it to projected revenue impact."',
        source: 'Q1 · 02:14',
        whyItMatters: 'Data-driven persuasion is powerful. Connecting the metric to revenue made it impossible to ignore.',
      },
    ],
    improvements: [
      'Tighten the opening — lead with the outcome, then explain how you got there.',
      'Explicitly name the alternative approaches you considered before the dashboard strategy.',
    ],
  },
  {
    id: 'q2',
    prompt: 'Describe a situation where you had to make a difficult trade-off under time pressure.',
    dimensions: ['Decision Making & Prioritization', 'Ownership & Accountability', 'Self-awareness & Reflection'],
    dimScores: [
      { dim: 'Decision Making & Prioritization', score: 60, note: 'Trade-off was mentioned but not structured.' },
      { dim: 'Ownership & Accountability', score: 55, note: 'Used passive language; unclear who made the final call.' },
      { dim: 'Self-awareness & Reflection', score: 65, note: 'Some reflection, but surface-level.' },
    ],
    evidence: [
      {
        quote: '"The team decided to prioritize the quick fix over the long-term refactor."',
        source: 'Q2 · 10:05',
        whyItMatters: 'Passive attribution. If you advocated for this decision, say so explicitly.',
      },
    ],
    improvements: [
      'Restructure around: "I faced trade-off X. I chose Y because [explicit criteria]. The result was Z."',
      'Own the decision — replace "the team decided" with "I recommended… because…"',
    ],
  },
  {
    id: 'q3',
    prompt: 'Tell me about a project that didn\'t go as planned. What did you learn?',
    dimensions: ['Self-awareness & Reflection', 'Leadership', 'Ownership & Accountability'],
    dimScores: [
      { dim: 'Self-awareness & Reflection', score: 72, note: 'Mentioned what you\'d change; could go deeper.' },
      { dim: 'Leadership', score: 55, note: 'Described task coordination, not leadership.' },
      { dim: 'Ownership & Accountability', score: 60, note: 'Vague team outcomes; your specific role was unclear.' },
    ],
    evidence: [
      {
        quote: '"Looking back, I would have communicated the timeline risk earlier to the stakeholders."',
        source: 'Q3 · 18:44',
        whyItMatters: 'Good hindsight — but push further into genuine self-insight.',
      },
    ],
    improvements: [
      'Go beyond "I should have" — explain what you learned about your own tendencies.',
      'Show leadership by describing how you helped the team recover, not just how tasks were assigned.',
    ],
  },
];

// ─── Progress trend (mock) ────────────────────────────
const TREND_DATA: TrendPoint[] = [
  { session: 'Jan 28', problemSolving: 62, communication: 70, ownership: 50, leadership: 45 },
  { session: 'Feb 5', problemSolving: 68, communication: 73, ownership: 55, leadership: 50 },
  { session: 'Feb 14', problemSolving: 71, communication: 78, ownership: 58, leadership: 52 },
  { session: 'Feb 23', problemSolving: 74, communication: 81, ownership: 62, leadership: 59 },
];

const TREND_LINES = [
  { key: 'problemSolving', label: 'Problem Solving', color: '#3b82f6' },
  { key: 'communication', label: 'Communication', color: '#10b981' },
  { key: 'ownership', label: 'Ownership', color: '#f59e0b' },
  { key: 'leadership', label: 'Leadership', color: '#8b5cf6' },
];

// ─── Video recording timeline ─────────────────────────
interface VideoMarker {
  id: string;
  label: string;
  startSec: number;
  endSec: number;
  question?: string;
  type: 'question' | 'transition' | 'intro' | 'closing';
}

const VIDEO_TOTAL_SEC = 22 * 60; // 22 minutes

const VIDEO_MARKERS: VideoMarker[] = [
  { id: 'intro', label: 'Opening', startSec: 0, endSec: 45, type: 'intro' },
  { id: 'q1', label: 'Q1', startSec: 45, endSec: 480, question: 'Influence without authority', type: 'question' },
  { id: 't1', label: '', startSec: 480, endSec: 510, type: 'transition' },
  { id: 'q2', label: 'Q2', startSec: 510, endSec: 900, question: 'Difficult trade-off', type: 'question' },
  { id: 't2', label: '', startSec: 900, endSec: 930, type: 'transition' },
  { id: 'q3', label: 'Q3', startSec: 930, endSec: 1260, question: 'Project failure & learning', type: 'question' },
  { id: 'closing', label: 'Closing', startSec: 1260, endSec: 1320, type: 'closing' },
];

// ─── Helpers ──────────────────────────────────────────
function statusColor(status: string) {
  switch (status) {
    case 'Strong': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Developing': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Needs work': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Inconsistent': return 'bg-orange-50 text-orange-700 border-orange-200';
    default: return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

function barFill(score: number) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-orange-500';
}

function barTrack(score: number) {
  if (score >= 80) return 'bg-emerald-100';
  if (score >= 70) return 'bg-blue-100';
  if (score >= 60) return 'bg-amber-100';
  return 'bg-orange-100';
}

function overallLevel(score: number) {
  if (score >= 80) return 'Strong';
  if (score >= 65) return 'Developing';
  return 'Needs more structure';
}

// ════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════════════
export function EvaluationPage() {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedDims, setExpandedDims] = useState<Set<string>>(new Set());
  const [expandedQs, setExpandedQs] = useState<Set<string>>(new Set());
  const [trendKeys, setTrendKeys] = useState<Set<string>>(new Set(['problemSolving', 'communication']));
  const [isPremium, setIsPremium] = useState(true); // Mock: toggle to see free vs premium
  const scrollRef = useRef<HTMLDivElement>(null);

  const overall = Math.round(DIMENSIONS.reduce((s, d) => s + d.score, 0) / DIMENSIONS.length);
  const strongest = [...DIMENSIONS].sort((a, b) => b.score - a.score)[0];
  const weakest = [...DIMENSIONS].sort((a, b) => a.score - b.score)[0];

  const toggleDim = (id: string) =>
    setExpandedDims((prev) => {
      if (prev.has(id)) {
        return new Set<string>();
      }
      return new Set<string>([id]);
    });

  const expandAllDims = () => setExpandedDims(new Set(DIMENSIONS.map((d) => d.id)));
  const collapseAllDims = () => setExpandedDims(new Set<string>());
  const allDimsExpanded = expandedDims.size === DIMENSIONS.length;

  const toggleQ = (id: string) =>
    setExpandedQs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleTrend = (key: string) =>
    setTrendKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const handleClose = () => navigate('/ai-mock');
  const handleRetry = () => navigate('/ai-mock');
  const handlePractice = () => navigate('/ai-mock');

  // Radar data
  const radarData = DIMENSIONS.map((d) => ({ subject: d.name.replace(' & Stakeholder Mgmt', '').replace(' & ', ' & '), score: d.score, fullMark: 100 }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={!isExpanded ? handleClose : undefined}
      />

      {/* Floating panel */}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`relative z-10 bg-white flex flex-col transition-all duration-300 ${
          isExpanded
            ? 'w-full h-full rounded-none'
            : 'w-[96vw] max-w-[1080px] h-[92vh] rounded-2xl shadow-2xl shadow-slate-900/20'
        }`}
      >
        {/* ─── STICKY HEADER ─── */}
        <div className="shrink-0 border-b border-slate-100 bg-white">
          <div className="max-w-[1120px] mx-auto px-6 py-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-[17px] text-slate-900 tracking-tight">Interview Evaluation</h1>
              </div>
              <p className="text-[13px] text-slate-400">
                Multi-dimensional feedback from your mock interview
              </p>
              {/* Session meta */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
                <MetaChip icon={<Mic className="w-3 h-3" />} label={SESSION_META.type} />
                <MetaChip icon={<Target className="w-3 h-3" />} label={SESSION_META.role} />
                <MetaChip icon={<Clock className="w-3 h-3" />} label={SESSION_META.duration} />
                <MetaChip icon={<CalendarDays className="w-3 h-3" />} label={SESSION_META.completedAt} />
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={handlePractice}
                className="h-8 text-xs gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-sm shadow-blue-500/15"
              >
                <Dumbbell className="w-3.5 h-3.5" />
                Practice Weak Areas
              </Button>
              <Button variant="outline" size="sm" onClick={handleRetry} className="h-8 text-xs gap-1.5 border-slate-200">
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 border-slate-200">
                    <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save report</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsExpanded((e) => !e)}
                    className="h-8 w-8 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    {isExpanded
                      ? <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                      : <Maximize2 className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{isExpanded ? 'Exit full page' : 'Expand to full page'}</TooltipContent>
              </Tooltip>
              <button
                onClick={handleClose}
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors ml-1"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── SCROLLABLE CONTENT ─── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain bg-slate-50/60">
          <div className="max-w-[1120px] mx-auto px-6 py-6 space-y-8">
            {/* ═══ SECTION 1: Overall Summary ═══ */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* Score badge */}
                <div className="shrink-0 w-[88px] h-[88px] rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[28px] tabular-nums text-slate-800">{overall}</span>
                  <span className="text-[11px] text-slate-400 -mt-0.5">{overallLevel(overall)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-slate-600 leading-relaxed">
                    You demonstrated strong communication skills with concrete examples and solid metrics — a real differentiator.
                    However, two patterns held you back: <span className="text-slate-800">passive ownership language</span> ("the team decided")
                    and <span className="text-slate-800">under-developed leadership signals</span>. Fixing these two areas would
                    move you from "strong candidate" to "standout hire" at most tech companies.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[12px] text-emerald-700">Top strength: {strongest.name}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[12px] text-amber-700">Biggest opportunity: {weakest.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* ═══ SESSION RECORDING (Premium) ═══ */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <SessionRecording isPremium={isPremium} onTogglePremium={() => setIsPremium(p => !p)} />
            </motion.section>

            {/* ═══ SECTION 2: Multi-dimensional Score Overview ═══ */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="overflow-hidden"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Score Overview
                  </h2>
                  <p className="text-[11.5px] text-slate-400 mt-0.5">
                    {DIMENSIONS.length} dimensions evaluated
                  </p>
                </div>
                <button
                  onClick={allDimsExpanded ? collapseAllDims : expandAllDims}
                  className="text-[11.5px] text-blue-500 hover:text-blue-600 transition-colors px-2.5 py-1 rounded-md hover:bg-blue-50"
                >
                  {allDimsExpanded ? 'Collapse all' : 'Expand all'}
                </button>
              </div>

              {/* 2-column body */}
              <div className="flex gap-4">
                {/* Left: Compact Radar Chart Card (secondary) */}
                <div className="hidden lg:flex w-[232px] shrink-0 flex-col rounded-xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="px-4 pt-3.5 pb-0">
                    <span className="text-[10.5px] text-slate-400 uppercase tracking-wider">Shape</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center px-1 pb-0">
                    <ResponsiveContainer width="100%" height={192} minWidth={0}>
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid gridType="polygon" stroke="rgba(148,163,184,0.06)" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: '#c0c7d3', fontSize: 8.5 }}
                          tickLine={false}
                        />
                        <Radar
                          dataKey="score"
                          stroke="rgba(59,130,246,0.35)"
                          fill="rgba(59,130,246,0.05)"
                          strokeWidth={1.5}
                          dot={{ r: 2, fill: 'rgba(59,130,246,0.5)', strokeWidth: 0 }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Mini stats footer */}
                  <div className="px-3 pb-3 pt-1 flex items-center justify-between border-t border-slate-50 mt-0">
                    <div className="text-center flex-1">
                      <div className="text-[16px] tabular-nums text-slate-700">{overall}</div>
                      <div className="text-[9.5px] text-slate-400">Avg</div>
                    </div>
                    <div className="w-px h-6 bg-slate-100" />
                    <div className="text-center flex-1">
                      <div className="text-[16px] tabular-nums text-emerald-600">{strongest.score}</div>
                      <div className="text-[9.5px] text-slate-400">Best</div>
                    </div>
                    <div className="w-px h-6 bg-slate-100" />
                    <div className="text-center flex-1">
                      <div className="text-[16px] tabular-nums text-amber-600">{weakest.score}</div>
                      <div className="text-[9.5px] text-slate-400">Low</div>
                    </div>
                  </div>
                </div>

                {/* Right: Dimension Score List Card (primary focus) */}
                <div className="flex-1 min-w-0 rounded-xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                  {DIMENSIONS.map((dim, i) => {
                    const isOpen = expandedDims.has(dim.id);
                    return (
                      <div key={dim.id} className={i > 0 ? 'border-t border-slate-100' : ''}>
                        {/* Collapsed Row — fixed 52px height, 4-column grid */}
                        <button
                          onClick={() => toggleDim(dim.id)}
                          className={`w-full h-[52px] flex items-center px-4 gap-3 transition-colors text-left cursor-pointer ${
                            isOpen ? 'bg-slate-50/80' : 'hover:bg-slate-50/50'
                          }`}
                        >
                          {/* Col 1: Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isOpen ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400'
                          }`}>
                            <dim.icon className="w-3.5 h-3.5" />
                          </div>

                          {/* Col 2: Title + Status Tag */}
                          <div className="w-[210px] shrink-0 flex items-center gap-2 min-w-0">
                            <span className={`text-[13px] truncate ${isOpen ? 'text-slate-800' : 'text-slate-700'}`}>
                              {dim.name}
                            </span>
                            <span className={`px-1.5 py-px text-[10px] rounded border whitespace-nowrap shrink-0 ${statusColor(dim.status)}`}>
                              {dim.status}
                            </span>
                          </div>

                          {/* Col 3: Progress Bar */}
                          <div className="flex-1 min-w-0 px-1">
                            <div className={`h-[6px] w-full ${barTrack(dim.score)} rounded-full overflow-hidden`}>
                              <motion.div
                                className={`h-full ${barFill(dim.score)} rounded-full`}
                                initial={{ width: 0 }}
                                animate={{ width: `${dim.score}%` }}
                                transition={{ duration: 0.7, delay: 0.15 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                              />
                            </div>
                          </div>

                          {/* Col 4: Score + Chevron */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[14px] tabular-nums text-slate-700 w-7 text-right">{dim.score}</span>
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isOpen ? 'rotate-90 text-blue-400' : 'text-slate-300'
                            }`} />
                          </div>
                        </button>

                        {/* Expanded Detail Panel — nested below row */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden"
                            >
                              <InlineDimDetail dim={dim} onPractice={handlePractice} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.section>

            {/* ═══ SECTION 3: Question-level Breakdown ═══ */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    Question-level Breakdown
                  </h2>
                  <p className="text-[11.5px] text-slate-400 mt-0.5">{QUESTIONS.length} questions analyzed</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="divide-y divide-slate-50">
                  {QUESTIONS.map((q) => (
                    <QuestionRow key={q.id} q={q} isExpanded={expandedQs.has(q.id)} onToggle={() => toggleQ(q.id)} />
                  ))}
                </div>
              </div>
            </motion.section>

            {/* ═══ SECTION 5: Progress Trend ═══ */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Progress Over Time
                  </h2>
                  <p className="text-[11.5px] text-slate-400 mt-0.5">Across {TREND_DATA.length} recent sessions</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {TREND_LINES.map((tl) => (
                    <button
                      key={tl.key}
                      onClick={() => toggleTrend(tl.key)}
                      className={`px-2 py-1 text-[11px] rounded-md border transition-all ${
                        trendKeys.has(tl.key)
                          ? 'border-slate-200 bg-white shadow-sm text-slate-700'
                          : 'border-transparent bg-transparent text-slate-400 hover:text-slate-500'
                      }`}
                    >
                      <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: tl.color, opacity: trendKeys.has(tl.key) ? 1 : 0.3 }} />
                      {tl.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="px-4 py-4 h-52">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={TREND_DATA} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="session" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis domain={[30, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <RTooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          fontSize: '12px',
                        }}
                      />
                      {TREND_LINES.filter((tl) => trendKeys.has(tl.key)).map((tl) => (
                        <Line
                          key={tl.key}
                          type="monotone"
                          dataKey={tl.key}
                          name={tl.label}
                          stroke={tl.color}
                          strokeWidth={2}
                          dot={{ r: 3, fill: tl.color, strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.section>

            {/* ═══ SECTION 6: Next Best Actions ═══ */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="mb-4">
                <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  Your Coaching Plan
                </h2>
              </div>
              <div className="bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 rounded-xl border border-blue-100/60 p-5">
                <div className="grid sm:grid-cols-3 gap-4">
                {/* Recommended practice */}
                <div className="bg-white/80 backdrop-blur rounded-xl border border-slate-100 p-4 flex flex-col">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                    <Dumbbell className="w-4 h-4 text-blue-500" />
                  </div>
                  <h3 className="text-[13px] text-slate-800 mb-1">10-min Targeted Drill</h3>
                  <p className="text-[12px] text-slate-400 leading-relaxed flex-1 mb-3">
                    Practice ownership & accountability framing with 3 rapid-fire prompts designed for your weak spots.
                  </p>
                  <Button
                    size="sm"
                    onClick={handlePractice}
                    className="h-8 text-xs gap-1.5 w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-sm shadow-blue-500/15"
                  >
                    <Play className="w-3 h-3" />
                    Start Targeted Retry
                  </Button>
                </div>
                {/* Weakest dimension */}
                <div className="bg-white/80 backdrop-blur rounded-xl border border-slate-100 p-4 flex flex-col">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
                    <Target className="w-4 h-4 text-amber-500" />
                  </div>
                  <h3 className="text-[13px] text-slate-800 mb-1">Focus: {weakest.name}</h3>
                  <p className="text-[12px] text-slate-400 leading-relaxed flex-1 mb-3">
                    Your lowest dimension at {weakest.score}/100. Work on replacing passive language with clear ownership signals.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 w-full border-slate-200"
                  >
                    <BookOpen className="w-3 h-3" />
                    Open Practice Sets
                  </Button>
                </div>
                {/* Question set */}
                <div className="bg-white/80 backdrop-blur rounded-xl border border-slate-100 p-4 flex flex-col">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
                    <Library className="w-4 h-4 text-violet-500" />
                  </div>
                  <h3 className="text-[13px] text-slate-800 mb-1">Curated Question Set</h3>
                  <p className="text-[12px] text-slate-400 leading-relaxed flex-1 mb-3">
                    5 hand-picked questions targeting {weakest.name.toLowerCase()} and {DIMENSIONS.sort((a, b) => a.score - b.score)[1]?.name.toLowerCase()}.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 w-full border-slate-200"
                  >
                    <ArrowRight className="w-3 h-3" />
                    View Questions
                  </Button>
                </div>
              </div>
              </div>
            </motion.section>

            {/* Footer note */}
            <p className="text-center text-[11px] text-slate-400 pb-4">
              AI-generated coaching report · Use as practice guidance, not a final assessment
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// META CHIP
// ════════════════════════════════════════════════════════
function MetaChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
      {icon}
      {label}
    </span>
  );
}

// ════════════════════════════════════════════════════════
// INLINE DIMENSION DETAIL (accordion panel)
// ════════════════════════════════════════════════════════
function InlineDimDetail({
  dim,
  onPractice,
}: {
  dim: Dimension;
  onPractice: () => void;
}) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-4">
      {/* ── Reasoning ── */}
      <div>
        <h4 className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Brain className="w-3 h-3" />
          Reasoning
        </h4>
        <p className="text-[12.5px] text-slate-600 leading-relaxed bg-white rounded-lg p-3 border border-slate-100">
          {dim.reasoning}
        </p>
      </div>

      {/* ── Evidence ── */}
      <div>
        <h4 className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Quote className="w-3 h-3" />
          Evidence
        </h4>
        <div className="space-y-2">
          {dim.evidence.map((ev, i) => (
            <div key={i} className="rounded-lg border border-slate-100 bg-white overflow-hidden">
              <div className="px-3.5 py-2.5">
                <p className="text-[12px] text-slate-600 italic leading-relaxed">{ev.quote}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded">{ev.source}</span>
                  {ev.timestamp && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {ev.timestamp}
                    </span>
                  )}
                </div>
              </div>
              <div className="px-3.5 py-2 border-t border-slate-50 bg-slate-50/40">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <span className="text-slate-400">Why it matters: </span>
                  {ev.whyItMatters}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Next Steps ── */}
      <div>
        <h4 className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Lightbulb className="w-3 h-3" />
          Next Steps
        </h4>
        <div className="space-y-1.5">
          {dim.nextSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-white border border-slate-100">
              <span className="w-[18px] h-[18px] rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[9px] text-blue-500 tabular-nums">{i + 1}</span>
              </span>
              <span className="text-[12px] text-slate-600 leading-relaxed">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          size="sm"
          onClick={(e) => { e.stopPropagation(); onPractice(); }}
          className="h-7 text-[11px] gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-sm shadow-blue-500/15"
        >
          <Dumbbell className="w-3 h-3" />
          Practice this dimension
        </Button>
        <button
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1"
        >
          See similar questions
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// QUESTION ROW
// ════════════════════════════════════════════════════════
function QuestionRow({
  q,
  isExpanded,
  onToggle,
}: {
  q: QuestionItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50/60 transition-colors text-left"
      >
        <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[11px] text-slate-500 tabular-nums">{q.id.replace('q', '')}</span>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-slate-700 leading-relaxed">{q.prompt}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {q.dimensions.map((d) => (
              <span key={d} className="px-1.5 py-0.5 text-[10px] rounded bg-slate-50 text-slate-500 border border-slate-100">
                {d}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-slate-300 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pl-14 space-y-4">
              {/* Per-dimension scores */}
              <div>
                <h4 className="text-[11px] text-slate-400 mb-2">Dimension Performance</h4>
                <div className="space-y-2">
                  {q.dimScores.map((ds) => (
                    <div key={ds.dim} className="flex items-center gap-3">
                      <span className="text-[12px] text-slate-500 w-[200px] shrink-0 truncate">{ds.dim}</span>
                      <div className={`flex-1 h-1.5 ${barTrack(ds.score)} rounded-full overflow-hidden`}>
                        <motion.div
                          className={`h-full ${barFill(ds.score)} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${ds.score}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="text-[12px] text-slate-500 tabular-nums w-7 text-right">{ds.score}</span>
                    </div>
                  ))}
                </div>
                {/* Notes */}
                <div className="mt-2 space-y-1">
                  {q.dimScores.map((ds) => (
                    <p key={ds.dim} className="text-[11px] text-slate-400 leading-relaxed">
                      <span className="text-slate-500">{ds.dim}:</span> {ds.note}
                    </p>
                  ))}
                </div>
              </div>

              {/* Evidence */}
              {q.evidence.length > 0 && (
                <div>
                  <h4 className="text-[11px] text-slate-400 mb-2">Evidence</h4>
                  {q.evidence.map((ev, i) => (
                    <div key={i} className="rounded-lg border border-slate-100 overflow-hidden mb-2">
                      <div className="px-3.5 py-2.5 bg-slate-50/50 border-l-2 border-l-blue-300">
                        <p className="text-[12px] text-slate-700 italic leading-relaxed">{ev.quote}</p>
                        <span className="text-[10px] text-slate-400 mt-1 inline-block">{ev.source}</span>
                      </div>
                      <div className="px-3.5 py-2 bg-white">
                        <p className="text-[11px] text-slate-500">
                          <span className="text-slate-400">Why it matters: </span>{ev.whyItMatters}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Improvements */}
              <div>
                <h4 className="text-[11px] text-slate-400 mb-2">How to Improve This Answer</h4>
                <div className="space-y-1.5">
                  {q.improvements.map((imp, i) => (
                    <div key={i} className="flex items-start gap-2 text-[12px] text-slate-600 leading-relaxed">
                      <span className="w-4 h-4 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[9px] text-amber-600 tabular-nums">{i + 1}</span>
                      </span>
                      {imp}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 border-slate-200">
                  <RotateCcw className="w-3 h-3" />
                  Retry this question
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 border-slate-200">
                  <Plus className="w-3 h-3" />
                  Add to weak areas
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 border-slate-200">
                  <Bookmark className="w-3 h-3" />
                  Save to Library
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// SESSION RECORDING (Premium)
// ════════════════════════════════════════════════════════
function SessionRecording({ isPremium, onTogglePremium }: { isPremium: boolean; onTogglePremium: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(134);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeMarker, setActiveMarker] = useState<string | null>('q1');

  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
  const pct = (currentSec / VIDEO_TOTAL_SEC) * 100;

  const seekTo = (m: typeof VIDEO_MARKERS[number]) => { setCurrentSec(m.startSec); setActiveMarker(m.id); };
  const onTimeline = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const s = Math.round(((e.clientX - r.left) / r.width) * VIDEO_TOTAL_SEC);
    setCurrentSec(Math.max(0, Math.min(s, VIDEO_TOTAL_SEC)));
    setActiveMarker(VIDEO_MARKERS.find((m) => s >= m.startSec && s < m.endSec)?.id ?? null);
  };

  if (!isPremium) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
            <Video className="w-4 h-4 text-blue-500" />
            Session Recording
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200">Premium</span>
          </h2>
          <button onClick={onTogglePremium} className="text-[10px] text-slate-400 hover:text-slate-500 transition-colors underline decoration-dashed underline-offset-2">demo: toggle</button>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="relative">
            <div className="h-48 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center" style={{ filter: 'blur(6px)' }}>
                <div className="w-20 h-20 rounded-full bg-slate-700/80" />
              </div>
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
                  <Lock className="w-6 h-6 text-white/70" />
                </div>
                <p className="text-[14px] text-white/90">Video Playback</p>
                <p className="text-[12px] text-white/50 max-w-[280px] text-center">Upgrade to Premium to replay your full interview with timestamped question markers</p>
                <Button size="sm" className="h-9 text-xs gap-1.5 mt-1 bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 hover:from-amber-500 hover:to-yellow-500 shadow-lg shadow-amber-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  Upgrade to Premium
                </Button>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-300 tabular-nums">0:00</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full" />
                <span className="text-[11px] text-slate-300 tabular-nums">22:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
          <Video className="w-4 h-4 text-blue-500" />
          Session Recording
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 border border-blue-100">Premium</span>
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[0.5, 1, 1.5, 2].map((sp) => (
              <button key={sp} onClick={() => setPlaybackSpeed(sp)} className={`px-1.5 py-0.5 text-[10px] rounded transition-all ${playbackSpeed === sp ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-slate-400 hover:text-slate-500'}`}>{sp}x</button>
            ))}
          </div>
          <button onClick={onTogglePremium} className="text-[10px] text-slate-400 hover:text-slate-500 transition-colors underline decoration-dashed underline-offset-2 ml-2">demo: toggle</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex flex-col lg:flex-row">
        <div className="flex-1">
          {/* Mock video frame */}
          <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 aspect-video max-h-[300px] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 flex">
              <div className="flex-1 border-r border-slate-700/50 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center border border-blue-500/20">
                  <Mic className="w-5 h-5 text-blue-400/60" />
                </div>
                <span className="text-[10px] text-white/40 mt-1.5">AI Interviewer</span>
                <div className="flex items-center gap-0.5 mt-1.5">
                  {[3,5,8,6,4,7,5,3].map((h,i) => (
                    <motion.div key={i} className="w-0.5 bg-blue-400/40 rounded-full"
                      animate={isPlaying ? { height: [h, h*1.8, h], opacity: [0.4,0.8,0.4] } : { height: h, opacity: 0.3 }}
                      transition={isPlaying ? { repeat: Infinity, duration: 0.6, delay: i*0.08 } : {}}
                      style={{ height: h }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center border border-emerald-500/20">
                  <Video className="w-5 h-5 text-emerald-400/60" />
                </div>
                <span className="text-[10px] text-white/40 mt-1.5">You</span>
                <div className="flex items-center gap-0.5 mt-1.5">
                  {[4,6,9,7,5,8,6,4].map((h,i) => (
                    <motion.div key={i} className="w-0.5 bg-emerald-400/40 rounded-full"
                      animate={isPlaying ? { height: [h, h*2, h], opacity: [0.4,0.8,0.4] } : { height: h*0.5, opacity: 0.3 }}
                      transition={isPlaying ? { repeat: Infinity, duration: 0.5, delay: i*0.07 } : {}}
                      style={{ height: isPlaying ? h : h*0.5 }}
                    />
                  ))}
                </div>
              </div>
            </div>
            {activeMarker && VIDEO_MARKERS.find((m) => m.id === activeMarker)?.question && (
              <div className="absolute bottom-3 left-3 right-3 z-10">
                <div className="px-3 py-2 bg-black/50 backdrop-blur-sm rounded-lg border border-white/10">
                  <p className="text-[10px] text-white/50">Current question</p>
                  <p className="text-[12px] text-white/90 mt-0.5">{VIDEO_MARKERS.find((m) => m.id === activeMarker)?.question}</p>
                </div>
              </div>
            )}
            {!isPlaying && (
              <button onClick={() => setIsPlaying(true)} className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/20"><Play className="w-6 h-6 text-white ml-0.5" /></div>
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="px-5 py-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors">
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-slate-600" /> : <Play className="w-3.5 h-3.5 text-slate-600 ml-0.5" />}
              </button>
              <button onClick={() => { const i = VIDEO_MARKERS.findIndex((m) => m.id === activeMarker); if (i > 0) seekTo(VIDEO_MARKERS[i-1]); }} className="w-7 h-7 rounded-md hover:bg-slate-50 flex items-center justify-center transition-colors"><SkipBack className="w-3.5 h-3.5 text-slate-400" /></button>
              <button onClick={() => { const i = VIDEO_MARKERS.findIndex((m) => m.id === activeMarker); if (i < VIDEO_MARKERS.length-1) seekTo(VIDEO_MARKERS[i+1]); }} className="w-7 h-7 rounded-md hover:bg-slate-50 flex items-center justify-center transition-colors"><SkipForward className="w-3.5 h-3.5 text-slate-400" /></button>
              <span className="text-[12px] text-slate-500 tabular-nums">{fmt(currentSec)} / {fmt(VIDEO_TOTAL_SEC)}</span>
              <div className="flex-1" />
              <button className="w-7 h-7 rounded-md hover:bg-slate-50 flex items-center justify-center transition-colors"><Volume2 className="w-3.5 h-3.5 text-slate-400" /></button>
            </div>
            <div className="space-y-1.5">
              <div className="relative h-3 bg-slate-100 rounded-full cursor-pointer group" onClick={onTimeline}>
                <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-150" style={{ width: `${pct}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-blue-500 shadow-sm transition-all duration-150 group-hover:scale-110" style={{ left: `calc(${pct}% - 7px)` }} />
                {VIDEO_MARKERS.filter((m) => m.type === 'question').map((m) => (
                  <div key={m.id} className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-300 border border-white z-[1]" style={{ left: `${(m.startSec/VIDEO_TOTAL_SEC)*100}%` }} />
                ))}
              </div>
              <div className="relative h-4">
                {VIDEO_MARKERS.filter((m) => m.type === 'question').map((m) => (
                  <button key={m.id} onClick={() => seekTo(m)} className={`absolute -translate-x-1/2 text-[10px] px-1.5 py-0.5 rounded transition-all ${activeMarker === m.id ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-slate-400 hover:text-slate-500'}`} style={{ left: `${((m.startSec+(m.endSec-m.startSec)/2)/VIDEO_TOTAL_SEC)*100}%` }}>{m.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-[220px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 divide-y divide-slate-50">
          <div className="px-4 py-2.5"><span className="text-[11px] text-slate-400">Jump to</span></div>
          {VIDEO_MARKERS.filter((m) => m.type !== 'transition').map((m) => (
            <button key={m.id} onClick={() => seekTo(m)} className={`w-full px-4 py-2.5 flex items-center gap-2.5 text-left transition-colors ${activeMarker === m.id ? 'bg-blue-50/60' : 'hover:bg-slate-50/60'}`}>
              <span className={`text-[10px] tabular-nums shrink-0 ${activeMarker === m.id ? 'text-blue-500' : 'text-slate-400'}`}>{fmt(m.startSec)}</span>
              <p className={`text-[12px] truncate flex-1 min-w-0 ${activeMarker === m.id ? 'text-blue-700' : 'text-slate-600'}`}>{m.question || m.label}</p>
              {activeMarker === m.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
            </button>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}