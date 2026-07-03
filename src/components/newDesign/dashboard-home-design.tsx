import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useUserPlan, type PlanType } from '@/hooks/useUserPlan';
import { listMyBookings } from '@/services/MentorService';
import { getProfilePreferences } from '@/services/ProfileServices';
import { getPosts } from '@/services/CommunityService';
import { getDashboardStats } from '@/services/DashboardService';

// ─── Types ──────────────────────────────────────────────────────────────────
type Plan = 'free' | 'starter' | 'premium';
type ChartTab = 'learning' | 'sessions';
type ChartRange = '7d' | '30d' | '3m';

type DailyEntry = { date: string; value: number };

type InterviewInsights = {
  averageScore: number;
  bestScore: number;
  lowestScore: number;
  categoryScores: Array<{ category: string; averageScore: number }>;
};

type DashboardStatsApi = {
  totalLearningTimeMinutes: number;
  sessionCompletedCount: number;
  interviewPracticeInsights?: InterviewInsights | null;
  dailyLearningTimeMinutes?: DailyEntry[];
  dailySessionCount?: DailyEntry[];
};

type UserData = {
  firstName?: string;
  lastName?: string;
  role?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatMinutesAsHm(mins: number): string {
  if (!Number.isFinite(mins) || mins <= 0) return '0h 0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

function planFromUserPlan(pt: PlanType): Plan {
  if (pt === 'Elite') return 'premium';
  if (pt === 'Pro') return 'starter';
  return 'free';
}

function formatShortDate(iso: string, fallback: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Radar helpers (generalised over N dimensions) ──────────────────────────────
const R_MAX = 80, R_CX = 180, R_CY = 130;
function radarAngle(i: number, n: number) { return (Math.PI * 2 * i) / n - Math.PI / 2; }
function radarPt(r: number, angle: number) { return { x: R_CX + r * Math.cos(angle), y: R_CY + r * Math.sin(angle) }; }
function radarPolygon(vals: number[]) {
  const n = vals.length;
  return vals.map((v, i) => { const p = radarPt((v / 100) * R_MAX, radarAngle(i, n)); return `${p.x},${p.y}`; }).join(' ');
}
function radarGridPolygon(pct: number, n: number) {
  return Array.from({ length: n }, (_, i) => { const p = radarPt(pct * R_MAX, radarAngle(i, n)); return `${p.x},${p.y}`; }).join(' ');
}

// ─── Chart path helpers ──────────────────────────────────────────────────────
function buildChartPaths(data: number[], W = 800, H = 180, pad = 16) {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1, n = data.length;
  const pts = data.map((v, i) => ({ x: (n === 1 ? W / 2 : (i / (n - 1)) * W), y: pad + (1 - (v - min) / range) * (H - pad * 2) }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = linePath + ` L${pts[n - 1].x.toFixed(1)},${H - pad} L${pts[0].x.toFixed(1)},${H - pad} Z`;
  return { pts, linePath, areaPath };
}

// ─── Stats grid ───────────────────────────────────────────────────────────────
function StatsGrid({ plan, stats, loading }: { plan: Plan; stats: DashboardStatsApi | null; loading: boolean }) {
  const sub = plan === 'free' ? 'Mock Interview' : 'Mock Interview + Mentorship Sessions';
  const learningTime = stats ? formatMinutesAsHm(stats.totalLearningTimeMinutes ?? 0) : '—';
  const sessions = stats ? String(stats.sessionCompletedCount ?? 0) : '—';
  const items = [
    { label: 'Total Learning Time', value: loading ? '…' : learningTime, sub, icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1"/></svg> },
    { label: 'Sessions Completed', value: loading ? '…' : sessions, sub, icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="8" cy="8" r="6"/><path d="M5.5 8l2 2 3-4"/></svg> },
  ];

  return (
    <div className="grid mb-5" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
      {items.map((s) => (
        <div key={s.label} className="bg-card border border-border rounded-xl flex flex-col gap-2 transition-all hover:-translate-y-px" style={{ padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-start justify-between gap-2">
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', lineHeight: 1.4, fontFamily: 'var(--font-sans)' }}>{s.label}</span>
            <div className="rounded-lg flex items-center justify-center shrink-0" style={{ width: 28, height: 28, color: 'var(--primary)', background: 'hsl(221 91% 60% / 0.08)' }}>{s.icon}</div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, color: 'hsl(221 80% 45%)', lineHeight: 1.1, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-sans)' }}>{s.value}</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Chart card ───────────────────────────────────────────────────────────────
function ChartCard({
  learningDaily,
  sessionsDaily,
}: {
  learningDaily?: DailyEntry[];
  sessionsDaily?: DailyEntry[];
}) {
  const [tab, setTab] = useState<ChartTab>('learning');
  const [range, setRange] = useState<ChartRange>('30d');
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 800, H = 180, PAD = 16;

  const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const unit = tab === 'sessions' ? 'sessions' : 'min';
  const label = tab === 'sessions' ? 'Sessions per day' : 'Learning time per day (min)';

  const { data, dates } = useMemo(() => {
    const src = tab === 'sessions' ? sessionsDaily : learningDaily;
    if (!Array.isArray(src) || src.length === 0) return { data: [] as number[], dates: [] as string[] };
    const sliced = src.slice(-rangeDays);
    return {
      data: sliced.map((d) => Number(d?.value) || 0),
      dates: sliced.map((d, i) => formatShortDate(d?.date, `Day ${i + 1}`)),
    };
  }, [tab, rangeDays, learningDaily, sessionsDaily]);

  const hasData = data.length > 0;
  const { pts, linePath, areaPath } = useMemo(
    () => (hasData ? buildChartPaths(data, W, H, PAD) : { pts: [], linePath: '', areaPath: '' }),
    [data, hasData]
  );

  const totalVal = data.reduce((a, b) => a + b, 0);
  const avgVal = hasData ? Math.round(totalVal / data.length) : 0;
  const peakVal = hasData ? Math.max(...data) : 0;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || !hasData) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.max(0, Math.min(pts.length - 1, Math.round((svgX / W) * (pts.length - 1))));
    setHover({ idx, x: pts[idx].x, y: pts[idx].y });
  }, [pts, hasData]);

  return (
    <section className="bg-card border border-border rounded-xl mb-5" style={{ padding: 16, fontFamily: 'var(--font-sans)' }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div className="flex items-center gap-1 rounded-full p-0.5" style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}>
          {(['learning', 'sessions'] as ChartTab[]).map((t) => {
            const isActive = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)}
                className="rounded-full flex items-center gap-1.5 transition-all"
                style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: isActive ? 'var(--card)' : 'transparent', color: isActive ? 'hsl(221 80% 45%)' : 'var(--muted-foreground)', boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none', fontFamily: 'var(--font-sans)' }}
              >
                {t === 'learning' ? 'Learning Time' : 'Sessions'}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1">
          {(['7d', '30d', '3m'] as ChartRange[]).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className="rounded-md transition-all"
              style={{ padding: '4px 10px', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: range === r ? 'hsl(221 80% 45%)' : 'var(--muted-foreground)', background: range === r ? 'var(--secondary)' : 'transparent', fontFamily: 'var(--font-sans)' }}
            >
              {r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'Last 3 Months'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mb-3">
        {[
          { lbl: tab === 'sessions' ? 'Total Sessions' : 'Total Learning Time', val: !hasData ? '—' : tab === 'sessions' ? `${totalVal}` : `${Math.floor(totalVal / 60)}h ${totalVal % 60}m` },
          { lbl: 'Daily Average', val: !hasData ? '—' : tab === 'sessions' ? `${avgVal}` : `${avgVal}m` },
          { lbl: 'Peak Day', val: !hasData ? '—' : tab === 'sessions' ? `${peakVal}` : `${peakVal}m` },
        ].map((c) => (
          <div key={c.lbl} className="rounded-lg" style={{ background: 'var(--secondary)', padding: '10px 14px', minWidth: 130 }}>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>{c.lbl}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--foreground)', marginTop: 2, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-sans)' }}>{c.val}</div>
          </div>
        ))}
      </div>

      {hasData ? (
        <div className="relative">
          <svg ref={svgRef} className="w-full block" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 180 }} onMouseMove={handleMouseMove} onMouseLeave={() => setHover(null)} aria-hidden>
            <defs>
              <linearGradient id="dash-line-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(221 91% 60%)" stopOpacity="0.10" />
                <stop offset="100%" stopColor="hsl(221 91% 60%)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#dash-line-fill)" />
            <path d={linePath} fill="none" stroke="hsl(221 91% 60%)" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            {hover && <line x1={hover.x} y1={PAD} x2={hover.x} y2={H - PAD} stroke="rgba(37,99,235,0.25)" strokeWidth="1" strokeDasharray="3 3" />}
          </svg>
          {hover && (
            <>
              <div className="absolute pointer-events-none rounded-full bg-white border-2" style={{ width: 10, height: 10, left: `calc(${(hover.x / W) * 100}% - 5px)`, top: `calc(${(hover.y / H) * 100}% - 5px)`, borderColor: 'hsl(221 91% 60%)', boxShadow: '0 0 0 3px rgba(37,99,235,0.12)' }} />
              <div className="absolute pointer-events-none bg-card border border-border rounded-lg z-10" style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%`, transform: 'translate(-50%, calc(-100% - 10px))', padding: '8px 10px', boxShadow: '0 4px 12px rgba(15,23,42,0.10)', fontSize: 12, minWidth: 130, fontFamily: 'var(--font-sans)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500, marginBottom: 2 }}>{dates[hover.idx]}</div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'hsl(221 91% 60%)' }} />
                  <span style={{ fontWeight: 600, color: 'hsl(221 80% 45%)', fontVariantNumeric: 'tabular-nums' }}>{data[hover.idx]}{unit}</span>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full" style={{ height: 180, fontSize: 13, color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>
          No activity yet
        </div>
      )}
      <div className="flex items-center gap-1.5 mt-2" style={{ fontSize: 12, color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'hsl(221 91% 60%)' }} />
        {label}
      </div>
    </section>
  );
}

// ─── Stars ──────────────────────────────────────────────────────────────────
function Stars({ count, total = 5 }: { count: number; total?: number }) {
  return (
    <div className="flex gap-px">
      {Array.from({ length: total }, (_, i) => (
        <svg key={i} viewBox="0 0 11 11" width="11" height="11" fill={i < count ? '#F59E0B' : '#E5E7EB'}>
          <polygon points="5.5,1 6.7,4 10,4.2 7.4,6.4 8.3,9.6 5.5,7.8 2.7,9.6 3.6,6.4 1,4.2 4.3,4" />
        </svg>
      ))}
    </div>
  );
}

// ─── Mentorship panel ─────────────────────────────────────────────────────────
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';

type Booking = {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorRealName?: string;
  mentorAvatarUrl?: string;
  topicTitle: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  hasReview: boolean;
  meetingLink?: string;
  mentorAvgRating?: number;
  studentNote?: string;
  mentorNote?: string | null;
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function formatBookingDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date}, ${time}`;
}

function formatBookingShortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeUntil(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const diffMs = t - Date.now();
  if (diffMs <= 0) return 'Starting soon';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `In ${mins} min — get prepared`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `In ${hours} hour${hours === 1 ? '' : 's'} — get prepared`;
  const days = Math.round(hours / 24);
  return `In ${days} day${days === 1 ? '' : 's'} — get prepared`;
}

function MentorshipPanel() {
  const navigate = useNavigate();
  // Mentorship is available to all users — no plan gating.
  const locked = false;
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await listMyBookings({ page: 0, size: 20 });
        const content = (res as { data?: { data?: { content?: Booking[] } } })?.data?.data?.content ?? [];
        const normalized = (Array.isArray(content) ? content : []).map((b) => ({
          ...b,
          mentorName: b.mentorName || b.mentorRealName || 'Mentor',
        }));
        if (alive) setBookings(normalized);
      } catch {
        if (alive) setBookings([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  const now = Date.now();
  const upcoming = (bookings ?? [])
    .filter((b) => (b.status === 'CONFIRMED' || b.status === 'PENDING') && new Date(b.startTime).getTime() > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const nextSession = upcoming[0];

  const pastBookings = (bookings ?? [])
    .filter((b) => b.status === 'COMPLETED')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 3);

  return (
    <section className="bg-card border border-border rounded-xl relative" style={{ padding: 16, fontFamily: 'var(--font-sans)' }}>
      <div className="flex items-center justify-between mb-3.5">
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>Mentorship</span>
        <button onClick={() => navigate('/coaching')} className="flex items-center gap-1 hover:underline" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
          Browse mentors <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7L7 3M4 3h3v3"/></svg>
        </button>
      </div>

      <div style={{ filter: locked ? 'blur(6px)' : 'none', pointerEvents: locked ? 'none' : undefined, opacity: locked ? 0.55 : 1 }}>
        {nextSession ? (
          <div className="border border-border rounded-[10px] bg-card" style={{ padding: 12, marginBottom: 14 }}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="inline-flex items-center rounded-full px-2 py-0.5" style={{ background: 'hsl(221 91% 60% / 0.08)', color: 'hsl(221 80% 45%)', fontSize: 11, fontWeight: 500 }}>Upcoming session</span>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 500 }}>{formatBookingDateTime(nextSession.startTime)}</span>
            </div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 36, height: 36, background: 'hsl(221 91% 60% / 0.08)', color: 'hsl(221 60% 40%)', fontSize: 12, fontWeight: 600 }}>{getInitials(nextSession.mentorName)}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{nextSession.mentorName}</div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{nextSession.durationMinutes} min session</div>
              </div>
            </div>
            <div className="rounded-lg mb-2.5" style={{ background: 'var(--secondary)', padding: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 2 }}>Session goal</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{nextSession.topicTitle || 'Mentorship Session'}</div>
            </div>
            <div className="flex items-center gap-1.5 mb-2.5" style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary)' }} />
              {timeUntil(nextSession.startTime)}
            </div>
            <button
              onClick={() => { if (nextSession.meetingLink) window.open(nextSession.meetingLink, '_blank', 'noopener,noreferrer'); }}
              className="block w-full text-center rounded-lg transition-colors"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', padding: '9px 12px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}
            >
              Join Session
            </button>
          </div>
        ) : (
          <div className="border border-dashed rounded-[10px] flex flex-col items-center text-center gap-2" style={{ borderColor: 'hsl(221 91% 60% / 0.4)', background: 'hsl(221 91% 60% / 0.04)', padding: 20, marginBottom: 14 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="hsl(221 80% 55%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>No upcoming sessions. Ready for your next 1:1?</p>
            <button onClick={() => navigate('/coaching')} className="rounded-lg" style={{ border: '1px solid var(--primary)', color: 'var(--primary)', padding: '6px 12px', fontSize: 12, fontWeight: 500, background: 'none', cursor: 'pointer' }}>
              Browse mentors →
            </button>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)' }}>Past sessions</span>
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{pastBookings.length} ›</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {pastBookings.map((b) => (
              <div key={b.id} onClick={() => navigate('/history')} className="flex items-center gap-2.5 rounded-lg cursor-pointer transition-colors hover:bg-secondary" style={{ padding: 8 }}>
                <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 30, height: 30, background: 'hsl(221 91% 60% / 0.08)', color: 'hsl(221 60% 40%)', fontSize: 11, fontWeight: 600 }}>{getInitials(b.mentorName)}</div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)' }}>{b.mentorName}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{(b.topicTitle || 'Session')} · {formatBookingShortDate(b.startTime)}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center rounded px-2 py-0.5" style={{ fontSize: 11, fontWeight: 500, color: b.hasReview ? '#065F46' : '#92400E', background: b.hasReview ? '#ECFDF5' : '#FFFBEB' }}>
                    {b.hasReview ? 'Reviewed' : 'Review pending'}
                  </span>
                  {b.hasReview && Math.round(b.mentorAvgRating ?? 0) > 0 && <Stars count={Math.round(b.mentorAvgRating ?? 0)} />}
                </div>
              </div>
            ))}
            {pastBookings.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', padding: '8px 0' }}>No past sessions yet.</div>
            )}
          </div>
        </div>
      </div>

      {locked && (
        <div className="absolute flex flex-col items-center justify-center text-center" style={{ inset: '56px 16px 16px 16px', zIndex: 2, padding: '24px 20px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(2px)', borderRadius: 10, gap: 8 }}>
          <div className="flex items-center justify-center rounded-[10px] mb-1" style={{ width: 40, height: 40, background: 'var(--secondary)', color: 'hsl(221 80% 45%)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)' }}>Mentorship is a member benefit</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5, maxWidth: 260, marginBottom: 8 }}>Book 1:1 sessions with senior mentors and track every session in one place.</div>
          <button onClick={() => navigate('/#pricing')} className="rounded-lg" style={{ padding: '9px 16px', background: 'var(--primary)', color: 'var(--primary-foreground)', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer' }}>
            Upgrade to membership
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Interview Insights panel ─────────────────────────────────────────────────
function InterviewInsightsPanel({ insights, loading }: { insights?: InterviewInsights | null; loading: boolean }) {
  const navigate = useNavigate();
  const [hoverDim, setHoverDim] = useState<number | null>(null);
  const qualLabel = (v: number) => v >= 80 ? 'Strong' : v >= 70 ? 'Good' : v >= 60 ? 'Developing' : 'Needs Work';

  const hasInsights = insights != null && Array.isArray(insights.categoryScores) && insights.categoryScores.length > 0;
  const dims = hasInsights ? insights!.categoryScores.map((c) => ({ label: c.category, value: Math.round(Number(c.averageScore) || 0) })) : [];
  const vals = dims.map((d) => d.value);
  const n = dims.length;
  const avg = hasInsights ? Math.round(Number(insights!.averageScore) || 0) : 0;
  const best = hasInsights ? Math.round(Number(insights!.bestScore) || 0) : 0;
  const low = hasInsights ? Math.round(Number(insights!.lowestScore) || 0) : 0;
  const lowestDim = dims.length > 0 ? [...dims].sort((a, b) => a.value - b.value)[0] : { label: '', value: 0 };

  return (
    <section className="bg-card border border-border rounded-xl" style={{ padding: 16, fontFamily: 'var(--font-sans)' }}>
      <div className="flex items-center justify-between mb-3.5">
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>Interview Practice Insights</span>
        <button onClick={() => navigate('/history')} className="flex items-center gap-1 hover:underline" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
          View all <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7L7 3M4 3h3v3"/></svg>
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="h-16 rounded-lg" style={{ background: 'var(--secondary)' }} />
            <div className="h-16 rounded-lg" style={{ background: 'var(--secondary)' }} />
            <div className="h-16 rounded-lg" style={{ background: 'var(--secondary)' }} />
          </div>
          <div className="rounded-lg" style={{ background: 'var(--secondary)', height: 200 }} />
        </div>
      ) : hasInsights ? (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[{ lbl: 'Avg', val: avg, color: 'var(--primary)' }, { lbl: 'Best', val: best, color: '#10B981' }, { lbl: 'Low', val: low, color: 'var(--muted-foreground)' }].map((c) => (
              <div key={c.lbl} className="rounded-lg text-center" style={{ background: 'var(--secondary)', padding: '12px 8px' }}>
                <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', color: c.color, fontFamily: 'var(--font-sans)' }}>{c.val}</div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4, fontFamily: 'var(--font-sans)' }}>{c.lbl}</div>
              </div>
            ))}
          </div>

          <div className="relative flex justify-center mb-3.5">
            <svg viewBox="0 0 360 260" className="w-full" style={{ maxWidth: 360, overflow: 'visible' }}>
              {[0.25, 0.5, 0.75, 1].map((pct) => (
                <polygon key={pct} points={radarGridPolygon(pct, n)} fill="none" stroke={pct === 1 ? 'hsl(220 16% 85%)' : 'hsl(220 16% 92%)'} strokeWidth="1" />
              ))}
              {dims.map((d, i) => { const o = radarPt(R_MAX, radarAngle(i, n)); return <line key={d.label} x1={R_CX} y1={R_CY} x2={o.x} y2={o.y} stroke="hsl(220 16% 90%)" strokeWidth="1" />; })}
              <polygon points={radarPolygon(vals)} fill="hsl(221 91% 60% / 0.12)" stroke="hsl(221 91% 60%)" strokeWidth="1.5" />
              {dims.map((d, i) => {
                const pt = radarPt((vals[i] / 100) * R_MAX, radarAngle(i, n));
                return <circle key={d.label} cx={pt.x} cy={pt.y} r={hoverDim === i ? 5 : 4} fill="hsl(221 91% 60%)" stroke="#fff" strokeWidth="2" className="cursor-pointer" onMouseEnter={() => setHoverDim(i)} onMouseLeave={() => setHoverDim(null)} />;
              })}
              {dims.map((d, i) => {
                const ang = radarAngle(i, n);
                const o = radarPt(R_MAX + 18, ang);
                const cos = Math.cos(ang), sin = Math.sin(ang);
                const anchor = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
                const dy = sin > 0.3 ? 10 : sin < -0.3 ? -4 : 4;
                return <text key={d.label} x={o.x} y={o.y + dy} textAnchor={anchor} fill={hoverDim === i ? 'var(--primary)' : 'var(--muted-foreground)'} style={{ fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: hoverDim === i ? 600 : 500 }}>{d.label}</text>;
              })}
            </svg>
            {hoverDim !== null && (
              <div className="absolute pointer-events-none bg-card border border-border rounded-lg z-10" style={{ left: `${(radarPt((vals[hoverDim] / 100) * R_MAX, radarAngle(hoverDim, n)).x / 360) * 100}%`, top: `${(radarPt((vals[hoverDim] / 100) * R_MAX, radarAngle(hoverDim, n)).y / 260) * 100}%`, transform: 'translate(-50%, calc(-100% - 10px))', padding: '8px 10px', boxShadow: '0 4px 12px rgba(15,23,42,0.08)', minWidth: 132, fontFamily: 'var(--font-sans)' }}>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.3, marginBottom: 2 }}>{dims[hoverDim].label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>{vals[hoverDim]}<small style={{ fontWeight: 500, color: 'var(--muted-foreground)', fontSize: 12, marginLeft: 2 }}>/100</small></div>
                <div style={{ marginTop: 4, fontSize: 10.5, fontWeight: 500, color: 'hsl(221 80% 45%)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{qualLabel(vals[hoverDim])}</div>
              </div>
            )}
          </div>

          <div className="rounded-[10px]" style={{ background: 'var(--secondary)', padding: '12px 14px' }}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'var(--font-sans)' }}>Recommended focus area</span>
              <button onClick={() => navigate('/personalized-practice')} className="flex items-center gap-1 hover:underline" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>Practice {lowestDim.label} →</button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', fontFamily: 'var(--font-sans)' }}>{lowestDim.label}</span>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>{lowestDim.value}/100</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 6, lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>Your lowest recent dimension — focus here to lift your overall score.</p>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center" style={{ padding: '40px 20px', gap: 10 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="hsl(221 80% 60%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>No practice sessions yet</p>
          <button onClick={() => navigate('/personalized-practice')} style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>Practice now →</button>
        </div>
      )}
    </section>
  );
}

// ─── Community Picks panel ────────────────────────────────────────────────────
type CommunityCardPost = {
  id: string;
  role: string;
  company: string;
  status: 'Hired' | 'In progress';
  title: string;
  month: string;
  views: number;
  comments: number;
};

function formatMonthLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function CommunityPicksPanel() {
  const navigate = useNavigate();
  const [targetRole, setTargetRole] = useState<string>('');
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [apiPosts, setApiPosts] = useState<CommunityCardPost[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      let role = '';
      let companies: string[] = [];
      try {
        const res = await getProfilePreferences();
        const data = (res as { data?: { data?: Record<string, unknown> } & Record<string, unknown> })?.data?.data
          ?? (res as { data?: Record<string, unknown> })?.data;
        role = Array.isArray(data?.target_roles) ? (String(data!.target_roles[0] ?? '')) : '';
        companies = Array.isArray(data?.target_companies) ? (data!.target_companies as string[]) : [];
      } catch {
        // No preferences yet.
      }
      if (alive) {
        if (role) setTargetRole(role);
        if (companies.length) setTargetCompanies(companies);
      }

      const baseParams: Record<string, unknown> = { page: 0, size: 3 };
      if (role) baseParams.role = role;
      if (companies[0]) baseParams.company = companies[0];

      try {
        const res = await getPosts(baseParams);
        const data = (res as { data?: { data?: unknown } & Record<string, unknown> })?.data?.data
          ?? (res as { data?: unknown })?.data;
        const content: Array<Record<string, unknown>> = Array.isArray(data)
          ? (data as Array<Record<string, unknown>>)
          : (((data as { content?: Array<Record<string, unknown>> })?.content) ?? []);
        const mapped: CommunityCardPost[] = content.slice(0, 3).map((p, i) => ({
          id: String(p.id ?? i),
          role: String(p.role ?? ''),
          company: String(p.company ?? ''),
          status: String(p.outcome ?? '').toLowerCase().includes('hire') ? 'Hired' : 'In progress',
          title: String(p.summary ?? p.title ?? ''),
          month: formatMonthLabel(String(p.createdAt ?? p.date ?? '')),
          views: typeof p.saveCount === 'number' ? p.saveCount : (typeof p.viewCount === 'number' ? p.viewCount : 0),
          comments: typeof p.commentCount === 'number' ? p.commentCount : 0,
        }));
        if (alive) setApiPosts(mapped);
      } catch {
        if (alive) setApiPosts([]);
      }
    })();
    return () => { alive = false; };
  }, []);

  const posts = apiPosts ?? [];
  const hasPosts = posts.length > 0;
  const matchCompanies = targetCompanies.slice(0, 3).join(', ');

  return (
    <section className="bg-card border border-border rounded-xl" style={{ padding: 16, fontFamily: 'var(--font-sans)' }}>
      <div className="flex items-center justify-between mb-3.5">
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>Community Picks</span>
        <button onClick={() => navigate('/interview-insights')} className="flex items-center gap-1 hover:underline" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
          Browse community <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7L7 3M4 3h3v3"/></svg>
        </button>
      </div>

      {hasPosts ? (
        <>
          <div className="flex items-center justify-between rounded-lg mb-3" style={{ background: 'var(--secondary)', padding: '8px 12px', fontSize: 12 }}>
            <div className="min-w-0 truncate">
              <span style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>Matched to </span>
              <span style={{ color: 'var(--foreground)', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>{targetRole || 'your profile'}</span>
              {matchCompanies && <span style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}> · {matchCompanies}</span>}
            </div>
            <button onClick={() => navigate('/profile')} className="hover:underline shrink-0" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500, fontFamily: 'var(--font-sans)', background: 'none', border: 'none', cursor: 'pointer' }}>Edit ↗</button>
          </div>
          {posts.map((p, i) => (
            <div key={p.id} onClick={() => navigate(`/experience/${p.id}`)} className="cursor-pointer hover:bg-secondary rounded-lg transition-colors" style={{ paddingTop: i === 0 ? 4 : 12, paddingBottom: 12, paddingLeft: 8, paddingRight: 8, borderTop: i === 0 ? 'none' : '1px solid var(--border)', margin: '0 -8px' }}>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {p.role && <span className="inline-flex items-center rounded px-2 py-0.5" style={{ fontSize: 11, fontWeight: 500, color: 'hsl(221 80% 45%)', background: 'hsl(221 91% 60% / 0.08)' }}>{p.role}</span>}
                {p.company && <span className="inline-flex items-center rounded px-2 py-0.5" style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)', background: 'var(--secondary)' }}>{p.company}</span>}
                {p.month && <span className="ml-auto" style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-sans)' }}>{p.month}</span>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', lineHeight: 1.4, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>{p.title}</div>
              <div className="flex items-center justify-between" style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-sans)' }}>
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3 h-3"><ellipse cx="6" cy="6" rx="5" ry="3"/><circle cx="6" cy="6" r="1.5"/></svg>{p.views.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1" style={{ fontFamily: 'var(--font-sans)' }}>
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-3 h-3"><path d="M2 4a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 10 4v3a1.5 1.5 0 0 1-1.5 1.5H5L3 10V8.5a1.5 1.5 0 0 1-1-1.5z"/></svg>{p.comments}
                  </span>
                </div>
                <span className="hover:underline" style={{ color: 'var(--primary)', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>View post ↗</span>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center" style={{ padding: '40px 20px', gap: 10 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="hsl(221 80% 60%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>No posts match your target roles yet</p>
          <button onClick={() => navigate('/interview-insights')} style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>Browse community →</button>
        </div>
      )}
    </section>
  );
}

// ── Dashboard Home (main export) ─────────────────────────────────────────────
export function DashboardHome({ userData }: { userData: UserData | null }) {
  const userPlan = useUserPlan();
  const [plan, setPlan] = useState<Plan>(() => planFromUserPlan(userPlan.planData.currentPlan));
  const [stats, setStats] = useState<DashboardStatsApi | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Sync plan with the resolved user plan once it loads.
  const planInitedRef = useRef(false);
  useEffect(() => {
    if (planInitedRef.current) return;
    if (!userPlan.isLoading) {
      planInitedRef.current = true;
      setPlan(planFromUserPlan(userPlan.planData.currentPlan));
    }
  }, [userPlan.isLoading, userPlan.planData.currentPlan]);

  // Fetch dashboard stats once on mount; tolerate both bare and enveloped payloads.
  useEffect(() => {
    let alive = true;
    getDashboardStats()
      .then((res) => {
        const body = (res as { data?: unknown })?.data;
        let payload: DashboardStatsApi | null = null;
        if (body && typeof body === 'object') {
          const maybeEnvelope = body as { data?: DashboardStatsApi } & DashboardStatsApi;
          if ('totalLearningTimeMinutes' in maybeEnvelope || 'dailyLearningTimeMinutes' in maybeEnvelope) {
            payload = maybeEnvelope as DashboardStatsApi;
          } else if (maybeEnvelope.data && typeof maybeEnvelope.data === 'object') {
            payload = maybeEnvelope.data as DashboardStatsApi;
          }
        }
        if (alive) setStats(payload);
      })
      .catch(() => { if (alive) setStats(null); })
      .finally(() => { if (alive) setStatsLoading(false); });
    return () => { alive = false; };
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = userData?.firstName ? `, ${userData.firstName}` : '';

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Header row */}
      <div className="flex items-start justify-between mb-6">
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 28, lineHeight: 1.2, color: 'var(--foreground)', margin: 0 }}>
          {greeting}{name}
        </h1>
      </div>

      <StatsGrid plan={plan} stats={stats} loading={statsLoading} />
      <ChartCard
        learningDaily={stats?.dailyLearningTimeMinutes}
        sessionsDaily={stats?.dailySessionCount}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '24px', alignItems: 'start' }}>
        <MentorshipPanel />
        <InterviewInsightsPanel insights={stats?.interviewPracticeInsights ?? null} loading={statsLoading} />
        <CommunityPicksPanel />
      </div>
    </div>
  );
}
