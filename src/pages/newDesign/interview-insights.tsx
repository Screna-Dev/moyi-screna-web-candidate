import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ArrowRight,
  Plus,
  Clock,
  X,
  ListFilter,
  Loader2,
  MessageSquare,
  ThumbsUp,
  Bookmark,
  Share2,
  Lock,
} from 'lucide-react';
import { Navbar } from '../../components/newDesign/home/navbar';
import { Footer } from '../../components/newDesign/home/footer';
import { Button } from '../../components/newDesign/ui/button';
import { getPosts, getPublicPosts, likePost, unlikePost, savePost, unsavePost } from '../../services/CommunityService';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { usePostHog } from 'posthog-js/react';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';

import { SharePopover } from '@/components/newDesign/share-popover';
import { Markdown } from '@/components/newDesign/ui/markdown';
import { CompanyLogo } from '../../components/newDesign/ui/company-logo';
import { RoleFilter, CompanyFilter, RoundFilter, LevelFilter, TimeFilter } from '@/components/newDesign/interview-insights/filter-popovers';

import imgMesh1 from '@/assets/4b0ef9400714688128577f0b5c078429cf27619b.png';
import imgMesh2 from '@/assets/640e525f2d33bc857d6ceb0483f608b1ebd8ee75.png';
import imgMesh3 from '@/assets/80e18a011ed0a83de40f14f3a9d19b06665d3c4a.png';
import imgMesh4 from '@/assets/dfb2d43ef1f27bae5f85449810b9699a05109493.png';

// ─── Post Interface ─────────────────────────────────────
interface PostQuestion {
  id: string;
  seq: number;
  label: string;
  title: string;
  categories: string[];
  notes: string;
}

interface PostUser {
  id: string;
  name: string;
}

interface Post {
  id: string;
  user?: PostUser;
  company: string;
  role: string;
  level: string;
  round: string;
  date: string;
  outcome: string;
  location: string;
  questions: PostQuestion[];
  summary: string;
  status: string;
  isAnonymous?: boolean;
  createdAt: string;
  commentCount?: number;
  likeCount?: number;
  saveCount?: number;
  liked?: boolean;
  saved?: boolean;
  tags?: string[];
}

const SORT_OPTIONS = ['Relevance', 'Newest', 'Hot', 'Most Saved'] as const;

type SortOption = typeof SORT_OPTIONS[number];

const SORT_TO_API: Record<SortOption, string> = {
  Relevance: 'RELEVANCE',
  Newest: 'NEWEST',
  Hot: 'HOT',
  'Most Saved': 'MOST_SAVED',
};

const TIME_TO_API: Record<string, string> = {
  'Past week': 'PAST_WEEK',
  'Past month': 'PAST_MONTH',
  'Past 3 months': 'PAST_3_MONTH',
  'Past year': 'PAST_YEAR',
};

const COMPANY_SIZE_CHIPS = ['FAANG / Big Tech', 'Large Enterprises', 'Mid-sized', 'Startups / Small'] as const;
type CompanySizeChip = typeof COMPANY_SIZE_CHIPS[number];

