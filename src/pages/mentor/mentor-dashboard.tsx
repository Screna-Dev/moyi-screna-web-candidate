import { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { toast } from 'sonner';
import {
  LayoutDashboard, CalendarCheck, MessageSquare, User,
  ShieldCheck, Star, DollarSign, Bell, Search, ChevronRight,
  ChevronDown, Plus, X, AlertCircle, Upload, Send,
  MoreHorizontal, Edit3, Trash2, Eye, Video,
  CheckCircle, RefreshCw, Paperclip,
  Lock, Mail,
  Link, Zap, LogOut,
  Camera, Circle, Minus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  CANDIDATE_DASHBOARD_PATH,
  hasCandidateRole,
  setStoredDashboardMode,
} from '@/components/mentor/dashboard-mode';
import API from '@/services/api';
import {
  getMyMentorProfile,
  updateMyMentorProfile,
  setMyOfficeHours,
  getCalendarAuthUrl,
  connectCalendar,
  listMyMentorBookings,
  setMyVacation,
  uploadMyMentorAvatar,
  getMyMentorEarnings,
  uploadMyPaymentMethod,
  mentorCancelBooking,
  mentorRescheduleBooking,
  updateBookingMentorNote,
  getBookingScriptUploadUrl,
  updateMyTopicPrice,
  getMyMentorReviews,
  getMyMentorTransactions,
  getMyBlockDates,
  createMyBlockDate,
  deleteMyBlockDate,
  getMyAdHocSlots,
  createMyAdHocSlot,
  deleteMyAdHocSlot,
} from '@/services/MentorService';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type NavId = 'overview' | 'bookings' | 'messages' | 'profile' | 'reviews' | 'earnings';
type Override = {
  id: string;
  date: string;        // YYYY-MM-DD
  displayDate: string; // e.g. "May 15, 2025"
  dayName: string;     // e.g. "Thursday"
  type: 'block' | 'slot';
  reason?: string;
  note?: string;
  timeRanges?: string[];
};

/* ─────────────────────────────────────────────
   API DTO TYPES  (GET /mentorship/profile et al.)
───────────────────────────────────────────── */
// Office hours are now grouped per day: each day carries an `active` flag and a
// list of time ranges. Times come back as "HH:mm:ss" strings (readTimeParts also
// tolerates the legacy {hour,minute} object / [h,m] array forms defensively).
type OfficeHourTime = { hour: number; minute: number; second?: number; nano?: number };
type OfficeHourRange = { id?: string; startTime: string | OfficeHourTime; endTime: string | OfficeHourTime };
type OfficeHourDto = { dayOfWeek: number; active: boolean; ranges: OfficeHourRange[] };
type MentorTopicDto = {
  id: string; title: string; description?: string;
  price30min?: number; price60min?: number; active?: boolean; mentorNote?: string;
};
type MentorReviewDto = {
  id: string; reviewerName: string; overallRating: number;
  communicationRating?: number; expertiseRating?: number; helpfulnessRating?: number; preparationRating?: number;
  tags?: string[]; comment?: string; createdAt?: string;
};
type MentorProfileDto = {
  id: string; name: string;
  currentRole?: string; currentCompany?: string; avatarUrl?: string;
  bio?: string; headline?: string; expertiseTags?: string[]; yearsOfExperience?: number;
  careerBackground?: { company: string; role: string; startYear: number; endYear: number }[];
  averageRating?: number; reviewCount?: number;
  topics?: MentorTopicDto[]; reviews?: MentorReviewDto[];
  hasSlotsThisWeek?: boolean; hasSlotsNextWeek?: boolean;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  calendarConnected?: boolean; statusReason?: string;
  officeHours?: OfficeHourDto[]; googleTimezone?: string;
  vacation?: boolean;
};

/** Unwrap the CustomApiResponse `{ status, message, errorCode, data }` envelope. */
function unwrapData<T = any>(res: any): T | undefined {
  return res?.data?.data ?? res?.data;
}

/* ─────────────────────────────────────────────
   SHARED MENTOR PROFILE CONTEXT
   One fetch of GET /mentorship/profile, shared by every page.
───────────────────────────────────────────── */
type MentorProfileCtxValue = {
  profile: MentorProfileDto | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setProfile: (p: MentorProfileDto | null) => void;
};
const MentorProfileContext = createContext<MentorProfileCtxValue | null>(null);
const useMentorProfile = () => useContext(MentorProfileContext);

/* ─────────────────────────────────────────────
   TIME CONVERSION HELPERS  (12h strings ⇄ office-hour DTO)
───────────────────────────────────────────── */
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function parse12h(t: string): { hour: number; minute: number } {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return { hour: 9, minute: 0 };
  let h = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return { hour: h, minute: parseInt(m[2], 10) };
}
function fmt12h(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  let h = hour % 12;
  if (h === 0) h = 12;
  return `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
}
const minutesOf = (t: { hour: number; minute: number }) => t.hour * 60 + t.minute;

const pad2 = (n: number) => String(n).padStart(2, '0');
// Office-hours ranges use 24h "HH:mm" wall-clock in the mentor's calendar timezone.
const toHHmm = (hour: number, minute: number) => `${pad2(hour)}:${pad2(minute)}`;
// The GET response may return a time as a string ("09:00:00"), an object
// ({hour,minute,...}), or an array ([9,0]) depending on backend config.
function readTimeParts(t: any): { hour: number; minute: number } | null {
  if (t == null) return null;
  if (Array.isArray(t)) return { hour: Number(t[0]) || 0, minute: Number(t[1]) || 0 };
  if (typeof t === 'string') {
    const m = t.match(/^(\d{1,2}):(\d{2})/);
    return m ? { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10) } : null;
  }
  if (typeof t === 'object' && t.hour != null) return { hour: Number(t.hour), minute: Number(t.minute) || 0 };
  return null;
}

// Date-specific overrides are backed by the availability blocks (full-day) and
// ad-hoc (one-off extra slots) endpoints.
const SHOW_DATE_OVERRIDES = true;

/* ─────────────────────────────────────────────
   PER-SECTION SAVE STATE + FOOTER
───────────────────────────────────────────── */
type SaveStatus = { dirty: boolean; saving: boolean; saved: boolean; error: string | null };
const CLEAN_STATUS: SaveStatus = { dirty: false, saving: false, saved: false, error: null };

function SectionSaveRow({ status, onSave }: { status: SaveStatus; onSave: () => void }) {
  if (!status.dirty && !status.saved && !status.error) return null;
  return (
    <div className="flex items-center justify-end gap-3 pt-3 mt-4 border-t border-border">
      {status.error ? (
        <span className="mr-auto text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {status.error}</span>
      ) : status.saved && !status.dirty ? (
        <span className="text-xs text-[hsl(165,60%,30%)] flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Saved</span>
      ) : null}
      {(status.dirty || status.error) && (
        <button
          onClick={onSave}
          disabled={status.saving}
          className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status.saving ? 'Saving…' : 'Save'}
        </button>
      )}
    </div>
  );
}

// ── Live mentor bookings (GET /mentorship/profile/bookings) ──────────────────
type MentorBooking = {
  id: string;
  memberName: string;
  memberAvatar: string;
  sessionType: string | string[];
  date: string;
  time: string;
  duration: string;
  status: string;
  note?: string;
  mentorNote?: string;
  recordingLink?: string;
};

const BOOKING_STATUS_TO_UI: Record<string, string> = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'cancelled',
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function bookingDateLabel(d: Date): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(d, now)) return 'Today';
  if (isSameDay(d, tomorrow)) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function mapMentorBooking(api: any): MentorBooking {
  const start = api?.startTime ? new Date(api.startTime) : null;
  const status = BOOKING_STATUS_TO_UI[(api?.status || '').toUpperCase()] || 'pending';
  return {
    id: api?.id || '',
    // The booking DTO does not yet include student identity; fall back to
    // whatever name/avatar fields the response provides.
    memberName: api?.studentName || api?.memberName || api?.mentorName || 'Member',
    memberAvatar: api?.studentAvatarUrl || api?.memberAvatar || api?.mentorAvatarUrl || '',
    sessionType: api?.topicTitle || '—',
    date: start ? bookingDateLabel(start) : '—',
    time: start ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—',
    duration: api?.durationMinutes ? `${api.durationMinutes} min` : '—',
    status,
    note: api?.studentNote || api?.note || '',
    mentorNote: api?.mentorNote || '',
    recordingLink: api?.meetingLink || api?.recordingUrl || undefined,
  };
}

function useMyMentorBookings() {
  const [bookings, setBookings] = useState<MentorBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const aliveRef = useRef(true);
  const load = useCallback(() => {
    setLoading(true);
    return listMyMentorBookings({ page: 0, size: 100 })
      .then((res: any) => {
        const content = res?.data?.data?.content ?? res?.data?.content ?? [];
        if (aliveRef.current) setBookings(Array.isArray(content) ? content.map(mapMentorBooking) : []);
      })
      .catch(() => { if (aliveRef.current) setBookings([]); })
      .finally(() => { if (aliveRef.current) setLoading(false); });
  }, []);
  useEffect(() => {
    aliveRef.current = true;
    load();
    return () => { aliveRef.current = false; };
  }, [load]);
  return { bookings, loading, refetch: load };
}

/* ─────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed:  { label: 'Confirmed',  cls: 'bg-[hsl(165,82%,90%)] text-[hsl(165,82%,25%)]' },
    pending:    { label: 'Pending',    cls: 'bg-[hsl(38,92%,90%)] text-[hsl(38,70%,30%)]' },
    completed:  { label: 'Completed', cls: 'bg-[hsl(220,18%,94%)] text-[hsl(222,12%,40%)]' },
    cancelled:  { label: 'Cancelled', cls: 'bg-[hsl(0,60%,93%)] text-[hsl(0,60%,40%)]' },
    awaiting_reschedule: { label: 'Awaiting Approval', cls: 'bg-[hsl(258,80%,93%)] text-[hsl(258,60%,40%)]' },
    upcoming: { label: 'Upcoming', cls: 'bg-[hsl(210,80%,93%)] text-[hsl(210,60%,35%)]' },
    verified:   { label: 'Verified',  cls: 'bg-[hsl(165,82%,90%)] text-[hsl(165,82%,25%)]' },
    under_review: { label: 'Under Review', cls: 'bg-[hsl(38,92%,90%)] text-[hsl(38,70%,30%)]' },
    not_submitted: { label: 'Not Submitted', cls: 'bg-[hsl(220,18%,94%)] text-[hsl(222,12%,40%)]' },
    rejected:   { label: 'Rejected',  cls: 'bg-[hsl(0,60%,93%)] text-[hsl(0,60%,40%)]' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-secondary text-muted-foreground' };
  return (
    null
  );
}

/* ─────────────────────────────────────────────
   AVATAR
───────────────────────────────────────────── */
function Avatar({ src, name, size = 'md' }: { src?: string; name: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' };
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return src ? (
    <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${sizes[size]} rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0`}>
      {initials}
    </div>
  );
}

