import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan, type PlanType } from '@/hooks/useUserPlan';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { T } from '@/lib/design-tokens';
import { listMyBookings, cancelBooking, rescheduleBooking, getMentor, getMentorSlots } from '@/services/MentorService';
import { getProfilePreferences } from '@/services/ProfileServices';
import { getPosts } from '@/services/CommunityService';
import { getDashboardStats } from '@/services/DashboardService';
import { useDwellTracking } from '@/hooks/useDwellTracking';
import { EVENTS } from '@/constants/analyticsEvents';

// ─── Types ───────────────────────────────────────────────────────────────────
type Plan = 'free' | 'starter' | 'premium';
type ChartTab = 'applications' | 'learning' | 'sessions';
type TimeRange = '7d' | '30d' | '3m';

export type DashboardStats = {
  totalLearningTime?: string;
  sessionsCompleted?: number | string;
  applicationsThisPeriod?: number | string;
  applicationsDelta?: string;
  avgDailyApplications?: number | string;
};

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

type UserData = {
  firstName?: string;
  lastName?: string;
  role?: string;
};

const EMPTY_STATS: DashboardStats = {
  totalLearningTime: '—',
  sessionsCompleted: '—',
  applicationsThisPeriod: '—',
  applicationsDelta: '—',
  avgDailyApplications: '—',
};

// ─── Skeleton primitive ──────────────────────────────────────────────────────
function Skeleton({
  width = '100%',
  height = 12,
  radius = 6,
  style,
}: { width?: number | string; height?: number | string; radius?: number; style?: CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${T.bgSecondary} 0%, #EEF2F7 50%, ${T.bgSecondary} 100%)`,
        backgroundSize: '200% 100%',
        animation: 'dh-skeleton 1.2s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

function planFromUserPlan(pt: PlanType): Plan {
  if (pt === 'Elite') return 'premium';
  if (pt === 'Pro') return 'starter';
  return 'free';
}

// ─── Stat card ───────────────────────────────────────────────────────────────
type StatVariant = 'default' | 'soft' | 'warning';

function StatCard({
  label,
  value,
  sub,
  icon,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  variant?: StatVariant;
}) {
  const [hover, setHover] = useState(false);

  const valueColor =
    variant === 'warning' ? T.warning :
    variant === 'soft' ? T.blue500 :
    T.blue600;

  const iconColor =
    variant === 'warning' ? T.warning :
    T.blue500;

  const iconBg =
    variant === 'warning' ? 'rgba(245, 158, 11, 0.10)' :
    'rgba(37, 99, 235, 0.08)';

  return (
    <div
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: '#fff',
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 0,
        position: 'relative',
        cursor: 'pointer',
        transition: 'transform 200ms cubic-bezier(.4,0,.2,1), box-shadow 200ms cubic-bezier(.4,0,.2,1)',
        boxShadow: hover ? T.shadowHover : 'none',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: T.textSecondary, lineHeight: 1.4 }}>{label}</div>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          display: 'grid', placeItems: 'center',
          color: iconColor, background: iconBg,
          flex: 'none',
        }}>
          {icon}
        </div>
      </div>
      <div style={{
        fontSize: 26, fontWeight: 600, color: valueColor,
        lineHeight: 1.1, letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: T.textSecondary }}>{sub}</div>
    </div>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function IconClock() {
  return <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1"/></svg>;
}
function IconCheck() {
  return <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M5.5 8l2 2 3-4"/></svg>;
}
function IconSend() {
  return <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2L7.5 9"/><path d="M14 2l-5 12-2.5-5L1.5 6.5z"/></svg>;
}
function IconTrend() {
  return <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><polyline points="2,11 6,7 9,9 14,3"/><polyline points="14,3 14,7"/><polyline points="14,3 10,3"/></svg>;
}
function IconLock() {
  return <svg viewBox="0 0 12 12" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5.5" width="6" height="4" rx="1"/><path d="M4.5 5.5V4a1.5 1.5 0 0 1 3 0v1.5"/></svg>;
}
function IconArrow() {
  return <svg viewBox="0 0 10 10" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 7L7 3M4 3h3v3"/></svg>;
}
function IconLockLarge() {
  return <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
}
function IconStar({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 11 11" width={11} height={11} fill={filled ? T.warning : T.textMuted} aria-hidden><polygon points="5.5,1 6.7,4 10,4.2 7.4,6.4 8.3,9.6 5.5,7.8 2.7,9.6 3.6,6.4 1,4.2 4.3,4" /></svg>;
}
function IconEye() {
  return <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.4}><ellipse cx="6" cy="6" rx="5" ry="3"/><circle cx="6" cy="6" r="1.5"/></svg>;
}
function IconMsg() {
  return <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.4}><path d="M2 4a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 10 4v3a1.5 1.5 0 0 1-1.5 1.5H5L3 10V8.5a1.5 1.5 0 0 1-1-1.5z"/></svg>;
}

// ─── Stats Row ───────────────────────────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      minHeight: 96,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width={110} height={10} />
        <Skeleton width={28} height={28} radius={8} />
      </div>
      <Skeleton width={70} height={22} />
      <Skeleton width="80%" height={10} />
    </div>
  );
}

