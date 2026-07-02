import { useNavigate, useSearchParams } from 'react-router';
import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, BarChart2, RotateCcw,
  ChevronDown, CheckCircle2, XCircle,
  BookOpen, Star,
  Bot, Users, ExternalLink, MessageSquare,
  Lock, Sparkles, ArrowRight, MoreHorizontal, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { WidePageContainer } from '@/components/newDesign/dashboard-page';
import { Button } from '@/components/newDesign/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/newDesign/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/newDesign/ui/sheet';
import { getTrainingPlans } from '@/services/InterviewServices';
import { listMyBookings, submitMentorReview, cancelBooking, rescheduleBooking, submitDispute, submitDisputeScreenshot, getMentor, getMentorSlots } from '@/services/MentorService';
import svgPaths from './svg-training-history';

// ─── Types ────────────────────────────────────────────
type AIMockType = 'System Design' | 'Behavioral' | 'Coding' | 'Product Sense' | 'ML Design' | 'Case Study';
type MentorSessionType = 'Career Strategy' | 'Resume Review' | 'Mock Interview' | 'Offer Negotiation' | 'Behavioral';
type ReviewStatus = 'Reviewed' | 'Pending Review';
type MainTab = 'ai-mock' | 'mentor';

type AIMockDifficulty = 'Junior' | 'Intermediate' | 'Senior' | 'Staff';

interface AIMockSession {
  id: string; kind: 'ai-mock'; title: string; role: string; type: AIMockType;
  date: string; duration: string; score: number | null;
  status: 'Completed' | 'Incomplete'; feedback: string;
  questionsCount: number; difficulty: AIMockDifficulty; improvement?: number;
  interviewId?: string;
}
interface MentorSession {
  id: string; kind: 'mentor'; sessionType: MentorSessionType;
  mentorName: string; mentorTitle: string; mentorCompany: string;
  initials: string; avatarBg: string; date: string; time: string; duration: string;
  coachingPlan: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  services: string[]; price: string;
  reviewStatus: ReviewStatus; stars?: number; myNote?: string; hasReview?: boolean;
  meetingLink?: string; mentorId?: string; topicId?: string;
}
type TrainingEntry = AIMockSession | MentorSession;

// ─── API → UI mapping ─────────────────────────────────
// AI mock sessions come from training-plan modules that carry a report_id.
// Mentor sessions come from the user's mentorship bookings.
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';
interface Booking {
  id: string;
  mentorName?: string;
  mentorRealName?: string;
  mentorTitle?: string;
  mentorCompany?: string;
  mentorAvatarUrl?: string;
  topicTitle?: string;
  durationMinutes?: number;
  startTime: string;
  status: BookingStatus;
  price?: number | string;
  hasReview?: boolean;
  review?: { overallRating: number; comment?: string | null } | null;
  studentNote?: string;
  mentorNote?: string | null;
  meetingLink?: string;
  mentorId?: string;
  topicId?: string;
}

type Slot = { startTime: string; endTime: string };

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
      return modules
        .filter((m: any) => m.report_id)
        // Hide "no participation" reports — candidate didn't answer anything.
        .filter((m: any) => m.report_status !== 'no_participation')
        .map((m: any): AIMockSession & { _sortTs: number } => {
          const reportId = String(m.report_id);
          const completed = m.status === 'completed';
          const scoreRaw = Number(m.score ?? 0);
          const score = completed && scoreRaw ? Math.round(scoreRaw) : null;
          const minutes = m.actual_duration_minutes ?? m.duration_minutes;
          const dateIso = m.updated_at ?? plan.updated_at ?? plan.created_at ?? '';
          const ts = dateIso ? new Date(dateIso).getTime() : 0;
          const date = dateIso
            ? new Date(dateIso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—';
          return {
            id: `ai-${reportId}`,
            kind: 'ai-mock',
            title: String(m.title ?? plan.target_job_title ?? 'Mock Interview'),
            role: inferRole(plan.target_job_title ?? ''),
            type: inferType(m.category ?? ''),
            date,
            duration: minutes ? `${minutes} min` : '—',
            score,
            status: completed ? 'Completed' : 'Incomplete',
            feedback: '',
            questionsCount: 0,
            difficulty: 'Intermediate',
            interviewId: reportId,
            _sortTs: isNaN(ts) ? 0 : ts,
          };
        });
    })
    .sort((a, b) => b._sortTs - a._sortTs)
    .map(({ _sortTs, ...s }) => s);
}

// Map booking status → the design's mentor-session status values.
function mapBookingStatus(s: BookingStatus): MentorSession['status'] {
  if (s === 'COMPLETED') return 'Completed';
  if (s === 'CANCELLED' || s === 'EXPIRED') return 'Cancelled';
  return 'Upcoming'; // PENDING / CONFIRMED
}

