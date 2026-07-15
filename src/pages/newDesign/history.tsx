import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart2, RotateCcw,
  ChevronDown, CheckCircle2, XCircle,
  BookOpen, Star,
  Bot, Users,
} from 'lucide-react';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { Button } from '@/components/newDesign/ui/button';
import { getTrainingPlans } from '@/services/InterviewServices';
import { listMyBookings, submitMentorReview } from '@/services/MentorService';
import { useAuth } from '@/contexts/AuthContext';
import { usePostHog } from 'posthog-js/react';
import type { PostHog } from 'posthog-js';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';

// session_completed —— 客户端 best-effort：首次看到某 booking 为 COMPLETED 时上报一次
// （后端状态确认才是事实来源，此为临时信号）。用 localStorage 去重避免重复上报。
const SESSION_COMPLETED_TRACKED_KEY = 'screna_session_completed_tracked';
function trackCompletedSessions(posthog: PostHog | null | undefined, sessions: MentorSession[]) {
  try {
    const raw = localStorage.getItem(SESSION_COMPLETED_TRACKED_KEY);
    const tracked = new Set<string>(raw ? JSON.parse(raw) : []);
    let changed = false;
    sessions.forEach((s) => {
      if (!tracked.has(s.id)) {
        safeCapture(posthog, EVENTS.SESSION_COMPLETED, {
          session_id: s.id,
          session_plan: s.coachingPlan,
        });
        tracked.add(s.id);
        changed = true;
      }
    });
    if (changed) localStorage.setItem(SESSION_COMPLETED_TRACKED_KEY, JSON.stringify([...tracked]));
  } catch {
    // localStorage 不可用时静默忽略
  }
}

// ─── Types ────────────────────────────────────────────
type AIMockType = 'System Design' | 'Behavioral' | 'Coding' | 'Product Sense' | 'ML Design' | 'Case Study';
type ReviewStatus = 'Reviewed' | 'Pending Review';
type MainTab = 'ai-mock' | 'mentor';

type AIMockDifficulty = 'Junior' | 'Intermediate' | 'Senior' | 'Staff';

type AIMockSource = 'personal' | 'quick';

interface AIMockSession {
  id: string; kind: 'ai-mock'; title: string; role: string; type: AIMockType;
  date: string; duration: string; score: number | null;
  status: 'Completed' | 'Incomplete' | 'Not started'; feedback: string;
  questionsCount: number; difficulty: AIMockDifficulty; improvement?: number;
  interviewId?: string;
  reportStatus?: string;   // "normal" | "no_participation" — from AI scoring (J4 transports via module/report)
  source: AIMockSource;    // plan_type: personal training vs one-off quick mock
}
interface MentorSession {
  id: string; kind: 'mentor'; sessionType: string;
  mentorName: string; mentorTitle?: string; mentorCompany?: string;
  initials: string; avatarBg: string; avatarUrl?: string;
  date: string; time: string; duration: string;
  coachingPlan: string;
  reviewStatus: ReviewStatus; stars?: number; reviewComment?: string;
  myNote?: string; mentorNote?: string;
}
type TrainingEntry = AIMockSession | MentorSession;

// ─── Booking → MentorSession ──────────────────────────
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';
interface Booking {
  id: string;
  mentorName?: string;
  mentorRealName?: string; // always present; used as a fallback when mentorName is blank
  mentorAvatarUrl?: string;
  topicTitle?: string;
  durationMinutes?: number;
  startTime: string;
  status: BookingStatus;
  hasReview?: boolean;
  review?: { overallRating: number; comment?: string | null } | null;
  studentNote?: string;
  mentorNote?: string | null;
}

