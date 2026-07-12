import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, Check, X } from 'lucide-react';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { WidePageContainer } from '@/components/newDesign/dashboard-page';
import { getMentors } from '@/services/MentorService';
import { ApplyMentorModal } from '@/components/newDesign/apply-mentor-modal';
import { useAuth } from '@/contexts/AuthContext';
import { hasMentorRole } from '@/components/mentor/dashboard-mode';

// SVG path data (inlined from the new design's MentorCard import).
const cardSvg = {
  p333d5300: 'M9.5 2H2.5C1.94772 2 1.5 2.44772 1.5 3V10C1.5 10.5523 1.94772 11 2.5 11H9.5C10.0523 11 10.5 10.5523 10.5 10V3C10.5 2.44772 10.0523 2 9.5 2Z',
  p39e78a00: 'M5.4294 1.7562C5.6094 1.2036 6.3912 1.2036 6.5706 1.7562L7.2126 3.7314C7.25182 3.85169 7.32807 3.95651 7.43044 4.03086C7.53282 4.10522 7.65607 4.14531 7.7826 4.1454H9.8598C10.4412 4.1454 10.6824 4.8894 10.2126 5.2314L8.5326 6.4518C8.43002 6.52622 8.35363 6.63121 8.3144 6.75171C8.27517 6.87222 8.2751 7.00205 8.3142 7.1226L8.9562 9.0978C9.1362 9.6504 8.5032 10.1106 8.0322 9.7686L6.3522 8.5482C6.24972 8.4738 6.12634 8.43373 5.9997 8.43373C5.87307 8.43373 5.74968 8.4738 5.6472 8.5482L3.9672 9.7686C3.4968 10.1106 2.8644 9.6504 3.0438 9.0978L3.6858 7.1226C3.7249 7.00205 3.72483 6.87222 3.6856 6.75171C3.64637 6.63121 3.56998 6.52622 3.4674 6.4518L1.788 5.232C1.3182 4.89 1.56 4.146 2.1408 4.146H4.2174C4.34403 4.14603 4.46742 4.106 4.56991 4.03164C4.67241 3.95727 4.74875 3.85239 4.788 3.732L5.43 1.7568L5.4294 1.7562Z',
  p3e7757b0: 'M6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11Z',
  pf23dd00: 'M7 2.91667L11.0833 7L7 11.0833',
};

// ─── Data ─────────────────────────────────────────────────────────────────────

// Shape consumed by the mentor card (kept identical to the original MENTORS items).
interface Mentor {
  id: string | number;
  name: string;
  title: string;
  company: string;
  avatarUrl?: string;
  price: number;
  rating: number;
  reviews: number;
  next: string;
  tags: string[];
  quote: string;
  slots: number;
}

// Raw mentor object returned by GET /mentorship/mentors (see MentorService).
interface ApiMentor {
  id: string;
  name: string;
  currentRole: string;
  currentCompany: string;
  avatarUrl: string;
  expertiseTags: string[];
  priceFrom: number;
  averageRating: number | null;
  reviewCount: number;
  hasSlotsThisWeek: boolean;
  hasSlotsNextWeek: boolean;
}

// Map an API mentor into the exact field shape the card consumes. Fields without
// an API equivalent fall back gracefully:
//   - next:  derived from the week-availability booleans (no exact date in list API)
//   - quote: empty (mentor bio/quote isn't in the list response)
//   - slots: 0 (list API only exposes boolean week flags, not a slot count)
function mapApiMentor(m: ApiMentor): Mentor {
  return {
    id: m.id,
    name: m.name ?? '',
    title: m.currentRole ?? '',
    company: m.currentCompany ?? '',
    avatarUrl: m.avatarUrl ?? '',
    price: typeof m.priceFrom === 'number' ? m.priceFrom / 100 : 0,
    rating: m.averageRating ?? 0,
    reviews: m.reviewCount ?? 0,
    next: m.hasSlotsThisWeek ? 'This week' : m.hasSlotsNextWeek ? 'Next week' : 'Check',
    tags: m.expertiseTags ?? [],
    quote: '',
    slots: 0,
  };
}

