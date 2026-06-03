import { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, Clock, ChevronDown, ChevronRight, SlidersHorizontal, X, Check, Shield, ArrowRight, Lock, Users, Loader2 } from 'lucide-react';
import { DashboardLayout } from './dashboard-layout';
import { Link, useNavigate } from 'react-router';
import { Footer } from './home/footer';
import { getMentors } from '../../services/MentorService';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useAuth } from '@/contexts/AuthContext';
import { ApplyMentorModal } from './apply-mentor-modal';

// ─── API Types ─────────────────────────────────────────────────────────────────

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

// ─── Filter → API mappings ─────────────────────────────────────────────────────

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
  'Price: Low to high':  { sortBy: 'price',     sortDir: 'asc'  },
  'Price: High to low':  { sortBy: 'price',     sortDir: 'desc' },
  'Most reviewed':       { sortBy: 'review',   sortDir: 'desc' },
};

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

// ─── StarRating ─────────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number | null }) {
  const r = rating ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-3 h-3 ${
            i <= Math.floor(r)
              ? 'text-amber-400'
              : i - 0.5 <= r
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

// ─── FilterDropdown ─────────────────────────────────────────────────────────────

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
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-[13px] transition-all duration-150 whitespace-nowrap ${
          isActive
            ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/[6%] text-[hsl(221,91%,55%)] shadow-[0_0_0_1px_hsl(221,91%,60%)]'
            : isOpen
            ? 'border-slate-300 bg-white text-slate-700 shadow-sm'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
        }`}
      >
        <span className={isActive ? 'font-medium' : ''}>{selected || filter.label}</span>
        {isActive ? (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="w-3.5 h-3.5 rounded-full bg-[hsl(221,91%,60%)]/20 flex items-center justify-center hover:bg-[hsl(221,91%,60%)]/40 transition-colors ml-0.5"
          >
            <X className="w-2 h-2 text-[hsl(221,91%,55%)]" />
          </span>
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
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
                  ? 'bg-[hsl(221,91%,60%)]/[6%] text-[hsl(221,91%,55%)]'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{opt}</span>
              {selected === opt && <Check className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MentorCard ────────────────────────────────────────────────────────────────

function MentorCard({ mentor, isMember }: { mentor: ApiMentor; isMember: boolean }) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  const nextSlotLabel = mentor.hasSlotsThisWeek ? 'This week' : mentor.hasSlotsNextWeek ? 'Next week' : 'Check';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`bg-white rounded-xl border flex flex-col overflow-hidden transition-all duration-200 cursor-pointer ${
        hovered
          ? 'border-slate-300 shadow-[0_4px_20px_rgba(0,0,0,0.08)] -translate-y-0.5'
          : 'border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
      }`}
      onClick={() => { if (isMember) navigate(`/mentor-details?mentorId=${mentor.id}`); }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3.5">
          {mentor.avatarUrl ? (
            <img src={mentor.avatarUrl} alt={mentor.name} className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-slate-500 text-xs font-semibold">
              {mentor.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 truncate">{mentor.name}</p>
            <p className="text-[12px] text-slate-500 mt-0.5 truncate">
              {mentor.currentRole}
              <span className="text-slate-300 mx-1">·</span>
              <span className="text-slate-700 font-medium">{mentor.currentCompany}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10.5px] text-slate-400 leading-none">From</p>
            <p className="font-semibold text-[#2466f5] text-[20px] mt-0.5">${mentor.priceFrom / 100}</p>
            <p className="text-[10.5px] text-slate-400 mt-0.5">/ session</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3.5">
          <div className="flex items-center gap-1.5">
            <StarRating rating={mentor.averageRating} />
            <span className="font-semibold text-slate-700 text-[15px]">{(mentor.averageRating ?? 0).toFixed(1)}</span>
            <span className="text-[11.5px] text-slate-400 text-[12px]">({mentor.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 text-[11.5px] text-slate-500">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span className="text-[12px]">Next: <span className="font-medium text-slate-700">{nextSlotLabel}</span></span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {mentor.expertiseTags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">{tag}</span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex-1 flex flex-col gap-3">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-emerald-500" />
          <span className="text-[11.5px] text-emerald-600 font-medium">
            {mentor.hasSlotsThisWeek ? 'Available this week' : mentor.hasSlotsNextWeek ? 'Available next week' : 'No upcoming slots'}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        {isMember ? (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/mentor-details?mentorId=${mentor.id}`); }}
            className={`w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 ${
              hovered
                ? 'bg-[hsl(221,91%,60%)] text-white shadow-[0_2px_12px_hsl(221,91%,60%)/30]'
                : 'bg-[hsl(221,91%,60%)]/[8%] text-[hsl(221,91%,55%)] border border-[hsl(221,91%,60%)]/20'
            }`}
          >
            Book a Session
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button className="w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800 bg-white">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Unlock with Membership
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export function MentorMarketplaceListPage() {
  // Mentorship is included on Starter + Premium; visitors and Free users see
  // the locked / blurred view. canAccessMentorship is false while plan is
  // loading, so we avoid flashing the member view before the data arrives.
  const { canAccessMentorship } = useUserPlan();
  const { user } = useAuth();
  const isMember = canAccessMentorship;
  const isAlreadyMentor = user?.role?.toUpperCase() === 'MENTOR';
  const [isBecomeMentorOpen, setIsBecomeMentorOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openSort, setOpenSort] = useState(false);
  const [filters, setFilters] = useState<Record<string, string | null>>({
    role: null, price: null, availability: null, rating: null,
  });
  const [sortBy, setSortBy] = useState('Top rated');
  const sortRef = useRef<HTMLDivElement>(null);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const [mentors, setMentors] = useState<ApiMentor[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(false);

  const fetchMentorList = useCallback(async () => {
    setLoadingMentors(true);
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
      const data = res.data?.data?.content ?? res.data?.content ?? [];
      setMentors(Array.isArray(data) ? data : []);
    } catch {
      setMentors([]);
    } finally {
      setLoadingMentors(false);
    }
  }, [filters, sortBy]);

  useEffect(() => {
    fetchMentorList();
  }, [fetchMentorList]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setOpenSort(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <DashboardLayout>
      <div className="w-full space-y-16 pb-24 pt-28 bg-white -mx-6 px-6 -mt-8 bg-[#f9fafb]">

        {/* ── Non-member soft banner ─────────────────────────────────────────── */}
        {!isMember && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-[hsl(221,91%,60%)]/15 bg-[hsl(221,91%,60%)]/[4%]">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[hsl(221,91%,60%)]/15 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" />
              </div>
              <p className="text-[13px] text-slate-600">
                <span className="font-medium text-slate-800">Browse freely.</span>{' '}
                Mentorship sessions are available to members. Booking is unlocked when you join.
              </p>
            </div>
            <Link to="/pricing" className="shrink-0">
              <button className="flex items-center gap-1.5 text-[12.5px] font-medium text-[hsl(221,91%,60%)] hover:text-[hsl(221,91%,50%)] transition-colors whitespace-nowrap">
                Explore plans
                <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 — What you can get help with
        ════════════════════════════════════════════════════════════════════ */}
        
        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2 — Mentor discovery
        ════════════════════════════════════════════════════════════════════ */}
                <section className="relative min-h-[500px]">
          {/* Content container - Blurred when locked */}
          <div className={`transition-all duration-500 ${!isMember ? 'blur-[8px] pointer-events-none select-none opacity-50' : ''}`}>
            <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2
                  className="font-semibold text-slate-900 text-[32px]"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  Find a mentor
                </h2>
                <p className="text-[13px] text-slate-400 mt-1">
                  {mentors.length} verified mentors · updated weekly
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2 flex-wrap">
                {isMember && (
                  <Link
                    to="/history?tab=mentor"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-sm whitespace-nowrap"
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    View My Sessions
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  </Link>
                )}
                <button
                  onClick={() => setIsBecomeMentorOpen(true)}
                  disabled={isAlreadyMentor}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/25 bg-primary/6 text-primary text-[13px] hover:bg-primary/12 hover:border-primary/40 transition-all duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary/6 disabled:hover:border-primary/25"
                  style={{ fontWeight: 500 }}
                >
                  {isAlreadyMentor ? 'Mentor Application Submitted' : 'Apply to Become a Mentor'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter bar */}
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {activeFilterCount > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-[12px] text-slate-500">
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}</span>
                  </div>
                )}
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
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${openSort ? 'rotate-180' : ''}`} />
                </button>
                {openSort && (
                  <div className="absolute top-full right-0 mt-1.5 w-48 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-900/[0.06] z-30 py-1.5">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setSortBy(opt); setOpenSort(false); }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-[13px] transition-colors ${
                          sortBy === opt ? 'bg-[hsl(221,91%,60%)]/[6%] text-[hsl(221,91%,55%)]' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                        {sortBy === opt && <Check className="w-3.5 h-3.5 text-[hsl(221,91%,60%)]" strokeWidth={2.5} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mentor grid */}
            {loadingMentors ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : mentors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <p className="text-[14px]">No mentors found for the selected filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {mentors.map((mentor) => (
                  <MentorCard key={mentor.id} mentor={mentor} isMember={isMember} />
                ))}
              </div>
            )}

          </div>

          {/* Locked Overlay - UI following provided design */}
          {!isMember && (
            <div className="absolute inset-0 flex items-center justify-center z-30">
              <div className="w-full max-w-[440px] bg-white rounded-3xl p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-100/50">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                  <Lock className="w-6 h-6 text-blue-500" strokeWidth={2} />
                </div>

                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 mb-5">
                  <Shield className="w-3 h-3 text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Paid members only</span>
                </div>

                {/* Title & Description */}
                <h2 className="text-[26px] font-bold text-slate-900 mb-3 tracking-tight">Unlock Mentorship</h2>
                <p className="text-[15px] text-slate-500 leading-relaxed mb-8">
                  Get access to 1:1 sessions with mentors from top tech companies. Available on paid plans.
                </p>

                {/* Features List */}
                <ul className="space-y-4 mb-10">
                  {[
                    "Book sessions with mentors from Google, Meta, Stripe and more",
                    "Get personalized guidance on interviews, resume, and career planning",
                    "Revisit key takeaways after your sessions with written summaries"
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3.5">
                      <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-blue-500" strokeWidth={3} />
                      </div>
                      <span className="text-[14.5px] text-slate-600 leading-snug">{text}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Buttons */}
                <div className="space-y-4 text-center">
                  <button className="w-full py-4 rounded-xl bg-[hsl(221,91%,60%)] text-white text-[15px] font-semibold hover:bg-[hsl(221,91%,55%)] transition-all shadow-[0_4px_20px_rgba(67,118,248,0.25)] active:scale-[0.98]">
                    Upgrade to unlock
                  </button>
                  <Link to="/pricing" className="inline-block text-[14px] font-medium text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-4">
                    See all plans
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>


      </div>

      <ApplyMentorModal
        open={isBecomeMentorOpen}
        onClose={() => setIsBecomeMentorOpen(false)}
      />

      <Footer />
    </DashboardLayout>
  );
}
