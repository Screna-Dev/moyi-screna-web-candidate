import { useState, useRef } from 'react';
import {
  Clock, CheckCircle2, Send, Inbox,
  ChevronRight, Star, Lock, Calendar, MessageCircle, Eye,
  TrendingUp, Target, Users,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan, type PlanType } from '@/hooks/useUserPlan';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';

// ─── Brand blue scale — strict palette (blue-50 → blue-950) ──────────────────
const BLUES = {
  royal: '#3C77F6',   // Tailwind blue-500 — primary
  sky:   '#93B0FB',   // Tailwind blue-300 — light periwinkle
  deep:  '#1D4ED8',   // Tailwind blue-700 — deep blue
} as const;

const CHART_COLORS = {
  applications: BLUES.royal,
  learning:     BLUES.sky,
  sessions:     BLUES.deep,
} as const;

// ─── Types ─────────────────────────────────────────────────────────────────────
type Plan      = 'free' | 'starter' | 'premium';
type ChartTab  = 'applications' | 'learning' | 'sessions';
type TimeRange = '7d' | '30d' | '3m';

const isPaid = (p: Plan) => p === 'starter' || p === 'premium';

// Map the canonical PlanType from useUserPlan into the dashboard's Plan tier.
// Free→free, Pro→starter, Elite→premium.
function planFromUserPlan(pt: PlanType): Plan {
  if (pt === 'Elite') return 'premium';
  if (pt === 'Pro')   return 'starter';
  return 'free';
}

// Stat values rendered in the StatsRow. Each field is optional so individual
// cards can render skeletons until their source resolves.
export type DashboardStats = {
  totalLearningTime?: string;        // e.g. "14h 20m"
  learningSubtext?: string;          // e.g. "Mock Interview · Apr"
  sessionsCompleted?: number | string;
  sessionsSubtext?: string;
  applicationsThisPeriod?: number | string;
  applicationsDelta?: string;        // e.g. "+18%"
  avgDailyApplications?: number | string;
  pendingReview?: number | string;
};

// Default placeholder values so the dashboard still renders without a backing
// service. Production code can pass real stats via DashboardHome props.
const DEFAULT_STATS: DashboardStats = {
  totalLearningTime: '14h 20m',
  sessionsCompleted: 23,
  applicationsThisPeriod: 47,
  applicationsDelta: '+18%',
  avgDailyApplications: 3.2,
  pendingReview: 12,
};

// ─── Deterministic series generator ───────────────────────────────────────────
function makeSeries(n: number, base: number, variance: number, seed: number): number[] {
  return Array.from({ length: n }, (_, i) =>
    Math.max(0, +(base + Math.sin(i * seed + 1.37) * variance).toFixed(1))
  );
}

const CHART_DATA: Record<ChartTab, Record<TimeRange, number[]>> = {
  applications: {
    '7d':  makeSeries(7,  3.2, 1.8, 3.7),
    '30d': makeSeries(30, 3.5, 2.4, 2.3),
    '3m':  makeSeries(90, 3.0, 2.8, 1.8),
  },
  learning: {
    '7d':  makeSeries(7,  48, 24, 4.1),
    '30d': makeSeries(30, 42, 20, 3.2),
    '3m':  makeSeries(90, 38, 18, 2.7),
  },
  sessions: {
    '7d':  makeSeries(7,  1.5, 0.8, 5.1),
    '30d': makeSeries(30, 1.3, 0.7, 4.4),
    '3m':  makeSeries(90, 1.1, 0.6, 3.8),
  },
};

// ─── Radar data ────────────────────────────────────────────────────────────────
// `value: null` means N/A — the user has no mock data for this dimension. The
// radar must NOT display 0/100 for these (DSH-I004).
type RadarDim = { label: string; value: number | null };

const RADAR_DIMS: RadarDim[] = [
  { label: 'Problem Solving', value: 82 },
  { label: 'Communication',   value: 75 },
  { label: 'Collaboration',   value: 68 },
  { label: 'Ownership',       value: 88 },
  { label: 'Self-awareness',  value: 72 },
  { label: 'Decision Making', value: 65 },
  { label: 'Leadership',      value: 79 },
];