const AVATAR_BGS = [
  'bg-violet-100 text-violet-700',
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-amber-100 text-amber-700',
];
function pickAvatarBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_BGS[Math.abs(h) % AVATAR_BGS.length];
}
function bookingInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function mapBookingsToMentorSessions(bookings: Booking[]): MentorSession[] {
  return bookings
    .filter(b => b.status === 'COMPLETED')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .map((b): MentorSession => {
      const start = new Date(b.startTime);
      const valid = !isNaN(start.getTime());
      const name = b.mentorName || b.mentorRealName || '';
      return {
        id: b.id,
        kind: 'mentor',
        sessionType: b.topicTitle || 'Mentor Session',
        mentorName: name || 'Mentor',
        initials: bookingInitials(name),
        avatarBg: pickAvatarBg(name || b.id),
        avatarUrl: b.mentorAvatarUrl,
        date: valid ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        time: valid ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
        duration: b.durationMinutes ? `${b.durationMinutes} min` : '—',
        coachingPlan: b.topicTitle || '',
        reviewStatus: b.hasReview || b.review ? 'Reviewed' : 'Pending Review',
        stars: b.review?.overallRating,
        reviewComment: b.review?.comment ?? undefined,
        myNote: b.studentNote,
        mentorNote: b.mentorNote ?? undefined,
      };
    });
}

const AI_ROLES = ['Software Engineer', 'Product Manager', 'Engineering Manager', 'ML Engineer'];
const AI_TYPES: AIMockType[] = ['System Design', 'Behavioral', 'Coding', 'Product Sense', 'ML Design', 'Case Study'];

// Shared grid template — header + both row types must use the same value
const COL = '1fr 130px 200px 185px';

// ─── Map API plans → AI mock sessions ──────────────────
function inferType(category: string): AIMockType {
  const c = (category || '').toLowerCase();
  if (c.includes('system')) return 'System Design';
  if (c.includes('behav')) return 'Behavioral';
  if (c.includes('code') || c.includes('technical')) return 'Coding';
  if (c.includes('product')) return 'Product Sense';
  if (c.includes('ml') || c.includes('machine')) return 'ML Design';
  if (c.includes('case')) return 'Case Study';
  return 'Behavioral';
}

function inferRole(jobTitle: string): string {
  const t = (jobTitle || '').toLowerCase();
  if (t.includes('product')) return 'Product Manager';
  if (t.includes('manager') || t.includes('em')) return 'Engineering Manager';
  if (t.includes('ml') || t.includes('machine')) return 'ML Engineer';
  return 'Software Engineer';
}

function mapPlansToAISessions(plans: any[]): AIMockSession[] {
  if (!Array.isArray(plans)) return [];
  return plans
    .flatMap((plan: any) => {
      const modules: any[] = Array.isArray(plan.modules) ? plan.modules : [];
      // plan_type distinguishes personal training plans from one-off Quick Mocks.
      // Anything that isn't explicitly "quick" renders as a personal session.
      const source: AIMockSource = plan.plan_type === 'quick' ? 'quick' : 'personal';
      return modules
        // Keep a module if it has a viewable report (completed) OR it's a quick mock.
        // Quick mocks are intentionally retained even when never started (no report_id /
        // score, status "pending") so the history shows "created but not done" entries.
        .filter((m: any) => m.report_id || source === 'quick')
        // Hide "no participation" reports — candidate didn't answer anything, no evaluation to view.
        // Legacy reports (no report_status field) fall through as normal.
        .filter((m: any) => m.report_status !== 'no_participation')
        .map((m: any): AIMockSession => {
          const reportId = m.report_id ? String(m.report_id) : undefined;
          const completed = m.status === 'completed';
          const scoreRaw = Number(m.score ?? 0);
          const score = completed && scoreRaw ? Math.round(scoreRaw) : null;
          // Un-started quick mock: pending, no report_id and no score → distinct "Not started".
          const notStarted = !reportId && !completed;
          // Real wall-clock minutes from the session; falls back to the planned
          // estimate when the module hasn't been scored yet (actual is null).
          const minutes = m.actual_duration_minutes ?? m.duration_minutes;
          const dateIso = m.updated_at ?? plan.updated_at ?? plan.created_at ?? '';
          const date = dateIso
            ? new Date(dateIso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—';
          return {
            id: `ai-${reportId ?? m.module_id}`,
            kind: 'ai-mock',
            title: String(m.title ?? plan.target_job_title ?? 'Mock Interview'),
            role: inferRole(plan.target_job_title ?? ''),
            type: inferType(m.category ?? ''),
            date,
            duration: minutes ? `${minutes} min` : '—',
            score,
            status: completed ? 'Completed' : notStarted ? 'Not started' : 'Incomplete',
            feedback: '',
            questionsCount: 0,
            difficulty: 'Intermediate',
            interviewId: reportId,
            reportStatus: m.report_status,
            source,
          };
        });
    })
    .sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
    });
}