const COMPANY_BY_SIZE: Record<CompanySizeChip, string[]> = {
  'FAANG / Big Tech': ['Google', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Microsoft', 'LinkedIn', 'Uber', 'Airbnb', 'TikTok', 'OpenAI', 'Anthropic', 'NVIDIA'],
  'Large Enterprises': ['Oracle', 'SAP', 'IBM', 'Cisco', 'Adobe', 'Intel', 'HP', 'Dell', 'VMware', 'ServiceNow', 'Salesforce', 'Workday'],
  'Mid-sized': ['HubSpot', 'Asana', 'Atlassian', 'Dropbox', 'Twilio', 'Zillow', 'Robinhood', 'Expedia', 'Square / Block', 'DocuSign', 'Cloudflare', 'Reddit'],
  'Startups / Small': ['Early-stage Startup', 'Series A Startup', 'Series B+ Startup'],
};

const ALL_COMPANIES = Object.values(COMPANY_BY_SIZE).flat().filter((v, i, a) => a.indexOf(v) === i).sort();

// ─── Role Data ─────────────────────────────────────────
const ROLE_CATEGORY_CHIPS = ['Product', 'Engineering', 'Data & AI', 'Design & Research', 'Business / Consulting'] as const;
type RoleCategoryChip = typeof ROLE_CATEGORY_CHIPS[number];

const ROLE_BY_CATEGORY: Record<RoleCategoryChip, string[]> = {
  Product: [
    'Product Manager', 'Associate Product Manager', 'Growth Product Manager', 'Technical Product Manager',
  ],
  Engineering: [
    'Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer',
    'Mobile Engineer', 'DevOps Engineer', 'QA / Test Engineer',
  ],
  'Data & AI': [
    'Data Scientist', 'Data Analyst', 'Machine Learning Engineer', 'AI Engineer',
  ],
  'Design & Research': [
    'Product Designer', 'UX Designer', 'UX Researcher',
  ],
  'Business / Consulting': [
    'Business Analyst', 'Consultant',
  ],
};

const ALL_ROLES = Object.values(ROLE_BY_CATEGORY).flat().filter((v, i, a) => a.indexOf(v) === i).sort();

// ─── Round Data (grouped chips) ────────────
const ROUND_GROUPS = [
  {
    label: 'Early Stage',
    options: ['Resume Screen', 'Recruiter Call', 'Phone Screen'],
  },
  {
    label: 'Technical',
    options: ['Technical Phone Screen', 'Take-Home Assignment', 'Coding Challenge'],
  },
  {
    label: 'Onsite / Final',
    options: ['Onsite - Coding', 'Onsite - System Design', 'Onsite - Behavioral', 'Onsite - Mixed', 'Onsite - Multi Round', 'Final Round'],
  },
  {
    label: 'Other',
    options: ['Bar Raiser', 'Culture Fit', 'Executive Round', 'Reference Check'],
  },
] as const;

const ALL_ROUNDS = ROUND_GROUPS.flatMap(g => g.options);

// ─── Tag / Category Data ───────────────────────────────
const TAG_GROUPS: { label: string; tags: string[] }[] = [
  {
    label: 'Core Interview Types',
    tags: ['Behavioral', 'Technical', 'Situational / Judgment'],
  },
  {
    label: 'Product / Business',
    tags: ['Product Sense', 'Execution', 'Strategy', 'Analytical / Metrics', 'Case Study'],
  },
  {
    label: 'Engineering',
    tags: ['Coding', 'System Design', 'Debugging / Troubleshooting'],
  },
  {
    label: 'Leadership & Communication',
    tags: ['Leadership', 'Communication', 'Stakeholder Management', 'Collaboration / Conflict'],
  },
  {
    label: 'Career / Background',
    tags: ['Resume / Background', 'Experience Deep Dive', 'Career Motivation', 'Company-specific Questions'],
  },
];

const FILTER_OPTIONS: Record<string, string[]> = {
  Role: ALL_ROLES,
  Company: ALL_COMPANIES,
  Round: ALL_ROUNDS,
  Level: ['Junior', 'Intermediate', 'Senior', 'Staff'],
  Time: ['Past week', 'Past month', 'Past 3 months', 'Past year'],
};

const OUTCOME_COLORS: Record<string, string> = {
  Offer: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-600',
  'No response': 'bg-slate-50 text-slate-500',
  Pending: 'bg-blue-50 text-blue-600',
};

// ─── Companies directory (mock — no backend yet) ────────
type CompanyDir = {
  id: string;
  name: string;
  category: string;
  description: string;
  totalNotes: number;
  last30Days: number;
  updatedAgo: string;
};

const DIR_COMPANIES: CompanyDir[] = [
  { id: 'google', name: 'Google', category: 'FAANG / Big Tech', description: 'Structured coding, system design, and Googleyness notes from SWE, PM, and EM candidates.', totalNotes: 1842, last30Days: 94, updatedAgo: '2h ago' },
  { id: 'meta', name: 'Meta', category: 'FAANG / Big Tech', description: 'Product sense, execution, coding, and behavioral writeups across IC and manager loops.', totalNotes: 1274, last30Days: 67, updatedAgo: '4h ago' },
  { id: 'openai', name: 'OpenAI', category: 'Mid-sized', description: 'ML systems, research engineering, alignment, and infrastructure interview notes.', totalNotes: 386, last30Days: 58, updatedAgo: '1h ago' },
  { id: 'amazon', name: 'Amazon', category: 'FAANG / Big Tech', description: 'Leadership Principles, bar raiser, coding, and system design experiences.', totalNotes: 2105, last30Days: 112, updatedAgo: '1h ago' },
  { id: 'apple', name: 'Apple', category: 'FAANG / Big Tech', description: 'Team-specific technical screens and onsite loops for hardware, platform, and product teams.', totalNotes: 893, last30Days: 41, updatedAgo: '6h ago' },
  { id: 'microsoft', name: 'Microsoft', category: 'FAANG / Big Tech', description: 'Growth-mindset interviews, team-match loops, coding, and design rounds.', totalNotes: 1537, last30Days: 83, updatedAgo: '3h ago' },
  { id: 'anthropic', name: 'Anthropic', category: 'Mid-sized', description: 'Safety-focused technical screens, ML infrastructure, and research collaboration rounds.', totalNotes: 214, last30Days: 43, updatedAgo: '5h ago' },
  { id: 'deepmind', name: 'DeepMind', category: 'Mid-sized', description: 'Research-heavy interview notes covering ML theory, papers, and systems depth.', totalNotes: 178, last30Days: 31, updatedAgo: '1d ago' },
  { id: 'stripe', name: 'Stripe', category: 'Large Enterprises', description: 'Practical engineering, debugging, API design, and product-minded system design notes.', totalNotes: 743, last30Days: 48, updatedAgo: '2h ago' },
  { id: 'figma', name: 'Figma', category: 'Mid-sized', description: 'Collaborative product engineering and design systems interview experiences.', totalNotes: 312, last30Days: 27, updatedAgo: '8h ago' },
  { id: 'databricks', name: 'Databricks', category: 'Large Enterprises', description: 'Distributed systems, data engineering, and platform interview loops.', totalNotes: 415, last30Days: 34, updatedAgo: '6h ago' },
  { id: 'citadel', name: 'Citadel', category: 'Large Enterprises', description: 'Low-latency systems, probability, C++, and trading intuition rounds.', totalNotes: 268, last30Days: 24, updatedAgo: '9h ago' },
  { id: 'salesforce', name: 'Salesforce', category: 'Large Enterprises', description: 'Enterprise product, platform architecture, and customer-centric behavioral loops.', totalNotes: 524, last30Days: 32, updatedAgo: '1d ago' },
  { id: 'perplexity', name: 'Perplexity', category: 'Small', description: 'Fast-moving AI product interviews with pragmatic systems and product judgment.', totalNotes: 86, last30Days: 20, updatedAgo: '2d ago' },
];

const CATEGORY_TILES = [
  {
    name: 'FAANG / Big Tech',
    subtitle: 'Large-scale engineering and product interviews.',
    examples: ['Google', 'Apple', 'Meta', 'Amazon'],
    notes: '3,240 notes',
    image: imgMesh1,
  },
  {
    name: 'Large Enterprises',
    subtitle: 'Established companies with structured interview loops.',
    examples: ['Microsoft', 'Oracle', 'Salesforce', 'IBM'],
    notes: '5,860 notes',
    image: imgMesh2,
  },
  {
    name: 'Mid-sized',
    subtitle: 'Growing teams with practical and role-specific interviews.',
    examples: ['Stripe', 'Databricks', 'Figma', 'Notion'],
    notes: '4,120 notes',
    image: imgMesh3,
  },
  {
    name: 'Small',
    subtitle: 'Startup and smaller-company interview experiences.',
    examples: ['Perplexity', 'Cursor', 'Linear', 'Ramp'],
    notes: '2,380 notes',
    image: imgMesh4,
  },
];

const LATEST_TICKER = [
  'OpenAI · System Design · 1d ago',
  'Google · Coding L5 · 2h ago',
  'Stripe · API Design · 3h ago',
  'Anthropic · ML Systems · 5h ago',
];

function InlineCompanyCard({ company }: { company: CompanyDir }) {
  return (
    <Link
      to={`/interview-insights/${company.id}`}
      className="group relative flex min-h-[160px] w-full flex-col justify-between rounded-2xl border border-[hsl(220,16%,90%)] bg-[#F9FAFB] p-5 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[hsl(221,91%,60%)] focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
          <CompanyLogo
            company={company.name}
            className="!w-[42px] !h-[42px] rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-[hsl(220,16%,90%)]/60 text-sm font-semibold text-[hsl(222,22%,15%)]"
          />
          <div className="flex min-w-0 flex-col pt-0.5">
            <h3 className="truncate text-[15px] font-bold tracking-tight text-[hsl(222,22%,15%)]">
              {company.name}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="rounded-full bg-[hsl(220,20%,96%)] px-2 py-0.5 text-[10px] font-medium text-[hsl(222,12%,40%)]">
                {company.category}
              </span>
              <span className="text-[11px] font-medium text-[hsl(222,12%,55%)]">
                Updated {company.updatedAgo}
              </span>
            </div>
          </div>
        </div>
        <ArrowRight className="mt-1 size-4 shrink-0 text-[hsl(222,12%,70%)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[hsl(222,22%,15%)]" strokeWidth={2} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[hsl(220,16%,90%)]/70 pt-3.5">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-[hsl(222,12%,55%)]">Total notes</span>
          <span className="mt-1 text-[17px] font-bold leading-none tracking-tight text-[hsl(222,22%,15%)]">
            {company.totalNotes.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="whitespace-nowrap text-[11px] font-medium text-[hsl(222,12%,55%)]">Last 30 days</span>
          <span className="mt-1 text-[17px] font-bold leading-none tracking-tight text-[hsl(222,22%,15%)]">
            +{company.last30Days}
          </span>
        </div>
      </div>
    </Link>
  );
}

function LargeCompanyCard({ company }: { company: CompanyDir }) {
  return (
    <Link
      to={`/interview-insights/${company.id}`}
      className="group relative flex h-full min-h-[300px] w-full flex-col rounded-2xl border border-[hsl(220,16%,90%)] bg-[#F9FAFB] p-6 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[hsl(221,91%,60%)] focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-4">
        <CompanyLogo
          company={company.name}
          className="!w-[56px] !h-[56px] rounded-xl bg-white p-2 shadow-sm ring-1 ring-[hsl(220,16%,90%)]/60 text-lg font-bold text-[hsl(222,22%,15%)]"
        />
        <ArrowRight className="mt-2 size-5 shrink-0 text-[hsl(222,12%,70%)] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[hsl(222,22%,15%)]" strokeWidth={2} />
      </div>

      <div className="mt-6 flex flex-col">
        <h3 className="text-xl font-bold tracking-tight text-[hsl(222,22%,15%)]">
          {company.name}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="rounded-full bg-[hsl(220,20%,96%)] px-2.5 py-0.5 text-[11px] font-medium text-[hsl(222,12%,40%)]">
            {company.category}
          </span>
          <span className="text-[12px] font-medium text-[hsl(222,12%,55%)]">
            Updated {company.updatedAgo}
          </span>
        </div>
      </div>

      <p className="mt-4 flex-1 text-[14px] leading-relaxed text-[hsl(222,12%,45%)]">
        {company.description}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[hsl(220,16%,90%)]/70 pt-5">
        <div className="flex flex-col">
          <span className="text-[12px] font-medium text-[hsl(222,12%,55%)]">Total notes</span>
          <span className="mt-1 text-2xl font-bold leading-none tracking-tight text-[hsl(222,22%,15%)]">
            {company.totalNotes.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="whitespace-nowrap text-[12px] font-medium text-[hsl(222,12%,55%)]">Last 30 days</span>
          <span className="mt-1 text-2xl font-bold leading-none tracking-tight text-[hsl(222,22%,15%)]">
            +{company.last30Days}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function InterviewInsightsPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const posthog = usePostHog();

  const [activeTab, setActiveTab] = useState<'feed' | 'companies'>('feed');

  // ── Feed state (backend-wired) ──
  const [activeSort, setActiveSort] = useState<SortOption>('Newest');
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, string[]>>({});
  const [tempFilters, setTempFilters] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [companySizeChip, setCompanySizeChip] = useState<CompanySizeChip | null>(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [roleCategoryChip, setRoleCategoryChip] = useState<RoleCategoryChip | null>(null);

  // ── Companies directory state (mock, client-side) ──
  const [activeCategory, setActiveCategory] = useState('All');
  const [companyDirQuery, setCompanyDirQuery] = useState('');
  const [companyDirPage, setCompanyDirPage] = useState(1);

  // API state
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // interview_notes_browsed —— 进入面经社区列表页（每次进入上报一次）
  useEffect(() => {
    safeCapture(posthog, EVENTS.INTERVIEW_NOTES_BROWSED, { sort_by: activeSort });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Like / Save interaction state ──
  type PostInteraction = { liked: boolean; likeCount: number; saved: boolean; saveCount: number };
  const [interactions, setInteractions] = useState<Map<string, PostInteraction>>(new Map());
  const likeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingLikes = useRef<Map<string, boolean>>(new Map());
  const pendingSaves = useRef<Map<string, boolean>>(new Map());

  const initInteractions = useCallback((posts: Post[], reset: boolean) => {
    setInteractions(prev => {
      const next = reset ? new Map() : new Map(prev);
      for (const p of posts) {
        // Always use fresh API data; preserve local pending changes only if timer is still running
        const hasPending = pendingLikes.current.has(p.id) || pendingSaves.current.has(p.id);
        if (!hasPending) {
          next.set(p.id, {
            liked: p.liked ?? false,
            likeCount: p.likeCount ?? 0,
            saved: p.saved ?? false,
            saveCount: p.saveCount ?? 0,
          });
        }
      }
      return next;
    });
  }, []);

  const toggleLike = useCallback((postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/auth'); return; }

    const curr = interactions.get(postId) ?? { liked: false, likeCount: 0, saved: false, saveCount: 0 };
    const newLiked = !curr.liked;

    setInteractions(prev => {
      const next = new Map(prev);
      const c = next.get(postId) ?? { liked: false, likeCount: 0, saved: false, saveCount: 0 };
      next.set(postId, { ...c, liked: newLiked, likeCount: Math.max(0, c.likeCount + (newLiked ? 1 : -1)) });
      return next;
    });
    pendingLikes.current.set(postId, newLiked);

    const existing = likeTimers.current.get(postId);
    if (existing) clearTimeout(existing);
    likeTimers.current.set(postId, setTimeout(() => {
      const shouldLike = pendingLikes.current.get(postId);
      if (shouldLike === undefined) return;
      pendingLikes.current.delete(postId);
      likeTimers.current.delete(postId);
      (shouldLike ? likePost(postId) : unlikePost(postId)).catch((err: any) => {
        if (err?.response?.data?.errorCode === 'BAD_REQUEST') {
          toast.info(shouldLike ? 'You already liked this post.' : 'You already unliked this post.');
          return;
        }
        setInteractions(prev => {
          const next = new Map(prev);
          const c = next.get(postId);
          if (c) next.set(postId, { ...c, liked: !shouldLike, likeCount: Math.max(0, c.likeCount + (shouldLike ? -1 : 1)) });
          return next;
        });
      });
    }, 1000));
  }, [isAuthenticated, navigate, interactions]);

  const toggleSave = useCallback((postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/auth'); return; }

    const curr = interactions.get(postId) ?? { liked: false, likeCount: 0, saved: false, saveCount: 0 };
    const newSaved = !curr.saved;

    setInteractions(prev => {
      const next = new Map(prev);
      const c = next.get(postId) ?? { liked: false, likeCount: 0, saved: false, saveCount: 0 };
      next.set(postId, { ...c, saved: newSaved, saveCount: Math.max(0, c.saveCount + (newSaved ? 1 : -1)) });
      return next;
    });
    pendingSaves.current.set(postId, newSaved);

    const existing = saveTimers.current.get(postId);
    if (existing) clearTimeout(existing);
    saveTimers.current.set(postId, setTimeout(() => {
      const shouldSave = pendingSaves.current.get(postId);
      if (shouldSave === undefined) return;
      pendingSaves.current.delete(postId);
      saveTimers.current.delete(postId);
      (shouldSave ? savePost(postId) : unsavePost(postId)).catch((err: any) => {
        if (err?.response?.data?.errorCode === 'BAD_REQUEST') {
          toast.info(shouldSave ? 'You already saved this post.' : 'You already unsaved this post.');
          return;
        }
        setInteractions(prev => {
          const next = new Map(prev);
          const c = next.get(postId);
          if (c) next.set(postId, { ...c, saved: !shouldSave, saveCount: Math.max(0, c.saveCount + (shouldSave ? -1 : 1)) });
          return next;
        });
      });
    }, 1000));
  }, [isAuthenticated, navigate, interactions]);

  // Client-side filtering only for fields the API doesn't support (category/tags)
  const filteredPosts = useMemo(() => {
    let result = [...allPosts];

    // Apply category/tag filter (not supported by API)
    if (appliedFilters.Category?.length) {
      result = result.filter(post =>
        post.questions?.some(q =>
          q.categories?.some(cat =>
            appliedFilters.Category.some(fc => cat.toLowerCase() === fc.toLowerCase())
          )
        )
      );
    }

    return result;
  }, [allPosts, appliedFilters]);

  // API returns sorted results, no client-side sorting needed
  const sortedPosts = filteredPosts;

  const fetchPosts = useCallback(async (pageNum: number, reset: boolean) => {
    setLoading(true);
    setError(null);
    try {
      // Build API params
      const params: any = {
        page: pageNum,
        sortBy: SORT_TO_API[activeSort] || 'RELEVANCE',
      };

      // Filters the API supports
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;
      if (appliedFilters.Role?.[0]) params.role = appliedFilters.Role[0];
      if (appliedFilters.Company?.[0]) params.company = appliedFilters.Company[0];
      if (appliedFilters.Round?.[0]) params.round = appliedFilters.Round[0];
      if (appliedFilters.Level?.[0]) params.Level = appliedFilters.Level[0];
      if (appliedFilters.Time?.[0]) params.time = TIME_TO_API[appliedFilters.Time[0]] || undefined;

      // Use public API for non-authenticated users, only fetch first page
      const fetchFn = isAuthenticated ? getPosts : getPublicPosts;
      const res = await fetchFn(isAuthenticated ? params : { page: 0 });
      const data = res.data?.data ?? res.data;
      const content: Post[] = Array.isArray(data) ? data : [];

      setAllPosts(prev => reset ? content : [...prev, ...content]);
      initInteractions(content, reset);
      // No pagination info in response — if fewer than 10 results, it's the last page
      setHasMore(isAuthenticated ? content.length >= 10 : false);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setError('Failed to load experiences. Please try again.');
      if (reset) {
        setAllPosts([]);
      }
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  }, [debouncedSearchQuery, appliedFilters, activeSort, isAuthenticated, initInteractions]);

  // Refetch when filters or search changes (reset to first page)
  useEffect(() => {
    fetchPosts(0, true);
  }, [fetchPosts]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchPosts(page + 1, false);
    }
  };

  const toggleTempFilter = (filter: string, option: string) => {
    setTempFilters(prev => {
      const current = prev[filter] || [];
      return { ...prev, [filter]: current.includes(option) ? [] : [option] };
    });
  };

  const applyFilter = (filter: string) => {
    setAppliedFilters(prev => ({ ...prev, [filter]: [...(tempFilters[filter] || [])] }));
    setOpenFilter(null);
  };

  const resetFilter = (filter: string) => {
    setTempFilters(prev => ({ ...prev, [filter]: [] }));
  };

  const handleOpenFilter = (filter: string) => {
    if (openFilter === filter) {
      setOpenFilter(null);
    } else {
      setTempFilters(prev => ({ ...prev, [filter]: [...(appliedFilters[filter] || [])] }));
      setOpenFilter(filter);
      if (filter === 'Company') setCompanySearch('');
      if (filter === 'Company') setCompanySizeChip(null);
      if (filter === 'Role') setRoleSearch('');
      if (filter === 'Role') setRoleCategoryChip(null);
    }
  };

  const totalApplied = Object.values(appliedFilters).reduce((sum, arr) => sum + arr.length, 0);

  const clearAllFilters = () => {
    setAppliedFilters({});
    setTempFilters({});
    setSearchQuery('');
    setDebouncedSearchQuery('');
  };

  // Safe date formatter
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // Safe question access
  const getQuestions = (post: Post) => {
    return post.questions || [];
  };

  // ── Companies directory derived state ──
  const displayedCompanies = useMemo(() => {
    let filtered = DIR_COMPANIES;
    if (activeCategory !== 'All') {
      filtered = filtered.filter((c) => c.category === activeCategory);
    }
    if (companyDirQuery.trim()) {
      const text = companyDirQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        `${c.name} ${c.description} ${c.category}`.toLowerCase().includes(text)
      );
    }
    return filtered;
  }, [activeCategory, companyDirQuery]);

  const DIR_PER_PAGE = activeCategory === 'All' ? 27 : 19;
  const paginatedCompanies = displayedCompanies.slice(0, companyDirPage * DIR_PER_PAGE);
  const hasMoreCompanies = paginatedCompanies.length < displayedCompanies.length;

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCompanyDirPage(1);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-24 pb-20 bg-[#f9fafb]">
        {/* ─── Hero Header ─── */}
        <div className="max-w-6xl mx-auto px-6 my-[40px]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] text-sm font-medium mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(221,91%,60%)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[hsl(221,91%,60%)]"></span>
                </span>
                Community-sourced
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold text-[hsl(222,22%,15%)] tracking-tight mb-2 font-[family-name:var(--font-serif)]">
                Interview Insights
              </h1>
              <p className="text-lg text-[hsl(222,12%,45%)] max-w-xl">
                Real interview experiences from the community, seamlessly organized by company, role, round, and level.
              </p>
            </div>
            <Link to={isAuthenticated ? '/add-experience' : '/auth'} state={!isAuthenticated ? { from: { pathname: '/interview-insights' } } : undefined}>
              <Button className="bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white rounded-xl shadow-lg shadow-[hsl(221,91%,60%)]/20 h-11 px-6 text-sm gap-2 shrink-0">
                <Plus className="w-4 h-4" />
                Share Your Experience
              </Button>
            </Link>
          </div>

          {/* Stats Row */}
          <div className="mt-10 grid grid-cols-1 divide-y divide-[hsl(220,16%,90%)] border-y border-[hsl(220,16%,90%)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { label: 'Companies', value: '420+' },
              { label: 'Total Notes', value: '18,600' },
              { label: 'New This Month', value: '1,248' },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center justify-center py-7 text-center">
                <div className="text-3xl font-semibold tracking-tight text-[hsl(222,22%,15%)]">{stat.value}</div>
                <div className="mt-2 text-sm font-medium text-[hsl(222,12%,45%)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Tab Bar ─── */}
        <div className="max-w-6xl mx-auto px-6 mb-8">
          <div className="flex w-full gap-2">
            {(['feed', 'companies'] as const).map((tab) => {
              const label = tab === 'companies' ? 'Companies' : 'Feed';
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                      : 'bg-[hsl(220,20%,96%)] text-[hsl(222,12%,45%)] hover:bg-[hsl(220,20%,92%)]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Content Area ─── */}
        <div className="max-w-6xl mx-auto px-6">

          {/* ══════════ Tab: Feed (backend-wired) ══════════ */}
          {activeTab === 'feed' && (
            <div className="min-w-0">
              {/* Section header */}
              <div className="flex items-end justify-between gap-4 border-b border-[hsl(220,16%,90%)] pb-4 mb-6">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-[hsl(222,22%,15%)] font-[family-name:var(--font-serif)]">
                    Recent Interview Notes
                  </h2>
                  <p className="mt-1.5 text-base text-[hsl(222,12%,45%)]">
                    Fresh notes and experiences across the directory.
                  </p>
                </div>
              </div>

              {/* Controls: search + filters + sort */}
              <div className="flex flex-col gap-4 mb-6">
                {/* Search */}
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(222,12%,55%)]" />
                  <input
                    type="text"
                    placeholder="Search experiences..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[hsl(220,16%,90%)] bg-white text-sm focus:border-[hsl(221,91%,60%)] transition-all outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)]" />
                    </button>
                  )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Sort Dropdown */}
                  <div className="relative md:order-last md:ml-auto">
                    <button
                      onClick={() => setOpenFilter(openFilter === '__sort__' ? null : '__sort__')}
                      className="flex items-center gap-1.5 text-sm text-[hsl(222,12%,50%)] hover:text-[hsl(222,22%,15%)] transition-colors"
                    >
                      <ListFilter className="w-4 h-4" />
                      Sort: {activeSort}
                    </button>
                    {openFilter === '__sort__' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                        <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden p-1">
                          {SORT_OPTIONS.map(sort => (
                            <button
                              key={sort}
                              onClick={() => { setActiveSort(sort); setOpenFilter(null); }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                activeSort === sort
                                  ? 'bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] font-medium'
                                  : 'text-[hsl(222,22%,15%)] hover:bg-[hsl(220,20%,98%)]'
                              }`}
                            >
                              {sort}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2 relative z-20">
                    {Object.keys(FILTER_OPTIONS).map(filter => {
                      const isOpen = openFilter === filter;
                      const count = appliedFilters[filter]?.length || 0;
                      return (
                        <div key={filter} className="relative">
                          <button
                            onClick={() => handleOpenFilter(filter)}
                            className={`h-8 px-3 rounded-full bg-white border text-xs font-medium transition-all flex items-center gap-1.5 select-none ${
                              isOpen
                                ? 'border-[hsl(221,91%,60%)] text-[hsl(221,91%,60%)] ring-2 ring-[hsl(221,91%,60%)]/20'
                                : count > 0
                                  ? 'border-[hsl(221,91%,60%)]/40 text-[hsl(221,91%,60%)]'
                                  : 'border-[hsl(220,16%,90%)] text-[hsl(222,12%,45%)] hover:border-[hsl(221,91%,60%)] hover:text-[hsl(221,91%,60%)]'
                            }`}
                          >
                            {filter}
                            {count > 0 && (
                              <span className="w-4 h-4 rounded-full bg-[hsl(221,91%,60%)] text-white text-[9px] flex items-center justify-center">
                                {count}
                              </span>
                            )}
                            <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {isOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenFilter(null)} />
                              {/* Company Filter Dropdown */}
                              {filter === 'Company' && (
                                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
                                  <div className="p-2 flex flex-wrap gap-1.5 border-b border-[hsl(220,16%,92%)]">
                                    {COMPANY_SIZE_CHIPS.map(chip => (
                                      <button
                                        key={chip}
                                        onClick={() => setCompanySizeChip(companySizeChip === chip ? null : chip)}
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                                          companySizeChip === chip
                                            ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                                            : 'border-[hsl(220,16%,90%)] text-[hsl(222,12%,50%)] hover:border-[hsl(221,91%,60%)]/40 hover:text-[hsl(221,91%,60%)]'
                                        }`}
                                      >
                                        {chip}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="p-2 border-b border-[hsl(220,16%,92%)]">
                                    <div className="relative">
                                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(222,12%,55%)]" />
                                      <input
                                        type="text"
                                        placeholder="Search company…"
                                        value={companySearch}
                                        onChange={e => setCompanySearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[hsl(220,16%,90%)] bg-[hsl(220,20%,98%)] text-sm focus:bg-white focus:border-[hsl(221,91%,60%)] transition-all outline-none"
                                        autoFocus
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-56 overflow-y-auto">
                                    <div className="p-2 space-y-0.5">
                                      {(companySizeChip ? COMPANY_BY_SIZE[companySizeChip] : ALL_COMPANIES).filter(c =>
                                        companySearch ? c.toLowerCase().includes(companySearch.toLowerCase()) : true
                                      ).slice(0, 50).map(option => (
                                        <label key={option} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                          <input type="radio" name="company-filter" checked={(tempFilters['Company'] || []).includes(option)} onChange={() => toggleTempFilter('Company', option)} className="w-3.5 h-3.5 border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]" />
                                          <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                    <button onClick={() => { resetFilter('Company'); setCompanySizeChip(null); setCompanySearch(''); }} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                    <button onClick={() => applyFilter('Company')} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
                                  </div>
                                </div>
                              )}

                              {/* Role Filter Dropdown */}
                              {filter === 'Role' && (
                                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
                                  <div className="p-2 flex flex-wrap gap-1.5 border-b border-[hsl(220,16%,92%)]">
                                    {ROLE_CATEGORY_CHIPS.map(chip => (
                                      <button
                                        key={chip}
                                        onClick={() => setRoleCategoryChip(roleCategoryChip === chip ? null : chip)}
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                                          roleCategoryChip === chip
                                            ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                                            : 'border-[hsl(220,16%,90%)] text-[hsl(222,12%,50%)] hover:border-[hsl(221,91%,60%)]/40 hover:text-[hsl(221,91%,60%)]'
                                        }`}
                                      >
                                        {chip}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="p-2 border-b border-[hsl(220,16%,92%)]">
                                    <div className="relative">
                                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(222,12%,55%)]" />
                                      <input
                                        type="text"
                                        placeholder="Search role…"
                                        value={roleSearch}
                                        onChange={e => setRoleSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[hsl(220,16%,90%)] bg-[hsl(220,20%,98%)] text-sm focus:bg-white focus:border-[hsl(221,91%,60%)] transition-all outline-none"
                                        autoFocus
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-56 overflow-y-auto">
                                    <div className="p-2 space-y-0.5">
                                      {(roleCategoryChip ? ROLE_BY_CATEGORY[roleCategoryChip] : ALL_ROLES).filter(r =>
                                        roleSearch ? r.toLowerCase().includes(roleSearch.toLowerCase()) : true
                                      ).slice(0, 50).map(option => (
                                        <label key={option} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                          <input type="radio" name="role-filter" checked={(tempFilters['Role'] || []).includes(option)} onChange={() => toggleTempFilter('Role', option)} className="w-3.5 h-3.5 border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]" />
                                          <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                    <button onClick={() => { resetFilter('Role'); setRoleCategoryChip(null); setRoleSearch(''); }} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                    <button onClick={() => applyFilter('Role')} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
                                  </div>
                                </div>
                              )}

                              {/* Round Filter Dropdown */}
                              {filter === 'Round' && (
                                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
                                  <div className="max-h-64 overflow-y-auto">
                                    {ROUND_GROUPS.map((group, gi) => (
                                      <div key={group.label}>
                                        {gi > 0 && <div className="mx-3 border-t border-[hsl(220,16%,94%)]" />}
                                        <div className="px-3 pt-2 pb-1.5">
                                          <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">{group.label}</span>
                                        </div>
                                        <div className="px-2.5 pb-2 flex flex-wrap gap-1.5">
                                          {group.options.map(option => {
                                            const isSelected = (tempFilters['Round'] || []).includes(option);
                                            return (
                                              <button
                                                key={option}
                                                onClick={() => toggleTempFilter('Round', option)}
                                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                                                  isSelected
                                                    ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                                                    : 'border-[hsl(220,16%,90%)] text-[hsl(222,12%,50%)] hover:border-[hsl(221,91%,60%)]/40 hover:text-[hsl(221,91%,60%)]'
                                                }`}
                                              >
                                                {option}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                    <button onClick={() => resetFilter('Round')} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                    <button onClick={() => applyFilter('Round')} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
                                  </div>
                                </div>
                              )}

                              {/* Level Filter Dropdown */}
                              {filter === 'Level' && (
                                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
                                  <div className="p-2 max-h-56 overflow-y-auto space-y-0.5">
                                    {FILTER_OPTIONS.Level.map(option => (
                                      <label key={option} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                        <input
                                          type="radio"
                                          name="level-filter"
                                          checked={(tempFilters['Level'] || []).includes(option)}
                                          onChange={() => toggleTempFilter('Level', option)}
                                          className="w-3.5 h-3.5 border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]"
                                        />
                                        <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                      </label>
                                    ))}
                                  </div>
                                  <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                    <button onClick={() => resetFilter('Level')} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                    <button onClick={() => applyFilter('Level')} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
                                  </div>
                                </div>
                              )}

                              {/* Time Filter Dropdown */}
                              {filter === 'Time' && (
                                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
                                  <div className="p-2 max-h-56 overflow-y-auto space-y-0.5">
                                    {FILTER_OPTIONS.Time.map(option => (
                                      <label key={option} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-[hsl(220,20%,98%)] cursor-pointer transition-colors">
                                        <input
                                          type="radio"
                                          name="time-filter"
                                          checked={(tempFilters['Time'] || []).includes(option)}
                                          onChange={() => toggleTempFilter('Time', option)}
                                          className="w-3.5 h-3.5 border-[hsl(220,16%,90%)] accent-[hsl(221,91%,60%)]"
                                        />
                                        <span className="text-sm text-[hsl(222,22%,15%)]">{option}</span>
                                      </label>
                                    ))}
                                  </div>
                                  <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                    <button onClick={() => resetFilter('Time')} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                    <button onClick={() => applyFilter('Time')} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
                                  </div>
                                </div>
                              )}

                              {/* Category Filter Dropdown */}
                              {filter === 'Category' && (
                                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden">
                                  <div className="max-h-72 overflow-y-auto">
                                    {TAG_GROUPS.map((group, gi) => (
                                      <div key={group.label}>
                                        {gi > 0 && <div className="mx-3 border-t border-[hsl(220,16%,94%)]" />}
                                        <div className="px-3 pt-2 pb-1.5">
                                          <span className="text-[10px] font-semibold text-[hsl(222,12%,55%)] uppercase tracking-wider">{group.label}</span>
                                        </div>
                                        <div className="px-2.5 pb-2 flex flex-wrap gap-1.5">
                                          {group.tags.map(tag => {
                                            const isSelected = (tempFilters['Category'] || []).includes(tag);
                                            return (
                                              <button
                                                key={tag}
                                                onClick={() => toggleTempFilter('Category', tag)}
                                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                                                  isSelected
                                                    ? 'border-[hsl(221,91%,60%)] bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)]'
                                                    : 'border-[hsl(220,16%,90%)] text-[hsl(222,12%,50%)] hover:border-[hsl(221,91%,60%)]/40 hover:text-[hsl(221,91%,60%)]'
                                                }`}
                                              >
                                                {tag}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="p-2 bg-[hsl(220,20%,98%)] border-t border-[hsl(220,16%,90%)] flex justify-between">
                                    <button onClick={() => resetFilter('Category')} className="text-xs text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] font-medium">Reset</button>
                                    <button onClick={() => applyFilter('Category')} className="px-3 py-1 rounded-lg bg-[hsl(221,91%,60%)] text-white text-xs font-medium hover:bg-[hsl(221,91%,55%)]">Apply</button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}

                    {totalApplied > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="h-8 px-3 rounded-full text-xs font-medium text-[hsl(222,12%,45%)] hover:text-[hsl(222,22%,15%)] flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Initial Loading State */}
              {isInitialLoading && (
                <div className="text-center py-20 bg-white rounded-2xl border border-[hsl(220,16%,90%)]">
                  <Loader2 className="w-8 h-8 animate-spin text-[hsl(221,91%,60%)] mx-auto" />
                  <p className="mt-2 text-[hsl(222,12%,45%)]">Loading experiences...</p>
                </div>
              )}

              {/* Error State */}
              {error && !loading && !isInitialLoading && (
                <div className="text-center py-20 bg-white rounded-2xl border border-red-200">
                  <p className="text-red-600 mb-2">{error}</p>
                  <button
                    onClick={() => fetchPosts(0, true)}
                    className="text-[hsl(221,91%,60%)] text-sm font-medium hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && !isInitialLoading && sortedPosts.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border border-[hsl(220,16%,90%)]">
                  <p className="text-[hsl(222,12%,45%)] mb-2">No experiences match your filters.</p>
                  <button onClick={clearAllFilters} className="text-[hsl(221,91%,60%)] text-sm font-medium hover:underline">Clear all filters</button>
                </div>
              )}

              {/* Posts List */}
              <div className="space-y-4">
                {sortedPosts.map((post, i) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.5) }}
                    className={`group bg-white rounded-2xl border border-[hsl(220,16%,90%)] hover:border-[hsl(221,91%,60%)]/25 hover:shadow-lg hover:shadow-[hsl(221,91%,60%)]/[0.04] transition-all duration-300 ${!isAuthenticated ? 'cursor-pointer' : ''}`}
                    onClick={!isAuthenticated ? () => navigate('/auth', { state: { from: { pathname: '/interview-insights' } } }) : undefined}
                  >
                    <div className="p-6">
                      {/* ── Card Header (always visible) ── */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CompanyLogo company={post.company} />
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="font-semibold text-[hsl(222,22%,15%)]">{post.company || 'Unknown'}</span>
                            <span className="text-[hsl(222,12%,70%)]">·</span>
                            <span className="text-[hsl(222,12%,45%)]">{post.role || 'Unknown Role'}</span>
                            <span className="text-[hsl(222,12%,70%)]">·</span>
                            <span className="text-[hsl(222,12%,45%)]">{post.round || 'Not specified'}</span>
                          </div>
                        </div>
                        {post.outcome && (
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${OUTCOME_COLORS[post.outcome] || 'bg-slate-50 text-slate-500'}`}>
                            {post.outcome}
                          </span>
                        )}
                      </div>

                      {/* ── Blurred content for non-authenticated users ── */}
                      {!isAuthenticated ? (
                        <div className="relative">
                          <div className="blur-sm select-none pointer-events-none">
                            <div className="flex items-center gap-3 text-xs text-[hsl(222,12%,55%)] mb-3">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(post.date)}
                              </span>
                            </div>
                            <div className="text-sm text-[hsl(222,12%,35%)] leading-relaxed line-clamp-2 mb-4">
                              {post.summary ? <Markdown className="text-sm text-[hsl(222,12%,35%)]">{post.summary}</Markdown> : 'No summary available'}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                              {getQuestions(post).length > 0 ? (
                                getQuestions(post).slice(0, 3).map((q, qi) => (
                                  <span
                                    key={q.id || qi}
                                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,92%)] text-xs text-[hsl(222,22%,25%)] max-w-[220px] truncate"
                                  >
                                    <span className="w-1 h-1 rounded-full bg-[hsl(221,91%,60%)] mr-2 shrink-0" />
                                    {q.title || 'Question'}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-[hsl(222,12%,55%)]">No questions available</span>
                              )}
                            </div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 border border-[hsl(220,16%,90%)] shadow-sm">
                              <Lock className="w-4 h-4 text-[hsl(221,91%,60%)]" />
                              <span className="text-sm font-medium text-[hsl(222,22%,15%)]">Sign in to view details</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* ── Meta ── */}
                          <div className="flex items-center gap-3 text-xs text-[hsl(222,12%,55%)] mb-3">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(post.date)}
                            </span>
                          </div>

                          {/* ── Summary ── */}
                          <div className="text-sm text-[hsl(222,12%,35%)] leading-relaxed line-clamp-2 mb-4">
                            {post.summary ? <Markdown className="text-sm text-[hsl(222,12%,35%)]">{post.summary}</Markdown> : 'No summary available'}
                          </div>

                          {/* ── Question Preview Chips ── */}
                          <div className="flex flex-wrap items-center gap-2 mb-5">
                            {getQuestions(post).length > 0 ? (
                              <>
                                {getQuestions(post).slice(0, 3).map((q, qi) => (
                                  <span
                                    key={q.id || qi}
                                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,92%)] text-xs text-[hsl(222,22%,25%)] max-w-[220px] truncate"
                                  >
                                    <span className="w-1 h-1 rounded-full bg-[hsl(221,91%,60%)] mr-2 shrink-0" />
                                    {q.title || 'Question'}
                                  </span>
                                ))}
                                {getQuestions(post).length > 3 && (
                                  <span className="px-2.5 py-1 rounded-lg bg-[hsl(221,91%,60%)]/8 text-[hsl(221,91%,60%)] text-xs font-medium">
                                    +{getQuestions(post).length - 3} more
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-[hsl(222,12%,55%)]">No questions available</span>
                            )}
                          </div>

                          {/* ── Actions ── */}
                          <div className="flex items-center justify-between pt-4 border-t border-[hsl(220,16%,94%)]">
                            <div className="flex items-center gap-4">
                              {/* Like button */}
                              <button
                                onClick={(e) => toggleLike(post.id, e)}
                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                                  interactions.get(post.id)?.liked ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)]'
                                }`}
                              >
                                <ThumbsUp className={`w-3.5 h-3.5 transition-transform ${interactions.get(post.id)?.liked ? 'fill-current scale-110' : ''}`} />
                                {interactions.get(post.id)?.likeCount ?? 0}
                              </button>
                              <span className="flex items-center gap-1.5 text-xs text-[hsl(222,12%,55%)]">
                                <MessageSquare className="w-3.5 h-3.5" />
                                {post.commentCount ?? 0}
                              </span>
                              {/* Save button */}
                              <button
                                onClick={(e) => toggleSave(post.id, e)}
                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                                  interactions.get(post.id)?.saved ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)]'
                                }`}
                              >
                                <Bookmark className={`w-3.5 h-3.5 transition-transform ${interactions.get(post.id)?.saved ? 'fill-current scale-110' : ''}`} />
                                {interactions.get(post.id)?.saveCount ?? 0}
                              </button>

                              {/* Share Popover */}
                              <SharePopover
                                data={{
                                  title: `${post.company} — ${post.round || 'Interview Experience'}`,
                                  subtitle: post.role,
                                  tags: [post.level, post.outcome, post.round].filter(Boolean),
                                  summary: post.summary || `Interview experience at ${post.company} for ${post.role} position`,
                                  url: `${window.location.origin}/experience/${post.id}`,
                                }}
                              >
                                <button
                                  type="button"
                                  className="flex items-center gap-1.5 text-xs text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)] transition-colors"
                                >
                                  <div className="w-6 h-6 rounded-full bg-[hsl(221,91%,60%)] flex items-center justify-center pointer-events-none">
                                    <Share2 className="w-3 h-3 text-white" />
                                  </div>
                                </button>
                              </SharePopover>
                            </div>

                            <div className="flex items-center gap-2">
                              <Link
                                to={`/experience/${post.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // premium_note_clicked —— 点击打开面经详情。
                                  // 注：Beta 阶段面经无 premium 标记，故对所有打开的面经上报；
                                  // 待数据模型加入 premium 标记后再按 is_premium 过滤。
                                  safeCapture(posthog, EVENTS.PREMIUM_NOTE_CLICKED, {
                                    note_id: post.id,
                                  });
                                }}
                                className="px-4 py-1.5 rounded-lg bg-[hsl(222,22%,15%)] text-white text-xs font-medium hover:bg-[hsl(222,22%,20%)] transition-colors"
                              >
                                View Post
                              </Link>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.article>
                ))}
              </div>

              {/* Load More Button */}
              {sortedPosts.length > 0 && hasMore && !loading && (
                <div className="text-center pt-6 pb-2">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    className="text-[hsl(221,91%,60%)] border-[hsl(221,91%,60%)]/20 hover:bg-[hsl(221,91%,60%)]/5 rounded-xl"
                  >
                    Load more experiences
                  </Button>
                </div>
              )}

              {/* Loading More Indicator */}
              {loading && sortedPosts.length > 0 && (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-[hsl(221,91%,60%)] mx-auto" />
                </div>
              )}
            </div>
          )}

          {/* ══════════ Tab: Companies (directory — mock) ══════════ */}
          {activeTab === 'companies' && (
            <div className="space-y-16">
              {/* Company Types Tiles */}
              <div className="grid gap-6 sm:grid-cols-2">
                {CATEGORY_TILES.map((cat) => {
                  const isActive = activeCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => handleCategoryChange(isActive ? 'All' : cat.name)}
                      className={`group relative flex h-[210px] w-full flex-col items-start overflow-hidden rounded-[20px] text-left transition-all hover:-translate-y-1 hover:shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] ${
                        isActive
                          ? 'ring-2 ring-[hsl(221,91%,60%)] ring-offset-2 ring-offset-[#f9fafb] shadow-md'
                          : 'shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]'
                      }`}
                    >
                      <div className="absolute inset-x-0 top-0 z-0 h-[313px]">
                        <img alt="" className="size-full object-cover" src={cat.image} />
                      </div>
                      <div className="relative z-10 flex size-full flex-col p-6">
                        <div className="mb-1.5 text-[11px] font-bold uppercase leading-[15.4px] tracking-[1.1px] text-[hsl(221,91%,60%)]/80">
                          {cat.notes}
                        </div>
                        <h3 className="text-[20px] font-bold leading-[28px] tracking-[-0.5px] text-[hsl(222,22%,15%)]">{cat.name}</h3>
                        <p className="mt-1.5 text-[14px] font-medium leading-[22.75px] text-[hsl(222,22%,15%)]/80">{cat.subtitle}</p>
                        <div className="mt-auto w-full space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {cat.examples.map((ex) => (
                              <Link
                                key={ex}
                                to={`/interview-insights/${ex.toLowerCase().replace(/\s+/g, '-')}`}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded-full bg-white/40 px-[10px] py-1 text-[11px] font-semibold leading-[15.4px] text-[hsl(222,22%,15%)] transition-colors hover:bg-white/60"
                              >
                                {ex}
                              </Link>
                            ))}
                          </div>
                          <div className={`flex items-center pt-2 text-[14px] font-semibold leading-[20px] transition-colors ${isActive ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,22%,15%)] group-hover:text-[hsl(222,22%,15%)]/80'}`}>
                            Explore <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Search & Filters */}
              <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <label className="flex flex-1 items-center gap-3 rounded-full border border-[hsl(220,16%,90%)] bg-white px-4 py-2.5 transition focus-within:border-[hsl(221,91%,60%)] focus-within:ring-1 focus-within:ring-[hsl(221,91%,60%)]">
                    <Search className="size-4 shrink-0 text-[hsl(222,12%,55%)]" />
                    <input
                      value={companyDirQuery}
                      onChange={(e) => { setCompanyDirQuery(e.target.value); setCompanyDirPage(1); }}
                      placeholder="Search companies, roles, rounds, or interview notes..."
                      className="min-w-0 flex-1 bg-transparent text-sm text-[hsl(222,22%,15%)] outline-none placeholder:text-[hsl(222,12%,55%)]"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleFilter />
                    <CompanyFilter />
                    <RoundFilter />
                    <LevelFilter />
                    <TimeFilter />
                  </div>
                </div>

                {/* Latest Ticker */}
                <div className="flex items-center border-t border-[hsl(220,16%,90%)] pt-6">
                  <span className="mr-4 inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[hsl(222,12%,45%)] z-10">
                    <Clock className="size-4" /> Latest
                  </span>
                  <div className="flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
                    <style>{`@keyframes latest-marquee { to { transform: translateX(-50%); } }`}</style>
                    <div className="flex w-max shrink-0 animate-[latest-marquee_30s_linear_infinite] hover:[animation-play-state:paused]">
                      <div className="flex items-center gap-2 pr-2">
                        {LATEST_TICKER.map((item, i) => (
                          <span key={`a-${i}`} className="cursor-default rounded-full bg-[hsl(220,20%,96%)] px-3 py-1.5 text-xs font-medium text-[hsl(222,12%,40%)]">{item}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pr-2" aria-hidden="true">
                        {LATEST_TICKER.map((item, i) => (
                          <span key={`b-${i}`} className="cursor-default rounded-full bg-[hsl(220,20%,96%)] px-3 py-1.5 text-xs font-medium text-[hsl(222,12%,40%)]">{item}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Companies Grid */}
              <section className="space-y-6">
                <div className="flex items-end justify-between gap-4 border-b border-[hsl(220,16%,90%)] pb-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-[hsl(222,22%,15%)] font-[family-name:var(--font-serif)]">
                      {activeCategory === 'All' ? 'Featured Companies' : `${activeCategory} Companies`}
                    </h2>
                    <p className="mt-2 text-base text-[hsl(222,12%,45%)]">
                      {activeCategory === 'All'
                        ? 'Browse companies with the most recent community interview insights.'
                        : CATEGORY_TILES.find((c) => c.name === activeCategory)?.subtitle}
                    </p>
                  </div>
                  {activeCategory !== 'All' && (
                    <button onClick={() => handleCategoryChange('All')} className="shrink-0 text-sm font-medium text-[hsl(222,12%,45%)] transition-colors hover:text-[hsl(222,22%,15%)]">
                      Clear company type
                    </button>
                  )}
                </div>

                {displayedCompanies.length > 0 ? (
                  <div className="space-y-10">
                    {activeCategory === 'All' ? (
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {paginatedCompanies.map((company) => (
                          <InlineCompanyCard key={company.id} company={company} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-5 lg:flex-row">
                        {paginatedCompanies.length > 0 && (
                          <div className="w-full lg:w-[40%] xl:w-1/3">
                            <LargeCompanyCard company={paginatedCompanies[0]} />
                          </div>
                        )}
                        {paginatedCompanies.length > 1 && (
                          <div className="grid w-full gap-5 sm:grid-cols-2 lg:w-[60%] xl:w-2/3">
                            {paginatedCompanies.slice(1).map((company) => (
                              <InlineCompanyCard key={company.id} company={company} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {hasMoreCompanies && (
                      <div className="flex items-center justify-center border-t border-[hsl(220,16%,90%)]/60 pt-6">
                        <button
                          onClick={() => setCompanyDirPage(p => p + 1)}
                          className="flex h-9 items-center justify-center rounded-md border border-[hsl(220,16%,90%)] bg-transparent px-6 text-sm font-medium text-[hsl(222,12%,45%)] transition-colors hover:bg-[hsl(220,20%,96%)] hover:text-[hsl(222,22%,15%)]"
                        >
                          Load More
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-[hsl(222,12%,45%)]">No companies found matching your search.</div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
