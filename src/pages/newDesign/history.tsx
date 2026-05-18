import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { getTrainingPlans } from '@/services/InterviewServices';

// ─── Design tokens (mirror Training History.html locals) ─────────────────────
const T = {
  blue50:  '#EFF4FF',
  blue100: '#DBE5FE',
  blue500: '#2563EB',
  blue600: '#1D4ED8',
  green500:'#10B981',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  warningText: '#92400E',
  successBg: '#ECFDF5',
  successText: '#065F46',
  bg: '#FFFFFF',
  bgSecondary: '#F8FAFC',
  border: 'rgba(0,0,0,0.08)',
  borderStrong: 'rgba(0,0,0,0.12)',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  shadowCard: '0 1px 3px rgba(0,0,0,0.06)',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────
type AvatarTone = 'rk' | 'tn' | 'al' | 'mh' | 'js' | 'dp' | 'ek';
type Status = 'reviewed' | 'pending';

interface MentorSession {
  id: string;
  kind: 'mentor';
  initials: string;
  avatar: AvatarTone;
  name: string;
  title: string;
  company: string;
  type: string;
  dateLabel: string;
  dateLong: string;
  dateMs: number;
  status: Status;
  rating: number;
  goal: string;
  comment?: string;
  outcome?: string;
}

interface AIMockSession {
  id: string;
  kind: 'ai';
  title: string;
  role: string;
  duration: number;       // minutes
  score: number;          // 0-100
  dateLabel: string;
  dateLong: string;
  dateMs: number;
  interviewId?: string;   // optional link back to evaluation report
}

type SessionRecord = MentorSession | AIMockSession;

// ─── Sample mentor sessions (from the design) ─────────────────────────────────
const MENTOR_SESSIONS: MentorSession[] = [
  {
    id: 'riya', kind: 'mentor', initials: 'RK', avatar: 'rk', name: 'Riya Kapoor',
    title: 'Senior PM', company: 'Google',
    type: 'Career Strategy Session',
    dateLabel: 'Apr 8, 2026', dateLong: 'Apr 8, 2026 · 11:00 AM',
    dateMs: new Date(2026, 3, 8).getTime(),
    status: 'reviewed', rating: 5,
    goal: 'Discuss career transition from SWE to PM and build a 90-day action plan.',
    comment: 'Riya was phenomenal. She gave me a clear roadmap and helped me see the bigger picture. Highly recommend for anyone looking to break into PM from an engineering background.',
  },
  {
    id: 'tom', kind: 'mentor', initials: 'TN', avatar: 'tn', name: 'Tom Nakamura',
    title: 'Senior EM', company: 'Meta',
    type: 'Resume & LinkedIn Review',
    dateLabel: 'Mar 29, 2026', dateLong: 'Mar 29, 2026 · 9:30 AM',
    dateMs: new Date(2026, 2, 29).getTime(),
    status: 'pending', rating: 0,
    goal: 'Get feedback on resume tailored for PM roles at FAANG companies.',
  },
  {
    id: 'amy', kind: 'mentor', initials: 'AL', avatar: 'al', name: 'Amy Liu',
    title: 'Senior PM', company: 'Stripe',
    type: 'Mock Interview (Product Sense)',
    dateLabel: 'Mar 20, 2026', dateLong: 'Mar 20, 2026 · 2:00 PM',
    dateMs: new Date(2026, 2, 20).getTime(),
    status: 'reviewed', rating: 4,
    goal: 'Mock interview focused on product sense and execution questions.',
    comment: 'Strong product sense framing; execution prioritization needs tighter trade-off articulation. Practice the CIRCLES framework on 3 more prompts.',
  },
  {
    id: 'mh', kind: 'mentor', initials: 'MH', avatar: 'mh', name: 'Marcus Hoang',
    title: 'Staff PM', company: 'Airbnb',
    type: 'Behavioral',
    dateLabel: 'Mar 12, 2026', dateLong: 'Mar 12, 2026 · 4:00 PM',
    dateMs: new Date(2026, 2, 12).getTime(),
    status: 'reviewed', rating: 5,
    goal: 'Practice STAR storytelling for ambiguous leadership questions.',
    comment: 'Three reusable stories drafted with clear conflict + decision arcs. Mentor flagged need for more first-person specificity.',
  },
  {
    id: 'js', kind: 'mentor', initials: 'JS', avatar: 'js', name: 'Jenna Shaw',
    title: 'Director PM', company: 'Notion',
    type: 'Career Strategy Session',
    dateLabel: 'Feb 28, 2026', dateLong: 'Feb 28, 2026 · 10:00 AM',
    dateMs: new Date(2026, 1, 28).getTime(),
    status: 'pending', rating: 0,
    goal: 'Clarify GTM path for early-stage AI product leadership.',
  },
  {
    id: 'dp', kind: 'mentor', initials: 'DP', avatar: 'dp', name: 'Diego Perez',
    title: 'Senior PM', company: 'Spotify',
    type: 'Mock Interview (Product Sense)',
    dateLabel: 'Feb 18, 2026', dateLong: 'Feb 18, 2026 · 6:30 PM',
    dateMs: new Date(2026, 1, 18).getTime(),
    status: 'reviewed', rating: 4,
    goal: 'Practice market sizing and prioritization questions.',
    comment: 'Good top-down structure. Need to more explicitly state assumptions before computing. Watch for off-by-10x errors.',
  },
  {
    id: 'ek', kind: 'mentor', initials: 'EK', avatar: 'ek', name: 'Elena Kowalski',
    title: 'Principal PM', company: 'Atlassian',
    type: 'Career Strategy Session',
    dateLabel: 'Feb 4, 2026', dateLong: 'Feb 4, 2026 · 1:00 PM',
    dateMs: new Date(2026, 1, 4).getTime(),
    status: 'reviewed', rating: 5,
    goal: 'Build a path from senior PM to staff PM.',
    comment: 'Three scope-expansion bets identified, plus a sponsor map. Mentor recommended quarterly progress doc cadence.',
  },
  {
    id: 'rj', kind: 'mentor', initials: 'RJ', avatar: 'rk', name: 'Ravi Jha',
    title: 'Lead PM', company: 'Datadog',
    type: 'Resume & LinkedIn Review',
    dateLabel: 'Jan 22, 2026', dateLong: 'Jan 22, 2026 · 11:30 AM',
    dateMs: new Date(2026, 0, 22).getTime(),
    status: 'reviewed', rating: 4,
    goal: 'Refine PM narrative for senior IC roles.',
    comment: 'Tightened opening summary; collapsed 2 redundant bullets per role. Adopt impact-first ordering.',
  },
  {
    id: 'pn', kind: 'mentor', initials: 'PN', avatar: 'tn', name: 'Priya Nair',
    title: 'Senior PM', company: 'Lyft',
    type: 'Behavioral',
    dateLabel: 'Jan 8, 2026', dateLong: 'Jan 8, 2026 · 3:00 PM',
    dateMs: new Date(2026, 0, 8).getTime(),
    status: 'reviewed', rating: 5,
    goal: 'Improve conflict and influence stories.',
    comment: 'Stories now have explicit decision points + measurable outcomes. Mentor approved 3/4.',
  },
  {
    id: 'sl', kind: 'mentor', initials: 'SL', avatar: 'al', name: 'Sophie Lambert',
    title: 'Group PM', company: 'Figma',
    type: 'Mock Interview (Product Sense)',
    dateLabel: 'Dec 18, 2025', dateLong: 'Dec 18, 2025 · 5:00 PM',
    dateMs: new Date(2025, 11, 18).getTime(),
    status: 'reviewed', rating: 5,
    goal: 'Design-led product critique and execution practice.',
    comment: 'Strong visual reasoning. Practice tying critiques back to user-job, not aesthetics.',
  },
  {
    id: 'kw1', kind: 'mentor', initials: 'KW', avatar: 'mh', name: 'Kenji Watanabe',
    title: 'Senior PM', company: 'Square',
    type: 'Offer & Salary Negotiation',
    dateLabel: 'Dec 5, 2025', dateLong: 'Dec 5, 2025 · 10:30 AM',
    dateMs: new Date(2025, 11, 5, 11).getTime(),
    status: 'reviewed', rating: 4,
    goal: 'Build negotiation strategy and compensation framing.',
    comment: 'Drafted a counter-offer script with 3 anchors. Mentor flagged 2 risk areas: timing and base-vs-equity mix.',
  },
  {
    id: 'kw2', kind: 'mentor', initials: 'KW', avatar: 'mh', name: 'Kenji Watanabe',
    title: 'Senior PM', company: 'Square',
    type: 'Offer & Salary Negotiation',
    dateLabel: 'Dec 5, 2025', dateLong: 'Dec 5, 2025 · 3:00 PM',
    dateMs: new Date(2025, 11, 5, 15).getTime(),
    status: 'pending', rating: 0,
    goal: 'Build salary negotiation strategy with compensation band insights and scripts.',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const AVATAR_BG: Record<AvatarTone, string> = {
  rk: '#7C3AED',
  tn: '#0EA5E9',
  al: '#EC4899',
  mh: '#F97316',
  js: T.blue500,
  dp: '#14B8A6',
  ek: '#6366F1',
};

function scoreColor(n: number): string {
  if (n >= 85) return T.successText;
  if (n >= 70) return T.warningText;
  return '#B91C1C';
}

function formatDateLabel(iso: string): { label: string; long: string; ms: number } {
  if (!iso) return { label: '—', long: '—', ms: 0 };
  const d = new Date(iso);
  const ms = d.getTime();
  if (isNaN(ms)) return { label: '—', long: '—', ms: 0 };
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return { label, long: `${label} · ${time}`, ms };
}

function mapPlansToAISessions(plans: unknown[]): AIMockSession[] {
  if (!Array.isArray(plans)) return [];
  const out: AIMockSession[] = [];
  for (const plan of plans as Array<Record<string, unknown>>) {
    const modules = Array.isArray(plan.modules) ? (plan.modules as Array<Record<string, unknown>>) : [];
    for (const m of modules) {
      if (m.status !== 'completed') continue;
      const reportId = String(m.report_id ?? '');
      if (!reportId) continue;
      const iso = (m.updated_at ?? plan.updated_at ?? plan.created_at ?? '') as string;
      const { label, long, ms } = formatDateLabel(iso);
      const duration = Number(m.duration_minutes ?? 0);
      const score = Math.round(Number(m.score ?? 0));
      out.push({
        id: `ai-${reportId}`,
        kind: 'ai',
        title: String(m.title ?? plan.target_job_title ?? 'Mock Interview'),
        role: String(m.category ?? plan.target_job_title ?? 'General'),
        duration: duration || 0,
        score: score || 0,
        dateLabel: label,
        dateLong: long,
        dateMs: ms,
        interviewId: reportId,
      });
    }
  }
  return out;
}

// ─── Icon components (inline SVGs to match design pixel-for-pixel) ────────────
function StarIcon({ filled, size = 11 }: { filled: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 11 11" width={size} height={size} fill={filled ? T.warning : '#E1E4EA'} aria-hidden="true">
      <polygon points="5.5,1 6.7,4 10,4.2 7.4,6.4 8.3,9.6 5.5,7.8 2.7,9.6 3.6,6.4 1,4.2 4.3,4" />
    </svg>
  );
}

function StarsRow({ rating, size = 11 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= rating} size={size} />
      ))}
    </span>
  );
}