function mapBookingsToMentorSessions(bookings: Booking[]): MentorSession[] {
  if (!Array.isArray(bookings)) return [];
  return bookings
    .slice()
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .map((b): MentorSession => {
      const start = new Date(b.startTime);
      const valid = !isNaN(start.getTime());
      const name = b.mentorName || b.mentorRealName || '';
      const hasReview = Boolean(b.hasReview || b.review);
      const priceNum = b.price != null ? Number(b.price) : NaN;
      return {
        id: b.id,
        kind: 'mentor',
        sessionType: (b.topicTitle as MentorSession['sessionType']) || ('Mock Interview' as MentorSession['sessionType']),
        mentorName: name || 'Mentor',
        mentorTitle: b.mentorTitle ?? '',
        mentorCompany: b.mentorCompany ?? '',
        initials: bookingInitials(name),
        avatarBg: pickAvatarBg(name || b.id),
        date: valid ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        time: valid ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
        duration: b.durationMinutes ? `${b.durationMinutes} min` : '—',
        coachingPlan: b.topicTitle || '',
        status: mapBookingStatus(b.status),
        services: b.topicTitle ? [b.topicTitle] : [],
        price: !isNaN(priceNum) ? `$${priceNum}` : '—',
        reviewStatus: hasReview ? 'Reviewed' : 'Pending Review',
        stars: b.review?.overallRating,
        myNote: b.studentNote,
        hasReview,
        meetingLink: b.meetingLink,
        mentorId: b.mentorId,
        topicId: b.topicId,
      };
    });
}

const AI_ROLES = ['Software Engineer', 'Product Manager', 'Engineering Manager', 'ML Engineer'];
const AI_TYPES: AIMockType[] = ['System Design', 'Behavioral', 'Coding', 'Product Sense', 'ML Design', 'Case Study'];
const TYPE_COLORS: Record<string, string> = {
  'System Design':    'bg-blue-50 text-blue-700 border-blue-200',
  'Behavioral':       'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Coding':           'bg-orange-50 text-orange-700 border-orange-200',
  'Product Sense':    'bg-violet-50 text-violet-700 border-violet-200',
  'ML Design':        'bg-amber-50 text-amber-700 border-amber-200',
  'Case Study':       'bg-pink-50 text-pink-700 border-pink-200',
  'Career Strategy':  'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Resume Review':    'bg-violet-50 text-violet-700 border-violet-200',
  'Mock Interview':   'bg-blue-50 text-blue-700 border-blue-200',
  'Offer Negotiation':'bg-amber-50 text-amber-700 border-amber-200',
};

const DIFFICULTY_COLORS: Record<AIMockDifficulty, string> = {
  Junior:       'text-emerald-600',
  Intermediate: 'text-blue-600',
  Senior:       'text-amber-600',
  Staff:        'text-rose-600',
};

// Shared grid template — header + both row types must use the same value
const AI_COL     = 'minmax(420px, 1fr) 160px 160px 220px';
const MENTOR_COL = 'minmax(420px, 1fr) 160px 160px 140px 220px 36px';

// ─── Helpers ───────────────────────────────────────────
function scoreColor(s: number | null) { return !s ? 'text-muted-foreground' : s >= 85 ? 'text-emerald-600' : s >= 70 ? 'text-amber-600' : 'text-red-500'; }
function scoreDot(s: number | null)   { return !s ? 'bg-muted-foreground'   : s >= 85 ? 'bg-emerald-500'   : s >= 70 ? 'bg-amber-500'   : 'bg-red-500'; }

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

// ─── Table Header ──────────────────────────────────────
function TableHeader({ showReview = false }: { showReview?: boolean }) {
  const col = showReview ? MENTOR_COL : AI_COL;
  return (
    <div
      className="grid items-center gap-6 px-5 border-b border-border"
      style={{ gridTemplateColumns: col, background: '#F9FAFB', height: '41px' }}
    >
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] select-none">SESSION</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] select-none">DATE</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] select-none">STATUS</span>
      {showReview && <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] select-none">REVIEW</span>}
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] select-none">ACTIONS</span>
      {showReview && <span />}
    </div>
  );
}