const COMPANY_COLORS: Record<string, string> = {
  Google: '#4285F4', Stripe: '#6772E5', Meta: '#0866FF',
  Airbnb: '#FF5A5F', OpenAI: '#10A37F', Datadog: '#632CA6',
};

// ─── Filter / sort config (kept in sync with mentorship-marketplace.tsx) ──────

const PRICE_TO_PARAMS: Record<string, { priceMin?: number; priceMax?: number }> = {
  '$0–$50':    { priceMin: 0,     priceMax: 5000 },
  '$50–$100':  { priceMin: 5000,  priceMax: 10000 },
  '$100+':     { priceMin: 10000 },
};
const AVAIL_TO_API: Record<string, string> = {
  'Has slots this week': 'THIS_WEEK',
  'Next week':           'NEXT_WEEK',
  'Flexible':            'FLEXIBLE',
};
const RATING_TO_MIN: Record<string, number> = {
  '4.0+': 4.0, '4.5+': 4.5, '5.0 only': 5.0,
};
const SORT_TO_API: Record<string, { sortBy: string; sortDir: 'asc' | 'desc' }> = {
  'Top rated':           { sortBy: 'rating', sortDir: 'desc' },
  'Price: Low to high':  { sortBy: 'price',  sortDir: 'asc'  },
  'Price: High to low':  { sortBy: 'price',  sortDir: 'desc' },
  'Most reviewed':       { sortBy: 'review', sortDir: 'desc' },
};

const FILTERS = [
  { id: 'role',         label: 'Role / Industry', options: ['Software Engineering', 'Product Management', 'Data Science', 'Design', 'Eng. Management'] },
  { id: 'price',        label: 'Price Range',      options: ['$0–$50', '$50–$100', '$100+'] },
  { id: 'availability', label: 'Availability',     options: ['Has slots this week', 'Next week', 'Flexible'] },
  { id: 'rating',       label: 'Rating',           options: ['4.0+', '4.5+', '5.0 only'] },
] as const;

const SORT_OPTIONS = ['Top rated', 'Price: Low to high', 'Price: High to low', 'Most reviewed'];

// ─── Mentor card ─────────────────────────────────────────────────────────────