function AIIcon() {
  return (
    <svg viewBox="0 0 18 18" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7l-3 2.5V5a2 2 0 0 1 1-2z" />
      <path d="M9 7v3" />
      <circle cx="9" cy="5.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CheckIcon({ size = 10 }: { size?: number }) {
  return (
    <svg viewBox="0 0 10 10" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5.5l2 2 4-4.5" />
    </svg>
  );
}

function ClockIcon({ size = 10 }: { size?: number }) {
  return (
    <svg viewBox="0 0 10 10" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="5" r="3.5" />
      <path d="M5 3.5v1.8l1.2.7" />
    </svg>
  );
}

function AIPillIcon() {
  return (
    <svg viewBox="0 0 10 10" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5.5l1.5 1.5L8 3" />
    </svg>
  );
}

function MentorPillIcon() {
  return (
    <svg viewBox="0 0 10 10" width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="3.5" cy="4" r="1.4" />
      <circle cx="7" cy="4.5" r="1.1" />
      <path d="M1.6 8.5c.3-1.2 1.2-1.8 2.2-1.8s1.9.6 2.2 1.8" />
    </svg>
  );
}

function BrowseMentorsIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.5" />
      <path d="M2 13c.6-2 2-3 4-3s3.4 1 4 3" />
      <circle cx="11.5" cy="5" r="2" />
      <path d="M9 11.5c.4-1.4 1.4-2.2 2.5-2.2s2.1.8 2.5 2.2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg viewBox="0 0 16 16" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="4" />
      <path d="M9 9l4.5 4.5" />
    </svg>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function Avatar({ tone, initials, size = 36 }: { tone: AvatarTone; initials: string; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: AVATAR_BG[tone], color: '#fff',
        fontWeight: 600, fontSize: size >= 44 ? 14 : 12,
        display: 'grid', placeItems: 'center', flex: 'none',
        letterSpacing: '0.02em',
      }}
    >
      {initials}
    </div>
  );
}

