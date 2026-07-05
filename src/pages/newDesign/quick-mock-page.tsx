import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { WidePageContainer } from '@/components/newDesign/dashboard-page';
import { BookOpen, Building2, Briefcase, Clock, ArrowRight } from 'lucide-react';

// ============================================================================
// Quick Mock entry screen — ported from the new design. Rendered inside
// DashboardLayout (sidebar + top nav from the shell), so it self-pads via
// WidePageContainer and uses the layout's `fullBleed` flag.
// ============================================================================

// ─── Company / Role data ──────────────────────────────────
const COMPANY_CATEGORIES = [
  { label: 'FAANG / Big Tech', companies: ['OpenAI', 'Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'Anthropic', 'NVIDIA'] },
  { label: 'Large Enterprises', companies: ['Databricks', 'ByteDance'] },
  { label: 'Mid-sized', companies: ['Stripe', 'Uber'] },
  { label: 'Small', companies: ['Airbnb', 'Figma', 'Notion'] },
];
const ALL_COMPANIES = COMPANY_CATEGORIES.flatMap((c) => c.companies);

const ROLE_CATEGORIES = [
  { label: 'Engineering', roles: ['Software Engineer', 'Frontend Engineer', 'Backend Engineer'] },
  { label: 'Data / AI',   roles: ['Data Scientist', 'ML Engineer'] },
  { label: 'Product',     roles: ['Product Manager'] },
  { label: 'Design',      roles: ['Designer'] },
  { label: 'Business / Other', roles: ['Business Analyst'] },
];
const ALL_ROLES = ROLE_CATEGORIES.flatMap((c) => c.roles);

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTIES: { key: Difficulty; label: string; dots: number }[] = [
  { key: 'easy',   label: 'Easy',   dots: 1 },
  { key: 'medium', label: 'Medium', dots: 2 },
  { key: 'hard',   label: 'Hard',   dots: 3 },
];

// ─── Difficulty dots ──────────────────────────────────────
function DiffDots({ filled, selected }: { filled: number; selected: boolean }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
          background: i <= filled
            ? (selected ? '#F97316' : 'rgba(255,255,255,0.55)')
            : (selected ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.2)'),
        }} />
      ))}
    </span>
  );
}