function StatsRow({ plan, stats, isLoading }: { plan: Plan; stats: DashboardStats; isLoading: boolean }) {
  const isPremium = plan === 'premium';
  const colCount = isPremium ? 4 : 2;
  // Mentorship is available to all members, so it's reflected in these stats regardless of plan.
  const learningSub = 'Mock Interview + Mentorship Sessions';
  const sessionsSub = 'Mock Interview + Mentorship Sessions';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${colCount}, 1fr)`,
        gap: 12,
        marginBottom: 20,
        transition: 'grid-template-columns 320ms cubic-bezier(.4,0,.2,1)',
      }}
    >
      {isLoading ? (
        Array.from({ length: colCount }).map((_, i) => <StatCardSkeleton key={i} />)
      ) : (
        <>
          <StatCard label="Total Learning Time" value={stats.totalLearningTime ?? '—'} sub={learningSub} icon={<IconClock />} />
          <StatCard label="Sessions Completed" value={stats.sessionsCompleted ?? '—'} sub={sessionsSub} icon={<IconCheck />} />
          {isPremium && (
            <>
              <StatCard
                label="Applications This Period"
                value={stats.applicationsThisPeriod ?? '—'}
                sub={`↗ ${stats.applicationsDelta ?? '—'} vs prior period`}
                icon={<IconSend />}
              />
              <StatCard
                label="Avg. Daily Applications"
                value={stats.avgDailyApplications ?? '—'}
                sub="Rolling 30-day avg"
                icon={<IconTrend />}
                variant="soft"
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Trend chart series ──────────────────────────────────────────────────────
type Series = {
  data: number[];
  dates?: string[];
  summaryA: { label: string; value: string };
  summaryB: { label: string; value: string };
  legend: string;
};
// Labels per tab used for the empty-state series. There is no timeseries endpoint
// yet, so when the API returns no daily data we render the empty state — never mock.
const TAB_LABELS: Record<ChartTab, { a: string; b: string; legend: string }> = {
  applications: { a: 'Total Applications', b: 'Daily Average', legend: 'Applications submitted' },
  learning: { a: 'Total Learning Time', b: 'Daily Average', legend: 'Learning time per day (min)' },
  sessions: { a: 'Total Sessions', b: 'Avg per Day', legend: 'Sessions per day' },
};

function formatValue(tab: ChartTab, v: number): string {
  if (tab === 'learning') {
    const h = Math.floor(v / 60), m = v % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  if (tab === 'sessions') return `${v} session${v === 1 ? '' : 's'}`;
  return `${v} application${v === 1 ? '' : 's'}`;
}
function formatDate(i: number, total: number): string {
  const end = new Date(2026, 4, 7);
  const d = new Date(end);
  d.setDate(end.getDate() - (total - 1 - i));
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// ─── Trend Chart ─────────────────────────────────────────────────────────────
function TrendChartSkeleton() {
  return (
    <section style={{
      background: '#fff',
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Skeleton width={260} height={32} radius={9999} />
        <Skeleton width={280} height={24} />
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <Skeleton width={140} height={48} radius={8} />
        <Skeleton width={140} height={48} radius={8} />
      </div>
      <Skeleton width="100%" height={180} radius={8} />
    </section>
  );
}

function TrendChart({
  plan,
  isLoading,
  learningDaily,
  sessionsDaily,
}: {
  plan: Plan;
  isLoading: boolean;
  learningDaily?: DailyEntry[];
  sessionsDaily?: DailyEntry[];
}) {
  const isPremium = plan === 'premium';
  const [activeTab, setActiveTab] = useState<ChartTab>('learning');
  const [range, setRange] = useState<TimeRange>('30d');
  const [hover, setHover] = useState<{ x: number; y: number; i: number; v: number } | null>(null);

  // Free/Starter: applications tab is locked
  const effectiveTab: ChartTab = !isPremium && activeTab === 'applications' ? 'learning' : activeTab;

  const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const series: Series = useMemo(() => {
    if (effectiveTab === 'learning' && Array.isArray(learningDaily)) {
      const sliced = learningDaily.slice(-rangeDays);
      const data = sliced.map((d) => Number(d?.value) || 0);
      const dates = sliced.map((d) => d?.date ?? '');
      const total = data.reduce((a, b) => a + b, 0);
      const avg = data.length ? Math.round(total / data.length) : 0;
      return {
        data,
        dates,
        summaryA: { label: 'Total Learning Time', value: formatMinutesAsHm(total) },
        summaryB: { label: 'Daily Average', value: `${avg}m` },
        legend: 'Learning time per day (min)',
      };
    }
    if (effectiveTab === 'sessions' && Array.isArray(sessionsDaily)) {
      const sliced = sessionsDaily.slice(-rangeDays);
      const data = sliced.map((d) => Number(d?.value) || 0);
      const dates = sliced.map((d) => d?.date ?? '');
      const total = data.reduce((a, b) => a + b, 0);
      const avg = data.length ? (total / data.length).toFixed(1) : '0';
      return {
        data,
        dates,
        summaryA: { label: 'Total Sessions', value: String(total) },
        summaryB: { label: 'Avg per Day', value: avg },
        legend: 'Sessions per day',
      };
    }
    // No real daily data for this tab — return an empty series so the chart
    // renders its empty state instead of fabricated values.
    const lbl = TAB_LABELS[effectiveTab];
    return {
      data: [],
      dates: [],
      summaryA: { label: lbl.a, value: '—' },
      summaryB: { label: lbl.b, value: '—' },
      legend: lbl.legend,
    };
  }, [effectiveTab, learningDaily, sessionsDaily, rangeDays]);

  const hasData = series.data.length > 0;

  const svgRef = useRef<SVGSVGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const W = 800, H = 180;
  const PAD_T = 16, PAD_B = 16;
  const innerH = H - PAD_T - PAD_B;
  const innerW = W;
  const data = series.data;
  const dMin = data.length ? Math.min(...data) : 0;
  const dMax = data.length ? Math.max(...data) : 0;
  const dRange = dMax - dMin;
  const minV = Math.max(0, dMin - dRange * 0.3);
  const maxV = dMax + dRange * 0.25;

  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
  const points = data.map((v, i) => ({
    x: stepX * i,
    y: PAD_T + innerH - ((v - minV) / (maxV - minV || 1)) * innerH,
    v, i,
  }));

  const linePath = points.length
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
    : '';
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${PAD_T + innerH} L ${points[0].x} ${PAD_T + innerH} Z`
    : '';

  const handleMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!points.length) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const xViewbox = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = points[0];
    let bestDx = Math.abs(points[0].x - xViewbox);
    for (const p of points) {
      const dx = Math.abs(p.x - xViewbox);
      if (dx < bestDx) { bestDx = dx; nearest = p; }
    }
    setHover(nearest);
  }, [points]);

  const tabs: Array<{ key: ChartTab; label: string }> = [
    { key: 'applications', label: 'Applications' },
    { key: 'learning', label: 'Learning Time' },
    { key: 'sessions', label: 'Sessions' },
  ];
  const ranges: Array<{ key: TimeRange; label: string }> = [
    { key: '7d', label: 'Last 7 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: '3m', label: 'Last 3 Months' },
  ];

  // Tooltip / hover-point positioning in card-pixel-space
  const hoverPxRef = useRef<{ left: number; top: number } | null>(null);
  useEffect(() => {
    if (!hover || !svgRef.current || !cardRef.current) {
      hoverPxRef.current = null;
      return;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    const cardRect = cardRef.current.getBoundingClientRect();
    const left = (svgRect.left - cardRect.left) + (hover.x / W) * svgRect.width;
    const top = (svgRect.top - cardRect.top) + (hover.y / H) * svgRect.height;
    hoverPxRef.current = { left, top };
  }, [hover]);

  if (isLoading) return <TrendChartSkeleton />;

  if (!hasData) {
    return (
      <section style={{
        background: '#fff',
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, marginBottom: 14 }}>
          Activity Trend
        </div>
        <EmptyState message="No activity to chart yet" />
      </section>
    );
  }

  return (
    <section
      ref={cardRef}
      style={{
        background: '#fff',
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        {/* Tabs */}
        <div role="tablist" style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: T.bgSecondary, borderRadius: 9999, padding: 3,
        }}>
          {tabs.map((t) => {
            const locked = t.key === 'applications' && !isPremium;
            const selected = effectiveTab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={selected}
                aria-disabled={locked}
                disabled={locked}
                onClick={() => !locked && setActiveTab(t.key)}
                style={{
                  fontSize: 13, fontWeight: 500,
                  padding: '6px 14px', borderRadius: 9999,
                  color: locked ? T.textMuted : selected ? T.blue600 : T.textSecondary,
                  background: selected ? '#fff' : 'transparent',
                  boxShadow: selected ? T.shadowCard : 'none',
                  display: 'flex', alignItems: 'center', gap: 6,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  pointerEvents: locked ? 'none' : 'auto',
                  border: 'none',
                  fontFamily: 'inherit',
                  transition: 'all 160ms cubic-bezier(.4,0,.2,1)',
                }}
              >
                {locked && <IconLock />}
                {t.label}
              </button>
            );
          })}
        </div>
        {/* Ranges */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {ranges.map((r) => {
            const active = range === r.key;
            return (
              <button
                key={r.key}
                aria-pressed={active}
                onClick={() => setRange(r.key)}
                style={{
                  fontSize: 13, padding: '4px 10px', borderRadius: 6,
                  color: active ? T.blue600 : T.textSecondary, fontWeight: 500,
                  background: active ? T.bgSecondary : 'transparent',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 120ms',
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary cells */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={summaryCellStyle}>
          <div style={{ fontSize: 12, color: T.textSecondary }}>{series.summaryA.label}</div>
          <div style={summaryValueStyle}>{series.summaryA.value}</div>
        </div>
        <div style={summaryCellStyle}>
          <div style={{ fontSize: 12, color: T.textSecondary }}>{series.summaryB.label}</div>
          <div style={summaryValueStyle}>{series.summaryB.value}</div>
        </div>
      </div>

      {/* SVG chart */}
      {hasData ? (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          width="100%"
          height={180}
          style={{ display: 'block' }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="dh-line-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.blue500} stopOpacity="0.10" />
              <stop offset="100%" stopColor={T.blue500} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((i) => {
            const y = PAD_T + (innerH / 3) * i;
            return (
              <line key={i} x1={0} y1={y} x2={W} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
            );
          })}
          <path d={areaPath} fill="url(#dh-line-fill)" />
          <path d={linePath} fill="none" stroke={T.blue500} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
          {hover && (
            <line x1={hover.x} y1={PAD_T} x2={hover.x} y2={PAD_T + innerH} stroke="rgba(37,99,235,0.25)" strokeWidth={1} strokeDasharray="3 3" />
          )}
        </svg>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 180, color: T.textMuted, fontSize: 13,
          background: T.bgSecondary, borderRadius: 8,
        }}>
          No activity yet
        </div>
      )}

      {/* Hover point (overlay) */}
      {hasData && hover && hoverPxRef.current && (
        <div
          aria-hidden
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            left: hoverPxRef.current.left,
            top: hoverPxRef.current.top,
            width: 10, height: 10,
            borderRadius: '50%',
            background: '#fff',
            border: `2px solid ${T.blue500}`,
            boxShadow: '0 0 0 3px rgba(37,99,235,0.12)',
            transform: 'translate(-50%, -50%)',
            transition: 'opacity 120ms',
            zIndex: 3,
          }}
        />
      )}

      {/* Tooltip */}
      {hasData && hover && hoverPxRef.current && (
        <div
          role="status"
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            left: hoverPxRef.current.left,
            top: hoverPxRef.current.top - 12,
            transform: 'translate(-50%, -100%)',
            background: '#fff',
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(15,23,42,0.10), 0 1px 3px rgba(15,23,42,0.06)',
            padding: '8px 10px',
            fontSize: 12,
            minWidth: 130,
            zIndex: 5,
          }}
        >
          <div style={{ fontSize: 11, color: T.textSecondary, fontWeight: 500, marginBottom: 2 }}>
            {series.dates && series.dates[hover.i]
              ? new Date(series.dates[hover.i]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : formatDate(hover.i, points.length)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.textPrimary, fontWeight: 500 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.blue500, flex: 'none' }} />
            <span style={{ fontVariantNumeric: 'tabular-nums', color: T.blue600, fontWeight: 600 }}>
              {formatValue(effectiveTab, hover.v)}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.textSecondary, marginTop: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.blue500 }} />
        <span>{series.legend}</span>
      </div>
    </section>
  );
}

const summaryCellStyle: CSSProperties = {
  background: T.bgSecondary,
  borderRadius: 8,
  padding: '10px 14px',
  minWidth: 130,
};
const summaryValueStyle: CSSProperties = {
  fontSize: 20, fontWeight: 600,
  color: '#121621',
  marginTop: 2,
  fontVariantNumeric: 'tabular-nums',
};

// ─── Panel scaffold ──────────────────────────────────────────────────────────
function Panel({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return (
    <section style={{
      background: '#fff', border: `1px solid ${T.border}`,
      borderRadius: 12, padding: 16, ...style,
    }}>
      {children}
    </section>
  );
}

function PanelHead({ title, linkLabel, onLink }: { title: string; linkLabel?: string; onLink?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}>{title}</div>
      {linkLabel && (
        <button
          onClick={onLink}
          style={{
            fontSize: 12, color: T.blue500, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 3,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'color 160ms',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = T.blue600)}
          onMouseLeave={(e) => (e.currentTarget.style.color = T.blue500)}
        >
          {linkLabel} <IconArrow />
        </button>
      )}
    </div>
  );
}

// ─── Mentorship card ─────────────────────────────────────────────────────────
type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';

type Booking = {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorRealName?: string; // mentor's real name; always present, used as a fallback
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
  canCancel?: boolean;
  canReschedule?: boolean;
  rescheduleUsed?: boolean;
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

function MentorshipCardSkeleton() {
  return (
    <Panel>
      <PanelHead title="Mentorship" />
      <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <Skeleton width={110} height={18} radius={9999} />
          <Skeleton width={120} height={12} />
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
          <Skeleton width={36} height={36} radius={9999} />
          <div style={{ flex: 1 }}>
            <Skeleton width="60%" height={13} style={{ marginBottom: 6 }} />
            <Skeleton width="40%" height={11} />
          </div>
        </div>
        <Skeleton width="100%" height={50} radius={8} />
        <div style={{ marginTop: 10 }}>
          <Skeleton width="100%" height={36} radius={8} />
        </div>
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
            <Skeleton width={30} height={30} radius={9999} />
            <div style={{ flex: 1 }}>
              <Skeleton width="55%" height={12} style={{ marginBottom: 4 }} />
              <Skeleton width="35%" height={10} />
            </div>
            <Skeleton width={60} height={16} radius={4} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function MentorshipCard() {
  const navigate = useNavigate();
  // Mentorship is open to all members (Free and Premium alike).
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  // Which booking action modal is open, if any.
  const [modal, setModal] = useState<{ type: 'cancel' | 'reschedule'; booking: Booking } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await listMyBookings({ page: 0, size: 20 });
      const content = (res as { data?: { data?: { content?: Booking[] } } })?.data?.data?.content ?? [];
      // mentorName may be blank; mentorRealName is guaranteed non-null — fall back to it.
      const normalized = (Array.isArray(content) ? content : []).map(b => ({
        ...b,
        mentorName: b.mentorName || b.mentorRealName || 'Mentor',
      }));
      setBookings(normalized);
    } catch {
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      await load();
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [load]);

  if (loading) return <MentorshipCardSkeleton />;

  // Upcoming = CONFIRMED, soonest first
  const upcoming = bookings
    .filter((b) => b.status === 'CONFIRMED')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const nextSession = upcoming[0];

  // Past = COMPLETED, most recent first
  const past = bookings
    .filter((b) => b.status === 'COMPLETED')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, 3);

  return (
    <Panel style={{ position: 'relative' }}>
      <PanelHead title="Mentorship" linkLabel="Browse mentors" onLink={() => navigate('/marketplace')} />

      <div>
        {/* Upcoming session */}
        {nextSession ? (
          <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                background: T.roleBg, color: T.blue600,
                fontSize: 11, fontWeight: 500,
                padding: '2px 8px', borderRadius: 9999,
              }}>
                Upcoming session
              </span>
              <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 500 }}>
                {formatBookingDateTime(nextSession.startTime)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <MentorAvatar initials={getInitials(nextSession.mentorName)} avatarUrl={nextSession.mentorAvatarUrl} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{nextSession.mentorName}</div>
                <div style={{ fontSize: 12, color: T.textSecondary }}>
                  {nextSession.durationMinutes} min session
                </div>
              </div>
            </div>
            {nextSession.topicTitle && (
              <div style={{ background: T.bgSecondary, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 2 }}>Session topic</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.textPrimary }}>{nextSession.topicTitle}</div>
              </div>
            )}
            {nextSession.mentorNote && (
              <div style={{ background: T.bgSecondary, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 2 }}>Mentor's note — how to prepare</div>
                <div style={{ fontSize: 12, color: T.textPrimary, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{nextSession.mentorNote}</div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.textSecondary, marginBottom: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.blue500 }} />
              {timeUntil(nextSession.startTime)}
            </div>
            <button
              onClick={() => {
                if (nextSession.meetingLink) window.open(nextSession.meetingLink, '_blank', 'noopener,noreferrer');
              }}
              disabled={!nextSession.meetingLink}
              style={{
                display: 'block', width: '100%',
                background: nextSession.meetingLink ? T.blue500 : T.bgSecondary,
                color: nextSession.meetingLink ? '#fff' : T.textMuted,
                borderRadius: 8, padding: '9px 12px',
                fontSize: 13, fontWeight: 500,
                textAlign: 'center', border: 'none',
                cursor: nextSession.meetingLink ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                transition: 'background 120ms',
              }}
              onMouseEnter={(e) => { if (nextSession.meetingLink) e.currentTarget.style.background = T.blue600; }}
              onMouseLeave={(e) => { if (nextSession.meetingLink) e.currentTarget.style.background = T.blue500; }}
            >
              {nextSession.meetingLink ? 'Join Session' : 'Awaiting meeting link'}
            </button>

            {/* Manage booking — reschedule / cancel */}
            {(nextSession.canReschedule !== false || nextSession.canCancel !== false) && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {nextSession.canReschedule !== false && (
                  <button
                    onClick={() => setModal({ type: 'reschedule', booking: nextSession })}
                    title={nextSession.rescheduleUsed ? 'You have already rescheduled this session once' : undefined}
                    disabled={nextSession.rescheduleUsed === true}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8,
                      border: `1px solid ${T.border}`, background: '#fff',
                      color: nextSession.rescheduleUsed ? T.textMuted : T.textPrimary,
                      fontSize: 13, fontWeight: 500,
                      cursor: nextSession.rescheduleUsed ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', transition: 'background 120ms',
                    }}
                    onMouseEnter={(e) => { if (!nextSession.rescheduleUsed) e.currentTarget.style.background = T.bgSecondary; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                  >
                    Reschedule
                  </button>
                )}
                {nextSession.canCancel !== false && (
                  <button
                    onClick={() => setModal({ type: 'cancel', booking: nextSession })}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 8,
                      border: '1px solid #fecaca', background: '#fff', color: '#dc2626',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'inherit', transition: 'background 120ms',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{
            border: `1px dashed ${T.border}`, borderRadius: 10, padding: 16,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 8 }}>
              No upcoming sessions
            </div>
            <button
              onClick={() => navigate('/marketplace')}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 0,
                background: T.blue500, color: '#fff',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Book a mentor
            </button>
          </div>
        )}

        {/* Past sessions */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: T.textSecondary }}>Past sessions</div>
            {past.length > 0 && (
              <button
                onClick={() => navigate('/history')}
                style={{
                  fontSize: 11, color: T.textMuted,
                  display: 'flex', alignItems: 'center', gap: 2,
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {past.length}
                <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="3,3 6,5 3,7"/></svg>
              </button>
            )}
          </div>
          {past.length === 0 ? (
            <div style={{ fontSize: 12, color: T.textMuted, padding: '8px 0' }}>
              Completed sessions will appear here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {past.map((b) => (
                <PastItem key={b.id} booking={b} />
              ))}
            </div>
          )}
        </div>
      </div>

      {modal?.type === 'cancel' && (
        <CancelBookingModal
          booking={modal.booking}
          onClose={() => setModal(null)}
          onDone={async () => { setModal(null); await load(); }}
        />
      )}
      {modal?.type === 'reschedule' && (
        <RescheduleBookingModal
          booking={modal.booking}
          onClose={() => setModal(null)}
          onDone={async () => { setModal(null); await load(); }}
        />
      )}
    </Panel>
  );
}

// ─── Booking action modals (cancel / reschedule) ─────────────────────────────

function errMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        background: '#fff', border: `1px solid ${T.border}`, borderRadius: 16,
        width: '100%', maxWidth: 440, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${T.border}`,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, padding: 4, lineHeight: 0 }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

function CancelBookingModal({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ refunded: boolean; refundAmountCents: number } | null>(null);

  // Refund policy: full refund only if cancelled > 48h before the session start.
  const hoursUntil = (new Date(booking.startTime).getTime() - Date.now()) / 3_600_000;
  const refundEligible = hoursUntil > 48;

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await cancelBooking(booking.id) as { data?: { data?: { refunded?: boolean; refundAmountCents?: number } } };
      const data = res?.data?.data ?? {};
      setResult({ refunded: !!data.refunded, refundAmountCents: data.refundAmountCents ?? 0 });
    } catch (err) {
      setError(errMessage(err) || 'Could not cancel this session. Please try again.');
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <ModalShell title="Session cancelled" onClose={onDone}>
        <p style={{ fontSize: 13, color: T.textPrimary, lineHeight: 1.6, margin: '0 0 16px' }}>
          Your session with {booking.mentorName} has been cancelled.
          {result.refunded && result.refundAmountCents > 0
            ? ` A refund of $${(result.refundAmountCents / 100).toFixed(2)} has been issued.`
            : ' No refund was issued for this cancellation.'}
        </p>
        <button
          onClick={onDone}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
            background: T.blue500, color: '#fff', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Done
        </button>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Cancel session" onClose={onClose}>
      <p style={{ fontSize: 13, color: T.textPrimary, lineHeight: 1.6, margin: '0 0 14px' }}>
        Cancel your {booking.durationMinutes} min session with <strong>{booking.mentorName}</strong> on {formatBookingDateTime(booking.startTime)}?
      </p>

      {/* Refund policy notice */}
      <div style={{
        display: 'flex', gap: 10, padding: 12, borderRadius: 10, marginBottom: 16,
        background: refundEligible ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${refundEligible ? '#bbf7d0' : '#fecaca'}`,
      }}>
        <span style={{ fontSize: 15, lineHeight: 1.2 }}>{refundEligible ? '✓' : '⚠'}</span>
        <div style={{ fontSize: 12, lineHeight: 1.55, color: refundEligible ? '#166534' : '#b91c1c' }}>
          {refundEligible ? (
            <>This session is more than <strong>48 hours</strong> away, so you'll receive a <strong>full refund</strong>.</>
          ) : (
            <><strong>No refund:</strong> cancellations within <strong>48 hours</strong> of the session start time are non-refundable.</>
          )}
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 12 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onClose}
          disabled={submitting}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
            background: '#fff', color: T.textPrimary, fontSize: 13, fontWeight: 500,
            cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}
        >
          Keep session
        </button>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 8, border: 'none',
            background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 500,
            cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: 'inherit',
          }}
        >
          {submitting ? 'Cancelling…' : 'Confirm cancellation'}
        </button>
      </div>
    </ModalShell>
  );
}