function AIRow({ session, onClick }: { session: AIMockSession; onClick: (id: string) => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(session.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(session.id); } }}
      className="th-row"
      style={rowStyle}
    >
      <div style={cellSession}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: T.blue50, color: T.blue600,
          display: 'grid', placeItems: 'center', flex: 'none',
          border: `1px solid rgba(37,99,235,0.12)`,
        }}>
          <AIIcon />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={cellTitle}>{session.title}</div>
          <div style={cellMeta}>{session.role}{session.duration ? ` · ${session.duration} min` : ''}</div>
        </div>
      </div>
      <div>
        <span style={pillStyle(T.blue50, T.blue600, 'rgba(37,99,235,0.18)')}>
          <AIPillIcon />AI mock
        </span>
      </div>
      <div className="th-col-date" style={dateCellStyle}>{session.dateLabel}</div>
      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'baseline', gap: 3,
          fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 14,
          color: scoreColor(session.score),
        }}>
          {session.score}<span style={{ fontSize: 11, fontWeight: 500, color: T.textMuted }}>/100</span>
        </span>
      </div>
      <div style={actionsStyle}>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(session.id); }}
          style={ctaGhost}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, ctaGhostHover)}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, ctaGhost)}
        >
          View report
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClick(session.id); }}
          style={ctaPrimary}
          onMouseEnter={(e) => (e.currentTarget.style.background = T.blue600)}
          onMouseLeave={(e) => (e.currentTarget.style.background = T.blue500)}
        >
          Retake
        </button>
      </div>
      <style>{`.th-row:hover{background:${T.bgSecondary};}`}</style>
    </div>
  );
}