// ─── Filter Dropdown ───────────────────────────────────
function FilterDropdown<T extends string>({ label, options, value, onChange }: {
  label: string; options: T[]; value: T | 'all'; onChange: (v: T | 'all') => void;
}) {
  const [open, setOpen] = useState(false);
  const isActive = value !== 'all';
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm transition-all select-none border ${
          open || isActive
            ? 'bg-card border-primary/40 text-foreground'
            : 'bg-card border-border text-foreground hover:bg-muted/30'
        }`}
        style={{ fontWeight: 400 }}
      >
        {isActive ? value : label}
        <ChevronDown
          className="w-3.5 h-3.5 text-muted-foreground transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1.5 w-48 bg-card rounded-2xl border border-border overflow-hidden origin-top-right z-50 py-1.5"
              style={{ boxShadow: '0px 10px 15px -3px rgba(0,0,0,0.06), 0px 4px 6px -4px rgba(0,0,0,0.06)' }}
            >
              <button
                onClick={() => { onChange('all'); setOpen(false); }}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors ${value === 'all' ? 'bg-primary/5 text-primary' : 'text-foreground hover:bg-muted/60'}`}
                style={{ fontWeight: value === 'all' ? 500 : 400 }}
              >
                All {label}s
                {value === 'all' && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
              </button>
              {options.map(opt => (
                <button
                  key={opt}
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors ${value === opt ? 'bg-primary/5 text-primary' : 'text-foreground hover:bg-muted/60'}`}
                  style={{ fontWeight: value === opt ? 500 : 400 }}
                >
                  {opt}
                  {value === opt && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Star Rating ───────────────────────────────────────
function StarRating({ stars }: { stars: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= stars ? 'text-amber-400' : 'text-muted-foreground/25'}`} fill={i <= stars ? 'currentColor' : 'none'} />
      ))}
    </div>
  );
}

// ─── Clock Icon (inline SVG) ──────────────────────────
function ClockGlyph() {
  return (
    <svg className="shrink-0" width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 3V6L8 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Table Header ──────────────────────────────────────
function TableHeader() {
  return (
    <div
      className="grid items-center gap-6 px-5 border-b border-border"
      style={{ gridTemplateColumns: COL, background: 'var(--muted)', height: '41px' }}
    >
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] select-none">SESSION</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] select-none">DATE</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] select-none">STATUS</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] select-none">ACTIONS</span>
    </div>
  );
}

// ─── Source Tag (Personal / Quick Mock) ───────────────
function SourceTag({ source }: { source: AIMockSource }) {
  const isQuick = source === 'quick';
  return (
    <span
      className={`shrink-0 inline-flex items-center rounded-md border ${
        isQuick
          ? 'bg-violet-50 border-violet-200 text-violet-700'
          : 'bg-blue-50 border-blue-200 text-blue-700'
      }`}
      style={{ height: '18px', paddingLeft: '6px', paddingRight: '6px', fontSize: '10px', fontWeight: 500, lineHeight: '18px' }}
    >
      {isQuick ? 'Quick Mock' : 'Personal'}
    </span>
  );
}

