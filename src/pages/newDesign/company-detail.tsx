import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  ListFilter,
  Plus,
  Clock,
  Loader2,
  MessageSquare,
  ThumbsUp,
  Bookmark,
  Share2,
  Lock,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { Button } from '../../components/newDesign/ui/button';
import { getPosts, getPublicPosts, likePost, unlikePost, savePost, unsavePost, getCompanyProfile, getPostOptions } from '../../services/CommunityService';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { usePostHog } from 'posthog-js/react';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';
import { SharePopover } from '@/components/newDesign/share-popover';
import { Markdown } from '@/components/newDesign/ui/markdown';
import { CompanyLogo } from '../../components/newDesign/ui/company-logo';
import { RoleFilter, RoundFilter, LevelFilter, TimeFilter } from '@/components/newDesign/interview-insights/filter-popovers';

// ─── Post Interface (shared shape with the listing feed) ──
interface PostQuestion {
  id: string;
  seq: number;
  label: string;
  title: string;
  categories: string[];
  notes: string;
}

interface Post {
  id: string;
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

const OUTCOME_COLORS: Record<string, string> = {
  Offer: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-600',
  'No response': 'bg-slate-50 text-slate-500',
  Pending: 'bg-blue-50 text-blue-600',
};

// ─── Company meta (mock — no companies API yet) ──
type CompanyMeta = {
  name: string;
  category: string;
  description: string;
  totalNotes: number;
  last30Days: number;
  updatedAgo: string;
};

const COMPANY_META: Record<string, CompanyMeta> = {
  google: { name: 'Google', category: 'FAANG / Big Tech', description: 'Structured coding, system design, and Googleyness notes from SWE, PM, and EM candidates.', totalNotes: 1842, last30Days: 94, updatedAgo: '2h ago' },
  meta: { name: 'Meta', category: 'FAANG / Big Tech', description: 'Product sense, execution, coding, and behavioral writeups across IC and manager loops.', totalNotes: 1274, last30Days: 67, updatedAgo: '4h ago' },
  openai: { name: 'OpenAI', category: 'Mid-sized', description: 'ML systems, research engineering, alignment, and infrastructure interview notes.', totalNotes: 386, last30Days: 58, updatedAgo: '1h ago' },
  amazon: { name: 'Amazon', category: 'FAANG / Big Tech', description: 'Leadership Principles, bar raiser, coding, and system design experiences.', totalNotes: 2105, last30Days: 112, updatedAgo: '1h ago' },
  apple: { name: 'Apple', category: 'FAANG / Big Tech', description: 'Team-specific technical screens and onsite loops for hardware, platform, and product teams.', totalNotes: 893, last30Days: 41, updatedAgo: '6h ago' },
  microsoft: { name: 'Microsoft', category: 'FAANG / Big Tech', description: 'Growth-mindset interviews, team-match loops, coding, and design rounds.', totalNotes: 1537, last30Days: 83, updatedAgo: '3h ago' },
  anthropic: { name: 'Anthropic', category: 'Mid-sized', description: 'Safety-focused technical screens, ML infrastructure, and research collaboration rounds.', totalNotes: 214, last30Days: 43, updatedAgo: '5h ago' },
  deepmind: { name: 'DeepMind', category: 'Mid-sized', description: 'Research-heavy interview notes covering ML theory, papers, and systems depth.', totalNotes: 178, last30Days: 31, updatedAgo: '1d ago' },
  stripe: { name: 'Stripe', category: 'Large Enterprises', description: 'Practical engineering, debugging, API design, and product-minded system design notes.', totalNotes: 743, last30Days: 48, updatedAgo: '2h ago' },
  figma: { name: 'Figma', category: 'Mid-sized', description: 'Collaborative product engineering and design systems interview experiences.', totalNotes: 312, last30Days: 27, updatedAgo: '8h ago' },
  databricks: { name: 'Databricks', category: 'Large Enterprises', description: 'Distributed systems, data engineering, and platform interview loops.', totalNotes: 415, last30Days: 34, updatedAgo: '6h ago' },
  citadel: { name: 'Citadel', category: 'Large Enterprises', description: 'Low-latency systems, probability, C++, and trading intuition rounds.', totalNotes: 268, last30Days: 24, updatedAgo: '9h ago' },
  salesforce: { name: 'Salesforce', category: 'Large Enterprises', description: 'Enterprise product, platform architecture, and customer-centric behavioral loops.', totalNotes: 524, last30Days: 32, updatedAgo: '1d ago' },
  perplexity: { name: 'Perplexity', category: 'Small', description: 'Fast-moving AI product interviews with pragmatic systems and product judgment.', totalNotes: 86, last30Days: 20, updatedAgo: '2d ago' },
};

function titleize(id: string) {
  return id
    .split('-')
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

function resolveCompany(companyId: string | undefined): CompanyMeta {
  const id = (companyId || '').toLowerCase();
  if (COMPANY_META[id]) return COMPANY_META[id];
  const name = titleize(id || 'company');
  return {
    name,
    category: 'Company',
    description: `Community-shared interview experiences for ${name} across roles, rounds, and levels.`,
    totalNotes: 0,
    last30Days: 0,
    updatedAgo: 'recently',
  };
}

export function CompanyDetailPage() {
  const { companyId } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const posthog = usePostHog();

  const fallbackCompany = useMemo(() => resolveCompany(companyId), [companyId]);

  // Real category + summary from GET /community/companies/profile (looked up by
  // display name); falls back to the resolved/curated values until it loads.
  const [profile, setProfile] = useState<{ displayName?: string; category?: string; summary?: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getCompanyProfile(fallbackCompany.name)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (!cancelled && data) setProfile(data);
      })
      .catch(() => { /* keep fallback */ });
    return () => { cancelled = true; };
  }, [fallbackCompany.name]);

  const company = useMemo(() => ({
    ...fallbackCompany,
    name: profile?.displayName || fallbackCompany.name,
    category: profile?.category || fallbackCompany.category,
    description: profile?.summary || fallbackCompany.description,
  }), [fallbackCompany, profile]);

  const [activeSort, setActiveSort] = useState<SortOption>('Newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // ── Filter options (from GET /community/posts/options) + applied selections ──
  const [roleOptions, setRoleOptions] = useState<string[] | undefined>(undefined);
  const [roleCategories, setRoleCategories] = useState<string[] | undefined>(undefined);
  const [roundOptions, setRoundOptions] = useState<string[] | undefined>(undefined);
  const [filterRole, setFilterRole] = useState('');
  const [filterRound, setFilterRound] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterTime, setFilterTime] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPostOptions()
      .then(res => {
        const data = res?.data?.data ?? res?.data;
        if (!data || cancelled) return;
        type Group = { category: string; options: string[] };
        const roles: Group[] = Array.isArray(data.roles) ? data.roles : [];
        const rounds: Group[] = Array.isArray(data.rounds) ? data.rounds : [];
        if (roles.length) {
          setRoleCategories(roles.map(g => g.category));
          setRoleOptions([...new Set(roles.flatMap(g => g.options ?? []))]);
        }
        if (rounds.length) setRoundOptions(rounds.flatMap(g => g.options ?? []));
      })
      .catch(() => { /* filters fall back to their hardcoded options */ });
    return () => { cancelled = true; };
  }, []);

  // API state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // interview_notes_browsed —— 进入公司详情页（每次进入上报一次）
  useEffect(() => {
    safeCapture(posthog, EVENTS.INTERVIEW_NOTES_BROWSED, { sort_by: activeSort, company: company.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Like / Save interaction state (mirrors the listing feed) ──
  type PostInteraction = { liked: boolean; likeCount: number; saved: boolean; saveCount: number };
  const [interactions, setInteractions] = useState<Map<string, PostInteraction>>(new Map());
  const likeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingLikes = useRef<Map<string, boolean>>(new Map());
  const pendingSaves = useRef<Map<string, boolean>>(new Map());

  const initInteractions = useCallback((list: Post[], reset: boolean) => {
    setInteractions(prev => {
      const next = reset ? new Map() : new Map(prev);
      for (const p of list) {
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

  const fetchPosts = useCallback(async (pageNum: number, reset: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: pageNum,
        sortBy: SORT_TO_API[activeSort] || 'RELEVANCE',
        company: company.name,
      };
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;
      if (filterRole) params.role = filterRole;
      if (filterRound) params.round = filterRound;
      if (filterLevel) params.level = filterLevel;
      if (filterTime) params.time = TIME_TO_API[filterTime] || undefined;

      const fetchFn = isAuthenticated ? getPosts : getPublicPosts;
      const res = await fetchFn(isAuthenticated ? params : { page: 0, company: company.name });
      const data = res.data?.data ?? res.data;
      const content: Post[] = Array.isArray(data) ? data : [];

      setPosts(prev => reset ? content : [...prev, ...content]);
      initInteractions(content, reset);
      setHasMore(isAuthenticated ? content.length >= 10 : false);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch company posts:', err);
      setError('Failed to load experiences. Please try again.');
      if (reset) setPosts([]);
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  }, [activeSort, debouncedSearchQuery, filterRole, filterRound, filterLevel, filterTime, isAuthenticated, company.name, initInteractions]);

  useEffect(() => {
    fetchPosts(0, true);
  }, [fetchPosts]);

  const handleLoadMore = () => {
    if (!loading && hasMore) fetchPosts(page + 1, false);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const getQuestions = (post: Post) => post.questions || [];

  return (
    <DashboardLayout fullBleed>
      <div className="pb-20 bg-[#f9fafb]">
        <div className="max-w-6xl mx-auto px-6 my-[24px]">
          {/* Back Link */}
          <Link
            to="/interview-insights"
            className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(222,12%,45%)] transition-colors hover:text-[hsl(222,22%,15%)] mb-6"
          >
            <ArrowLeft className="size-4" />
            Back to Directory
          </Link>

          {/* ── Header ── */}
          <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-5">
              <CompanyLogo company={company.name} className="!w-16 !h-16 !text-2xl" />
              <div className="flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight leading-none text-[hsl(222,22%,15%)] font-[family-name:var(--font-serif)]">
                    {company.name}
                  </h1>
                  <span className="rounded-full bg-[hsl(221,91%,60%)]/10 px-3 py-1 text-xs font-medium text-[hsl(221,91%,60%)]">
                    {company.category}
                  </span>
                </div>
                <p className="mt-3 max-w-2xl text-base text-[hsl(222,12%,45%)]">
                  {company.description}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-[hsl(222,12%,45%)]">
                  {company.totalNotes > 0 && (
                    <div className="flex items-center gap-1.5">
                      <FileText className="size-4" />
                      <span className="font-medium text-[hsl(222,22%,15%)]">{company.totalNotes.toLocaleString()}</span> total notes
                    </div>
                  )}
                  {company.last30Days > 0 && (
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <TrendingUp className="size-4" />
                      <span className="font-medium">+{company.last30Days}</span> last 30 days
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span>Updated {company.updatedAgo}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA — reuses the shared Button, consistent with the listing page */}
            <Link
              to={isAuthenticated ? '/add-experience' : '/auth'}
              state={{ from: { pathname: `/interview-insights/${companyId}` } }}
              className="shrink-0"
            >
              <Button className="bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white rounded-xl shadow-lg shadow-[hsl(221,91%,60%)]/20 h-11 px-6 text-sm gap-2 shrink-0">
                <Plus className="w-4 h-4" />
                Share Your Experience
              </Button>
            </Link>
          </header>

          {/* ── Layout Grid ── */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Main Column */}
            <div className="space-y-6 min-w-0">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[hsl(220,16%,90%)]">
                <div className="flex flex-wrap items-center gap-2">
                  <RoleFilter singleSelect options={roleOptions} categories={roleCategories} onApply={sel => setFilterRole(sel[0] || '')} />
                  <RoundFilter singleSelect options={roundOptions} onApply={sel => setFilterRound(sel[0] || '')} />
                  <LevelFilter singleSelect onApply={sel => setFilterLevel(sel[0] || '')} />
                  <TimeFilter singleSelect onApply={sel => setFilterTime(sel[0] || '')} />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setSortOpen(o => !o)}
                    className="flex items-center gap-1.5 text-sm text-[hsl(222,12%,50%)] hover:text-[hsl(222,22%,15%)] transition-colors"
                  >
                    <ListFilter className="w-4 h-4" />
                    Sort: {activeSort}
                  </button>
                  {sortOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                      <div className="absolute top-full right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-[hsl(220,16%,90%)] z-50 overflow-hidden p-1">
                        {SORT_OPTIONS.map(sort => (
                          <button
                            key={sort}
                            onClick={() => { setActiveSort(sort); setSortOpen(false); }}
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
              </div>

              {/* Initial Loading */}
              {isInitialLoading && (
                <div className="text-center py-20 bg-white rounded-2xl border border-[hsl(220,16%,90%)]">
                  <Loader2 className="w-8 h-8 animate-spin text-[hsl(221,91%,60%)] mx-auto" />
                  <p className="mt-2 text-[hsl(222,12%,45%)]">Loading experiences...</p>
                </div>
              )}

              {/* Error */}
              {error && !loading && !isInitialLoading && (
                <div className="text-center py-20 bg-white rounded-2xl border border-red-200">
                  <p className="text-red-600 mb-2">{error}</p>
                  <button onClick={() => fetchPosts(0, true)} className="text-[hsl(221,91%,60%)] text-sm font-medium hover:underline">
                    Try again
                  </button>
                </div>
              )}

              {/* Empty */}
              {!loading && !error && !isInitialLoading && posts.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-[hsl(220,16%,90%)]">
                  <p className="text-[hsl(222,12%,45%)] mb-3">No experiences yet for {company.name}.</p>
                  <Link
                    to={isAuthenticated ? '/add-experience' : '/auth'}
                    state={{ from: { pathname: `/interview-insights/${companyId}` } }}
                    className="text-[hsl(221,91%,60%)] text-sm font-medium hover:underline"
                  >
                    Be the first to share
                  </Link>
                </div>
              )}

              {/* Posts */}
              <div className="space-y-4">
                {posts.map((post, i) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.5) }}
                    className={`group bg-white rounded-2xl border border-[hsl(220,16%,90%)] hover:border-[hsl(221,91%,60%)]/25 hover:shadow-lg hover:shadow-[hsl(221,91%,60%)]/[0.04] transition-all duration-300 ${!isAuthenticated ? 'cursor-pointer' : ''}`}
                    onClick={!isAuthenticated ? () => navigate('/auth', { state: { from: { pathname: `/interview-insights/${companyId}` } } }) : undefined}
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CompanyLogo company={post.company} />
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="font-semibold text-[hsl(222,22%,15%)]">{post.company || company.name}</span>
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

                      {!isAuthenticated ? (
                        <div className="relative">
                          <div className="blur-sm select-none pointer-events-none">
                            <div className="flex items-center gap-3 text-xs text-[hsl(222,12%,55%)] mb-3">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(post.date)}</span>
                            </div>
                            <div className="text-sm text-[hsl(222,12%,35%)] leading-relaxed line-clamp-2 mb-4">
                              {post.summary ? <Markdown className="text-sm text-[hsl(222,12%,35%)]">{post.summary}</Markdown> : 'No summary available'}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-5">
                              {getQuestions(post).slice(0, 3).map((q, qi) => (
                                <span key={q.id || qi} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,92%)] text-xs text-[hsl(222,22%,25%)] max-w-[220px] truncate">
                                  <span className="w-1 h-1 rounded-full bg-[hsl(221,91%,60%)] mr-2 shrink-0" />
                                  {q.title || 'Question'}
                                </span>
                              ))}
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
                          <div className="flex items-center gap-3 text-xs text-[hsl(222,12%,55%)] mb-3">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(post.date)}</span>
                          </div>
                          <div className="text-sm text-[hsl(222,12%,35%)] leading-relaxed line-clamp-2 mb-4">
                            {post.summary ? <Markdown className="text-sm text-[hsl(222,12%,35%)]">{post.summary}</Markdown> : 'No summary available'}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mb-5">
                            {getQuestions(post).length > 0 ? (
                              <>
                                {getQuestions(post).slice(0, 3).map((q, qi) => (
                                  <span key={q.id || qi} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,92%)] text-xs text-[hsl(222,22%,25%)] max-w-[220px] truncate">
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

                          <div className="flex items-center justify-between pt-4 border-t border-[hsl(220,16%,94%)]">
                            <div className="flex items-center gap-4">
                              <button
                                onClick={(e) => toggleLike(post.id, e)}
                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${interactions.get(post.id)?.liked ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)]'}`}
                              >
                                <ThumbsUp className={`w-3.5 h-3.5 transition-transform ${interactions.get(post.id)?.liked ? 'fill-current scale-110' : ''}`} />
                                {interactions.get(post.id)?.likeCount ?? 0}
                              </button>
                              <span className="flex items-center gap-1.5 text-xs text-[hsl(222,12%,55%)]">
                                <MessageSquare className="w-3.5 h-3.5" />
                                {post.commentCount ?? 0}
                              </span>
                              <button
                                onClick={(e) => toggleSave(post.id, e)}
                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${interactions.get(post.id)?.saved ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)]'}`}
                              >
                                <Bookmark className={`w-3.5 h-3.5 transition-transform ${interactions.get(post.id)?.saved ? 'fill-current scale-110' : ''}`} />
                                {interactions.get(post.id)?.saveCount ?? 0}
                              </button>
                              <SharePopover
                                data={{
                                  title: `${post.company} — ${post.round || 'Interview Experience'}`,
                                  subtitle: post.role,
                                  tags: [post.level, post.outcome, post.round].filter(Boolean),
                                  summary: post.summary || `Interview experience at ${post.company} for ${post.role} position`,
                                  url: `${window.location.origin}/experience/${post.id}`,
                                }}
                              >
                                <button type="button" className="flex items-center gap-1.5 text-xs text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)] transition-colors">
                                  <div className="w-6 h-6 rounded-full bg-[hsl(221,91%,60%)] flex items-center justify-center pointer-events-none">
                                    <Share2 className="w-3 h-3 text-white" />
                                  </div>
                                </button>
                              </SharePopover>
                            </div>
                            <Link
                              to={`/experience/${post.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                safeCapture(posthog, EVENTS.PREMIUM_NOTE_CLICKED, { note_id: post.id });
                              }}
                              className="px-4 py-1.5 rounded-lg bg-[hsl(222,22%,15%)] text-white text-xs font-medium hover:bg-[hsl(222,22%,20%)] transition-colors"
                            >
                              View Post
                            </Link>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.article>
                ))}
              </div>

              {/* Load More */}
              {posts.length > 0 && hasMore && !loading && (
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

              {loading && posts.length > 0 && (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-[hsl(221,91%,60%)] mx-auto" />
                </div>
              )}
            </div>

            {/* ── Sidebar ── */}
            <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(222,12%,55%)]" />
                <input
                  type="text"
                  placeholder="Search experiences..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[hsl(220,16%,90%)] bg-white py-2.5 pl-10 pr-4 text-sm text-[hsl(222,22%,15%)] outline-none placeholder:text-[hsl(222,12%,55%)] focus:border-[hsl(221,91%,60%)] focus:ring-1 focus:ring-[hsl(221,91%,60%)] transition-all"
                />
              </div>

              {/* Community Guidelines */}
              <div className="bg-white rounded-2xl p-5 border border-[hsl(220,16%,90%)] shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <svg className="size-4" fill="none" viewBox="0 0 16 16">
                      <path d="M13.3333 8.66667C13.3333 12 11 13.6667 8.22667 14.6333C8.08144 14.6825 7.92369 14.6802 7.78 14.6267C5 13.6667 2.66667 12 2.66667 8.66667V4C2.66667 3.82319 2.7369 3.65362 2.86193 3.5286C2.98695 3.40357 3.15652 3.33333 3.33333 3.33333C4.66667 3.33333 6.33333 2.53333 7.49333 1.52C7.63457 1.39933 7.81424 1.33303 8 1.33303C8.18576 1.33303 8.36543 1.39933 8.50667 1.52C9.67333 2.54 11.3333 3.33333 12.6667 3.33333C12.8435 3.33333 13.013 3.40357 13.1381 3.5286C13.2631 3.65362 13.3333 3.82319 13.3333 4V8.66667Z" stroke="#009966" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-[hsl(222,22%,15%)]">Community Guidelines</h4>
                </div>
                <ul className="space-y-2.5">
                  {[
                    'Share genuine interview experiences',
                    'Never reveal recruiter or interviewer names',
                    'Keep proprietary questions confidential',
                    'Be respectful and constructive',
                  ].map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[hsl(222,12%,45%)] leading-relaxed">
                      <span className="w-1 h-1 rounded-full bg-[hsl(222,12%,65%)] mt-1.5 shrink-0" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default CompanyDetailPage;