function MentorRow({ session, onOpen }: { session: MentorSession; onOpen: (id: string) => void }) {
  const reviewed = session.status === 'reviewed';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(session.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(session.id); } }}
      className="th-row"
      style={rowStyle}
    >
      <div style={cellSession}>
        <Avatar tone={session.avatar} initials={session.initials} />
        <div style={{ minWidth: 0 }}>
          <div style={cellTitle}>{session.type}</div>
          <div style={cellMeta}>{session.name} · {session.title} · {session.company}</div>
        </div>
      </div>
      <div>
        <span style={pillStyle('#F5F0FF', '#6D28D9', 'rgba(124,58,237,0.18)')}>
          <MentorPillIcon />Mentor
        </span>
      </div>
      <div className="th-col-date" style={dateCellStyle}>{session.dateLabel}</div>
      <div>
        {reviewed ? (
          <>
            <span style={badgeStyle(T.successText, T.successBg)}>
              <CheckIcon />Reviewed
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              color: T.textSecondary, fontSize: 12, marginLeft: 8,
            }}>
              <StarsRow rating={session.rating} />
              <span>{session.rating}.0</span>
            </span>
          </>
        ) : (
          <span style={badgeStyle(T.warningText, T.warningBg)}>
            <ClockIcon />Review pending
          </span>
        )}
      </div>
      <div style={actionsStyle}>
        {reviewed ? (
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(session.id); }}
            style={ctaGhost}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, ctaGhostHover)}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, ctaGhost)}
          >
            View
          </button>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(session.id); }}
            style={ctaPrimary}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.blue600)}
            onMouseLeave={(e) => (e.currentTarget.style.background = T.blue500)}
          >
            Leave review
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Style objects (extracted for reuse) ─────────────────────────────────────
const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(260px, 1.8fr) 130px 110px 180px 190px',
  gap: 16,
  padding: '14px 16px',
  alignItems: 'center',
  borderBottom: `1px solid ${T.border}`,
  cursor: 'pointer',
  transition: 'background 120ms',
  background: 'transparent',
};

