import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Clock, CheckCircle2,
  ChevronRight, Star, Lock, Calendar, MessageCircle, Eye,
  Sparkles, Target, Users,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useUserPlan, type PlanType } from '@/hooks/useUserPlan';
import { listMyBookings } from '@/services/MentorService';
import { getProfilePreferences } from '@/services/ProfileServices';
import { getPosts } from '@/services/CommunityService';
import { getDashboardStats } from '@/services/DashboardService';

// ─── API data types ────────────────────────────────────────────────────────────
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

function formatMinutesAsHm(mins: number): string {
  if (!Number.isFinite(mins) || mins <= 0) return '0h 0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

function planFromUserPlan(pt: PlanType): Plan {
  if (pt === 'Elite') return 'premium';
  if (pt === 'Pro') return 'starter';
  return 'starter';
}

// ─── Brand blue scale — strict palette (blue-50 → blue-950) ──────────────────
const BLUES = {
  royal: '#3C77F6',   // ★ primary
  sky:   '#93B0FB',   // light periwinkle
  deep:  '#1D4ED8',   // deep blue
} as const;

// Avatar tints — cycle through 3 steps of the palette
const AVATAR_CYCLE = [
  'bg-blue-100 text-blue-700',   // #DBE5FE / #1D4ED8
  'bg-blue-200 text-blue-800',   // #BFD1FD / #1E40AF
  'bg-blue-50  text-blue-600',   // #EFF4FF / #2563EB
] as const;

const CHART_COLORS = {
  applications: BLUES.royal,
  learning:     BLUES.sky,
  sessions:     BLUES.deep,
} as const;

// ─── Types ─────────────────────────────────────────────────────────────────────
type Plan      = 'starter' | 'premium';
type ChartTab  = 'applications' | 'learning' | 'sessions';
type TimeRange = '7d' | '30d' | '3m';

// ─── Quality badge ─────────────────────────────────────────────────────────────
function qualityBadge(v: number) {
  if (v >= 85) return { label: 'Strong',       cls: 'bg-accent/15 text-accent-foreground' };
  if (v >= 75) return { label: 'Developing',   cls: 'bg-blue-100 text-blue-600' };
  if (v >= 65) return { label: 'Inconsistent', cls: 'bg-amber-400/15 text-amber-700 dark:text-amber-400' };
  return              { label: 'Needs work',   cls: 'bg-destructive/10 text-destructive' };
}

// ─── Custom Area Chart ─────────────────────────────────────────────────────────
const CHART_VW = 400;
const CHART_VH = 100;
const CHART_PADX = 4;
const CHART_PADY = 8;

function CustomAreaChart({
  data, color, formatValue,
}: {
  data: number[];
  color: string;
  formatValue?: (v: number) => string;
}) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = Math.max(...data, 0.01);
  const innerW = CHART_VW - CHART_PADX * 2;
  const innerH = CHART_VH - CHART_PADY * 2;

  const pts = data.map((v, i) => ({
    x: CHART_PADX + (i / (data.length - 1)) * innerW,
    y: CHART_PADX + (1 - v / max) * innerH,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(CHART_VH - CHART_PADY).toFixed(1)} L ${CHART_PADX} ${(CHART_VH - CHART_PADY).toFixed(1)} Z`;

  const gradId = `ag-${color.replace(/[^a-z0-9]/gi, '').slice(0, 10)}`;

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    setHovIdx(Math.max(0, Math.min(data.length - 1, Math.round(pct * (data.length - 1)))));
  };

  const hPt  = hovIdx !== null ? pts[hovIdx] : null;
  const hPct = hovIdx !== null ? (hovIdx / (data.length - 1)) * 100 : null;
  const fmtV = formatValue ?? ((v: number) => v.toFixed(1));

  return (
    <div className="relative w-full" style={{ height: 100 }}>
      {/* Tooltip */}
      {hPt && hovIdx !== null && (
        <div
          className="absolute z-20 bg-card border border-border rounded-md shadow-sm px-2.5 py-1 text-xs pointer-events-none whitespace-nowrap"
          style={{
            bottom: '100%',
            marginBottom: 6,
            left: `clamp(32px, ${hPct}%, calc(100% - 32px))`,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="text-foreground font-medium">{fmtV(data[hovIdx])}</span>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_VW} ${CHART_VH}`}
        preserveAspectRatio="none"
        className="w-full h-full"
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHovIdx(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>

        {/* Baseline */}
        <line
          x1={CHART_PADX} y1={CHART_VH - CHART_PADY}
          x2={CHART_VW - CHART_PADX} y2={CHART_VH - CHART_PADY}
          style={{ stroke: 'var(--border)', strokeWidth: 0.5 }}
        />

        {/* Area + line */}
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={1.5}
          strokeLinecap="round" strokeLinejoin="round"
        />

        {/* Hover elements */}
        {hPt && (
          <>
            <line
              x1={hPt.x} y1={CHART_PADY}
              x2={hPt.x} y2={CHART_VH - CHART_PADY}
              stroke={color} strokeWidth={1}
              strokeDasharray="3 2" opacity={0.5}
            />
            <circle cx={hPt.x} cy={hPt.y} r={3} fill={color} />
          </>
        )}
      </svg>
    </div>
  );
}

// ─── Custom Radar / Spider Chart ───────────────────────────────────────────────
const RCX = 130, RCY = 130, RR = 82;
const RVW = 260, RVH = 260;

function CustomRadar({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const n = data.length;
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt  = (i: number, ratio: number) => ({
    x: RCX + RR * ratio * Math.cos(ang(i)),
    y: RCY + RR * ratio * Math.sin(ang(i)),
  });

  const rings = [0.25, 0.5, 0.75, 1.0];
  const ringPaths = rings.map(r =>
    data.map((_, i) => { const p = pt(i, r); return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join(' ') + ' Z'
  );

  const dataPath = data
    .map((d, i) => { const p = pt(i, d.value / 100); return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`; })
    .join(' ') + ' Z';

  const dataPts = data.map((d, i) => pt(i, d.value / 100));

  return (
    <div className="relative w-full" style={{ paddingBottom: '100%' }}>
      <svg viewBox={`0 0 ${RVW} ${RVH}`} className="absolute inset-0 w-full h-full">
        {/* Grid rings */}
        {ringPaths.map((p, i) => (
          <path key={i} d={p} fill="none" style={{ stroke: 'hsl(var(--border))', strokeWidth: 0.7 }} />
        ))}
        {/* Spokes */}
        {data.map((_, i) => {
          const tip = pt(i, 1);
          return (
            <line key={i} x1={RCX} y1={RCY} x2={tip.x} y2={tip.y}
              style={{ stroke: 'var(--border)', strokeWidth: 0.7 }} />
          );
        })}
        {/* Data fill */}
        <path d={dataPath} fill={color} fillOpacity={0.14} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
        {/* Dots */}
        {dataPts.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y} r={hovIdx === i ? 4.5 : 2.5}
            fill={color}
            style={{ cursor: 'pointer', transition: 'r 0.12s' }}
            onMouseEnter={() => setHovIdx(i)}
            onMouseLeave={() => setHovIdx(null)}
          />
        ))}
        {/* Labels */}
        {data.map((d, i) => {
          const LR  = RR + 20;
          const lx  = RCX + LR * Math.cos(ang(i));
          const ly  = RCY + LR * Math.sin(ang(i));
          const cos = Math.cos(ang(i));
          const sin = Math.sin(ang(i));
          return (
            <text
              key={i}
              x={lx} y={ly}
              textAnchor={cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle'}
              dominantBaseline={sin > 0.25 ? 'hanging' : sin < -0.25 ? 'auto' : 'middle'}
              onMouseEnter={() => setHovIdx(i)}
              onMouseLeave={() => setHovIdx(null)}
              style={{
                fontSize: 9,
                fill: hovIdx === i ? color : 'var(--muted-foreground)',
                fontFamily: 'inherit',
                fontWeight: hovIdx === i ? 600 : 400,
                transition: 'fill 0.12s',
                cursor: 'default',
              }}
            >
              {d.label}
            </text>
          );
        })}
      </svg>
      {/* Hover tooltip */}
      {hovIdx !== null && (() => {
        const d   = data[hovIdx];
        const p   = dataPts[hovIdx];
        const bdg = qualityBadge(d.value);
        return (
          <div
            className="absolute z-20 bg-card border border-border rounded-md shadow-sm px-2.5 py-1.5 text-xs pointer-events-none"
            style={{
              left: `${(p.x / RVW) * 100}%`,
              top:  `${(p.y / RVH) * 100}%`,
              transform: 'translate(-50%, -120%)',
            }}
          >
            <div className="font-medium text-foreground mb-1">{d.label}</div>
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${bdg.cls}`}>{bdg.label}</span>
              <span className="text-muted-foreground">{d.value}/100</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Loading skeletons ───────────────────────────────────────────────────────
function StatsRowSkeleton({ plan: _plan }: { plan: Plan }) {
  return (
    <div className="grid gap-3 grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="bg-secondary rounded-md p-4 animate-pulse">
          <div className="h-3 w-24 bg-muted rounded mb-3" />
          <div className="h-7 w-20 bg-muted rounded mb-2" />
          <div className="h-3 w-28 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

function TrendChartSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-5 animate-pulse">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-20 bg-secondary rounded-md" />
          <div className="h-7 w-24 bg-secondary rounded-md" />
          <div className="h-7 w-20 bg-secondary rounded-md" />
        </div>
        <div className="flex items-center gap-1">
          <div className="h-6 w-16 bg-secondary rounded-md" />
          <div className="h-6 w-20 bg-secondary rounded-md" />
        </div>
      </div>
      <div className="flex items-center gap-8 mb-5">
        <div>
          <div className="h-3 w-24 bg-muted rounded mb-2" />
          <div className="h-6 w-16 bg-muted rounded" />
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <div className="h-3 w-20 bg-muted rounded mb-2" />
          <div className="h-6 w-12 bg-muted rounded" />
        </div>
      </div>
      <div className="h-[100px] w-full bg-secondary rounded-md" />
      <div className="h-3 w-40 bg-muted rounded mt-3" />
    </div>
  );
}

function MentorshipSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
        <span className="font-medium text-foreground">Mentorship</span>
        <button className="text-xs text-blue-600 hover:opacity-75 transition-opacity">Browse mentors ↗</button>
      </div>
      <div className="px-4 pb-4 pt-3 flex flex-col gap-4 flex-1 animate-pulse">
        <div className="h-40 bg-secondary rounded-lg" />
        <div className="h-3 w-24 bg-muted rounded" />
        <div className="flex flex-col gap-1.5">
          <div className="h-12 bg-secondary rounded-md" />
          <div className="h-12 bg-secondary rounded-md" />
        </div>
      </div>
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
        <span className="font-medium text-foreground">Interview Practice Insights</span>
        <button className="text-xs text-blue-600 hover:opacity-75 transition-opacity">View all ↗</button>
      </div>
      <div className="px-4 pb-4 pt-3 flex flex-col gap-4 flex-1 animate-pulse">
        <div className="grid grid-cols-3 gap-2">
          <div className="h-16 bg-secondary rounded-md" />
          <div className="h-16 bg-secondary rounded-md" />
          <div className="h-16 bg-secondary rounded-md" />
        </div>
        <div className="w-full aspect-square bg-secondary rounded-md" />
        <div className="h-16 bg-secondary rounded-md" />
      </div>
    </div>
  );
}

function CommunitySkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
        <span className="font-medium text-foreground">Community Picks</span>
        <button className="text-xs text-blue-600 hover:opacity-75 transition-opacity">Browse community ↗</button>
      </div>
      <div className="px-4 pb-4 pt-3 flex flex-col gap-3 flex-1 animate-pulse">
        <div className="h-9 bg-secondary rounded-md" />
        <div className="h-24 bg-secondary rounded-lg" />
        <div className="h-24 bg-secondary rounded-lg" />
        <div className="h-24 bg-secondary rounded-lg" />
      </div>
    </div>
  );
}

// ─── Stats Row ─────────────────────────────────────────────────────────────────
function StatsRow({ plan, stats, loading }: { plan: Plan; stats: DashboardStatsApi | null; loading: boolean }) {
  if (loading) return <StatsRowSkeleton plan={plan} />;
  const learningTime = stats ? formatMinutesAsHm(stats.totalLearningTimeMinutes ?? 0) : '—';
  const sessions = stats ? (stats.sessionCompletedCount ?? 0) : '—';
  return (
    <div className="grid gap-3 grid-cols-2">
      {/* Learning Time — sky blue */}
      <div className="bg-secondary rounded-md overflow-hidden flex">
        <div className="w-0.5 bg-blue-300 shrink-0" />
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Total Learning Time</span>
            <Clock className="w-3.5 h-3.5 text-blue-300" />
          </div>
          <div className="text-2xl font-semibold tracking-tight mb-1 text-blue-300">{learningTime}</div>
          <div className="text-xs text-muted-foreground">Mock + Mentorship · Apr</div>
        </div>
      </div>

      {/* Sessions — deep navy */}
      <div className="bg-secondary rounded-md p-4 border-l-2" style={{ borderLeftColor: BLUES.deep }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Sessions Completed</span>
          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: BLUES.deep }} />
        </div>
        <div className="text-2xl font-semibold tracking-tight mb-1" style={{ color: BLUES.deep }}>{sessions}</div>
        <div className="text-xs text-muted-foreground">Mock + Mentorship · Apr</div>
      </div>
    </div>
  );
}

// ─── Trend Chart Section ───────────────────────────────────────────────────────
const TABS: { id: ChartTab; label: string; premiumOnly: boolean }[] = [
  { id: 'learning',     label: 'Learning Time', premiumOnly: false },
  { id: 'sessions',     label: 'Sessions',      premiumOnly: false },
];
const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: '7d',  label: 'Last 7 Days'   },
  { id: '30d', label: 'Last 30 Days'  },
  { id: '3m',  label: 'Last 3 Months' },
];

