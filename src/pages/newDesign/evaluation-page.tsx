import {
  X, Maximize2, Minimize2, RotateCcw, Bookmark,
  ChevronRight, Target, TrendingUp, Brain,
  MessageSquare, Users, Shield, Lightbulb, Crown,
  Scale, Quote, ArrowRight, Zap, BookOpen, Dumbbell,
  CheckCircle2, AlertTriangle, Clock, CalendarDays, Mic,
  Play, Plus, Library, Video,
  Pause, SkipForward, SkipBack, Volume2, FileText,
  Download, Share2, ThumbsUp, CircleAlert,
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from 'recharts';
import { Button } from '@/components/newDesign/ui/button';
import {
  Tooltip, TooltipTrigger, TooltipContent,
} from '@/components/newDesign/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/newDesign/ui/sheet';
import { getInterviewSession } from '@/services/IntervewSesstionServices';
import { InterviewService } from '@/services';


// ═════════════════════════════════════════════════���══════
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
  score: number;
  dimensions: string[];
  yourAnswer: string;
  sampleAnswer: string;
  feedback: string;
  gapAnalysis: string;
  answered: boolean;
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
    score: 78,
    dimensions: ['Problem Solving', 'Communication Clarity', 'Collaboration & Stakeholder Mgmt'],
    yourAnswer: 'At my previous company, I was a product manager leading a cross-functional initiative to revamp our onboarding flow. The engineering director was hesitant because his team was already at capacity. I pulled together a dashboard showing the 40% drop-off rate during onboarding and mapped it to projected revenue impact. Then I proposed a phased rollout that wouldn\'t disrupt the current sprint commitments, and presented a shared dashboard tying our drop-off metrics to his team\'s performance goals, making it a shared win.',
    sampleAnswer: 'In my role as PM, I identified a critical 40% onboarding drop-off impacting $2M ARR. Without direct authority over engineering, I built a data-driven case: (1) created a dashboard linking drop-off to revenue, (2) proposed a phased plan minimizing sprint disruption, and (3) framed it as a shared OKR win. The engineering director agreed within a week, and we reduced drop-off by 25% in the first quarter — demonstrating that influence comes from aligning incentives, not authority.',
    feedback: 'Your answer demonstrates strong data-driven persuasion and stakeholder empathy. The dashboard approach was compelling. However, you could tighten the opening by leading with the outcome first, then explaining how you got there. Also, explicitly naming the alternative approaches you considered would show deeper strategic thinking.',
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
    score: 60,
    dimensions: ['Decision Making & Prioritization', 'Ownership & Accountability', 'Self-awareness & Reflection'],
    yourAnswer: 'We had a production issue that was affecting about 15% of users. The team decided to prioritize the quick fix over the long-term refactor because we were under a tight deadline. We patched it within a day, but the underlying architecture issue remained. Later we scheduled a proper refactor in the next quarter.',
    sampleAnswer: 'During a critical production outage affecting 15% of our user base, I faced a clear trade-off: a quick patch (1-day fix, addresses symptoms) vs. a full refactor (2-week effort, addresses root cause). I chose the patch because: (1) revenue impact was $50K/day, (2) the refactor could be isolated and scheduled, and (3) I could de-risk the patch with feature flags. I personally owned the hotfix, deployed it within 6 hours, and then authored an RFC for the refactor — which we completed the following sprint with zero regressions.',
    feedback: 'Your answer identifies the trade-off but lacks structure and personal ownership. Using phrases like "the team decided" makes it unclear who drove the decision. A stronger answer would use an explicit framework: state the trade-off, your criteria for choosing, your specific role, and the measurable result. Own the decision with "I recommended" instead of passive attribution.',
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
    score: 62,
    dimensions: ['Self-awareness & Reflection', 'Leadership', 'Ownership & Accountability'],
    yourAnswer: 'We were building a new feature for our enterprise clients. The project timeline slipped by about three weeks because we underestimated the integration complexity. I coordinated tasks across the team and we eventually delivered. Looking back, I would have communicated the timeline risk earlier to the stakeholders and set better expectations.',
    sampleAnswer: 'I led the launch of an enterprise SSO integration that slipped 3 weeks past deadline. The root cause was my own planning gap — I estimated integration work based on our REST API patterns, but the SAML/OIDC handshake required 2x the testing I\'d budgeted. When I recognized the slip at week 2, I took three actions: (1) immediately informed stakeholders with a revised timeline and risk matrix, (2) re-scoped Phase 1 to ship core SSO without advanced role-mapping, and (3) ran daily standups to unblock the team. We shipped Phase 1 on the revised date. My key takeaway: I now add a 40% buffer for integration work and run pre-mortems before every cross-system project.',
    feedback: 'Your answer acknowledges the failure but stays surface-level. Saying "we underestimated" without explaining your specific role in the estimation weakens ownership. The reflection ("I would have communicated earlier") is a good start but doesn\'t show genuine self-insight into your tendencies. A stronger answer would describe how you led the recovery, not just coordinated tasks, and share a concrete behavioral change you adopted as a result.',
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

// ─── Video recording timeline ────────────────���────────
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

// ─── Transcript lines ─────────────────────────────────
interface TranscriptLine {
  id: string;
  startSec: number;
  endSec: number;
  speaker: 'ai' | 'user';
  text: string;
}

const TRANSCRIPT_LINES: TranscriptLine[] = [
  { id: 'tl-01', startSec: 0, endSec: 15, speaker: 'ai', text: "Welcome! Thanks for joining today's behavioral interview session. I'll be asking you three questions focused on leadership, influence, and decision-making." },
  { id: 'tl-02', startSec: 15, endSec: 30, speaker: 'ai', text: "Feel free to take a moment before answering each question. There are no right or wrong answers — I'm looking for specific examples from your experience." },
  { id: 'tl-03', startSec: 30, endSec: 45, speaker: 'user', text: "Sounds great, I'm ready to get started." },
  { id: 'tl-04', startSec: 45, endSec: 65, speaker: 'ai', text: "Let's begin. Tell me about a time you had to influence a decision without having direct authority. Walk me through the situation and your approach." },
  { id: 'tl-05', startSec: 65, endSec: 120, speaker: 'user', text: "Sure. At my previous company, I was a product manager leading a cross-functional initiative to revamp our onboarding flow. The engineering director was hesitant because his team was already at capacity with the current sprint." },
  { id: 'tl-06', startSec: 120, endSec: 180, speaker: 'user', text: "I pulled together a dashboard showing the 40% drop-off rate during onboarding and mapped it to projected revenue impact. Then I proposed a phased rollout that wouldn't disrupt the current sprint commitments." },
  { id: 'tl-07', startSec: 180, endSec: 220, speaker: 'user', text: "I also presented a shared dashboard tying our drop-off metrics to his team's performance goals, making it a shared win rather than an interruption to their roadmap." },
  { id: 'tl-08', startSec: 220, endSec: 260, speaker: 'ai', text: "That's a strong start. Can you walk me through the specific tactics you used to get buy-in? What data or framing helped shift the conversation?" },
  { id: 'tl-09', startSec: 260, endSec: 340, speaker: 'user', text: "The key was reframing the problem from 'product wants engineering resources' to 'here's a revenue leak we can fix together.' I mapped each initiative on a 2×2 of impact vs. engineering effort, which made the priority clear." },
  { id: 'tl-10', startSec: 340, endSec: 400, speaker: 'user', text: "I also brought in the VP of Sales who was seeing churn data that supported the same thesis. Having a cross-functional advocate made it harder to dismiss as just a product team initiative." },
  { id: 'tl-11', startSec: 400, endSec: 440, speaker: 'ai', text: "Excellent. What was the outcome, and how did the relationship with the engineering director evolve after this?" },
  { id: 'tl-12', startSec: 440, endSec: 480, speaker: 'user', text: "We shipped the first phase in 6 weeks and saw onboarding completion jump from 60% to 78%. The engineering director actually became one of the project's strongest advocates in the next planning cycle." },
  { id: 'tl-13', startSec: 510, endSec: 540, speaker: 'ai', text: "Great, let's move on. Describe a situation where you had to make a difficult trade-off under time pressure. What was the context and how did you decide?" },
  { id: 'tl-14', startSec: 540, endSec: 610, speaker: 'user', text: "Last year, we were two weeks from a major product launch when we discovered a significant performance issue in our search feature. We had to choose between delaying the launch or shipping with a known degradation." },
  { id: 'tl-15', startSec: 610, endSec: 680, speaker: 'user', text: "I chose to optimize for speed because the team was under pressure from a Q3 deadline. The team decided to prioritize the quick fix over the long-term refactor, with a plan to address technical debt in the next sprint." },
  { id: 'tl-16', startSec: 680, endSec: 730, speaker: 'ai', text: "Interesting. When you say 'the team decided' — what was your specific role in driving that decision? Walk me through the reasoning." },
  { id: 'tl-17', startSec: 730, endSec: 800, speaker: 'user', text: "I just felt like the first option was better, so we went with that. I evaluated the risk of delay vs. the user impact of degraded search, and the data showed search was used by only 15% of users during onboarding." },
  { id: 'tl-18', startSec: 800, endSec: 860, speaker: 'user', text: "So the exposure was limited. I presented this analysis to the team and recommended we ship on time with monitoring in place, and schedule the deeper fix for sprint 2." },
  { id: 'tl-19', startSec: 860, endSec: 900, speaker: 'ai', text: "Good analysis. How did you communicate this trade-off to stakeholders who might have had different priorities?" },
  { id: 'tl-20', startSec: 930, endSec: 960, speaker: 'ai', text: "Final question. Tell me about a project that didn't go as planned. What happened, what was your role, and what did you learn from it?" },
  { id: 'tl-21', startSec: 960, endSec: 1040, speaker: 'user', text: "We had a redesign project where I underestimated the complexity of migrating user data to the new schema. I assigned tasks to the team members and we met the initial deadline, but the data migration caused issues for about 5% of users." },
  { id: 'tl-22', startSec: 1040, endSec: 1120, speaker: 'user', text: "Looking back, I would have communicated the timeline risk earlier to the stakeholders. We shipped it and the metrics improved overall, but those first two weeks were rough for the affected users." },
  { id: 'tl-23', startSec: 1120, endSec: 1180, speaker: 'ai', text: "What did that experience teach you about how you approach project planning now? Has anything fundamentally changed in your process?" },
  { id: 'tl-24', startSec: 1180, endSec: 1260, speaker: 'user', text: "I now build in a 'risk discovery' phase before committing to timelines. I also do pre-mortems with the team — we imagine the project has failed and work backward to identify what could go wrong. It's helped catch issues earlier in three subsequent projects." },
  { id: 'tl-25', startSec: 1260, endSec: 1300, speaker: 'ai', text: "That's a great reflection. Thank you for sharing those examples today. You gave some really strong, specific answers. We'll have your detailed evaluation ready shortly." },
  { id: 'tl-26', startSec: 1300, endSec: 1320, speaker: 'user', text: "Thank you! I appreciate the questions — they really made me think. Looking forward to the feedback." },
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

function dimensionStatus(score: number): Dimension['status'] {
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Developing';
  if (score >= 60) return 'Inconsistent';
  return 'Needs work';
}

// ─── API response shape ───────────────────────────────
interface ApiReportData {
  interview_id: string;
  status: string;
  overall_score: number;
  scores: {
    resume_background?: number;
    domain_knowledge?: number;
    technical_skills?: number;
    behavioral?: number;
  };
  summary?: string;
  strengths?: string[];
  areas_for_improvement?: string[];
  improvement_advice?: string;
  questions?: {
    question_id: number;
    seq: number;
    question_text: string;
    answer_text: string;
    answered: boolean;
    score: number;
    feedback: string;
    sample_answer?: string;
    gap_analysis?: string;
    duration_sec?: number | null;
  }[];
  transcript?: {
    speaker: string;
    sequence_number: number;
    text: string;
    time: number;
  }[];
  video_url?: string;
  generated_at?: string;
  job_id?: number;
  attempts?: number;
}

// ════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════════════
export function EvaluationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedDims, setExpandedDims] = useState<Set<string>>(new Set());
  const [expandedQs, setExpandedQs] = useState<Set<string>>(new Set());
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
  const toggleCard = (id: string) => setCollapsedCards(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const [trendKeys, setTrendKeys] = useState<Set<string>>(new Set(['problemSolving', 'communication']));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTopic, setDrawerTopic] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── API state ──────────────────────────────────────
  const [apiData, setApiData] = useState<ApiReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Extract the string value so the effect only re-runs when the ID actually changes
  const interviewId = searchParams.get('interviewId');

  const stopPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!interviewId) return;

    let cancelled = false;
    setIsLoading(true);
    setApiData(null);

    const fetchReport = async () => {
      try {
        const res = await getInterviewSession(interviewId);
        if (cancelled) return;
        const data = res.data?.data ?? res.data;
        if (data?.status === 'processing') {
          // Keep loading, poll will retry
          return;
        }
        if (data) {
          setApiData(data);
          setIsLoading(false);
          stopPolling();
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load interview report:', err);
          setIsLoading(false);
          stopPolling();
        }
      }
    };

    fetchReport();
    pollingRef.current = setInterval(fetchReport, 5000);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [interviewId, stopPolling]);

  // ── Computed display data (API or mock fallback) ───
  // When interviewId is provided, never show placeholder data — wait for real data.
  const displayDimensions: Dimension[] = apiData?.scores
    ? [
        { id: 'resume_background', name: 'Background & Experience', icon: BookOpen, score: Math.round((apiData.scores.resume_background ?? 0)), status: dimensionStatus(Math.round((apiData.scores.resume_background ?? 0))), reasoning: '', evidence: [], nextSteps: [] },
        { id: 'domain_knowledge',  name: 'Domain Knowledge',        icon: Brain,    score: Math.round((apiData.scores.domain_knowledge  ?? 0)), status: dimensionStatus(Math.round((apiData.scores.domain_knowledge  ?? 0))), reasoning: '', evidence: [], nextSteps: [] },
        { id: 'technical_skills',  name: 'Technical Skills',        icon: Target,   score: Math.round((apiData.scores.technical_skills  ?? 0)), status: dimensionStatus(Math.round((apiData.scores.technical_skills  ?? 0))), reasoning: '', evidence: [], nextSteps: [] },
        { id: 'behavioral',        name: 'Behavioral Skills',       icon: Users,    score: Math.round((apiData.scores.behavioral        ?? 0)), status: dimensionStatus(Math.round((apiData.scores.behavioral        ?? 0))), reasoning: '', evidence: [], nextSteps: [] },
      ]
    : interviewId ? [] : DIMENSIONS;

  const displayQuestions: QuestionItem[] = apiData?.questions?.length
    ? apiData.questions.map((q) => ({
        id: `q${q.seq ?? q.question_id}`,
        prompt: q.question_text ?? '',
        score: Math.round((q.score ?? 0) * 10),
        dimensions: [],
        yourAnswer: q.answer_text ?? '',
        sampleAnswer: q.sample_answer ?? '',
        feedback: q.feedback ?? '',
        gapAnalysis: q.gap_analysis ?? '',
        answered: q.answered ?? false,
        dimScores: [],
        evidence: [],
        improvements: [],
      }))
    : interviewId ? [] : QUESTIONS.map(q => ({ ...q, gapAnalysis: '', answered: true }));

  const overall = apiData
    ? apiData.overall_score
    : Math.round(displayDimensions.reduce((s, d) => s + d.score, 0) / (displayDimensions.length || 1));
  const strongest = [...displayDimensions].sort((a, b) => b.score - a.score)[0];
  const weakest = [...displayDimensions].sort((a, b) => a.score - b.score)[0];

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

  const [isRetaking, setIsRetaking] = useState(false);

  const handleClose = () => navigate('/personalized-practice');

  const handleRetry = async () => {
    if (!interviewId) return;
    setIsRetaking(true);
    try {
      const response = await InterviewService.retakeTrainingModule(interviewId);
      const isSuccess =
        response.status === 200 ||
        response.data?.status === 'success' ||
        response.data?.data;
      if (isSuccess) {
        const newModuleId = response.data?.data?.module_id || interviewId;
        navigate(`/ai-mock?interviewId=${newModuleId}`);
      }
    } catch (err) {
      console.error('Retake failed:', err);
    } finally {
      setIsRetaking(false);
    }
  };

  const handlePractice = () => navigate('/personalized-practice');
  const handleSeeSimilar = (topic: string) => {
    setDrawerTopic(topic);
    setDrawerOpen(true);
  };

  // Radar data
  const radarData = displayDimensions.map((d) => ({ subject: d.name.replace(' & Stakeholder Mgmt', '').replace(' & ', ' & '), score: d.score, fullMark: 100 }));

  // Delay chart rendering until modal open-animation settles
  const [chartsReady, setChartsReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setChartsReady(true), 500);
    return () => clearTimeout(t);
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-4 shadow-2xl">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Generating your evaluation…</p>
          <p className="text-xs text-slate-400">This may take a moment</p>
        </div>
      </div>
    );
  }

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
                {apiData?.generated_at
                  ? <MetaChip icon={<CalendarDays className="w-3 h-3" />} label={new Date(apiData.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                  : <MetaChip icon={<CalendarDays className="w-3 h-3" />} label={SESSION_META.completedAt} />
                }
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              
              <Button variant="outline" size="sm" onClick={handleRetry} disabled={isRetaking} className="h-8 text-xs gap-1.5 border-slate-200">
                <RotateCcw className={`w-3.5 h-3.5 ${isRetaking ? 'animate-spin' : ''}`} />
                {isRetaking ? 'Starting...' : 'Retry'}
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
            {/* Download & Share */}
            <div className="flex items-center gap-3">
              <Button variant="outline" className="h-9 text-[12px] gap-2 border-slate-200 rounded-lg">
                <Download className="w-3.5 h-3.5" />
                Download Report
              </Button>
              <Button variant="outline" className="h-9 text-[12px] gap-2 border-slate-200 rounded-lg">
                <Share2 className="w-3.5 h-3.5" />
                Share
              </Button>
            </div>

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
                  <span className="text-[11px] text-slate-400 -mt-0.5 text-center">{overallLevel(overall)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-slate-600 leading-relaxed whitespace-pre-line">
                    {apiData?.summary
                      ? apiData.summary
                      : <>No Summary</>
                    }
                  </p>
                  <div className="flex flex-wrap gap-3 mt-3">
                    
                    
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
              <SessionRecording videoUrl={apiData?.video_url} questions={apiData?.questions} transcript={apiData?.transcript} />
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
                    Questions & Feedback
                  </h2>
                  
                </div>
                <button
                  onClick={() => {
                    const allExpanded = collapsedCards.size === 0;
                    setCollapsedCards(allExpanded ? new Set(['strengths', 'improve', 'advice']) : new Set());
                  }}
                  className="text-[11.5px] text-blue-500 hover:text-blue-600 transition-colors px-2.5 py-1 rounded-md hover:bg-blue-50"
                >
                  {collapsedCards.size === 0 ? 'Collapse all' : 'Expand all'}
                </button>
              </div>

              {/* 2-column body */}
              <div className="space-y-4">
                {/* Strengths */}
                <div className="rounded-xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                  <button onClick={() => toggleCard('strengths')} className="w-full px-5 py-3 flex items-center gap-2 border-b border-slate-50 cursor-pointer hover:bg-slate-50/60 transition-colors">
                    <ThumbsUp className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-[13px] text-slate-700">Strengths</h3>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 ml-auto transition-transform duration-200 ${!collapsedCards.has('strengths') ? 'rotate-90' : ''}`} />
                  </button>
                  {!collapsedCards.has('strengths') && <div className="px-5 py-3 space-y-2.5">
                    {apiData?.strengths?.length
                      ? apiData.strengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="text-[12.5px] text-slate-900">{s}</span>
                          </div>
                        ))
                      : [...displayDimensions].filter(d => d.score >= 70).sort((a, b) => b.score - a.score).map(d => (
                          <div key={d.id} className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[12.5px] text-slate-600 font-medium">{d.name}</span>
                                <span className="text-[11px] text-emerald-600">{d.score}/100</span>
                              </div>
                              {d.reasoning && <span className="text-[12px] text-slate-500">{d.reasoning}</span>}
                            </div>
                          </div>
                        ))
                    }
                  </div>}
                </div>

                {/* Areas to Improve */}
                <div className="rounded-xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                  <button onClick={() => toggleCard('improve')} className="w-full px-5 py-3 flex items-center gap-2 border-b border-slate-50 cursor-pointer hover:bg-slate-50/60 transition-colors">
                    <CircleAlert className="w-4 h-4 text-amber-500" />
                    <h3 className="text-[13px] text-slate-700">Areas to Improve</h3>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 ml-auto transition-transform duration-200 ${!collapsedCards.has('improve') ? 'rotate-90' : ''}`} />
                  </button>
                  {!collapsedCards.has('improve') && <div className="px-5 py-3 space-y-2.5">
                    {apiData?.areas_for_improvement?.length
                      ? apiData.areas_for_improvement.map((area, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <span className="text-[12.5px] text-slate-900">{area}</span>
                          </div>
                        ))
                      : [...displayDimensions].filter(d => d.score < 70).sort((a, b) => a.score - b.score).map(d => (
                          <div key={d.id} className="flex items-start gap-2.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[12.5px] text-slate-600 font-medium">{d.name}</span>
                                <span className="text-[11px] text-amber-600">{d.score}/100</span>
                              </div>
                              {d.reasoning && <span className="text-[12px] text-slate-500">{d.reasoning}</span>}
                            </div>
                          </div>
                        ))
                    }
                  </div>}
                </div>

                {/* Improvement Advice */}
                <div className="rounded-xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                  <button onClick={() => toggleCard('advice')} className="w-full px-5 py-3 flex items-center gap-2 border-b border-slate-50 cursor-pointer hover:bg-slate-50/60 transition-colors">
                    <Lightbulb className="w-4 h-4 text-blue-500" />
                    <h3 className="text-[13px] text-slate-700">Improvement Advice</h3>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 ml-auto transition-transform duration-200 ${!collapsedCards.has('advice') ? 'rotate-90' : ''}`} />
                  </button>
                  {!collapsedCards.has('advice') && <div className="px-5 py-3 space-y-2.5">
                    {apiData?.improvement_advice
                      ? <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-line">{apiData.improvement_advice}</p>
                      : <>
                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 text-[10px] text-blue-600">1</span>
                            <p className="text-[12px] text-slate-600 leading-relaxed">Use the STAR framework consistently — lead with a concise Situation, define your specific Task, detail Actions you personally took, and close with measurable Results.</p>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 text-[10px] text-blue-600">2</span>
                            <p className="text-[12px] text-slate-600 leading-relaxed">Replace passive language ("the team decided") with active ownership ("I recommended X because Y") to demonstrate accountability and leadership.</p>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 text-[10px] text-blue-600">3</span>
                            <p className="text-[12px] text-slate-600 leading-relaxed">Quantify your impact wherever possible — attach numbers, percentages, or dollar amounts to your outcomes to make your stories more compelling and credible.</p>
                          </div>
                        </>
                    }
                  </div>}
                </div>


              </div>
            </motion.section>

            {/* ═══ SECTION 3: Question-level Breakdown ═══ */}
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => toggleCard('breakdown')}>
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    Question-level Breakdown
                  </h2>
                  <p className="text-[11.5px] text-slate-400 mt-0.5">{displayQuestions.length} questions analyzed</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${!collapsedCards.has('breakdown') ? 'rotate-90' : ''}`} />
              </div>
              {!collapsedCards.has('breakdown') && <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="divide-y divide-slate-50">
                  {displayQuestions.map((q) => (
                    <QuestionRow key={q.id} q={q} isExpanded={expandedQs.has(q.id)} onToggle={() => toggleQ(q.id)} />
                  ))}
                </div>
              </div>}
            </motion.section>

            {/* ═══ SECTION 5: Progress Trend ═══ */}
            

            {/* ═══ SECTION 6: Next Best Actions ═══ */}
            

            {/* Footer note */}
            <p className="text-center text-[11px] text-slate-400 pb-4">
              AI-generated coaching report · Use as practice guidance, not a final assessment
            </p>
          </div>
        </div>
      </motion.div>

      {/* Similar Questions Drawer */}
      <SimilarQuestionsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        topic={drawerTopic}
      />
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
  onSeeSimilar,
}: {
  dim: Dimension;
  onPractice: () => void;
  onSeeSimilar: (topic: string) => void;
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
        
        <button
          onClick={(e) => { e.stopPropagation(); onSeeSimilar(dim.name); }}
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
        className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/60 transition-colors text-left"
      >
        <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
          <span className="text-[11px] text-slate-500 tabular-nums">{q.id.replace('q', '')}</span>
        </span>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <p className="text-[13px] text-slate-700 leading-relaxed line-clamp-1">{q.prompt}</p>
          {!q.answered && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">Not answered</span>
          )}
        </div>
        <span className={`text-[13px] tabular-nums shrink-0 ${q.score >= 80 ? 'text-emerald-600' : q.score >= 70 ? 'text-blue-600' : q.score >= 60 ? 'text-amber-600' : 'text-orange-600'}`}>
          {q.score}<span className="text-slate-400">/100</span>
        </span>
        <ChevronRight className={`w-4 h-4 text-slate-300 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
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
              {/* Your Answer */}
              <div>
                <h4 className="text-[11px] text-slate-400 mb-2 uppercase tracking-wider">Your Answer</h4>
                {q.yourAnswer
                  ? (
                    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 border-l-2 border-l-blue-300">
                      <p className="text-[12px] text-slate-600 leading-relaxed">{q.yourAnswer}</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 border-l-2 border-l-slate-200">
                      <p className="text-[12px] text-slate-400 italic">No response recorded for this question.</p>
                    </div>
                  )
                }
              </div>

              {/* Sample Answer */}
              {q.sampleAnswer && (
                <div>
                  <h4 className="text-[11px] text-slate-400 mb-2 uppercase tracking-wider">Sample Answer</h4>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-3.5 py-2.5 border-l-2 border-l-emerald-400">
                    <p className="text-[12px] text-slate-700 leading-relaxed">{q.sampleAnswer}</p>
                  </div>
                </div>
              )}

              {/* Feedback */}
              <div>
                <h4 className="text-[11px] text-slate-400 mb-2 uppercase tracking-wider">Feedback</h4>
                <div className="rounded-lg border border-amber-100 bg-amber-50/40 px-3.5 py-2.5 border-l-2 border-l-amber-400">
                  <p className="text-[12px] text-slate-600 leading-relaxed">{q.feedback}</p>
                </div>
              </div>

              {/* Gap Analysis */}
              {q.gapAnalysis && (
                <div>
                  <h4 className="text-[11px] text-slate-400 mb-2 uppercase tracking-wider">Gap Analysis</h4>
                  <div className="rounded-lg border border-orange-100 bg-orange-50/30 px-3.5 py-2.5 border-l-2 border-l-orange-400">
                    <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-line">{q.gapAnalysis}</p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                
                
                
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// SESSION RECORDING
// ════════════════════════════════════════════════════════
function SessionRecording({ videoUrl, questions, transcript }: { videoUrl?: string; questions?: ApiReportData['questions']; transcript?: ApiReportData['transcript'] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [duration, setDuration] = useState(VIDEO_TOTAL_SEC);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeMarker, setActiveMarker] = useState<string | null>('q1');

  // Derive transcript lines from API transcript, fallback to question pairs, then mock
  const hasApiTranscript = (transcript && transcript.length > 0) || (questions && questions.length > 0);
  const transcriptLines: { id: string; speaker: 'ai' | 'user'; text: string; startSec?: number; endSec?: number }[] =
    transcript && transcript.length > 0
      ? transcript.map((line, i) => ({
          id: `tl-${i}`,
          speaker: line.speaker === 'interviewer' ? 'ai' as const : 'user' as const,
          text: line.text,
          startSec: line.time,
        }))
      : questions && questions.length > 0
        ? questions.flatMap((q, i) => [
            { id: `q${i}-ai`, speaker: 'ai' as const, text: q.question_text },
            ...(q.answer_text ? [{ id: `q${i}-user`, speaker: 'user' as const, text: q.answer_text }] : []),
          ])
        : TRANSCRIPT_LINES;

  // Transcript state
  const [showTranscript, setShowTranscript] = useState(true);
  const [autoFollow, setAutoFollow] = useState(true);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active line tracking only works with mock data that has timing info
  const activeLineId = hasApiTranscript
    ? null
    : TRANSCRIPT_LINES.find((l) => currentSec >= l.startSec && currentSec < l.endSec)?.id ?? null;

  // Auto-scroll transcript to active line
  useEffect(() => {
    if (!autoFollow || !activeLineId || !transcriptRef.current) return;
    const el = transcriptRef.current.querySelector(`[data-line-id="${activeLineId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLineId, autoFollow]);

  // Detect manual scroll to pause auto-follow, resume after 4s idle
  const handleTranscriptScroll = useCallback(() => {
    if (!userScrollingRef.current) {
      userScrollingRef.current = true;
      setAutoFollow(false);
    }
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      userScrollingRef.current = false;
      setAutoFollow(true);
    }, 4000);
  }, []);

  const seekToSec = (sec: number) => {
    if (videoRef.current) videoRef.current.currentTime = sec;
    setCurrentSec(sec);
    setActiveMarker(VIDEO_MARKERS.find((m) => sec >= m.startSec && sec < m.endSec)?.id ?? null);
  };

  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
  const pct = duration > 0 ? (currentSec / duration) * 100 : 0;

  const seekTo = (m: typeof VIDEO_MARKERS[number]) => {
    if (videoRef.current) videoRef.current.currentTime = m.startSec;
    setCurrentSec(m.startSec);
    setActiveMarker(m.id);
  };
  const onTimeline = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const s = Math.round(((e.clientX - r.left) / r.width) * duration);
    const clamped = Math.max(0, Math.min(s, duration));
    if (videoRef.current) videoRef.current.currentTime = clamped;
    setCurrentSec(clamped);
    setActiveMarker(VIDEO_MARKERS.find((m) => s >= m.startSec && s < m.endSec)?.id ?? null);
  };

  if (!videoUrl) {
    return (
      <div>
        <h2 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <Video className="w-4 h-4 text-blue-500" />
          Session Recording
        </h2>
        <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="h-48 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 flex flex-col items-center justify-center gap-2">
            <Video className="w-8 h-8 text-slate-500" />
            <p className="text-[13px] text-slate-400">No recording available for this session</p>
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
          
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[0.5, 1, 1.5, 2].map((sp) => (
              <button key={sp} onClick={() => { setPlaybackSpeed(sp); if (videoRef.current) videoRef.current.playbackRate = sp; }} className={`px-1.5 py-0.5 text-[10px] rounded transition-all ${playbackSpeed === sp ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-slate-400 hover:text-slate-500'}`}>{sp}x</button>
            ))}
          </div>
          
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="flex flex-col lg:flex-row">
        <div className="flex-1">
          {/* Real video element */}
          <div className="relative bg-black aspect-video overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={() => setCurrentSec(Math.floor(videoRef.current?.currentTime ?? 0))}
              onLoadedMetadata={() => setDuration(Math.floor(videoRef.current?.duration ?? VIDEO_TOTAL_SEC))}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            {!isPlaying && (
              <button
                onClick={() => videoRef.current?.play()}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
              >
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/20">
                  <Play className="w-6 h-6 text-white ml-0.5" />
                </div>
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="px-5 py-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => isPlaying ? videoRef.current?.pause() : videoRef.current?.play()}
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-slate-600" /> : <Play className="w-3.5 h-3.5 text-slate-600 ml-0.5" />}
              </button>
              <button onClick={() => { const i = VIDEO_MARKERS.findIndex((m) => m.id === activeMarker); if (i > 0) seekTo(VIDEO_MARKERS[i-1]); }} className="w-7 h-7 rounded-md hover:bg-slate-50 flex items-center justify-center transition-colors"><SkipBack className="w-3.5 h-3.5 text-slate-400" /></button>
              <button onClick={() => { const i = VIDEO_MARKERS.findIndex((m) => m.id === activeMarker); if (i < VIDEO_MARKERS.length-1) seekTo(VIDEO_MARKERS[i+1]); }} className="w-7 h-7 rounded-md hover:bg-slate-50 flex items-center justify-center transition-colors"><SkipForward className="w-3.5 h-3.5 text-slate-400" /></button>
              <span className="text-[12px] text-slate-500 tabular-nums">{fmt(currentSec)} / {fmt(duration)}</span>
              <div className="flex-1" />
              <button className="w-7 h-7 rounded-md hover:bg-slate-50 flex items-center justify-center transition-colors"><Volume2 className="w-3.5 h-3.5 text-slate-400" /></button>
            </div>
            <div className="space-y-1.5">
              <div className="relative h-3 bg-slate-100 rounded-full cursor-pointer group" onClick={onTimeline}>
                <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-150" style={{ width: `${pct}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full border-2 border-blue-500 shadow-sm transition-all duration-150 group-hover:scale-110" style={{ left: `calc(${pct}% - 7px)` }} />
                {VIDEO_MARKERS.filter((m) => m.type === 'question').map((m) => (
                  <div key={m.id} className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-300 border border-white z-[1]" style={{ left: `${(m.startSec/duration)*100}%` }} />
                ))}
              </div>
              <div className="relative h-4">
                {VIDEO_MARKERS.filter((m) => m.type === 'question').map((m) => (
                  <button key={m.id} onClick={() => seekTo(m)} className={`absolute -translate-x-1/2 text-[10px] px-1.5 py-0.5 rounded transition-all ${activeMarker === m.id ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-slate-400 hover:text-slate-500'}`} style={{ left: `${((m.startSec+(m.endSec-m.startSec)/2)/duration)*100}%` }}>{m.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div className="border-t border-slate-100">
            <div
              onClick={() => setShowTranscript((v) => !v)}
              className="w-full px-5 py-2.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[12px] text-slate-600">Transcript</span>
                <span className="text-[10px] text-slate-400">{transcriptLines.length} lines</span>
              </div>
              <div className="flex items-center gap-2">
                {showTranscript && !autoFollow && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setAutoFollow(true); }}
                    className="text-[10px] text-blue-500 hover:text-blue-600 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 transition-colors"
                  >
                    Resume follow
                  </button>
                )}
                <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${showTranscript ? 'rotate-90' : ''}`} />
              </div>
            </div>

            <AnimatePresence>
              {showTranscript && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div
                    ref={transcriptRef}
                    onScroll={handleTranscriptScroll}
                    className="max-h-[240px] overflow-y-auto px-5 pb-4 space-y-0.5 scroll-smooth"
                  >
                    {transcriptLines.map((line) => {
                      const isActive = line.id === activeLineId;
                      return (
                        <div
                          key={line.id}
                          data-line-id={line.id}
                          className={`w-full text-left flex gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                            isActive
                              ? 'bg-blue-50/80 border border-blue-100'
                              : 'border border-transparent'
                          }`}
                        >

                          {/* Speaker badge + text */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-[9px] px-1.5 py-px rounded-full ${
                                line.speaker === 'ai'
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-emerald-100 text-emerald-600'
                              }`}>
                                {line.speaker === 'ai' ? 'AI' : 'You'}
                              </span>
                              {isActive && (
                                <motion.div
                                  className="flex items-center gap-[2px]"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                >
                                  {[2, 4, 6, 4, 2].map((h, i) => (
                                    <motion.span
                                      key={i}
                                      className="w-[2px] rounded-full bg-blue-400"
                                      animate={{ height: [h * 0.5, h, h * 0.5], opacity: [0.4, 0.8, 0.4] }}
                                      transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.08 }}
                                      style={{ height: h * 0.5 }}
                                    />
                                  ))}
                                </motion.div>
                              )}
                            </div>
                            <p className={`text-[12px] leading-relaxed ${
                              isActive ? 'text-slate-800' : 'text-slate-500'
                            }`}>
                              {line.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar */}

      </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// SIMILAR QUESTIONS DRAWER
// ════════════════════════════════════════════════════════
function SimilarQuestionsDrawer({
  open,
  onClose,
  topic,
}: {
  open: boolean;
  onClose: () => void;
  topic: string;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle className="text-[15px]">Similar Questions — {topic}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <p className="text-[13px] text-slate-500">
            Practice more questions related to <span className="text-slate-800 font-medium">{topic}</span> in the question bank.
          </p>
          <a
            href="/question-bank"
            className="inline-flex items-center gap-2 text-[13px] text-blue-600 hover:text-blue-700 transition-colors"
          >
            Browse question bank
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}