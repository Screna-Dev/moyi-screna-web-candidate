import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';

import {
  Mic,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Target,
  ArrowRight,
  Briefcase,
  Upload,
  Pencil,
  Calendar,
  Zap,
  Search,
  Users,
  Lock,
  Star,
  Flame,
  FileText,
  Building2,
  Layers,
  AlertCircle,
  Trophy,
  RefreshCw,
  Circle,
  UploadCloud,
  ExternalLink,
  CheckCheck,
  History,
  MessageSquare,
  Mail,
  ShieldCheck,
  Send,
  SlidersHorizontal,
  Award,
} from 'lucide-react';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { EditProfileModal, type EditProfileData } from '@/components/newDesign/edit-profile-modal';
import { getPersonalInfo, getProfile, updateProfile, uploadResume } from '@/services/ProfileServices';
import { getTrainingPlans } from '@/services/InterviewServices';
import { useUserPlan } from '@/hooks/useUserPlan';

// ─── Types ─────────────────────────────────────────────────────────────────────

type UserData = {
  firstName?: string;
  lastName?: string;
  role?: string;
  experienceLevel?: string;
  targetCompanies?: string[];
  companyTypes?: string[];
  jobStatus?: string;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  resumePath?: string;
};

type StageStatus = 'completed' | 'active' | 'next' | 'locked';

type RecentSession = {
  id: number | string;
  title: string;
  score: number;
  tag: string;
  date: string;
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1mo ago';
  return `${diffMonths}mo ago`;
}

function mapPlansToRecentSessions(plans: any[]): RecentSession[] {
  const sessions: RecentSession[] = [];
  for (const plan of plans) {
    const modules: any[] = plan.modules || [];
    for (const mod of modules) {
      if (mod.status === 'completed' && mod.interviewSessionId) {
        sessions.push({
          id: mod.interviewSessionId,
          title: mod.title || plan.jobTitle || 'Mock Interview',
          score: typeof mod.overallScore === 'number' ? mod.overallScore : 0,
          tag: mod.interviewType || 'General',
          date: mod.completedAt ? formatRelativeTime(mod.completedAt) : '',
        });
      }
    }
  }
  return sessions.slice(0, 5);
}

function deriveExperienceLevel(totalYears?: number): string | undefined {
  if (totalYears == null) return undefined;
  if (totalYears >= 8) return 'Senior';
  if (totalYears >= 4) return 'Mid-level';
  return 'Entry-level';
}

function mapJobSearchStage(stage?: string): string | undefined {
  if (!stage) return undefined;
  const map: Record<string, string> = {
    JUST_EXPLORING: 'Exploring',
    ACTIVELY_APPLYING: 'Actively applying',
    INTERVIEWING: 'Interviewing',
    FINAL_ROUNDS: 'Final rounds',
    URGENT_ASSISTANCE: 'Urgent',
  };
  return map[stage] ?? stage;
}

function filenameFromPath(path?: string): string | undefined {
  if (!path) return undefined;
  const seg = path.split('/').filter(Boolean).pop();
  return seg || undefined;
}

// ─── Career Stage Data ──────────────────────────────────────────────────────

const CAREER_STAGES: {
  id: string;
  name: string;
  icon: React.ElementType;
  status: StageStatus;
  tagline: string;
  stats: { label: string; value: string; highlight?: boolean }[];
  tasks: { text: string; done: boolean }[];
  cta: string;
  ctaHref: string;
}[] = [
  {
    id: 'understand',
    name: 'Understand',
    icon: Search,
    status: 'completed',
    tagline: 'Profile & goals locked in.',
    stats: [
      { label: 'Resume', value: 'Uploaded', highlight: true },
      { label: 'Target Role', value: 'Product Manager' },
      { label: 'Target Companies', value: '8 saved' },
      { label: 'AI Practice Set', value: 'Ready', highlight: true },
    ],
    tasks: [
      { text: 'Upload resume', done: true },
      { text: 'Set target role', done: true },
      { text: 'Select target companies', done: true },
      { text: 'Complete onboarding', done: true },
    ],
    cta: 'Edit Career Profile',
    ctaHref: '/settings',
  },
  {
    id: 'practice',
    name: 'Practice',
    icon: Mic,
    status: 'active',
    tagline: 'You\'re actively building interview readiness.',
    stats: [
      { label: 'Mocks Completed', value: '14', highlight: true },
      { label: 'Avg Score', value: '78 / 100' },
      { label: 'Weak Areas', value: '2 flagged' },
      { label: 'Next session', value: 'Today', highlight: true },
    ],
    tasks: [
      { text: 'Complete 1 system design mock', done: false },
      { text: 'Review behavioral feedback', done: true },
      { text: 'Practice product sense (AI)', done: false },
    ],
    cta: 'Start Practice',
    ctaHref: '/mock-interview',
  },
  {
    id: 'support',
    name: 'Get Support',
    icon: Users,
    status: 'next',
    tagline: 'Mentor sessions amplify your preparation.',
    stats: [
      { label: 'Recommended Mentor', value: 'Priya Mehta' },
      { label: 'Specialty', value: 'PM Interviews' },
      { label: 'Next Slot', value: 'Tomorrow' },
      { label: 'Resume Review', value: 'Available' },
    ],
    tasks: [
      { text: 'Book a mentor session', done: false },
      { text: 'Request resume review', done: false },
      { text: 'Get career strategy feedback', done: false },
    ],
    cta: 'Browse Mentors',
    ctaHref: '/marketplace',
  },
  {
    id: 'apply',
    name: 'Apply',
    icon: Briefcase,
    status: 'next',
    tagline: 'Build a focused, high-signal application pipeline.',
    stats: [
      { label: 'Jobs Matched', value: '24 today' },
      { label: 'Applied', value: '12' },
      { label: 'Referrals Available', value: '2' },
      { label: 'Auto-Apply', value: 'Paused' },
    ],
    tasks: [
      { text: 'Review auto-apply settings', done: false },
      { text: 'Follow up on 3 applications', done: false },
      { text: 'Check referral opportunities', done: false },
    ],
    cta: 'View Job Board',
    ctaHref: '/job-board',
  },
  {
    id: 'offer',
    name: 'Offer & Grow',
    icon: Trophy,
    status: 'next',
    tagline: 'Negotiate confidently. Own your growth trajectory.',
    stats: [
      { label: 'Offers', value: '—' },
      { label: 'Salary Guidance', value: 'Available' },
      { label: 'Decision Support', value: 'On-demand' },
      { label: 'Next Review', value: 'Pending' },
    ],
    tasks: [
      { text: 'Receive and evaluate offer', done: false },
      { text: 'Get negotiation coaching', done: false },
      { text: 'Plan 90-day career roadmap', done: false },
    ],
    cta: 'Learn More',
    ctaHref: '/marketplace',
  },
];

// ─── Focus Actions ──────────────────────────────────────────────────────────

const FOCUS_ACTIONS = [
  {
    id: 1,
    badge: 'High Priority',
    badgeColor: 'rose',
    icon: Mic,
    title: 'Complete 1 system design mock',
    description: 'Your last 3 sessions flagged system design as a weak area. One focused session can close this gap.',
    cta: 'Start Now',
    href: '/mock-interview',
    estimate: '~30 min',
  },
  {
    id: 2,
    badge: 'Quick Win',
    badgeColor: 'emerald',
    icon: FileText,
    title: 'Review your session feedback',
    description: 'You have unread AI feedback from your last behavioral mock. 5 minutes of review locks in the improvement.',
    cta: 'View Report',
    href: '/history',
    estimate: '~5 min',
  },
  {
    id: 3,
    badge: 'Recommended',
    badgeColor: 'blue',
    icon: Users,
    title: 'Book a mentor session',
    description: 'Priya Mehta has 4 slots this week. She specializes in PM interviews — your current target track.',
    cta: 'Book Session',
    href: '/marketplace',
    estimate: '45 min',
  },
  {
    id: 4,
    badge: 'AI',
    badgeColor: 'violet',
    icon: Sparkles,
    title: 'Resume auto-submit paused — check filters',
    description: 'Your auto-apply filters may be too narrow. 2 strong matches were skipped yesterday.',
    cta: 'Review Settings',
    href: '/settings',
    estimate: '~3 min',
  },
];

const badgeStyles: Record<string, string> = {
  rose:    'bg-rose-50 text-rose-600 border border-rose-100',
  emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  blue:    'bg-blue-50 text-blue-600 border border-blue-100',
  violet:  'bg-violet-50 text-violet-600 border border-violet-100',
};

// ─── Application Pipeline ───────────────────────────────────────────────────

const PIPELINE = [
  { label: 'Applied',      count: 12, color: 'bg-blue-100 text-blue-700' },
  { label: 'Interviewing', count: 3,  color: 'bg-violet-100 text-violet-700' },
  { label: 'Waiting',      count: 5,  color: 'bg-amber-100 text-amber-700' },
  { label: 'Rejected',     count: 2,  color: 'bg-rose-100 text-rose-600' },
  { label: 'Offer',        count: 1,  color: 'bg-emerald-100 text-emerald-700' },
];

const AI_JOBS = [
  { role: 'Product Manager', company: 'Stripe', match: 96, type: 'Full-time' },
  { role: 'Senior PM',       company: 'Notion', match: 91, type: 'Full-time' },
  { role: 'Associate PM',    company: 'Linear', match: 88, type: 'Full-time' },
];