// ─── AI Mock Row ───────────────────────────────────────
function AIMockRow({ session, isLast }: { session: AIMockSession; isLast: boolean }) {
  const navigate = useNavigate();
  const done = session.status === 'Completed';

  const scoreTextColor = !session.score ? 'text-muted-foreground'
    : session.score >= 85 ? 'var(--accent)'
    : session.score >= 70 ? 'var(--chart-4)'
    : 'var(--destructive)';

  const dotColor = !session.score ? 'var(--muted-foreground)'
    : session.score >= 85 ? 'var(--accent)'
    : session.score >= 70 ? 'var(--chart-4)'
    : 'var(--destructive)';

  return (
    <div className={!isLast ? 'border-b border-border' : ''}>
      <div
        className="grid items-center gap-6 px-5"
        style={{ gridTemplateColumns: AI_COL, height: '64px' }}
      >
        {/* SESSION */}
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <div
            className="shrink-0 w-9 h-9 rounded-2xl border border-border flex flex-col items-center justify-center relative"
            style={{ background: 'rgba(237,239,242,0.6)' }}
          >
            {done && session.score ? (
              <>
                <span className="font-semibold" style={{ fontSize: '14px', lineHeight: '14px', color: scoreTextColor }}>{session.score}</span>
                <span className="text-muted-foreground" style={{ fontSize: '9px', lineHeight: '13px' }}>/100</span>
                
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-muted-foreground" />
                
              </>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate" style={{ fontSize: '14px', lineHeight: '20px' }}>{session.title}</p>
            <p className="text-muted-foreground truncate" style={{ fontSize: '12px', lineHeight: '16px' }}>
              {session.role} · <span className="font-medium">{session.difficulty}</span>
            </p>
          </div>
        </div>

        {/* DATE */}
        <div className="min-w-0 flex flex-col gap-[2px]">
          <p className="text-muted-foreground" style={{ fontSize: '12px', lineHeight: '16px' }}>{session.date}</p>
          <div className="flex items-center gap-1 text-muted-foreground">
            <svg className="shrink-0" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <g clipPath="url(#clip-ai-clock)">
                <path d={svgPaths.p3e7757b0} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 3V6L8 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <defs>
                <clipPath id="clip-ai-clock">
                  <rect width="12" height="12" fill="white" />
                </clipPath>
              </defs>
            </svg>
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
        <div className="flex items-center gap-2 justify-between">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 rounded-xl border-border text-foreground hover:bg-muted gap-1.5 px-[10px] py-[0px]"
            style={{ fontSize: '12px', fontWeight: 500 }}
            onClick={() => navigate(session.interviewId ? `/evaluation?interviewId=${session.interviewId}` : '/evaluation', {
              state: { from: '/history', jobTitle: session.title, duration: session.duration },
            })}
          >
            <BarChart2 className="w-3.5 h-3.5" />Report
          </Button>
          <Button
            size="sm"
            className="h-8 px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            style={{ fontSize: '12px', fontWeight: 500, boxShadow: '0px 1px 1.5px rgba(60,119,246,0.2),0px 1px 1px rgba(60,119,246,0.2)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" />Retake
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Reschedule Modal ──────────────────────────────────
function RescheduleModal({ session, open, onOpenChange }: { session: MentorSession; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Parse the original ISO start time back out for filtering — the session only
  // carries a display string, so derive minutes from duration for the slots call.
  const durationMinutes = useMemo(() => {
    const n = parseInt(session.duration, 10);
    return isNaN(n) ? 30 : n;
  }, [session.duration]);

  useEffect(() => {
    if (!open || !session.mentorId) return;
    let alive = true;
    setLoadingSlots(true);
    setSelected(null);
    (async () => {
      try {
        // Resolve a topic id: prefer the session's own topicId, else fall back
        // to the mentor's topic list (matched by title / first active).
        let topicId = session.topicId;
        if (!topicId) {
          const mres = await getMentor(session.mentorId) as { data?: { data?: { topics?: Array<{ id: string; title: string; active: boolean }> } } };
          const topics = mres?.data?.data?.topics ?? [];
          const topic =
            topics.find(t => t.title === session.coachingPlan) ??
            topics.find(t => t.active) ??
            topics[0];
          topicId = topic?.id;
        }
        if (!topicId) { if (alive) { setSlots([]); setLoadingSlots(false); } return; }
        const sres = await getMentorSlots(session.mentorId, topicId, durationMinutes) as { data?: { data?: Slot[] } };
        const data = sres?.data?.data ?? [];
        if (alive) setSlots(Array.isArray(data) ? data : []);
      } catch {
        if (alive) setSlots([]);
      } finally {
        if (alive) setLoadingSlots(false);
      }
    })();
    return () => { alive = false; };
  }, [open, session.mentorId, session.topicId, session.coachingPlan, durationMinutes]);

  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    [...slots]
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .forEach(s => {
        const key = new Date(s.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
      });
    return Array.from(map.entries());
  }, [slots]);

  const handleConfirm = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await rescheduleBooking(session.id, selected);
      window.location.reload();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast(msg ?? 'Could not reschedule to that time. Please pick another slot.');
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Reschedule session</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Currently {session.date} · {session.time} with {session.mentorName}. Pick a new available time below.
        </p>

        {loadingSlots ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading available times…</div>
        ) : days.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No available times right now. Please try again later.</div>
        ) : (
          <div className="flex flex-col gap-3.5 max-h-[320px] overflow-y-auto">
            {days.map(([dayLabel, daySlots]) => (
              <div key={dayLabel}>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{dayLabel}</p>
                <div className="grid grid-cols-3 gap-2">
                  {daySlots.map(s => {
                    const active = selected === s.startTime;
                    const label = new Date(s.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                    return (
                      <button
                        key={s.startTime}
                        onClick={() => setSelected(s.startTime)}
                        className={`px-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                          active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="mt-2 flex items-center justify-between gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <Button disabled={!selected || submitting} onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mentor Row ────────────────────────────────────────
function MentorRow({ session, isLast, onReviewed, reviewedSessions }: { session: MentorSession; isLast: boolean; onReviewed: (id: string) => void; reviewedSessions: Set<unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewStars, setReviewStars] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submitted, setSubmitted] = useState(session.hasReview ?? false);
  const [submitting, setSubmitting] = useState(false);
  const isReviewed = submitted || reviewedSessions.has(session.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const reviewed = session.reviewStatus === 'Reviewed';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [issueReported, setIssueReported] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState('');
  const [issueDetails, setIssueDetails] = useState('');
  const [issueFile, setIssueFile] = useState<File | null>(null);
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [acting, setActing] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const navigate = useNavigate();

  const handleCancel = async () => {
    if (acting) return;
    if (!window.confirm('Are you sure you want to cancel this session?')) return;
    setActing(true);
    try {
      await cancelBooking(session.id);
      window.location.reload();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast(msg ?? 'Failed to cancel the session. Please try again.');
      setActing(false);
    }
  };

  const handleJoin = () => {
    if (session.meetingLink) {
      window.open(session.meetingLink, '_blank', 'noopener,noreferrer');
    } else {
      toast('Meeting link not available yet');
    }
  };

  const handleReschedule = () => {
    if (!session.mentorId) {
      toast('Rescheduling is temporarily unavailable');
      return;
    }
    setRescheduleOpen(true);
  };

  const handleBookAgain = () => {
    setMenuOpen(false);
    if (session.mentorId) {
      navigate('/mentor-details?mentorId=' + session.mentorId);
    } else {
      navigate('/marketplace');
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);
  return (
    <div className={!isLast ? 'border-b border-border' : ''}>
      <div
        className="grid items-center gap-6 px-5"
        style={{ gridTemplateColumns: MENTOR_COL, height: '64px' }}
      >
        {/* SESSION */}
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          <div className={`shrink-0 w-9 h-9 rounded-full ${session.avatarBg} flex items-center justify-center`}>
            <span className="font-semibold" style={{ fontSize: '12px' }}>{session.initials}</span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate" style={{ fontSize: '14px', lineHeight: '20px' }}>Regular mentorship session</p>
            <p className="text-muted-foreground truncate" style={{ fontSize: '12px', lineHeight: '16px' }}>{session.mentorName} · {session.mentorTitle} · {session.mentorCompany}</p>
          </div>
        </div>

        {/* DATE */}
        <div className="min-w-0 flex flex-col gap-[2px]">
          <p className="text-muted-foreground" style={{ fontSize: '12px', lineHeight: '16px' }}>{session.date}</p>
          <div className="flex items-center gap-1 text-muted-foreground">
            <svg className="shrink-0" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <g clipPath="url(#clip-mentor-clock)">
                <path d={svgPaths.p3e7757b0} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 3V6L8 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <defs>
                <clipPath id="clip-mentor-clock">
                  <rect width="12" height="12" fill="white" />
                </clipPath>
              </defs>
            </svg>
            <p style={{ fontSize: '12px', lineHeight: '16px' }}>{session.duration}</p>
          </div>
        </div>

        {/* STATUS — pill badge */}
        <div className="min-w-0">
          {session.status === 'Completed' && (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border bg-green-50 border-green-200 text-green-800"
              style={{ height: '26px', paddingLeft: '10px', paddingRight: '12px', fontSize: '11px', fontWeight: 500 }}
            >
              <span className="rounded-full shrink-0 bg-green-500" style={{ width: '6px', height: '6px' }} />
              Completed
            </span>
          )}
          {session.status === 'Upcoming' && (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border bg-blue-50 border-blue-200 text-blue-700"
              style={{ height: '26px', paddingLeft: '10px', paddingRight: '12px', fontSize: '11px', fontWeight: 500 }}
            >
              <span className="rounded-full shrink-0 bg-blue-400" style={{ width: '6px', height: '6px' }} />
              Upcoming
            </span>
          )}
          {session.status === 'Cancelled' && (
            <span
              className="inline-flex items-center gap-1.5 rounded-xl border bg-muted border-border text-muted-foreground"
              style={{ height: '26px', paddingLeft: '10px', paddingRight: '12px', fontSize: '11px', fontWeight: 500 }}
            >
              <span className="rounded-full shrink-0 bg-muted-foreground/40" style={{ width: '6px', height: '6px' }} />
              Cancelled
            </span>
          )}
        </div>

        {/* REVIEW */}
        <div className="flex items-center justify-start">
          {session.status === 'Completed' && (
            isReviewed ? (
              <button
                className="text-primary hover:text-primary/80 transition-colors text-left"
                style={{ fontSize: '12px', fontWeight: 500 }}
                onClick={() => setExpanded(e => !e)}
              >
                {expanded ? 'Close' : 'My Review'}
              </button>
            ) : (
              <button
                className="text-foreground hover:text-primary transition-colors text-left"
                style={{ fontSize: '12px', fontWeight: 500 }}
                onClick={() => setExpanded(e => !e)}
              >
                {expanded ? 'Close' : 'Write a review'}
              </button>
            )
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-start">
          {session.status === 'Upcoming' ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleReschedule}
                className="text-muted-foreground hover:text-foreground transition-colors"
                style={{ fontSize: '12px', fontWeight: 500 }}
              >
                Reschedule
              </button>
              <button
                onClick={handleCancel}
                disabled={acting}
                className="text-destructive hover:text-destructive/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ fontSize: '12px', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                className="px-3 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                style={{ fontSize: '12px', fontWeight: 500 }}
              >
                Join
              </button>
            </div>
          ) : session.status === 'Completed' ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-lg shadow-lg py-1 z-30">
                  <button
                    onClick={handleBookAgain}
                    className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    Book Again
                  </button>
                  <div className="my-1 border-t border-border" />
                  {issueReported ? (
                    <span className="block px-3 py-2 text-sm text-muted-foreground cursor-default select-none">
                      Issue Reported
                    </span>
                  ) : (
                    <button
                      onClick={() => { setMenuOpen(false); setIssueModalOpen(true); }}
                      className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      Dispute
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : session.status === 'Cancelled' ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-lg shadow-lg py-1 z-30">
                  <button
                    onClick={handleBookAgain}
                    className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    Book Again
                  </button>
                  <div className="my-1 border-t border-border" />
                  {issueReported ? (
                    <span className="block px-3 py-2 text-sm text-muted-foreground cursor-default select-none">
                      Issue Reported
                    </span>
                  ) : (
                    <button
                      onClick={() => { setMenuOpen(false); setIssueModalOpen(true); }}
                      className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                    >
                      Dispute
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* EXPAND */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
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

              {/* Row 3: Star rating */}
              {session.stars && (
                <div className="flex items-center gap-1.5">
                  <StarRating stars={session.stars} />
                  <span className="text-muted-foreground" style={{ fontSize: '12px' }}>{session.stars}.0 / 5.0</span>
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

              {isReviewed ? (
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
                              color: i <= (hoverStar || reviewStars) ? 'var(--chart-2)' : 'var(--muted-foreground)',
                              opacity: i <= (hoverStar || reviewStars) ? 1 : 0.3,
                            }}
                            fill={i <= (hoverStar || reviewStars) ? 'var(--chart-2)' : 'none'}
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
                      onClick={async () => {
                        if (reviewStars < 1 || submitting) return;
                        setSubmitting(true);
                        try {
                          const trimmed = reviewComment.trim();
                          await submitMentorReview(session.id, {
                            overallRating: reviewStars,
                            comment: trimmed || undefined,
                          });
                          setSubmitted(true);
                          session.hasReview = true;
                          onReviewed(session.id);
                          window.location.reload();
                        } catch (err: unknown) {
                          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                          toast(msg ?? 'Failed to submit review. Please try again.');
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="h-8 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ fontSize: '12px', fontWeight: 500, boxShadow: reviewStars > 0 ? '0px 1px 1.5px rgba(60,119,246,0.2),0px 1px 1px rgba(60,119,246,0.2)' : 'none' }}
                    >
                      Submit Review
                    </Button>
                  </div>
                </>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Details Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-[380px] sm:w-[420px] flex flex-col gap-0 p-0" aria-describedby={undefined}>
          <SheetHeader className="px-6 py-5 border-b border-border">
            <SheetTitle>Session Details</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
            {/* Mentor */}
            <div className="flex items-center gap-3">
              <div className={`shrink-0 w-10 h-10 rounded-full ${session.avatarBg} flex items-center justify-center font-semibold`} style={{ fontSize: '13px' }}>
                {session.initials}
              </div>
              <div>
                <p className="text-foreground" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)' }}>{session.mentorName}</p>
                <p className="text-muted-foreground" style={{ fontSize: 'var(--text-xs)' }}>{session.mentorTitle} · {session.mentorCompany}</p>
              </div>
            </div>

            {/* Details grid */}
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-muted-foreground uppercase tracking-wider mb-1" style={{ fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>Service</p>
                <p className="text-foreground" style={{ fontSize: 'var(--text-sm)' }}>{session.services.join(', ')}</p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase tracking-wider mb-1" style={{ fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>Scheduled Time</p>
                <p className="text-foreground" style={{ fontSize: 'var(--text-sm)' }}>{session.date} · {session.time} · {session.duration}</p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase tracking-wider mb-1" style={{ fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>Payment</p>
                <p className="text-foreground" style={{ fontSize: 'var(--text-sm)' }}>{session.price}</p>
              </div>
              <div>
                <p className="text-muted-foreground uppercase tracking-wider mb-1" style={{ fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>Status</p>
                <span className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 ${
                  session.status === 'Completed' ? 'bg-green-50 border-green-200 text-green-800'
                  : session.status === 'Upcoming' ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-muted border-border text-muted-foreground'
                }`} style={{ fontSize: '11px', fontWeight: 500 }}>
                  <span className={`rounded-full w-1.5 h-1.5 shrink-0 ${
                    session.status === 'Completed' ? 'bg-green-500'
                    : session.status === 'Upcoming' ? 'bg-blue-400'
                    : 'bg-muted-foreground/40'
                  }`} />
                  {session.status}
                </span>
              </div>
            </div>

            {/* Review */}
            {session.stars != null && (
              <div>
                <p className="text-muted-foreground uppercase tracking-wider mb-2" style={{ fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>Your Review</p>
                <div className="flex items-center gap-1 mb-2">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-4 h-4 ${i <= (session.stars ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
                {session.myNote && (
                  <p className="text-muted-foreground leading-relaxed" style={{ fontSize: 'var(--text-sm)' }}>{session.myNote}</p>
                )}
              </div>
            )}
            {!session.stars && session.status === 'Completed' && (
              <div>
                <p className="text-muted-foreground uppercase tracking-wider mb-2" style={{ fontSize: '11px', fontWeight: 'var(--font-weight-semibold)' }}>Review</p>
                <p className="text-muted-foreground italic" style={{ fontSize: 'var(--text-sm)' }}>No review left yet.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Reschedule Modal */}
      <RescheduleModal session={session} open={rescheduleOpen} onOpenChange={setRescheduleOpen} />

      {/* Report Issue Modal */}
      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
          </DialogHeader>

          {/* Read-only session info */}
          <div className="rounded-lg bg-muted px-4 py-3 flex flex-col gap-1 text-sm">
            <p className="text-foreground" style={{ fontWeight: 'var(--font-weight-medium)' }}>{session.mentorName}</p>
            <p className="text-muted-foreground">{session.date} · {session.duration}</p>
          </div>

          {/* Radio group */}
          <div className="flex flex-col gap-1 mt-1">
            {[
              "Mentor didn't show up",
              'Session ended early',
              'Technical issues',
              'Billing / credits error',
              'Other',
            ].map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-muted transition-colors"
              >
                <input
                  type="radio"
                  name={`issue-${session.id}`}
                  value={option}
                  checked={selectedIssue === option}
                  onChange={() => setSelectedIssue(option)}
                  className="accent-primary w-4 h-4 shrink-0"
                />
                <span className="text-sm text-foreground">{option}</span>
              </label>
            ))}
          </div>

          {/* Additional details */}
          <div className="flex flex-col gap-1.5 mt-1">
            <label className="text-sm text-foreground" style={{ fontWeight: 'var(--font-weight-medium)' }}>
              Additional details
            </label>
            <textarea
              rows={3}
              value={issueDetails}
              onChange={e => setIssueDetails(e.target.value)}
              placeholder="Describe what happened (optional)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>

          {/* File upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground" style={{ fontWeight: 'var(--font-weight-medium)' }}>
              Attach screenshot <span className="text-muted-foreground" style={{ fontWeight: 'var(--font-weight-normal)' }}>(optional)</span>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border bg-muted cursor-pointer hover:bg-muted/70 transition-colors">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  e.target.value = ''; // allow re-selecting the same file after a rejection
                  if (!f) { setIssueFile(null); return; }
                  if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) {
                    toast('Screenshot must be a PNG, JPEG, or WEBP image.');
                    return;
                  }
                  if (f.size > 5 * 1024 * 1024) {
                    toast('Screenshot must be 5 MB or smaller.');
                    return;
                  }
                  setIssueFile(f);
                }}
              />
              <span className="text-sm text-muted-foreground truncate">
                {issueFile ? issueFile.name : 'Click to upload an image'}
              </span>
            </label>
          </div>

          <DialogFooter className="mt-2 flex items-center justify-between gap-2">
            <button
              onClick={() => { setIssueModalOpen(false); setSelectedIssue(''); setIssueDetails(''); setIssueFile(null); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <Button
              disabled={!selectedIssue || issueSubmitting}
              onClick={async () => {
                if (!selectedIssue || issueSubmitting) return;
                setIssueSubmitting(true);
                try {
                  // API expects { reason: <enum>, description }. UI options map 1:1 to the enum.
                  const REASON_MAP: Record<string, 'MENTOR_NO_SHOW' | 'SESSION_ENDED_EARLY' | 'TECHNICAL_ISSUES' | 'BILLING_ERROR' | 'OTHER'> = {
                    "Mentor didn't show up":   'MENTOR_NO_SHOW',
                    'Session ended early':     'SESSION_ENDED_EARLY',
                    'Technical issues':        'TECHNICAL_ISSUES',
                    'Billing / credits error': 'BILLING_ERROR',
                    'Other':                   'OTHER',
                  };
                  const reason = REASON_MAP[selectedIssue] ?? 'OTHER';
                  const description = issueDetails.slice(0, 1000);
                  await submitDispute(session.id, { reason, description });
                  // Optional screenshot: uploaded to the dedicated endpoint after the dispute is created.
                  if (issueFile) {
                    try { await submitDisputeScreenshot(session.id, issueFile); }
                    catch { toast('Dispute submitted, but the screenshot upload failed.'); }
                  }
                  setIssueReported(true);
                  setIssueModalOpen(false);
                  setSelectedIssue('');
                  setIssueDetails('');
                  setIssueFile(null);
                  toast("Issue reported. We'll follow up within 48 hours.");
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                  toast(msg ?? 'Failed to report the issue. Please try again.');
                } finally {
                  setIssueSubmitting(false);
                }
              }}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Mentor Lock Gate ──────────────────────────────────
function MentorLockGate({ onUpgrade }: { onUpgrade: () => void }) {
  // Ghost rows — blurred placeholder rows to hint at content underneath
  const ghostRows = [
    { w1: '160px', w2: '90px', w3: '80px' },
    { w1: '130px', w2: '110px', w3: '70px' },
    { w1: '150px', w2: '95px',  w3: '90px' },
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* Table header */}
      <div
        className="grid items-center gap-6 px-5 border-b border-border"
        style={{ gridTemplateColumns: MENTOR_COL, background: 'var(--muted)', height: '41px' }}
      >
        {['SESSION','DATE','STATUS','REVIEW','ACTIONS',''].map(h => (
          <span key={h} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.55px] select-none">{h}</span>
        ))}
      </div>

      {/* Ghost rows */}
      <div className="divide-y divide-border" style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none' }}>
        {ghostRows.map((r, i) => (
          <div key={i} className="grid items-center gap-6 px-5" style={{ gridTemplateColumns: MENTOR_COL, height: '64px' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3 rounded-full bg-muted" style={{ width: r.w1 }} />
                <div className="h-2.5 rounded-full bg-muted/60" style={{ width: r.w2 }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 rounded-full bg-muted w-20" />
              <div className="h-2.5 rounded-full bg-muted/60 w-12" />
            </div>
            <div className="h-6 rounded-xl bg-muted w-24" />
            <div className="h-6 rounded-xl bg-muted" style={{ width: r.w3 }} />
          </div>
        ))}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(2px)' }}>
        <div
          className="flex flex-col items-center text-center px-7 py-5 rounded-2xl border border-border bg-card mx-4"
          style={{ maxWidth: '420px', width: '100%', boxShadow: '0px 8px 24px rgba(0,0,0,0.08), 0px 2px 6px rgba(0,0,0,0.04)' }}
        >
          {/* Icon + Headline row */}
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #3C77F6 0%, #6B4FBB 100%)' }}
            >
              <Lock className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-foreground text-left" style={{ fontSize: '15px', fontWeight: 600, lineHeight: '22px' }}>
              Mentor Sessions are locked
            </p>
          </div>

          {/* Description */}
          <p className="text-muted-foreground mb-4 text-left w-full" style={{ fontSize: '13px', lineHeight: '20px' }}>
            Upgrade to <span className="font-medium text-foreground">Starter</span> or <span className="font-medium text-foreground">Premium</span> to unlock 1:1 mentorship, session history, and coaching feedback.
          </p>

          {/* Feature pills + CTA — single row */}
          <div className="flex items-center gap-2 w-full flex-wrap">
            {['1:1 Mentorship','Session History','Coaching Plans'].map(f => (
              <span
                key={f}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-muted text-muted-foreground shrink-0"
                style={{ fontSize: '11px', fontWeight: 500 }}
              >
                <Sparkles className="w-2.5 h-2.5 text-primary shrink-0" />
                {f}
              </span>
            ))}
            <Button
              onClick={onUpgrade}
              className="h-8 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 ml-auto shrink-0"
              style={{ fontSize: '12px', fontWeight: 500, boxShadow: '0px 1px 3px rgba(60,119,246,0.3), 0px 1px 2px rgba(60,119,246,0.2)' }}
            >
              Upgrade Plan
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
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

// ══════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════
export function TrainingHistoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab,        setActiveTab]        = useState<MainTab>(
    searchParams.get('tab') === 'mentor' ? 'mentor' : 'ai-mock',
  );
  const [mentorFilter,     setMentorFilter]     = useState<'all' | 'Upcoming' | 'Completed' | 'Cancelled'>('all');
  const [roleFilter,       setRoleFilter]       = useState<string | 'all'>('all');
  const [typeFilter,       setTypeFilter]       = useState<AIMockType | 'all'>('all');
  const [reviewedSessions, setReviewedSessions] = useState(new Set());

  const [aiSessions,     setAiSessions]     = useState<AIMockSession[]>([]);
  const [mentorSessions, setMentorSessions] = useState<MentorSession[]>([]);

  // Mentor Sessions are available to all users — no plan gating.
  const isFree = false;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getTrainingPlans();
        const plans = res.data?.data ?? res.data ?? [];
        if (!cancelled) setAiSessions(mapPlansToAISessions(Array.isArray(plans) ? plans : []));
      } catch {
        if (!cancelled) setAiSessions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listMyBookings({ page: 0, size: 100 });
        const content = (res as { data?: { data?: { content?: Booking[] } } })?.data?.data?.content ?? [];
        if (!cancelled) setMentorSessions(mapBookingsToMentorSessions(Array.isArray(content) ? content : []));
      } catch {
        if (!cancelled) setMentorSessions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredAI = useMemo(() => aiSessions.filter(s => {
    if (roleFilter !== 'all' && s.role !== roleFilter) return false;
    if (typeFilter !== 'all' && s.type !== typeFilter) return false;
    return true;
  }), [aiSessions, roleFilter, typeFilter]);

  const filteredMentor = useMemo(() =>
    mentorSessions.filter(s => mentorFilter === 'all' || s.status === mentorFilter),
    [mentorSessions, mentorFilter]);

  const hasAIFilters   = roleFilter !== 'all' || typeFilter !== 'all';
  const clearAIFilters = () => { setRoleFilter('all'); setTypeFilter('all'); };

  const displayList: TrainingEntry[] = activeTab === 'ai-mock' ? filteredAI : filteredMentor;

  const TABS: { id: MainTab; label: string; icon: any }[] = [
    { id: 'ai-mock', label: 'AI Mock',        icon: Bot   },
    { id: 'mentor',  label: 'Mentor Session', icon: Users },
  ];

  return (
    <DashboardLayout headerTitle="My Sessions" fullBleed>
      <WidePageContainer maxWidth="none">
      <div className="space-y-6">

        {/* ── Demo plan switcher — remove in production ── */}
        

        {/* ── Tabs + Filters — single row ── */}
        <div className="flex items-center gap-3">

          {/* Tab pills — shrink-0 so they don't compress */}
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
                {tab.id === 'mentor' && isFree && (
                  <Lock className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                )}
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

            {activeTab === 'mentor' && !isFree && (
              <motion.div
                key="mentor-filters"
                initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                transition={{ duration:0.15 }}
                className="flex items-center gap-1 ml-auto"
              >
                <FilterDropdown
                  label="Status"
                  options={(['Upcoming', 'Completed', 'Cancelled'] as const)}
                  value={mentorFilter}
                  onChange={v => setMentorFilter(v as 'all' | 'Upcoming' | 'Completed' | 'Cancelled')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Session count — only when not locked ─── */}
        {!(activeTab === 'mentor' && isFree) && (
          <p className="text-xs text-muted-foreground -mt-2">
            Showing <span className="font-medium text-foreground">{displayList.length}</span> session{displayList.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* ── Session List / Lock Gate ── */}
        {activeTab === 'mentor' && isFree ? (
          <MentorLockGate onUpgrade={() => navigate('/billing')} />
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {displayList.length === 0 ? <EmptyState /> : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab + mentorFilter + roleFilter + typeFilter}
                  initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                  transition={{ duration:0.15 }}
                >
                  <TableHeader showReview={activeTab === 'mentor'} />
                  {displayList.map((entry, i) => {
                    const isLast = i === displayList.length - 1;
                    return entry.kind === 'ai-mock'
                      ? <AIMockRow key={entry.id} session={entry} isLast={isLast} />
                      : <MentorRow key={entry.id} session={entry} isLast={isLast} onReviewed={id => setReviewedSessions(prev => new Set(prev).add(id))} reviewedSessions={reviewedSessions} />;
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}

      </div>
      </WidePageContainer>
    </DashboardLayout>
  );
}