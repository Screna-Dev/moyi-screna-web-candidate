import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ArrowLeft, Clock, Calendar, Briefcase, Award, Video, ShieldCheck, X,
  ChevronLeft, ChevronRight, CheckCircle2, Loader2,
} from 'lucide-react';
import { DashboardLayout } from './dashboard-layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { getMentor, getMentorSlots } from '../../services/MentorService';

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
    pricing: { '30min': t.price30min, '1hr': t.price60min },
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
  mentorCompany: string;
  onClose: () => void;
}

function BookingModal({ plan, mentorId, mentorName, mentorCompany, onClose }: BookingModalProps) {
  const [step, setStep] = useState(1);
  const [duration, setDuration] = useState<Duration>('30min');
  const [timezone, setTimezone] = useState(TIMEZONES[0]);
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState<{ startTime: string; endTime: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

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
        setSlots(list);
        if (list.length > 0) {
          const first = new Date(list[0].startTime);
          setCalYear(first.getFullYear());
          setCalMonth(first.getMonth());
        }
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [mentorId, plan.id, duration]);

  // Days that have at least one slot
  const availableDaysSet = useMemo(() => {
    const s = new Set<string>();
    slots.forEach(sl => {
      const d = new Date(sl.startTime);
      s.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return s;
  }, [slots]);

  // Slots for the currently selected day
  const slotsForDay = useMemo(() => {
    if (selectedDay === null) return [];
    return slots.filter(sl => {
      const d = new Date(sl.startTime);
      return d.getFullYear() === calYear && d.getMonth() === calMonth && d.getDate() === selectedDay;
    });
  }, [slots, selectedDay, calYear, calMonth]);

  function isDayAvailable(year: number, month: number, day: number) {
    return availableDaysSet.has(`${year}-${month}-${day}`);
  }

  function formatSlotTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const price = plan.pricing[duration];
  const isSuccess = step === 6;

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
    true;

  function handleContinue() {
    if (step < 5) setStep(s => s + 1);
    else setStep(6); // payment → success
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
          <div className="px-6 pt-5 pb-4 border-b border-border shrink-0">
            {/* Step indicator */}
            <div className="flex items-center gap-0 mb-4">
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-foreground">{plan.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">with {mentorName} · {mentorCompany}</p>
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
            <div className="flex flex-col gap-5">
              <div className="bg-secondary border border-border rounded-lg p-4 flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Coaching plan</span>
                <span className="text-sm font-medium text-foreground">{plan.name}</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
              </div>

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

              <div className="bg-muted/60 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Session total</span>
                <span className="text-lg font-medium text-foreground">${price}</span>
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
                              ? 'bg-primary text-primary-foreground font-medium'
                              : avail
                              ? 'text-foreground hover:bg-primary/10 hover:text-primary font-medium cursor-pointer'
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
                <div className="bg-secondary border border-border rounded-lg px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Selected: </span>
                  <span className="font-medium text-foreground">{formatSlotTime(selectedSlot)} · {formattedDate}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Notes */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Add notes to this booking
                </label>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  This can include what you want help with, your context, or anything your mentor should know before the session.
                </p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. I'm preparing for a FAANG PM onsite and struggling with metric-definition questions. I have 2 practice sessions left before my actual interview on May 5th..."
                  rows={6}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm text-foreground bg-card placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors leading-relaxed"
                />
                <p className="text-xs text-muted-foreground mt-1.5">Optional — you can skip this and add notes later.</p>
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
                  { label: 'Plan',     value: plan.name },
                  { label: 'Duration', value: duration === '30min' ? '30 minutes' : '1 hour' },
                  { label: 'Date',     value: formattedDate },
                  { label: 'Time',     value: selectedSlot ? formatSlotTime(selectedSlot) : '—' },
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
                  { label: 'Plan',     value: plan.name },
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
              disabled={!canContinue}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === 4 ? 'Continue to payment' : step === 5 ? 'Pay with Stripe' : 'Continue'}
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
      <DashboardLayout headerTitle="Mentor Profile" noSidebar>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout headerTitle="Mentor Profile" noSidebar>
      {activePlan && mentor && (
        <BookingModal
          plan={activePlan}
          mentorId={mentor.id}
          mentorName={mentor.name}
          mentorCompany={mentor.currentCompany}
          onClose={() => setActivePlan(null)}
        />
      )}

      <div className="w-full max-w-5xl mx-auto pb-24 pt-28">

        {/* Back link */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/marketplace" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Mentorship
          </Link>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Calendar className="w-3.5 h-3.5" />
            View My Sessions
          </button>
        </div>

        {/* ── 1. Mentor Hero ── */}
        <section className="bg-card rounded-2xl border border-border p-8 mb-8 flex flex-col md:flex-row gap-8 items-start">
          <div className="shrink-0 flex flex-col items-center">
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

          <div className="flex-1">
            <h1 className="text-foreground">{mentor?.name ?? '—'}</h1>
            <div className="flex items-center gap-2 mt-1.5 text-sm text-muted-foreground">
              <Briefcase className="w-4 h-4" />
              <span>{mentor?.currentRole}</span>
              <span className="text-border">·</span>
              <span className="font-medium text-foreground">{mentor?.currentCompany}</span>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {(mentor?.expertiseTags ?? []).map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-md bg-primary/8 border border-primary/20 text-primary text-xs font-medium">{tag}</span>
              ))}
            </div>

            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-2xl">{mentor?.bio}</p>

            <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Experience</p>
                <div className="space-y-3">
                  {(mentor?.careerBackground ?? []).map((exp, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4 text-muted-foreground" />
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
                <div className="flex items-center gap-2 text-sm bg-accent/10 text-accent-foreground px-3 py-2 rounded-lg w-fit border border-accent/20">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span className="text-xs font-medium">Identity & Experience Verified</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: Plans + Reviews + FAQ ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* ── 2. Coaching Plans ── */}
            <section>
              <h2 className="text-foreground mb-5">Coaching Plans</h2>
              <div className="flex flex-col gap-4">
                {plans.map(plan => {
                  const Icon = plan.icon;
                  return (
                    <div
                      key={plan.id}
                      className="bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0 text-muted-foreground p-[0px] mx-[0px] my-[20px]">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-foreground" style={{ fontSize: 'var(--text-base)' }}>{plan.name}</h3>
                          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{plan.description}</p>

                          {/* Duration + pricing row */}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            
                            
                            
                          </div>
                        </div>

                        {/* CTA */}
                        <div className="shrink-0 flex flex-col items-end gap-2 pl-2">
                          
                          
                          <button
                            onClick={() => setActivePlan(plan)}
                            className="mt-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap mx-[0px] mt-[20px] mb-[0px]"
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── 3. Ratings & Reviews ── */}
            <section>
              <h2 className="text-foreground mb-5">Ratings & Reviews</h2>

              <div className="bg-card border border-border rounded-xl p-6 mb-5">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="text-center md:w-1/3 shrink-0">
                    <p className="text-5xl font-medium text-foreground tracking-tight">{ratingBreakdown.overall.toFixed(1)}</p>
                    <div className="flex justify-center my-2"><StarRating rating={ratingBreakdown.overall} /></div>
                    <p className="text-xs text-muted-foreground">Based on {mentor?.reviewCount ?? 0} reviews</p>
                  </div>
                  <div className="flex-1 w-full space-y-3 md:pl-8 md:border-l border-border">
                    {[
                      { label: 'Communication', val: ratingBreakdown.Communication },
                      { label: 'Expertise',      val: ratingBreakdown.Expertise },
                      { label: 'Helpfulness',    val: ratingBreakdown.Helpfulness },
                      { label: 'Preparation',    val: ratingBreakdown.Preparation },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-3 text-sm">
                        <span className="w-28 text-muted-foreground text-xs">{item.label}</span>
                        <div className="flex-1"><RatingBar value={item.val} /></div>
                        <span className="w-8 text-right text-xs font-medium text-foreground">{item.val.toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
                    <div className="flex gap-2 mb-2">
                      {(review.tags ?? []).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-secondary text-muted-foreground text-xs font-medium rounded-md border border-border">
                          {tag}
                        </span>
                      ))}
                    </div>
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
              <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15 text-sm">
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
                  <p className="text-lg font-medium text-foreground">{mentor?.yearsOfExperience ? `${mentor.yearsOfExperience}yr` : '—'}</p>
                  <p className="text-xs text-muted-foreground">Experience</p>
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
