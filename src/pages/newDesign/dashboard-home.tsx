import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan, type PlanType } from '@/hooks/useUserPlan';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { T } from '@/lib/design-tokens';

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
  pendingReview?: number | string;
};

type UserData = {
  firstName?: string;
  lastName?: string;
  role?: string;
};

const DEFAULT_STATS: DashboardStats = {
  totalLearningTime: '14h 20m',
  sessionsCompleted: 23,
  applicationsThisPeriod: 47,
  applicationsDelta: '+18%',
  avgDailyApplications: 3.2,
  pendingReview: 12,
};

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
function IconInbox() {
  return <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12v8H2z"/><path d="M2 4l6 5 6-5"/></svg>;
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
function StatsRow({ plan, stats }: { plan: Plan; stats: DashboardStats }) {
  const isPremium = plan === 'premium';
  const colCount = isPremium ? 5 : 2;
  const learningSub = isPremium ? 'Mock Interview + Mentorship Sessions' : 'Mock Interview';
  const sessionsSub = isPremium ? 'Mock Interview + Mentorship Sessions' : 'Mock Interview';

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
      <StatCard label="Total Learning Time" value={stats.totalLearningTime ?? '—'} sub={learningSub} icon={<IconClock />} />
      <StatCard label="Sessions Completed" value={stats.sessionsCompleted ?? '—'} sub={sessionsSub} icon={<IconCheck />} />
      {isPremium && (
        <>
          <div style={{ position: 'relative' }}>
            <StatCard
              label="Applications This Period"
              value={stats.applicationsThisPeriod ?? '—'}
              sub={`↗ ${stats.applicationsDelta ?? '+0%'} vs prior period`}
              icon={<IconSend />}
            />
          </div>
          <StatCard
            label="Avg. Daily Applications"
            value={stats.avgDailyApplications ?? '—'}
            sub="Rolling 30-day avg"
            icon={<IconTrend />}
            variant="soft"
          />
          <StatCard
            label="Pending Review"
            value={stats.pendingReview ?? '—'}
            sub="Ready for your approval"
            icon={<IconInbox />}
            variant="warning"
          />
        </>
      )}
    </div>
  );
}

