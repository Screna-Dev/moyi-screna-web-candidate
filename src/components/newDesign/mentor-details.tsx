import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ArrowLeft, Clock, Calendar, Briefcase, Award, Video, ShieldCheck, X,
  ChevronLeft, ChevronRight, CheckCircle2, Loader2,
  Linkedin, ArrowUpRight, ChevronDown, Check, Star,
} from 'lucide-react';
import { DashboardLayout } from './dashboard-layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { getMentor, getMentorSlots, createBooking } from '../../services/MentorService';
import { usePostHog } from 'posthog-js/react';
import { safeCapture } from '@/utils/posthog';
import { useDwellTracking } from '@/hooks/useDwellTracking';
import { EVENTS } from '@/constants/analyticsEvents';

// ─── Types ───────────────────────────────────────────────────────────────────

type Duration = '30min' | '1hr';

interface CoachingPlan {
  id: string;
  name: string;
  description: string;
  pricing: Record<Duration, number>;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

interface ApiReview {
  id: string;
  reviewerName: string;
  overallRating: number;
  communicationRating: number;
  expertiseRating: number;
  helpfulnessRating: number;
  preparationRating: number;
  tags: string[];
  comment: string;
  createdAt: string;
}

interface MentorData {
  id: string;
  name: string;
  currentRole: string;
  currentCompany: string;
  avatarUrl: string;
  linkedinUrl?: string;
  bio: string;
  headline: string;
  expertiseTags: string[];
  yearsOfExperience: number;
  careerBackground: { company: string; role: string; startYear: number; endYear: number }[];
  averageRating: number;
  reviewCount: number;
  topics: { id: string; title: string; description: string; price30min: number; price60min: number; active: boolean }[];
  reviews: ApiReview[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function formatReviewDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function topicToPlan(t: MentorData['topics'][0]): CoachingPlan {
  return {
    id: t.id,
    name: t.title,
    description: t.description,
    pricing: { '30min': t.price30min / 100, '1hr': t.price60min / 100 },
    icon: Video,
  };
}

const FAQS = [
  { q: 'How do I book a session?', a: 'Choose a coaching plan, click Book, and follow the step-by-step flow to pick your duration, date, and time. You\'ll receive a calendar invite immediately after payment.' },
  { q: 'What happens after I book?', a: 'You\'ll be prompted to share your resume, target roles, and focus areas. Your mentor reviews these before the session.' },
  { q: 'Can I cancel or reschedule?', a: 'Yes. You can reschedule or cancel up to 24 hours before your session for a full refund or credit.' },
  { q: 'Will my session be recorded?', a: 'By default, sessions are not recorded. You can request a recording at the start of the call, or use Screna\'s AI note-taker if the mentor permits.' },
  { q: 'How does payment work?', a: 'Payments are processed securely via Stripe when you confirm your booking. The mentor receives the full amount — Screna does not take a commission.' },
  { q: 'What if my mentor doesn\'t show up?', a: 'In the rare event a mentor misses a session, you\'ll automatically receive a full refund and a priority booking token.' },
];

const TIMEZONES = [
  'America/Los_Angeles (PDT, UTC−7)',
  'America/Denver (MDT, UTC−6)',
  'America/Chicago (CDT, UTC−5)',
  'America/New_York (EDT, UTC−4)',
  'Europe/London (BST, UTC+1)',
  'Europe/Berlin (CEST, UTC+2)',
  'Asia/Singapore (SGT, UTC+8)',
  'Asia/Tokyo (JST, UTC+9)',
];
// Current UTC offset (minutes, east-positive) of an IANA zone at a given instant.
const zoneOffsetMinutes = (tz: string, at: Date) => {
  const utc = new Date(at.toLocaleString('en-US', { timeZone: 'UTC' }));
  const zoned = new Date(at.toLocaleString('en-US', { timeZone: tz }));
  return Math.round((zoned.getTime() - utc.getTime()) / 60000);
};

// Best entry in TIMEZONES for the visitor's local zone: an exact IANA id match
// when the browser's zone is in the list, otherwise the entry with the closest
// current UTC offset. Falls back to the first entry if detection fails.
const defaultTimezone = () => {
  try {
    const localId = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const exact = TIMEZONES.find(z => z.split(' ')[0] === localId);
    if (exact) return exact;
    const now = new Date();
    const localOffset = -now.getTimezoneOffset();
    let best = TIMEZONES[0];
    let bestDiff = Infinity;
    for (const z of TIMEZONES) {
      const diff = Math.abs(zoneOffsetMinutes(z.split(' ')[0], now) - localOffset);
      if (diff < bestDiff) { bestDiff = diff; best = z; }
    }
    return best;
  } catch {
    return TIMEZONES[0];
  }
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STEP_LABELS = ['Plan','Date','Time','Notes','Payment'];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`w-4 h-4 ${i <= Math.round(rating) ? 'text-amber-400' : 'text-muted'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  );
}

function RatingBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(value / 5) * 100}%` }} />
    </div>
  );
}

