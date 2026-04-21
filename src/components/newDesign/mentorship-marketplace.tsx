import { useState, useRef, useEffect } from 'react';
import {
  FileText, Target, Mic, Search, TrendingUp, Globe,
  Calendar, Clock, ChevronDown, ChevronRight, ChevronLeft, SlidersHorizontal,
  X, Check, Shield, Sparkles, ArrowRight, Lock,
  Users, Plus, Minus, BookOpen, Star, MessageSquare,
} from 'lucide-react';
import { DashboardLayout } from './dashboard-layout';
import { Link, useNavigate } from 'react-router';
import { Footer } from './home/footer';

// ─── Color palette helper ──────────────────────────────────────────────────────

const colorMap: Record<string, { bg: string; text: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600' },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-600' },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-600' },
};

// ─── Data ──────────────────────────────────────────────────��───────────────────

const SERVICES = [
  {
    id: 'resume',
    icon: FileText,
    color: 'blue',
    title: 'Resume Review',
    description: 'Targeted feedback on content, positioning, and ATS readability.',
  },
  {
    id: 'strategy',
    icon: Target,
    color: 'violet',
    title: 'Career Strategy',
    description: 'Align your next move with long-term goals and market realities.',
  },
  {
    id: 'linkedin',
    icon: Globe,
    color: 'sky',
    title: 'LinkedIn Review',
    description: 'Optimize your profile for inbound opportunities and recruiter reach.',
  },
  {
    id: 'interview',
    icon: Mic,
    color: 'amber',
    title: 'Interview Prep',
    description: 'Stress-test your stories, structure, and delivery with a real practitioner.',
  },
  {
    id: 'jobsearch',
    icon: Search,
    color: 'emerald',
    title: 'Job Search Strategy',
    description: 'Build a focused pipeline and cut through noise in a competitive market.',
  },
  {
    id: 'offer',
    icon: TrendingUp,
    color: 'rose',
    title: 'Offer & Salary Guidance',
    description: 'Negotiate confidently with data-backed framing and mentor support.',
  },
];