// ─── Trend chart series ──────────────────────────────────────────────────────
type Series = {
  data: number[];
  summaryA: { label: string; value: string };
  summaryB: { label: string; value: string };
  legend: string;
};
const SERIES: Record<ChartTab, Series> = {
  applications: {
    data: [3,4,3,3,4,3,4,3,3,4,3,4,3,3,4,3,3,4,3,4,3,3,4,3,4,7,5,4,3,4],
    summaryA: { label: 'Total Applications', value: '107' },
    summaryB: { label: 'Daily Average', value: '3.6' },
    legend: 'Applications submitted',
  },
  learning: {
    data: [42,45,40,48,44,46,43,50,42,38,46,44,48,52,46,44,50,46,44,48,42,46,50,84,52,46,44,48,46,44],
    summaryA: { label: 'Total Learning Time', value: '21h 9m' },
    summaryB: { label: 'Avg per Session', value: '42m' },
    legend: 'Learning time per day (min)',
  },
  sessions: {
    data: [1,2,1,2,2,1,2,1,2,2,1,2,2,1,3,2,1,2,2,1,2,2,1,2,3,2,1,2,1,2],
    summaryA: { label: 'Total Sessions', value: '52' },
    summaryB: { label: 'Avg per Day', value: '1.7' },
    legend: 'Sessions per day',
  },
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
function TrendChart({ plan }: { plan: Plan }) {
  const isPremium = plan === 'premium';
  const [activeTab, setActiveTab] = useState<ChartTab>('learning');
  const [range, setRange] = useState<TimeRange>('30d');
  const [hover, setHover] = useState<{ x: number; y: number; i: number; v: number } | null>(null);

  // Free/Starter: applications tab is locked
  const effectiveTab: ChartTab = !isPremium && activeTab === 'applications' ? 'learning' : activeTab;
  const series = SERIES[effectiveTab];

  const svgRef = useRef<SVGSVGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const W = 800, H = 180;
  const PAD_T = 16, PAD_B = 16;
  const innerH = H - PAD_T - PAD_B;
  const innerW = W;
  const data = series.data;
  const dMin = Math.min(...data);
  const dMax = Math.max(...data);
  const dRange = dMax - dMin;
  const minV = Math.max(0, dMin - dRange * 0.3);
  const maxV = dMax + dRange * 0.25;

  const stepX = innerW / (data.length - 1);
  const points = data.map((v, i) => ({
    x: stepX * i,
    y: PAD_T + innerH - ((v - minV) / (maxV - minV || 1)) * innerH,
    v, i,
  }));

  const linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PAD_T + innerH} L ${points[0].x} ${PAD_T + innerH} Z`;

  const handleMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
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

      {/* Hover point (overlay) */}
      {hover && hoverPxRef.current && (
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
      {hover && hoverPxRef.current && (
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
            {formatDate(hover.i, points.length)}
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
type PastSession = { initials: string; name: string; meta: string; status: 'reviewed' | 'pending'; rating?: number };
const PAST_SESSIONS: PastSession[] = [
  { initials: 'RK', name: 'Riya Kapoor', meta: 'Career Strategy · Apr 8', status: 'reviewed', rating: 5 },
  { initials: 'TN', name: 'Tom Nakamura', meta: 'Resume Review · Mar 29', status: 'pending' },
  { initials: 'AL', name: 'Amy Liu', meta: 'Mock Interview · Mar 20', status: 'reviewed', rating: 4 },
];

function MentorshipCard({ plan }: { plan: Plan }) {
  const navigate = useNavigate();
  const isFree = plan === 'free';

  return (
    <Panel style={{ position: 'relative' }}>
      <PanelHead title="Mentorship" linkLabel="Browse mentors" onLink={() => navigate('/marketplace')} />

      {isFree && (
        <div style={{
          position: 'absolute', inset: '56px 16px 16px 16px',
          zIndex: 2,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          textAlign: 'center', padding: '24px 20px',
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(2px)',
          borderRadius: 10,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: T.bgSecondary, color: T.blue600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 4,
          }}>
            <IconLockLarge />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>Mentorship is a member benefit</div>
          <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5, maxWidth: 260, marginBottom: 8 }}>
            Book 1:1 sessions with senior mentors and track every session in one place.
          </div>
          <button
            onClick={() => navigate('/pricing')}
            style={{
              padding: '9px 16px', borderRadius: 8, border: 0,
              background: T.blue500, color: '#fff',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 160ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.blue600)}
            onMouseLeave={(e) => (e.currentTarget.style.background = T.blue500)}
          >
            Upgrade to membership
          </button>
        </div>
      )}

      <div style={{ filter: isFree ? 'blur(6px)' : 'none', pointerEvents: isFree ? 'none' : 'auto', userSelect: isFree ? 'none' : 'auto', opacity: isFree ? 0.55 : 1 }}>
        {/* Upcoming session */}
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
            <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 500 }}>Mon Apr 14, 2:00 PM</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <MentorAvatar initials="SJ" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>Sarah Jenkins</div>
              <div style={{ fontSize: 12, color: T.textSecondary }}>Senior PM · TechCorp</div>
            </div>
          </div>
          <div style={{ background: T.bgSecondary, borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 2 }}>Session goal</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.textPrimary }}>Mock Interview: Product Strategy</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.textSecondary, marginBottom: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.blue500 }} />
            In 14 hours — get prepared
          </div>
          <button
            style={{
              display: 'block', width: '100%',
              background: T.blue500, color: '#fff',
              borderRadius: 8, padding: '9px 12px',
              fontSize: 13, fontWeight: 500,
              textAlign: 'center', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 120ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.blue600)}
            onMouseLeave={(e) => (e.currentTarget.style.background = T.blue500)}
          >
            Join Session
          </button>
        </div>

        {/* Past sessions */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: T.textSecondary }}>Past sessions</div>
            <button
              onClick={() => navigate('/history')}
              style={{
                fontSize: 11, color: T.textMuted,
                display: 'flex', alignItems: 'center', gap: 2,
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {PAST_SESSIONS.length}
              <svg width={10} height={10} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="3,3 6,5 3,7"/></svg>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PAST_SESSIONS.map((s, i) => (
              <PastItem key={i} s={s} />
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function MentorAvatar({ initials, size = 36 }: { initials: string; size?: number }) {
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

function PastItem({ s }: { s: PastSession }) {
  const [hover, setHover] = useState(false);
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
      <MentorAvatar initials={s.initials} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: T.textPrimary }}>{s.name}</div>
        <div style={{ fontSize: 11, color: T.textSecondary }}>{s.meta}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        {s.status === 'reviewed' ? (
          <>
            <span style={statusTagStyle(T.successText, T.successBg)}>Reviewed</span>
            <div style={{ display: 'flex', gap: 1 }}>
              {[1, 2, 3, 4, 5].map((n) => <IconStar key={n} filled={n <= (s.rating ?? 0)} />)}
            </div>
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
const RADAR_DIMS: Dim[] = [
  { label: 'Domain Knowledge', value: 82 },
  { label: 'Technical Skills', value: 76 },
  { label: 'Behavioral Skills', value: 65 },
  { label: 'Background & Experience', value: 78 },
];

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
          const anchor = Math.abs(ax) > 0.1 ? (ax < 0 ? 'end' : 'start') : 'middle';
          const lines = d.label.split('|');
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

function InsightsCard() {
  const navigate = useNavigate();
  const dims = RADAR_DIMS;
  const avg = Math.round(dims.reduce((s, d) => s + d.value, 0) / dims.length);
  const best = Math.max(...dims.map((d) => d.value));
  const low = Math.min(...dims.map((d) => d.value));
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

function SummaryCell({ value, label, color }: { value: number; label: string; color: string }) {
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
type Post = { role: string; company: string; title: string; month: string; views: number; comments: number };
const COMMUNITY_POSTS: Post[] = [
  { role: 'Product Manager', company: 'Google', title: 'Cracked Google PM L5 after 4 months of prep — full breakdown', month: 'Mar 2025', views: 2847, comments: 43 },
  { role: 'Product Manager', company: 'Meta', title: 'Meta PM behavioral loop — what surprised me and how I prepared', month: 'Apr 2025', views: 1204, comments: 18 },
  { role: 'Senior PM', company: 'Stripe', title: 'How I answered the payment product for emerging markets question', month: 'Feb 2025', views: 891, comments: 12 },
];

function CommunityCard() {
  const navigate = useNavigate();
  return (
    <Panel>
      <PanelHead title="Community Picks" linkLabel="Browse community" onLink={() => navigate('/interview-insights')} />

      {/* Matched */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: T.bgSecondary, borderRadius: 8,
        padding: '8px 12px', marginBottom: 12, fontSize: 12,
      }}>
        <div>
          <span style={{ color: T.textSecondary }}>Matched to </span>
          <span style={{ color: T.textPrimary, fontWeight: 500 }}>Product Manager</span>
          <span style={{ color: T.textSecondary }}> · Google, Meta</span>
        </div>
        <button
          onClick={() => navigate('/settings')}
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

      {COMMUNITY_POSTS.map((post, idx) => (
        <PostItem key={idx} post={post} first={idx === 0} />
      ))}
    </Panel>
  );
}

function PostItem({ post, first }: { post: Post; first: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
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
        <span style={tagStyle(T.blue600, T.roleBg)}>{post.role}</span>
        <span style={tagStyle(T.textSecondary, T.bgSecondary)}>{post.company}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: T.textMuted }}>{post.month}</span>
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
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconEye />{post.views.toLocaleString()}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconMsg />{post.comments}
          </span>
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
  stats,
}: {
  userData: UserData | null;
  plan?: Plan;
  stats?: DashboardStats;
  isStatsLoading?: boolean;
  hasSessions?: boolean;
}) {
  const userPlan = useUserPlan();
  const plan: Plan = planProp ?? planFromUserPlan(userPlan.planData.currentPlan);
  const effectiveStats = stats ?? DEFAULT_STATS;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = userData?.firstName ? `, ${userData.firstName}` : '';

  return (
    <div>
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

      <StatsRow plan={plan} stats={effectiveStats} />

      <TrendChart key={plan} plan={plan} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 16,
        alignItems: 'start',
      }}>
        <MentorshipCard plan={plan} />
        <InsightsCard />
        <CommunityCard />
      </div>

      {/* Responsive: stack at narrow widths */}
      <style>{`
        @media (max-width: 1280px) {
          [data-dashboard-grid] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Page wrapper ────────────────────────────────────────────────────────────
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