// ─── Community posts ───────────────────────────────────────────────────────────
const COMMUNITY_POSTS = [
  {
    id: 'cp-1', role: 'Product Manager', company: 'Google', status: 'Hired' as const,
    title: 'Cracked Google PM L5 after 4 months of prep — full breakdown',
    month: 'Mar 2025', views: 2847, comments: 43,
  },
  {
    id: 'cp-2', role: 'Product Manager', company: 'Meta', status: 'In progress' as const,
    title: 'Meta PM behavioral loop — what surprised me and how I prepared',
    month: 'Apr 2025', views: 1204, comments: 18,
  },
  {
    id: 'cp-3', role: 'Senior PM', company: 'Stripe', status: 'Hired' as const,
    title: 'How I answered the payment product for emerging markets question',
    month: 'Feb 2025', views: 891, comments: 12,
  },
];

const PAST_SESSIONS = [
  { id: 1, initials: 'RK', name: 'Riya Kapoor',  type: 'Career Strategy', date: 'Apr 8',  reviewed: true,  rating: 5 },
  { id: 2, initials: 'TN', name: 'Tom Nakamura', type: 'Resume Review',   date: 'Mar 29', reviewed: false, rating: 0 },
  { id: 3, initials: 'AL', name: 'Amy Liu',      type: 'Mock Interview',  date: 'Mar 20', reviewed: true,  rating: 4 },
];