const MENTORS = [
  {
    id: 1,
    name: 'Priya Mehta',
    role: 'Senior Product Manager',
    company: 'Google',
    tags: ['PM Interviews', 'Product Strategy', 'FAANG Prep'],
    focus: 'Helping candidates crack PM roles at top-tier tech companies.',
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
    focus: 'System design deep-dives and backend interview fundamentals.',
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
    focus: 'Navigating career pivots into data and machine learning roles.',
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
    focus: 'Design portfolio critique and product case study coaching.',
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
    focus: 'ML system design and research role interview preparation.',
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
    focus: 'Engineering leadership transitions and EM interview coaching.',
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

const TESTIMONIALS = [
  {
    initials: 'SK',
    name: 'Sarah K.',
    role: 'Product Manager, Shopify',
    quote: 'I came in knowing my target role but not why I kept failing at the final round. My mentor connected my practice session patterns with how I was framing my leadership stories — something I never would have caught alone. We had a clear action plan by the end of 45 minutes.',
    outcome: 'Received offer 6 weeks later',
    color: 'blue',
  },
  {
    initials: 'DL',
    name: 'David L.',
    role: 'Software Engineer, Figma',
    quote: 'My mentor had already reviewed my Screna practice history before our call. We skipped the 20-minute context dump and went straight to the actual gaps. The written follow-up was specific enough to use in my next practice session the same day.',
    outcome: 'Cleared system design in 3 weeks',
    color: 'violet',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Can I book mentorship sessions without a membership?',
    a: 'Mentorship sessions are available exclusively to Screna members. This is intentional — by the time you sit down with a mentor, they can already access your practice history, target roles, and resume, so the session starts with real context, not a cold introduction.',
  },
  {
    q: 'What kinds of topics can mentors help with?',
    a: 'Mentors on Screna specialize in interview preparation, resume and LinkedIn review, career transition strategy, offer negotiation, and longer-term career planning. You can explore any of these in a single session or across a series of conversations.',
  },
  {
    q: 'Do mentors keep the full session payment?',
    a: 'Yes. Screna does not take a commission from mentors. Mentors set their own rates, and the full amount goes directly to them. We believe in fair compensation for experienced professionals who invest real time in your career.',
  },
  {
    q: 'How do I know which mentor is right for me?',
    a: "Each mentor card shows their role, company, expertise tags, and a focused description of what they specialize in. You can filter by industry, price, availability, and rating. If you're unsure, a 30-minute introductory session works well — most members find clarity quickly.",
  },
];

// ─── StarRating ─────────────────────────────────────────────────────────────────

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
                  ? 'bg-[hsl(221,91%,60%)]/6 text-[hsl(221,91%,55%)]'
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

// ─── MentorCard ───────────��─────────────────────────────────────────────────────

function MentorCard({
  mentor,
  isMember,
}: {
  mentor: (typeof MENTORS)[0];
  isMember: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`bg-white rounded-xl border flex flex-col overflow-hidden transition-all duration-200 cursor-pointer ${
        hovered
          ? 'border-slate-300 shadow-[0_4px_20px_rgba(0,0,0,0.08)] -translate-y-0.5'
          : 'border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.04)]'
      }`}
      onClick={(e) => {
        if (isMember) {
          navigate('/mentor-details');
        }
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3.5">
          <img
            src={mentor.avatar}
            alt={mentor.name}
            className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 truncate">{mentor.name}</p>
            <p className="text-[12px] text-slate-500 mt-0.5 truncate">
              {mentor.role}
              <span className="text-slate-300 mx-1">·</span>
              <span className="text-slate-700 font-medium">{mentor.company}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold text-[#2466f5] text-[20px]">${mentor.price}</p>
            <p className="text-[10.5px] text-slate-400 mt-0.5">/ session</p>
          </div>
        </div>

        {/* Rating and Availability placed above Tags */}
        <div className="flex items-center justify-between mt-3.5">
          <div className="flex items-center gap-1.5">
            <StarRating rating={mentor.rating} />
            <span className="font-semibold text-slate-700 text-[15px]">{mentor.rating.toFixed(1)}</span>
            <span className="text-[11.5px] text-slate-400 text-[12px]">({mentor.reviews})</span>
          </div>
          <div className="flex items-center gap-1 text-[11.5px] text-slate-500">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span className="text-[12px]">Next: <span className="font-medium text-slate-700">{mentor.nextSlot}</span></span>
          </div>
        </div>

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

      {/* Body */}
      <div className="px-5 py-4 flex-1 flex flex-col gap-3">
        <p className="text-[12.5px] text-slate-500 leading-snug italic">"{mentor.focus}"</p>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-emerald-500" />
          <span className="text-[11.5px] text-emerald-600 font-medium">
            {mentor.slotsThisWeek} slot{mentor.slotsThisWeek !== 1 ? 's' : ''} this week
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        {isMember ? (
          <button
            onClick={(e) => { e.stopPropagation(); navigate('/mentor-details'); }}
            className={`w-full py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 ${
              hovered
                ? 'bg-[hsl(221,91%,60%)] text-white shadow-[0_2px_12px_hsl(221,91%,60%)/30]'
                : 'bg-[hsl(221,91%,60%)]/8 text-[hsl(221,91%,55%)] border border-[hsl(221,91%,60%)]/20'
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

export function MentorshipMarketplacePage() {
  const [isMember, setIsMember] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openSort, setOpenSort] = useState(false);
  const [filters, setFilters] = useState<Record<string, string | null>>({
    role: null, price: null, availability: null, rating: null,
  });
  const [sortBy, setSortBy] = useState('Top rated');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setOpenSort(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <DashboardLayout noSidebar>
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-24 space-y-16">

        {/* ── Demo toggle ───────────────────────────────────────────────────── */}
        <div className="flex justify-end -mb-6">
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-[4px] py-[30px]">
            <span className="text-[11px] text-slate-400 px-1.5">Preview:</span>
            <button
              onClick={() => setIsMember(true)}
              className={`text-[12px] px-3 py-1 rounded-md transition-colors ${
                isMember ? 'bg-white text-slate-800 font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Member
            </button>
            <button
              onClick={() => setIsMember(false)}
              className={`text-[12px] px-3 py-1 rounded-md transition-colors ${
                !isMember ? 'bg-white text-slate-800 font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Visitor
            </button>
          </div>
        </div>

        {/* ── Page Header ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <h1 className="text-[#0F172A] font-bold text-[40px] font-[family-name:var(--font-serif)]">Mentorship Market Space</h1>
              {isMember && (
                null
              )}
            </div>
            <p className="text-slate-500 max-w-2xl">
              Get 1:1 guidance from experienced mentors when you need judgment, strategy, and real-world perspective.
            </p>
          </div>

          {/* Utility area */}
          {isMember ? (
            <button className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-700 hover:border-slate-300 hover:text-slate-900 transition-colors shadow-sm whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              View My Sessions
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            </button>
          ) : (
            <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[hsl(221,91%,60%)]/20 bg-[hsl(221,91%,60%)]/5 text-[13px] text-[hsl(221,91%,55%)]">
              <Shield className="w-3.5 h-3.5" />
              <span className="font-medium">Included in Membership</span>
            </div>
          )}
        </div>

        {/* ── Non-member soft banner ─────────────────────────────────────────── */}
        {!isMember && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-[hsl(221,91%,60%)]/15 bg-[hsl(221,91%,60%)]/4">
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
            <div className="mb-5">
              <h2
                className="font-semibold text-slate-900 text-[32px]"
                style={{ letterSpacing: '-0.02em' }}
              >
                Find a mentor
              </h2>
              <p className="text-[13px] text-slate-400 mt-1">
                {MENTORS.length} verified mentors · updated weekly
              </p>
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
                          sortBy === opt ? 'bg-[hsl(221,91%,60%)]/6 text-[hsl(221,91%,55%)]' : 'text-slate-700 hover:bg-slate-50'
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {MENTORS.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} isMember={isMember} />
              ))}
            </div>

            {/* Services helper grid moved here */}
            <div className="mt-16 pt-16 border-t border-slate-200 flex flex-col items-center w-full">
              <div className="flex flex-col items-center w-full mb-14">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px w-8 bg-gradient-to-r from-blue-400/0 to-blue-400" />
                  <span className="text-[12px] font-normal text-slate-500 tracking-[1.2px] uppercase">What You Get</span>
                  <div className="h-px w-8 bg-gradient-to-l from-blue-400/0 to-blue-400" />
                </div>
                <h2 className="font-serif text-[32px] text-slate-900 leading-tight text-center mb-3">
                  Key Career Topics
                </h2>
                <p className="text-[18px] text-slate-500 text-center max-w-[672px]">
                  Screna mentorship supports you across every stage and topic that matters
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {/* Card 1 */}
                <div className="bg-white rounded-[12px] border border-slate-200 h-[196px] p-6 flex flex-col items-start hover:border-slate-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundImage: "linear-gradient(135deg, rgb(239, 246, 255) 0%, rgb(238, 242, 255) 100%)" }}>
                    <div className="w-[29px] h-[29px] rounded-xl bg-blue-50 flex items-center justify-center">
                      <svg className="w-[33px] h-[33px]" fill="none" viewBox="0 0 33 33">
                        <path d="M20.625 2.75H8.25C7.52065 2.75 6.82118 3.03973 6.30546 3.55546C5.78973 4.07118 5.5 4.77065 5.5 5.5V27.5C5.5 28.2293 5.78973 28.9288 6.30546 29.4445C6.82118 29.9603 7.52065 30.25 8.25 30.25H24.75C25.4793 30.25 26.1788 29.9603 26.6945 29.4445C27.2103 28.9288 27.5 28.2293 27.5 27.5V9.625L20.625 2.75Z" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                        <path d="M19.25 2.75V8.25C19.25 8.97935 19.5397 9.67882 20.0555 10.1945C20.5712 10.7103 21.2707 11 22 11H27.5" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                        <path d="M13.75 12.375H11" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                        <path d="M22 17.875H11" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                        <path d="M22 23.375H11" stroke="#155DFC" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-[18px] font-medium text-slate-900 mb-2">Resume Review</h3>
                  <p className="text-[15px] text-slate-500 leading-[1.4]">
                    Targeted feedback on content, positioning, and ATS readability.
                  </p>
                </div>

                {/* Card 2 */}
                <div className="bg-white rounded-[12px] border border-slate-200 h-[196px] p-6 flex flex-col items-start hover:border-slate-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundImage: "linear-gradient(135deg, rgb(250, 245, 255) 0%, rgb(253, 242, 248) 100%)" }}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 29 29">
                      <path d="M14.5 26.5833C21.1734 26.5833 26.5833 21.1734 26.5833 14.5C26.5833 7.82656 21.1734 2.41667 14.5 2.41667C7.82656 2.41667 2.41667 7.82656 2.41667 14.5C2.41667 21.1734 7.82656 26.5833 14.5 26.5833Z" stroke="#7F22FE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      <path d="M14.5 21.75C18.5041 21.75 21.75 18.5041 21.75 14.5C21.75 10.4959 18.5041 7.25 14.5 7.25C10.4959 7.25 7.25 10.4959 7.25 14.5C7.25 18.5041 10.4959 21.75 14.5 21.75Z" stroke="#7F22FE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      <path d="M14.5 16.9167C15.8347 16.9167 16.9167 15.8347 16.9167 14.5C16.9167 13.1653 15.8347 12.0833 14.5 12.0833C13.1653 12.0833 12.0833 13.1653 12.0833 14.5C12.0833 15.8347 13.1653 16.9167 14.5 16.9167Z" stroke="#7F22FE" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                    </svg>
                  </div>
                  <h3 className="text-[18px] font-medium text-slate-900 mb-2">Career Strategy</h3>
                  <p className="text-[15px] text-slate-500 leading-[1.4]">
                    Align your next move with long-term goals and market realities.
                  </p>
                </div>

                {/* Card 3 */}
                <div className="bg-white rounded-[12px] border border-slate-200 h-[196px] p-6 flex flex-col items-start hover:border-slate-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundImage: "linear-gradient(135deg, rgb(240, 253, 244) 0%, rgb(236, 253, 245) 100%)" }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
                      <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="#009966" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      <path d="M17.5 17.5L13.9167 13.9167" stroke="#009966" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                    </svg>
                  </div>
                  <h3 className="text-[18px] font-medium text-slate-900 mb-2">Job Search Strategy</h3>
                  <p className="text-[15px] text-slate-500 leading-[1.4]">
                    Build a focused pipeline and cut through noise in a competitive market.
                  </p>
                </div>

                {/* Card 4 */}
                <div className="bg-white rounded-[12px] border border-slate-200 h-[196px] p-6 flex flex-col items-start hover:border-slate-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundImage: "linear-gradient(135deg, rgb(255, 251, 235) 0%, rgb(255, 247, 237) 100%)" }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
                      <path d="M10 1.66667C9.33696 1.66667 8.70107 1.93006 8.23223 2.3989C7.76339 2.86774 7.5 3.50363 7.5 4.16667V10C7.5 10.663 7.76339 11.2989 8.23223 11.7678C8.70107 12.2366 9.33696 12.5 10 12.5C10.663 12.5 11.2989 12.2366 11.7678 11.7678C12.2366 11.2989 12.5 10.663 12.5 10V4.16667C12.5 3.50363 12.2366 2.86774 11.7678 2.3989C11.2989 1.93006 10.663 1.66667 10 1.66667Z" stroke="#E17100" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      <path d="M15.8333 8.33333V10C15.8333 11.5471 15.2188 13.0308 14.1248 14.1248C13.0308 15.2188 11.5471 15.8333 10 15.8333C8.4529 15.8333 6.96917 15.2188 5.87521 14.1248C4.78125 13.0308 4.16667 11.5471 4.16667 10V8.33333" stroke="#E17100" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      <path d="M10 15.8333V18.3333" stroke="#E17100" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                    </svg>
                  </div>
                  <h3 className="text-[18px] font-medium text-slate-900 mb-2">Interview Prep</h3>
                  <p className="text-[15px] text-slate-500 leading-[1.4]">
                    Stress-test your stories, structure, and delivery with a real practitioner.
                  </p>
                </div>

                {/* Card 5 */}
                <div className="bg-white rounded-[12px] border border-slate-200 h-[196px] p-6 flex flex-col items-start hover:border-slate-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 relative" style={{ backgroundImage: "linear-gradient(135deg, rgb(236, 254, 255) 0%, rgb(239, 246, 255) 100%)" }}>
                    <div className="w-6 h-6 relative">
                      <svg className="absolute w-[18px] h-[18px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="none" viewBox="0 0 17.9167 17.9167">
                        <path d="M8.95833 17.2917C13.5607 17.2917 17.2917 13.5607 17.2917 8.95833C17.2917 4.35596 13.5607 0.625 8.95833 0.625C4.35596 0.625 0.625 4.35596 0.625 8.95833C0.625 13.5607 4.35596 17.2917 8.95833 17.2917Z" stroke="#0084D1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      </svg>
                      <svg className="absolute w-[8px] h-[18px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="none" viewBox="0 0 7.91667 17.9167">
                        <path d="M3.95833 0.625C1.81853 2.87179 0.625 5.85562 0.625 8.95833C0.625 12.061 1.81853 15.0449 3.95833 17.2917C6.09814 15.0449 7.29167 12.061 7.29167 8.95833C7.29167 5.85562 6.09814 2.87179 3.95833 0.625Z" stroke="#0084D1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      </svg>
                      <svg className="absolute w-[18px] h-[1.25px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" fill="none" viewBox="0 0 17.9167 1.25">
                        <path d="M0.625 0.625H17.2917" stroke="#0084D1" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-[18px] font-medium text-slate-900 mb-2">LinkedIn Review</h3>
                  <p className="text-[15px] text-slate-500 leading-[1.4]">
                    Optimize your profile for inbound opportunities and recruiter reach.
                  </p>
                </div>

                {/* Card 6 */}
                <div className="bg-white rounded-[12px] border border-slate-200 h-[196px] p-6 flex flex-col items-start hover:border-slate-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ backgroundImage: "linear-gradient(135deg, rgb(255, 230, 237) 0%, rgb(255, 238, 243) 100%)" }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 20 20">
                      <path d="M18.3333 5.83333L11.25 12.9167L7.08333 8.75L1.66667 14.1667" stroke="#EC003F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                      <path d="M13.3333 5.83333H18.3333V10.8333" stroke="#EC003F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
                    </svg>
                  </div>
                  <h3 className="text-[18px] font-medium text-slate-900 mb-2">Intelligent Caching</h3>
                  <p className="text-[15px] text-slate-500 leading-[1.4]">
                    Negotiate confidently with data-backed framing and mentor support.
                  </p>
                </div>

              </div>
            </div>

            {/* Trust line */}
            <div className="mt-6 flex items-center gap-2 text-[12px] text-slate-400">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="text-center text-left">All mentors are verified professionals. Every session includes a written follow-up summary.</span>
            </div>
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

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 — Why this lives inside Membership
        ════════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex flex-col gap-16 items-center w-full">
            {/* Header section */}
            <div className="flex flex-col gap-4 items-center pt-[7.5px] w-full">
              <div className="flex gap-2 items-center">
                <div className="bg-gradient-to-r from-[hsl(221,91%,60%)]/0 to-[hsl(221,91%,60%)] h-px w-8" />
                <div className="text-[#6b7280] text-[12px] tracking-[1.2px] uppercase">
                  BENEFIT
                </div>
                <div className="bg-gradient-to-l from-[hsl(221,91%,60%)]/0 to-[hsl(221,91%,60%)] h-px w-8" />
              </div>
              <h2 className="font-serif text-[#0f172b] text-[32px] text-center leading-tight">
                Why this lives inside Membership
              </h2>
              <p className="text-[#4b5563] text-[18px] text-center max-w-[672px] leading-relaxed">
                Mentorship here isn't a transaction. It's a layer that already knows where you're stuck
              </p>
            </div>

            {/* Cards section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-[1200px]">
              {/* Card 1 */}
              <div className="relative pt-4 pl-4 pr-0 pb-0">
                <div className="bg-white border-2 border-[#e5e7eb] rounded-[12px] p-8 flex flex-col gap-4 min-h-[197px] relative group hover:border-slate-300 transition-colors">
                  <div className="size-8 relative mb-2">
                    <svg className="absolute block size-full" fill="none" viewBox="0 0 32 32">
                      <path d="M14.5067 29.2533L20.6133 18.6667" stroke="hsl(221 91% 60%)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                      <path d="M28.2267 10.6667H16" stroke="hsl(221 91% 60%)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                      <path d="M5.26667 8.08L11.3867 18.6667" stroke="hsl(221 91% 60%)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                      <path d="M16 29.3333C23.3638 29.3333 29.3333 23.3638 29.3333 16C29.3333 8.6362 23.3638 2.66667 16 2.66667C8.6362 2.66667 2.66667 8.6362 2.66667 16C2.66667 23.3638 8.6362 29.3333 16 29.3333Z" stroke="hsl(221 91% 60%)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                      <path d="M16 21.3333C18.9455 21.3333 21.3333 18.9455 21.3333 16C21.3333 13.0545 18.9455 10.6667 16 10.6667C13.0545 10.6667 10.6667 13.0545 10.6667 16C10.6667 18.9455 13.0545 21.3333 16 21.3333Z" stroke="hsl(221 91% 60%)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0f172b] text-[18px] mb-2 leading-tight">Sessions start with context</h3>
                    <p className="text-[#62748e] text-[15px] leading-relaxed">
                      Your mentor reviews your practice data, resume, and job targets before the call. No 20-minute warm-up.
                    </p>
                  </div>
                </div>
                {/* Number Badge */}
                <div className="absolute top-0 left-0 bg-[#111827] text-white w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[16px] shadow-lg z-10 -translate-x-4 -translate-y-4">
                  1
                </div>
              </div>

              {/* Card 2 */}
              <div className="relative pt-4 pl-4 pr-0 pb-0">
                <div className="bg-white border-2 border-[#e5e7eb] rounded-[12px] p-8 flex flex-col gap-4 min-h-[197px] relative group hover:border-slate-300 transition-colors">
                  <div className="size-8 relative mb-2">
                    <svg className="absolute block size-full" fill="none" viewBox="0 0 32 32">
                      <path d="M25.3333 14.6667H6.66667C5.19391 14.6667 4 15.8606 4 17.3333V26.6667C4 28.1394 5.19391 29.3333 6.66667 29.3333H25.3333C26.8061 29.3333 28 28.1394 28 26.6667V17.3333C28 15.8606 26.8061 14.6667 25.3333 14.6667Z" stroke="#16A34A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                      <path d="M9.33333 14.6667V9.33333C9.33333 7.56522 10.0357 5.86953 11.286 4.61929C12.5362 3.36905 14.2319 2.66667 16 2.66667C17.7681 2.66667 19.4638 3.36905 20.714 4.61929C21.9643 5.86953 22.6667 7.56522 22.6667 9.33333V14.6667" stroke="#16A34A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0f172b] text-[18px] mb-2 leading-tight">Continuity across sessions</h3>
                    <p className="text-[#62748e] text-[15px] leading-relaxed">
                      Notes and follow-ups carry forward. Your second session builds on the first. Progress is tracked.
                    </p>
                  </div>
                </div>
                {/* Number Badge */}
                <div className="absolute top-0 left-0 bg-[#111827] text-white w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[16px] shadow-lg z-10 -translate-x-4 -translate-y-4">
                  2
                </div>
              </div>

              {/* Card 3 */}
              <div className="relative pt-4 pl-4 pr-0 pb-0">
                <div className="bg-white border-2 border-[#e5e7eb] rounded-[12px] p-8 flex flex-col gap-4 min-h-[197px] relative group hover:border-slate-300 transition-colors">
                  <div className="size-8 relative mb-2">
                    <svg className="absolute block size-full" fill="none" viewBox="0 0 32 32">
                      <path d="M4 16C4 12.8174 5.26428 9.76515 7.51472 7.51472C9.76515 5.26428 12.8174 4 16 4C19.3547 4.01262 22.5747 5.32163 24.9867 7.65333L28 10.6667" stroke="#9333EA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                      <path d="M28 4V10.6667H21.3333" stroke="#9333EA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                      <path d="M28 16C28 19.1826 26.7357 22.2348 24.4853 24.4853C22.2348 26.7357 19.1826 28 16 28C12.6453 27.9874 9.42529 26.6784 7.01333 24.3467L4 21.3333" stroke="#9333EA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                      <path d="M10.6667 21.3333H4V28" stroke="#9333EA" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0f172b] text-[18px] mb-2 leading-tight">Part of your broader plan</h3>
                    <p className="text-[#62748e] text-[15px] leading-relaxed">
                      Mentorship connects to your mock sessions, job tracker, and next-step coaching, one system.
                    </p>
                  </div>
                </div>
                {/* Number Badge */}
                <div className="absolute top-0 left-0 bg-[#111827] text-white w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[16px] shadow-lg z-10 -translate-x-4 -translate-y-4">
                  3
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4 — Testimonials
        ════════════════════════════════════════════════════════════════════ */}
                <section className="pt-8">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div className="max-w-[580px]">
              <h2
                className="font-semibold text-slate-900 leading-tight text-[32px]"
                style={{ letterSpacing: '-0.02em' }}
              >
                What members say
              </h2>
              <p className="text-[15px] text-slate-500 mt-2.5 leading-relaxed">
                Candidates use mentorship to get clearer direction, stronger interview strategy, and support that connects the dots.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all shadow-sm group">
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                Previous
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all shadow-sm group">
                Next
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </button>
            </div>
          </div>

          {/* Testimonial Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah K.",
                context: "PM New Grad Candidate",
                avatar: "https://images.unsplash.com/photo-1758518727592-706e80ebc354?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMHBvcnRyYWl0JTIwYXZhdGFyfGVufDF8fHx8MTc3NTU5MTA4Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
                quote: "The session helped me realize where I was actually getting stuck. My mentor pointed out that my leadership stories lacked specific metrics. I left with a much clearer plan on what to prioritize next.",
                footer: "Used mentorship for interview prep"
              },
              {
                name: "David L.",
                context: "SWE Candidate",
                avatar: "https://images.unsplash.com/photo-1576533247967-79124db83e48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb3J0cmFpdCUyMGF2YXRhcnxlbnwxfHx8fDE3NzU2NTEwMzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
                quote: "I was struggling with system design rounds at Tier-1 companies. My mentor connected my background with the specific architectural patterns recruiters look for. My strategy and confidence improved immediately.",
                footer: "Used mentorship for system design"
              },
              {
                name: "Elena R.",
                context: "Career Switcher into Data",
                avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHByb2Zlc3Npb25hbCUyMHBvcnRyYWl0JTIwYXZhdGFyfGVufDF8fHx8MTc3NTY4ODM3Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
                quote: "Transitioning into Data Science was overwhelming. Mentorship helped me connect my resume, interview prep, and target company strategy in a way I hadn't seen before. It finally connects the dots.",
                footer: "Used mentorship for resume + career strategy"
              }
            ].map((t, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col gap-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all duration-300"
              >
                {/* Avatar and Stars row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <img 
                      src={t.avatar} 
                      alt={t.name} 
                      className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <div>
                      <p className="text-[14.5px] font-semibold text-slate-900">{t.name}</p>
                      <p className="text-[12.5px] text-slate-500 font-medium">{t.context}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                {/* Quote */}
                <p className="text-[14.5px] text-slate-600 leading-relaxed italic flex-1">
                  "{t.quote}"
                </p>

                {/* Footer Tag */}
                <div className="pt-5 border-t border-slate-50">
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[hsl(221,91%,60%)] uppercase tracking-wider">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    {t.footer}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Optional Carousel Indicators */}
          <div className="flex justify-center gap-2 mt-12">
            <div className="w-6 h-1.5 rounded-full bg-[hsl(221,91%,60%)]" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5 — FAQ
        ════════════════════════════════════════════════════════════════════ */}
                <section className="flex flex-col items-center w-full max-w-[670px] mx-auto">
          <div className="flex flex-col gap-4 items-center pt-2 w-full mb-8">
            <div className="flex gap-2 items-center">
              <div className="bg-gradient-to-r from-[hsl(221,91%,60%)]/0 to-[hsl(221,91%,60%)] h-px w-8" />
              <div className="text-slate-500 text-[12px] tracking-[1.2px] uppercase">
                Support
              </div>
              <div className="bg-gradient-to-l from-[hsl(221,91%,60%)]/0 to-[hsl(221,91%,60%)] h-px w-8" />
            </div>
            <h2 className="font-serif text-slate-900 text-[32px] text-center tracking-[1.1875px]">
              Frequently asked questions
            </h2>
          </div>

          <div className="flex flex-col gap-4 items-start w-full">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="bg-white rounded-lg w-full border border-slate-200 overflow-hidden transition-all duration-200 shadow-sm">
                  <button
                    onClick={() => setOpenFaq((prev) => (prev === idx ? null : idx))}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-slate-900 text-[15px]">{item.q}</span>
                    <span className={`text-slate-900 text-[16px] font-medium transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4">
                      <p className="text-[14px] text-slate-600 leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>
      <Footer />
    </DashboardLayout>
  );
}