type Slot = { startTime: string; endTime: string };

function RescheduleBookingModal({ booking, onClose, onDone }: { booking: Booking; onClose: () => void; onDone: () => void }) {
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // The booking carries mentorId + durationMinutes but not topicId, which the
  // slots endpoint needs — resolve it from the mentor's topic list.
  useEffect(() => {
    let alive = true;
    setLoadingSlots(true);
    (async () => {
      try {
        const mres = await getMentor(booking.mentorId) as { data?: { data?: { topics?: Array<{ id: string; title: string; active: boolean }> } } };
        const topics = mres?.data?.data?.topics ?? [];
        const topic =
          topics.find(t => t.title === booking.topicTitle) ??
          topics.find(t => t.active) ??
          topics[0];
        if (!topic) { if (alive) { setSlots([]); setLoadingSlots(false); } return; }
        const sres = await getMentorSlots(booking.mentorId, topic.id, booking.durationMinutes) as { data?: { data?: Slot[] } };
        const data = sres?.data?.data ?? [];
        const list: Slot[] = Array.isArray(data) ? data : [];
        // Don't offer the current slot back as a "new" time.
        if (alive) setSlots(list.filter(s => s.startTime !== booking.startTime));
      } catch {
        if (alive) setSlots([]);
      } finally {
        if (alive) setLoadingSlots(false);
      }
    })();
    return () => { alive = false; };
  }, [booking.mentorId, booking.durationMinutes, booking.topicTitle, booking.startTime]);

  // Group slots by calendar day for display.
  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    [...slots]
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .forEach(s => {
        const key = formatBookingShortDate(s.startTime);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
      });
    return Array.from(map.entries());
  }, [slots]);

  async function handleConfirm() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      await rescheduleBooking(booking.id, selected);
      setConfirmed(true);
    } catch (err) {
      setError(errMessage(err) || 'Could not reschedule to that time. Please pick another slot.');
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <ModalShell title="Session rescheduled" onClose={onDone}>
        <p style={{ fontSize: 13, color: T.textPrimary, lineHeight: 1.6, margin: '0 0 16px' }}>
          Your session with {booking.mentorName} is now set for <strong>{formatBookingDateTime(selected!)}</strong>.
        </p>
        <button
          onClick={onDone}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
            background: T.blue500, color: '#fff', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Done
        </button>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Reschedule session" onClose={onClose}>
      <p style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.6, margin: '0 0 6px' }}>
        Currently {formatBookingDateTime(booking.startTime)} with {booking.mentorName}.
      </p>
      <div style={{ fontSize: 11.5, color: T.textMuted, marginBottom: 14 }}>
        You can reschedule a session once. Pick a new available time below.
      </div>

      {loadingSlots ? (
        <div style={{ fontSize: 13, color: T.textSecondary, padding: '20px 0', textAlign: 'center' }}>
          Loading available times…
        </div>
      ) : days.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textSecondary, padding: '20px 0', textAlign: 'center' }}>
          No available times right now. Please try again later.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 320, overflowY: 'auto', marginBottom: 16 }}>
          {days.map(([dayLabel, daySlots]) => (
            <div key={dayLabel}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 8 }}>{dayLabel}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {daySlots.map(s => {
                  const active = selected === s.startTime;
                  const label = new Date(s.startTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                  return (
                    <button
                      key={s.startTime}
                      onClick={() => setSelected(s.startTime)}
                      style={{
                        padding: '8px 4px', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                        border: `1px solid ${active ? T.blue500 : T.border}`,
                        background: active ? T.blue500 : '#fff',
                        color: active ? '#fff' : T.textPrimary,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
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

      {error && (
        <div style={{ fontSize: 12, color: '#b91c1c', marginBottom: 12 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onClose}
          disabled={submitting}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${T.border}`,
            background: '#fff', color: T.textPrimary, fontSize: 13, fontWeight: 500,
            cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!selected || submitting}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 8, border: 'none',
            background: T.blue500, color: '#fff', fontSize: 13, fontWeight: 500,
            cursor: (!selected || submitting) ? 'not-allowed' : 'pointer',
            opacity: (!selected || submitting) ? 0.6 : 1, fontFamily: 'inherit',
          }}
        >
          {submitting ? 'Rescheduling…' : 'Confirm new time'}
        </button>
      </div>
    </ModalShell>
  );
}

function MentorAvatar({ initials, size = 36, avatarUrl }: { initials: string; size?: number; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={initials}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flex: 'none',
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      display: 'grid', placeItems: 'center',
      fontSize: size <= 30 ? 11 : 12, fontWeight: 600,
      color: T.blue700, background: T.roleBg, flex: 'none',
    }}>
      {initials}
    </div>
  );
}

function PastItem({ booking }: { booking: Booking }) {
  const [hover, setHover] = useState(false);
  const reviewed = booking.hasReview;
  const rating = Math.round(booking.mentorAvgRating ?? 0);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 8, borderRadius: 8,
        background: hover ? T.bgSecondary : 'transparent',
        cursor: 'pointer',
        transition: 'background 160ms',
      }}
    >
      <MentorAvatar initials={getInitials(booking.mentorName)} size={30} avatarUrl={booking.mentorAvatarUrl} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: T.textPrimary }}>{booking.mentorName}</div>
        <div style={{ fontSize: 11, color: T.textSecondary }}>
          {booking.topicTitle ? `${booking.topicTitle} · ` : ''}{formatBookingShortDate(booking.startTime)}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        {reviewed ? (
          <>
            <span style={statusTagStyle(T.successText, T.successBg)}>Reviewed</span>
            {rating > 0 && (
              <div style={{ display: 'flex', gap: 1 }}>
                {[1, 2, 3, 4, 5].map((n) => <IconStar key={n} filled={n <= rating} />)}
              </div>
            )}
          </>
        ) : (
          <span style={statusTagStyle(T.warningText, T.warningBg)}>Review pending</span>
        )}
      </div>
    </div>
  );
}

function statusTagStyle(color: string, bg: string): CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center',
    fontSize: 11, fontWeight: 500,
    padding: '2px 8px', borderRadius: 4,
    color, background: bg,
  };
}

// ─── Interview Practice Insights (radar) ─────────────────────────────────────
type Dim = { label: string; value: number };

function qualitative(v: number): string {
  if (v >= 80) return 'Strong';
  if (v >= 70) return 'Developing';
  if (v >= 60) return 'Inconsistent';
  return 'Needs work';
}

function Radar({ dims }: { dims: Dim[] }) {
  const cx = 180, cy = 130, R = 70;
  const N = dims.length;
  const start = -Math.PI / 2;

  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const pt = (i: number, r: number): [number, number] => {
    const a = start + (Math.PI * 2 * i) / N;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };

  const ringPaths = useMemo(() => {
    const out: string[] = [];
    for (let ring = 1; ring <= 4; ring++) {
      const r = (R * ring) / 4;
      const corners: Array<[number, number]> = [];
      for (let i = 0; i < N; i++) corners.push(pt(i, r));
      out.push(corners.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ') + ' Z');
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N]);

  const polyPts: Array<[number, number]> = dims.map((d, i) => {
    const r = (R * d.value) / 100;
    return pt(i, r);
  });
  const polyD = polyPts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ') + ' Z';

  // Tooltip pos in wrap-relative pixels
  const tipPx = useMemo(() => {
    if (hover === null || !svgRef.current || !wrapRef.current) return null;
    const svgRect = svgRef.current.getBoundingClientRect();
    const wrapRect = wrapRef.current.getBoundingClientRect();
    const sx = svgRect.width / 360;
    const sy = svgRect.height / 260;
    const x = (svgRect.left - wrapRect.left) + polyPts[hover][0] * sx;
    const y = (svgRect.top - wrapRect.top) + polyPts[hover][1] * sy;
    return { left: x, top: y };
  }, [hover, polyPts]);

  return (
    <div ref={wrapRef} style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 14px', position: 'relative' }}>
      <svg ref={svgRef} viewBox="0 0 360 260" style={{ width: '100%', maxWidth: 360, height: 'auto', overflow: 'visible' }}>
        {/* rings */}
        {ringPaths.map((d, i) => (
          <path key={`r${i}`} d={d} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={0.75} />
        ))}
        {/* spokes */}
        {dims.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={`s${i}`} x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="rgba(0,0,0,0.06)" strokeWidth={0.75} />;
        })}
        {/* polygon */}
        <path d={polyD} fill="rgba(37,99,235,0.12)" stroke="rgba(37,99,235,0.75)" strokeWidth={1.25} strokeLinejoin="round" />
        {/* data points */}
        {polyPts.map((p, i) => (
          <circle key={`p${i}`} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r={hover === i ? 4 : 2.5} fill={T.blue500} stroke="#fff" strokeWidth={1} />
        ))}
        {/* labels */}
        {dims.map((d, i) => {
          const LABEL_R = R + 22;
          const a = start + (Math.PI * 2 * i) / N;
          const ax = Math.cos(a), ay = Math.sin(a);
          const lx = cx + ax * LABEL_R;
          const ly = cy + ay * LABEL_R;
          const isSide = Math.abs(ax) > 0.1;
          const anchor = isSide ? (ax < 0 ? 'end' : 'start') : 'middle';
          let lines = d.label.split('|');
          if (lines.length === 1 && isSide) {
            const words = d.label.split(' ');
            if (words.length >= 2) {
              const mid = Math.ceil(words.length / 2);
              lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
            }
          }
          const lineH = 12;
          const baseY = ly - ((lines.length - 1) * lineH) / 2 + 4;
          return (
            <text key={`l${i}`} x={lx.toFixed(1)} y={baseY.toFixed(1)} fontFamily="Inter" fontSize={10.5} fill={T.textSecondary} textAnchor={anchor}>
              {lines.map((ln, k) => (
                <tspan key={k} x={lx.toFixed(1)} dy={k === 0 ? 0 : lineH}>{ln}</tspan>
              ))}
            </text>
          );
        })}
        {/* hit targets */}
        {polyPts.map((p, i) => (
          <circle
            key={`h${i}`} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r={14} fill="transparent"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            style={{ cursor: 'default' }}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hover !== null && tipPx && (
        <div
          role="tooltip"
          style={{
            position: 'absolute', pointerEvents: 'none',
            background: '#fff', border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '8px 10px',
            boxShadow: '0 4px 12px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.06)',
            minWidth: 132,
            left: tipPx.left, top: tipPx.top,
            transform: 'translate(-50%, calc(-100% - 10px))',
            zIndex: 5,
          }}
        >
          <div style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.3, marginBottom: 2 }}>{dims[hover].label}</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            {dims[hover].value}<small style={{ fontWeight: 500, color: T.textMuted, fontSize: 12, marginLeft: 2 }}>/100</small>
          </div>
          <div style={{ marginTop: 4, fontSize: 10.5, fontWeight: 500, color: T.blue600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {qualitative(dims[hover].value)}
          </div>
        </div>
      )}
    </div>
  );
}

function InsightsCardSkeleton() {
  return (
    <Panel>
      <PanelHead title="Interview Practice Insights" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={62} radius={8} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 14px' }}>
        <Skeleton width={220} height={200} radius={9999} />
      </div>
      <Skeleton width="100%" height={70} radius={10} />
    </Panel>
  );
}

function InsightsCard({
  isLoading,
  insights,
}: {
  isLoading: boolean;
  insights?: InterviewInsights | null;
}) {
  const navigate = useNavigate();
  if (isLoading) return <InsightsCardSkeleton />;

  const hasInsights = insights != null;
  const dims: Dim[] = hasInsights && Array.isArray(insights!.categoryScores)
    ? insights!.categoryScores.map((c) => ({
        label: c.category,
        value: Math.round(Number(c.averageScore) || 0),
      }))
    : [];

  // No insights from the API → render the empty state, never mock data.
  const hasData = dims.length > 0;

  if (!hasData) {
    return (
      <Panel>
        <PanelHead title="Interview Practice Insights" linkLabel="View all" onLink={() => navigate('/history')} />
        <EmptyState
          message="No interview practice data yet"
          ctaLabel="Start practicing"
          onCta={() => navigate('/personalized-practice')}
        />
      </Panel>
    );
  }

  const avg = hasInsights
    ? Math.round(Number(insights!.averageScore) || 0)
    : Math.round(dims.reduce((s, d) => s + d.value, 0) / dims.length);
  const best = hasInsights
    ? Math.round(Number(insights!.bestScore) || 0)
    : Math.max(...dims.map((d) => d.value));
  const low = hasInsights
    ? Math.round(Number(insights!.lowestScore) || 0)
    : Math.min(...dims.map((d) => d.value));
  const lowest = [...dims].sort((a, b) => a.value - b.value)[0];

  return (
    <Panel>
      <PanelHead title="Interview Practice Insights" linkLabel="View all" onLink={() => navigate('/history')} />

      {/* Avg/Best/Low summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <SummaryCell value={avg} label="Avg" color={T.blue500} />
        <SummaryCell value={best} label="Best" color={T.green500} />
        <SummaryCell value={low} label="Low" color={T.textSecondary} />
      </div>

      <Radar dims={dims} />

      {/* Focus area */}
      <div style={{
        background: T.bgSecondary, borderRadius: 10,
        padding: '12px 14px', marginTop: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: T.textSecondary, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Recommended focus area
          </div>
          <button
            onClick={() => navigate('/personalized-practice')}
            style={{
              fontSize: 12, color: T.blue500, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 3,
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'color 160ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.blue600; e.currentTarget.style.textDecoration = 'underline'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.blue500; e.currentTarget.style.textDecoration = 'none'; }}
          >
            Practice {lowest.label} →
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>{lowest.label}</div>
          <div style={{ fontSize: 12, color: T.textSecondary, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
            {lowest.value}/100
          </div>
        </div>
        <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 6, lineHeight: 1.5 }}>
          Most variable across your last 8 mocks — lowest recent dimension.
        </div>
      </div>
    </Panel>
  );
}

function EmptyState({ message, ctaLabel, onCta }: { message: string; ctaLabel?: string; onCta?: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: '32px 16px', textAlign: 'center',
      border: `1px dashed ${T.border}`, borderRadius: 10,
      color: T.textMuted, fontSize: 13,
    }}>
      <div>{message}</div>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          style={{
            padding: '7px 14px', borderRadius: 8, border: 0,
            background: T.blue500, color: '#fff',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

function SummaryCell({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div style={{
      background: T.bgSecondary, borderRadius: 8,
      padding: 12, textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, fontWeight: 600, color, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: T.textSecondary, marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── Community Picks ─────────────────────────────────────────────────────────
type CommunityPost = {
  id: string;
  role: string;
  company: string;
  title: string;
  date: string;
  saveCount?: number;
  commentCount?: number;
};

function formatMonthLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function CommunityCardSkeleton() {
  return (
    <Panel>
      <PanelHead title="InterviewPrep Note" />
      <Skeleton width="100%" height={36} radius={8} style={{ marginBottom: 12 }} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <Skeleton width={80} height={16} radius={4} />
            <Skeleton width={60} height={16} radius={4} />
          </div>
          <Skeleton width="90%" height={14} style={{ marginBottom: 6 }} />
          <Skeleton width="60%" height={14} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Skeleton width={40} height={12} />
            <Skeleton width={40} height={12} />
          </div>
        </div>
      ))}
    </Panel>
  );
}

function CommunityCard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [targetRole, setTargetRole] = useState<string>('');
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        let role = '';
        let companies: string[] = [];
        try {
          const res = await getProfilePreferences();
          const data = res?.data?.data ?? res?.data;
          role = Array.isArray(data?.target_roles) ? (data.target_roles[0] ?? '') : '';
          companies = Array.isArray(data?.target_companies) ? data.target_companies : [];
        } catch {
          // No preferences yet — fall through with empty role/companies
        }
        if (alive) {
          setTargetRole(role);
          setTargetCompanies(companies);
        }

        const baseParams: Record<string, unknown> = { page: 0, size: 3 };
        if (role) baseParams.role = role;
        if (companies[0]) baseParams.company = companies[0];

        try {
          const res = await getPosts(baseParams);
          const data = res?.data?.data ?? res?.data;
          const content: Array<Record<string, unknown>> = Array.isArray(data) ? data : (data?.content ?? []);
          const mapped: CommunityPost[] = content.slice(0, 3).map((p) => ({
            id: String(p.id ?? ''),
            role: String(p.role ?? ''),
            company: String(p.company ?? ''),
            title: String(p.summary ?? p.title ?? ''),
            date: String(p.createdAt ?? p.date ?? ''),
            saveCount: typeof p.saveCount === 'number' ? p.saveCount : undefined,
            commentCount: typeof p.commentCount === 'number' ? p.commentCount : undefined,
          }));
          if (alive) setPosts(mapped);
        } catch {
          if (alive) setPosts([]);
        }
      } finally {
        // Always clear loading — setting state on an unmounted component is a
        // no-op in React 18, so we don't need to gate this on `alive`.
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  if (loading) return <CommunityCardSkeleton />;

  const matchLabel = targetCompanies.length > 0 ? targetCompanies.slice(0, 3).join(', ') : '';
  const hasMatch = !!targetRole || !!matchLabel;

  return (
    <Panel>
      <PanelHead title="InterviewPrep Note" linkLabel="Browse All" onLink={() => navigate('/interview-insights')} />

      {/* Matched */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: T.bgSecondary, borderRadius: 8,
        padding: '8px 12px', marginBottom: 12, fontSize: 12,
      }}>
        <div>
          {hasMatch ? (
            <>
              <span style={{ color: T.textSecondary }}>Matched to </span>
              {targetRole && (
                <span style={{ color: T.textPrimary, fontWeight: 500 }}>{targetRole}</span>
              )}
              {matchLabel && (
                <span style={{ color: T.textSecondary }}>{targetRole ? ' · ' : ''}{matchLabel}</span>
              )}
            </>
          ) : (
            <span style={{ color: T.textSecondary }}>Set your target role to see matches</span>
          )}
        </div>
        <button
          onClick={() => navigate('/profile')}
          style={{
            fontSize: 12, color: T.blue500, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 2,
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'color 160ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = T.blue600; e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.blue500; e.currentTarget.style.textDecoration = 'none'; }}
        >
          Edit ↗
        </button>
      </div>

      {posts.length === 0 ? (
        <div style={{
          padding: '24px 8px', textAlign: 'center',
          fontSize: 12, color: T.textMuted,
        }}>
          No matching posts yet.
        </div>
      ) : (
        posts.map((post, idx) => (
          <PostItem key={post.id || idx} post={post} first={idx === 0} onClick={() => navigate(`/experience/${post.id}`)} />
        ))
      )}
    </Panel>
  );
}

function PostItem({ post, first, onClick }: { post: CommunityPost; first: boolean; onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        padding: first ? '4px 8px 12px' : '12px 8px',
        borderTop: first ? 'none' : `1px solid ${T.border}`,
        margin: '0 -8px',
        borderRadius: 8,
        background: hover ? T.bgSecondary : 'transparent',
        cursor: 'pointer',
        transition: 'background-color 200ms cubic-bezier(.4,0,.2,1)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {post.role && <span style={tagStyle(T.blue600, T.roleBg)}>{post.role}</span>}
        {post.company && <span style={tagStyle(T.textSecondary, T.bgSecondary)}>{post.company}</span>}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: T.textMuted }}>{formatMonthLabel(post.date)}</span>
      </div>
      <div style={{
        fontSize: 13, fontWeight: 500,
        color: hover ? T.blue600 : T.textPrimary,
        lineHeight: 1.4, marginBottom: 8,
        transition: 'color 160ms',
      }}>
        {post.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: T.textSecondary }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {typeof post.saveCount === 'number' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconEye />{post.saveCount.toLocaleString()}
            </span>
          )}
          {typeof post.commentCount === 'number' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IconMsg />{post.commentCount}
            </span>
          )}
        </div>
        <span style={{ color: T.blue500, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 2, textDecoration: hover ? 'underline' : 'none' }}>
          View post ↗
        </span>
      </div>
    </div>
  );
}

function tagStyle(color: string, bg: string): CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center',
    fontSize: 11, fontWeight: 500,
    padding: '2px 8px', borderRadius: 4,
    color, background: bg,
  };
}

// ─── Dashboard Home (main export) ────────────────────────────────────────────
export function DashboardHome({
  userData,
  plan: planProp,
}: {
  userData: UserData | null;
  plan?: Plan;
}) {
  const userPlan = useUserPlan();
  const plan: Plan = planProp ?? planFromUserPlan(userPlan.planData.currentPlan);

  const [loading, setLoading] = useState(true);
  const [apiStats, setApiStats] = useState<DashboardStatsApi | null>(null);

  useEffect(() => {
    setLoading(true);
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
        setApiStats(payload);
      })
      .catch(() => setApiStats(null))
      .finally(() => setLoading(false));
  }, []);

  const effectiveStats: DashboardStats = apiStats
    ? {
        ...EMPTY_STATS,
        totalLearningTime: formatMinutesAsHm(apiStats.totalLearningTimeMinutes ?? 0),
        sessionsCompleted: apiStats.sessionCompletedCount ?? 0,
      }
    : EMPTY_STATS;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = userData?.firstName ? `, ${userData.firstName}` : '';

  return (
    <div>
      {/* Skeleton keyframes (scoped via global insertion since inline style cannot define @keyframes) */}
      <style>{`
        @keyframes dh-skeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (max-width: 1280px) {
          [data-dashboard-grid] { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 700, fontSize: 28, lineHeight: 1.2,
          color: T.textPrimary, margin: 0,
        }}>
          {greeting}{name}
        </h1>
      </div>

      <StatsRow plan={plan} stats={effectiveStats} isLoading={loading} />

      <TrendChart
        key={plan}
        plan={plan}
        isLoading={loading}
        learningDaily={apiStats?.dailyLearningTimeMinutes}
        sessionsDaily={apiStats?.dailySessionCount}
      />

      <div
        data-dashboard-grid
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <MentorshipCard />
        <InsightsCard isLoading={loading} insights={apiStats?.interviewPracticeInsights ?? null} />
        <CommunityCard />
      </div>
    </div>
  );
}

// ─── Page wrapper ────────────────────────────────────────────────────────────
export function DashboardHomePage() {
  const { user, isLoading } = useAuth();

  // dashboard_viewed —— 进入 member dashboard，离开时记录 duration_seconds（admin 不计）
  useDwellTracking(EVENTS.DASHBOARD_VIEWED, undefined, {
    enabled: !!user && user.role !== 'ADMIN',
  });

  // Admins don't use the candidate dashboard — send them to the admin console.
  if (!isLoading && user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

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