// ─── Booking Modal ────────────────────────────────────────────────────────────

interface BookingModalProps {
  plan: CoachingPlan;
  mentorId: string;
  mentorName: string;
  mentorRole: string;
  mentorCompany: string;
  services: string[];
  onClose: () => void;
}

function BookingModal({ plan, mentorId, mentorName, mentorRole, mentorCompany, services, onClose }: BookingModalProps) {
  const posthog = usePostHog();
  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState<Duration>('30min');
  // 'paid' | 'deal' — which plan type is selected on step 1
  const [planType, setPlanType] = useState<'paid' | 'deal'>('paid');
  // Services the user wants help with (step "Notes"). Wired to the mentor's expertise tags.
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [timezone, setTimezone] = useState(defaultTimezone);
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // IANA id extracted from the selected label, e.g. "America/Los_Angeles (PDT, UTC−7)" → "America/Los_Angeles"
  const tz = timezone.split(' ')[0];

  // Date parts (year, month 0-indexed, day) of a UTC instant rendered in the selected timezone
  const zonedParts = useCallback((iso: string) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric',
    }).formatToParts(new Date(iso));
    const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
    return { year: get('year'), month: get('month') - 1, day: get('day') };
  }, [tz]);

  // Fetch available slots when duration changes
  useEffect(() => {
    if (!mentorId || !plan.id) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedDay(null);
    setSelectedSlot(null);
    getMentorSlots(mentorId, plan.id, duration === '30min' ? 30 : 60)
      .then((res: any) => {
        const data = res.data?.data ?? res.data ?? [];
        const list = Array.isArray(data) ? data : [];
        console.log('[mentor-slots] received', list.length, 'slots; sample:', list[0]);
        setSlots(list);
        if (list.length > 0) {
          const first = zonedParts(list[0].startTime);
          setCalYear(first.year);
          setCalMonth(first.month);
        }
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [mentorId, plan.id, duration]);

  // Days that have at least one slot (computed in the selected timezone)
  const availableDaysSet = useMemo(() => {
    const s = new Set<string>();
    slots.forEach(sl => {
      const d = zonedParts(sl.startTime);
      s.add(`${d.year}-${d.month}-${d.day}`);
    });
    return s;
  }, [slots, zonedParts]);

  // Slots for the currently selected day (matched in the selected timezone)
  const slotsForDay = useMemo(() => {
    if (selectedDay === null) return [];
    return slots.filter(sl => {
      const d = zonedParts(sl.startTime);
      return d.year === calYear && d.month === calMonth && d.day === selectedDay;
    });
  }, [slots, selectedDay, calYear, calMonth, zonedParts]);

  // Changing timezone can shift a slot onto a different calendar day, so clear the selection.
  useEffect(() => {
    setSelectedDay(null);
    setSelectedSlot(null);
  }, [tz]);

  function isDayAvailable(year: number, month: number, day: number) {
    return availableDaysSet.has(`${year}-${month}-${day}`);
  }

  function formatSlotTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isDeal = planType === 'deal';
  // Special Offer config. NOTE: the mentor API has no discount/deal field, so these
  // deal prices are placeholders and are NOT sent to the backend — createBooking still
  // sends the real topicId + duration and the server computes the actual charge.
  // TODO: wire real special-offer pricing once the backend exposes it.
  const DEAL = {
    durations: [
      { key: '30min' as Duration, label: '30 min', price: 25 },
      { key: '1hr' as Duration, label: '1 hour', price: 40 },
    ],
    regularPrice30: plan.pricing['30min'], // used for strikethrough on 30-min option
  };
  const activeDealOption = DEAL.durations.find(d => d.key === duration) ?? DEAL.durations[0];
  const price = isDeal ? activeDealOption.price : plan.pricing[duration];
  const isSuccess = step === 6;

  function toggleService(tag: string) {
    setSelectedServices(prev =>
      prev.includes(tag) ? prev.filter(s => s !== tag) : [...prev, tag]
    );
  }

  // Calendar helpers
  const firstDOW = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  }

  const canContinue =
    step === 1 ? true :
    step === 2 ? selectedDay !== null :
    step === 3 ? selectedSlot !== null :
    step === 4 ? (services.length === 0 || selectedServices.length > 0) && notes.trim().length > 0 :
    true;

  async function handleContinue() {
    if (step < 5) {
      setStep(s => s + 1);
      return;
    }
    if (!selectedSlot) {
      setBookingError('Please select a time slot.');
      return;
    }
    setSubmitting(true);
    setBookingError(null);
    try {
      const res: any = await createBooking(mentorId, {
        topicId: plan.id,
        durationMinutes: duration === '30min' ? 30 : 60,
        startTime: selectedSlot,
        note: notes || undefined,
      });
      const data = res.data?.data ?? res.data ?? {};
      if (data.checkoutUrl) {
        // session_booked —— 成功创建预约（即将跳转 Stripe 付款；实际扣款由 webhook 确认）
        safeCapture(posthog, EVENTS.SESSION_BOOKED, {
          mentor_id: mentorId,
          session_plan: plan.id,
          duration_minutes: duration === '30min' ? 30 : 60,
        });
        window.location.href = data.checkoutUrl;
        return;
      }
      setBookingError('Booking created but no checkout URL was returned. Please contact support.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create booking. Please try again.';
      setBookingError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const formattedDate = selectedDay
    ? `${MONTHS[calMonth]} ${selectedDay}, ${calYear}`
    : '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* ── Header ── */}
        {!isSuccess && (
          <div className="border-b border-border shrink-0">
            {/* Step indicator */}
            <div className="flex items-center gap-0 px-6 pt-5">
              {STEP_LABELS.map((label, i) => {
                const stepNum = i + 1;
                const done = step > stepNum;
                const active = step === stepNum;
                return (
                  <div key={label} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                        done ? 'bg-primary text-primary-foreground' :
                        active ? 'bg-primary text-primary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : stepNum}
                      </div>
                      <span className={`text-[10px] font-medium whitespace-nowrap ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {label}
                      </span>
                    </div>
                    {i < STEP_LABELS.length - 1 && (
                      <div className={`flex-1 h-px mx-1 mt-[-10px] transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-6 pt-4 pb-4">
              <div>
                <h2 className="text-sm font-medium text-foreground">Book a session with {mentorName}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{mentorRole} · {mentorCompany}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 1 — Plan + Duration */}
          {step === 1 && (
            <div className="flex flex-col gap-4">

              {/* ── Special Offer card ── */}
              <div
                onClick={() => setPlanType('deal')}
                className="rounded-xl p-4 flex flex-col gap-2 text-left transition-all"
                style={{
                  background: isDeal ? '#FFFBEB' : '#FFFDF5',
                  border: isDeal ? '2px solid #D97706' : '1.5px solid #FDE68A',
                  cursor: 'pointer',
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-semibold)', color: '#92400E' }}>Special Offer</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    {isDeal && (
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 style={{ width: 12, height: 12, color: '#fff' }} />
                      </div>
                    )}
                    <span style={{ display: 'inline-flex', alignItems: 'center', background: '#D97706', borderRadius: '100px', padding: '2px 8px', fontSize: '10px', fontWeight: 'var(--font-weight-semibold)', color: '#fff', whiteSpace: 'nowrap' }}>OFFER</span>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: 'var(--text-xs)', color: '#78350F', lineHeight: '1.6' }}>
                  A discounted intro session — a low-risk way to experience this mentor. One per mentor, one per week across the platform.
                </p>

                {/* Duration pills */}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }} onClick={e => e.stopPropagation()}>
                  {DEAL.durations.map(opt => {
                    const isActive = duration === opt.key && isDeal;
                    const is30 = opt.key === '30min';
                    const pctOff = is30 && DEAL.regularPrice30 > 0
                      ? Math.round((1 - opt.price / DEAL.regularPrice30) * 100)
                      : null;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => { setPlanType('deal'); setDuration(opt.key); }}
                        style={{
                          display: 'flex', flexDirection: 'column', gap: 2, padding: '7px 12px',
                          borderRadius: '10px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                          background: isActive ? '#FEF3C7' : 'rgba(255,255,255,0.7)',
                          border: isActive ? '1.5px solid #D97706' : '1.5px solid #FDE68A',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Clock style={{ width: 12, height: 12, color: '#D97706', flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', fontWeight: 'var(--font-weight-semibold)', color: '#92400E' }}>
                            {opt.label}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 'var(--font-weight-semibold)', color: '#B45309' }}>
                            · {opt.price === 0 ? 'Free' : `$${opt.price}`}
                          </span>
                        </div>
                        {is30 && pctOff !== null && pctOff > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: '11px', color: 'var(--muted-foreground)', textDecoration: 'line-through' }}>
                              ${DEAL.regularPrice30}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: '100px', padding: '1px 6px', fontSize: '10px', fontWeight: 'var(--font-weight-semibold)', color: '#92400E', whiteSpace: 'nowrap' }}>
                              {pctOff}% off
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Regular Coaching card ── */}
              <button
                onClick={() => setPlanType('paid')}
                className="rounded-xl p-4 flex flex-col gap-1.5 text-left transition-all"
                style={{
                  background: !isDeal ? 'color-mix(in srgb, var(--primary) 4%, transparent)' : 'var(--secondary)',
                  border: !isDeal ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <span className="text-sm font-medium text-foreground">{plan.name}</span>
                  {!isDeal && (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 style={{ width: 12, height: 12, color: '#fff' }} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
              </button>

              {/* ── Duration selector — hidden when Deal selected ── */}
              {!isDeal && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Session duration</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['30min', '1hr'] as Duration[]).map(d => {
                      const label = d === '30min' ? '30 minutes' : '1 hour';
                      const p = plan.pricing[d];
                      const active = duration === d;
                      return (
                        <button
                          key={d}
                          onClick={() => setDuration(d)}
                          className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
                            active
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border bg-card hover:bg-secondary'
                          }`}
                        >
                          <div className={`flex items-center gap-1.5 text-sm font-medium ${active ? 'text-primary' : 'text-foreground'}`}>
                            <Clock className="w-4 h-4" />
                            {label}
                          </div>
                          <span className="text-xs text-muted-foreground">${p} / session</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-muted/60 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Session total</span>
                <span className="text-lg font-medium text-foreground">
                  {isDeal && activeDealOption.price === 0 ? 'Free' : `$${price}`}
                </span>
              </div>
            </div>
          )}

          {/* Step 2 — Timezone + Date */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Your timezone</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-3">Select a date</p>
                <div className="border border-border rounded-xl overflow-hidden">
                  {/* Month nav */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary">
                    <button onClick={prevMonth} className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-foreground">{MONTHS[calMonth]} {calYear}</span>
                    <button onClick={nextMonth} className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 bg-secondary px-2 pb-1">
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                      <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
                    ))}
                  </div>
                  {/* Days grid */}
                  <div className="grid grid-cols-7 gap-0.5 p-2 bg-card">
                    {Array.from({ length: firstDOW }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const avail = isDayAvailable(calYear, calMonth, day);
                      const selected = selectedDay === day;
                      return (
                        <button
                          key={day}
                          disabled={!avail}
                          onClick={() => { setSelectedDay(day); setSelectedSlot(null); }}
                          className={`aspect-square flex items-center justify-center text-xs rounded-lg mx-auto w-full max-w-[36px] transition-colors ${
                            selected
                              ? 'bg-primary text-primary-foreground font-semibold ring-2 ring-primary/40'
                              : avail
                              ? 'bg-primary/10 text-primary font-semibold hover:bg-primary/20 cursor-pointer'
                              : 'text-muted-foreground/40 cursor-default'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  {/* Availability legend */}
                  <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-secondary">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-xs text-muted-foreground">Available</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      <span className="text-xs text-muted-foreground">Unavailable</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Time slot */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Available slots</p>
                <span className="text-xs text-muted-foreground">{formattedDate}</span>
              </div>
              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : slotsForDay.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No slots available for this date.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slotsForDay.map(slot => {
                    const label = formatSlotTime(slot.startTime);
                    const active = selectedSlot === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        onClick={() => setSelectedSlot(slot.startTime)}
                        className={`py-2 px-2 rounded-lg border text-xs font-medium text-center transition-all ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedSlot && (
                <>
                  <div className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Selected: </span>
                    <span className="font-medium text-foreground">{formatSlotTime(selectedSlot)} · {formattedDate}</span>
                  </div>
                  {new Date(selectedSlot).getTime() - Date.now() < 24 * 60 * 60 * 1000 && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      💡 Friendly Reminder: This session starts within the next 24 hours. Please note that to respect the mentor's schedule, bookings made within this timeframe are non-refundable once confirmed.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 4 — Notes */}
          {step === 4 && (
            <div className="flex flex-col gap-5">
              {services.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-foreground">
                      What would you like help with?
                    </label>
                    <span className="text-xs" style={{ color: 'var(--primary)' }}>Required</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">
                    Select one or more services — your mentor will prepare accordingly.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {services.map(tag => {
                      const active = selectedServices.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => toggleService(tag)}
                          className="rounded-full px-3.5 py-1.5 border text-xs font-medium transition-all"
                          style={{
                            background: active ? 'var(--primary)' : 'var(--card)',
                            color: active ? 'var(--primary-foreground)' : 'var(--foreground)',
                            borderColor: active ? 'var(--primary)' : 'var(--border)',
                          }}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-foreground">
                    Notes for your mentor
                  </label>
                  <span className="text-xs" style={{ color: 'var(--primary)' }}>Required</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">
                  Share your context, goals, and anything your mentor should know before the session.
                </p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. I'm preparing for a FAANG PM onsite and struggling with metric-definition questions. I have 2 practice sessions left before my actual interview on May 5th..."
                  rows={5}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-foreground bg-card placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors leading-relaxed"
                />
                <p className="text-xs text-muted-foreground mt-1.5">Please add a note so your mentor can prepare.</p>
              </div>
            </div>
          )}

          {/* Step 5 — Payment */}
          {step === 5 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium text-foreground">Review your booking</p>

              <div className="border border-border rounded-xl overflow-hidden">
                {[
                  { label: 'Mentor',   value: `${mentorName} · ${mentorCompany}` },
                  { label: 'Plan',     value: isDeal ? 'Special Offer' : plan.name },
                  { label: 'Duration', value: duration === '30min' ? '30 minutes' : '1 hour' },
                  { label: 'Date',     value: formattedDate },
                  { label: 'Time',     value: selectedSlot ? formatSlotTime(selectedSlot) : '—' },
                  { label: 'Services', value: selectedServices.join(', ') || '—' },
                ].map((row, i, arr) => (
                  <div key={row.label} className={`flex items-start justify-between gap-4 px-4 py-3 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
                    <span className="text-xs text-muted-foreground w-20 shrink-0">{row.label}</span>
                    <span className="text-xs font-medium text-foreground text-right">{row.value}</span>
                  </div>
                ))}
                {notes && (
                  <div className="flex items-start justify-between gap-4 px-4 py-3 border-t border-border">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">Notes</span>
                    <span className="text-xs text-muted-foreground text-right line-clamp-2">{notes}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-muted/60 rounded-lg px-4 py-3">
                <span className="text-sm font-medium text-foreground">Total</span>
                <span className="text-xl font-medium text-foreground">${price}</span>
              </div>

              <div className="flex items-start gap-2.5 text-xs text-muted-foreground bg-secondary border border-border rounded-lg px-3 py-2.5">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Payments are processed securely via Stripe. If you're not satisfied, Screna will refund you or match you with another mentor.</span>
              </div>

              {bookingError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  {bookingError}
                </div>
              )}
            </div>
          )}

          {/* Step 6 — Success */}
          {step === 6 && (
            <div className="flex flex-col items-center text-center gap-5 py-4">
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-foreground mb-1">Session booked!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  Your session is confirmed. A confirmation email has been sent to you with session details and next steps.
                </p>
              </div>

              <div className="w-full border border-border rounded-xl overflow-hidden">
                {[
                  { label: 'Mentor',   value: mentorName },
                  { label: 'Plan',     value: isDeal ? 'Special Offer' : plan.name },
                  { label: 'Date',     value: formattedDate },
                  { label: 'Time',     value: selectedSlot ? formatSlotTime(selectedSlot) : '—' },
                ].map((row, i, arr) => (
                  <div key={row.label} className={`flex items-center justify-between px-4 py-3 text-left ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-xs font-medium text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Check your email for your calendar invite and Zoom link.
              </p>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!isSuccess && (
          <div className="px-6 py-4 border-t border-border bg-secondary/50 flex items-center justify-between shrink-0">
            {step > 1 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleContinue}
              disabled={!canContinue || submitting}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === 4 ? 'Continue to payment' : step === 5 ? (submitting ? 'Redirecting…' : 'Pay with Stripe') : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MentorDetailsPage() {
  const [searchParams] = useSearchParams();
  const mentorId = searchParams.get('mentorId') ?? '';
  const [activePlan, setActivePlan] = useState<CoachingPlan | null>(null);
  const [mentor, setMentor] = useState<MentorData | null>(null);
  const [loading, setLoading] = useState(!!mentorId);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');

  // mentor_profile_viewed —— 进入 mentor 主页，离开时记录 duration_seconds
  useDwellTracking(EVENTS.MENTOR_PROFILE_VIEWED, () => ({ mentor_id: mentorId }), {
    enabled: !!mentorId,
  });

  useEffect(() => {
    if (!mentorId) return;
    setLoading(true);
    getMentor(mentorId)
      .then((res: any) => setMentor(res.data?.data ?? res.data))
      .catch(() => setMentor(null))
      .finally(() => setLoading(false));
  }, [mentorId]);

  const plans = useMemo(() => (mentor?.topics ?? []).filter(t => t.active).map(topicToPlan), [mentor]);

  const ratingBreakdown = useMemo(() => {
    const reviews = mentor?.reviews ?? [];
    const avg = (key: keyof ApiReview) =>
      reviews.length > 0 ? reviews.reduce((s, r) => s + (r[key] as number), 0) / reviews.length : 0;
    return {
      overall: mentor?.averageRating ?? 0,
      Communication: avg('communicationRating'),
      Expertise: avg('expertiseRating'),
      Helpfulness: avg('helpfulnessRating'),
      Preparation: avg('preparationRating'),
    };
  }, [mentor]);

  if (loading) {
    return (
      <DashboardLayout headerTitle="Mentor Profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle="Mentor Profile">
      {activePlan && mentor && (
        <BookingModal
          plan={activePlan}
          mentorId={mentor.id}
          mentorName={mentor.name}
          mentorRole={mentor.currentRole}
          mentorCompany={mentor.currentCompany}
          services={mentor.expertiseTags ?? []}
          onClose={() => setActivePlan(null)}
        />
      )}

      <div className="w-full max-w-[1200px] mx-auto pb-24 pt-8">

        {/* Back link */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/coaching" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Mentorship
          </Link>
          <Link
            to="/history?tab=mentor"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            View My Sessions
          </Link>
        </div>

        {/* ── 1. Mentor Hero ── */}
        <section className="bg-card rounded-2xl border border-border p-8 mb-8 flex flex-col md:flex-row gap-8 items-start">
          <div className="shrink-0 flex flex-col items-center" style={{ width: 112 }}>
            {mentor?.avatarUrl ? (
              <img src={mentor.avatarUrl} alt={mentor.name} className="w-28 h-28 rounded-2xl object-cover ring-1 ring-border mb-3" />
            ) : (
              <div className="w-28 h-28 rounded-2xl bg-muted border border-border flex items-center justify-center text-2xl font-semibold text-muted-foreground mb-3">
                {mentor ? initials(mentor.name) : '?'}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <StarRating rating={mentor?.averageRating ?? 0} />
              <span className="text-sm font-medium text-foreground ml-1">{mentor?.averageRating?.toFixed(1) ?? '—'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{mentor?.reviewCount ?? 0} reviews</p>
          </div>

          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-foreground" style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-semibold)', lineHeight: '1.25' }}>{mentor?.name ?? '—'}</h1>
              {/* Compact verified badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '100px', padding: '3px 9px' }}>
                <ShieldCheck style={{ width: 12, height: 12, color: '#16a34a', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', color: '#15803d', letterSpacing: '0.01em' }}>Verified</span>
              </div>
              {/* LinkedIn button — only when a URL is available */}
              {mentor?.linkedinUrl && (
                <a
                  href={mentor.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 3, width: 28, height: 28, borderRadius: 7, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', flexShrink: 0, textDecoration: 'none', position: 'relative' }}
                  className="hover:opacity-75"
                  title="LinkedIn profile"
                >
                  <Linkedin style={{ width: 11, height: 11 }} />
                  <ArrowUpRight style={{ width: 9, height: 9, position: 'absolute', top: 4, right: 4 }} />
                </a>
              )}
            </div>

            {/* Title + company + YoE */}
            <div className="flex items-center gap-2 mt-2 flex-wrap text-sm text-muted-foreground">
              <Briefcase style={{ width: 15, height: 15, flexShrink: 0 }} />
              <span>{mentor?.currentRole}</span>
              <span className="text-border">·</span>
              <span className="font-medium text-foreground">{mentor?.currentCompany}</span>
              {!!mentor?.yearsOfExperience && mentor.yearsOfExperience > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-muted-foreground">{mentor.yearsOfExperience}+ yrs experience</span>
                </>
              )}
            </div>

            {/* <div className="flex flex-wrap gap-2 mt-4">
              {(mentor?.expertiseTags ?? []).map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-md bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] border border-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-primary text-xs font-medium">{tag}</span>
              ))}
            </div> */}

            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-2xl">{mentor?.bio}</p>

            <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Experience</p>
                <div className="space-y-3">
                  {(mentor?.careerBackground ?? []).map((exp, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FDF3D8', border: '1px solid #F0D080' }}>
                        <Award className="w-4 h-4" style={{ color: '#D9A419' }} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{exp.role}</p>
                        <p className="text-xs text-muted-foreground">{exp.company} · {exp.startYear} – {exp.endYear || 'Present'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Verification</p>
                <div style={{ width: 'fit-content' }}>
                  <button
                    onClick={() => setVerificationOpen(v => !v)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: '#f0fdf4', border: '1px solid #bbf7d0',
                      borderRadius: verificationOpen ? '10px 10px 0 0' : '10px',
                      padding: '7px 12px', cursor: 'pointer', transition: 'border-radius 0.15s',
                    }}
                  >
                    <ShieldCheck style={{ width: 15, height: 15, color: '#16a34a', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', fontWeight: 'var(--font-weight-semibold)', color: '#15803d' }}>Identity &amp; Experience Verified</span>
                    <ChevronDown style={{ width: 13, height: 13, color: '#16a34a', transition: 'transform 0.2s', transform: verificationOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>
                  {verificationOpen && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        'Work email verified',
                        'LinkedIn verified',
                        `Currently at ${mentor?.currentCompany ?? '—'}`,
                      ].map(line => (
                        <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Check style={{ width: 12, height: 12, color: '#16a34a', flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', color: '#15803d' }}>{line}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: Plans + Reviews + FAQ ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* ── 2. Service Types ── */}
            <section>
              <h2 className="mb-5" style={{ fontFamily: 'var(--font-serif)', color: 'var(--foreground)' }}>Service Types</h2>
              <div className="flex flex-col gap-3">
                {plans.slice(0, 1).map(plan => (
                  <div
                    key={plan.id}
                    className="bg-card rounded-xl border border-border p-6 hover:shadow-sm transition-shadow"
                  >
                    {/* Service tag pills */}
                    <div className="flex flex-wrap gap-2">
                      {(mentor?.expertiseTags ?? []).map(tag => (
                        <span
                          key={tag}
                          className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium"
                          style={{ background: 'var(--secondary)', color: 'var(--foreground)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Duration + pricing row */}
                    <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
                      <div className="flex items-center gap-5">
                        {(['30min', '1hr'] as const).map(d => (
                          <div key={d} className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {d === '30min' ? '30 min' : '1 hr'} · ${plan.pricing[d]}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setActivePlan(plan)}
                        className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 3. Ratings & Reviews ── */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--foreground)' }}>Ratings &amp; Reviews</h2>
                <button
                  onClick={() => setShowReviewForm(v => !v)}
                  className="rounded-lg border border-border bg-card px-4 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  {showReviewForm ? 'Cancel' : 'Write a Review'}
                </button>
              </div>

              {showReviewForm && (
                <div className="rounded-xl border border-border p-5 mb-3 flex flex-col gap-4 bg-card">
                  <p className="text-sm font-medium text-foreground">Share your experience</p>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Your rating</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(i => {
                        const filled = i <= (reviewHover || reviewRating);
                        return (
                          <button
                            key={i}
                            onClick={() => setReviewRating(i)}
                            onMouseEnter={() => setReviewHover(i)}
                            onMouseLeave={() => setReviewHover(0)}
                            className="transition-transform hover:scale-110"
                          >
                            <Star style={{ width: 24, height: 24 }} fill={filled ? '#FFB900' : 'var(--muted)'} stroke={filled ? '#FFB900' : 'var(--muted)'} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-foreground">Your name</label>
                    <input
                      type="text"
                      value={reviewName}
                      onChange={e => setReviewName(e.target.value)}
                      placeholder="e.g. Sarah K."
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-foreground">Your review</label>
                    <textarea
                      value={reviewText}
                      onChange={e => setReviewText(e.target.value)}
                      placeholder="What did you find most valuable about this session?"
                      rows={4}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors leading-relaxed"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      disabled={reviewRating === 0 || !reviewName.trim() || !reviewText.trim()}
                      className="rounded-lg px-5 py-2 bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => {
                        // TODO: no public review-submit API on this page — submitMentorReview(bookingId, ...)
                        // requires a completed-booking id that isn't available in the mentor-profile context.
                        // For now just reset and close the form.
                        setShowReviewForm(false);
                        setReviewRating(0);
                        setReviewHover(0);
                        setReviewName('');
                        setReviewText('');
                      }}
                    >
                      Submit Review
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-card border border-border rounded-xl mb-5 flex flex-col items-center py-6 gap-2">
                <p className="text-5xl font-medium text-foreground tracking-tight leading-none">{ratingBreakdown.overall.toFixed(1)}</p>
                <StarRating rating={ratingBreakdown.overall} />
                <p className="text-xs text-muted-foreground">Based on {mentor?.reviewCount ?? 0} reviews</p>
              </div>

              <div className="space-y-3">
                {(mentor?.reviews ?? []).map(review => (
                  <div key={review.id} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-medium text-foreground shrink-0">
                        {initials(review.reviewerName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{review.reviewerName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StarRating rating={review.overallRating} />
                          <span className="text-xs text-muted-foreground">{formatReviewDate(review.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    {/* <div className="flex gap-2 mb-2">
                      {(review.tags ?? []).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-secondary text-muted-foreground text-xs font-medium rounded-md border border-border">
                          {tag}
                        </span>
                      ))}
                      </div> */}
                    <p className="text-sm text-muted-foreground leading-relaxed">"{review.comment}"</p>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full py-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                Show more reviews
              </button>
            </section>

            {/* ── 4. FAQ ── */}
            <section>
              <h2 className="text-foreground mb-5">Frequently Asked Questions</h2>
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <Accordion type="single" collapsible className="w-full">
                  {FAQS.map((faq, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`} className="px-5 border-border last:border-0">
                      <AccordionTrigger className="text-sm font-medium text-foreground hover:text-primary py-4 hover:no-underline">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-[calc(var(--top-bar-h)+5rem)] flex flex-col gap-4">

              {/* Instructional helper card */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-5 flex flex-col items-center text-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Ready to book?</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Choose a coaching plan on the left and click <strong>Book</strong>. You'll be guided through selecting your duration, date, and time slot in a few simple steps.
                    </p>
                  </div>
                  <div className="w-full border-t border-border pt-4 flex flex-col gap-2">
                    {['Choose a plan', 'Pick duration & date', 'Select a time slot', 'Confirm & pay'].map((step, i) => (
                      <div key={step} className="flex items-center gap-2.5 text-left">
                        <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-xs text-muted-foreground">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Screna guarantee */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] border border-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-sm">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-foreground mb-0.5">Screna Guarantee</p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    If you're not satisfied with your session, we'll refund your credit or match you with another mentor.
                  </p>
                </div>
              </div>

              {/* Quick stats */}
              <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-lg font-medium text-foreground">{mentor?.reviewCount ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Sessions completed</p>
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">{mentor?.averageRating?.toFixed(1) ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Avg. rating</p>
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">{'—'}</p>
                  <p className="text-xs text-muted-foreground">Repeat booking rate</p>
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">24h</p>
                  <p className="text-xs text-muted-foreground">Cancellation window</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