function TrendChartSection({
  plan,
  learningDaily,
  sessionsDaily,
  loading,
}: {
  plan: Plan;
  learningDaily?: DailyEntry[];
  sessionsDaily?: DailyEntry[];
  loading: boolean;
}) {
  const isPremium = plan === 'premium';
  const [activeTab, setActiveTab] = useState<ChartTab>('learning');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const effectiveTab: ChartTab =
    !isPremium && activeTab === 'applications' ? 'learning' : activeTab;

  const color = CHART_COLORS[effectiveTab];
  const rangeDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  // Use real daily data for learning/sessions tabs when the API provides it.
  // No mock fallback: when the array is missing/empty (or for the applications
  // tab, which has no endpoint), render an empty chart state instead.
  const data = useMemo<number[]>(() => {
    if (effectiveTab === 'learning' && Array.isArray(learningDaily) && learningDaily.length > 0) {
      return learningDaily.slice(-rangeDays).map((d) => Number(d?.value) || 0);
    }
    if (effectiveTab === 'sessions' && Array.isArray(sessionsDaily) && sessionsDaily.length > 0) {
      return sessionsDaily.slice(-rangeDays).map((d) => Number(d?.value) || 0);
    }
    return [];
  }, [effectiveTab, timeRange, rangeDays, learningDaily, sessionsDaily]);

  const hasData = data.length > 0;

  if (loading) return <TrendChartSkeleton />;

  const total      = data.reduce((s, v) => s + v, 0);
  const activeDays = data.filter(v => v > 0).length;

  const [sumLabel1, sumVal1, sumLabel2, sumVal2] = (() => {
    if (!hasData) {
      if (effectiveTab === 'applications') return ['Total Applications', '—', 'Daily Average', '—'];
      if (effectiveTab === 'learning')     return ['Total Learning Time', '—', 'Avg per Session', '—'];
      return ['Sessions Completed', '—', 'Mock Sessions', '—'];
    }
    if (effectiveTab === 'applications') {
      return ['Total Applications', Math.round(total).toString(), 'Daily Average', (total / data.length).toFixed(1)];
    } else if (effectiveTab === 'learning') {
      const h = Math.floor(total / 60);
      const m = Math.round(total % 60);
      const avg = activeDays > 0 ? Math.round(total / activeDays) : 0;
      return ['Total Learning Time', h > 0 ? `${h}h ${m}m` : `${Math.round(total)}m`, 'Avg per Session', `${avg}m`];
    } else {
      return ['Sessions Completed', Math.round(total).toString(), 'Mock Sessions', Math.round(total * 0.7).toString()];
    }
  })();

  const fmtValue = effectiveTab === 'learning'
    ? (v: number) => { const h = Math.floor(v / 60); const m = Math.round(v % 60); return h > 0 ? `${h}h ${m}m` : `${Math.round(v)}m`; }
    : (v: number) => v.toFixed(1);

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1">
          {TABS.map(({ id, label, premiumOnly }) => {
            const locked    = premiumOnly && !isPremium;
            const isActive  = effectiveTab === id;
            const tabColor  = CHART_COLORS[id];
            return (
              <button
                key={id}
                onClick={() => !locked && setActiveTab(id)}
                disabled={locked}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  locked    ? 'text-muted-foreground/40 cursor-not-allowed' :
                  isActive  ? 'bg-secondary text-foreground' :
                  'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                {locked
                  ? <Lock className="w-3 h-3 shrink-0" />
                  : <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tabColor, opacity: isActive ? 1 : 0.45 }} />
                }
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-0.5">
          {TIME_RANGES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTimeRange(id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                timeRange === id
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary metrics */}
      <div className="flex items-center gap-8 mb-5">
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">{sumLabel1}</div>
          <div className="text-xl font-semibold tracking-tight" style={{ color }}>{sumVal1}</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">{sumLabel2}</div>
          <div className="text-xl font-semibold tracking-tight" style={{ color }}>{sumVal2}</div>
        </div>
      </div>

      {/* Chart */}
      {hasData ? (
        <CustomAreaChart data={data} color={color} formatValue={fmtValue} />
      ) : (
        <div className="flex items-center justify-center w-full text-xs text-muted-foreground" style={{ height: 100 }}>
          No activity yet
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs text-muted-foreground">
          {effectiveTab === 'applications' ? 'Applications submitted' :
           effectiveTab === 'learning'     ? 'Learning time per day (min)' :
           'Sessions per day'}
        </span>
      </div>
    </div>
  );
}

// ─── Mentorship Card ───────────────────────────────────────────────────────────
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
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${weekday} ${date}, ${time}`;
}

function formatBookingShortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function timeUntil(iso: string): string {
  const d = new Date(iso).getTime();
  if (isNaN(d)) return '';
  const diffMs = d - Date.now();
  if (diffMs <= 0) return 'Starting soon';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `In ${mins} min — get prepared`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `In ${hours} hour${hours === 1 ? '' : 's'} — get prepared`;
  const days = Math.round(hours / 24);
  return `In ${days} day${days === 1 ? '' : 's'} — get prepared`;
}

function MentorshipCard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [loading, setLoading] = useState(true);

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
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <MentorshipSkeleton />;

  // Upcoming = next CONFIRMED/PENDING future booking, soonest first.
  const now = Date.now();
  const upcoming = (bookings ?? [])
    .filter((b) => (b.status === 'CONFIRMED' || b.status === 'PENDING') && new Date(b.startTime).getTime() > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const nextSession = upcoming[0];

  // Past = COMPLETED, most recent first.
  const pastBookings = (bookings ?? [])
    .filter((b) => b.status === 'COMPLETED')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 3);

  // Real data only — no mock fallback. Show the upcoming-session view when a
  // future booking exists, otherwise the existing no-session empty state.
  const state: 'hasSession' | 'noSession' = nextSession ? 'hasSession' : 'noSession';

  // Map real past bookings into the shape the existing markup consumes. Empty
  // when there are no completed bookings.
  const pastList = pastBookings.map((b) => ({
    id: b.id,
    initials: getInitials(b.mentorName),
    name: b.mentorName,
    type: b.topicTitle || 'Session',
    date: formatBookingShortDate(b.startTime),
    reviewed: b.hasReview,
    rating: Math.round(b.mentorAvgRating ?? 0),
    navId: b.id as string | number,
  }));

  return (
    <div className="bg-card border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
        <span className="font-medium text-foreground">Mentorship</span>
        <button onClick={() => navigate('/coaching')} className="text-xs text-blue-600 hover:opacity-75 transition-opacity">Browse mentors ↗</button>
      </div>

      <div className="px-4 pb-4 pt-3 flex flex-col gap-4 flex-1 overflow-y-auto">
        {state === 'hasSession' ? (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-blue-50 flex items-center justify-between px-3 py-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-md">
                Upcoming session
              </span>
              <span className="text-xs text-blue-600">{nextSession ? formatBookingDateTime(nextSession.startTime) : 'Mon Apr 14, 2:00 PM'}</span>
            </div>
            <div className="p-3.5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  {nextSession ? getInitials(nextSession.mentorName) : 'SJ'}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{nextSession ? nextSession.mentorName : 'Sarah Jenkins'}</div>
                  <div className="text-xs text-muted-foreground">{nextSession ? `${nextSession.durationMinutes} min session` : 'Senior PM · TechCorp'}</div>
                </div>
              </div>
              {/* Session goal — blue-300 left accent */}
              <div className="bg-blue-50 border-l-2 border-blue-300 rounded-md p-2.5 mb-3">
                <div className="text-xs text-muted-foreground mb-0.5">Session goal</div>
                <div className="text-sm font-medium text-foreground mb-1.5">{nextSession ? (nextSession.topicTitle || 'Mentorship Session') : 'Mock Interview: Product Strategy'}</div>
                <div className="text-xs text-muted-foreground mb-0.5">Mentor note</div>
                <div className="text-xs text-foreground">{nextSession ? (nextSession.mentorNote || '—') : '"Please bring 2 product ideas to discuss."'}</div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <span className="text-xs text-blue-600">{nextSession ? timeUntil(nextSession.startTime) : 'In 14 hours — get prepared'}</span>
              </div>
              <button
                onClick={() => { if (nextSession?.meetingLink) window.open(nextSession.meetingLink, '_blank', 'noopener,noreferrer'); }}
                className="w-full bg-blue-500 text-white rounded-md py-2 text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Join session
              </button>
            </div>
          </div>
        ) : (
          /* No-session empty state */
          <div className="border border-dashed border-blue-300 bg-blue-50 rounded-lg p-5 flex flex-col items-center text-center gap-3">
            <Calendar className="w-5 h-5 text-blue-400" />
            <p className="text-xs text-muted-foreground">No upcoming sessions. Ready for your next 1:1?</p>
            <button onClick={() => navigate('/marketplace')} className="border border-blue-500 text-blue-600 rounded-md px-3 py-1.5 text-xs font-medium hover:bg-blue-50 transition-colors">
              Browse mentors →
            </button>
          </div>
        )}

        {/* Past sessions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">Past sessions</span>
            <span className="text-xs text-muted-foreground flex items-center gap-0.5 cursor-pointer hover:text-blue-600 transition-colors">
              {pastList.length} <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {pastList.map((s, idx) => (
              <div
                key={s.id}
                className="bg-background border border-border rounded-md p-2.5 flex items-center gap-2.5 cursor-pointer hover:bg-secondary/60 transition-colors"
                onClick={() => navigate(`/session-detail/${s.navId}`)}
              >
                {/* Avatar — cycles through blue-100/200/50 palette steps */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${AVATAR_CYCLE[idx % AVATAR_CYCLE.length]}`}>
                  {s.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.type} · {s.date}</div>
                </div>
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  {s.reviewed ? (
                    <>
                      <span className="px-1.5 py-0.5 bg-accent/15 text-accent-foreground text-[10px] font-medium rounded-sm">
                        Reviewed
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} className={`w-2 h-2 ${n <= s.rating ? 'text-blue-500 fill-blue-500' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400 text-[10px] font-medium rounded-sm">
                      Review pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Interview Practice Insights Card ─────────────────────────────────────────
function InterviewInsightsCard({ insights, loading }: { insights?: InterviewInsights | null; loading: boolean }) {
  const navigate = useNavigate();
  if (loading) return <InsightsSkeleton />;

  // Build radar dims from the API's categoryScores. No mock fallback: when there
  // are no insights, render the existing "No practice sessions yet" empty state.
  const hasInsights = insights != null && Array.isArray(insights.categoryScores) && insights.categoryScores.length > 0;
  const hasSessions = hasInsights;
  const dims = hasInsights
    ? insights!.categoryScores.map((c) => ({ label: c.category, value: Math.round(Number(c.averageScore) || 0) }))
    : [];
  const avg       = hasInsights ? Math.round(Number(insights!.averageScore) || 0) : 0;
  const best      = hasInsights ? Math.round(Number(insights!.bestScore) || 0) : 0;
  const low       = hasInsights ? Math.round(Number(insights!.lowestScore) || 0) : 0;
  const lowestDim = dims.length > 0 ? [...dims].sort((a, b) => a.value - b.value)[0] : { label: '', value: 0 };
  const lowestBdg = qualityBadge(lowestDim.value);

  return (
    <div className="bg-card border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
        <span className="font-medium text-foreground">Interview Practice Insights</span>
        <button onClick={() => navigate('/history')} className="text-xs text-blue-600 hover:opacity-75 transition-opacity">View all ↗</button>
      </div>

      {hasSessions ? (
        <div className="px-4 pb-4 pt-3 flex flex-col gap-4 flex-1">
          {/* Score summary — three distinct blue steps */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { label: 'Avg',  value: avg,  bg: 'bg-blue-50  border border-blue-200', val: 'text-blue-600' },
              { label: 'Best', value: best, bg: 'bg-blue-100 border border-blue-300', val: 'text-blue-500' },
              { label: 'Low',  value: low,  bg: 'bg-blue-900/6 border border-blue-800/15', val: 'text-blue-700' },
            ] as const).map(s => (
              <div key={s.label} className={`rounded-md p-3 text-center ${s.bg}`}>
                <div className={`text-lg font-semibold tracking-tight ${s.val}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Radar */}
          <CustomRadar data={dims} color={CHART_COLORS.sessions} />

          {/* Focus callout — blue-50 surface + blue-200 border */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">Recommended focus area</div>
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-sm font-medium text-foreground">{lowestDim.label}</span>
                <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${lowestBdg.cls}`}>
                  {lowestBdg.label}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">{lowestDim.value}/100</div>
            </div>
            <button onClick={() => navigate('/personalized-practice')} className="text-xs text-blue-600 font-medium hover:opacity-75 transition-opacity whitespace-nowrap shrink-0 mt-0.5">
              Practice {lowestDim.label} →
            </button>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3 text-center">
          <Target className="w-8 h-8 text-blue-300" />
          <p className="text-sm text-muted-foreground">No practice sessions yet</p>
          <button onClick={() => navigate('/personalized-practice')} className="text-sm text-blue-600 font-medium hover:opacity-75 transition-opacity">
            Practice now →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Community Picks Card ──────────────────────────────────────────────────────
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
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function CommunityPicksCard() {
  const navigate = useNavigate();
  const [targetRole, setTargetRole] = useState<string>('');
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [apiPosts, setApiPosts] = useState<CommunityCardPost[] | null>(null);
  const [loading, setLoading] = useState(true);

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
        // No preferences yet — keep mock hint values.
      }
      if (alive && (role || companies.length)) {
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
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <CommunitySkeleton />;

  // Real posts only — no mock fallback. When there are none, render the existing
  // "No posts match your target roles yet" empty state.
  const posts = apiPosts ?? [];
  const hasPosts = posts.length > 0;
  const matchCompanies = targetCompanies.slice(0, 3).join(', ');

  return (
    <div className="bg-card border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
        <span className="font-medium text-foreground">Community Picks</span>
        <button onClick={() => navigate('/interview-insights')} className="text-xs text-blue-600 hover:opacity-75 transition-opacity">Browse community ↗</button>
      </div>

      {hasPosts ? (
        <div className="px-4 pb-4 pt-3 flex flex-col gap-3 flex-1">
          {/* Personalisation hint */}
          <div className="bg-secondary rounded-md px-3 py-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground min-w-0 truncate">
              Matched to <span className="font-medium text-foreground">{targetRole}</span>{matchCompanies ? ` · ${matchCompanies}` : ''}
            </p>
            <button onClick={() => navigate('/profile')} className="text-xs text-blue-600 hover:opacity-75 transition-opacity shrink-0">
              Edit ↗
            </button>
          </div>

          {posts.map(post => (
            <div
              key={post.id}
              className="rounded-lg border border-border p-3.5 flex flex-col gap-2.5 hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              {/* Tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Role — blue-100 / blue-700 */}
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded-sm">
                  {post.role}
                </span>
                {/* Company — blue-50 / blue-600 (lighter step) */}
                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded-sm">
                  {post.company}
                </span>
                {/* Status */}
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-sm ${
                  post.status === 'Hired'
                    ? 'bg-accent/15 text-accent-foreground'
                    : 'bg-blue-200 text-blue-800'
                }`}>
                  {post.status}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">{post.month}</span>
              </div>
              {/* Title */}
              <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                {post.title}
              </p>
              {/* Footer */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />{post.views.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />{post.comments}
                </span>
                <button onClick={() => navigate(`/experience/${post.id}`)} className="ml-auto text-blue-600 hover:opacity-75 transition-opacity">View post ↗</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3 text-center">
          <Users className="w-8 h-8 text-blue-300" />
          <p className="text-sm text-muted-foreground">No posts match your target roles yet</p>
          <button onClick={() => navigate('/interview-insights')} className="text-sm text-blue-600 font-medium hover:opacity-75 transition-opacity">
            Browse community →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Dashboard Home (main export) ─────────────────────────────────────────────
type UserData = {
  firstName?: string;
  lastName?: string;
  role?: string;
};

export function DashboardHome({ userData }: { userData: UserData | null }) {
  const userPlan = useUserPlan();
  const [plan, setPlan] = useState<Plan>(() => planFromUserPlan(userPlan.planData.currentPlan));
  const [stats, setStats] = useState<DashboardStatsApi | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Sync the initial plan with the resolved user plan once it loads (the toggle
  // can still locally override afterward).
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

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name     = userData?.firstName ? `, ${userData.firstName}` : '';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-foreground" style={{ fontFamily: 'var(--font-serif)', fontWeight: 700 }}>{greeting}{name}</h1>
          
        </div>

        {/* Plan toggle — demonstrates both dashboard variants */}
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 shrink-0">
          {(['starter', 'premium'] as Plan[]).map(p => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                plan === p
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === 'premium' && (
                <Sparkles className="w-3 h-3 text-amber-500" />
              )}
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── 1. Stats row ── */}
      <StatsRow plan={plan} stats={stats} loading={statsLoading} />

      {/* ── 2. Trend chart ── */}
      <TrendChartSection
        key={plan}
        plan={plan}
        learningDaily={stats?.dailyLearningTimeMinutes}
        sessionsDaily={stats?.dailySessionCount}
        loading={statsLoading}
      />

      {/* ── 3. Bottom 3-column grid ── */}
      <div className="grid grid-cols-3 gap-5">
        <MentorshipCard />
        <InterviewInsightsCard insights={stats?.interviewPracticeInsights ?? null} loading={statsLoading} />
        <CommunityPicksCard />
      </div>

    </div>
  );
}