/* ─────────────────────────────────────────────
   STAR RATING
───────────────────────────────────────────── */
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const px = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${px} ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-border fill-border'}`} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: OVERVIEW
───────────────────────────────────────────── */
function OverviewPage({ onNavigate, onOpenBooking }: { onNavigate: (id: NavId) => void; onOpenBooking: (bookingId: string) => void }) {
  const ctx = useMentorProfile();
  const profile = ctx?.profile;

  const verificationLabel =
    profile?.status === 'APPROVED' ? 'Verified'
    : profile?.status === 'PENDING' ? 'Pending'
    : profile?.status === 'REJECTED' ? 'Rejected'
    : profile?.status === 'SUSPENDED' ? 'Suspended'
    : 'Verified';

  const { bookings, loading: bookingsLoading } = useMyMentorBookings();
  const profileLoading = !!ctx?.loading;
  const upcomingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'confirmed');

  const summaryCards = [
    { label: 'Upcoming Sessions', value: String(upcomingBookings.length), icon: CalendarCheck, color: 'text-primary', bg: 'bg-primary/8' },
    { label: 'Unread Messages', value: '3', icon: MessageSquare, color: 'text-primary', bg: 'bg-primary/8' },
    { label: 'Average Rating', value: profile?.averageRating != null ? String(profile.averageRating) : '—', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Verification', value: verificationLabel, icon: ShieldCheck, color: 'text-[hsl(165,60%,35%)]', bg: 'bg-[hsl(165,82%,90%)]' },
  ];

  const todaySessions = bookings.filter(b => b.date === 'Today' || b.date === 'Tomorrow').slice(0, 3);

  // Completion checklist reflects the real profile once it has loaded.
  const profileCompletion = [
    { label: 'Profile photo', done: profile ? !!profile.avatarUrl : true },
    { label: 'Bio added', done: profile ? !!profile.bio : true },
    { label: 'Weekly availability set', done: profile ? !!profile.officeHours?.some(d => d.active && d.ranges?.length) : true },
    { label: 'Session price set', done: profile ? !!profile.topics?.some(t => t.price30min != null && t.price60min != null) : true },
    { label: 'Verification submitted', done: profile ? profile.status !== 'PENDING' : true },
  ];
  const doneCount = profileCompletion.filter(p => p.done).length;
  const pct = Math.round((doneCount / profileCompletion.length) * 100);

  const recentReviews = profile?.reviews && profile.reviews.length
    ? profile.reviews.slice(0, 2).map(r => ({ id: r.id, rating: r.overallRating, memberName: r.reviewerName, sessionType: '', text: r.comment ?? '' }))
    : [];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {summaryCards.map(c => (
          c.label === 'Unread Messages' ? null : (
            <div key={c.label} className="bg-card border border-border rounded-[var(--radius)] p-4 flex flex-col gap-2">
              <div className={`w-8 h-8 rounded-md ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <div className="text-xl font-semibold text-foreground leading-none">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          )
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Today's Schedule */}
        <div className="col-span-2 bg-card border border-border rounded-[var(--radius)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground">Today's Schedule</h3>
            <button onClick={() => onNavigate('bookings')} className="text-xs text-primary hover:underline">View all bookings</button>
          </div>
          {bookingsLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading sessions…</div>
          ) : todaySessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No sessions scheduled today.</div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] bg-surface-0 border border-border">
                  <Avatar src={s.memberAvatar} name={s.memberName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{s.memberName}</span>
                      <StatusBadge status={s.status} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.sessionType} · {s.time} · {s.duration}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { if (s.recordingLink) window.open(s.recordingLink, '_blank', 'noopener,noreferrer'); else onNavigate('bookings'); }}
                      className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Join
                    </button>
                    <button
                      onClick={() => onOpenBooking(s.id)}
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-card border border-border rounded-[var(--radius)] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground">Upcoming Sessions</h3>
            <span
              className="rounded-full"
              style={{ fontSize: 'var(--text-xs)', padding: '1px 8px', background: 'var(--color-gray-100, #edeff2)', color: 'var(--muted-foreground)', fontWeight: 'var(--font-weight-medium)' }}
            >
              {upcomingBookings.length}
            </span>
          </div>
          <div className="space-y-2">
            {bookingsLoading ? (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading…</div>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--muted-foreground)' }}>No upcoming sessions.</div>
            ) : (
              upcomingBookings.map(b => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-border bg-surface-0">
                  <Avatar src={b.memberAvatar} name={b.memberName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{b.memberName}</div>
                    <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>
                      {Array.isArray(b.sessionType) ? b.sessionType[0] : b.sessionType} · {b.date} · {b.time}
                    </div>
                  </div>
                  <StatusBadge status="upcoming" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Profile Completion */}
      <div className="bg-card border border-border rounded-[var(--radius)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-foreground">Profile Completion</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{doneCount} of {profileCompletion.length} items complete</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-medium text-foreground">{pct}%</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {profileCompletion.map(item => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              {item.done
                ? <CheckCircle className="w-4 h-4 text-[hsl(165,60%,35%)] shrink-0" />
                : <Circle className="w-4 h-4 text-border shrink-0" />
              }
              <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Reviews preview */}
      <div className="bg-card border border-border rounded-[var(--radius)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground">Recent Reviews</h3>
          <button onClick={() => onNavigate('reviews')} className="text-xs text-primary hover:underline">View all</button>
        </div>
        {profileLoading ? (
          <div className="text-center py-6 text-sm text-muted-foreground">Loading reviews…</div>
        ) : recentReviews.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">No reviews yet.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {recentReviews.map(r => (
              <div key={r.id} className="p-4 rounded-[var(--radius-sm)] bg-surface-0 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <StarRating rating={r.rating} />
                  <span className="text-xs text-muted-foreground">{r.memberName}{r.sessionType ? ` · ${r.sessionType}` : ''}</span>
                </div>
                <p className="text-sm text-foreground line-clamp-2">{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompleteSessionButton({ bookingId, onComplete, label = 'Mark as completed' }: { bookingId: string; onComplete: (id: string, link: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [toast, setToast] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit = (link.trim().length > 0 || file !== null) && !submitting;

  // When a file is provided, ask the API for a presigned upload URL and PUT
  // the bytes directly. The link-only path has no backend hook yet.
  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setErr(null);
    try {
      if (file) {
        const res: any = await getBookingScriptUploadUrl(bookingId);
        const data = res?.data?.data ?? res?.data ?? {};
        const uploadUrl: string | undefined = data.url ?? data.uploadUrl;
        if (!uploadUrl) throw new Error('No upload URL returned.');
        await API.put(uploadUrl, file, {
          baseURL: '',                      // presigned URL is absolute — bypass the /api/v1 prefix
          withCredentials: false,           // S3 / GCS won't accept our auth cookie
          transformRequest: [(d: any) => d],
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });
      }
      onComplete(bookingId, link.trim() || (file?.name ?? ''));
      setOpen(false);
      setLink('');
      setFile(null);
      setToast(true);
      setTimeout(() => setToast(false), 4000);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Could not complete session.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setLink('');
    setFile(null);
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-[100] flex items-start gap-3 rounded-[var(--radius)] border border-border shadow-lg"
          style={{ background: 'var(--card)', padding: 'var(--space-4)', maxWidth: 340, pointerEvents: 'none' }}
        >
          <div className="mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'hsl(165,60%,35%)' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)' }}>Session marked as complete.</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)', marginTop: 2 }}>Earnings will be processed on the 15th.</p>
          </div>
        </div>
      )}

      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        className="px-3 py-1.5 text-xs rounded-md border transition-colors"
        style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', cursor: 'pointer' }}
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            className="bg-card rounded-[var(--radius)] border border-border shadow-lg flex flex-col gap-5 w-full mx-4"
            style={{ maxWidth: 480, padding: 'var(--space-6)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>Complete session</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)', marginTop: 4 }}>
                  Paste a recording link or upload a file before marking this session as complete.
                </p>
              </div>
              <button
                onClick={handleClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4, borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Link input */}
            <div className="flex flex-col gap-2">
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--muted-foreground)' }}>Recording link</label>
              <input
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="Paste Zoom or recording link (e.g. https://zoom.us/rec/...)"
                className="w-full rounded-[var(--radius-sm)] outline-none focus:ring-1 focus:ring-ring"
                style={{
                  fontSize: 'var(--text-sm)', color: 'var(--foreground)',
                  background: 'var(--input-background)', border: '1px solid var(--input)',
                  padding: 'var(--space-2) var(--space-3)',
                }}
              />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' }}>or upload a file</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            {/* File upload drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
              className="rounded-[var(--radius)] border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
              style={{
                borderColor: file ? 'var(--color-blue-400)' : 'var(--border)',
                background: file ? 'var(--color-blue-50)' : 'var(--surface-0)',
                padding: 'var(--space-6)',
              }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path d="M12 16V8m0 0-3 3m3-3 3 3" stroke={file ? 'var(--color-blue-600)' : 'var(--muted-foreground)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 16.5A4.5 4.5 0 0 0 15.5 12H14a6 6 0 1 0-11.8 1.5" stroke={file ? 'var(--color-blue-600)' : 'var(--muted-foreground)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {file ? (
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-blue-700)' }}>{file.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 0 }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)' }}>Click or drag file here</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' }}>MP4, MOV, PDF, ZIP · max 500 MB</span>
                </>
              )}
              <input ref={fileRef} type="file" accept="video/*,.pdf,.zip" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
            </div>

            {/* Warning */}
            <p style={{ fontSize: 'var(--text-xs)', color: '#d97706' }}>
              ⚠ If a dispute arises without a recording, the platform defaults to the learner's account.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="rounded-[var(--radius-sm)] transition-colors"
                style={{
                  fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)',
                  padding: 'var(--space-2) var(--space-4)',
                  background: canSubmit ? 'var(--primary)' : 'var(--secondary)',
                  color: canSubmit ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? 'Uploading…' : 'Submit'}
              </button>
            </div>
            {err && (
              <p className="text-xs text-destructive">{err}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function RescheduleButton({ bookingId, onReschedule }: { bookingId: string; onReschedule: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Form pieces parse to a full timestamp; need both date (YYYY-MM-DD) and time (HH-MM-AMPM) populated.
  const dateParts = date.split('-');
  const timeParts = time.split('-');
  const dateReady = dateParts.length === 3 && dateParts.every(p => p);
  const timeReady = timeParts.length === 3 && timeParts.every(p => p);
  const canSend = dateReady && timeReady && !sending;

  function buildIsoStartTime(): string | null {
    if (!dateReady || !timeReady) return null;
    const [yyyy, mm, dd] = dateParts;
    const [hr12, min, ampm] = timeParts;
    let h = parseInt(hr12, 10) % 12;
    if (ampm === 'PM') h += 12;
    const d = new Date(`${yyyy}-${mm}-${dd}T${String(h).padStart(2, '0')}:${min}:00`);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  function handleSend() {
    const startTime = buildIsoStartTime();
    if (!startTime) return;
    setSending(true);
    setErr(null);
    mentorRescheduleBooking(bookingId, startTime)
      .then(() => {
        onReschedule(bookingId);
        setOpen(false);
        setDate('');
        setTime('');
      })
      .catch((e: any) => setErr(e?.response?.data?.message || 'Could not send reschedule request.'))
      .finally(() => setSending(false));
  }

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        className="px-3 py-1.5 text-xs rounded-md border transition-colors"
        style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', cursor: 'pointer' }}
      >
        Reschedule
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) { setOpen(false); setDate(''); setTime(''); } }}
        >
          <div
            className="bg-card rounded-[var(--radius)] border border-border shadow-lg flex flex-col gap-5 w-full mx-4"
            style={{ maxWidth: 440, padding: 'var(--space-6)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>Reschedule session</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)', marginTop: 4 }}>
                  Pick a new date and time. The learner will need to approve the change.
                </p>
              </div>
              <button
                onClick={() => { setOpen(false); setDate(''); setTime(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4, flexShrink: 0 }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              {/* Date picker */}
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--muted-foreground)' }}>New date</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    {
                      placeholder: 'Mon',
                      options: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => ({ label: m, value: String(i + 1).padStart(2, '0') })),
                      key: 'month' as const,
                    },
                    {
                      placeholder: 'Day',
                      options: Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: String(i + 1).padStart(2, '0') })),
                      key: 'day' as const,
                    },
                    {
                      placeholder: 'Year',
                      options: Array.from({ length: 3 }, (_, i) => ({ label: String(2025 + i), value: String(2025 + i) })),
                      key: 'year' as const,
                    },
                  ].map(({ placeholder, options, key }) => {
                    const parts = date.split('-');
                    const val = key === 'year' ? parts[0] : key === 'month' ? parts[1] : parts[2];
                    return (
                      <select
                        key={key}
                        value={val ?? ''}
                        onChange={e => {
                          const p = date ? date.split('-') : ['', '', ''];
                          if (key === 'year') p[0] = e.target.value;
                          else if (key === 'month') p[1] = e.target.value;
                          else p[2] = e.target.value;
                          setDate(p.join('-'));
                        }}
                        className="rounded-[var(--radius-sm)] outline-none focus:ring-1 focus:ring-ring"
                        style={{ fontSize: 'var(--text-xs)', color: val ? 'var(--foreground)' : 'var(--muted-foreground)', background: 'var(--input-background)', border: '1px solid var(--input)', padding: '6px 4px' }}
                      >
                        <option value="">{placeholder}</option>
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    );
                  })}
                </div>
              </div>

              {/* Time picker */}
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'var(--muted-foreground)' }}>New time</label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    {
                      placeholder: 'Hr',
                      options: Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), value: String(i + 1).padStart(2, '0') })),
                      key: 'hour' as const,
                    },
                    {
                      placeholder: 'Min',
                      options: ['00','15','30','45'].map(m => ({ label: m, value: m })),
                      key: 'min' as const,
                    },
                    {
                      placeholder: 'AM',
                      options: [{ label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }],
                      key: 'ampm' as const,
                    },
                  ].map(({ placeholder, options, key }) => {
                    const parts = time.split('-');
                    const val = key === 'hour' ? parts[0] : key === 'min' ? parts[1] : parts[2];
                    return (
                      <select
                        key={key}
                        value={val ?? ''}
                        onChange={e => {
                          const p = time ? time.split('-') : ['', '', ''];
                          if (key === 'hour') p[0] = e.target.value;
                          else if (key === 'min') p[1] = e.target.value;
                          else p[2] = e.target.value;
                          setTime(p.join('-'));
                        }}
                        className="rounded-[var(--radius-sm)] outline-none focus:ring-1 focus:ring-ring"
                        style={{ fontSize: 'var(--text-xs)', color: val ? 'var(--foreground)' : 'var(--muted-foreground)', background: 'var(--input-background)', border: '1px solid var(--input)', padding: '6px 4px' }}
                      >
                        <option value="">{placeholder}</option>
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setOpen(false); setDate(''); setTime(''); }}
                style={{ fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-2) var(--space-3)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="rounded-[var(--radius-sm)] transition-colors"
                style={{
                  fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)',
                  padding: 'var(--space-2) var(--space-4)',
                  background: canSend ? 'var(--primary)' : 'var(--secondary)',
                  color: canSend ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
                }}
              >
                {sending ? 'Sending…' : 'Send request'}
              </button>
            </div>
            {err && (
              <div className="text-xs text-destructive">{err}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* Mentor's private note on a booking — PATCH /mentorship/profile/bookings/{id}/note.
   Mounted with a key={booking.id} so it re-seeds when a different booking opens. */
function MentorNoteEditor({ bookingId, initialNote, onSaved }: { bookingId: string; initialNote: string; onSaved: (note: string) => void }) {
  const [note, setNote] = useState(initialNote);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = note.trim() !== (initialNote ?? '').trim();

  const handleSave = () => {
    if (saving || !dirty) return;
    setSaving(true);
    setErr(null);
    setSavedAt(false);
    updateBookingMentorNote(bookingId, note.trim())
      .then(() => {
        onSaved(note.trim());
        setSavedAt(true);
        setTimeout(() => setSavedAt(false), 3000);
      })
      .catch((e: any) => {
        // 403 → booking isn't this mentor's; 404 → not found. Surface the message.
        setErr(e?.response?.data?.message || 'Could not save note.');
      })
      .finally(() => setSaving(false));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs text-muted-foreground">Your Private Note</div>
        {savedAt && <span className="text-[11px] text-[hsl(165,60%,35%)] flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Saved</span>}
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={3}
        placeholder="Add a private note about this session (only you can see this)…"
        className="w-full text-sm text-foreground bg-surface-0 rounded-[var(--radius-sm)] p-3 border border-border outline-none focus:ring-1 focus:ring-ring resize-y"
      />
      {err && <div className="text-xs text-destructive mt-1">{err}</div>}
      <div className="flex justify-end mt-2">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save note'}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: BOOKINGS
───────────────────────────────────────────── */
function BookingsPage({ focusBookingId, onFocusHandled }: { focusBookingId?: string | null; onFocusHandled?: () => void } = {}) {
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all');
  const [selectedBooking, setSelectedBooking] = useState<MentorBooking | null>(null);
  // Whether the note editor is expanded in the detail drawer (opened via "Message Member").
  const [noteOpen, setNoteOpen] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [rescheduledIds, setRescheduledIds] = useState<Set<string>>(new Set());
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());

  const { bookings, loading: bookingsLoading, refetch: refetchBookings } = useMyMentorBookings();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // When opened from elsewhere (e.g. the Overview "message" action) with a target
  // booking, switch to the full list and open that booking's detail drawer.
  useEffect(() => {
    if (!focusBookingId) return;
    const match = bookings.find(b => b.id === focusBookingId);
    if (!match) return; // wait until the bookings list has loaded
    setActiveTab('all');
    setSelectedBooking(match);
    onFocusHandled?.();
  }, [focusBookingId, bookings, onFocusHandled]);

  const handleCancel = (bookingId: string) => {
    if (cancellingId) return;
    setCancellingId(bookingId);
    mentorCancelBooking(bookingId)
      .then(() => {
        setCancelledIds(prev => new Set([...prev, bookingId]));
        refetchBookings();
      })
      .catch(() => { /* leave state untouched on failure */ })
      .finally(() => setCancellingId(null));
  };

  const tabs = ['all', 'upcoming', 'completed', 'cancelled'] as const;
  const filtered = activeTab === 'all'
    ? bookings
    : activeTab === 'upcoming'
      ? bookings.filter(b => b.status === 'pending' || b.status === 'confirmed')
      : bookings.filter(b => b.status === activeTab);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className={`flex flex-col overflow-hidden transition-all ${selectedBooking ? 'flex-1' : 'flex-1'}`}>
        {/* Tabs */}
        <div className="px-6 pt-6">
          <div className="flex items-center gap-[4px]">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className="flex items-center gap-[8px] px-[14px] py-[8px] rounded-[16px] transition-colors capitalize"
                style={{
                  background: activeTab === t ? 'var(--color-gray-100, #edeff2)' : 'transparent',
                  color: activeTab === t ? 'var(--foreground)' : 'var(--muted-foreground)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: activeTab === t ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {t}
                <span
                  className="rounded-full flex items-center justify-center"
                  style={{
                    fontSize: 'var(--text-xs)',
                    padding: '1px 6px',
                    background: activeTab === t ? 'var(--color-gray-200, #d8dbe2)' : 'var(--secondary)',
                    color: activeTab === t ? 'var(--foreground)' : 'var(--muted-foreground)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  {t === 'all' ? bookings.length : t === 'upcoming' ? bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length : bookings.filter(b => b.status === t).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filtered.map(b => (
            <div
              key={b.id}
              onClick={() => setSelectedBooking(b)}
              className={`bg-card border rounded-[var(--radius)] p-4 cursor-pointer hover:border-primary/30 transition-colors ${
                selectedBooking?.id === b.id ? 'border-primary/40 shadow-sm' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-4">
                <Avatar src={b.memberAvatar} name={b.memberName} size="lg" />
                <div className="flex-1 min-w-0 p-[0px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{b.memberName}</span>
                    <StatusBadge status={completedIds.has(b.id) ? 'completed' : rescheduledIds.has(b.id) ? 'awaiting_reschedule' : cancelledIds.has(b.id) ? 'cancelled' : (b.status === 'pending' || b.status === 'confirmed') ? 'upcoming' : b.status} />
                  </div>
                  <div className="flex items-center flex-wrap gap-[var(--space-1)] mt-0.5 px-[0px] py-[6px]">
                    {(Array.isArray(b.sessionType) ? b.sessionType : [b.sessionType]).map((plan: string) => (
                      <span
                        key={plan}
                        className="inline-flex items-center rounded-full"
                        style={{
                          padding: 'var(--space-1) var(--space-3)',
                          background: 'var(--color-blue-50)',
                          border: '1px solid var(--color-blue-200)',
                          color: 'var(--color-blue-700)',
                          fontSize: 'var(--text-xs)',
                        }}
                      >
                        {plan}
                      </span>
                    ))}
                    <span className="text-xs text-muted-foreground">· {b.date} at {b.time} · {b.duration}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1 max-w-lg">{b.note}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(b.status === 'pending' || b.status === 'confirmed') && !completedIds.has(b.id) && !rescheduledIds.has(b.id) && !cancelledIds.has(b.id) && (
                    <>
                      <RescheduleButton
                        bookingId={b.id}
                        onReschedule={id => { setRescheduledIds(prev => new Set([...prev, id])); refetchBookings(); }}
                      />
                      <button
                        onClick={e => { e.stopPropagation(); handleCancel(b.id); }}
                        disabled={cancellingId === b.id}
                        className="px-3 py-1.5 text-xs border rounded-md transition-colors disabled:opacity-50"
                        style={{ borderColor: 'var(--destructive)', color: 'var(--destructive)', background: 'transparent', cursor: cancellingId === b.id ? 'not-allowed' : 'pointer' }}
                      >
                        {cancellingId === b.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                      {b.status === 'confirmed' && (
                        <button onClick={e => e.stopPropagation()} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">Join</button>
                      )}
                    </>
                  )}
                  {/* Completed bookings: upload the session recording / records. */}
                  {b.status === 'completed' && !cancelledIds.has(b.id) && (
                    completedIds.has(b.id) ? (
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'hsl(165,60%,35%)' }}>Records uploaded ✓</span>
                    ) : (
                      <CompleteSessionButton
                        bookingId={b.id}
                        label="Upload Records"
                        onComplete={(id, link) => setCompletedIds(prev => new Set([...prev, id]))}
                      />
                    )
                  )}
                  {rescheduledIds.has(b.id) && (
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', color: 'hsl(258,60%,40%)' }}>Awaiting approval</span>
                  )}
                  <button onClick={e => { e.stopPropagation(); setSelectedBooking(b); }} className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {bookingsLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Loading bookings…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No {activeTab} bookings.</div>
          ) : null}
        </div>
      </div>

      {/* Detail Drawer */}
      {selectedBooking && (
        <div className="w-80 border-l border-border bg-card flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-foreground">Booking Details</h3>
            <button onClick={() => { setSelectedBooking(null); setNoteOpen(false); }} className="p-1 rounded-md hover:bg-secondary text-muted-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar src={selectedBooking.memberAvatar} name={selectedBooking.memberName} size="lg" />
              <div>
                <div className="font-medium text-foreground">{selectedBooking.memberName}</div>
                <StatusBadge status={selectedBooking.status} />
              </div>
            </div>
            <div className="space-y-2 bg-surface-0 rounded-[var(--radius-sm)] p-3 border border-border">
              <div className="flex justify-between items-start text-sm gap-2">
                <span className="text-muted-foreground shrink-0">Coaching Plans</span>
                <div className="flex flex-wrap gap-[var(--space-1)] justify-end">
                  {(Array.isArray(selectedBooking.sessionType) ? selectedBooking.sessionType : [selectedBooking.sessionType]).map((plan: string) => (
                    <span
                      key={plan}
                      className="inline-flex items-center rounded-full"
                      style={{
                        padding: 'var(--space-1) var(--space-3)',
                        background: 'var(--color-blue-50)',
                        border: '1px solid var(--color-blue-200)',
                        color: 'var(--color-blue-700)',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      {plan}
                    </span>
                  ))}
                </div>
              </div>
              {[
                ['Date', selectedBooking.date],
                ['Time', selectedBooking.time],
                ['Duration', selectedBooking.duration],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-foreground font-medium">{v}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1.5">Member Note</div>
              <p className="text-sm text-foreground bg-surface-0 rounded-[var(--radius-sm)] p-3 border border-border">{selectedBooking.note || <span className="text-muted-foreground">No note from the member.</span>}</p>
            </div>
            {selectedBooking.status === 'pending' && (
              <div className="space-y-2">
                <button className="w-full py-2 text-sm bg-primary text-primary-foreground rounded-[var(--radius-sm)] hover:bg-primary/90 transition-colors">Accept Booking</button>
                <button className="w-full py-2 text-sm border border-border rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary transition-colors">Request Reschedule</button>
                <button className="w-full py-2 text-sm border border-destructive/30 text-destructive rounded-[var(--radius-sm)] hover:bg-destructive/5 transition-colors">Decline</button>
              </div>
            )}
            {selectedBooking.status === 'confirmed' && (
              <div className="space-y-2">
                <button className="w-full py-2 text-sm bg-primary text-primary-foreground rounded-[var(--radius-sm)] hover:bg-primary/90 transition-colors">Join Session</button>
                <button
                  onClick={() => setNoteOpen(v => !v)}
                  className="w-full py-2 text-sm border border-border rounded-[var(--radius-sm)] text-muted-foreground hover:bg-secondary transition-colors"
                >
                  {noteOpen ? 'Hide Note' : 'Message Member'}
                </button>
              </div>
            )}
            {noteOpen && selectedBooking.status === 'confirmed' && (
              <MentorNoteEditor
                key={selectedBooking.id}
                bookingId={selectedBooking.id}
                initialNote={selectedBooking.mentorNote ?? ''}
                onSaved={note => {
                  // Keep the open drawer and list row in sync without a full refetch.
                  setSelectedBooking(prev => (prev ? { ...prev, mentorNote: note } : prev));
                  refetchBookings();
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: AVAILABILITY
───────────────────────────────────────────── */
function AvailabilityPage() {
  const ctx = useMentorProfile();
  const profile = ctx?.profile;

  const days = WEEK_DAYS;
  const [dayEnabled, setDayEnabled] = useState<Record<string, boolean>>({
    Monday: false, Tuesday: false, Wednesday: false, Thursday: false, Friday: false, Saturday: false, Sunday: false,
  });
  const [vacationMode, setVacationMode] = useState(false);
  const [vacationSaving, setVacationSaving] = useState(false);
  const [bufferTime, setBufferTime] = useState('15 min');
  const [maxWindow, setMaxWindow] = useState('4 weeks');
  const [timezone, setTimezone] = useState('Pacific Time (US & Canada)');
  const [savingHours, setSavingHours] = useState(false);
  const [hoursToast, setHoursToast] = useState<{ ok: boolean; msg: string } | null>(null);
  // True when the weekly schedule has edits not yet pushed to office hours.
  const [scheduleDirty, setScheduleDirty] = useState(false);

  const [slots, setSlots] = useState<Record<string, string[]>>({});

  // ── Seed weekly schedule from the mentor's real office hours when loaded ──
  // Defensive: a malformed/partial entry must never throw (it would bubble out
  // of this effect to the route error boundary and blank the whole page).
  useEffect(() => {
    if (!profile) return; // wait for the real profile before populating the grid
    const oh = Array.isArray(profile.officeHours) ? profile.officeHours : [];
    try {
      const enabled: Record<string, boolean> = {
        Monday: false, Tuesday: false, Wednesday: false, Thursday: false, Friday: false, Saturday: false, Sunday: false,
      };
      const next: Record<string, string[]> = {};
      // New shape: one entry per day with `active` + a `ranges` array. Inactive
      // days still return their ranges (they just don't generate slots), so the
      // day's enabled state comes from `active`, not from range presence.
      oh.forEach(e => {
        const day = WEEK_DAYS[((e?.dayOfWeek ?? 0) as number) - 1]; // ISO 1=Mon … 7=Sun
        if (!day) return;
        enabled[day] = !!e?.active;
        const ranges = Array.isArray(e?.ranges) ? e.ranges : [];
        ranges.forEach(r => {
          const st = readTimeParts(r?.startTime);
          const en = readTimeParts(r?.endTime);
          if (!st || !en) return;
          const range = `${fmt12h(st.hour, st.minute)} – ${fmt12h(en.hour, en.minute)}`;
          next[day] = [...(next[day] ?? []), range];
        });
      });
      setDayEnabled(enabled);
      setSlots(next);
      setScheduleDirty(false); // freshly loaded from the server
      if (profile?.googleTimezone) setTimezone(profile.googleTimezone);
      setVacationMode(!!profile?.vacation);
    } catch {
      /* unexpected shape — leave the current schedule untouched rather than crash */
    }
  }, [profile]);

  // ── Persist weekly schedule via PUT /mentorship/profile/office-hours ──
  // Full-week replace: send `activeDays` for ALL 7 days (so the per-day on/off
  // state is authoritative) plus one `ranges` entry per individual time slot.
  // Every dayOfWeek that appears in `ranges` is guaranteed to be in `activeDays`.
  // Inactive days keep their ranges (active:false) instead of being dropped.
  const handleSaveAvailability = () => {
    const ranges: { dayOfWeek: number; startTime: string; endTime: string }[] = [];
    const activeDays: { dayOfWeek: number; active: boolean }[] = [];
    const invalidDays: string[] = [];
    for (const d of days) {
      const dayOfWeek = WEEK_DAYS.indexOf(d) + 1;
      activeDays.push({ dayOfWeek, active: !!dayEnabled[d] });
      for (const s of slots[d] ?? []) {
        const [a, b] = s.split(/\s*[–—-]\s*/); // en dash, em dash, or hyphen
        const start = parse12h(a);
        const end = parse12h(b || a);
        // Backend rejects endTime <= startTime — catch it here with a clear message.
        if (minutesOf(end) <= minutesOf(start)) { invalidDays.push(d); continue; }
        ranges.push({
          dayOfWeek,
          startTime: toHHmm(start.hour, start.minute), // 24h "HH:mm" wall-clock
          endTime: toHHmm(end.hour, end.minute),
        });
      }
    }
    if (invalidDays.length) {
      setHoursToast({ ok: false, msg: `${Array.from(new Set(invalidDays)).join(', ')}: end time must be after start time.` });
      return;
    }
    setSavingHours(true);
    setHoursToast(null);
    setMyOfficeHours({ ranges, activeDays })
      .then(() => {
        setScheduleDirty(false);
        ctx?.refetch();
        setHoursToast({ ok: true, msg: 'Availability saved.' });
        setTimeout(() => setHoursToast(null), 3000);
      })
      // Keep backend validation errors visible (don't auto-hide) so they can be read.
      .catch((err: any) => {
        const data = err?.response?.data;
        const msg =
          data?.message
          || (Array.isArray(data?.errors) ? data.errors.map((e: any) => e?.defaultMessage || e?.message || e?.field).filter(Boolean).join('; ') : null)
          || data?.errorCode
          || (typeof data === 'string' ? data : null)
          || `Could not save availability${err?.response?.status ? ` (${err.response.status})` : ''}.`;
        setHoursToast({ ok: false, msg });
      })
      .finally(() => setSavingHours(false));
  };

  // Persist vacation mode via PUT /mentorship/profile/vacation.
  // Server-side: hides mentor from marketplace, returns [] for slots, and
  // rejects new bookings with 400 while vacation=true.
  const applyVacation = (next: boolean) => {
    if (vacationSaving) return;
    setVacationSaving(true);
    // Optimistic: flip the UI immediately, roll back on failure.
    setVacationMode(next);
    if (next) {
      setDayEnabled({ Monday: false, Tuesday: false, Wednesday: false, Thursday: false, Friday: false, Saturday: false, Sunday: false });
      setSlots({});
      setScheduleDirty(true);
    }
    setMyVacation(next)
      .then(() => { ctx?.refetch(); })
      .catch((err: any) => {
        setVacationMode(!next);
        const msg = err?.response?.data?.message || `Could not ${next ? 'enable' : 'disable'} vacation mode.`;
        setHoursToast({ ok: false, msg });
      })
      .finally(() => setVacationSaving(false));
  };

  // Inline row editor
  const [inlineDay, setInlineDay] = useState<string | null>(null);
  const [inlineStart, setInlineStart] = useState('9:00 AM');
  const [inlineEnd, setInlineEnd] = useState('10:00 AM');

  // Quick-add popover
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [qaDay, setQaDay] = useState('Monday');
  const [qaStart, setQaStart] = useState('9:00 AM');
  const [qaEnd, setQaEnd] = useState('10:00 AM');
  const [qaApplyTo, setQaApplyTo] = useState<string[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  // Date overrides — backed by the availability blocks + ad-hoc endpoints.
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [savingOverride, setSavingOverride] = useState(false);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<'block' | 'slot'>('block');
  const [drawerDate, setDrawerDate] = useState('');
  const [drawerReason, setDrawerReason] = useState('');
  const [drawerNote, setDrawerNote] = useState('');
  const [drawerRanges, setDrawerRanges] = useState<{start: string; end: string}[]>([{ start: '9:00 AM', end: '10:00 AM' }]);

  const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
  };
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // ── Load date overrides from the availability endpoints ──
  // Block id → "block-{id}", ad-hoc id → "adhoc-{id}" so removeOverride knows
  // which endpoint to hit. Each ad-hoc record is a single time range.
  const blockToOverride = (b: any): Override => ({
    id: `block-${b?.id}`,
    date: b?.blockDate,
    displayDate: formatDisplayDate(b?.blockDate),
    dayName: getDayName(b?.blockDate),
    type: 'block',
    reason: b?.reason || undefined,
  });
  const adhocToOverride = (a: any): Override => {
    const st = readTimeParts(a?.startTime);
    const en = readTimeParts(a?.endTime);
    const range = st && en ? `${fmt12h(st.hour, st.minute)} – ${fmt12h(en.hour, en.minute)}` : '';
    return {
      id: `adhoc-${a?.id}`,
      date: a?.adhocDate,
      displayDate: formatDisplayDate(a?.adhocDate),
      dayName: getDayName(a?.adhocDate),
      type: 'slot',
      timeRanges: range ? [range] : [],
    };
  };
  const loadOverrides = useCallback(() => {
    Promise.all([
      getMyBlockDates().catch(() => null),
      getMyAdHocSlots().catch(() => null),
    ]).then(([bRes, aRes]) => {
      const blocks = unwrapData<any[]>(bRes);
      const adhoc = unwrapData<any[]>(aRes);
      setOverrides([
        ...(Array.isArray(blocks) ? blocks.map(blockToOverride) : []),
        ...(Array.isArray(adhoc) ? adhoc.map(adhocToOverride) : []),
      ]);
    });
    // mappers are pure/stable; intentionally empty deps for a one-shot loader
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { loadOverrides(); }, [loadOverrides]);

  const openDrawer = () => {
    setDrawerType('block');
    setDrawerDate('');
    setDrawerReason('');
    setDrawerNote('');
    setDrawerRanges([{ start: '9:00 AM', end: '10:00 AM' }]);
    setDrawerOpen(true);
  };

  const saveOverride = () => {
    if (!drawerDate || savingOverride) return;
    setSavingOverride(true);
    setHoursToast(null);
    const done = () => { setSavingOverride(false); setDrawerOpen(false); loadOverrides(); };
    const fail = (err: any) => {
      setSavingOverride(false);
      const msg = err?.response?.data?.message
        || `Could not save ${drawerType === 'block' ? 'this block' : 'this extra availability'}.`;
      setHoursToast({ ok: false, msg }); // keep drawer open so the error is actionable
    };
    if (drawerType === 'block') {
      // The API stores a single internal-only `reason`; fold the optional note in.
      const reason = [drawerReason, drawerNote].map(s => s?.trim()).filter(Boolean).join(' — ') || undefined;
      createMyBlockDate({ blockDate: drawerDate, reason }).then(done).catch(fail);
    } else {
      // Ad-hoc is one record per range (no note field) — POST each range.
      const payloads = drawerRanges.map(r => {
        const s = parse12h(r.start);
        const e = parse12h(r.end);
        return { adhocDate: drawerDate, startTime: toHHmm(s.hour, s.minute), endTime: toHHmm(e.hour, e.minute) };
      });
      Promise.all(payloads.map(p => createMyAdHocSlot(p))).then(done).catch(fail);
    }
  };

  const removeOverride = (id: string) => {
    const sep = id.indexOf('-');
    const kind = id.slice(0, sep);
    const realId = id.slice(sep + 1);
    const req = kind === 'block' ? deleteMyBlockDate(realId) : deleteMyAdHocSlot(realId);
    setOverrides(prev => prev.filter(o => o.id !== id)); // optimistic
    req.catch(() => { loadOverrides(); setHoursToast({ ok: false, msg: 'Could not remove this override.' }); });
  };
  const addDrawerRange = () => setDrawerRanges(prev => [...prev, { start: '9:00 AM', end: '10:00 AM' }]);
  const removeDrawerRange = (i: number) => setDrawerRanges(prev => prev.filter((_, idx) => idx !== i));
  const updateDrawerRange = (i: number, field: 'start' | 'end', value: string) =>
    setDrawerRanges(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const timeOptions = [
    '6:00 AM','7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM',
    '12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM',
    '6:00 PM','7:00 PM','8:00 PM','9:00 PM','10:00 PM',
  ];

  const removeSlot = (day: string, slot: string) => {
    const remaining = (slots[day] ?? []).filter(s => s !== slot);
    setSlots(prev => ({ ...prev, [day]: remaining }));
    // Deleting the last slot makes the day unavailable. Turn the switch off so
    // save omits the day instead of falling back to the default 9–5 range
    // (which would silently "un-clear" the schedule).
    if (remaining.length === 0) setDayEnabled(prev => ({ ...prev, [day]: false }));
    setScheduleDirty(true);
  };

  const openInline = (day: string) => {
    setInlineDay(day);
    // Seed with the first start/end that aren't already taken on this day.
    const blockedStart = blockedTimesFor(day, 'start');
    const start = timeOptions.find(t => !blockedStart.has(t)) ?? timeOptions[0];
    const blockedEnd = blockedTimesFor(day, 'end');
    const end = timeOptions.find(t => mins(t) > mins(start) && !blockedEnd.has(t)) ?? nextTime(start);
    setInlineStart(start);
    setInlineEnd(end);
  };

  const saveInline = (day: string) => {
    const newSlot = `${inlineStart} – ${inlineEnd}`;
    setSlots(prev => ({ ...prev, [day]: [...(prev[day] ?? []), newSlot] }));
    setInlineDay(null);
    setScheduleDirty(true);
  };

  const saveQuickAdd = () => {
    const newSlot = `${qaStart} – ${qaEnd}`;
    const targets = Array.from(new Set([qaDay, ...qaApplyTo]));
    setSlots(prev => {
      const next = { ...prev };
      targets.forEach(d => { next[d] = [...(next[d] ?? []), newSlot]; });
      return next;
    });
    setQuickAddOpen(false);
    setQaApplyTo([]);
    setScheduleDirty(true);
  };

  const toggleQaApply = (day: string) =>
    setQaApplyTo(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  useEffect(() => {
    if (!quickAddOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        addBtnRef.current && !addBtnRef.current.contains(e.target as Node)
      ) setQuickAddOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [quickAddOpen]);

  // Minutes-since-midnight for a "9:00 AM" label, for ordering/comparison.
  const mins = (label: string) => minutesOf(parse12h(label));
  // The option right after `label` (clamped) — used to bump end past a new start.
  const nextTime = (label: string) => timeOptions[Math.min(timeOptions.indexOf(label) + 1, timeOptions.length - 1)];

  // Hour options already covered by an existing slot on `day`, so they can't be
  // re-picked. `kind` controls boundary handling so adjacent slots stay allowed:
  //   start → [lo, hi)  (can start at a previous slot's end)
  //   end   → (lo, hi]  (can end at the next slot's start)
  const blockedTimesFor = (day: string, kind: 'start' | 'end') => {
    const blocked = new Set<string>();
    (slots[day] ?? []).forEach(s => {
      const [a, b] = s.split(/\s*[–—-]\s*/);
      const lo = mins(a), hi = mins(b || a);
      timeOptions.forEach(t => {
        const m = mins(t);
        const inside = kind === 'start' ? (m >= lo && m < hi) : (m > lo && m <= hi);
        if (inside) blocked.add(t);
      });
    });
    return blocked;
  };

  const timeSelect = (
    value: string,
    onChange: (v: string) => void,
    opts?: { minExclusive?: string; blocked?: Set<string> },
  ) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-xs border border-input rounded-[var(--radius-sm)] px-2 py-1 bg-input-background text-foreground outline-none focus:ring-1 focus:ring-ring"
    >
      {timeOptions.map(t => {
        // End must be strictly after start, and already-used hours are off-limits.
        const disabled =
          (opts?.minExclusive != null && mins(t) <= mins(opts.minExclusive)) ||
          (opts?.blocked?.has(t) ?? false);
        return <option key={t} value={t} disabled={disabled}>{t}</option>;
      })}
    </select>
  );

  return (
    <div className="p-6 border-t border-border">
      <div className="grid grid-cols-3 gap-6">
        {/* Weekly Rules */}
        <div className="col-span-2 space-y-4">
          {/* Vacation Mode Banner */}
          {vacationMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius)] p-4 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-amber-800">Vacation Mode is on</div>
                <div className="text-xs text-amber-600 mt-0.5">New bookings are paused. Existing confirmed sessions remain active.</div>
              </div>
              <button onClick={() => applyVacation(false)} disabled={vacationSaving} className="text-xs text-amber-700 border border-amber-300 px-3 py-1 rounded-md hover:bg-amber-100 transition-colors disabled:opacity-50">
                Turn Off
              </button>
            </div>
          )}

          <div className="bg-card border border-border rounded-[var(--radius)] p-5">
            {hoursToast && (
              <div className={`mb-3 text-xs px-3 py-2 rounded-[var(--radius-sm)] flex items-center gap-2 ${hoursToast.ok ? 'bg-[hsl(165,82%,95%)] text-[hsl(165,60%,30%)]' : 'bg-red-50 text-red-700'}`}>
                {hoursToast.ok ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {hoursToast.msg}
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-foreground">Weekly Recurring Schedule</h3>
                {scheduleDirty && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Unsaved</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveAvailability}
                  disabled={savingHours || !scheduleDirty}
                  className="text-xs px-3 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingHours ? 'Saving…' : 'Save availability'}
                </button>
                {/* Quick-add popover */}
                <div className="relative">
                  <button
                    ref={addBtnRef}
                    onClick={() => setQuickAddOpen(v => !v)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add time slot
                  </button>
                {quickAddOpen && (
                  <div
                    ref={popoverRef}
                    className="absolute right-0 top-7 z-50 w-72 bg-card border border-border rounded-[var(--radius)] shadow-lg p-4 space-y-3"
                  >
                    <div className="text-xs font-medium text-foreground">Quick-add time slot</div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Day</label>
                      <select
                        value={qaDay}
                        onChange={e => setQaDay(e.target.value)}
                        className="w-full text-xs border border-input rounded-[var(--radius-sm)] px-2 py-1.5 bg-input-background text-foreground outline-none focus:ring-1 focus:ring-ring"
                      >
                        {days.map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Time range</label>
                      <div className="flex items-center gap-2">
                        {timeSelect(qaStart, v => { setQaStart(v); if (mins(qaEnd) <= mins(v)) setQaEnd(nextTime(v)); }, { blocked: blockedTimesFor(qaDay, 'start') })}
                        <span className="text-xs text-muted-foreground">–</span>
                        {timeSelect(qaEnd, setQaEnd, { minExclusive: qaStart, blocked: blockedTimesFor(qaDay, 'end') })}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Also apply to</label>
                      <div className="flex flex-wrap gap-1.5">
                        {days.filter(d => d !== qaDay).map(d => (
                          <button
                            key={d}
                            onClick={() => toggleQaApply(d)}
                            className={`text-xs px-2 py-0.5 rounded-md border transition-colors ${qaApplyTo.includes(d) ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:border-primary/20'}`}
                          >
                            {d.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={saveQuickAdd} className="flex-1 text-xs py-1.5 bg-primary text-primary-foreground rounded-[var(--radius-sm)] hover:bg-primary/90 transition-colors">Add</button>
                      <button onClick={() => setQuickAddOpen(false)} className="flex-1 text-xs py-1.5 border border-border text-muted-foreground rounded-[var(--radius-sm)] hover:bg-secondary transition-colors">Cancel</button>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {days.map(day => {
                const dayBlocks = overrides.filter(o => o.type === 'block' && o.dayName === day);
                const daySlotOverrides = overrides.filter(o => o.type === 'slot' && o.dayName === day);
                const isBlocked = dayBlocks.length > 0;
                return (
                <div key={day} className={`rounded-[var(--radius-sm)] border transition-colors ${isBlocked ? 'border-red-200 bg-red-50/40' : dayEnabled[day] ? 'border-border bg-surface-0' : 'border-border bg-secondary/30'}`}>
                  {/* Override banner */}
                  {isBlocked && (
                    <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                      <Minus className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="text-xs text-red-500">
                        Blocked on {dayBlocks.map(b => b.displayDate).join(', ')}{dayBlocks[0].reason ? ` — ${dayBlocks[0].reason}` : ''}
                      </span>
                    </div>
                  )}
                  {daySlotOverrides.length > 0 && !isBlocked && (
                    <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                      <CheckCircle className="w-3 h-3 text-[hsl(165,60%,35%)] shrink-0" />
                      <span className="text-xs text-[hsl(165,60%,35%)]">
                        Extra slot on {daySlotOverrides.map(s => s.displayDate).join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3">
                    <button
                      onClick={() => { setDayEnabled(prev => ({ ...prev, [day]: !prev[day] })); setScheduleDirty(true); }}
                      className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${dayEnabled[day] ? 'bg-primary' : 'bg-[var(--switch-background)] border border-border'}`}
                    >
                      <span className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${dayEnabled[day] ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                    </button>
                    <span className={`w-24 text-sm shrink-0 ${isBlocked ? 'line-through text-muted-foreground' : dayEnabled[day] ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{day}</span>
                    {dayEnabled[day] ? (
                      <div className="flex-1 flex flex-wrap gap-2 items-center">
                        {(slots[day] ?? []).map((slot, i) => (
                          <span key={`${day}-${i}-${slot}`} className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1 ${isBlocked ? 'bg-red-100 text-red-400 line-through' : 'bg-primary/8 text-primary'}`}>
                            {slot}
                            {!isBlocked && <button onClick={() => removeSlot(day, slot)} className="ml-0.5 hover:text-primary/60"><X className="w-3 h-3" /></button>}
                          </span>
                        ))}
                        {/* Enabled with no time added yet — prompt instead of a phantom default. */}
                        {!isBlocked && !(slots[day]?.length) && inlineDay !== day && (
                          <span className="text-xs text-muted-foreground">Add a time slot</span>
                        )}
                        {!isBlocked && inlineDay !== day && (
                          <button
                            onClick={() => openInline(day)}
                            className="text-xs text-muted-foreground border border-dashed border-border px-2 py-1 rounded-md hover:border-primary hover:text-primary transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unavailable</span>
                    )}
                  </div>
                  {/* Inline time-range editor */}
                  {inlineDay === day && (
                    <div className="flex items-center gap-2 px-3 pb-3 border-t border-border/50 pt-2.5">
                      <span className="text-xs text-muted-foreground w-24 shrink-0">New slot</span>
                      <div className="flex items-center gap-2 flex-1 flex-wrap">
                        {timeSelect(inlineStart, v => { setInlineStart(v); if (mins(inlineEnd) <= mins(v)) setInlineEnd(nextTime(v)); }, { blocked: blockedTimesFor(day, 'start') })}
                        <span className="text-xs text-muted-foreground">–</span>
                        {timeSelect(inlineEnd, setInlineEnd, { minExclusive: inlineStart, blocked: blockedTimesFor(day, 'end') })}
                        <button onClick={() => saveInline(day)} className="text-xs px-2.5 py-1 bg-primary text-primary-foreground rounded-[var(--radius-sm)] hover:bg-primary/90 transition-colors">Add</button>
                        <button onClick={() => setInlineDay(null)} className="text-xs px-2.5 py-1 border border-border text-muted-foreground rounded-[var(--radius-sm)] hover:bg-secondary transition-colors">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          </div>

          {/* Date Overrides — hidden until a backend endpoint exists */}
          {SHOW_DATE_OVERRIDES && (
          <div className="bg-card border border-border rounded-[var(--radius)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-foreground">Date Overrides</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Block specific days or add one-off availability.</p>
              </div>
              <button
                onClick={openDrawer}
                className="text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-md hover:bg-primary/5 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add override
              </button>
            </div>
            {overrides.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No overrides yet. Click "Add override" to block a date or add one-off availability.</p>
            ) : (
              <div className="space-y-2">
                {overrides.map(o => (
                  <div key={o.id} className={`p-3 rounded-[var(--radius-sm)] border ${o.type === 'block' ? 'border-red-200 bg-red-50' : 'border-[hsl(165,82%,80%)] bg-[hsl(165,82%,95%)]'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {o.type === 'block'
                          ? <Minus className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                          : <Plus className="w-3.5 h-3.5 text-[hsl(165,60%,35%)] mt-0.5 shrink-0" />}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{o.displayDate}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${o.type === 'block' ? 'bg-red-100 text-red-600' : 'bg-[hsl(165,82%,88%)] text-[hsl(165,60%,30%)]'}`}>
                              {o.type === 'block' ? 'Blocked' : 'Extra availability'}
                            </span>
                          </div>
                          {o.type === 'block' && o.reason && (
                            <p className="text-xs text-muted-foreground mt-0.5">Reason: {o.reason}</p>
                          )}
                          {o.type === 'slot' && o.timeRanges && (
                            <p className="text-xs text-muted-foreground mt-0.5">{o.timeRanges.join(', ')}</p>
                          )}
                          {o.note && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">"{o.note}"</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => removeOverride(o.id)} className="p-1 rounded-md hover:bg-secondary text-muted-foreground shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>

        {/* Settings Panel */}
        <div className="space-y-4">
          {/* Vacation Mode */}
          <div className="bg-card border border-border rounded-[var(--radius)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">Vacation Mode</div>
                <div className="text-xs text-muted-foreground mt-0.5">Pause all new booking requests.</div>
              </div>
              <button
                onClick={() => applyVacation(!vacationMode)}
                disabled={vacationSaving}
                className={`w-9 h-5 rounded-full relative transition-colors shrink-0 disabled:opacity-60 ${vacationMode ? 'bg-amber-400' : 'bg-[var(--switch-background)] border border-border'}`}
              >
                <span className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform ${vacationMode ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
              </button>
            </div>
          </div>

          {/* Booking Settings (read-only — managed by the platform / Google Calendar) */}
          <div className="bg-card border border-border rounded-[var(--radius)] p-4 space-y-4">
            <h3 className="text-foreground text-sm">Booking Settings</h3>
            {[
              { label: 'Timezone', value: timezone, hint: 'From Google Calendar' },
            ].map(s => (
              <div key={s.label}>
                <label className="text-xs text-muted-foreground">{s.label}</label>
                <div
                  className="mt-1 w-full text-sm border border-input rounded-[var(--radius-sm)] px-2.5 py-1.5 flex items-center justify-between gap-2"
                  style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)', cursor: 'not-allowed' }}
                >
                  <span className="truncate">{s.value}</span>
                  <span className="shrink-0" style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' }}>{s.hint}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Add Date Override Drawer (hidden until backend endpoint exists) ── */}
      {SHOW_DATE_OVERRIDES && (<>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      {/* Drawer panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-96 bg-card border-l border-border shadow-xl flex flex-col transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h3 className="text-foreground">Add Date Override</h3>
          <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Override type */}
          <div>
            <label className="text-xs text-muted-foreground block mb-2">Override type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDrawerType('block')}
                className={`flex flex-col items-start gap-1 p-3 rounded-[var(--radius-sm)] border text-left transition-colors ${drawerType === 'block' ? 'border-red-300 bg-red-50' : 'border-border hover:border-border/80 hover:bg-secondary/50'}`}
              >
                <div className="flex items-center gap-1.5">
                  <Minus className={`w-3.5 h-3.5 ${drawerType === 'block' ? 'text-red-500' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${drawerType === 'block' ? 'text-red-700' : 'text-foreground'}`}>Block this date</span>
                </div>
                <span className="text-xs text-muted-foreground">Mark as unavailable</span>
              </button>
              <button
                onClick={() => setDrawerType('slot')}
                className={`flex flex-col items-start gap-1 p-3 rounded-[var(--radius-sm)] border text-left transition-colors ${drawerType === 'slot' ? 'border-[hsl(165,82%,70%)] bg-[hsl(165,82%,95%)]' : 'border-border hover:border-border/80 hover:bg-secondary/50'}`}
              >
                <div className="flex items-center gap-1.5">
                  <Plus className={`w-3.5 h-3.5 ${drawerType === 'slot' ? 'text-[hsl(165,60%,35%)]' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-medium ${drawerType === 'slot' ? 'text-[hsl(165,60%,30%)]' : 'text-foreground'}`}>Add one-off availability</span>
                </div>
                <span className="text-xs text-muted-foreground">Extra time outside schedule</span>
              </button>
            </div>
          </div>

          {/* Date picker */}
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Date</label>
            <input
              type="date"
              value={drawerDate}
              onChange={e => setDrawerDate(e.target.value)}
              className="w-full text-sm border border-input rounded-[var(--radius-sm)] px-3 py-2 bg-input-background text-foreground outline-none focus:ring-1 focus:ring-ring"
            />
            {drawerDate && (
              <p className="text-xs text-muted-foreground mt-1">{getDayName(drawerDate)}, {formatDisplayDate(drawerDate)}</p>
            )}
          </div>

          {/* Block: reason + note */}
          {drawerType === 'block' && (
            <>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Reason <span className="text-muted-foreground/60">(optional)</span></label>
                <select
                  value={drawerReason}
                  onChange={e => setDrawerReason(e.target.value)}
                  className="w-full text-sm border border-input rounded-[var(--radius-sm)] px-3 py-2 bg-input-background text-foreground outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Select a reason…</option>
                  {['Travel', 'Personal', 'Holiday', 'Sick leave', 'Training', 'Other'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Note <span className="text-muted-foreground/60">(optional)</span></label>
                <textarea
                  value={drawerNote}
                  onChange={e => setDrawerNote(e.target.value)}
                  placeholder="Add a private note…"
                  rows={3}
                  className="w-full text-sm border border-input rounded-[var(--radius-sm)] px-3 py-2 bg-input-background text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </>
          )}

          {/* Slot: time ranges + note */}
          {drawerType === 'slot' && (
            <>
              <div>
                <label className="text-xs text-muted-foreground block mb-2">Time ranges</label>
                <div className="space-y-2">
                  {drawerRanges.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {timeSelect(r.start, v => updateDrawerRange(i, 'start', v))}
                      <span className="text-xs text-muted-foreground">–</span>
                      {timeSelect(r.end, v => updateDrawerRange(i, 'end', v))}
                      {drawerRanges.length > 1 && (
                        <button onClick={() => removeDrawerRange(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addDrawerRange}
                  className="mt-2 text-xs text-primary flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add another range
                </button>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Note <span className="text-muted-foreground/60">(optional)</span></label>
                <textarea
                  value={drawerNote}
                  onChange={e => setDrawerNote(e.target.value)}
                  placeholder="Add a private note…"
                  rows={3}
                  className="w-full text-sm border border-input rounded-[var(--radius-sm)] px-3 py-2 bg-input-background text-foreground outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-border flex gap-2">
          <button
            onClick={saveOverride}
            disabled={!drawerDate || savingOverride}
            className="flex-1 py-2 text-sm bg-primary text-primary-foreground rounded-[var(--radius-sm)] hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save Override
          </button>
          <button
            onClick={() => setDrawerOpen(false)}
            className="flex-1 py-2 text-sm border border-border text-muted-foreground rounded-[var(--radius-sm)] hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
      </>)}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: MESSAGES
───────────────────────────────────────────── */
// No backend endpoint for mentor↔candidate messaging yet. Empty until the API exists.
type Conversation = {
  id: string;
  memberName: string;
  memberAvatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  bookingStatus: string;
  thread: { from: 'member' | 'mentor'; text: string; time: string }[];
};

function MessagesPage() {
  const conversations: Conversation[] = [];
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState('');

  const quickReplies = [
    'Send availability',
    'Confirm session',
    'Ask for resume',
    'Share prep tips',
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Conversation list */}
      <div className="w-72 border-r border-border flex flex-col bg-card overflow-hidden">
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2 bg-surface-0 border border-border rounded-[var(--radius-sm)] px-3 py-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input placeholder="Search conversations…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">No conversations yet.</div>
          ) : conversations.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveConvo(c)}
              className={`w-full text-left p-3 border-b border-border hover:bg-secondary/50 transition-colors ${activeConvo?.id === c.id ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-start gap-2.5">
                <div className="relative">
                  <Avatar src={c.memberAvatar} name={c.memberName} size="md" />
                  {c.unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-medium">{c.unread}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <span className={`text-sm ${c.unread > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>{c.memberName}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-1">{c.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                  <div className="mt-1"><StatusBadge status={c.bookingStatus} /></div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Thread header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          {activeConvo ? (
            <>
              <Avatar src={activeConvo.memberAvatar} name={activeConvo.memberName} size="md" />
              <div>
                <div className="text-sm font-medium text-foreground">{activeConvo.memberName}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <StatusBadge status={activeConvo.bookingStatus} />
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Select a conversation</div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button className="p-2 rounded-md hover:bg-secondary text-muted-foreground transition-colors"><Video className="w-4 h-4" /></button>
            <button className="p-2 rounded-md hover:bg-secondary text-muted-foreground transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeConvo ? activeConvo.thread.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === 'mentor' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-3.5 py-2.5 rounded-[var(--radius)] text-sm ${
                msg.from === 'mentor'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground'
              }`}>
                <p>{msg.text}</p>
                <p className={`text-[11px] mt-1 ${msg.from === 'mentor' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>{msg.time}</p>
              </div>
            </div>
          )) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No messages.</div>
          )}
        </div>

        {/* Quick replies */}
        <div className="px-4 pt-2 pb-1 flex gap-2 flex-wrap">
          {quickReplies.map(r => (
            <button key={r} onClick={() => setDraft(r)} className="text-xs border border-border px-2.5 py-1 rounded-full text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors">
              {r}
            </button>
          ))}
        </div>

        {/* Composer */}
        <div className="p-3 border-t border-border bg-card">
          <div className="flex items-end gap-2 bg-surface-0 border border-border rounded-[var(--radius)] px-3 py-2">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Write a message…"
              rows={2}
              className="flex-1 bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center gap-1 pb-0.5">
              <button className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors"><Paperclip className="w-3.5 h-3.5" /></button>
              <button
                disabled={!draft.trim()}
                className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: PROFILE
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   TOPICS CARD
   PUT /mentorship/profile/topic/price  (set 30 / 60-min prices, in cents)
   The mentor's single topic is auto-created (title="Mentorship Session") when
   admin approves them — there is no client-side create. Mentors only set price.
   List comes from MentorProfileDto.topics — no separate GET endpoint exists.
   Backend stores prices in cents; the UI shows / accepts dollars.
───────────────────────────────────────────── */
// Title and description are fixed for every mentor; the UI displays these and
// mentors only choose the 30 / 60-minute prices.
const FIXED_TOPIC_TITLE = 'Mentorship Session';
const FIXED_TOPIC_DESCRIPTION =
  'A one-on-one mentorship session to discuss your goals, get tailored guidance, and ask questions.';

function TopicsCard({ topics, onChanged }: { topics: MentorTopicDto[]; onChanged: () => void }) {
  // A mentor has a single auto-created topic; the form only edits its prices via
  // PUT /mentorship/profile/topic/price (no topicId, no create/deactivate).
  const editingTopic = topics.find(t => t.active) ?? topics[0] ?? null;

  const [price30, setPrice30] = useState('');
  const [price60, setPrice60] = useState('');
  const [status, setStatus] = useState<SaveStatus>(CLEAN_STATUS);

  const centsToInput = (c?: number) =>
    typeof c === 'number' ? (c / 100).toFixed(2) : '';

  // Seed / re-seed the form whenever the editing target changes.
  useEffect(() => {
    setPrice30(centsToInput(editingTopic?.price30min));
    setPrice60(centsToInput(editingTopic?.price60min));
    setStatus(CLEAN_STATUS);
  }, [editingTopic?.id, editingTopic?.price30min, editingTopic?.price60min]);

  const markDirty = () => setStatus(s => ({ ...s, dirty: true, saved: false, error: null }));

  // Parse "12.50" → 1250 cents. Returns undefined when blank, null when invalid.
  const dollarsToCents = (s: string): number | undefined | null => {
    const t = s.trim();
    if (!t) return undefined;
    const n = Number(t);
    if (!isFinite(n) || n < 0) return null;
    return Math.round(n * 100);
  };

  const handleSave = () => {
    const p30 = dollarsToCents(price30);
    const p60 = dollarsToCents(price60);
    if (p30 === null || p60 === null) { setStatus(s => ({ ...s, error: 'Prices must be non-negative numbers.' })); return; }
    // Pricing is required: both 30- and 60-minute prices must be set before a
    // mentor profile can go live (each duration is independently bookable).
    if (p30 === undefined || p60 === undefined) { setStatus(s => ({ ...s, error: 'Both 30- and 60-minute prices are required.' })); return; }
    // Only send fields the mentor actually entered; an omitted price is left
    // unchanged backend-side (a price, once set, cannot be cleared).
    const payload: { price30min?: number; price60min?: number } = {};
    if (p30 !== undefined) payload.price30min = p30;
    if (p60 !== undefined) payload.price60min = p60;
    setStatus(s => ({ ...s, saving: true, error: null }));
    updateMyTopicPrice(payload)
      .then(() => {
        setStatus({ dirty: false, saving: false, saved: true, error: null });
        onChanged();
      })
      .catch((e: any) => setStatus(s => ({ ...s, saving: false, error: e?.response?.data?.message || 'Could not save your session prices.' })));
  };

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-5">
      <div className="mb-4">
        <h3 className="text-foreground text-lg font-medium mb-1">Mentorship Session</h3>
        <p className="text-sm text-muted-foreground">
          Set your 30- and 60-minute session prices. Both are required before your
          profile can go live.
        </p>
      </div>

      {/* Pricing form — single always-active offering */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Price 30 min (USD)<span className="text-destructive ml-0.5">*</span></label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <input
                value={price30}
                onChange={e => { setPrice30(e.target.value); markDirty(); }}
                placeholder="50.00"
                inputMode="decimal"
                className="flex-1 text-sm border border-input rounded-[var(--radius-sm)] px-3 py-2 bg-input-background text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Price 60 min (USD)<span className="text-destructive ml-0.5">*</span></label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <input
                value={price60}
                onChange={e => { setPrice60(e.target.value); markDirty(); }}
                placeholder="90.00"
                inputMode="decimal"
                className="flex-1 text-sm border border-input rounded-[var(--radius-sm)] px-3 py-2 bg-input-background text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>
        <SectionSaveRow status={status} onSave={handleSave} />
      </div>
    </div>
  );
}

function ProfilePage() {
  const ctx = useMentorProfile();
  const profile = ctx?.profile;
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [years, setYears] = useState('');
  // Per-section save state so each card saves on its own (no single sticky bar).
  const [basic, setBasic] = useState<SaveStatus>(CLEAN_STATUS);
  const [svc, setSvc] = useState<SaveStatus>(CLEAN_STATUS);
  const [verify, setVerify] = useState<SaveStatus>(CLEAN_STATUS);
  const [services, setServices] = useState([
    'Mock Interview',
    'Resume Review',
    'Career Coaching'
  ]);
  const [newService, setNewService] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [editServiceValue, setEditServiceValue] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  // Verification fields are already approved — editing them re-triggers review,
  // so they stay read-only behind an explicit "Edit" button (unlike other cards).
  const [editingVerify, setEditingVerify] = useState(false);

  // Avatar upload — wires the existing Camera button to a hidden <input type="file">.
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const handleAvatarPick = (file: File | null) => {
    if (!file || avatarUploading) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast('Avatar must be a JPEG or PNG image.');
      if (avatarFileRef.current) avatarFileRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Avatar must be 5 MB or smaller.');
      if (avatarFileRef.current) avatarFileRef.current.value = '';
      return;
    }
    setAvatarUploading(true);
    uploadMyMentorAvatar(file)
      .then(res => {
        const updated = unwrapData<MentorProfileDto>(res);
        if (updated) ctx?.setProfile(updated);
        else ctx?.refetch();
      })
      .catch(() => { /* swallow — no toast slot in this card */ })
      .finally(() => {
        setAvatarUploading(false);
        if (avatarFileRef.current) avatarFileRef.current.value = '';
      });
  };

  // Seed editable fields from the real profile once it loads.
  useEffect(() => {
    if (!profile) return;
    if (profile.name != null) setName(profile.name);
    if (profile.headline != null) setHeadline(profile.headline);
    if (profile.bio != null) setBio(profile.bio);
    if (profile.currentRole != null) setTitle(profile.currentRole);
    if (profile.currentCompany != null) setCompany(profile.currentCompany);
    if (profile.yearsOfExperience != null) setYears(String(profile.yearsOfExperience));
    if (Array.isArray(profile.expertiseTags)) setServices(profile.expertiseTags);
    if ((profile as any).linkedinUrl != null) setLinkedin((profile as any).linkedinUrl);
    if ((profile as any).workEmail != null) setWorkEmail((profile as any).workEmail);
    setBasic(CLEAN_STATUS); setSvc(CLEAN_STATUS); setVerify(CLEAN_STATUS);
  }, [profile]);

  // Fall back to the signed-in account email when the profile has no work email.
  useEffect(() => {
    const email = (user as any)?.email;
    if (email) setWorkEmail(prev => prev || email);
  }, [user]);

  const markBasic = () => setBasic(s => ({ ...s, dirty: true, saved: false, error: null }));
  const markSvc = () => setSvc(s => ({ ...s, dirty: true, saved: false, error: null }));
  const markVerify = () => setVerify(s => ({ ...s, dirty: true, saved: false, error: null }));

  // PUT supports partial updates, so each section sends only its own fields.
  const saveSection = (payload: Record<string, any>, set: React.Dispatch<React.SetStateAction<SaveStatus>>, onSuccess?: () => void) => {
    set(s => ({ ...s, saving: true, error: null }));
    updateMyMentorProfile(payload)
      .then(res => {
        const updated = unwrapData<MentorProfileDto>(res);
        if (updated) ctx?.setProfile(updated);
        set({ dirty: false, saving: false, saved: true, error: null });
        setTimeout(() => set(s => ({ ...s, saved: false })), 2500);
        onSuccess?.();
      })
      .catch((err: any) => set(s => ({ ...s, saving: false, error: err?.response?.data?.message || 'Could not save. Please try again.' })));
  };

  const saveBasic = () => saveSection({ bio, currentRole: title, currentCompany: company, yearsOfExperience: Number(years) || 0 }, setBasic);
  const saveServices = () => saveSection({ expertiseTags: services }, setSvc);
  // workEmail / linkedinUrl aren't in the documented schema yet — sent so they
  // persist once the backend adds the fields (unknown fields are ignored).
  const saveVerify = () => saveSection({ workEmail, linkedinUrl: linkedin }, setVerify, () => setEditingVerify(false));

  // Re-seed from the approved profile values and drop the dirty flag.
  const cancelVerify = () => {
    setWorkEmail((profile as any)?.workEmail ?? (user as any)?.email ?? '');
    setLinkedin((profile as any)?.linkedinUrl ?? '');
    setVerify(CLEAN_STATUS);
    setEditingVerify(false);
  };

  const handleAddService = () => {
    if (newService.trim() && !services.includes(newService.trim())) {
      setServices([...services, newService.trim()]);
      setNewService('');
      setIsAddingService(false);
      markSvc();
    }
  };

  const handleRemoveService = (tagToRemove: string) => {
    setServices(services.filter(s => s !== tagToRemove));
    if (editingService === tagToRemove) {
      setEditingService(null);
      setEditServiceValue('');
    }
    markSvc();
  };

  const handleSaveEditService = (oldTag: string) => {
    const trimmed = editServiceValue.trim();
    if (trimmed && trimmed !== oldTag) {
      if (!services.includes(trimmed)) {
        setServices(services.map(s => s === oldTag ? trimmed : s));
        markSvc();
      }
    }
    setEditingService(null);
    setEditServiceValue('');
  };

  // ── Google Calendar connect (same OAuth flow as the marketplace apply page) ──
  const calendarConnected = !!profile?.calendarConnected;
  const [calConnecting, setCalConnecting] = useState(false);
  const [calMsg, setCalMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleConnectCalendar = async () => {
    setCalConnecting(true);
    setCalMsg(null);
    try {
      const redirectUri = `${window.location.origin}/mentor-dashboard`;
      const res = await getCalendarAuthUrl(redirectUri);
      const data: Record<string, any> = (res as any).data?.data ?? (res as any).data ?? {};
      const authUrl: string | undefined =
        data.authUrl ?? data.url ?? (Object.values(data).find(v => typeof v === 'string' && (v as string).startsWith('http')) as string | undefined);
      if (!authUrl) throw new Error('No auth URL returned');
      // Persist the exact redirectUri so the /connect call after the redirect-back is byte-identical.
      sessionStorage.setItem('mentorCalendarRedirectUri', redirectUri);
      window.location.assign(authUrl);
    } catch {
      setCalMsg({ ok: false, msg: 'Failed to start Google authorization. Please try again.' });
      setCalConnecting(false);
    }
  };

  // Handle the OAuth redirect-back (?code & ?state, or ?error) on /mentor-dashboard.
  const calReturnHandled = useRef(false);
  useEffect(() => {
    if (calReturnHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    if (!code && !error) return;
    calReturnHandled.current = true;
    const cleanUrl = () => window.history.replaceState({}, '', window.location.pathname);
    if (error || !code || !state) {
      setCalMsg({ ok: false, msg: error ? decodeURIComponent(error) : 'Missing authorization parameters.' });
      sessionStorage.removeItem('mentorCalendarRedirectUri');
      cleanUrl();
      return;
    }
    const redirectUri = sessionStorage.getItem('mentorCalendarRedirectUri') ?? `${window.location.origin}/mentor-dashboard`;
    setCalConnecting(true);
    connectCalendar({ code, redirectUri, state })
      .then(() => { setCalMsg({ ok: true, msg: 'Google Calendar connected.' }); ctx?.refetch(); })
      .catch((err: any) => setCalMsg({ ok: false, msg: err?.response?.data?.message ?? 'Failed to connect Google Calendar. Please try again.' }))
      .finally(() => { setCalConnecting(false); sessionStorage.removeItem('mentorCalendarRedirectUri'); cleanUrl(); });
  }, []);

  return (
    <div className="flex">
      {/* Edit panel */}
      <div className="flex-1 p-6 space-y-5 min-w-0">
        {/* Basic Info */}
        <div className="bg-card border border-border rounded-[var(--radius)] p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar src={profile?.avatarUrl} name={name} size="xl" />
              <button
                onClick={() => avatarFileRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow disabled:opacity-60"
              >
                <Camera className="w-3 h-3" />
              </button>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={e => handleAvatarPick(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{name}</div>
              <div className="text-xs text-muted-foreground">{title}{title && company ? ' · ' : ''}{company}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Display Name', value: name, set: setName, required: true },
              { label: 'Location', value: location, set: setLocation, required: false },
              { label: 'Current Title', value: title, set: setTitle, required: true },
              { label: 'Current Company', value: company, set: setCompany, required: true },
              { label: 'Years of Experience', value: years, set: setYears, required: true },
            ].map(f => (
              f.label !== 'Location' ? (
                <div key={f.label}>
                  <label className="text-xs text-muted-foreground">
                    {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
                  </label>
                  <input
                    value={f.value}
                    onChange={e => { f.set(e.target.value); markBasic(); }}
                    className="mt-1 w-full text-sm border border-input rounded-[var(--radius-sm)] px-3 py-2 bg-input-background text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              ) : null
            ))}
          </div>


          <div>
            <label className="text-xs text-muted-foreground">Bio<span className="text-destructive ml-0.5">*</span></label>
            <textarea value={bio} rows={4} onChange={e => { setBio(e.target.value); markBasic(); }} className="mt-1 w-full text-sm border border-input rounded-[var(--radius-sm)] px-3 py-2 bg-input-background text-foreground outline-none resize-none focus:ring-1 focus:ring-ring" />
          </div>

          <SectionSaveRow status={basic} onSave={saveBasic} />
        </div>

        {/* Mentorship Session pricing — PUT /mentorship/profile/topic/price */}
        <TopicsCard topics={profile?.topics ?? []} onChanged={() => ctx?.refetch()} />

        {/* Coaching Plans */}
        <div className="bg-card border border-border rounded-[var(--radius)] p-5">
          <div className="mb-4">
            <h3 className="text-foreground text-lg font-medium mb-1">Coaching Plans</h3>
            <p className="text-sm text-muted-foreground">Define the services you provide as a mentor.</p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Services I Provide<span className="text-destructive ml-0.5">*</span></label>
            <div className="flex flex-wrap items-center gap-[var(--space-2)] mt-[var(--space-2)]">
              {services.map(s => (
                editingService === s ? (
                  <div
                    key={s}
                    className="flex items-center gap-[var(--space-2)] px-[var(--space-2)] py-[var(--space-1)] rounded-[var(--radius-sm)] shadow-sm transition-all"
                    style={{ background: 'var(--color-blue-50)', border: '1px solid var(--color-blue-300)' }}
                  >
                    <input
                      autoFocus
                      value={editServiceValue}
                      onChange={e => setEditServiceValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveEditService(s);
                        if (e.key === 'Escape') { setEditingService(null); setEditServiceValue(''); }
                      }}
                      placeholder="Service name"
                      className="w-36 rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)] outline-none focus:ring-1"
                      style={{
                        fontSize: 'var(--text-sm)',
                        background: 'var(--input-background)',
                        border: '1px solid var(--color-blue-300)',
                        color: 'var(--foreground)',
                        // @ts-ignore
                        '--tw-ring-color': 'var(--color-blue-500)',
                      }}
                    />
                    <button
                      onClick={() => handleSaveEditService(s)}
                      className="rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)] transition-colors"
                      style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', background: 'var(--color-blue-500)', color: '#fff', border: 'none' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingService(null); setEditServiceValue(''); }}
                      className="rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)] transition-colors"
                      style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', background: 'transparent', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div
                    key={s}
                    className="group inline-flex items-center gap-[var(--space-1)] rounded-full transition-colors"
                    style={{
                      padding: 'var(--space-1) var(--space-3)',
                      background: 'var(--color-blue-50)',
                      border: '1px solid var(--color-blue-200)',
                      color: 'var(--color-blue-700)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--color-blue-100)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-blue-300)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--color-blue-50)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-blue-200)';
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)' }}>{s}</span>
                    <button
                      onClick={() => { setEditingService(s); setEditServiceValue(s); }}
                      title="Edit service"
                      className="rounded-full p-[2px] transition-colors hover:bg-[var(--color-blue-200)]"
                      style={{ color: 'var(--color-blue-500)', lineHeight: 0 }}
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => handleRemoveService(s)}
                      title="Remove service"
                      className="rounded-full p-[2px] transition-colors hover:bg-[var(--color-blue-200)]"
                      style={{ color: 'var(--color-blue-500)', lineHeight: 0 }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )
              ))}

              {isAddingService ? (
                <div
                  className="flex items-center gap-[var(--space-2)] px-[var(--space-2)] py-[var(--space-1)] rounded-[var(--radius-sm)] shadow-sm transition-all"
                  style={{ background: 'var(--color-blue-50)', border: '1px solid var(--color-blue-300)' }}
                >
                  <input
                    autoFocus
                    value={newService}
                    onChange={e => setNewService(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddService();
                      if (e.key === 'Escape') { setIsAddingService(false); setNewService(''); }
                    }}
                    placeholder="e.g. System Design Mock"
                    className="w-40 rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)] outline-none focus:ring-1"
                    style={{
                      fontSize: 'var(--text-sm)',
                      background: 'var(--input-background)',
                      border: '1px solid var(--color-blue-300)',
                      color: 'var(--foreground)',
                      // @ts-ignore
                      '--tw-ring-color': 'var(--color-blue-500)',
                    }}
                  />
                  <button
                    onClick={handleAddService}
                    className="rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)] transition-colors"
                    style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', background: 'var(--color-blue-500)', color: '#fff', border: 'none' }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setIsAddingService(false); setNewService(''); }}
                    className="rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)] transition-colors"
                    style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', background: 'transparent', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingService(true)}
                  className="inline-flex items-center gap-[var(--space-1)] rounded-full transition-colors"
                  style={{
                    padding: 'var(--space-1) var(--space-3)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    background: 'transparent',
                    border: '1px dashed var(--color-blue-300)',
                    color: 'var(--color-blue-600)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'var(--color-blue-50)';
                    el.style.borderColor = 'var(--color-blue-500)';
                    el.style.color = 'var(--color-blue-700)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'transparent';
                    el.style.borderColor = 'var(--color-blue-300)';
                    el.style.color = 'var(--color-blue-600)';
                  }}
                >
                  <Plus size={14} />
                  Add Service
                </button>
              )}
            </div>
          </div>

          <SectionSaveRow status={svc} onSave={saveServices} />
        </div>

        {/* Verification Section */}
        <div className="bg-card border border-border rounded-[var(--radius)] p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-foreground text-lg font-medium mb-1">Identity Verification</h3>
              <p className="text-sm text-muted-foreground">Verify your identity to show a trusted badge on your profile.</p>
            </div>
            {!editingVerify && (
              <button
                onClick={() => setEditingVerify(true)}
                className="shrink-0 px-3 py-1.5 text-xs border border-input rounded-md text-foreground hover:bg-secondary transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {/* Status Card */}
          <div className="bg-[hsl(165,82%,95%)] border border-[hsl(165,82%,75%)] rounded-[var(--radius)] p-4 flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[hsl(165,82%,85%)]">
              <ShieldCheck className="w-5 h-5 text-[hsl(165,60%,30%)]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[hsl(165,40%,20%)]">Identity Verified</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full border font-medium bg-[hsl(165,82%,93%)] text-[hsl(165,60%,35%)] border-[hsl(165,82%,75%)]">Verified</span>
              </div>
              <p className="text-xs text-[hsl(165,40%,35%)] mt-1">All submitted documents have been reviewed and approved.</p>
            </div>
          </div>

          {/* Re-review notice — only while editing */}
          {editingVerify && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-[var(--radius-sm)] bg-[hsl(38,92%,95%)] border border-[hsl(38,92%,80%)]">
              <AlertCircle className="w-4 h-4 text-[hsl(38,80%,40%)] mt-0.5 shrink-0" />
              <p className="text-xs text-[hsl(38,60%,30%)]">Changing your work email or LinkedIn profile will require our team to re-verify your identity. Your <strong>Verified</strong> badge stays active until the review is complete.</p>
            </div>
          )}

          {/* Verification Items */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-surface-0 rounded-[var(--radius-sm)]">
              <div className="w-8 h-8 bg-secondary rounded-[var(--radius-sm)] flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Work Email<span className="text-destructive ml-0.5">*</span></span>
                  {workEmail && <CheckCircle className="w-4 h-4 text-[hsl(165,60%,35%)]" />}
                </div>
                {editingVerify ? (
                  <input
                    type="email"
                    value={workEmail}
                    onChange={e => { setWorkEmail(e.target.value); markVerify(); }}
                    placeholder="you@company.com"
                    className="mt-1 w-full text-xs border border-input rounded-[var(--radius-sm)] px-2.5 py-1.5 bg-input-background text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground break-all">{workEmail || <span className="italic">Not provided</span>}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-surface-0 rounded-[var(--radius-sm)]">
              <div className="w-8 h-8 bg-secondary rounded-[var(--radius-sm)] flex items-center justify-center shrink-0">
                <Link className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">LinkedIn Profile<span className="text-destructive ml-0.5">*</span></span>
                  {linkedin && <CheckCircle className="w-4 h-4 text-[hsl(165,60%,35%)]" />}
                </div>
                {editingVerify ? (
                  <input
                    type="url"
                    value={linkedin}
                    onChange={e => { setLinkedin(e.target.value); markVerify(); }}
                    placeholder="linkedin.com/in/your-handle"
                    className="mt-1 w-full text-xs border border-input rounded-[var(--radius-sm)] px-2.5 py-1.5 bg-input-background text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground break-all">{linkedin || <span className="italic">Not provided</span>}</p>
                )}
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="mt-4 flex items-start gap-2 p-3 bg-surface-0 rounded-[var(--radius-sm)]">
            <Lock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">Documents are used only for internal review and are <strong className="text-foreground">never shown publicly</strong>.</p>
          </div>

          {editingVerify && (
            <div className="flex items-center justify-end gap-3 pt-3 mt-4 border-t border-border">
              {verify.error && (
                <span className="mr-auto text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {verify.error}</span>
              )}
              <button
                onClick={cancelVerify}
                disabled={verify.saving}
                className="px-3 py-1.5 text-xs border border-input rounded-md text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveVerify}
                disabled={verify.saving || !verify.dirty}
                className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verify.saving ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          )}
          {!editingVerify && verify.saved && (
            <div className="flex items-center justify-end pt-3 mt-4 border-t border-border">
              <span className="text-xs text-[hsl(165,60%,30%)] flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Submitted for review</span>
            </div>
          )}
        </div>

        {/* Google Calendar */}
        <div className="bg-card border border-border rounded-[var(--radius)] p-5">
          <div className="mb-4">
            <h3 className="text-foreground text-lg font-medium mb-1">Google Calendar<span className="text-destructive ml-0.5">*</span></h3>
            <p className="text-sm text-muted-foreground">Connect your calendar so Screna can create and manage booking events automatically. Required to receive bookings.</p>
          </div>

          {calMsg && (
            <div className={`mb-3 text-xs px-3 py-2 rounded-[var(--radius-sm)] flex items-center gap-2 ${calMsg.ok ? 'bg-[hsl(165,82%,95%)] text-[hsl(165,60%,30%)]' : 'bg-red-50 text-red-700'}`}>
              {calMsg.ok ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {calMsg.msg}
            </div>
          )}

          {calendarConnected ? (
            <div className="flex items-center gap-3 bg-[hsl(165,82%,95%)] border border-[hsl(165,82%,75%)] rounded-[var(--radius)] p-4">
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[hsl(165,82%,85%)] shrink-0">
                <CalendarCheck className="w-4 h-4 text-[hsl(165,60%,30%)]" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-[hsl(165,40%,20%)]">Google Calendar connected</div>
                <div className="text-xs text-[hsl(165,40%,35%)] mt-0.5">Bookings sync automatically.{profile?.googleTimezone ? ` Timezone: ${profile.googleTimezone}.` : ''}</div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleConnectCalendar}
              disabled={calConnecting}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-[var(--radius-sm)] text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CalendarCheck className="w-4 h-4 text-primary" />
              {calConnecting ? 'Connecting…' : 'Connect Google Calendar'}
            </button>
          )}
        </div>
      </div>

      {/* Live Preview */}
      <div className="w-72 border-l border-border bg-surface-0 self-start sticky top-0">
        <div className="px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Marketplace Preview</span>
          </div>
        </div>
        <div className="p-4">
          <div className="bg-card border border-border rounded-[var(--radius)] overflow-hidden shadow-sm">
            <div className="h-16 bg-gradient-to-r from-primary/20 to-primary/5" />
            <div className="px-4 pb-4 -mt-7">
              <div className="flex items-end gap-3 mb-3">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={name} className="w-14 h-14 rounded-full border-2 border-card object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-card bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                    {(name || 'M').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                {profile?.status === 'APPROVED' && (
                  <div className="mb-1 flex items-center gap-1 text-xs text-[hsl(165,60%,30%)] bg-[hsl(165,82%,90%)] px-2 py-0.5 rounded-md">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </div>
                )}
              </div>
              <div className="font-semibold text-foreground text-sm">{name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{title} · {company}</div>
              <div className="flex items-center gap-1 mt-1.5">
                <StarRating rating={Math.round(profile?.averageRating ?? 0)} />
                <span className="text-xs text-muted-foreground">{profile?.averageRating ?? 0} ({profile?.reviewCount ?? 0})</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{headline}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {services.slice(0, 3).map(t => (
                  <span key={t} className="text-[11px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">{t}</span>
                ))}
              </div>
              <button className="mt-3 w-full py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                Book a session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: VERIFICATION
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────
   PAGE: REVIEWS
───────────────────────────────────────────── */
type ReviewRow = { id: string; memberName: string; sessionType?: string; date: string; rating: number; text: string; replied?: boolean; reply?: string };

function ReviewsPage() {
  const ctx = useMentorProfile();
  const profile = ctx?.profile;

  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterType, setFilterType] = useState('All');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  // Reviews come from the dedicated paginated endpoint
  // GET /mentorship/profile/reviews (newest first, deleted excluded). We pull a
  // generous first page since the UI shows the full list without pager controls.
  const [reviewDtos, setReviewDtos] = useState<MentorReviewDto[] | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setReviewsLoading(true);
    getMyMentorReviews({ page: 0, size: 100 })
      .then(res => {
        if (cancelled) return;
        const d: any = unwrapData(res);
        // Spring Page → { content: [...] }; tolerate a bare array too.
        const list: MentorReviewDto[] = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
        setReviewDtos(list);
      })
      // Fall back to the reviews embedded in the profile if the endpoint fails.
      .catch(() => { if (!cancelled) setReviewDtos(profile?.reviews ?? []); })
      .finally(() => { if (!cancelled) setReviewsLoading(false); });
    return () => { cancelled = true; };
  }, [profile]);

  const profileLoading = reviewsLoading;
  const reviews: ReviewRow[] = (reviewDtos ?? []).map(r => ({
    id: r.id,
    memberName: r.reviewerName,
    sessionType: 'All',
    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    rating: r.overallRating,
    text: r.comment ?? '',
    replied: false,
  }));

  const avgRating = profile?.averageRating ?? 0;
  const reviewCount = profile?.reviewCount ?? reviews.length;

  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    r,
    count: reviews.filter(rv => rv.rating === r).length,
    pct: reviews.length ? Math.round((reviews.filter(rv => rv.rating === r).length / reviews.length) * 100) : 0,
  }));

  const filtered = reviews.filter(rv => {
    if (filterRating && rv.rating !== filterRating) return false;
    if (filterType !== 'All' && rv.sessionType !== filterType) return false;
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-[var(--radius)] p-5 flex items-center gap-4">
          <div className="text-4xl font-semibold text-foreground">{avgRating}</div>
          <div>
            <StarRating rating={Math.round(avgRating)} size="md" />
            <div className="text-sm text-muted-foreground mt-1">{reviewCount} reviews</div>
          </div>
        </div>
        <div className="col-span-2 bg-card border border-border rounded-[var(--radius)] p-5">
          <div className="space-y-1.5">
            {ratingDist.map(d => (
              <div key={d.r} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-6">{d.r}★</span>
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {[null, 5, 4, 3, 2, 1].map(r => (
            <button
              key={r ?? 'all'}
              onClick={() => setFilterRating(r)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${filterRating === r ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:border-primary/30 hover:text-primary'}`}
            >
              {r === null ? 'All' : `${r}★`}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-1">
          {['All', 'Mock Interview', 'Resume Review', 'Career Coaching'].map(t => (
            null
          ))}
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-3">
        {profileLoading ? (
          <div className="bg-card border border-border rounded-[var(--radius)] p-8 text-center text-sm text-muted-foreground">Loading reviews…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-[var(--radius)] p-8 text-center text-sm text-muted-foreground">No reviews yet.</div>
        ) : null}
        {filtered.map(rv => (
          <div key={rv.id} className="bg-card border border-border rounded-[var(--radius)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Avatar name={rv.memberName} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{rv.memberName}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    
                    
                    <span className="text-xs text-muted-foreground">{rv.date}</span>
                  </div>
                  <StarRating rating={rv.rating} />
                </div>
              </div>
              
            </div>
            <p className="text-sm text-foreground mt-3">{rv.text}</p>

            {rv.replied && (
              <div className="mt-3 pl-4 border-l-2 border-primary/20">
                <div className="text-xs text-muted-foreground mb-1">Your reply</div>
                <p className="text-sm text-foreground">{rv.reply}</p>
              </div>
            )}

            {replyingTo === rv.id && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={replyDraft}
                  onChange={e => setReplyDraft(e.target.value)}
                  placeholder="Write a professional, constructive reply…"
                  rows={3}
                  className="w-full text-sm border border-input rounded-[var(--radius-sm)] px-3 py-2 bg-input-background text-foreground outline-none resize-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <button onClick={() => setReplyingTo(null)} className="px-3 py-1.5 text-xs border border-border rounded-md text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
                  <button disabled={!replyDraft.trim()} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-40 transition-colors">Post Reply</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EARNINGS PAGE
───────────────────────────────────────────── */
type EarningSession = {
  id: string; session: string; student: string; studentAvatar: string;
  date: string; gross: number; fee: number; net: number;
  status: string; payoutDate: string; payoutMethod: string;
};
// MentorTransactionDto.status → the label EarningsStatusBadge understands.
const TX_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  AVAILABLE: 'Available',
  ON_HOLD: 'On Hold',
  REFUNDED: 'Refunded',
};
// Map a MentorTransactionDto onto the row shape the table already renders.
// `description` arrives as "{topic} - {student}"; split it back into the two
// cells the existing markup expects ("{session} — {student}").
function mapTransaction(tx: any): EarningSession {
  const description = String(tx?.description ?? '');
  const sep = description.lastIndexOf(' - ');
  const session = sep >= 0 ? description.slice(0, sep) : description;
  const student = sep >= 0 ? description.slice(sep + 3) : '';
  const start = tx?.date ? new Date(tx.date) : null;
  const valid = start && !isNaN(start.getTime());
  return {
    id: String(tx?.bookingId ?? ''),
    session,
    student,
    studentAvatar: '',
    date: valid ? start!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
    gross: 0,
    fee: 0,
    net: Number(tx?.amountCents ?? 0) / 100,
    status: TX_STATUS_LABEL[String(tx?.status ?? '').toUpperCase()] ?? (tx?.status ?? ''),
    payoutDate: '',
    payoutMethod: '',
  };
}
function EarningsStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    'Available': { bg: 'hsl(142 71% 93%)',        color: 'hsl(142 63% 26%)' },
    'Pending':   { bg: 'var(--color-blue-50)',     color: 'var(--color-blue-700)' },
    'Refunded':  { bg: 'hsl(38 92% 92%)',          color: 'hsl(38 70% 30%)' },
    'On Hold':   { bg: 'hsl(0 72% 95%)',           color: 'hsl(0 65% 38%)' },
  };
  const s = map[status] ?? { bg: 'var(--surface-2)', color: 'var(--muted-foreground)' };
  return (
    <span
      className="inline-flex items-center rounded-[var(--radius-sm)] whitespace-nowrap"
      style={{ padding: '2px 8px', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-medium)', background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

function EarningsPage() {
  // GET /mentorship/profile/earnings → { availableCents, pendingCents, lifetimeCents }.
  const [earningTotals, setEarningTotals] = useState<{ available: number; pending: number; lifetime: number } | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setEarningsLoading(true);
    getMyMentorEarnings()
      .then(res => {
        if (cancelled) return;
        const d: any = unwrapData(res) ?? {};
        setEarningTotals({
          available: Number(d.availableCents ?? 0) / 100,
          pending: Number(d.pendingCents ?? 0) / 100,
          lifetime: Number(d.lifetimeCents ?? 0) / 100,
        });
      })
      .catch(() => { if (!cancelled) setEarningTotals({ available: 0, pending: 0, lifetime: 0 }); })
      .finally(() => { if (!cancelled) setEarningsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const availableTotal = earningTotals?.available ?? 0;
  const pendingTotal   = earningTotals?.pending   ?? 0;
  const lifetimeTotal  = earningTotals?.lifetime  ?? 0;
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  // Unsettled transactions from GET /mentorship/profile/transactions (paginated,
  // PAID excluded). Display-only amounts — authoritative totals are the cards above.
  const [earningSessions, setEarningSessions] = useState<EarningSession[]>([]);
  useEffect(() => {
    let cancelled = false;
    getMyMentorTransactions({ page: 0, size: 100 })
      .then(res => {
        if (cancelled) return;
        const d: any = unwrapData(res);
        const list: any[] = Array.isArray(d) ? d : (Array.isArray(d?.content) ? d.content : []);
        setEarningSessions(list.map(mapTransaction));
      })
      .catch(() => { if (!cancelled) setEarningSessions([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6">

        {/* Page header */}
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>Earnings</h2>
          <p className="mt-1" style={{ fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)' }}>Track your session income</p>
        </div>

        {/* ── Cash earnings ── */}
        <div className="space-y-5">

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-[var(--radius)] p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 'var(--font-weight-medium)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available</div>
                <div className="mt-2" style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-semibold)', color: 'hsl(142 63% 30%)' }}>{earningsLoading ? '…' : fmt(availableTotal)}</div>
              </div>
              <div className="rounded-[var(--radius)] p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 'var(--font-weight-medium)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending</div>
                <div className="mt-2" style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--muted-foreground)' }}>{earningsLoading ? '…' : fmt(pendingTotal)}</div>
              </div>
              <div className="rounded-[var(--radius)] p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 'var(--font-weight-medium)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lifetime Total</div>
                <div className="mt-2" style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--primary)' }}>{earningsLoading ? '…' : fmt(lifetimeTotal)}</div>
              </div>
            </div>

            {/* Next payout notice bar */}
            <div className="flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <CalendarCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)' }}>Next payout: July 15</span>
            </div>

            {/* Transaction table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Description', 'Amount', 'Status'].map(col => (
                    <th key={col} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 'var(--font-weight-medium)', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {earningSessions.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '24px', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)' }}>
                      {earningsLoading ? 'Loading transactions…' : 'No transactions yet.'}
                    </td>
                  </tr>
                ) : earningSessions.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: i < earningSessions.length - 1 ? '1px solid var(--border)' : 'none',
                      background: row.status === 'On Hold' ? 'hsl(0 72% 98.5%)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px', fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{row.date}</td>
                    <td style={{ padding: '12px', fontSize: 'var(--text-sm)', color: 'var(--foreground)' }}>{row.session} — {row.student}</td>
                    <td style={{ padding: '12px', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{fmt(row.net)}</td>
                    <td style={{ padding: '12px' }}><EarningsStatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>

      </div>
    </div>
  );
}

function EarningsWithPayment() {
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    setFile(f);
  }

  function handleSubmit() {
    if (!file || uploading) return;
    setUploading(true);
    uploadMyPaymentMethod(file)
      .then(() => {
        setUploaded(true);
        setTimeout(() => { setShowModal(false); setUploaded(false); setFile(null); }, 1800);
      })
      .catch(() => { /* keep modal open — no toast slot in this card */ })
      .finally(() => setUploading(false));
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <EarningsPage />

      {/* Payment Method entry banner */}
      <div
        className="mx-6 mb-4 rounded-[var(--radius)] border border-border bg-card flex items-center justify-between px-4 py-3"
        style={{ marginTop: 'auto', flexShrink: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center" style={{ background: 'var(--color-blue-50)' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
              <rect x="1" y="3.5" width="14" height="9" rx="1.5" stroke="var(--color-blue-600)" strokeWidth="1.3" />
              <path d="M1 6.5h14" stroke="var(--color-blue-600)" strokeWidth="1.3" />
              <rect x="3" y="9" width="3" height="1.5" rx="0.5" fill="var(--color-blue-600)" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)' }}>Payment Method</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' }}>Update your payout details</div>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-[var(--radius-sm)] transition-colors"
          style={{
            fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)',
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-blue-50)', color: 'var(--color-blue-700)',
            border: '1px solid var(--color-blue-200)', cursor: 'pointer',
          }}
        >
          Update
        </button>
      </div>

      {/* Upload modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-card rounded-[var(--radius)] border border-border shadow-lg w-full max-w-md mx-4 p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)' }}>Update Payment Method</h3>
              <button onClick={() => { setShowModal(false); setFile(null); }} className="p-1 rounded-md hover:bg-secondary text-muted-foreground transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)' }}>
              Please upload a PDF document containing your payment method details (e.g. bank statement, voided cheque, or payment account confirmation).
            </p>

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0] ?? null); }}
              className="rounded-[var(--radius)] border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
              style={{
                borderColor: file ? 'var(--color-blue-400)' : 'var(--border)',
                background: file ? 'var(--color-blue-50)' : 'var(--surface-0)',
                padding: 'var(--space-8)',
              }}
            >
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <path d="M12 16V8m0 0-3 3m3-3 3 3" stroke={file ? 'var(--color-blue-600)' : 'var(--muted-foreground)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 16.5A4.5 4.5 0 0 0 15.5 12H14a6 6 0 1 0-11.8 1.5" stroke={file ? 'var(--color-blue-600)' : 'var(--muted-foreground)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {file
                ? <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-blue-700)' }}>{file.name}</span>
                : <>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)' }}>Click or drag a PDF here</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted-foreground)' }}>PDF only · max 10 MB</span>
                  </>
              }
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={e => handleFile(e.target.files?.[0] ?? null)} />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowModal(false); setFile(null); }}
                className="rounded-[var(--radius-sm)] transition-colors"
                style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted-foreground)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!file || uploading}
                className="rounded-[var(--radius-sm)] transition-colors"
                style={{
                  fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)',
                  padding: 'var(--space-2) var(--space-4)',
                  background: file ? 'var(--primary)' : 'var(--secondary)',
                  color: file ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  border: 'none', cursor: file && !uploading ? 'pointer' : 'not-allowed',
                  opacity: uploading ? 0.7 : 1,
                }}
              >
                {uploaded ? 'Uploaded ✓' : uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE: PROFILE & AVAILABILITY (combined, required)
───────────────────────────────────────────── */
function ProfileAndAvailabilityPage() {
  const ctx = useMentorProfile();
  // Once the mentor is APPROVED they're already live, so the "complete your
  // profile" requirement notice no longer applies.
  const isApproved = ctx?.profile?.status === 'APPROVED';
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Required notice — hidden once the mentor is approved/live. */}
      {!isApproved && (
        <div className="shrink-0 px-6 pt-4 pb-3 bg-card border-b border-border">
          <div className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <span className="font-medium">Required.</span> Complete your profile and weekly availability before you can appear in the mentor marketplace.
            </p>
          </div>
        </div>
      )}

      {/* Profile and availability share one scrolling page (one profile API). */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <ProfilePage />
        <AvailabilityPage />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SIDEBAR NAV
───────────────────────────────────────────── */
const NAV_ITEMS: { id: NavId; label: string; icon: React.ElementType; badge?: number; required?: boolean }[] = [
  { id: 'overview',     label: 'Overview',     icon: LayoutDashboard },
  { id: 'bookings',     label: 'Bookings',     icon: CalendarCheck },
  { id: 'messages',     label: 'Messages',     icon: MessageSquare, badge: 3 },
  { id: 'profile',      label: 'Profile & Availability', icon: User, required: true },
  { id: 'reviews',      label: 'Reviews',      icon: Star },
  { id: 'earnings',     label: 'Earnings',     icon: DollarSign },
];

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
export function MentorDashboardPage() {
  // Land on Profile when returning from the Google Calendar OAuth redirect so
  // ProfilePage mounts and completes the token exchange (?code & ?state).
  const [activePage, setActivePage] = useState<NavId>(
    () => (new URLSearchParams(window.location.search).get('code') ? 'profile' : 'overview')
  );
  const [notifOpen, setNotifOpen] = useState(false);
  // Booking to auto-open in BookingsPage's detail drawer (set when navigating
  // there from another tab, e.g. the Overview "message" action).
  const [focusBookingId, setFocusBookingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Bookings nav badge mirrors the "Upcoming" count shown inside the Bookings
  // tab (pending + confirmed), so the sidebar number always matches.
  const { bookings: navBookings } = useMyMentorBookings();
  const upcomingCount = navBookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length;

  // ── Shared mentor profile (GET /mentorship/profile), provided to all pages ──
  const [profile, setProfile] = useState<MentorProfileDto | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const loadProfile = useCallback(() => {
    setProfileLoading(true);
    getMyMentorProfile()
      .then(res => { setProfile(unwrapData<MentorProfileDto>(res) ?? null); setProfileError(null); })
      .catch((err: any) => { setProfileError(err?.response?.data?.message || 'Failed to load profile'); })
      .finally(() => setProfileLoading(false));
  }, []);
  useEffect(() => { loadProfile(); }, [loadProfile]);

  // A mentor only goes live in the marketplace once their profile is APPROVED.
  // While that's not the case we surface a dashboard-wide banner on every tab.
  const [completionDismissed, setCompletionDismissed] = useState(false);
  const showCompletionBanner =
    !completionDismissed && activePage !== 'profile' &&
    !!profile && profile.status !== 'APPROVED';

  // Dual-role accounts (candidate + mentor) can hop back to the candidate
  // experience; we remember the choice so they land there next time too.
  const canSwitchToCandidate = hasCandidateRole(user);
  const switchToCandidate = () => {
    setStoredDashboardMode('candidate');
    navigate(CANDIDATE_DASHBOARD_PATH);
  };

  const pageTitle: Record<NavId, string> = {
    overview: 'Overview',
    bookings: 'Bookings',
    messages: 'Messages',
    profile: 'Profile & Availability',
    reviews: 'Reviews',
    earnings: 'Earnings',
  };

  const pageContent: Record<NavId, React.ReactNode> = {
    overview: <OverviewPage onNavigate={setActivePage} onOpenBooking={id => { setFocusBookingId(id); setActivePage('bookings'); }} />,
    bookings: <BookingsPage focusBookingId={focusBookingId} onFocusHandled={() => setFocusBookingId(null)} />,
    messages: <MessagesPage />,
    profile: <ProfileAndAvailabilityPage />,
    reviews: <ReviewsPage />,
    earnings: <EarningsWithPayment />,
  };

  return (
    <MentorProfileContext.Provider
      value={{ profile, loading: profileLoading, error: profileError, refetch: loadProfile, setProfile }}
    >
    <div className="flex h-screen bg-surface-0 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-card border-r border-border flex flex-col">
        {/* Brand */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground leading-none">Screna</div>
              <div className="text-[11px] text-muted-foreground leading-none mt-0.5">Mentor Portal</div>
            </div>
          </div>
        </div>

        {/* Mentor identity */}
        <div className="px-3 py-3 border-b border-border">
          <div className="flex items-center gap-2.5 p-2 rounded-[var(--radius-sm)] hover:bg-secondary transition-colors cursor-pointer">
            <Avatar src={profile?.avatarUrl} name={profile?.name ?? ''} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{profile?.name ?? ''}</div>
              <div className="text-[11px] text-muted-foreground truncate">{profile?.currentCompany ?? ''}</div>
            </div>
            {profile?.status === 'APPROVED' && <ShieldCheck className="w-3.5 h-3.5 text-[hsl(165,60%,35%)] shrink-0" />}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const badge = item.id === 'bookings' ? upcomingCount : item.badge;
            return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-sm)] text-sm transition-colors ${
                item.id === 'messages' ? 'hidden' : ''
              } ${
                activePage === item.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">
                {item.label}
                {item.required && <span className="text-destructive ml-0.5">*</span>}
              </span>
              {!!badge && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${activePage === item.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                  {badge}
                </span>
              )}
            </button>
            );
          })}

          {/* Switch to Candidate — side button after Referral (dual-role only) */}
          {canSwitchToCandidate && (
            <button
              onClick={switchToCandidate}
              className="w-full flex items-center gap-2.5 px-3 py-2 mt-1 rounded-[var(--radius-sm)] text-sm font-medium text-[hsl(165,60%,30%)] bg-[hsl(165,82%,90%)] hover:bg-[hsl(165,82%,84%)] transition-colors"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Switch to Candidate</span>
            </button>
          )}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-border space-y-0.5">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-sm)] text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-12 shrink-0 bg-card border-b border-border flex items-center gap-4 px-5">
          <div className="flex-1">
            <h1 className="text-foreground">{pageTitle[activePage]}</h1>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-surface-0 border border-border rounded-[var(--radius-sm)] px-3 py-1.5 w-52">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input placeholder="Search…" className="bg-transparent text-sm outline-none placeholder:text-muted-foreground w-full" />
          </div>

          {/* Verified / status chip */}
          {(profile ? profile.status === 'APPROVED' : true) ? (
            <div className="flex items-center gap-1.5 text-xs text-[hsl(165,60%,30%)] bg-[hsl(165,82%,90%)] px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Mentor
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" />
              {profile?.status === 'PENDING' ? 'Pending Review' : profile?.status === 'REJECTED' ? 'Not Approved' : 'Suspended'}
            </div>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border rounded-[var(--radius)] shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Notifications</span>
                  <button className="text-xs text-primary hover:underline">Mark all read</button>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { icon: CalendarCheck, text: 'New booking request from Priya Sharma', time: '30 min ago', color: 'text-primary' },
                    { icon: MessageSquare, text: 'Marcus Lee sent you a message', time: '1 hour ago', color: 'text-primary' },
                    { icon: Star, text: 'Aisha Williams left you a 5-star review', time: '2 hours ago', color: 'text-amber-500' },
                  ].map((n, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/40 cursor-pointer transition-colors">
                      <n.icon className={`w-4 h-4 mt-0.5 shrink-0 ${n.color}`} />
                      <div>
                        <p className="text-sm text-foreground">{n.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Global completion notification — shown on every tab until profile & availability are done */}
        {showCompletionBanner && (
          <div className="shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-amber-200 bg-amber-50">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="flex-1 text-xs text-amber-700">
              <span className="font-medium">Your mentor profile isn't live yet.</span>{' '}
              Complete your profile and weekly availability before you can appear in the mentor marketplace.
            </p>
            <button
              onClick={() => setActivePage('profile')}
              className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              Complete now
            </button>
            <button
              onClick={() => setCompletionDismissed(true)}
              className="shrink-0 p-1 rounded-md text-amber-500 hover:bg-amber-100 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Content */}
        <div className="flex-1 flex overflow-hidden">
          {pageContent[activePage]}
        </div>
      </div>
    </div>
    </MentorProfileContext.Provider>
  );
}