function MentorCard({ mentor, onBook }: { mentor: Mentor; onBook: () => void }) {
  return (
    <div
      className="bg-white relative flex flex-col"
      style={{ borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0px 1px 4px 0px rgba(0,0,0,0.04)' }}
    >
      {/* ── Top section ── */}
      <div
        className="flex flex-col items-start relative"
        style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}
      >
        {/* Row 1: avatar + name/title + price */}
        <div className="flex items-start w-full" style={{ gap: '14px' }}>
          {/* Avatar */}
          <div
            className="rounded-full shrink-0 overflow-hidden"
            style={{ width: '40px', height: '40px', boxShadow: '0 0 0 2px var(--surface-1), 0 1px 3px rgba(0,0,0,0.1)' }}
          >
            {mentor.avatarUrl ? (
              <img
                src={mentor.avatarUrl}
                alt={mentor.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: COMPANY_COLORS[mentor.company] || 'var(--primary)', color: '#fff', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '15px', letterSpacing: '0.5px' }}
              >
                {mentor.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
              </div>
            )}
          </div>

          {/* Name + title */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '14px', lineHeight: '21px', color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {mentor.name}
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', lineHeight: '18px', color: 'var(--muted-foreground)', marginTop: '2px', whiteSpace: 'nowrap' }}>
              <span>{mentor.title}</span>
              <span style={{ color: 'var(--border)' }}> · </span>
              <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{mentor.company}</span>
            </p>
          </div>

          {/* Price */}
          <div className="shrink-0 text-right">
            <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '20px', lineHeight: '30px', color: 'var(--primary)' }}>
              ${mentor.price}
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '10.5px', lineHeight: '15.75px', color: 'var(--muted-foreground)', textAlign: 'right' }}>
              / session
            </p>
          </div>
        </div>

        {/* Row 2: stars + rating + next */}
        <div className="flex items-center justify-between w-full" style={{ marginTop: '14px' }}>
          {/* Stars + score + reviews */}
          <div className="flex items-center" style={{ gap: '6px' }}>
            <div className="flex items-center" style={{ gap: '2px' }}>
              {[1, 2, 3, 4, 5].map(i => {
                const filled = i <= Math.floor(mentor.rating);
                const partial = !filled && i === Math.ceil(mentor.rating) && mentor.rating % 1 > 0;
                return (
                  <div key={i} className="relative shrink-0" style={{ width: '12px', height: '12px' }}>
                    <svg className="absolute block inset-0 w-full h-full" fill="none" viewBox="0 0 12 12">
                      <path d={cardSvg.p39e78a00} fill={filled ? '#FFB900' : partial ? '#FFD230' : 'var(--border)'} />
                    </svg>
                  </div>
                );
              })}
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '15px', lineHeight: '22.5px', color: 'var(--foreground)' }}>
              {mentor.rating.toFixed(1)}
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', lineHeight: '18px', color: 'var(--muted-foreground)' }}>
              ({mentor.reviews})
            </span>
          </div>

          {/* Calendar + next */}
          <div className="flex items-center" style={{ gap: '4px' }}>
            <div className="relative shrink-0" style={{ width: '12px', height: '12px' }}>
              <svg className="absolute block inset-0 w-full h-full" fill="none" viewBox="0 0 12 12">
                <path d="M4 1V3" stroke="var(--muted-foreground)" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 1V3" stroke="var(--muted-foreground)" strokeLinecap="round" strokeLinejoin="round" />
                <path d={cardSvg.p333d5300} stroke="var(--muted-foreground)" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1.5 5H10.5" stroke="var(--muted-foreground)" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', lineHeight: '18px', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
              <span>Next: </span>
              <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{mentor.next}</span>
            </p>
          </div>
        </div>

        {/* Row 3: tags */}
        <div className="flex flex-wrap" style={{ gap: '6px', marginTop: '12px' }}>
          {mentor.tags.map(tag => (
            <div
              key={tag}
              style={{ background: 'var(--secondary)', borderRadius: '6px', padding: '2px 8px', display: 'flex', alignItems: 'center' }}
            >
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '11px', lineHeight: '16.5px', color: 'var(--secondary-foreground)', whiteSpace: 'nowrap' }}>
                {tag}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Middle section: quote + slots ── */}
      <div
        className="flex flex-col flex-1"
        style={{ padding: '16px 20px', gap: '12px' }}
      >
        <p style={{ fontFamily: 'var(--font-sans)', fontStyle: 'italic', fontSize: '12.5px', lineHeight: '17px', color: 'var(--muted-foreground)' }}>
          {mentor.quote}
        </p>
        <div className="flex items-center" style={{ gap: '4px' }}>
          <div className="relative shrink-0" style={{ width: '12px', height: '12px' }}>
            <svg className="absolute block inset-0 w-full h-full" fill="none" viewBox="0 0 12 12">
              <g clipPath="url(#slots-clip)">
                <path d={cardSvg.p3e7757b0} stroke="var(--accent)" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 3V6L8 7" stroke="var(--accent)" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <defs><clipPath id="slots-clip"><rect fill="white" width="12" height="12" /></clipPath></defs>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: '11.5px', lineHeight: '17px', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
            {mentor.slots} slots this week
          </span>
        </div>
      </div>

      {/* ── Bottom section: Book button ── */}
      <div style={{ padding: '0 20px 20px' }}>
        <button
          onClick={onBook}
          className="relative w-full transition-opacity hover:opacity-90"
          style={{ height: '40px', background: 'color-mix(in srgb, var(--primary) 8%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)', borderRadius: 'var(--radius)', fontFamily: 'var(--font-sans)' }}
        >
          <span style={{ fontWeight: 600, fontSize: '13px', lineHeight: '18px', color: 'var(--primary)' }}>
            Book a Session
          </span>
          <div className="relative shrink-0" style={{ width: '14px', height: '14px' }}>
            <svg className="absolute block inset-0 w-full h-full" fill="none" viewBox="0 0 14 14">
              <path d="M2.91667 7H11.0833" stroke="var(--primary)" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
              <path d={cardSvg.pf23dd00} stroke="var(--primary)" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────