const cellSession: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, minWidth: 0,
};

const cellTitle: React.CSSProperties = {
  fontWeight: 600, color: T.textPrimary, fontSize: 14, lineHeight: 1.3,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const cellMeta: React.CSSProperties = {
  color: T.textSecondary, fontSize: 12,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

const dateCellStyle: React.CSSProperties = {
  color: T.textSecondary, fontSize: 13, fontVariantNumeric: 'tabular-nums',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end',
};

function pillStyle(bg: string, color: string, borderColor: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 22, padding: '0 9px', borderRadius: 9999,
    fontSize: 11, fontWeight: 600, letterSpacing: '0.01em',
    background: bg, color, border: `1px solid ${borderColor}`,
  };
}

function badgeStyle(color: string, bg: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    height: 22, padding: '0 8px', borderRadius: 9999,
    fontSize: 11, fontWeight: 500, color, background: bg,
  };
}

const ctaPrimary: React.CSSProperties = {
  height: 30, padding: '0 12px', borderRadius: 8,
  fontSize: 12, fontWeight: 500,
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: T.blue500, color: '#fff',
  border: 'none', cursor: 'pointer',
  transition: 'background 160ms',
};

const ctaGhost: React.CSSProperties = {
  height: 30, padding: '0 12px', borderRadius: 8,
  fontSize: 12, fontWeight: 500,
  display: 'inline-flex', alignItems: 'center', gap: 4,
  color: T.textPrimary, border: `1px solid ${T.border}`, background: '#fff',
  cursor: 'pointer',
  transition: 'background 160ms, border-color 160ms',
};

const ctaGhostHover: React.CSSProperties = {
  ...ctaGhost,
  background: T.bgSecondary,
  borderColor: T.borderStrong,
};