// ─── Quality badge ─────────────────────────────────────────────────────────────
// Thresholds per QA spec (DSH-I005): STRONG 80–100, DEVELOPING 70–79, INCONSISTENT <70.
function qualityBadge(v: number) {
  if (v >= 80) return { label: 'Strong',       cls: 'bg-accent/15 text-accent-foreground' };
  if (v >= 70) return { label: 'Developing',   cls: 'bg-primary/10 text-primary' };
  return              { label: 'Inconsistent', cls: 'bg-amber-400/15 text-amber-700 dark:text-amber-400' };
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
          style={{ stroke: 'hsl(var(--border))', strokeWidth: 0.5 }}
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

function CustomRadar({ data, color }: { data: RadarDim[]; color: string }) {
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

  // N/A handling (DSH-I001/I002/I004): only build the polygon from dimensions
  // that have data. If every dimension is N/A, render no polygon and no dots.
  const dataPts = data.map((d, i) => ({
    p: d.value !== null ? pt(i, d.value / 100) : null,
    value: d.value,
  }));
  const filledPts = dataPts.filter(d => d.p !== null) as { p: { x: number; y: number }; value: number }[];
  const dataPath = filledPts.length >= 3
    ? filledPts.map((d, i) => `${i === 0 ? 'M' : 'L'} ${d.p.x.toFixed(1)} ${d.p.y.toFixed(1)}`).join(' ') + ' Z'
    : null;

  const hovered    = hovIdx !== null ? data[hovIdx] : null;
  const hoveredPt  = hovIdx !== null ? dataPts[hovIdx].p : null;
  // For N/A vertices the tooltip needs to anchor somewhere — use the rim.
  const naAnchor   = hovIdx !== null && hovered && hovered.value === null ? pt(hovIdx, 1) : null;
  const tipAnchor  = hoveredPt ?? naAnchor;

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
              style={{ stroke: 'hsl(var(--border))', strokeWidth: 0.7 }} />
          );
        })}
        {/* Data fill — only if we have at least 3 points for a polygon */}
        {dataPath && (
          <path d={dataPath} fill={color} fillOpacity={0.14} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
        )}
        {/* Dots — only for dimensions with data */}
        {dataPts.map((d, i) => d.p && (
          <circle
            key={i}
            cx={d.p.x} cy={d.p.y} r={hovIdx === i ? 4.5 : 2.5}
            fill={color}
            style={{ cursor: 'pointer', transition: 'r 0.12s' }}
            onMouseEnter={() => setHovIdx(i)}
            onMouseLeave={() => setHovIdx(null)}
          />
        ))}
        {/* Labels — gray-out N/A dimensions to visually distinguish them */}
        {data.map((d, i) => {
          const LR    = RR + 20;
          const lx    = RCX + LR * Math.cos(ang(i));
          const ly    = RCY + LR * Math.sin(ang(i));
          const cos   = Math.cos(ang(i));
          const sin   = Math.sin(ang(i));
          const isNA  = d.value === null;
          const fill  = hovIdx === i
            ? (isNA ? 'hsl(var(--muted-foreground))' : color)
            : (isNA ? 'hsl(var(--muted-foreground) / 0.55)' : 'hsl(var(--muted-foreground))');
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
                fill,
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
      {/* Hover tooltip — shows "N/A" for null values, no badge/score (DSH-I006) */}
      {hovered && tipAnchor && (() => {
        const isNA = hovered.value === null;
        const bdg  = !isNA ? qualityBadge(hovered.value as number) : null;
        return (
          <div
            className="absolute z-20 bg-card border border-border rounded-md shadow-sm px-2.5 py-1.5 text-xs pointer-events-none"
            style={{
              left: `${(tipAnchor.x / RVW) * 100}%`,
              top:  `${(tipAnchor.y / RVH) * 100}%`,
              transform: 'translate(-50%, -120%)',
            }}
          >
            <div className="font-medium text-foreground mb-1">{hovered.label}</div>
            {isNA ? (
              <span className="text-muted-foreground">N/A</span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${bdg!.cls}`}>{bdg!.label}</span>
                <span className="text-muted-foreground">{hovered.value}/100</span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Stats Row ─────────────────────────────────────────────────────────────────
function StatValue({
  value, isLoading, color, className,
}: {
  value: number | string | undefined;
  isLoading: boolean;
  color?: string;
  className?: string;
}) {
  if (isLoading || value === undefined) {
    return <div className="h-7 w-16 bg-muted/60 rounded animate-pulse mb-1" />;
  }
  return (
    <div className={`text-2xl font-semibold tracking-tight mb-1 ${className ?? ''}`} style={color ? { color } : undefined}>
      {value}
    </div>
  );
}

function StatsRow({
  plan, stats, isLoading,
}: {
  plan: Plan;
  stats: DashboardStats;
  isLoading: boolean;
}) {
  const paid       = isPaid(plan);
  const isPremium  = plan === 'premium';
  const cardCount  = plan === 'premium' ? 5 : plan === 'starter' ? 4 : 2;
  const gridCls    =
    cardCount === 5 ? 'grid-cols-5' :
    cardCount === 4 ? 'grid-cols-4' :
                      'grid-cols-2';

  const learningSubtext  = stats.learningSubtext  ?? (paid ? 'Mock + Mentorship · Apr' : 'Mock Interview · Apr');
  const sessionsSubtext  = stats.sessionsSubtext  ?? (paid ? 'Mock + Mentorship · Apr' : 'Mock Interview · Apr');

  return (
    <div className={`grid gap-3 ${gridCls}`}>
      <div className="bg-secondary rounded-md overflow-hidden flex">
        <div className="w-0.5 bg-blue-300 shrink-0" />
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Total Learning Time</span>
            <Clock className="w-3.5 h-3.5 text-blue-300" />
          </div>
          <StatValue value={stats.totalLearningTime} isLoading={isLoading} className="text-blue-300" />
          <div className="text-xs text-muted-foreground">{learningSubtext}</div>
        </div>
      </div>

      <div className="bg-secondary rounded-md p-4 border-l-2" style={{ borderLeftColor: BLUES.deep }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Sessions Completed</span>
          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: BLUES.deep }} />
        </div>
        <StatValue value={stats.sessionsCompleted} isLoading={isLoading} color={BLUES.deep} />
        <div className="text-xs text-muted-foreground">{sessionsSubtext}</div>
      </div>

      {paid && (
        <>
          <div className="bg-secondary rounded-md p-4 border-l-2" style={{ borderLeftColor: BLUES.royal }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Applications This Period</span>
              <Send className="w-3.5 h-3.5" style={{ color: BLUES.royal }} />
            </div>
            <StatValue value={stats.applicationsThisPeriod} isLoading={isLoading} color={BLUES.royal} />
            {isLoading || stats.applicationsDelta === undefined ? (
              <div className="h-3.5 w-24 bg-muted/60 rounded animate-pulse" />
            ) : (
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className="w-3 h-3" style={{ color: BLUES.royal }} />
                <span style={{ color: BLUES.royal }} className="font-medium">{stats.applicationsDelta}</span>
                <span className="text-muted-foreground">vs prior period</span>
              </div>
            )}
          </div>

          <div className="bg-secondary rounded-md p-4 border-l-2" style={{ borderLeftColor: BLUES.sky }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Avg. Daily Applications</span>
              <TrendingUp className="w-3.5 h-3.5" style={{ color: BLUES.sky }} />
            </div>
            <StatValue value={stats.avgDailyApplications} isLoading={isLoading} color={BLUES.sky} />
            <div className="text-xs text-muted-foreground">Rolling 30-day avg</div>
          </div>
        </>
      )}

      {isPremium && (
        <div className="bg-secondary rounded-md p-4 border-l-2 border-l-amber-400/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Pending Review</span>
            <Inbox className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <StatValue value={stats.pendingReview} isLoading={isLoading} className="text-amber-600" />
          <div className="text-xs text-muted-foreground">Ready for your approval</div>
        </div>
      )}
    </div>
  );
}

// ─── Trend Chart Section ───────────────────────────────────────────────────────
const TABS: { id: ChartTab; label: string; paidOnly: boolean }[] = [
  { id: 'applications', label: 'Applications',  paidOnly: true  },
  { id: 'learning',     label: 'Learning Time', paidOnly: false },
  { id: 'sessions',     label: 'Sessions',      paidOnly: false },
];
const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: '7d',  label: 'Last 7 Days'   },
  { id: '30d', label: 'Last 30 Days'  },
  { id: '3m',  label: 'Last 3 Months' },
];

function TrendChartSection({
  plan, hasSessions,
}: {
  plan: Plan;
  hasSessions: boolean;
}) {
  const navigate = useNavigate();
  const paid = isPaid(plan);
  const [activeTab, setActiveTab] = useState<ChartTab>('learning');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Free users cannot land on the applications tab — silently fall back.
  const effectiveTab: ChartTab =
    !paid && activeTab === 'applications' ? 'learning' : activeTab;

  if (!hasSessions) {
    return (
      <div className="bg-card border border-border rounded-lg p-5 flex flex-col items-center justify-center text-center gap-3 min-h-[260px]">
        <Target className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No practice sessions yet</p>
        <button
          onClick={() => navigate('/personalized-practice')}
          className="text-sm text-primary font-medium hover:opacity-75 transition-opacity"
        >
          Practice now →
        </button>
      </div>
    );
  }

  const data  = CHART_DATA[effectiveTab][timeRange];
  const color = CHART_COLORS[effectiveTab];

  const total      = data.reduce((s, v) => s + v, 0);
  const activeDays = data.filter(v => v > 0).length;

  const [sumLabel1, sumVal1, sumLabel2, sumVal2] = (() => {
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
          {TABS.map(({ id, label, paidOnly }) => {
            const locked    = paidOnly && !paid;
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
      <CustomAreaChart data={data} color={color} formatValue={fmtValue} />

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
function MentorshipCard() {
  const navigate = useNavigate();
  const [state] = useState<'hasSession' | 'noSession'>('hasSession');

  return (
    <div className="bg-card border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
        <span className="font-medium text-foreground">Mentorship</span>
        <button className="text-xs text-primary hover:opacity-75 transition-opacity">Browse mentors ↗</button>
      </div>

      <div className="px-4 pb-4 pt-3 flex flex-col gap-4 flex-1 overflow-y-auto">
        {state === 'hasSession' ? (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-primary/10 flex items-center justify-between px-3 py-2">
              <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded-md">
                Upcoming session
              </span>
              <span className="text-xs text-primary">Mon Apr 14, 2:00 PM</span>
            </div>
            <div className="p-3.5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  SJ
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Sarah Jenkins</div>
                  <div className="text-xs text-muted-foreground">Senior PM · TechCorp</div>
                </div>
              </div>
              <div className="bg-blue-50 border-l-2 border-blue-300 rounded-md p-2.5 mb-3">
                <div className="text-xs text-muted-foreground mb-0.5">Session goal</div>
                <div className="text-sm font-medium text-foreground mb-1.5">Mock Interview: Product Strategy</div>
                <div className="text-xs text-muted-foreground mb-0.5">Mentor note</div>
                <div className="text-xs text-foreground">"Please bring 2 product ideas to discuss."</div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-xs text-primary">In 14 hours — get prepared</span>
              </div>
              <button className="w-full bg-primary text-primary-foreground rounded-md py-2 text-xs font-medium hover:opacity-90 transition-opacity">
                Join session
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-blue-300 bg-blue-50 rounded-lg p-5 flex flex-col items-center text-center gap-3">
            <Calendar className="w-5 h-5 text-blue-400" />
            <p className="text-xs text-muted-foreground">No upcoming sessions. Ready for your next 1:1?</p>
            <button className="border border-primary text-primary rounded-md px-3 py-1.5 text-xs font-medium hover:bg-primary/5 transition-colors">
              Browse mentors →
            </button>
          </div>
        )}

        {/* Past sessions — most recent 3 only; header shows total count (DSH-M006) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">Past sessions</span>
            <span
              className="text-xs text-muted-foreground flex items-center gap-0.5 cursor-pointer hover:text-primary transition-colors"
              onClick={() => navigate('/mentorship-sessions')}
            >
              {PAST_SESSIONS.length} <ChevronRight className="w-3 h-3" />
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {PAST_SESSIONS.slice(0, 3).map(s => (
              <div
                key={s.id}
                className="bg-background border border-border rounded-md p-2.5 flex items-center gap-2.5 cursor-pointer hover:bg-secondary/60 transition-colors"
                onClick={() => navigate(`/session-detail/${s.id}`)}
              >
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-foreground shrink-0">
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
                          <Star key={n} className={`w-2 h-2 ${n <= s.rating ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
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
// Three states per QA spec (DSH-I001/I002/I003):
//   Form A: every dimension has data         → radar polygon + Avg/Best/Low + focus callout for lowest
//   Form B: some dimensions are N/A          → radar partial + Avg/Best/Low over non-null + focus on an N/A dim
//   Form C: all dimensions N/A (new user)    → empty radar + N/A summary + 4 entry cards (no scores)
function InterviewInsightsCard() {
  const dims        = RADAR_DIMS;
  const withData    = dims.filter((d): d is { label: string; value: number } => d.value !== null);
  const naDims      = dims.filter(d => d.value === null);
  const allNA       = withData.length === 0;

  // Summary metrics computed only from non-null dimensions (DSH-I007).
  const avg  = withData.length ? Math.round(withData.reduce((s, d) => s + d.value, 0) / withData.length) : null;
  const best = withData.length ? Math.max(...withData.map(d => d.value)) : null;
  const low  = withData.length ? Math.min(...withData.map(d => d.value)) : null;

  // Recommended focus: in Form B prefer an N/A dimension; in Form A pick the lowest scoring.
  const focusDim    = naDims[0] ?? [...withData].sort((a, b) => a.value - b.value)[0] ?? null;
  const focusIsNA   = focusDim?.value === null;
  const focusBdg    = focusDim && focusDim.value !== null ? qualityBadge(focusDim.value) : null;

  return (
    <div className="bg-card border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
        <span className="font-medium text-foreground">Interview Practice Insights</span>
        <button className="text-xs text-primary hover:opacity-75 transition-opacity">View all ↗</button>
      </div>

      <div className="px-4 pb-4 pt-3 flex flex-col gap-4 flex-1">
        {/* Score summary — N/A when no mock records (DSH-I007) */}
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: 'Avg',  value: avg,  bg: 'bg-blue-50 border border-blue-200',                  val: 'text-blue-600' },
            { label: 'Best', value: best, bg: 'bg-blue-100 border border-blue-300',                 val: 'text-blue-500' },
            { label: 'Low',  value: low,  bg: 'bg-blue-900/[0.06] border border-blue-800/15',       val: 'text-blue-700' },
          ] as const).map(s => (
            <div key={s.label} className={`rounded-md p-3 text-center ${s.bg}`}>
              <div className={`text-lg font-semibold tracking-tight ${s.val}`}>
                {s.value === null ? <span className="text-muted-foreground">N/A</span> : s.value}
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Radar — renders empty (just grid + spokes) when allNA */}
        <CustomRadar data={dims} color={CHART_COLORS.sessions} />

        {/* Form C — 4 (here: all-N/A) entry cards: dimension name + CTA only, NO score (DSH-I001/I008) */}
        {allNA ? (
          <div className="grid grid-cols-2 gap-2">
            {dims.map(d => (
              <button
                key={d.label}
                className="rounded-md border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors p-2.5 text-left flex flex-col gap-1"
              >
                <span className="text-xs font-medium text-foreground truncate">{d.label}</span>
                <span className="text-xs text-primary">Start practice →</span>
              </button>
            ))}
          </div>
        ) : focusDim ? (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">Recommended focus area</div>
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-sm font-medium text-foreground">{focusDim.label}</span>
                {focusBdg && (
                  <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium ${focusBdg.cls}`}>
                    {focusBdg.label}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {focusIsNA ? 'No data yet — try a practice session' : `${focusDim.value}/100`}
              </div>
            </div>
            <button className="text-xs text-primary font-medium hover:opacity-75 transition-opacity whitespace-nowrap shrink-0 mt-0.5">
              Practice {focusDim.label} →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Community Picks Card ──────────────────────────────────────────────────────
function CommunityPicksCard() {
  const [hasPosts] = useState(true);

  return (
    <div className="bg-card border border-border rounded-lg flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
        <span className="font-medium text-foreground">Community Picks</span>
        <button className="text-xs text-primary hover:opacity-75 transition-opacity">Browse community ↗</button>
      </div>

      {hasPosts ? (
        <div className="px-4 pb-4 pt-3 flex flex-col gap-3 flex-1">
          {/* Personalisation hint */}
          <div className="bg-secondary rounded-md px-3 py-2 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground min-w-0 truncate">
              Matched to <span className="font-medium text-foreground">Product Manager</span> · Google, Meta
            </p>
            <button className="text-xs text-primary hover:opacity-75 transition-opacity shrink-0">
              Edit ↗
            </button>
          </div>

          {COMMUNITY_POSTS.map(post => (
            <div
              key={post.id}
              className="rounded-lg border border-border p-3.5 flex flex-col gap-2.5 hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              {/* Tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-sm">
                  {post.role}
                </span>
                <span className="px-1.5 py-0.5 bg-secondary text-muted-foreground text-[10px] font-medium rounded-sm">
                  {post.company}
                </span>
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-sm ${
                  post.status === 'Hired'
                    ? 'bg-accent/15 text-accent-foreground'
                    : 'bg-chart-4/15 text-chart-4'
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
                <button className="ml-auto text-primary hover:opacity-75 transition-opacity">View post ↗</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3 text-center">
          <Users className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No posts match your target roles yet</p>
          <button className="text-sm text-primary font-medium hover:opacity-75 transition-opacity">
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

export function DashboardHome({
  userData,
  plan: planProp,
  stats,
  isStatsLoading = false,
  hasSessions = true,
}: {
  userData: UserData | null;
  plan?: Plan;
  stats?: DashboardStats;
  isStatsLoading?: boolean;
  hasSessions?: boolean;
}) {
  // Plan source: explicit `plan` prop wins for testing/preview, otherwise read
  // the real subscription. Free→free, Pro→starter, Elite→premium.
  const userPlan = useUserPlan();
  const plan: Plan = planProp ?? planFromUserPlan(userPlan.planData.currentPlan);

  // Fall back to the canned defaults when no stats prop is supplied so the
  // page still renders during integration. Real data arrives via `stats`.
  const effectiveStats: DashboardStats = stats ?? DEFAULT_STATS;

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name     = userData?.firstName ? `, ${userData.firstName}` : '';

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-foreground">{greeting}{name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {userData?.role ? `${userData.role} · ` : ''}Apr 2025 · Career Command Center
          </p>
        </div>
      </div>

      {/* ── 1. Stats row ── */}
      <StatsRow plan={plan} stats={effectiveStats} isLoading={isStatsLoading} />

      {/* ── 2. Trend chart ── */}
      <TrendChartSection key={plan} plan={plan} hasSessions={hasSessions} />

      {/* ── 3. Bottom grid — Mentorship is Pro/Elite only (DSH-M001) ── */}
      <div className={`grid gap-5 ${plan === 'free' ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {plan !== 'free' && <MentorshipCard />}
        <InterviewInsightsCard />
        <CommunityPicksCard />
      </div>

    </div>
  );
}

// ── Page wrapper: routed at /dashboard ───────────────────────────────────────
export function DashboardHomePage() {
  const { user } = useAuth();
  const nameParts = (user?.name || '').trim().split(' ');
  const userData: UserData | null = user
    ? {
        firstName: nameParts[0] || undefined,
        lastName: nameParts.slice(1).join(' ') || undefined,
        role: user.role,
      }
    : null;

  return (
    <DashboardLayout>
      <DashboardHome userData={userData} />
    </DashboardLayout>
  );
}