function FilterDropdown({
  filter,
  selected,
  isOpen,
  onToggle,
  onSelect,
  onClear,
}: {
  filter: (typeof FILTERS)[number];
  selected: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (val: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && isOpen) onToggle();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onToggle]);

  const isActive = !!selected;
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 transition-colors hover:bg-secondary"
        style={{
          border: `1px solid ${isActive ? 'color-mix(in srgb, var(--primary) 45%, transparent)' : 'var(--border)'}`,
          background: isActive ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : '#ffffff',
          borderRadius: '9999px', padding: '6px 14px', fontFamily: 'var(--font-sans)', fontSize: '13px',
          fontWeight: 500, color: isActive ? 'var(--primary)' : 'var(--foreground)', whiteSpace: 'nowrap',
        }}
      >
        {selected || filter.label}
        {isActive ? (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
            style={{ width: '14px', height: '14px', background: 'color-mix(in srgb, var(--primary) 20%, transparent)' }}
          >
            <X style={{ width: '8px', height: '8px', color: 'var(--primary)' }} />
          </span>
        ) : (
          <ChevronDown style={{ width: '14px', height: '14px', color: 'var(--muted-foreground)', transition: 'transform 150ms', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
        )}
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 z-30 overflow-hidden"
          style={{ marginTop: '6px', width: '208px', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '6px 0' }}
        >
          {filter.options.map((opt) => {
            const active = selected === opt;
            return (
              <button
                key={opt}
                onClick={() => onSelect(opt)}
                className="w-full flex items-center justify-between transition-colors hover:bg-secondary"
                style={{ padding: '8px 14px', fontFamily: 'var(--font-sans)', fontSize: '13px', color: active ? 'var(--primary)' : 'var(--foreground)', background: active ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : 'transparent' }}
              >
                <span>{opt}</span>
                {active && <Check style={{ width: '14px', height: '14px', color: 'var(--primary)' }} strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Hero banner ──────────────────────────────────────────────────────────────

function HeroBanner({ onApply, isAlreadyMentor }: { onApply: () => void; isAlreadyMentor: boolean }) {
  return (
    <section
      aria-label="Coaching hero"
      className="relative overflow-hidden flex flex-col justify-center"
      style={{
        background: 'linear-gradient(to right, #fffcf8, #f2fbf6 48%, #f6f1ff)',
        borderRadius: 0,
        padding: '40px 32px 36px',
        marginTop: 0,
        marginRight: -32,
        marginBottom: 28,
        marginLeft: -32,
        minHeight: '236px',
      }}
    >
      {/* Decorative: soft wash right (aria-hidden) */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ width: '420px', height: '420px', right: '-80px', top: '-144px', background: 'radial-gradient(circle, rgba(255,255,255,0.52) 0%, transparent 70%)', borderRadius: '50%' }}
      />
      {/* Decorative: soft wash left */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ width: '300px', height: '190px', left: '-135px', bottom: '-60px', background: 'radial-gradient(ellipse, rgba(255,255,255,0.52) 0%, transparent 70%)' }}
      />
      {/* Decorative: calendar texture motif */}
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ right: 0, top: 0, width: '420px', height: '100%' }}
        fill="none"
        viewBox="0 0 420 200"
        preserveAspectRatio="xMaxYMid meet"
      >
        <rect fill="white" fillOpacity="0.31" height="130" rx="18" width="270" x="100" y="28" />
        {[0,1,2,3,4].map((col) => (
          <rect key={`r0-${col}`} fill={['#F59E0B','#8B5CF6','#14B8A6','#F472B6','#F59E0B'][col]} fillOpacity={col === 3 ? 0.24 : 0.11} height="16" rx="5" width="30" x={122 + col * 48} y="52" />
        ))}
        {[0,1,2,3,4].map((col) => (
          <rect key={`r1-${col}`} fill={['#8B5CF6','#14B8A6','#F472B6','#F59E0B','#8B5CF6'][col]} fillOpacity={col === 1 ? 0.24 : 0.11} height="16" rx="5" width="30" x={122 + col * 48} y={82} />
        ))}
        {[0,1,2,3,4].map((col) => (
          <rect key={`r2-${col}`} fill={['#14B8A6','#F472B6','#F59E0B','#8B5CF6','#14B8A6'][col]} fillOpacity="0.11" height="16" rx="5" width="30" x={122 + col * 48} y="112" />
        ))}
        <circle cx="350" cy="68" fill="white" fillOpacity="0.16" r="40" />
        <circle cx="350" cy="68" r="39.25" stroke="#8B5CF6" strokeOpacity="0.16" strokeWidth="1.5" />
        <circle cx="350" cy="68" fill="#8B5CF6" fillOpacity="0.26" r="13" />
        <circle cx="350" cy="68" r="12.25" stroke="white" strokeOpacity="0.7" strokeWidth="1.5" />
        <circle cx="400" cy="118" fill="#F59E0B" fillOpacity="0.22" r="11" />
        <circle cx="400" cy="118" r="10.25" stroke="white" strokeOpacity="0.7" strokeWidth="1.5" />
      </svg>

      {/* Content — in normal flow, above decorative layer */}
      <div className="relative flex flex-col gap-3" style={{ maxWidth: '560px', zIndex: 1 }}>
        <h1
          style={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 700,
            fontSize: '34px',
            lineHeight: '1.18',
            color: '#182033',
          }}
        >
          Get coached by insiders
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 400,
            fontSize: '15px',
            lineHeight: '22px',
            color: '#526070',
          }}
        >
          Compare verified mentors by role, price, availability, and rating,
          then book the right 1:1 support.
        </p>
        <div className="m-[0px] px-[0px] py-[4px]">
          <button
            onClick={onApply}
            disabled={isAlreadyMentor}
            className="flex items-center gap-1.5 transition-opacity hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: '#edf4ff',
              border: '1px solid #bfd3ff',
              borderRadius: '12px',
              height: '42px',
              padding: '0 20px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: '13px',
              color: '#3f76f6',
              boxShadow: '0px 10px 22px -8px rgba(31,82,209,0.22)',
              whiteSpace: 'nowrap',
            }}
          >
            {isAlreadyMentor ? 'Mentor Application Submitted' : 'Apply to Become a Mentor  →'}
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CoachingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isBecomeMentorOpen, setIsBecomeMentorOpen] = useState(false);
  const isAlreadyMentor = hasMentorRole(user);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openSort, setOpenSort] = useState(false);
  const [filters, setFilters] = useState<Record<string, string | null>>({
    role: null, price: null, availability: null, rating: null,
  });
  const [sortBy, setSortBy] = useState('Top rated');
  const sortRef = useRef<HTMLDivElement>(null);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const fetchMentorList = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { page: 0, size: 20 };
      if (filters.role) params.role = filters.role;
      if (filters.availability) params.availability = AVAIL_TO_API[filters.availability];
      if (filters.rating) params.ratingMin = RATING_TO_MIN[filters.rating];
      if (filters.price) {
        const p = PRICE_TO_PARAMS[filters.price];
        if (p.priceMin !== undefined) params.priceMin = p.priceMin;
        if (p.priceMax !== undefined) params.priceMax = p.priceMax;
      }
      const sort = SORT_TO_API[sortBy];
      if (sort) {
        params.sortBy = sort.sortBy;
        params.sortDir = sort.sortDir;
      }
      const res = await getMentors(params);
      const list = res.data?.data?.content ?? res.data?.content ?? res.data?.data ?? res.data ?? [];
      return Array.isArray(list) ? list.map(mapApiMentor) : [];
    } catch {
      return [];
    }
  }, [filters, sortBy]);

  useEffect(() => {
    let active = true;
    fetchMentorList().then((list) => { if (active) setMentors(list); });
    return () => { active = false; };
  }, [fetchMentorList]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setOpenSort(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <DashboardLayout headerTitle="Coaching" fullBleed>
      <WidePageContainer maxWidth="none">

        {/* ── Hero banner (Apply to Become a Mentor lives here) ── */}
        <HeroBanner onApply={() => setIsBecomeMentorOpen(true)} isAlreadyMentor={isAlreadyMentor} />

        {/* ── Available count ── */}
        <div className="flex items-start justify-between" style={{ marginBottom: '16px' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: 'var(--muted-foreground)' }}>
            {mentors.length} verified mentors available for 1:1 sessions
          </p>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: '32px' }}>
          <div className="flex items-center flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <FilterDropdown
                key={filter.id}
                filter={filter}
                selected={filters[filter.id]}
                isOpen={openDropdown === filter.id}
                onToggle={() => setOpenDropdown((p) => (p === filter.id ? null : filter.id))}
                onSelect={(val) => { setFilters((p) => ({ ...p, [filter.id]: val })); setOpenDropdown(null); }}
                onClear={() => setFilters((p) => ({ ...p, [filter.id]: null }))}
              />
            ))}
            {activeFilterCount > 0 && (
              <button
                onClick={() => setFilters({ role: null, price: null, availability: null, rating: null })}
                className="transition-colors hover:text-foreground"
                style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--muted-foreground)', padding: '0 4px' }}
              >
                Clear all
              </button>
            )}
          </div>
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setOpenSort((v) => !v)}
              className="flex items-center gap-1.5 transition-colors hover:text-foreground"
              style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--muted-foreground)' }}
            >
              <span>Sort by:</span>
              <span style={{ fontWeight: 500, color: 'var(--foreground)' }}>{sortBy}</span>
              <ChevronDown style={{ width: '14px', height: '14px', color: 'var(--muted-foreground)', transition: 'transform 150ms', transform: openSort ? 'rotate(180deg)' : 'none' }} />
            </button>
            {openSort && (
              <div
                className="absolute top-full right-0 z-30 overflow-hidden"
                style={{ marginTop: '6px', width: '192px', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '6px 0' }}
              >
                {SORT_OPTIONS.map((opt) => {
                  const active = sortBy === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => { setSortBy(opt); setOpenSort(false); }}
                      className="w-full flex items-center justify-between transition-colors hover:bg-secondary"
                      style={{ padding: '8px 14px', fontFamily: 'var(--font-sans)', fontSize: '13px', color: active ? 'var(--primary)' : 'var(--foreground)', background: active ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : 'transparent' }}
                    >
                      {opt}
                      {active && <Check style={{ width: '14px', height: '14px', color: 'var(--primary)' }} strokeWidth={2.5} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Mentor grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {mentors.map(mentor => (
            <MentorCard
              key={mentor.id}
              mentor={mentor}
              onBook={() => navigate(`/mentor-details?mentorId=${mentor.id}`)}
            />
          ))}
        </div>

      </WidePageContainer>

      <ApplyMentorModal
        open={isBecomeMentorOpen}
        onClose={() => setIsBecomeMentorOpen(false)}
      />
    </DashboardLayout>
  );
}