// ─── AI Mock Row ───────────────────────────────────────
function AIMockRow({ session, isLast }: { session: AIMockSession; isLast: boolean }) {
  const navigate = useNavigate();
  const done = session.status === 'Completed';
  const notStarted = session.status === 'Not started';

  const scoreTextColor = !session.score ? 'var(--color-muted-foreground)'
    : session.score >= 85 ? 'var(--accent)'
    : session.score >= 70 ? 'var(--chart-4)'
    : 'var(--destructive)';

  const handleReport = () => {
    if (!session.interviewId) return;
    navigate(`/evaluation?interviewId=${session.interviewId}`, {
      state: {
        from: '/history',
        jobTitle: session.title,
        // Real wall-clock duration (already "N min" or "—") so the report header
        // shows actual time instead of a placeholder.
        duration: session.duration,
      },
    });
  };

  return (
    <div className={!isLast ? 'border-b border-border' : ''}>
      <div
        className="grid items-center gap-6 px-5"
        style={{ gridTemplateColumns: COL, height: '64px' }}
      >
        {/* SESSION */}
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <div
            className="shrink-0 w-9 h-9 rounded-2xl border border-border flex flex-col items-center justify-center"
            style={{ background: 'rgba(237,239,242,0.6)' }}
          >
            {done && session.score ? (
              <>
                <span className="font-semibold" style={{ fontSize: '14px', lineHeight: '14px', color: scoreTextColor }}>{session.score}</span>
                <span className="text-muted-foreground" style={{ fontSize: '9px', lineHeight: '13px' }}>/100</span>
              </>
            ) : (
              <XCircle className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-medium text-foreground truncate" style={{ fontSize: '14px', lineHeight: '20px' }}>{session.title}</p>
              <SourceTag source={session.source} />
            </div>
            <p className="text-muted-foreground truncate" style={{ fontSize: '12px', lineHeight: '16px' }}>
              {session.role}
            </p>
          </div>
        </div>

        {/* DATE */}
        <div className="min-w-0 flex flex-col gap-[2px]">
          <p className="text-muted-foreground" style={{ fontSize: '12px', lineHeight: '16px' }}>{session.date}</p>
          <div className="flex items-center gap-1 text-muted-foreground">
            <ClockGlyph />
            <p style={{ fontSize: '12px', lineHeight: '16px' }}>{session.duration}</p>
          </div>
        </div>

        {/* STATUS — pill badge */}
        <div className="min-w-0">
          {done ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border bg-green-50 border-green-200 text-green-800"
              style={{ height: '26px', paddingLeft: '10px', paddingRight: '12px', fontSize: '11px', fontWeight: 500 }}
            >
              <span className="rounded-full shrink-0 bg-green-500" style={{ width: '6px', height: '6px' }} />
              Completed
            </span>
          ) : notStarted ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border bg-amber-50 border-amber-200 text-amber-700"
              style={{ height: '26px', paddingLeft: '10px', paddingRight: '12px', fontSize: '11px', fontWeight: 500 }}
            >
              <span className="rounded-full shrink-0 bg-amber-400" style={{ width: '6px', height: '6px' }} />
              Not started
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted text-muted-foreground"
              style={{ height: '26px', paddingLeft: '10px', paddingRight: '12px', fontSize: '11px', fontWeight: 500 }}
            >
              <span className="rounded-full shrink-0 bg-muted-foreground/40" style={{ width: '6px', height: '6px' }} />
              Incomplete
            </span>
          )}
        </div>

        {/* ACTIONS */}
        {notStarted ? (
          // Un-started quick mock: nothing to report on yet. Offer to start it.
          <div className="flex items-center justify-start">
            <Button
              size="sm"
              className="h-8 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
              style={{ fontSize: '12px', fontWeight: 500, boxShadow: '0px 1px 1.5px rgba(60,119,246,0.2),0px 1px 1px rgba(60,119,246,0.2)' }}
              onClick={() => navigate('/quick-mock')}
            >
              <RotateCcw className="w-3.5 h-3.5" />Start
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-between">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-xl border-border text-foreground hover:bg-muted gap-1.5"
              style={{ fontSize: '12px', fontWeight: 500 }}
              onClick={handleReport}
              disabled={!session.interviewId}
            >
              <BarChart2 className="w-3.5 h-3.5" />View Report
            </Button>
            <Button
              size="sm"
              className="h-8 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
              style={{ fontSize: '12px', fontWeight: 500, boxShadow: '0px 1px 1.5px rgba(60,119,246,0.2),0px 1px 1px rgba(60,119,246,0.2)' }}
              onClick={() => navigate('/personalized-practice')}
            >
              <RotateCcw className="w-3.5 h-3.5" />Retake
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mentor Row ────────────────────────────────────────
function MentorRow({
  session,
  isLast,
  onReviewed,
}: {
  session: MentorSession;
  isLast: boolean;
  onReviewed?: (bookingId: string, stars: number, comment?: string) => void;
}) {
  const posthog = usePostHog();
  const [expanded, setExpanded] = useState(false);
  const [reviewStars, setReviewStars] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const reviewed = session.reviewStatus === 'Reviewed';

  const handleSubmitReview = async () => {
    if (reviewStars < 1 || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const trimmed = reviewComment.trim();
      await submitMentorReview(session.id, {
        overallRating: reviewStars,
        comment: trimmed || undefined,
      });
      // session_reviewed —— 用户提交对 mentor 的评分和评价
      safeCapture(posthog, EVENTS.SESSION_REVIEWED, {
        session_id: session.id,
        rating_stars: reviewStars,
        has_comment: trimmed.length > 0,
      });
      setSubmitted(true);
      onReviewed?.(session.id, reviewStars, trimmed || undefined);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(msg ?? 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className={!isLast ? 'border-b border-border' : ''}>
      <div
        className="grid items-center gap-6 px-5"
        style={{ gridTemplateColumns: COL, height: '64px' }}
      >
        {/* SESSION */}
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <div className={`shrink-0 w-9 h-9 rounded-full ${session.avatarBg} flex items-center justify-center`}>
            <span className="font-semibold" style={{ fontSize: '12px' }}>{session.initials}</span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate" style={{ fontSize: '14px', lineHeight: '20px' }}>{session.sessionType}</p>
            <p className="text-muted-foreground truncate" style={{ fontSize: '12px', lineHeight: '16px' }}>
              {[session.mentorName, session.mentorTitle, session.mentorCompany].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* DATE */}
        <div className="min-w-0 flex flex-col gap-[2px]">
          <p className="text-muted-foreground" style={{ fontSize: '12px', lineHeight: '16px' }}>{session.date}</p>
          <div className="flex items-center gap-1 text-muted-foreground">
            <ClockGlyph />
            <p style={{ fontSize: '12px', lineHeight: '16px' }}>{session.duration}</p>
          </div>
        </div>

        {/* STATUS — pill badge */}
        <div className="min-w-0">
          {reviewed ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border bg-green-50 border-green-200 text-green-800"
              style={{ height: '26px', paddingLeft: '10px', paddingRight: '12px', fontSize: '11px', fontWeight: 500 }}
            >
              <span className="rounded-full shrink-0 bg-green-500" style={{ width: '6px', height: '6px' }} />
              Reviewed
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border bg-amber-50 border-amber-300 text-amber-800"
              style={{ height: '26px', paddingLeft: '10px', paddingRight: '12px', fontSize: '11px', fontWeight: 500 }}
            >
              <span className="rounded-full shrink-0 bg-amber-400" style={{ width: '6px', height: '6px' }} />
              Review pending
            </span>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-start">
          <button
            className="text-foreground hover:text-primary transition-colors text-left"
            style={{ fontSize: '12px', fontWeight: 500 }}
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? 'Close' : reviewed ? 'View' : 'Leave review'}
          </button>
        </div>
      </div>

      {/* Expanded — Reviewed: read-only detail */}
      <AnimatePresence>
        {expanded && reviewed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border bg-muted/30 px-5 py-5 space-y-4">

              {/* Row 1: Coaching Plan + Date & Time */}
              <div className="flex gap-10">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] mb-1">Coaching Plan</p>
                  <p className="text-foreground" style={{ fontSize: '13px' }}>{session.coachingPlan}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] mb-1">Date & Time</p>
                  <p className="text-foreground" style={{ fontSize: '13px' }}>
                    {session.date} · {session.time}
                    <span className="text-muted-foreground ml-1.5" style={{ fontSize: '11px' }}>
                      ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                    </span>
                  </p>
                </div>
              </div>

              {/* Row 2: My Note */}
              {session.myNote && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] mb-1">My Note</p>
                  <p className="text-foreground leading-relaxed" style={{ fontSize: '13px' }}>{session.myNote}</p>
                </div>
              )}

              {/* Mentor's Note */}
              {session.mentorNote && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] mb-1">Mentor's Note</p>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap" style={{ fontSize: '13px' }}>{session.mentorNote}</p>
                </div>
              )}

              {/* Row 3: Star rating */}
              {session.stars && (
                <div className="flex items-center gap-1.5">
                  <StarRating stars={session.stars} />
                  <span className="text-muted-foreground" style={{ fontSize: '12px' }}>{session.stars}.0 / 5.0</span>
                </div>
              )}

              {/* Row 4: My review comment */}
              {session.reviewComment && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] mb-1">My Review</p>
                  <p className="text-foreground leading-relaxed" style={{ fontSize: '13px' }}>{session.reviewComment}</p>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded — Pending Review: interactive review form */}
      <AnimatePresence>
        {expanded && !reviewed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border bg-muted/30 px-5 py-5 space-y-4">

              {/* Row 1: Coaching Plan + Date & Time */}
              <div className="flex gap-10">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] mb-1">Coaching Plan</p>
                  <p className="text-foreground" style={{ fontSize: '13px' }}>{session.coachingPlan}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] mb-1">Date & Time</p>
                  <p className="text-foreground" style={{ fontSize: '13px' }}>
                    {session.date} · {session.time}
                    <span className="text-muted-foreground ml-1.5" style={{ fontSize: '11px' }}>
                      ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                    </span>
                  </p>
                </div>
              </div>

              {/* Mentor's Note */}
              {session.mentorNote && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] mb-1">Mentor's Note</p>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap" style={{ fontSize: '13px' }}>{session.mentorNote}</p>
                </div>
              )}

              {submitted ? (
                <div className="flex items-center gap-2 py-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-foreground" style={{ fontSize: '13px' }}>Review submitted — thank you!</span>
                </div>
              ) : (
                <>
                  {/* Star selector */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] mb-2">Your Rating</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <button
                          key={i}
                          type="button"
                          onMouseEnter={() => setHoverStar(i)}
                          onMouseLeave={() => setHoverStar(0)}
                          onClick={() => setReviewStars(i)}
                          className="transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star
                            className="w-5 h-5 transition-colors"
                            style={{
                              color: i <= (hoverStar || reviewStars) ? '#F59E0B' : 'var(--color-muted-foreground)',
                              opacity: i <= (hoverStar || reviewStars) ? 1 : 0.3,
                            }}
                            fill={i <= (hoverStar || reviewStars) ? '#F59E0B' : 'none'}
                          />
                        </button>
                      ))}
                      {reviewStars > 0 && (
                        <span className="ml-2 text-muted-foreground" style={{ fontSize: '12px' }}>
                          {reviewStars}.0 / 5.0
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Review comments */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] mb-2">Review Comments</p>
                    <textarea
                      value={reviewComment}
                      onChange={e => setReviewComment(e.target.value)}
                      placeholder="Share your experience with this session..."
                      rows={3}
                      className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                      style={{ fontSize: '13px' }}
                    />
                  </div>

                  {/* Submit */}
                  <div>
                    <Button
                      size="sm"
                      disabled={reviewStars === 0 || submitting}
                      onClick={handleSubmitReview}
                      className="h-8 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ fontSize: '12px', fontWeight: 500, boxShadow: reviewStars > 0 ? '0px 1px 1.5px rgba(60,119,246,0.2),0px 1px 1px rgba(60,119,246,0.2)' : 'none' }}
                    >
                      {submitting ? 'Submitting…' : 'Submit Review'}
                    </Button>
                    {submitError && (
                      <p className="mt-2 text-destructive" style={{ fontSize: '12px' }}>{submitError}</p>
                    )}
                  </div>
                </>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────
function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
        <BookOpen className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">No sessions found</p>
      <p className="text-xs text-muted-foreground">Try adjusting your filters.</p>
    </div>
  );
}