// ─── Drawer ──────────────────────────────────────────────────────────────────
function SessionDrawer({
  session,
  open,
  onClose,
  onSubmitReview,
}: {
  session: MentorSession | null;
  open: boolean;
  onClose: () => void;
  onSubmitReview: (id: string, rating: number, comment: string) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (open && session) {
      setRating(0);
      setComment('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isReviewed = session?.status === 'reviewed';

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.32)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 200ms cubic-bezier(.4,0,.2,1)',
          zIndex: 90,
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(440px, 100vw)',
          background: '#fff',
          borderLeft: `1px solid ${T.border}`,
          boxShadow: '-12px 0 32px rgba(15,23,42,0.08)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 240ms cubic-bezier(.4,0,.2,1)',
          zIndex: 91,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <header style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: `1px solid ${T.border}`,
          gap: 12,
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: T.textPrimary, margin: 0 }}>Session details</h2>
            <p style={{ fontSize: 12, color: T.textSecondary, margin: '2px 0 0' }}>Review and follow up</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 30, height: 30, borderRadius: 8,
              color: T.textSecondary,
              display: 'grid', placeItems: 'center',
              background: 'transparent', border: 'none', cursor: 'pointer',
              transition: 'background 120ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.bgSecondary; e.currentTarget.style.color = T.textPrimary; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSecondary; }}
          >
            <CloseIcon />
          </button>
        </header>

        {session && (
          <div style={{
            padding: '18px 20px',
            flex: '1 1 auto',
            overflow: 'auto',
            display: 'flex', flexDirection: 'column', gap: 18,
          }}>
            {/* Status chip */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 24, padding: '0 10px', borderRadius: 9999,
              fontSize: 11, fontWeight: 600,
              alignSelf: 'flex-start',
              color: isReviewed ? T.successText : T.warningText,
              background: isReviewed ? T.successBg : T.warningBg,
            }}>
              {isReviewed ? <CheckIcon /> : <ClockIcon />}
              {isReviewed ? 'Completed · Reviewed' : 'Completed · Review pending'}
            </span>

            {/* Mentor block */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: 14, background: T.bgSecondary, borderRadius: 10,
            }}>
              <Avatar tone={session.avatar} initials={session.initials} size={44} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>{session.name}</div>
                <div style={{ fontSize: 12, color: T.textSecondary }}>{session.title} · {session.company}</div>
              </div>
            </div>

            {/* Grid: Coaching plan / Date & time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <DSection label="Coaching plan" value={session.type} />
              <DSection label="Date & time" value={session.dateLong} />
            </div>

            {/* My note */}
            <DSection
              label="My note"
              value={session.goal && session.goal.trim() ? session.goal : "You haven't left a note"}
              isEmpty={!session.goal || !session.goal.trim()}
            />

            {/* Reviewed: show review card. Pending: show form. */}
            {isReviewed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={labelStyle}>Your review</div>
                <div style={{
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  background: '#fff',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    paddingBottom: 10, marginBottom: 10,
                    borderBottom: `1px solid ${T.border}`,
                  }}>
                    <StarsRow rating={session.rating} size={14} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>
                      {session.rating}.0 <span style={{ color: T.textMuted, fontWeight: 500 }}>/ 5.0</span>
                    </span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: T.textPrimary }}>
                    {session.comment || '—'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={labelStyle}>Your rating</div>
                <div style={{ display: 'inline-flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`${i} star${i > 1 ? 's' : ''}`}
                      onClick={() => setRating(i)}
                      style={{
                        padding: 2, lineHeight: 0, borderRadius: 4,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        transition: 'transform 120ms',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <svg viewBox="0 0 24 24" width={24} height={24} fill={i <= rating ? T.warning : '#E1E4EA'}>
                        <polygon points="12,2 14.7,8.6 22,9.2 16.3,14 18,21 12,17.2 6,21 7.7,14 2,9.2 9.3,8.6" />
                      </svg>
                    </button>
                  ))}
                </div>
                <div style={{ ...labelStyle, marginTop: 10 }}>Review comment</div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share what worked and what could be better..."
                  style={{
                    width: '100%', minHeight: 96, resize: 'vertical',
                    padding: '10px 12px',
                    border: `1px solid ${T.border}`, borderRadius: 8,
                    fontFamily: 'inherit', fontSize: 13, color: T.textPrimary,
                    background: '#fff',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = T.blue500; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)'; e.currentTarget.style.outline = 'none'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            )}
          </div>
        )}

        {/* Footer: only for pending */}
        {!isReviewed && session && (
          <div style={{
            padding: '14px 20px',
            borderTop: `1px solid ${T.border}`,
            display: 'flex', gap: 8, justifyContent: 'flex-end',
            background: T.bgSecondary,
          }}>
            <button
              onClick={() => onSubmitReview(session.id, rating, comment)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 36, padding: '0 14px',
                borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: T.blue500, color: '#fff',
                border: 'none', cursor: 'pointer',
                transition: 'background 160ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = T.blue600)}
              onMouseLeave={(e) => (e.currentTarget.style.background = T.blue500)}
            >
              Submit review
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.04em',
  color: T.textMuted,
};

function DSection({ label, value, isEmpty }: { label: string; value: string; isEmpty?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={labelStyle}>{label}</div>
      <div style={{
        fontSize: 13, color: isEmpty ? T.textMuted : T.textPrimary,
        lineHeight: 1.55, fontStyle: isEmpty ? 'italic' : 'normal',
      }}>{value}</div>
    </div>
  );
}

// ─── Filter segmented control ────────────────────────────────────────────────
type MainFilter = 'all' | 'ai' | 'mentor';
type SubFilter = 'all' | 'reviewed' | 'pending';

function Toolbar({
  filter,
  onFilter,
}: {
  filter: MainFilter;
  onFilter: (f: MainFilter) => void;
}) {
  const tabs: Array<{ key: MainFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'ai', label: 'AI Mock' },
    { key: 'mentor', label: 'Mentor Session' },
  ];
  return (
    <div
      role="toolbar"
      aria-label="Filter sessions"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 0, background: 'transparent', border: 'none',
        borderRadius: 0, marginBottom: 14, flexWrap: 'wrap',
      }}
    >
      <div role="tablist" aria-label="Type filter" style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        background: 'transparent', border: 'none',
        padding: '0 0 12px 0', height: 'auto',
      }}>
        {tabs.map((t) => {
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-pressed={active}
              onClick={() => onFilter(t.key)}
              style={{
                height: 'auto', padding: '6px 14px',
                borderRadius: 6,
                background: active ? '#F1F5F9' : 'transparent',
                color: active ? T.textPrimary : T.textSecondary,
                fontSize: 14,
                fontWeight: active ? 500 : 400,
                lineHeight: 1.4,
                transition: 'background 150ms, color 150ms',
                userSelect: 'none',
                border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; e.currentTarget.style.color = T.textPrimary; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSecondary; } }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SubFilterRow({
  sub,
  onSub,
  counts,
}: {
  sub: SubFilter;
  onSub: (s: SubFilter) => void;
  counts: { reviewed: number; pending: number };
}) {
  const tabs: Array<{ key: SubFilter; label: string; count?: number }> = [
    { key: 'all', label: 'All' },
    { key: 'reviewed', label: 'Reviewed', count: counts.reviewed },
    { key: 'pending', label: 'Review pending', count: counts.pending },
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '-6px 0 14px',
      padding: '8px 14px',
      background: '#FAFBFD',
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      borderLeft: '3px solid #C4B5FD',
    }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: T.textSecondary }}>Mentor sessions:</span>
      <div role="tablist" aria-label="Mentor session status" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: 2,
        background: '#fff', border: `1px solid ${T.border}`,
        borderRadius: 8, height: 32,
      }}>
        {tabs.map((t) => {
          const active = sub === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-pressed={active}
              onClick={() => onSub(t.key)}
              style={{
                height: 28, padding: '0 10px', borderRadius: 6,
                fontSize: 12, fontWeight: 500,
                color: active ? T.textPrimary : T.textSecondary,
                background: active ? T.bgSecondary : 'transparent',
                boxShadow: active ? `inset 0 0 0 1px ${T.border}` : 'none',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                transition: 'background 120ms, color 120ms',
                border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = T.bgSecondary; e.currentTarget.style.color = T.textPrimary; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSecondary; } }}
            >
              {t.label}
              {typeof t.count === 'number' && (
                <span style={{
                  background: active ? '#fff' : T.bgSecondary,
                  color: T.textMuted,
                  borderRadius: 9999,
                  padding: '1px 6px', fontSize: 11, fontWeight: 500,
                  border: `1px solid ${T.border}`,
                }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page component ─────────────────────────────────────────────────────────
export function HistoryPage() {
  const navigate = useNavigate();
  const [aiSessions, setAiSessions] = useState<AIMockSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MainFilter>('all');
  const [sub, setSub] = useState<SubFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [mentorSessions, setMentorSessions] = useState<MentorSession[]>(MENTOR_SESSIONS);

  useEffect(() => {
    let cancelled = false;
    async function fetchHistory() {
      try {
        const res = await getTrainingPlans();
        const plans = res.data?.data ?? res.data ?? [];
        if (cancelled) return;
        setAiSessions(mapPlansToAISessions(Array.isArray(plans) ? plans : []));
      } catch {
        if (!cancelled) setAiSessions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchHistory();
    return () => { cancelled = true; };
  }, []);

  const allSessions: SessionRecord[] = useMemo(
    () => [...mentorSessions, ...aiSessions],
    [mentorSessions, aiSessions]
  );

  const visible = useMemo(() => {
    return allSessions
      .filter((s) => {
        if (filter === 'all') return true;
        if (filter === 'ai') return s.kind === 'ai';
        if (filter === 'mentor') {
          if (s.kind !== 'mentor') return false;
          if (sub === 'reviewed') return s.status === 'reviewed';
          if (sub === 'pending') return s.status === 'pending';
          return true;
        }
        return true;
      })
      .sort((a, b) => b.dateMs - a.dateMs);
  }, [allSessions, filter, sub]);

  const counts = useMemo(() => ({
    reviewed: mentorSessions.filter((s) => s.status === 'reviewed').length,
    pending: mentorSessions.filter((s) => s.status === 'pending').length,
  }), [mentorSessions]);

  const openSession = useMemo(
    () => mentorSessions.find((s) => s.id === openId) ?? null,
    [openId, mentorSessions]
  );

  const handleRowClick = useCallback((id: string) => {
    const ai = aiSessions.find((s) => s.id === id);
    if (ai) {
      const reportId = ai.interviewId ?? id.replace(/^ai-/, '');
      navigate(`/evaluation?interviewId=${reportId}`, { state: { from: '/history', jobTitle: ai.title } });
      return;
    }
    setOpenId(id);
  }, [aiSessions, navigate]);

  const handleFilter = useCallback((f: MainFilter) => {
    setFilter(f);
    setSub('all');
  }, []);

  const handleSubmitReview = useCallback((id: string, rating: number, comment: string) => {
    if (!rating) return; // disallow blank rating
    setMentorSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'reviewed' as const, rating, comment } : s))
    );
    setOpenId(null);
  }, []);

  return (
    <DashboardLayout headerTitle="Training History">
      {/* Page head */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 24, marginBottom: 20,
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700, fontSize: 28, lineHeight: 1.2,
            color: T.textPrimary, margin: '0 0 4px',
          }}>
            Training History
          </h1>
          <p style={{ color: T.textSecondary, fontSize: 13, margin: 0, maxWidth: 520 }}>
            Review your past mock interviews and mentor sessions in one place.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
          <button
            onClick={() => navigate('/marketplace')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 36, padding: '0 14px',
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: T.blue500, color: '#fff',
              border: 'none', cursor: 'pointer',
              transition: 'background 160ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = T.blue600)}
            onMouseLeave={(e) => (e.currentTarget.style.background = T.blue500)}
          >
            <BrowseMentorsIcon />
            Browse mentors
          </button>
        </div>
      </div>

      <Toolbar filter={filter} onFilter={handleFilter} />

      {filter === 'mentor' && (
        <SubFilterRow sub={sub} onSub={setSub} counts={counts} />
      )}

      <div style={{ fontSize: 12, color: T.textMuted, padding: '0 4px 8px' }}>
        {visible.length === 0
          ? 'No records match your filters'
          : `Showing ${visible.length} record${visible.length === 1 ? '' : 's'}`}
      </div>

      {/* List */}
      {visible.length > 0 && (
        <div style={{
          background: '#fff', border: `1px solid ${T.border}`,
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(260px, 1.8fr) 130px 110px 180px 190px',
            gap: 16, padding: '10px 16px',
            background: T.bgSecondary, borderBottom: `1px solid ${T.border}`,
            fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.04em',
            color: T.textMuted,
          }}>
            <div>Session</div>
            <div>Type</div>
            <div className="th-col-date">Date</div>
            <div>Status / Result</div>
            <div />
          </div>
          {visible.map((s) =>
            s.kind === 'ai'
              ? <AIRow key={s.id} session={s} onClick={handleRowClick} />
              : <MentorRow key={s.id} session={s} onOpen={handleRowClick} />
          )}
        </div>
      )}

      {/* Empty */}
      {!loading && visible.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '64px 24px', color: T.textSecondary,
          background: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0/24px 24px',
        }}>
          <span style={{
            width: 48, height: 48, borderRadius: '50%',
            background: T.bgSecondary,
            display: 'inline-grid', placeItems: 'center',
            color: T.blue500, marginBottom: 12,
          }}>
            <EmptyIcon />
          </span>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, margin: '0 0 4px' }}>
            No training history yet
          </h2>
          <p style={{ fontSize: 13, margin: '0 0 16px' }}>
            Completed AI mocks and mentor sessions will appear here.
          </p>
          <button
            onClick={() => navigate('/marketplace')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 36, padding: '0 14px',
              borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: T.blue500, color: '#fff',
              border: 'none', cursor: 'pointer',
            }}
          >
            Browse mentors
          </button>
        </div>
      )}

      <SessionDrawer
        session={openSession}
        open={!!openSession}
        onClose={() => setOpenId(null)}
        onSubmitReview={handleSubmitReview}
      />

      {/* Responsive: hide date column when narrow */}
      <style>{`
        @media (max-width: 1100px) {
          .th-col-date { display: none !important; }
        }
        @media (max-width: 820px) {
          .th-row > div:not(:first-child):not(:last-child):not([style*="grid"]) { }
        }
      `}</style>
    </DashboardLayout>
  );
}