// ─── Generic searchable dropdown ─────────────────────────
function SearchDropdown({
  value, onChange, options, categories, placeholder, icon, label,
}: {
  value: string; onChange: (v: string) => void;
  options: string[];
  categories?: { label: string; items: string[] }[];
  placeholder?: string; icon: React.ReactNode; label: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(value);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); setActiveCategory(null); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = (() => {
    let list = activeCategory && categories
      ? (categories.find((c) => c.label === activeCategory)?.items ?? [])
      : options;
    if (query.trim()) list = list.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
    return list;
  })();

  return (
    <div ref={ref} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
        {label}
      </p>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setPending(value); setQuery(''); }}
        style={{
          width: '100%', height: 50, display: 'flex', alignItems: 'center', gap: 8,
          paddingLeft: 38, paddingRight: 28,
          fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500,
          color: '#fff',
          background: open ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.15)',
          border: open ? '1.5px solid rgba(255,255,255,0.8)' : '1.5px solid rgba(255,255,255,0.35)',
          borderRadius: 12, cursor: 'pointer', textAlign: 'left',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          boxSizing: 'border-box', outline: 'none', transition: 'all 0.15s',
          position: 'relative',
        }}
      >
        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>{icon}</span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || placeholder}</span>
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.6)', fontSize: 10, pointerEvents: 'none' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 280,
          background: '#fff', borderRadius: 16, border: '1px solid #e1e4ea',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1)',
          zIndex: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Category chips */}
          {categories && (
            <div style={{ padding: '12px 12px 9px', borderBottom: '1px solid rgba(225,228,234,0.5)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {categories.map((cat) => {
                  const isActive = activeCategory === cat.label;
                  return (
                    <button key={cat.label} type="button" onClick={() => setActiveCategory(isActive ? null : cat.label)} style={{
                      padding: '4px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
                      color: isActive ? '#fff' : '#1e232f', background: isActive ? 'var(--primary)' : '#f3f4f7',
                      transition: 'all 0.15s',
                    }}>{cat.label}</button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Search */}
          <div style={{ padding: '12px', borderBottom: '1px solid rgba(225,228,234,0.5)' }}>
            <div style={{ position: 'relative', height: 38 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#5A6172', pointerEvents: 'none', fontSize: 14 }}>⌕</span>
              <input autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', paddingLeft: 34, paddingRight: 13, fontFamily: 'var(--font-sans)', fontSize: 14, color: '#1e232f', background: '#fff', border: '1px solid #e1e4ea', borderRadius: 12, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          {/* List */}
          <div style={{ padding: 12, maxHeight: 220, overflowY: 'auto' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, color: '#5a6172', letterSpacing: '0.55px', textTransform: 'uppercase', marginBottom: 4, padding: '0 8px 6px' }}>
              {activeCategory ?? `TOP ${label.toUpperCase()}S`}
            </p>
            {filtered.length === 0
              ? <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: '#5a6172', padding: 8 }}>No results</p>
              : filtered.map((opt) => {
                const isSel = pending === opt;
                return (
                  <button key={opt} type="button" onClick={() => setPending(opt)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 8, borderRadius: 12, border: 'none', background: isSel ? '#f3f4f7' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                  >
                    <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: isSel ? '2px solid var(--primary)' : '1.5px solid #c8cbd4', background: isSel ? 'var(--primary)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                      {isSel && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: '#1e232f' }}>{opt}</span>
                  </button>
                );
              })}
          </div>
          {/* Footer */}
          <div style={{ height: 53, borderTop: '1px solid #e1e4ea', background: 'rgba(243,244,247,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', flexShrink: 0 }}>
            <button type="button" onClick={() => { setPending(options[0]); onChange(options[0]); setOpen(false); setQuery(''); }} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: '#5a6172', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>Reset</button>
            <button type="button" onClick={() => { onChange(pending); setOpen(false); setQuery(''); setActiveCategory(null); }} style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: '#fff', background: '#3c77f6', border: 'none', borderRadius: 12, cursor: 'pointer', padding: '6px 16px' }}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quick Mock Builder ───────────────────────────────────
function QuickMockBuilder({ onStart }: { onStart: (company: string, role: string, difficulty: Difficulty, duration: number) => void }) {
  const [company, setCompany] = useState('Any company');
  const [role, setRole] = useState('Software Engineer');
  const [duration, setDuration] = useState<5 | 10 | 15 | 30>(10);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  return (
    <div style={{
      position: 'relative',
      borderRadius: '20px',
      background: 'linear-gradient(163.571deg, #1D4ED8 0%, #2563EB 45%, #3B82F6 100%)',
      boxShadow: '0 12px 24px -4px rgba(29,78,216,0.25)',
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.15, overflow: 'hidden', borderRadius: '20px' }}>
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', top: -128, right: -128 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', top: 40, right: -40 }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 600, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
          Pick your mock
        </h2>

        {/* Dropdowns row */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <SearchDropdown
            value={company} onChange={setCompany}
            options={ALL_COMPANIES} categories={COMPANY_CATEGORIES.map((c) => ({ label: c.label, items: c.companies }))}
            label="Company" placeholder="Any company"
            icon={<Building2 style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.7)' }} />}
          />
          <SearchDropdown
            value={role} onChange={setRole}
            options={ALL_ROLES} categories={ROLE_CATEGORIES.map((c) => ({ label: c.label, items: c.roles }))}
            label="Role" placeholder="Role"
            icon={<Briefcase style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.7)' }} />}
          />
          <div style={{ flexShrink: 0, width: 115 }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>Duration</p>
            <div style={{ position: 'relative' }}>
              <Clock style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }} />
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value) as 5 | 10 | 15 | 30)}
                style={{
                  width: '100%', height: 50, paddingLeft: 36, paddingRight: 32,
                  fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500,
                  color: '#fff', background: 'rgba(255,255,255,0.15)',
                  border: '1.5px solid rgba(255,255,255,0.35)', borderRadius: 12,
                  cursor: 'pointer', appearance: 'none', outline: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.6)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
                }}
              >
                {([5, 10, 15, 30] as const).map((m) => (
                  <option key={m} value={m} style={{ background: '#1D4ED8', color: '#fff' }}>{m} min</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Difficulty row */}
        <div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>Difficulty</p>
          <div role="group" aria-label="Difficulty" style={{ display: 'flex', gap: 8 }}>
            {([...DIFFICULTIES.slice(0, 2), { key: 'advanced', label: 'Advanced', dots: 3 }, DIFFICULTIES[2]] as any[]).map((d) => {
              const sel = difficulty === d.key;
              return (
                <button key={d.key} onClick={() => setDifficulty(d.key)} aria-pressed={sel}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    height: 44, padding: '0 16px', borderRadius: 12,
                    border: sel ? '1.5px solid rgba(255,255,255,0.9)' : '1.5px solid rgba(255,255,255,0.25)',
                    background: sel ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.1)',
                    color: sel ? '#1D4ED8' : 'rgba(255,255,255,0.85)',
                    fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: sel ? 700 : 500,
                    cursor: 'pointer', transition: 'all 0.15s', outline: 'none',
                  }}
                >
                  <DiffDots filled={d.dots} selected={sel} />
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.15)', margin: '4px 0' }} />

        {/* Bottom row: Text and CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginBottom: 4 }}>Real question bank</p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>Role-specific interview questions · never generic AI prompts</p>
          </div>
          <button
            onClick={() => onStart(company, role, difficulty, duration)}
            style={{
              height: 44, padding: '0 24px', borderRadius: 12,
              background: '#fff', color: '#1D4ED8',
              fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              whiteSpace: 'nowrap', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'opacity 0.15s',
            }}
          >
            Start AI Mock
            <ArrowRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Targeted Practice card ───────────────────────────────
function TargetedPracticeCard() {
  return (
    <div className="h-full rounded-xl p-6 border border-[var(--border)] flex flex-col items-start bg-[#ffffff]">
      <div className="w-10 h-10 rounded-full bg-[var(--surface-1)] flex items-center justify-center mb-4 text-[var(--primary)] border border-[var(--border)]">
        <BookOpen className="w-5 h-5" />
      </div>
      <h3 className="text-[16px] font-bold text-[var(--foreground)] mb-2 m-0">Need more targeted practice?</h3>
      <p className="text-[14px] text-[var(--muted-foreground)] mb-6 leading-relaxed mt-0">
        Upload your resume and target job to generate personalized mock sessions.
      </p>
      <Link to="/personalized-practice" className="mt-auto w-full flex items-center justify-center h-10 rounded-lg bg-[var(--surface-1)] text-[var(--foreground)] text-[14px] font-semibold hover:bg-[var(--border)] transition-colors border border-[var(--border)] cursor-pointer">
        Try Personalized Practice →
      </Link>
    </div>
  );
}

// ─── Page (rendered inside DashboardLayout) ───────────────
export function QuickMockPage() {
  const navigate = useNavigate();

  const handleStart = (company: string, role: string, difficulty: Difficulty, duration: number) => {
    navigate(`/session-confirm?session=1&company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}&difficulty=${difficulty}&duration=${duration}`);
  };

  return (
    <DashboardLayout headerTitle="Quick Mock" fullBleed>
      <WidePageContainer maxWidth="none">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]" style={{ gap: '24px', alignItems: 'start' }}>
          <div className="flex flex-col min-w-0">
            <QuickMockBuilder onStart={handleStart} />
          </div>
          <div className="flex flex-col">
            <TargetedPracticeCard />
          </div>
        </div>
      </WidePageContainer>
    </DashboardLayout>
  );
}