// ─── Loading skeleton ──────────────────────────────────
function LoadingState() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <TableHeader />
      <div className="divide-y divide-border">
        {[1, 2, 3].map(i => (
          <div key={i} className="grid items-center gap-6 px-5 animate-pulse" style={{ gridTemplateColumns: COL, height: '64px' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-muted shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3 w-40 bg-muted rounded-full" />
                <div className="h-2.5 w-24 bg-muted/60 rounded-full" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 w-20 bg-muted rounded-full" />
              <div className="h-2.5 w-12 bg-muted/60 rounded-full" />
            </div>
            <div className="h-6 w-24 bg-muted rounded-xl" />
            <div className="h-7 w-32 bg-muted rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════
export function HistoryPage() {
  const navigate = useNavigate();
  const posthog = usePostHog();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab: MainTab = searchParams.get('tab') === 'mentor' ? 'mentor' : 'ai-mock';

  const [activeTab,    setActiveTab]    = useState<MainTab>(initialTab);
  const [mentorFilter, setMentorFilter] = useState<'all' | ReviewStatus>('all');
  const [roleFilter,   setRoleFilter]   = useState<string | 'all'>('all');
  const [typeFilter,   setTypeFilter]   = useState<AIMockType | 'all'>('all');

  const [aiSessions, setAiSessions] = useState<AIMockSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [mentorSessions, setMentorSessions] = useState<MentorSession[]>([]);
  const [mentorLoading, setMentorLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchHistory() {
      try {
        // Unified history: personal training plans + one-off Quick Mocks, mixed
        // by updated_at desc server-side. Trending plans are excluded here.
        const params: Record<string, string> = { plan_type: 'personal,quick' };
        if (user?.id) params.user_id = user.id;
        const res = await getTrainingPlans(params);
        // Response has been seen in a few shapes across environments; accept all:
        // { data: [...] } | { data: { data: [...] } } | { data: { plans: [...] } }.
        const body: any = res.data ?? {};
        const plans: any[] =
          Array.isArray(body) ? body :
          Array.isArray(body.plans) ? body.plans :
          Array.isArray(body.data) ? body.data :
          Array.isArray(body.data?.plans) ? body.data.plans :
          [];
        if (!cancelled) setAiSessions(mapPlansToAISessions(plans));
      } catch {
        if (!cancelled) setAiSessions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchHistory();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    let alive = true;
    setMentorLoading(true);
    (async () => {
      try {
        const res = await listMyBookings({ page: 0, size: 100 });
        const content = (res as { data?: { data?: { content?: Booking[] } } })?.data?.data?.content ?? [];
        const completed = mapBookingsToMentorSessions(Array.isArray(content) ? content : []);
        if (alive) {
          setMentorSessions(completed);
          trackCompletedSessions(posthog, completed);
        }
      } catch {
        if (alive) setMentorSessions([]);
      } finally {
        if (alive) setMentorLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filteredAI = useMemo(() => aiSessions.filter(s => {
    if (roleFilter !== 'all' && s.role !== roleFilter) return false;
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    return true;
  }), [aiSessions, roleFilter, typeFilter]);

  const filteredMentor = useMemo(() =>
    mentorSessions.filter(s => mentorFilter === 'all' || s.reviewStatus === mentorFilter),
    [mentorSessions, mentorFilter]);

  const hasAIFilters   = roleFilter !== 'all' || typeFilter !== 'all';
  const clearAIFilters = () => { setRoleFilter('all'); setTypeFilter('all'); };

  const displayList: TrainingEntry[] = activeTab === 'ai-mock' ? filteredAI : filteredMentor;

  const TABS: { id: MainTab; label: string; icon: any }[] = [
    { id: 'ai-mock', label: 'AI Mock',        icon: Bot   },
    { id: 'mentor',  label: 'Mentor Session', icon: Users },
  ];

  return (
    <DashboardLayout headerTitle="Training History">
      <div className="space-y-6">

        {/* ── Tabs + Filters — single row ── */}
        <div className="flex items-center gap-3">

          {/* Tab pills */}
          <div className="flex items-center gap-1 shrink-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-all select-none ${
                  activeTab === tab.id
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                style={{ fontWeight: activeTab === tab.id ? 500 : 400 }}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <AnimatePresence mode="wait">
            {activeTab === 'ai-mock' && (
              <motion.div
                key="ai-filters"
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                transition={{ duration:0.15 }}
                className="flex items-center gap-2 ml-auto"
              >
                <FilterDropdown label="Role" options={AI_ROLES as string[]} value={roleFilter} onChange={v => setRoleFilter(v)} />
                <FilterDropdown label="Type" options={AI_TYPES} value={typeFilter} onChange={v => setTypeFilter(v as AIMockType | 'all')} />
                {hasAIFilters && (
                  <button onClick={clearAIFilters} className="h-9 px-3 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                    Clear
                  </button>
                )}
              </motion.div>
            )}

            {activeTab === 'mentor' && (
              <motion.div
                key="mentor-filters"
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                transition={{ duration:0.15 }}
                className="flex items-center gap-1 ml-auto"
              >
                <FilterDropdown
                  label="Review Status"
                  options={(['Reviewed', 'Pending Review'] as ReviewStatus[])}
                  value={mentorFilter}
                  onChange={v => setMentorFilter(v as 'all' | ReviewStatus)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Session count — only when not loading ── */}
        {!(activeTab === 'ai-mock' && loading) &&
          !(activeTab === 'mentor' && mentorLoading) && (
          <p className="text-xs text-muted-foreground -mt-2">
            Showing <span className="font-medium text-foreground">{displayList.length}</span> session{displayList.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* ── Session List / Loading ── */}
        {(activeTab === 'ai-mock' && loading) || (activeTab === 'mentor' && mentorLoading) ? (
          <LoadingState />
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {displayList.length === 0 ? <EmptyState /> : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab + mentorFilter + roleFilter + typeFilter}
                  initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  transition={{ duration:0.15 }}
                >
                  <TableHeader />
                  {displayList.map((entry, i) => {
                    const isLast = i === displayList.length - 1;
                    return entry.kind === 'ai-mock'
                      ? <AIMockRow key={entry.id} session={entry} isLast={isLast} />
                      : <MentorRow
                          key={entry.id}
                          session={entry}
                          isLast={isLast}
                          onReviewed={(bookingId, stars, comment) =>
                            setMentorSessions(prev =>
                              prev.map(m => m.id === bookingId ? { ...m, reviewStatus: 'Reviewed', stars, reviewComment: comment } : m)
                            )
                          }
                        />;
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