// ─── Practice Sessions ──────────────────────────────────────────────────────

const RECENT_SESSIONS = [
  { id: 1, title: 'System Design Interview',  score: 72, tag: 'Technical',  date: 'Today' },
  { id: 2, title: 'Behavioral — Leadership',  score: 91, tag: 'Behavioral', date: 'Yesterday' },
  { id: 3, title: 'Product Sense',            score: 78, tag: 'PM',         date: 'Feb 15' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 20; const c = 2 * Math.PI * r;
  const color = score >= 85 ? '#10b981' : score >= 70 ? 'hsl(221,91%,60%)' : '#f59e0b';
  return (
    <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[11px] font-semibold text-slate-700">{score}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-semibold uppercase tracking-[1.1px] text-slate-400 mb-3">
      {children}
    </p>
  );
}

// ─── Understand Stage — Editable Setup Snapshot ────────────────────────────

function UnderstandPanel() {
  const [resumeHover, setResumeHover] = useState(false);
  const [roleHover,   setRoleHover]   = useState(false);
  const [coHover,     setCoHover]     = useState(false);
  const [aiHover,     setAiHover]     = useState(false);

  return (
    <div className="flex flex-col md:flex-row gap-6">

      {/* ── LEFT: editable snapshot cards ── */}
      <div className="flex-1">
        <p className="text-[12px] text-slate-400 mb-4 flex items-center gap-1.5">
          <CheckCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          Profile &amp; goals locked in — tap any card to edit
        </p>

        <div className="grid grid-cols-2 gap-3">

          {/* Card 1 — Resume */}
          <div
            onMouseEnter={() => setResumeHover(true)}
            onMouseLeave={() => setResumeHover(false)}
            className={`relative bg-white rounded-xl border p-4 flex flex-col cursor-pointer transition-all duration-150
              ${resumeHover
                ? 'border-emerald-300 shadow-[0_2px_12px_rgba(16,185,129,0.10)]'
                : 'border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'}`}
          >
            {/* uploaded dot */}
            <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-emerald-400" />

            {/* action icon */}
            <button
              className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-md flex items-center justify-center transition-colors
                ${resumeHover ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}
              title="Replace resume"
            >
              <UploadCloud className="w-3.5 h-3.5" />
            </button>

            <div className="pt-3">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-1.5">Resume</p>
              <p className="text-[14px] font-semibold text-slate-900 leading-tight">Resume.pdf</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Updated 2 days ago</p>
            </div>

            <p className={`text-[11px] font-medium text-emerald-600 mt-2 transition-opacity duration-150 ${resumeHover ? 'opacity-100' : 'opacity-0'}`}>
              Replace →
            </p>
          </div>

          {/* Card 2 — Target Role */}
          <div
            onMouseEnter={() => setRoleHover(true)}
            onMouseLeave={() => setRoleHover(false)}
            className={`relative bg-white rounded-xl border p-4 flex flex-col cursor-pointer transition-all duration-150
              ${roleHover
                ? 'border-[hsl(221,91%,60%)]/40 shadow-[0_2px_12px_hsl(221,91%,60%)/10]'
                : 'border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'}`}
          >
            <button
              className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-md flex items-center justify-center transition-colors
                ${roleHover ? 'bg-blue-50 text-[hsl(221,91%,55%)]' : 'bg-slate-50 text-slate-400'}`}
              title="Edit target role"
            >
              <Pencil className="w-3 h-3" />
            </button>

            <div className="pt-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-1.5">Target Role</p>
              <p className="text-[14px] font-semibold text-slate-900 leading-tight">Product Manager</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-[hsl(221,91%,55%)] text-[10.5px] font-medium border border-blue-100">
                FAANG track
              </span>
            </div>

            <p className={`text-[11px] font-medium text-[hsl(221,91%,55%)] mt-2 transition-opacity duration-150 ${roleHover ? 'opacity-100' : 'opacity-0'}`}>
              Edit →
            </p>
          </div>

          {/* Card 3 — Target Companies */}
          <div
            onMouseEnter={() => setCoHover(true)}
            onMouseLeave={() => setCoHover(false)}
            className={`relative bg-white rounded-xl border p-4 flex flex-col cursor-pointer transition-all duration-150
              ${coHover
                ? 'border-[hsl(221,91%,60%)]/40 shadow-[0_2px_12px_hsl(221,91%,60%)/10]'
                : 'border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'}`}
          >
            <button
              className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-md flex items-center justify-center transition-colors
                ${coHover ? 'bg-blue-50 text-[hsl(221,91%,55%)]' : 'bg-slate-50 text-slate-400'}`}
              title="Edit target companies"
            >
              <Pencil className="w-3 h-3" />
            </button>

            <div className="pt-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-1.5">Target Companies</p>
              <p className="text-[14px] font-semibold text-slate-900 leading-tight">8 saved</p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">Google, Meta, Stripe +5</p>
            </div>

            <p className={`text-[11px] font-medium text-[hsl(221,91%,55%)] mt-2 transition-opacity duration-150 ${coHover ? 'opacity-100' : 'opacity-0'}`}>
              Edit →
            </p>
          </div>

          {/* Card 4 — AI Practice Set (system-generated, distinct treatment) */}
          <div
            onMouseEnter={() => setAiHover(true)}
            onMouseLeave={() => setAiHover(false)}
            className={`relative bg-white rounded-xl border p-4 flex flex-col cursor-pointer transition-all duration-150
              ${aiHover
                ? 'border-violet-200 shadow-[0_2px_12px_rgba(124,58,237,0.08)]'
                : 'border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'}`}
          >
            {/* view action instead of edit */}
            <button
              className={`absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition-all duration-150
                ${aiHover
                  ? 'bg-violet-50 text-violet-600 border border-violet-100'
                  : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
              title="View AI practice set"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              View
            </button>

            <div className="pt-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-1.5">AI Practice Set</p>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                <p className="text-[14px] font-semibold text-slate-900">Ready</p>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Based on role &amp; resume</p>
            </div>

            <p className={`text-[11px] font-medium text-violet-600 mt-2 flex items-center gap-1 transition-opacity duration-150 ${aiHover ? 'opacity-100' : 'opacity-0'}`}>
              <RefreshCw className="w-3 h-3" /> Regenerate
            </p>
          </div>

        </div>
      </div>

      {/* Divider */}
      <div className="hidden md:block w-px bg-slate-100" />

      {/* ── RIGHT: setup checklist + CTA ── */}
      <div className="flex-1 flex flex-col">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-3">Setup Checklist</p>

        <div className="space-y-1.5 flex-1">
          {[
            { text: 'Upload resume',           sub: 'Resume.pdf',              done: true  },
            { text: 'Set target role',          sub: 'Product Manager',         done: true  },
            { text: 'Select target companies',  sub: '8 companies saved',       done: true  },
            { text: 'Complete onboarding',      sub: 'Profile 85% complete',    done: true  },
          ].map((item, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${item.done ? 'bg-emerald-50/60' : 'bg-slate-50 border border-dashed border-slate-200'}`}
            >
              {item.done
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                : <Circle       className="w-4 h-4 text-slate-300   shrink-0 mt-0.5" />
              }
              <div className="min-w-0">
                <p className={`text-[12.5px] font-medium leading-snug ${item.done ? 'text-slate-600' : 'text-slate-800'}`}>
                  {item.text}
                </p>
                {item.done && item.sub && (
                  <p className="text-[11px] text-emerald-600/80 mt-0.5">{item.sub}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Completion bar */}
        <div className="mt-4 mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-slate-400">Setup complete</span>
            <span className="text-[11px] font-semibold text-emerald-600">4 / 4</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100">
            <div className="h-1.5 w-full rounded-full bg-emerald-400" />
          </div>
        </div>

            {/* Smart CTA — "See my personalized practice" because setup is done */}
            <Link to="/personalized-practice">
              <button className="w-full py-2.5 rounded-lg bg-[hsl(221,91%,60%)] text-white text-[13px] font-semibold hover:bg-[hsl(221,91%,55%)] transition-colors flex items-center justify-center gap-1.5 shadow-[0_2px_8px_hsl(221,91%,60%)/25]">
                See my personalized practice
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
      </div>

    </div>
  );
}

// ─── Practice Stage — Performance & Coaching ────────────────────────────────

function PracticePanel() {
  const [startHover, setStartHover] = useState(false);

  const SCORE_TREND = [
    { s: 'S1', score: 62 },
    { s: 'S2', score: 68 },
    { s: 'S3', score: 71 },
    { s: 'S4', score: 74 },
    { s: 'S5', score: 72 },
    { s: 'S6', score: 78 },
    { s: 'S7', score: 84 },
  ];

  const FOCUS_AREAS = [
    {
      title: 'Product Sense',
      summary:
        'Your answers move to solutions too quickly without clearly framing the user problem or trade-offs.',
      whyFlagged: 'Flagged in 3 of your last 4 product mock sessions.',
      cta: 'Practice Product Sense',
      ctaHref: '/mock-interview',
      border: 'border-amber-100 hover:border-amber-200',
      dot: 'bg-amber-400',
      badge: 'bg-amber-50 text-amber-600',
      btn: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-100',
    },
    {
      title: 'Behavioral Storytelling',
      summary:
        'Your examples have strong context, but the impact and outcome are not stated clearly enough.',
      whyFlagged: 'Consistently flagged across STAR-format scoring rubric.',
      cta: 'Review Feedback',
      ctaHref: '/history',
      border: 'border-rose-100 hover:border-rose-200',
      dot: 'bg-rose-400',
      badge: 'bg-rose-50 text-rose-600',
      btn: 'text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100',
    },
  ];

  const TASKS: { text: string; state: 'completed' | 'active' | 'upcoming'; sub: string }[] = [
    {
      text: 'Review behavioral feedback',
      state: 'completed',
      sub: 'Done · session report saved',
    },
    {
      text: 'Complete 1 system design mock',
      state: 'active',
      sub: 'In progress · highest priority',
    },
    {
      text: 'Practice product sense (AI)',
      state: 'upcoming',
      sub: 'Upcoming · AI-recommended',
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header row ── */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-slate-500 italic">
          You're actively building interview readiness.
        </p>
        <Link
          to="/history"
          className="flex items-center gap-1 text-[12px] font-semibold text-[hsl(221,91%,55%)] hover:text-[hsl(221,91%,45%)] transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          View Interview History
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* ── LEFT ── */}
        <div className="flex-1 flex flex-col gap-4">

          {/* Small summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-3.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-1.5">
                Mocks Completed
              </p>
              <p className="text-[22px] font-bold text-slate-900 leading-none">14</p>
              <p className="text-[11px] text-slate-400 mt-1">4 this week</p>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-3.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-1.5">
                Next Session
              </p>
              <p className="text-[22px] font-bold text-[hsl(221,91%,55%)] leading-none">Today</p>
              <p className="text-[11px] text-slate-400 mt-1">Scheduled · 4:00 PM</p>
            </div>
          </div>

          {/* Performance Trend */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-2">
              Performance Trend
            </p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[26px] font-bold text-slate-900 leading-none">84</span>
              <span className="text-[12px] text-slate-400">/100</span>
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" />
                +6 this week
              </span>
            </div>

            {/* Sparkline */}
            <div className="h-14 -mx-1">
              <ScoreSparkline data={SCORE_TREND} />
            </div>

            <p className="text-[11.5px] text-slate-500 mt-2 leading-snug">
              Your scores are improving steadily — consistency in product sense is the next
              frontier.
            </p>
          </div>

          {/* Focus Areas to Improve */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-2.5">
              Focus Areas to Improve
            </p>
            <div className="flex flex-col gap-2.5">
              {FOCUS_AREAS.map((area) => (
                <div
                  key={area.title}
                  className={`bg-white rounded-xl border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-150 hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)] ${area.border}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${area.dot}`} />
                      <p className="text-[13px] font-semibold text-slate-900">{area.title}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${area.badge}`}>
                      Needs focus
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-600 leading-snug mb-1.5">{area.summary}</p>
                  <p className="text-[11px] text-slate-400 mb-3 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    {area.whyFlagged}
                  </p>
                  <Link to={area.ctaHref}>
                    <button className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-150 ${area.btn}`}>
                      {area.cta} →
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-slate-100" />

        {/* ── RIGHT ── */}
        <div className="flex-1 flex flex-col gap-5">

          {/* Current Tasks */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-3">
              Current Tasks
            </p>
            <div className="space-y-2">
              {TASKS.map((task, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 px-3 py-3 rounded-xl border transition-colors
                    ${task.state === 'completed'
                      ? 'bg-emerald-50/60 border-emerald-100'
                      : task.state === 'active'
                      ? 'bg-blue-50/40 border-blue-100'
                      : 'bg-slate-50 border-slate-100'}`}
                >
                  {task.state === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : task.state === 'active' ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[hsl(221,91%,60%)] shrink-0 mt-0.5 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[hsl(221,91%,60%)]" />
                    </div>
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[12.5px] font-medium leading-snug
                        ${task.state === 'completed'
                          ? 'text-slate-400 line-through'
                          : task.state === 'active'
                          ? 'text-slate-800'
                          : 'text-slate-500'}`}
                    >
                      {task.text}
                    </p>
                    <p
                      className={`text-[10.5px] mt-0.5 font-medium
                        ${task.state === 'completed'
                          ? 'text-emerald-500'
                          : task.state === 'active'
                          ? 'text-[hsl(221,91%,55%)]'
                          : 'text-slate-400'}`}
                    >
                      {task.sub}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI nudge */}
          <div className="p-3 rounded-xl bg-violet-50/50 border border-violet-100/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-500 shrink-0" />
              <span className="text-[11.5px] text-violet-700 font-medium">
                AI: 1 system design session can close your gap
              </span>
            </div>
            <Link to="/mock-interview">
              <button className="text-[11px] font-bold text-violet-600 hover:text-violet-700 whitespace-nowrap">
                Start →
              </button>
            </Link>
          </div>

          {/* CTAs */}
          <div className="mt-auto space-y-2.5">
            <Link to="/mock-interview">
              <button
                onMouseEnter={() => setStartHover(true)}
                onMouseLeave={() => setStartHover(false)}
                className="w-full py-2.5 rounded-lg bg-[hsl(221,91%,60%)] text-white text-[13px] font-semibold hover:bg-[hsl(221,91%,55%)] transition-all flex items-center justify-center gap-2 shadow-[0_2px_8px_hsl(221,91%,60%)/25] px-[0px] py-[10px] mx-[0px] my-[10px]"
              >
                <Mic className="w-3.5 h-3.5" />
                Start Practice
                <ArrowRight
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${startHover ? 'translate-x-0.5' : ''}`}
                />
              </button>
            </Link>
            <Link to="/history">
              <button className="w-full py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-[12.5px] font-medium hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                View Interview History
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Get Support Stage — AI-Routed Human Support ─────────────────────────────

function SupportPanel() {
  const RECOMMENDATIONS: {
    type: string;
    format: string;
    icon: React.ElementType;
    reason: string;
    availability: string;
    cta: string;
    ctaHref: string;
    accent: 'blue' | 'violet' | 'emerald';
    isTop?: boolean;
  }[] = [
    {
      type: 'Mock Coaching',
      format: '1:1 Session',
      icon: Mic,
      reason:
        'Your mock results show weak product sense — a focused coaching session closes this gap faster than solo practice.',
      availability: 'Next slot: Tomorrow, 10 AM',
      cta: 'Book Now',
      ctaHref: '/marketplace',
      accent: 'blue',
      isTop: true,
    },
    {
      type: 'Resume Review',
      format: 'Async Review',
      icon: FileText,
      reason:
        "You're entering the application stage — a strong resume review now gives you the highest ROI before you start applying.",
      availability: 'Response within 48h',
      cta: 'Request Review',
      ctaHref: '/marketplace',
      accent: 'violet',
    },
    {
      type: 'Job Search Advisor',
      format: 'Advisor Support',
      icon: Briefcase,
      reason:
        'Recommended as you approach Apply — strategic guidance now can sharpen your company targeting and outreach.',
      availability: 'On demand',
      cta: 'View Package',
      ctaHref: '/marketplace',
      accent: 'emerald',
    },
  ];

  const HOW_IT_WORKS = [
    { icon: Sparkles,    color: 'text-violet-500', text: 'AI identifies your weak areas and prepares your support context' },
    { icon: Target,      color: 'text-[hsl(221,91%,60%)]', text: 'AI routes you toward the most relevant human support' },
    { icon: Users,       color: 'text-emerald-500', text: 'Human mentors handle strategy, nuance, and judgment calls' },
    { icon: ShieldCheck, color: 'text-slate-400',   text: 'High-stakes guidance is always human-led, never automated' },
  ];

  const OTHER_HELP = [
    { icon: MessageSquare, label: 'Discord Office Hours', sub: 'Live Q&A, twice weekly',   href: '#' },
    { icon: Users,         label: 'Member Community',    sub: 'Ask peers and coaches',    href: '#' },
    { icon: Search,        label: 'Browse All Mentors',  sub: '40+ verified experts',     href: '/marketplace' },
    { icon: Mail,          label: 'Message Support',     sub: 'Response within 24h',      href: '#' },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <p className="text-[12px] text-slate-500 italic">
        The right support is being organized for you — based on your stage and performance.
      </p>

      {/* ── Main two-column layout ── */}
      <div className="flex flex-col md:flex-row gap-6">

        {/* LEFT: Recommended Support */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400">
              Recommended Support for You
            </p>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
              <Sparkles className="w-2.5 h-2.5" /> AI-routed
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {RECOMMENDATIONS.map((rec) => {
              const RecIcon = rec.icon;
              return (
                <div
                  key={rec.type}
                  className={`bg-white rounded-xl border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-150 hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)] hover:border-slate-300
                    ${rec.isTop ? 'border-[hsl(221,91%,60%)]/30' : 'border-slate-200'}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                        ${rec.accent === 'blue' ? 'bg-blue-50' : rec.accent === 'violet' ? 'bg-violet-50' : 'bg-emerald-50'}`}>
                        <RecIcon className={`w-4 h-4
                          ${rec.accent === 'blue' ? 'text-[hsl(221,91%,60%)]' : rec.accent === 'violet' ? 'text-violet-500' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-slate-900 leading-tight">{rec.type}</p>
                        <span className="text-[10.5px] text-slate-400 font-medium">{rec.format}</span>
                      </div>
                    </div>
                    {rec.isTop && (
                      <span className="text-[10px] font-semibold text-[hsl(221,91%,55%)] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        Top Pick
                      </span>
                    )}
                  </div>

                  <p className="text-[12px] text-slate-600 leading-snug mb-3">{rec.reason}</p>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3 shrink-0" />
                      {rec.availability}
                    </span>
                    <Link to={rec.ctaHref}>
                      <button className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-lg transition-all duration-150
                        ${rec.isTop
                          ? 'bg-[hsl(221,91%,60%)] text-white hover:bg-[hsl(221,91%,55%)] shadow-[0_1px_6px_hsl(221,91%,60%)/25]'
                          : 'text-[hsl(221,91%,55%)] bg-blue-50 hover:bg-blue-100 border border-blue-100'}`}>
                        {rec.cta} →
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-slate-100" />

        {/* RIGHT: Status + How it works */}
        <div className="flex-1 flex flex-col gap-4">

          {/* Support Status */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-3">
              Your Support Status
            </p>

            {/* Empty state */}
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 flex flex-col items-center text-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-[12.5px] font-medium text-slate-700">No support sessions booked yet</p>
              <p className="text-[11px] text-slate-400 leading-snug max-w-[200px]">
                Start with the recommended options above to get your first session.
              </p>
            </div>

            {/* Mode indicator */}
            <div className="flex items-center justify-between px-3 py-2.5 bg-white rounded-xl border border-slate-100">
              <span className="text-[11.5px] text-slate-600 font-medium">Current support mode</span>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                Self-serve
              </span>
            </div>
          </div>

          {/* How Support Works */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-2.5">
              How Support Works
            </p>
            <div className="bg-gradient-to-br from-blue-50/50 to-violet-50/30 rounded-xl border border-blue-100/60 p-4">
              <p className="text-[12px] font-semibold text-slate-800 mb-3">AI + Human, in the right order</p>
              <div className="space-y-2.5">
                {HOW_IT_WORKS.map((item, i) => {
                  const ItemIcon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <ItemIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${item.color}`} />
                      <p className="text-[11.5px] text-slate-600 leading-snug">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: Other Ways to Get Help ── */}
      <div className="pt-4 border-t border-slate-100">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-3">
          Other Ways to Get Help
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {OTHER_HELP.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link key={item.label} to={item.href}>
                <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50 transition-all duration-150 cursor-pointer group">
                  <ItemIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  <p className="text-[12px] font-medium text-slate-700 leading-tight">{item.label}</p>
                  <p className="text-[10.5px] text-slate-400">{item.sub}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ─── Apply Stage — Job-Search Operations Panel ───────────────────────────────

function ApplyPanel() {
  const [viewState, setViewState] = useState<'active' | 'approval' | 'outreach'>('approval');
  const [autoApply, setAutoApply] = useState(false);

  const PIPELINE_STAGES = [
    { label: 'Matched',      count: 24, barColor: 'bg-slate-300',              textColor: 'text-slate-500'            },
    { label: 'Queued',       count: 8,  barColor: 'bg-blue-200',               textColor: 'text-blue-500'             },
    { label: 'Submitted',    count: 12, barColor: 'bg-[hsl(221,91%,72%)]',     textColor: 'text-[hsl(221,91%,50%)]'  },
    { label: 'Viewed',       count: 5,  barColor: 'bg-[hsl(221,91%,60%)]',     textColor: 'text-[hsl(221,91%,45%)]'  },
    { label: 'Interviewing', count: 3,  barColor: 'bg-[hsl(221,91%,45%)]',     textColor: 'text-[hsl(221,91%,35%)]'  },
    { label: 'Closed',       count: 6,  barColor: 'bg-slate-200',              textColor: 'text-slate-400'            },
  ];

  const ACTIONS: {
    title: string;
    context: string;
    urgency: string;
    urgencyColor: 'rose' | 'amber' | 'slate';
    cta: string;
  }[] = [
    {
      title: 'Approve 3 shortlisted jobs',
      context: 'AI matched these roles to your profile — confirm before submitting.',
      urgency: 'Today',
      urgencyColor: 'rose',
      cta: 'Review Now',
    },
    {
      title: 'Follow up on 3 applications',
      context: 'Stripe, Notion, Linear — no response after 7 days.',
      urgency: '2 days',
      urgencyColor: 'amber',
      cta: 'Send Follow-up',
    },
    {
      title: 'Review auto-apply settings',
      context: 'Auto-apply is paused. Enable to resume automated submissions.',
      urgency: 'Pending',
      urgencyColor: 'slate',
      cta: 'Open Settings',
    },
    {
      title: 'Update resume version',
      context: 'Current version is 3 weeks old — a refresh may improve match rates.',
      urgency: 'This week',
      urgencyColor: 'slate',
      cta: 'Upload New',
    },
  ];

  const SHORTLISTED = [
    {
      role: 'Senior Product Manager',
      company: 'Linear',
      meta: 'Remote · Series B · $160–190K',
      why: 'Strong match on product sense signals and your target company list',
    },
    {
      role: 'Product Manager, Growth',
      company: 'Notion',
      meta: 'Hybrid, NYC · $145–175K',
      why: 'Matches your stated preference for B2B SaaS growth roles',
    },
    {
      role: 'Associate PM',
      company: 'Figma',
      meta: 'Remote · $130–155K',
      why: 'Referral opportunity available through your network',
    },
  ];

  const PREFERENCES = [
    { label: 'Target roles',    value: 'PM, APM, Growth PM'         },
    { label: 'Company type',    value: 'Series B–D, growth-stage'   },
    { label: 'Location',        value: 'Remote · NYC preferred'     },
    { label: 'Salary floor',    value: '$130,000 / year'            },
    { label: 'Visa sponsorship',value: 'Required'                   },
    { label: 'Approval mode',   value: 'Review before submit'       },
  ];

  const maxPipeline = Math.max(...PIPELINE_STAGES.map(s => s.count));

  const OUTREACH_CARDS: {
    label: string;
    value: string;
    sub: string;
    icon: React.ElementType;
    accent: 'neutral' | 'blue' | 'amber' | 'rose';
  }[] = [
    { label: 'Outreach Sent',      value: '8 emails', sub: 'Last 7 days',        icon: Send,          accent: 'neutral' },
    { label: 'Replies Waiting',    value: '2',        sub: 'Awaiting response',   icon: MessageSquare, accent: 'blue'    },
    { label: 'Referral Requests',  value: '3',        sub: 'In progress',         icon: Users,         accent: 'amber'   },
    { label: 'Follow-up Due',      value: '1 today',  sub: 'Action required',     icon: Clock,         accent: 'rose'    },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* ── State tabs ── */}
      <div className="flex items-center gap-1 p-1 bg-slate-50 border border-slate-100 rounded-lg self-start">
        {([
          { id: 'active',   label: 'Auto-apply on'   },
          { id: 'approval', label: 'Approval needed'  },
          { id: 'outreach', label: 'Outreach active'  },
        ] as const).map(s => (
          null
        ))}
      </div>

      {/* ── Overview stat row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {/* Applications sent */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-[10.5px] font-medium text-slate-400 mb-2">Applications Sent</p>
          <p className="text-[24px] font-semibold text-slate-900 leading-none">12</p>
          <p className="text-[10.5px] text-slate-400 mt-1.5">Total submitted</p>
        </div>

        {/* In process */}
        <div className="bg-white rounded-xl border border-blue-100 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-[10.5px] font-medium text-slate-400 mb-2">In Process</p>
          <div className="flex items-baseline gap-2">
            <p className="text-[24px] font-semibold text-[hsl(221,91%,55%)] leading-none">3</p>
            <span className="text-[10px] font-semibold text-[hsl(221,91%,55%)] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">Active</span>
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1.5">Interviewing now</p>
        </div>

        {/* Referrals */}
        <div className="bg-white rounded-xl border border-amber-100 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-[10.5px] font-medium text-slate-400 mb-2">Referrals Available</p>
          <div className="flex items-baseline gap-2">
            <p className="text-[24px] font-semibold text-amber-600 leading-none">2</p>
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">Act now</span>
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1.5">Network matches</p>
        </div>

        {/* Auto-apply toggle */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-[10.5px] font-medium text-slate-400 mb-2">Auto-Apply</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoApply(p => !p)}
              className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${autoApply ? 'bg-[hsl(221,91%,60%)]' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${autoApply ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
            <span className={`text-[12px] font-medium ${autoApply ? 'text-[hsl(221,91%,55%)]' : 'text-slate-400'}`}>
              {autoApply ? 'On' : 'Paused'}
            </span>
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1.5">
            {autoApply ? '8 jobs / week limit' : 'Manual approval mode'}
          </p>
        </div>
      </div>

      {/* ── Mid: two-column layout ── */}
      <div className="flex flex-col md:flex-row gap-6">

        {/* ── LEFT: Pipeline + Shortlisted ── */}
        <div className="flex-1 flex flex-col gap-5">

          {/* Pipeline */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-2.5">
              Application Pipeline
            </p>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              {/* Bar chart */}
              <div className="flex items-end gap-1.5 h-10 mb-2">
                {PIPELINE_STAGES.map((stage) => {
                  const pct = Math.max(12, Math.round((stage.count / maxPipeline) * 100));
                  return (
                    <div key={stage.label} className="flex-1 flex flex-col justify-end">
                      <div
                        className={`w-full rounded-sm ${stage.barColor} transition-all`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              {/* Counts + labels */}
              <div className="flex gap-1.5">
                {PIPELINE_STAGES.map((stage, i) => (
                  <div key={stage.label} className="flex-1 text-center">
                    <p className={`text-[13px] font-semibold ${stage.textColor}`}>{stage.count}</p>
                    <p className="text-[9px] text-slate-400 leading-tight mt-0.5 truncate">{stage.label}</p>
                  </div>
                ))}
              </div>
              {/* Flow indicator */}
              <div className="flex items-center mt-3 pt-3 border-t border-slate-50">
                {PIPELINE_STAGES.map((stage, i) => (
                  <div key={stage.label} className="flex items-center flex-1">
                    <span className={`text-[9.5px] font-medium truncate flex-1 ${i === 4 ? stage.textColor + ' font-semibold' : 'text-slate-400'}`}>
                      {stage.label}
                    </span>
                    {i < PIPELINE_STAGES.length - 1 && (
                      <ChevronRight className="w-2.5 h-2.5 text-slate-200 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Shortlisted matches */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400">
                Queued for Your Review
              </p>
              <span className="text-[10px] font-semibold text-[hsl(221,91%,55%)] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">
                3 pending
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {SHORTLISTED.map((job) => (
                <div
                  key={job.role + job.company}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors"
                >
                  <div className="mb-1.5">
                    <p className="text-[13px] font-semibold text-slate-900 leading-tight">{job.role}</p>
                    <p className="text-[11.5px] text-slate-500 mt-0.5">{job.company} · {job.meta}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3 flex items-start gap-1.5">
                    <Sparkles className="w-3 h-3 shrink-0 mt-0.5 text-violet-400" />
                    {job.why}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button className="text-[11.5px] font-semibold px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white hover:bg-[hsl(221,91%,55%)] transition-colors shadow-[0_1px_4px_hsl(221,91%,60%)/20]">
                      Approve
                    </button>
                    <button className="text-[11.5px] font-medium px-3 py-1 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                      Skip
                    </button>
                    <button className="text-[11.5px] font-medium px-3 py-1 rounded-lg text-[hsl(221,91%,55%)] hover:bg-blue-50 transition-colors ml-auto flex items-center gap-1">
                      View <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-slate-100" />

        {/* ── RIGHT: Actions + Preferences ── */}
        <div className="flex-1 flex flex-col gap-5">

          {/* Actions needed */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400">
                Actions Needed
              </p>
              <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full">
                1 today
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {ACTIONS.map((action, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    action.urgencyColor === 'rose'
                      ? 'border-rose-100 bg-rose-50/25'
                      : 'border-slate-100 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[12.5px] font-semibold text-slate-900 leading-snug">{action.title}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                      action.urgencyColor === 'rose'  ? 'text-rose-600 bg-rose-100 border border-rose-200'
                      : action.urgencyColor === 'amber' ? 'text-amber-600 bg-amber-50 border border-amber-100'
                      : 'text-slate-400 bg-slate-100'
                    }`}>
                      {action.urgency}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-500 leading-snug mb-2.5">{action.context}</p>
                  <button className={`text-[11.5px] font-semibold px-3 py-1 rounded-lg transition-all ${
                    action.urgencyColor === 'rose'
                      ? 'bg-[hsl(221,91%,60%)] text-white hover:bg-[hsl(221,91%,55%)] shadow-[0_1px_4px_hsl(221,91%,60%)/20]'
                      : 'text-[hsl(221,91%,55%)] bg-blue-50 hover:bg-blue-100 border border-blue-100'
                  }`}>
                    {action.cta} →
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Preferences & controls */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400">
                Preferences & Controls
              </p>
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <div className="divide-y divide-slate-50">
                {PREFERENCES.map((pref) => (
                  <div key={pref.label} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <span className="text-[11.5px] text-slate-500 shrink-0">{pref.label}</span>
                    <span className="text-[11.5px] font-medium text-slate-800 text-right">{pref.value}</span>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full py-2 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5">
                <Pencil className="w-3.5 h-3.5 text-slate-400" />
                Edit Preferences
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Bottom row: Outreach & Networking ── */}
      <div className="pt-4 border-t border-slate-100">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-3">
          Outreach & Networking
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {OUTREACH_CARDS.map((card) => {
            const CardIcon = card.icon;
            return (
              <div
                key={card.label}
                className={`bg-white rounded-xl border p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] ${
                  card.accent === 'rose' ? 'border-rose-100' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10.5px] font-medium text-slate-400">{card.label}</p>
                  <CardIcon className={`w-3.5 h-3.5 ${
                    card.accent === 'blue'    ? 'text-[hsl(221,91%,60%)]'
                    : card.accent === 'amber' ? 'text-amber-400'
                    : card.accent === 'rose'  ? 'text-rose-400'
                    : 'text-slate-400'
                  }`} />
                </div>
                <p className={`text-[20px] font-semibold leading-none ${
                  card.accent === 'blue'    ? 'text-[hsl(221,91%,55%)]'
                  : card.accent === 'amber' ? 'text-amber-600'
                  : card.accent === 'rose'  ? 'text-rose-500'
                  : 'text-slate-900'
                }`}>
                  {card.value}
                </p>
                <p className="text-[10.5px] text-slate-400 mt-1.5">{card.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ─── Score sparkline (pure SVG — no Recharts, no ResizeObserver warnings) ────

interface SparkPoint { score: number }

function ScoreSparkline({ data }: { data: SparkPoint[] }) {
  const W = 240;
  const H = 48;
  const PAD = 4;
  const scores = data.map((d) => d.score);
  const min = Math.min(...scores) - 4;
  const max = Math.max(...scores) + 4;
  const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - PAD * 2));
  const ys = scores.map((s) => H - PAD - ((s - min) / (max - min)) * (H - PAD * 2));
  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  const areaPath = `${linePath} L${xs[xs.length - 1]},${H} L${xs[0]},${H} Z`;
  const last = { x: xs[xs.length - 1], y: ys[ys.length - 1] };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(221,91%,60%)" stopOpacity={0.18} />
          <stop offset="100%" stopColor="hsl(221,91%,60%)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path d={linePath} fill="none" stroke="hsl(221,91%,60%)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={3} fill="hsl(221,91%,60%)" />
    </svg>
  );
}

// ─── Salary bar chart (pure SVG — avoids Recharts internal key collisions) ───

interface SalaryBar { label: string; value: number; fill: string }

function SalaryBarChart({ data }: { data: SalaryBar[] }) {
  const MIN = 120000;
  const MAX = 200000;
  const H   = 80;   // usable bar area height (px, inside SVG)
  const W   = 240;  // total SVG viewBox width
  const barW = 36;
  const gap  = (W - data.length * barW) / (data.length + 1);

  return (
    <svg viewBox={`0 0 ${W} 112`} className="w-full h-full" aria-hidden="true">
      {data.map((d, i) => {
        const ratio  = (d.value - MIN) / (MAX - MIN);
        const barH   = Math.max(4, ratio * H);
        const x      = gap + i * (barW + gap);
        const y      = H - barH + 8; // 8px top padding
        return (
          <g key={d.label}>
            {/* bar */}
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.fill} />
            {/* value label above bar */}
            <text
              x={x + barW / 2}
              y={y - 4}
              textAnchor="middle"
              fontSize={9}
              fontWeight={600}
              fill={d.fill}
            >
              ${d.value / 1000}K
            </text>
            {/* axis label below */}
            <text
              x={x + barW / 2}
              y={100}
              textAnchor="middle"
              fontSize={9}
              fill="#94a3b8"
            >
              {d.label}
            </text>
          </g>
        );
      })}
      {/* baseline */}
      <line x1={0} y1={88} x2={W} y2={88} stroke="#f1f5f9" strokeWidth={1} />
    </svg>
  );
}

// ─── Offer & Grow Stage — Salary Negotiation Dashboard ──────────────────────

function OfferGrowPanel() {
  const SALARY_DATA = [
    { label: 'Your Offer', value: 175000, fill: 'hsl(221,91%,60%)' },
    { label: 'Market',     value: 162000, fill: '#cbd5e1'           },
    { label: 'Target',     value: 185000, fill: '#10b981'           },
  ];

  const OFFER_ROWS = [
    { label: 'Base salary',  value: '$175,000'          },
    { label: 'Equity',       value: '$120K over 4 yrs'  },
    { label: 'Annual bonus', value: '$20,000'            },
    { label: 'Total comp',   value: '~$225K / year',   highlight: true  },
    { label: 'Deadline',     value: 'April 13 · 3 days', urgent: true   },
  ];

  const COACHING_TASKS: {
    title: string;
    context: string;
    urgency: string;
    urgencyColor: 'rose' | 'amber' | 'slate';
    cta: string;
  }[] = [
    {
      title: 'Counter with $190K base',
      context: 'Screna has a negotiation script ready — market data supports this ask.',
      urgency: 'Expires in 6 hrs',
      urgencyColor: 'rose',
      cta: 'Review Script',
    },
    {
      title: 'Request 1-year cliff removal',
      context: 'Standard 4-yr vest with 1-yr cliff — Notion has accepted modified vesting before.',
      urgency: 'Due today',
      urgencyColor: 'amber',
      cta: 'See Talking Points',
    },
    {
      title: 'Clarify signing bonus',
      context: 'No signing bonus mentioned. Screna flagged this as negotiable based on role level.',
      urgency: 'No deadline',
      urgencyColor: 'slate',
      cta: 'View Draft',
    },
  ];

  const ROADMAP = [
    { days: 'Day 1–30',  title: 'Ramp & Relationships',  desc: 'Meet key stakeholders, understand org structure, establish trust.'    },
    { days: 'Day 31–60', title: 'First Deliverable',      desc: 'Ship one visible initiative. Prove execution speed early.'            },
    { days: 'Day 61–90', title: 'Strategic Ownership',    desc: 'Own a roadmap area. Set the narrative for your first perf review.'   },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* ── Overview stat row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        <div className="bg-white rounded-xl border border-amber-100 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-[10.5px] font-medium text-slate-400 mb-2">Active Offers</p>
          <div className="flex items-baseline gap-2">
            <p className="text-[24px] font-semibold text-amber-600 leading-none">1</p>
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">New</span>
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1.5">Notion · Growth PM</p>
        </div>

        <div className="bg-white rounded-xl border border-emerald-100 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-[10.5px] font-medium text-slate-400 mb-2">Salary vs. Market</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-[24px] font-semibold text-emerald-600 leading-none">+8%</p>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 self-center" />
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1.5">Above median</p>
        </div>

        <div className="bg-white rounded-xl border border-blue-100 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-[10.5px] font-medium text-slate-400 mb-2">Negotiation Score</p>
          <div className="flex items-baseline gap-1">
            <p className="text-[24px] font-semibold text-[hsl(221,91%,55%)] leading-none">82</p>
            <span className="text-[12px] text-slate-400">/100</span>
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1.5">Strong position</p>
        </div>

        <div className="bg-white rounded-xl border border-rose-100 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-[10.5px] font-medium text-slate-400 mb-2">Decision Deadline</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-[24px] font-semibold text-rose-500 leading-none">3</p>
            <span className="text-[12px] text-rose-400">days</span>
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1.5">April 13 · Act now</p>
        </div>
      </div>

      {/* ── Mid: two-column ── */}
      <div className="flex flex-col md:flex-row gap-6">

        {/* ── LEFT: Salary Benchmark + Offer Details ── */}
        <div className="flex-1 flex flex-col gap-5">

          {/* Salary benchmark chart */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-2.5">
              Salary Benchmark
            </p>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <div className="h-28 w-full">
                <SalaryBarChart data={SALARY_DATA} />
              </div>
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-50">
                {SALARY_DATA.map(d => (
                  <div key={d.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                    <span className="text-[10.5px] text-slate-500">{d.label}</span>
                    <span className="text-[10.5px] font-semibold text-slate-700">${d.value / 1000}K</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Offer details */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400">
                Offer Details
              </p>
              <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                Verbal — not yet signed
              </span>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-slate-50">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Award className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-900 leading-tight">Notion · Growth PM</p>
                  <p className="text-[11px] text-slate-400">Verbal offer received</p>
                </div>
                <span className="ml-auto text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">
                  +8% above market
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {OFFER_ROWS.map(row => (
                  <div key={row.label} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                    <span className="text-[11.5px] text-slate-500 shrink-0">{row.label}</span>
                    <span className={`text-[11.5px] font-semibold text-right ${
                      row.urgent    ? 'text-rose-500'
                      : row.highlight ? 'text-slate-900'
                      : 'text-slate-700'
                    }`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-slate-100" />

        {/* ── RIGHT: Negotiation Coaching + 90-Day Roadmap ── */}
        <div className="flex-1 flex flex-col gap-5">

          {/* Negotiation coaching tasks */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400">
                Negotiation Coaching
              </p>
              <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full">
                1 expiring
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {COACHING_TASKS.map((task, i) => (
                <div
                  key={i}
                  className={`rounded-xl border-[0.5px] border-l-2 p-3.5 transition-colors ${
                    task.urgencyColor === 'rose'
                      ? 'border-rose-100 border-l-rose-400 bg-rose-50/20'
                      : task.urgencyColor === 'amber'
                      ? 'border-amber-100 border-l-amber-400 bg-amber-50/10'
                      : 'border-slate-100 border-l-slate-100 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[12.5px] font-semibold text-slate-900 leading-snug">{task.title}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                      task.urgencyColor === 'rose'   ? 'text-rose-600 bg-rose-100 border border-rose-200'
                      : task.urgencyColor === 'amber' ? 'text-amber-600 bg-amber-50 border border-amber-100'
                      : 'text-slate-400 bg-slate-100'
                    }`}>
                      {task.urgency}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-500 leading-snug mb-2.5 flex items-start gap-1.5">
                    <Sparkles className="w-3 h-3 shrink-0 mt-0.5 text-violet-400" />
                    {task.context}
                  </p>
                  <button className={`text-[11.5px] font-semibold px-3 py-1 rounded-lg transition-all ${
                    task.urgencyColor === 'rose'
                      ? 'bg-[hsl(221,91%,60%)] text-white hover:bg-[hsl(221,91%,55%)] shadow-[0_1px_4px_hsl(221,91%,60%)/20]'
                      : 'text-[hsl(221,91%,55%)] bg-blue-50 hover:bg-blue-100 border border-blue-100'
                  }`}>
                    {task.cta} →
                  </button>
                  {task.urgencyColor === 'rose' && (
                    <p className="text-[10.5px] text-rose-400 mt-2">Will be skipped if no action taken.</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 90-day growth roadmap */}
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-slate-400 mb-2.5">
              90-Day Growth Roadmap
            </p>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <div className="flex flex-col gap-3">
                {ROADMAP.map((milestone, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-slate-400">{i + 1}</span>
                      </div>
                      {i < ROADMAP.length - 1 && (
                        <div className="w-px flex-1 bg-slate-100 min-h-[12px]" />
                      )}
                    </div>
                    <div className="pb-2">
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full">
                        {milestone.days}
                      </span>
                      <p className="text-[12.5px] font-semibold text-slate-800 mt-1.5">{milestone.title}</p>
                      <p className="text-[11.5px] text-slate-500 leading-snug mt-0.5">{milestone.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-3 w-full py-2 rounded-lg border border-slate-200 text-slate-600 text-[12px] font-medium hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-slate-400" />
                Customize Roadmap
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

// ─── Career Command Center ──────────────────────────────────────────────────

function CareerCommandCenter() {
  const [activeStage, setActiveStage] = useState('practice');

  const expanded = CAREER_STAGES.find(s => s.id === activeStage)!;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 tracking-tight">Career Command Center</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Your guided journey from preparation to offer</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[11px] font-semibold border border-blue-100">
          Stage 2 of 5
        </span>
      </div>

      {/* Stage rail */}
      <div className="flex items-stretch border-b border-slate-100 overflow-x-auto">
        {CAREER_STAGES.map((stage, idx) => {
          const isActive = stage.id === activeStage;
          const isCompleted = stage.status === 'completed';
          const isLocked = stage.status === 'locked';
          const StageIcon = stage.icon;
          return (
            <button
              key={stage.id}
              onClick={() => setActiveStage(stage.id)}
              className={`flex-1 min-w-[120px] flex flex-col items-center gap-1.5 px-4 py-4 text-center transition-all duration-150 relative group
                ${isActive ? 'bg-[hsl(221,91%,60%)]/5' : 'hover:bg-slate-50'}
                ${isLocked ? 'opacity-50 cursor-default' : 'cursor-pointer'}
              `}
            >
              {/* Active indicator */}
              {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(221,91%,60%)]" />}

              {/* Icon / Status */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors
                ${isCompleted ? 'bg-emerald-100' : isActive ? 'bg-[hsl(221,91%,60%)]/12' : 'bg-slate-100'}
              `}>
                {isCompleted
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  : isLocked
                  ? <Lock className="w-3.5 h-3.5 text-slate-400" />
                  : <StageIcon className={`w-4 h-4 ${isActive ? 'text-[hsl(221,91%,60%)]' : 'text-slate-500'}`} />
                }
              </div>

              <span className={`text-[12px] font-medium whitespace-nowrap
                ${isActive ? 'text-[hsl(221,91%,55%)]' : isCompleted ? 'text-emerald-700' : 'text-slate-500'}
              `}>
                {stage.name}
              </span>

              {isCompleted && (
                <span className="text-[10px] text-emerald-500 font-medium">Done</span>
              )}
              {isActive && (
                <span className="text-[10px] text-blue-500 font-semibold">Active</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStage}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="px-6 py-5"
        >
          {/* Detailed stage panels */}
          {activeStage === 'understand' ? (
            <UnderstandPanel />
          ) : activeStage === 'practice' ? (
            <PracticePanel />
          ) : activeStage === 'support' ? (
            <SupportPanel />
          ) : activeStage === 'apply' ? (
            <ApplyPanel />
          ) : activeStage === 'offer' ? (
            <OfferGrowPanel />
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: stats */}
              <div className="flex-1">
                <p className="text-[12.5px] text-slate-500 mb-4 italic">{expanded.tagline}</p>
                <div className="grid grid-cols-2 gap-3">
                  {expanded.stats.map((stat) => (
                    <div key={stat.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[11px] text-slate-400 mb-1">{stat.label}</p>
                      <p className={`text-[14px] font-semibold ${stat.highlight ? 'text-[hsl(221,91%,55%)]' : 'text-slate-800'}`}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px bg-slate-100" />

              {/* Right: tasks + CTA */}
              <div className="flex-1 flex flex-col">
                <p className="text-[11.5px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Current Tasks</p>
                <div className="space-y-2.5 flex-1">
                  {expanded.tasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      {task.done
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        : <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                      }
                      <span className={`text-[13px] ${task.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {task.text}
                      </span>
                    </div>
                  ))}
                </div>

                <Link to={expanded.ctaHref} className="mt-5">
                  <button className="w-full py-2.5 rounded-lg bg-[hsl(221,91%,60%)] text-white text-[13px] font-semibold hover:bg-[hsl(221,91%,55%)] transition-colors flex items-center justify-center gap-1.5 shadow-[0_2px_8px_hsl(221,91%,60%)/25]">
                    {expanded.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Today's Focus ──────────────────────────────────────────────────────────

function TodayFocus() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">Today's Focus</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">4 actions, prioritized for you</p>
        </div>
        <span className="flex items-center gap-1 text-[12px] text-slate-400">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          AI-curated
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {FOCUS_ACTIONS.map((action) => {
          const ActionIcon = action.icon;
          return (
            <motion.div
              key={action.id}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-slate-300 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <ActionIcon className="w-4 h-4 text-slate-500" />
                </div>
                <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${badgeStyles[action.badgeColor]}`}>
                  {action.badge}
                </span>
              </div>

              <div className="flex-1">
                <p className="text-[13px] font-semibold text-slate-900 mb-1 leading-snug">{action.title}</p>
                <p className="text-[12px] text-slate-500 leading-relaxed">{action.description}</p>
              </div>

              <div className="flex items-center justify-between mt-auto pt-1">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {action.estimate}
                </span>
                <Link to={action.href}>
                  <button className="text-[12px] font-semibold text-[hsl(221,91%,60%)] flex items-center gap-1 hover:gap-1.5 transition-all duration-150">
                    {action.cta} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Application Command Center ─────────────────────────────────────────────

function ApplicationCommandCenter() {
  return (
    null
  );
}

// ─── Personalized Practice ──────────────────────────────────────────────────

function PersonalizedPractice({ sessions }: { sessions?: RecentSession[] }) {
  const displaySessions = sessions && sessions.length > 0 ? sessions : RECENT_SESSIONS;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-slate-900">Personalized Practice</h2>
          <p className="text-[11.5px] text-slate-400 mt-0.5">Tailored to Product Manager · FAANG track</p>
        </div>
        <Link to="/personalized-practice">
          <button className="text-[12px] text-[hsl(221,91%,55%)] font-semibold hover:text-[hsl(221,91%,45%)] transition-colors">
            View All →
          </button>
        </Link>
      </div>

      <div className="px-5 py-4">
        {/* Weak area badge */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 mb-4">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <p className="text-[12.5px] text-slate-700">
            <span className="font-semibold">Weak areas flagged:</span>{' '}
            System Design, Product Strategy — focus practice here
          </p>
        </div>

        {/* Recent sessions */}
        <SectionLabel>Recent Sessions</SectionLabel>
        <div className="space-y-1 mb-4">
          {displaySessions.map((session, i) => (
            <div key={session.id} className={`flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer ${i < displaySessions.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <ScoreRing score={session.score} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-900 truncate">{session.title}</p>
                <p className="text-[11px] text-slate-400">{session.date}</p>
              </div>
              <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full
                ${session.tag === 'Technical' ? 'bg-blue-50 text-blue-600' : session.tag === 'Behavioral' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-600'}
              `}>
                {session.tag}
              </span>
            </div>
          ))}
        </div>

        <Link to="/mock-interview">
          <button className="w-full py-2.5 rounded-lg bg-[hsl(221,91%,60%)] text-white text-[13px] font-semibold hover:bg-[hsl(221,91%,55%)] transition-colors flex items-center justify-center gap-1.5 shadow-[0_2px_8px_hsl(221,91%,60%)/20]">
            <Mic className="w-3.5 h-3.5" /> Start Mock Session
          </button>
        </Link>
      </div>
    </div>
  );
}

// ─── Mentorship & Sessions ──────────────────────────────────────────────────

function MentorshipSessions() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <h2 className="text-[14px] font-semibold text-slate-900">Mentorship & Sessions</h2>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Upcoming session */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-[hsl(221,91%,60%)]/6 to-[hsl(221,91%,60%)]/3 border border-[hsl(221,91%,60%)]/15">
          <div className="flex items-start gap-3 mb-3">
            <img
              src="https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=80"
              alt="Priya Mehta"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-900">Priya Mehta</p>
              <p className="text-[11.5px] text-slate-500">PM Interviews · Google</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Calendar className="w-3 h-3 text-[hsl(221,91%,60%)]" />
                <span className="text-[11.5px] text-[hsl(221,91%,55%)] font-medium">Tomorrow, 10:00 AM</span>
              </div>
            </div>
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10.5px] font-semibold">Confirmed</span>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-2 rounded-lg bg-[hsl(221,91%,60%)] text-white text-[12.5px] font-semibold hover:bg-[hsl(221,91%,55%)] transition-colors">
              Join Session
            </button>
            <button className="px-3 py-2 rounded-lg border border-[hsl(221,91%,60%)]/20 text-[hsl(221,91%,55%)] text-[12px] hover:bg-[hsl(221,91%,60%)]/8 transition-colors">
              Reschedule
            </button>
          </div>
        </div>

        {/* After-session block */}
        <div className="p-3 rounded-xl border border-slate-100 bg-slate-50">
          <p className="text-[11.5px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Previous Session</p>
          <p className="text-[12.5px] text-slate-700 mb-3">Career Strategy · James Liu <span className="text-slate-400">· Apr 2</span></p>
          <div className="flex gap-2">
            <button className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-600 font-medium hover:border-slate-300 transition-colors">
              View Notes
            </button>
            <button className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-600 font-medium hover:border-slate-300 transition-colors flex items-center justify-center gap-1">
              <Star className="w-3 h-3 text-amber-400" /> Rate
            </button>
          </div>
        </div>

        <Link to="/marketplace">
          <button className="w-full py-2 rounded-lg border border-slate-200 text-slate-600 text-[12.5px] font-medium hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" /> Browse More Mentors
          </button>
        </Link>
      </div>
    </div>
  );
}

// ─── Progress & Momentum ────────────────────────────────────────────────────

function ProgressMomentum() {
  const MILESTONES = [
    { label: 'First mock',   done: true  },
    { label: '10 sessions',  done: true  },
    { label: '25 sessions',  done: false },
    { label: 'Mentor booked',done: false },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-slate-900">Progress & Momentum</h2>
        <span className="flex items-center gap-1 text-[12px] text-orange-500 font-semibold">
          <Flame className="w-3.5 h-3.5" /> 6-day streak
        </span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Mocks this week', value: '4', icon: Mic, color: 'text-blue-500' },
            { label: 'Avg score trend', value: '+8 pts', icon: TrendingUp, color: 'text-emerald-500' },
            { label: 'Weak areas improved', value: '1 of 2', icon: Target, color: 'text-violet-500' },
            { label: 'Apps submitted', value: '12', icon: Briefcase, color: 'text-amber-500' },
          ].map((s) => {
            const SIcon = s.icon;
            return (
              <div key={s.label} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <SIcon className={`w-3.5 h-3.5 ${s.color} mb-1.5`} />
                <p className="text-[15px] font-semibold text-slate-900">{s.value}</p>
                <p className="text-[10.5px] text-slate-400">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Weekly goal */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-medium text-slate-600">Weekly goal</span>
            <span className="text-[12px] font-semibold text-slate-800">4 / 5 mocks</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-[hsl(221,91%,60%)]" style={{ width: '80%' }} />
          </div>
        </div>

        {/* Milestones */}
        <div>
          <SectionLabel>Milestones</SectionLabel>
          <div className="flex items-center justify-between gap-1">
            {MILESTONES.map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${m.done ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  {m.done
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    : <Circle className="w-3.5 h-3.5 text-slate-300" />
                  }
                </div>
                <span className="text-[9.5px] text-slate-400 text-center leading-tight">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Career Profile Card ─────────────────────────────────────────────────────

function CareerProfileCard({ userData, onEdit, onUploadResume }: { userData: UserData | null; onEdit: () => void; onUploadResume?: () => void }) {
  const fields = [
    !!(userData?.firstName || userData?.lastName),
    !!userData?.role,
    !!userData?.experienceLevel,
    !!userData?.resumeFileName || !!userData?.resumePath,
    !!userData?.jobStatus,
  ];
  const completion = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  const resumeValue = userData?.resumeFileName
    ? `${userData.resumeFileName}${userData.resumeUploadedAt ? ' · ' + formatRelativeTime(userData.resumeUploadedAt) : ''}`
    : userData?.resumePath
    ? filenameFromPath(userData.resumePath) || 'Uploaded'
    : 'No resume yet';

  const companyTypeLabel = userData?.companyTypes?.length
    ? userData.companyTypes.join(', ')
    : userData?.targetCompanies?.length
    ? userData.targetCompanies.slice(0, 2).join(', ') + (userData.targetCompanies.length > 2 ? ` +${userData.targetCompanies.length - 2}` : '')
    : '—';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-slate-900">Career Profile</h2>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-slate-700 transition-colors"
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Completion */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11.5px] text-slate-500">Profile completion</span>
            <span className="text-[12px] font-semibold text-[hsl(221,91%,55%)]">{completion}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-[hsl(221,91%,60%)]" style={{ width: `${completion}%` }} />
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-2.5 pt-1">
          {[
            { icon: Briefcase,  label: 'Target Role',  value: userData?.role || '—' },
            { icon: TrendingUp, label: 'Experience',   value: userData?.experienceLevel || '—' },
            { icon: Building2,  label: 'Company Type', value: companyTypeLabel },
            { icon: Target,     label: 'Job Status',   value: userData?.jobStatus || '—' },
            { icon: FileText,   label: 'Resume',       value: resumeValue },
          ].map((row) => {
            const RowIcon = row.icon;
            return (
              <div key={row.label} className="flex items-center gap-2.5">
                <RowIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="text-[11px] text-slate-400 shrink-0">{row.label}</span>
                  <span className="text-[12.5px] font-medium text-slate-700 truncate ml-2 text-right">{row.value}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Upload resume */}
        <button
          onClick={onUploadResume}
          className="w-full py-2 rounded-lg border border-dashed border-slate-200 text-[12px] text-slate-400 hover:border-[hsl(221,91%,60%)]/40 hover:text-[hsl(221,91%,55%)] hover:bg-[hsl(221,91%,60%)]/3 transition-colors flex items-center justify-center gap-1.5 mt-1"
        >
          <Upload className="w-3.5 h-3.5" /> Update Resume
        </button>
      </div>
    </div>
  );
}

// ─── Welcome Header ──────────────────────────────────────────────────────────

function WelcomeHeader({ userData, isMember, creditBalance }: { userData: UserData | null; isMember: boolean; creditBalance: number }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = userData?.firstName || 'Alex';

  const subtitle = "You're in the Practice stage — keep building momentum.";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Left */}
      <div>
        <h1 className="font-semibold text-slate-900 tracking-tight text-[32px]">
          {greeting}, <span className="font-serif italic text-[hsl(221,91%,60%)]">{firstName}</span> 👋
        </h1>
        <p className="text-[13.5px] text-slate-500 mt-1">{subtitle}</p>
      </div>

      {/* Right: summary chips */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[12px] text-slate-600">
          <Target className="w-3.5 h-3.5 text-[hsl(221,91%,55%)]" />
          <span className="font-medium">{userData?.role || '—'}</span>
        </div>
        {(userData?.targetCompanies?.[0] || userData?.companyTypes?.[0]) && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[12px] text-slate-600">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>{userData?.targetCompanies?.[0] || userData?.companyTypes?.[0]}</span>
        </div>
        )}
        {isMember ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(221,91%,60%)]/8 border border-[hsl(221,91%,60%)]/20 text-[12px] text-[hsl(221,91%,55%)] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Member
          </div>
        ) : (
          <Link to="/pricing">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[12px] text-amber-700 font-semibold cursor-pointer hover:bg-amber-100 transition-colors">
              <Lock className="w-3 h-3" />
              Free Plan
            </div>
          </Link>
        )}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[12px] text-slate-600">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>{creditBalance} credit{creditBalance !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isMember] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const { planData } = useUserPlan();
  const creditBalance = planData.permanentCreditBalance;
  const resumeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('screnaUserData');
      if (raw) setUserData(JSON.parse(raw));
    } catch {
      setUserData(null);
    }

    // Fetch personal info + profile from API
    Promise.allSettled([getPersonalInfo(), getProfile(), getTrainingPlans()]).then(([piResult, profileResult, plansResult]) => {
      setUserData((prev) => {
        let merged: UserData = { ...(prev || {}) };

        if (piResult.status === 'fulfilled') {
          const piData = piResult.value.data?.data ?? piResult.value.data;
          if (piData) {
            const nameParts = (piData.name || '').trim().split(' ');
            merged.firstName = nameParts[0] || merged.firstName;
            merged.lastName = nameParts.slice(1).join(' ') || merged.lastName;
          }
        }

        if (profileResult.status === 'fulfilled') {
          const profData = profileResult.value.data?.data ?? profileResult.value.data;
          if (profData) {
            const sr: any = profData.structured_resume;
            // Role: prefer insights-saved role, then first parsed job title
            merged.role = profData.role || sr?.job_titles?.[0] || merged.role;
            // Experience: prefer insights value, then derive from total years
            merged.experienceLevel = profData.experienceLevel
              || deriveExperienceLevel(sr?.profile?.total_years_experience)
              || merged.experienceLevel;
            // Company types from insights
            if (profData.companyTypes?.length) merged.companyTypes = profData.companyTypes;
            // Specific companies from insights
            if (profData.companies?.length) merged.targetCompanies = profData.companies;
            // Job search stage from insights
            const mappedStage = mapJobSearchStage(profData.jobSearchStage);
            if (mappedStage) merged.jobStatus = mappedStage;
            // Resume file info
            if (profData.resume_path) {
              merged.resumePath = profData.resume_path;
              if (!merged.resumeFileName) {
                merged.resumeFileName = filenameFromPath(profData.resume_path);
              }
            }
            if (profData.updatedAt) merged.resumeUploadedAt = profData.updatedAt;
          }
        }

        return merged;
      });

      if (plansResult.status === 'fulfilled') {
        const plansData = plansResult.value.data?.data ?? plansResult.value.data;
        const plans: any[] = Array.isArray(plansData) ? plansData : [];
        setRecentSessions(mapPlansToRecentSessions(plans));
      }
    });
  }, []);

  const handleUpdateProfile = (newData: UserData) => {
    setUserData(newData);
    localStorage.setItem('screnaUserData', JSON.stringify(newData));
  };

  const handleSaveProfile = (data: EditProfileData) => {
    handleUpdateProfile({
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.currentRole,
      experienceLevel: data.currentLevel,
      targetCompanies: [],
      jobStatus: data.jobStatus,
    });
  };

  const handleUploadResume = async (file: File) => {
    try {
      const uploadRes = await uploadResume(file);
      const respData = uploadRes.data?.data ?? uploadRes.data;
      const sr: any = respData?.structured_resume ?? respData;
      const resumePath: string = respData?.resume_path || '';
      const newResumeData: Partial<UserData> = {
        resumeFileName: file.name,
        resumeUploadedAt: new Date().toISOString(),
        resumePath: resumePath || undefined,
      };
      if (sr) {
        newResumeData.role = sr.job_titles?.[0] || sr.targetRole || userData?.role;
        newResumeData.experienceLevel = deriveExperienceLevel(sr.profile?.total_years_experience) || userData?.experienceLevel;
      }
      const updated: UserData = { ...(userData || {}), ...newResumeData };
      setUserData(updated);
      localStorage.setItem('screnaUserData', JSON.stringify(updated));
      // Fire-and-forget profile save
      if (sr) updateProfile(sr).catch(() => {});
    } catch (err) {
      console.error('Resume upload failed', err);
    }
  };

  const triggerResumeInput = () => {
    resumeInputRef.current?.click();
  };

  return (
    <DashboardLayout>
      <input
        ref={resumeInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadResume(file);
          e.target.value = '';
        }}
      />
      <div className="space-y-7">

        {/* ── Welcome Header ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <WelcomeHeader userData={userData} isMember={isMember} creditBalance={creditBalance} />
        </motion.div>

        {/* ── Career Command Center ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }}>
          <CareerCommandCenter />
        </motion.div>

        {/* ── Today's Focus ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}>
          <TodayFocus />
        </motion.div>

        {/* ── Main two-column grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="grid grid-cols-1 xl:grid-cols-3 gap-5"
        >
          {/* Left column (2/3) */}
          <div className="xl:col-span-2 flex flex-col gap-5">
            <ApplicationCommandCenter />
            <PersonalizedPractice sessions={recentSessions} />
          </div>

          {/* Right column (1/3) */}
          <div className="flex flex-col gap-5">
            <MentorshipSessions />
            <ProgressMomentum />
            <CareerProfileCard userData={userData} onEdit={() => setEditOpen(true)} onUploadResume={triggerResumeInput} />
          </div>
        </motion.div>

        {/* Edit Profile Modal */}
        <EditProfileModal
          open={editOpen}
          onOpenChange={setEditOpen}
          initialData={{
            firstName: userData?.firstName || 'Alex',
            lastName: userData?.lastName || 'Chen',
            currentRole: userData?.role || 'Product Manager',
            currentLevel: userData?.experienceLevel || 'Intermediate',
            targetRoles: ['Product Manager', 'Senior PM'],
            targetCompanyType: [],
            jobStatus: userData?.jobStatus || 'Actively job hunting',
          }}
          onSave={handleSaveProfile}
        />
      </div>
    </DashboardLayout>
  );
}