import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown, Lock, Check, Calendar, Clock, ArrowRight,
  Shield, BookOpen, ChevronRight, Sparkles, X, SlidersHorizontal,
} from 'lucide-react';
import { DashboardLayout } from './dashboard-layout';

// ─── Data ─────────────────────────────────────────────────────────────────────

const MENTORS = [
  {
    id: 1,
    name: 'Priya Mehta',
    role: 'Senior Product Manager',
    company: 'Google',
    tags: ['PM Interviews', 'Product Strategy', 'FAANG Prep'],
    focus: 'Cracking PM interviews at top-tier companies',
    rating: 4.9,
    reviews: 127,
    price: 120,
    nextSlot: 'Tomorrow',
    slotsThisWeek: 4,
    avatar: 'https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  },
  {
    id: 2,
    name: 'James Liu',
    role: 'Staff Software Engineer',
    company: 'Stripe',
    tags: ['System Design', 'Backend', 'Coding Interviews'],
    focus: 'System design deep-dives and backend interview prep',
    rating: 4.8,
    reviews: 89,
    price: 90,
    nextSlot: 'Thu',
    slotsThisWeek: 6,
    avatar: 'https://images.unsplash.com/photo-1600896997793-b8ed3459a17f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  },
  {
    id: 3,
    name: 'Sofia Reyes',
    role: 'Data Scientist',
    company: 'Meta',
    tags: ['Data Science', 'ML Concepts', 'Career Transitions'],
    focus: 'Career transitions into data and ML roles',
    rating: 4.7,
    reviews: 64,
    price: 80,
    nextSlot: 'Fri',
    slotsThisWeek: 3,
    avatar: 'https://images.unsplash.com/photo-1762522921456-cdfe882d36c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  },
  {
    id: 4,
    name: 'Alex Chen',
    role: 'Product Designer',
    company: 'Airbnb',
    tags: ['Portfolio Review', 'Design Process', 'Case Studies'],
    focus: 'Design portfolios and product case study coaching',
    rating: 4.8,
    reviews: 52,
    price: 70,
    nextSlot: 'Mon',
    slotsThisWeek: 5,
    avatar: 'https://images.unsplash.com/photo-1774813958486-4c180dcda729?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  },
  {
    id: 5,
    name: 'Marcus Webb',
    role: 'ML Engineer',
    company: 'OpenAI',
    tags: ['ML Systems', 'Research Interviews', 'AI Careers'],
    focus: 'ML system design and research role interviews',
    rating: 5.0,
    reviews: 31,
    price: 150,
    nextSlot: 'Wed',
    slotsThisWeek: 2,
    avatar: 'https://images.unsplash.com/photo-1588178454780-441fa5b99fa5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  },
  {
    id: 6,
    name: 'Dana Park',
    role: 'Engineering Manager',
    company: 'Datadog',
    tags: ['EM Interviews', 'Leadership', 'Career Growth'],
    focus: 'Engineering leadership transitions and EM interviews',
    rating: 4.6,
    reviews: 78,
    price: 100,
    nextSlot: 'Thu',
    slotsThisWeek: 3,
    avatar: 'https://images.unsplash.com/photo-1690166444493-b3f5fbcd4762?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200',
  },
];

const FILTERS = [
  {
    id: 'role',
    label: 'Role / Industry',
    options: ['Software Engineering', 'Product Management', 'Data Science', 'Design', 'Eng. Management'],
  },
  {
    id: 'price',
    label: 'Price Range',
    options: ['$0–$50', '$50–$100', '$100+'],
  },
  {
    id: 'availability',
    label: 'Availability',
    options: ['Has slots this week', 'Next week', 'Flexible'],
  },
  {
    id: 'rating',
    label: 'Rating',
    options: ['4.0+', '4.5+', '5.0 only'],
  },
];

const SORT_OPTIONS = ['Top rated', 'Price: Low to high', 'Price: High to low', 'Most reviewed'];

// ─── StarRating ────────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-3 h-3 ${
            i <= Math.floor(rating)
              ? 'text-amber-400'
              : i - 0.5 <= rating
              ? 'text-amber-300'
              : 'text-slate-200'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ─── FilterDropdown ────────────────────────────────────────────────────────────

function FilterDropdown({
  filter,
  selected,
  isOpen,
  onToggle,
  onSelect,
  onClear,
}: {
  filter: (typeof FILTERS)[0];
  selected: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (val: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && isOpen) {
        onToggle();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onToggle]);

  const isActive = !!selected;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-[13px] transition-all duration-150 whitespace-nowrap ${
          isActive
            ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/6 text-[hsl(221,91%,55%)] shadow-[0_0_0_1px_hsl(221,91%,60%)]'
            : isOpen
            ? 'border-slate-300 bg-white text-slate-700 shadow-sm'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
        }`}
      >
        <span className={isActive ? 'font-medium' : ''}>{selected || filter.label}</span>
        {isActive ? (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="w-3.5 h-3.5 rounded-full bg-[hsl(221,91%,60%)]/20 flex items-center justify-center hover:bg-[hsl(221,91%,60%)]/40 transition-colors ml-0.5"
          >
            <X className="w-2 h-2 text-[hsl(221,91%,55%)]" />
          </span>
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-52 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-900/[0.06] z-30 py-1.5 overflow-hidden">
          {filter.options.map((opt) => (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              className={`w-full flex items-center justify-between px-3.5 py-2 text-[13px] transition-colors ${
                selected === opt
                  ? 'bg-[hsl(221,91%,60%)]/6 text-[hsl(221,91%,55%)]'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{opt}</span>
              {selected === opt && (
                <Check className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" strokeWidth={2.5} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MentorCard ────────────────────────────────────────────────────────────────

function MentorCard({ mentor }: { mentor: (typeof MENTORS)[0] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`bg-white rounded-xl border flex flex-col overflow-hidden transition-all duration-200 ${
        hovered
          ? 'border-slate-300 shadow-[0_4px_20px_rgba(0,0,0,0.08)] -translate-y-0.5'
          : 'border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
      }`}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3.5">
          <img
            src={mentor.avatar}
            alt={mentor.name}
            className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 truncate">{mentor.name}</p>
            <p className="text-[12px] text-slate-500 mt-0.5 truncate">
              {mentor.role}
              <span className="text-slate-300"> · </span>
              <span className="text-slate-600 font-medium">{mentor.company}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[15px] font-semibold text-slate-900">${mentor.price}</p>
            <p className="text-[10.5px] text-slate-400 mt-0.5">/ session</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {mentor.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 py-4 flex-1 flex flex-col gap-3">
        <p className="text-[12.5px] text-slate-500 leading-snug italic">"{mentor.focus}"</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <StarRating rating={mentor.rating} />
            <span className="text-[12px] font-semibold text-slate-700">{mentor.rating.toFixed(1)}</span>
            <span className="text-[11.5px] text-slate-400">({mentor.reviews})</span>
          </div>
          <div className="flex items-center gap-1 text-[11.5px] text-slate-500">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>
              Next: <span className="font-medium text-slate-700">{mentor.nextSlot}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-emerald-500" />
          <span className="text-[11.5px] text-emerald-600 font-medium">
            {mentor.slotsThisWeek} slot{mentor.slotsThisWeek !== 1 ? 's' : ''} this week
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <button
          className={`w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 ${
            hovered
              ? 'bg-[hsl(221,91%,60%)] text-white shadow-[0_2px_12px_hsl(221,91%,60%)/30]'
              : 'bg-[hsl(221,91%,60%)]/8 text-[hsl(221,91%,55%)] border border-[hsl(221,91%,60%)]/20'
          }`}
        >
          Book a Session
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Ghost card (locked preview) ──────────────────────────────────────────────

function GhostMentorCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1">
            <div className="h-3.5 bg-slate-200 rounded w-28 mb-2" />
            <div className="h-2.5 bg-slate-100 rounded w-36" />
          </div>
          <div className="text-right">
            <div className="h-4 bg-slate-200 rounded w-12 mb-1" />
            <div className="h-2.5 bg-slate-100 rounded w-10" />
          </div>
        </div>
        <div className="flex gap-1.5 mt-3">
          {[60, 72, 52].map((w, i) => (
            <div key={i} className="h-5 bg-slate-100 rounded-md" style={{ width: w }} />
          ))}
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="h-2.5 bg-slate-100 rounded w-full" />
        <div className="h-2.5 bg-slate-100 rounded w-4/5" />
        <div className="flex justify-between">
          <div className="h-2.5 bg-slate-100 rounded w-24" />
          <div className="h-2.5 bg-slate-100 rounded w-16" />
        </div>
      </div>
      <div className="px-5 pb-5">
        <div className="h-9 bg-slate-100 rounded-lg w-full" />
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function MentorshipPage() {
  const [isMember, setIsMember] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openSort, setOpenSort] = useState(false);
  const [filters, setFilters] = useState<Record<string, string | null>>({
    role: null,
    price: null,
    availability: null,
    rating: null,
  });
  const [sortBy, setSortBy] = useState('Top rated');
  const sortRef = useRef<HTMLDivElement>(null);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setOpenSort(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleFilterSelect = (filterId: string, value: string) => {
    setFilters((prev) => ({ ...prev, [filterId]: value }));
    setOpenDropdown(null);
  };

  const handleFilterClear = (filterId: string) => {
    setFilters((prev) => ({ ...prev, [filterId]: null }));
  };

  const handleToggleDropdown = (id: string) => {
    setOpenDropdown((prev) => (prev === id ? null : id));
  };

  return (
    <DashboardLayout headerTitle="Mentorship" noSidebar>
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-16">

        {/* ── Demo toggle ─────────────────────────────────────────────────── */}
        <div className="flex justify-end mb-5">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
            <span className="text-[11px] text-slate-400 uppercase tracking-wide">Preview:</span>
            <button
              onClick={() => setIsMember(true)}
              className={`text-[12px] px-2.5 py-1 rounded-md transition-colors ${
                isMember ? 'bg-[hsl(221,91%,60%)] text-white font-medium' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Member
            </button>
            <button
              onClick={() => setIsMember(false)}
              className={`text-[12px] px-2.5 py-1 rounded-md transition-colors ${
                !isMember ? 'bg-slate-700 text-white font-medium' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Locked
            </button>
          </div>
        </div>

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-[#0F172A] font-bold text-[40px] font-[family-name:var(--font-serif)]">
                Mentorship
              </h1>
              {isMember && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[hsl(221,91%,60%)]/10 border border-[hsl(221,91%,60%)]/20 text-[11px] font-medium text-[hsl(221,91%,55%)]">
                  <Sparkles className="w-2.5 h-2.5" />
                  Member access
                </span>
              )}
            </div>
            <p className="text-slate-500 max-w-2xl">
              Book 1:1 sessions with industry mentors to get guidance at the right moment.
            </p>
          </div>
          <button className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-colors shadow-sm whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            My Sessions
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>

        {/* ── Member view ──────────────────────────────────────────────────── */}
        {isMember ? (
          <>
            {/* Filter bar */}
            <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {activeFilterCount > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-[12px] text-slate-500">
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>
                      {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {FILTERS.map((filter) => (
                  <FilterDropdown
                    key={filter.id}
                    filter={filter}
                    selected={filters[filter.id]}
                    isOpen={openDropdown === filter.id}
                    onToggle={() => handleToggleDropdown(filter.id)}
                    onSelect={(val) => handleFilterSelect(filter.id, val)}
                    onClear={() => handleFilterClear(filter.id)}
                  />
                ))}
                {activeFilterCount > 0 && (
                  <button
                    onClick={() =>
                      setFilters({ role: null, price: null, availability: null, rating: null })
                    }
                    className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors px-1"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="relative" ref={sortRef}>
                <button
                  onClick={() => setOpenSort((v) => !v)}
                  className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <span className="text-slate-400">Sort by:</span>
                  <span className="font-medium text-slate-700">{sortBy}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                      openSort ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openSort && (
                  <div className="absolute top-full right-0 mt-1.5 w-48 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-900/[0.06] z-30 py-1.5">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setSortBy(opt);
                          setOpenSort(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-[13px] transition-colors ${
                          sortBy === opt
                            ? 'bg-[hsl(221,91%,60%)]/6 text-[hsl(221,91%,55%)]'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                        {sortBy === opt && (
                          <Check
                            className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]"
                            strokeWidth={2.5}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mentor grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {MENTORS.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
            </div>

            {/* Footer trust line */}
            <div className="mt-8 flex items-center justify-center gap-2 text-[12.5px] text-slate-400">
              <Shield className="w-3.5 h-3.5" />
              <span>All mentors are verified. Sessions include a written follow-up summary.</span>
            </div>
          </>
        ) : (
          /* ── Locked state ──────────────────────────────────────────────── */
          <div className="relative">
            {/* Blurred ghost layer */}
            <div
              className="pointer-events-none select-none"
              style={{ filter: 'blur(5px)', opacity: 0.38 }}
              aria-hidden="true"
            >
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                {FILTERS.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-500"
                  >
                    {f.label}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                ))}
                <div className="ml-auto text-[13px] text-slate-400">Sort by: Top rated</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <GhostMentorCard key={i} />
                ))}
              </div>
            </div>

            {/* Upgrade overlay card */}
            <div className="absolute inset-0 flex items-center justify-center py-12">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_8px_40px_rgba(0,0,0,0.10)] p-8 w-full max-w-[420px] mx-4">
                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-[hsl(221,91%,60%)]/10 flex items-center justify-center mb-5">
                  <Lock className="w-5 h-5 text-[hsl(221,91%,60%)]" strokeWidth={2} />
                </div>

                {/* Badge */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-medium text-slate-500 mb-3">
                  <Shield className="w-2.5 h-2.5" />
                  Paid members only
                </span>

                <h2
                  className="text-[20px] font-semibold text-slate-900 mb-2"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  Unlock Mentorship
                </h2>
                <p className="text-[13.5px] text-slate-500 leading-relaxed mb-6">
                  Get access to 1:1 sessions with mentors from top tech companies. Available on paid
                  plans.
                </p>

                {/* Value bullets */}
                <ul className="space-y-2.5 mb-7">
                  {[
                    'Book sessions with mentors from Google, Meta, Stripe and more',
                    'Get personalized guidance on interviews, resume, and career planning',
                    'Revisit key takeaways after your sessions with written summaries',
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[hsl(221,91%,60%)]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check
                          className="w-2.5 h-2.5 text-[hsl(221,91%,60%)]"
                          strokeWidth={3}
                        />
                      </div>
                      <span className="text-[13px] text-slate-600 leading-snug">{text}</span>
                    </li>
                  ))}
                </ul>

                {/* CTAs */}
                <button className="w-full py-2.5 rounded-lg bg-[hsl(221,91%,60%)] text-white text-[13.5px] font-semibold hover:bg-[hsl(221,91%,55%)] transition-colors shadow-[0_2px_10px_rgba(67,118,248,0.25)] mb-3">
                  Upgrade to unlock
                </button>
                <div className="text-center">
                  <button className="text-[13px] text-slate-500 hover:text-slate-700 transition-colors underline underline-offset-2">
                    See all plans
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
