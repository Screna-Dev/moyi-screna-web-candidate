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
  FileText,
  X,
  CheckCircle2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/newDesign/dashboard-layout';
import { InsightsLayout } from '@/components/newDesign/insights-layout';
import { Button } from '../../components/newDesign/ui/button';
import { getPosts, getPublicPosts, normalizePublicPosts, likePost, unlikePost, savePost, unsavePost,
         getCompanyProfile, getPublicCompanyProfile, getPostOptions } from '../../services/CommunityService';
import { hasStoredSession } from '../../services/api';
import { companySlug, resolveCompanyName } from '@/utils/companySlug';
import { readPrerenderSeed } from '@/utils/prerenderSeed';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import { usePostHog } from 'posthog-js/react';
import { safeCapture } from '@/utils/posthog';
import { EVENTS } from '@/constants/analyticsEvents';
import { SharePopover } from '@/components/newDesign/share-popover';
import { Markdown } from '@/components/newDesign/ui/markdown';
import { CompanyLogo } from '../../components/newDesign/ui/company-logo';
import { RoleFilter, RoundFilter, LevelFilter, TimeFilter } from '@/components/newDesign/interview-insights/filter-popovers';
import { readCompanyPostFilters, writeCompanyPostFilters } from '@/utils/companyPostFilters';
import { CompanyMockLauncher } from '@/components/newDesign/interview-insights/quick-mock';
import { LockedNoteTail } from '@/components/newDesign/interview-insights/locked-note-tail';
import { mostCommonRole } from '@/utils/quickMockDefaults';
import { useSeo } from '@/hooks/useSeo';

// ─── Build-time seed ───────────────────────────────────────────────────────
// scripts/prerender.mjs fetches this company's profile and first page of notes
// server-side and injects them as a JSON script tag, because the snapshot
// browser has no route to the API (the preview server mounts no proxy on
// purpose, so a production build never bakes in staging data).
//
// Read at module scope, exactly once, as readPrerenderSeed requires: it removes
// the tag on read so a later client-side navigation cannot re-consume a stale
// payload.
type CompanySeed = {
  profile?: {
    displayName?: string;
    category?: string;
    summary?: string;
    postCount?: number;
    recentPostCount?: number;
    latestUpdatedAt?: string | null;
  };
  posts?: unknown[];
  total?: number;
};
const PRERENDER_SEED = readPrerenderSeed<CompanySeed>('__prerender_company__');

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

// Relative-time filter labels → the search API's `time` enum.
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

// ─── Company meta ──
// Curated slug -> display-name/category/description for a handful of companies.
//
// This used to carry per-company note counts too (`totalNotes: 1842` and
// friends) which the header fell back to whenever the profile API was
// unreachable — i.e. for every signed-out visitor, since that endpoint was
// auth-only. Those numbers were invented and are gone: every count on this page
// now comes from /community/public/companies/profile. Do not reintroduce them.
//
// Only `name` is still read, and only for the first paint while the real
// display name is being resolved from the company directory (see companySlug —
// the slug itself cannot be inverted). `category` and `description` are
// deliberately NOT used as fallbacks: this page is submitted to a search index,
// and editorial copy about a company we have no profile row for would be
// invention of a different kind.
type CompanyMeta = {
  name: string;
  category: string;
  description: string;
};

const COMPANY_META: Record<string, CompanyMeta> = {
  google: { name: 'Google', category: 'FAANG / Big Tech', description: 'Structured coding, system design, and Googleyness notes from SWE, PM, and EM candidates.' },
  meta: { name: 'Meta', category: 'FAANG / Big Tech', description: 'Product sense, execution, coding, and behavioral writeups across IC and manager loops.' },
  openai: { name: 'OpenAI', category: 'Mid-sized', description: 'ML systems, research engineering, alignment, and infrastructure interview notes.' },
  amazon: { name: 'Amazon', category: 'FAANG / Big Tech', description: 'Leadership Principles, bar raiser, coding, and system design experiences.' },
  apple: { name: 'Apple', category: 'FAANG / Big Tech', description: 'Team-specific technical screens and onsite loops for hardware, platform, and product teams.' },
  microsoft: { name: 'Microsoft', category: 'FAANG / Big Tech', description: 'Growth-mindset interviews, team-match loops, coding, and design rounds.' },
  anthropic: { name: 'Anthropic', category: 'Mid-sized', description: 'Safety-focused technical screens, ML infrastructure, and research collaboration rounds.' },
  deepmind: { name: 'DeepMind', category: 'Mid-sized', description: 'Research-heavy interview notes covering ML theory, papers, and systems depth.' },
  stripe: { name: 'Stripe', category: 'Large Enterprises', description: 'Practical engineering, debugging, API design, and product-minded system design notes.' },
  figma: { name: 'Figma', category: 'Mid-sized', description: 'Collaborative product engineering and design systems interview experiences.' },
  databricks: { name: 'Databricks', category: 'Large Enterprises', description: 'Distributed systems, data engineering, and platform interview loops.' },
  citadel: { name: 'Citadel', category: 'Large Enterprises', description: 'Low-latency systems, probability, C++, and trading intuition rounds.' },
  salesforce: { name: 'Salesforce', category: 'Large Enterprises', description: 'Enterprise product, platform architecture, and customer-centric behavioral loops.' },
  perplexity: { name: 'Perplexity', category: 'Small', description: 'Fast-moving AI product interviews with pragmatic systems and product judgment.' },
};

// Format an ISO-8601 UTC timestamp as a locale-relative "x ago" string.
// Returns null for missing/invalid input so callers can hide the label
// (the profile API sends latestUpdatedAt = null when a company has no posts).
function formatRelativeTime(iso?: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const yr = Math.floor(mo / 12);
  return `${yr} year${yr === 1 ? '' : 's'} ago`;
}

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
  };
}

// ─── Upgrade modal ──────────────────────────────────────────────────────────
// Shown to Free/Basic users when they try to apply a filter or sort. Replaces the
// old confusing "click a locked chip → jump straight to pricing" behavior: the
// filter popovers now open normally and this modal explains the gate on Apply.
function UpgradeModal({
  open,
  count,
  onClose,
  onUpgrade,
}: {
  open: boolean;
  count: number;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[hsl(222,22%,15%)]/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] rounded-2xl bg-white p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-[hsl(222,12%,55%)] transition-colors hover:text-[hsl(222,22%,15%)]"
        >
          <X className="size-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-[hsl(221,91%,60%)]/10">
            <Lock className="size-6 text-[hsl(221,91%,60%)]" />
          </div>
          <h3 className="text-[24px] font-semibold leading-tight text-[hsl(222,22%,15%)] font-[family-name:var(--font-serif)]">
            {count > 0 ? `Unlock all ${count.toLocaleString()} experiences` : 'Unlock all experiences'}
          </h3>
          <p className="mt-2 text-sm text-[hsl(222,12%,45%)]">
            Upgrade to Advanced for full access to every post.
          </p>
        </div>

        <ul className="mt-6 space-y-3">
          {['Unlimited access to every post', 'Full search, filters & sorting', 'New experiences daily'].map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm text-[hsl(222,22%,25%)]">
              <CheckCircle2 className="size-5 shrink-0 text-[hsl(221,91%,60%)]" />
              {item}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onUpgrade}
          className="mt-7 w-full rounded-xl bg-[hsl(221,91%,60%)] py-3 text-sm font-semibold text-white transition-colors hover:bg-[hsl(221,91%,50%)]"
        >
          Upgrade to Advanced
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full text-center text-sm font-medium text-[hsl(222,12%,45%)] transition-colors hover:text-[hsl(222,22%,15%)]"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

export function CompanyDetailPage({ isPublic = false }: { isPublic?: boolean } = {}) {
  const { companyId } = useParams();
  const { isAuthenticated } = useAuth();
  const { isPremium, isLoading: isPlanLoading, planData } = useUserPlan();
  const navigate = useNavigate();
  const posthog = usePostHog();

  // Plan-tier gating. The product has two tiers: Free/Basic (low) and
  // Advanced/Flagship (Premium, high). Low-tier signed-in users can only browse
  // a company's newest posts, first page, with no sort/search/pagination, and
  // can open only the 2 most recent posts per company (the 3rd+ is locked).
  // We wait for the plan to resolve before restricting so we don't penalize
  // Premium users with a flash of locked UI.
  const isLowTier = isAuthenticated && !isPlanLoading && !isPremium;

  // `isPublic` selects the surface (marketing, no sidebar, indexable vs
  // personal centre with sidebar, noindex); `signedOut` selects the payload
  // (redacted public endpoints vs authenticated twins). See the note on
  // InterviewInsightsPage — they are independent.
  //
  // signedOut reads storage rather than `isAuthenticated`, which is false on
  // the first render even for a signed-in visitor.
  const signedOut = !hasStoredSession();
  const Layout = isPublic ? InsightsLayout : DashboardLayout;
  const listPath = isPublic ? '/interview-questions' : '/interview-insights';
  const companyPath = `${listPath}/${companyId}`;
  // /experience/:id is the only note URL: it is what middleware.ts answers with
  // an Open Graph document for social crawlers, so it is both the in-app link
  // and the shareable one.
  const experiencePath = (postId: string) => `/experience/${postId}`;
  const shareUrl = (postId: string) => `${window.location.origin}/experience/${postId}`;
  // The note library is fully open to anyone signed in: every note, full text,
  // paginated, on every plan. Free and Basic used to see the 2 newest and 5
  // blurred cards, which left a paying Basic user with LESS than a signed-out
  // visitor — a guest browses the whole company, just trimmed to one sentence
  // per note. That gate is gone.
  //
  // What still separates the audiences is the text itself, and it is decided
  // server-side rather than here:
  //
  //   signed out  every note listed and paginated, each cut to its first
  //               sentence by the public endpoint. No top-N limit.
  //   signed in   every note listed and paginated, nothing cut.
  //
  // Sorting, keyword search and the round/level/time filters remain an Advanced
  // feature (restrictedBrowsing below) — that is a separate gate from note
  // access, and the backend still discards those params for Free/Basic.
  // Neither audience can sort, keyword-search, or filter by round/level/time:
  // the public endpoint does not read those params and the backend discards
  // them for FREE/BASIC. Role and page DO work for guests.
  const restrictedBrowsing = signedOut || isLowTier;
  // Build-time snapshot payload, read once at module scope by the page that
  // owns it. Only usable when it is for *this* company: the SPA keeps the
  // script tag around for one navigation, and a stale seed would render
  // Google's notes under Meta's heading.
  const seed = PRERENDER_SEED && companySlug(PRERENDER_SEED.profile?.displayName) === companySlug(companyId)
    ? PRERENDER_SEED
    : null;

  // ── Company identity ──
  // The slug cannot be turned back into a display name (see companySlug): 18 of
  // the library's companies collapse punctuation, so 'AT&T' -> 'at-t' -> 'AT T'
  // and the API then reports the company as missing. The title-cased guess is
  // only for the first paint; every API call waits for `apiName`, which is
  // either the seed's exact name or one matched against the real company list.
  const guessedName = useMemo(() => resolveCompany(companyId).name, [companyId]);
  const [resolvedName, setResolvedName] = useState<string | null>(
    seed?.profile?.displayName ?? null,
  );
  const [nameResolved, setNameResolved] = useState<boolean>(!!seed);

  useEffect(() => {
    if (seed) return;
    let cancelled = false;
    setResolvedName(null);
    setNameResolved(false);
    resolveCompanyName(companyId ?? '').then(({ name }) => {
      if (cancelled) return;
      setResolvedName(name);
      setNameResolved(true);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const apiName = resolvedName;
  const fallbackCompany = useMemo(() => {
    const base = resolveCompany(companyId);
    return { ...base, name: resolvedName ?? guessedName };
  }, [companyId, resolvedName, guessedName]);

  // Real category + summary from GET /community/companies/profile (looked up by
  // display name); falls back to the resolved/curated values until it loads.
  const [profile, setProfile] = useState<{
    displayName?: string;
    category?: string;
    summary?: string;
    postCount?: number;
    recentPostCount?: number;
    latestUpdatedAt?: string | null;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  useEffect(() => {
    // Prerendered pages already have the profile; refetching would only make
    // the snapshot flash on hydration.
    if (seed?.profile) {
      setProfile(seed.profile);
      setProfileLoading(false);
      return;
    }
    // Waiting on the exact display name — a lookup with the title-cased guess
    // would 400 NOT_FOUND for any company whose name carries punctuation.
    if (!apiName) return;

    let cancelled = false;
    setProfileLoading(true);
    setProfile(null);
    // Same service method behind both URLs; the public one just skips auth.
    const fetchProfile = signedOut ? getPublicCompanyProfile : getCompanyProfile;
    fetchProfile(apiName)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (!cancelled && data) setProfile(data);
      })
      .catch(() => {
        // A company with no profile row answers 400/NOT_FOUND. That is a real
        // state, not a failure: the header falls back to the curated blurb.
      })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiName, signedOut]);

  // `name` is the real, route-derived company identity (also used for API
  // lookups), so it always resolves. For signed-in users `category` and
  // `description` are shown as a loading skeleton until the profile API resolves
  // and are never backfilled with curated copy — they're null when the company
  // has no profile data. Guests can't reach that API at all, so they get the
  // curated blurb, which also gives the indexable page real body copy.
  // Guests and members read the same profile endpoint now, so there is no
  // audience split here. `category` and `description` stay null when the
  // company has no profile row rather than being backfilled with curated copy —
  // an AI-written blurb for a company we have no data on would be invention,
  // and this page is being submitted to a search index.
  const company = useMemo(() => ({
    name: profile?.displayName || fallbackCompany.name,
    category: profile?.category || null,
    description: profile?.summary || null,
  }), [fallbackCompany, profile]);

  // Header stats, sourced solely from GET /community/companies/profile
  // (published-post counts). We show a loading skeleton until it resolves and
  // never fall back to curated/mock numbers — a company with no posts shows a
  // real 0. `?? 0` keeps a real 0 from the API.
  // ONE note count for everything the user reads, and it is the profile's.
  //
  // Two totals exist and they can disagree: profile.postCount is a database
  // aggregate while the feed's total comes from the Elasticsearch index, and
  // index sync is asynchronous — rendering both would show a company as having
  // 485 notes in one line and 490 in the next. So the profile's number is the
  // only one displayed. The feed's total is still what drives pagination (see
  // hasMorePublic), because there it MUST match the ES result set being paged;
  // it is consumed at fetch time and never rendered.
  const noteTotal = profile?.postCount ?? null;
  const notesCount = noteTotal ?? 0;
  const updatedLabel = formatRelativeTime(profile?.latestUpdatedAt); // null when the company has no posts

  // ── Toolbar state (filters + sort + search), persisted per company ──
  // Opening a post navigates away and unmounts this page, so the user's selections
  // are restored from sessionStorage on the way back instead of resetting to
  // defaults. They're dropped only when the user goes up a level to the companies
  // directory, which clears them on mount (see utils/companyPostFilters).
  const restored = useMemo(() => readCompanyPostFilters(companyId), [companyId]);
  const isSortOption = (val: string): val is SortOption => (SORT_OPTIONS as readonly string[]).includes(val);

  const [activeSort, setActiveSort] = useState<SortOption>(() => (isSortOption(restored.sort) ? restored.sort : 'Newest'));
  const [sortOpen, setSortOpen] = useState(false);
  // Soft-paywall modal for Free/Basic users when they apply a filter or sort.
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // paywall_viewed —— UpgradeModal 弹出时上报（低阶用户点击锁定的筛选/排序等入口）。
  // note_id 为 null：此 paywall 不针对某篇具体面经。
  // required_tier：面经全量访问需 Advanced+（无逐条 tier 字段，按 gating 逻辑近似）。
  useEffect(() => {
    if (!upgradeOpen) return;
    safeCapture(posthog, EVENTS.PAYWALL_VIEWED, {
      note_id: null,
      required_tier: 'advanced',
      user_current_tier: planData.currentPlan.toLowerCase(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upgradeOpen]);

  const [searchQuery, setSearchQuery] = useState(restored.search);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(restored.search);

  // ── Filter options (from GET /community/posts/options) + applied selections.
  // Role and Round come from the options endpoint; Level and Time use fixed
  // option sets (the options endpoint has none), so they're wired directly. ──
  type OptionGroup = { category: string; options: string[] };
  const [roleGroups, setRoleGroups] = useState<OptionGroup[] | undefined>(undefined);
  const [roundGroups, setRoundGroups] = useState<OptionGroup[] | undefined>(undefined);
  const [filterRole, setFilterRole] = useState(restored.role);
  const [filterRound, setFilterRound] = useState(restored.round);
  // Level → search `level` param (raw label, matching create-post); Time →
  // search `time` param (via TIME_TO_API enum).
  const [filterLevel, setFilterLevel] = useState(restored.level);
  const [filterTime, setFilterTime] = useState(restored.time);

  // Persist the toolbar on every change so the next mount (returning from a post,
  // or a reload) picks the selections back up.
  useEffect(() => {
    writeCompanyPostFilters(companyId, {
      role: filterRole,
      round: filterRound,
      level: filterLevel,
      time: filterTime,
      sort: activeSort,
      search: searchQuery,
    });
  }, [companyId, filterRole, filterRound, filterLevel, filterTime, activeSort, searchQuery]);

  // The filter popovers own their selection state internally and only read
  // `initialSelected` at mount, so remount them (via this key) when the route
  // switches to a different company in place — otherwise they'd keep showing the
  // previous company's chips.
  const seededCompanyId = useRef(companyId);
  const [filterEpoch, setFilterEpoch] = useState(0);
  useEffect(() => {
    if (seededCompanyId.current === companyId) return;
    seededCompanyId.current = companyId;
    setFilterRole(restored.role);
    setFilterRound(restored.round);
    setFilterLevel(restored.level);
    setFilterTime(restored.time);
    setActiveSort(isSortOption(restored.sort) ? restored.sort : 'Newest');
    setSearchQuery(restored.search);
    setDebouncedSearchQuery(restored.search);
    setFilterEpoch(e => e + 1);
  }, [companyId, restored]);

  useEffect(() => {
    let cancelled = false;
    // Auth-only endpoint, and it only feeds the filter popovers — which are
    // rendered locked for guests anyway. Skip it when signed out.
    if (!isAuthenticated) return;
    getPostOptions()
      .then(res => {
        const data = res?.data?.data ?? res?.data;
        if (!data || cancelled) return;
        const roles: OptionGroup[] = Array.isArray(data.roles) ? data.roles : [];
        const rounds: OptionGroup[] = Array.isArray(data.rounds) ? data.rounds : [];
        if (roles.length) setRoleGroups(roles.map(g => ({ category: g.category, options: g.options ?? [] })));
        if (rounds.length) setRoundGroups(rounds.map(g => ({ category: g.category, options: g.options ?? [] })));
      })
      .catch(() => { /* filters fall back to their hardcoded options */ });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // API state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  // Guest-side pagination is driven by the real match count the public endpoint
  // returns, rather than by "did this page come back full" — which is all the
  // authenticated search allows, since it reports no total. Starts false so a
  // failed read never offers a page that may not exist.
  const [hasMorePublic, setHasMorePublic] = useState(false);
  // True while a *reset* fetch is in flight (sort/filter/search change). We show
  // the loading state and hide the previous results instead of leaving stale
  // posts on screen. Append fetches ("load more") don't set this.
  const [isReloading, setIsReloading] = useState(false);

  // The role the Quick Mock CTA falls back to when the user's resume yields none
  // (spec: "兜底：该公司最常见岗位"). There's no role-breakdown endpoint, so it's
  // read off the posts already loaded for this company.
  const commonRole = useMemo(() => mostCommonRole(posts.map((p) => p.role)), [posts]);

  // interview_notes_browsed —— 进入公司详情页（每次进入上报一次）。
  // view_type 映射：'all' = 本页（单公司下的平铺面经列表），'by_company' = 列表页的公司分组网格。
  useEffect(() => {
    safeCapture(posthog, EVENTS.INTERVIEW_NOTES_BROWSED, { sort_by: activeSort, company: company.name, view_type: 'all' });
    // company_page_viewed —— 进入某公司主页（company_id 取自路由参数）
    safeCapture(posthog, EVENTS.COMPANY_PAGE_VIEWED, { company_id: companyId ?? null });
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
    if (reset) setIsReloading(true);
    setError(null);
    try {
      const params: any = {
        page: pageNum,
        sortBy: SORT_TO_API[activeSort] || 'RELEVANCE',
        company: apiName,
      };
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;
      if (filterRole) params.role = filterRole;
      if (filterRound) params.round = filterRound;
      if (filterLevel) params.level = filterLevel;
      if (filterTime) params.time = TIME_TO_API[filterTime];

      let content: Post[];
      if (signedOut) {
        // Public search takes company / role / page and nothing else: sorting
        // is locked to NEWEST server-side and the other facets are not read.
        const pub = normalizePublicPosts(
          await getPublicPosts({ company: apiName, role: filterRole || undefined, page: pageNum }),
        );
        content = pub.posts as Post[];
        // Paginate off the real match count, not off "did this page come back
        // full" — the public endpoint reports a cross-page total.
        setHasMorePublic((pub.page + 1) * pub.size < pub.total);
      } else {
        const res = await getPosts(params);
        const data = res.data?.data ?? res.data;
        content = Array.isArray(data) ? data : [];
      }

      setPosts(prev => reset ? content : [...prev, ...content]);
      initInteractions(content, reset);

      // note_search_performed —— 仅统计用户主动搜索（非空关键词触发的 reset 请求）；
      // 默认列表加载 / load-more 不上报。游客请求不带 search 参数、低阶用户搜索框
      // 隐藏，故仅登录态上报。results_count 为本次返回条数（API 按页返回，无总数）。
      if (reset && !signedOut && debouncedSearchQuery) {
        safeCapture(posthog, EVENTS.NOTE_SEARCH_PERFORMED, {
          query: debouncedSearchQuery,
          results_count: content.length,
        });
      }
      // Everyone signed in paginates the same way now. The authenticated
      // search reports no total, so "did this page come back full" is all
      // there is; guests page off the real total via setHasMorePublic above.
      setHasMore(!signedOut ? content.length >= 10 : false);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch company posts:', err);
      setError('Failed to load experiences. Please try again.');
      if (reset) setPosts([]);
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
      setIsReloading(false);
    }
  }, [activeSort, debouncedSearchQuery, filterRole, filterRound, filterLevel, filterTime, signedOut, apiName, initInteractions, posthog]);

  useEffect(() => {
    // A prerendered page ships with its first page of notes already rendered.
    // Refetching them on hydration would blank and repaint the exact content
    // the snapshot exists to deliver.
    if (seed?.posts) {
      setPosts(seed.posts as Post[]);
      initInteractions(seed.posts as Post[], true);
      // The snapshot carries page 0 only, but it also carries the match total,
      // so "Load more" is offered from the seeded page and fetches page 1
      // normally. Without this the prerendered companies — the highest-traffic
      // ones — would strand a reader at ten notes with no way forward.
      const seededTotal = typeof seed.total === 'number' ? seed.total : 0;
      setHasMorePublic(seededTotal > (seed.posts as Post[]).length);
      setIsInitialLoading(false);
      return;
    }
    // Hold the first fetch until the exact company name is known (a guess would
    // query the wrong company) and the plan/auth tier has settled. Otherwise
    // the query fires with provisional values, returns wrong data, and fires
    // again. `isInitialLoading` keeps the spinner up meanwhile; once settled,
    // filter/sort changes refetch normally via fetchPosts's identity.
    //
    // Deliberately NOT gated on profileLoading. The feed used to take its
    // `company` parameter from the profile response, which forced the two
    // requests to run in series; it now uses the resolved name, so gating on
    // the profile would only add a round trip to a chain that is already
    // stats -> name -> feed. They run in parallel instead.
    if (!nameResolved || isPlanLoading) return;
    fetchPosts(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPosts, nameResolved, isPlanLoading]);

  const handleLoadMore = () => {
    if (loading) return;
    if (signedOut ? hasMorePublic : hasMore) fetchPosts(page + 1, false);
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // ── F4 / F8: head tags + paywall declaration ──
  //
  // Unconditional: one URL serves both audiences, so the canonical, title and
  // description describe the page rather than the viewer.
  //
  // The JSON-LD is the registration-wall declaration. Google exempts gated
  // content from cloaking ONLY if the gate is declared this way AND the crawler
  // receives exactly what an entitled reader receives. Both halves matter:
  //
  //   • isAccessibleForFree MUST be false, at the top level and on the gated
  //     part. Declaring `true` while a wall exists is the misconfiguration —
  //     it asserts the page is free, so the wall reads as cloaking instead of
  //     being exempted by it.
  //   • cssSelector must be a class selector that really exists on this page,
  //     and the element it names must NOT contain the withheld text. The server
  //     already truncates notes to one sentence, so `.paywalled-note` wraps the
  //     CTA that stands in for the rest — there is no hidden full note behind a
  //     blur to leak.
  //
  // The declaration is a statement about the page, not a mechanism: it does not
  // hide anything and must not be used to try to.
  const notesCountForSeo = noteTotal ?? posts.length;
  useSeo(
    !isPublic
      ? {
          // Personal-centre twin: same notes, so it must not compete with the
          // indexed page. Still writes (rather than passing null) so
          // data-seo-ready is set and the prerenderer can never hang here.
          title: `${company.name} Interview Notes | Screna AI`,
          description: `Interview notes for ${company.name}.`,
          path: `/interview-insights/${companyId}`,
          noindex: true,
        }
      : isInitialLoading
      ? null
      : {
          title: `${company.name} Interview Questions & Experiences | Screna AI`,
          description: `${notesCountForSeo} real ${company.name} interview write-ups: verbatim questions by role, round and level.`.slice(0, 155),
          path: `/interview-questions/${companyId}`,
          type: 'article',
          jsonLd: [
            {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: `${company.name} Interview Questions & Experiences`,
              ...(company.description ? { description: company.description } : {}),
              isAccessibleForFree: false,
              hasPart: {
                '@type': 'WebPageElement',
                isAccessibleForFree: false,
                cssSelector: '.paywalled-note',
              },
            },
          ],
        },
  );

  const getQuestions = (post: Post) => post.questions || [];

  // The first question note that has any text. On the public endpoint this is
  // already just one sentence — the server does the truncating, deliberately:
  // withholding it in the client would still ship the full text in the
  // response, which is the implementation Google's paywall guidance rules out.
  const firstNoteOf = (post: Post): string | null => {
    for (const q of getQuestions(post)) {
      const n = (q.notes || '').trim();
      if (n) return n;
    }
    return null;
  };

  return (
    <Layout fullBleed>
      <div className="pb-20 bg-[#f9fafb]">
        <div className="max-w-6xl mx-auto px-6 my-[24px]">
          {/* Back Link */}
          <Link
            to={listPath}
            className="inline-flex items-center gap-2 text-sm font-medium text-[hsl(222,12%,45%)] transition-colors hover:text-[hsl(222,22%,15%)] mb-6"
          >
            <ArrowLeft className="size-4" />
            Back to Directory
          </Link>

          {/* ── Header ── */}
          <header className="mb-10 flex flex-col gap-6 min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-between">
            <div className="flex gap-5">
              <CompanyLogo company={company.name} className="!w-16 !h-16 !text-2xl" />
              <div className="flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight leading-none text-[hsl(222,22%,15%)] font-[family-name:var(--font-serif)]">
                    {company.name}
                  </h1>
                  {profileLoading ? (
                    <span className="h-6 w-24 animate-pulse rounded-full bg-[hsl(222,12%,88%)]" aria-label="Loading category" aria-busy="true" />
                  ) : company.category ? (
                    <span className="rounded-full bg-[hsl(221,91%,60%)]/10 px-3 py-1 text-xs font-medium text-[hsl(221,91%,60%)]">
                      {company.category}
                    </span>
                  ) : null}
                </div>
                {profileLoading ? (
                  <div className="mt-3 max-w-2xl space-y-2" aria-label="Loading summary" aria-busy="true">
                    <span className="block h-4 w-full animate-pulse rounded bg-[hsl(222,12%,88%)]" />
                    <span className="block h-4 w-4/5 animate-pulse rounded bg-[hsl(222,12%,88%)]" />
                  </div>
                ) : company.description ? (
                  <p className="mt-3 max-w-2xl text-base text-[hsl(222,12%,45%)]">
                    {company.description}
                  </p>
                ) : null}

                {/* Stats — published-post counts from the profile API. Shown to
                    both audiences: /community/public/companies/profile returns
                    the same real numbers, so there is nothing to hide here any
                    more (and nothing hardcoded — see noteTotal). */}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[hsl(222,12%,45%)]">
                  {profileLoading ? (
                    <span className="inline-flex items-center gap-2" aria-label="Loading stats" aria-busy="true">
                      <span className="h-4 w-28 animate-pulse rounded bg-[hsl(222,12%,88%)]" />
                      <span className="h-4 w-24 animate-pulse rounded bg-[hsl(222,12%,88%)]" />
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="size-4 text-[hsl(222,12%,55%)]" />
                        <span className="font-semibold text-[hsl(222,22%,15%)]">{notesCount.toLocaleString()}</span>
                        total notes
                      </span>
                      {updatedLabel && <span>Updated {updatedLabel}</span>}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* CTAs — one-click company mock above the share button. Spec §5:
                below 900px the two buttons stack full-width. */}
            <div className="shrink-0 flex flex-col gap-2.5 w-full min-[900px]:w-auto" style={{ minWidth: 232 }}>
              {/* Rendered for everyone so the public page carries the same CTA
                  as the personal centre; guests get it locked (click -> /auth,
                  no authenticated requests). Keyed on `signedOut` rather than
                  `isAuthenticated` for the usual reason — the latter is false
                  on the first render of a signed-in visit, which would flash a
                  locked button at a user who is not locked out of anything. */}
              <CompanyMockLauncher
                company={company.name}
                companyId={companyId}
                fallbackRole={commonRole ?? undefined}
                locked={signedOut}
              />
              <Link
                to={isAuthenticated ? '/add-experience' : '/auth'}
                state={{ from: { pathname: companyPath } }}
                className="shrink-0"
              >
                <Button className="w-full bg-[hsl(221,91%,60%)] hover:bg-[hsl(221,91%,50%)] text-white rounded-xl shadow-lg shadow-[hsl(221,91%,60%)]/20 h-11 px-6 text-sm gap-2 shrink-0">
                  <Plus className="w-4 h-4" />
                  Share Your Experience
                </Button>
              </Link>
            </div>
          </header>

          {/* ── Layout Grid ── */}
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Main Column */}
            <div className="space-y-6 min-w-0">
              {/* Toolbar — sort & filters. For low-tier users the backend ignores
                  every search param except `company` (forces NEWEST + page 0), so
                  the controls render locked: each chip and the sort button show a
                  lock, and clicking any of them opens the upgrade modal (instead of
                  bouncing the user straight to pricing). */}
              {restrictedBrowsing ? (
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[hsl(220,16%,90%)]">
                  <div className="flex flex-wrap items-center gap-2">
                    {['Role', 'Round', 'Level', 'Time'].map(label => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setUpgradeOpen(true)}
                        title="Upgrade to Advanced to filter"
                        className="flex h-[32px] items-center gap-[6px] whitespace-nowrap rounded-full border border-[hsl(220,16%,90%)] bg-[hsl(220,20%,98%)] px-3 text-[12px] font-medium text-[hsl(222,12%,45%)] transition-colors hover:border-[hsl(221,91%,60%)]/40 hover:text-[hsl(222,22%,15%)]"
                      >
                        <Lock className="size-3 text-[hsl(222,12%,55%)]" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUpgradeOpen(true)}
                    title="Upgrade to Advanced to sort"
                    className="flex items-center gap-1.5 text-sm text-[hsl(222,12%,50%)] transition-colors hover:text-[hsl(222,22%,15%)]"
                  >
                    <Lock className="w-3.5 h-3.5 text-[hsl(222,12%,55%)]" />
                    Sort: {activeSort}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[hsl(220,16%,90%)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleFilter key={`role-${filterEpoch}`} singleSelect groups={roleGroups} initialSelected={restored.role ? [restored.role] : undefined} onApply={sel => setFilterRole(sel[0] || '')} />
                    <RoundFilter key={`round-${filterEpoch}`} singleSelect groups={roundGroups} initialSelected={restored.round ? [restored.round] : undefined} onApply={sel => setFilterRound(sel[0] || '')} />
                    <LevelFilter key={`level-${filterEpoch}`} singleSelect initialSelected={restored.level ? [restored.level] : undefined} onApply={sel => setFilterLevel(sel[0] || '')} />
                    <TimeFilter key={`time-${filterEpoch}`} singleSelect initialSelected={restored.time ? [restored.time] : undefined} onApply={sel => setFilterTime(sel[0] || '')} />
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
              )}

              {/* Banner explaining the actual limit, which is a different limit
                  for each audience, so the copy has to be too. Neither is
                  capped on how many notes they can browse any more: a guest's
                  notes are shortened, and Free/Basic get every note in full but
                  cannot sort, search or filter. Saying "unlimited access to
                  every post" here would now be selling something they have. */}
              {restrictedBrowsing && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[hsl(221,91%,60%)]/20 bg-[hsl(221,91%,60%)]/[0.04] px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(221,91%,60%)]/10">
                      <Lock className="size-4 text-[hsl(221,91%,60%)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[hsl(222,22%,15%)]">
                        {signedOut
                          ? 'Every question, shortened answers'
                          : 'Sorting and filters are an Advanced feature'}
                      </p>
                      <p className="mt-0.5 text-xs text-[hsl(222,12%,45%)]">
                        {signedOut
                          ? `Browse all ${noteTotal ? `${noteTotal.toLocaleString()} ` : ''}notes for ${company.name}. Each answer is trimmed to its first line — create a free account to read them in full.`
                          : `Every one of these ${noteTotal ? `${noteTotal.toLocaleString()} ` : ''}notes is yours to read in full. Upgrade to Advanced to search them by keyword, sort them, and filter by round, level and date.`}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate(signedOut ? '/auth' : '/#pricing')}
                    className="h-9 shrink-0 rounded-lg bg-[hsl(221,91%,60%)] px-4 text-xs text-white hover:bg-[hsl(221,91%,50%)]"
                  >
                    {signedOut ? 'Sign up free' : 'Upgrade'}
                  </Button>
                </div>
              )}

              {/* Loading — initial load or a reset fetch (sort/filter/search).
                  Shown instead of leaving stale posts on screen. */}
              {(isInitialLoading || isReloading) && (
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

              {/* Empty — no posts at all for this company */}
              {!loading && !error && !isInitialLoading && posts.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-[hsl(220,16%,90%)]">
                  <p className="text-[hsl(222,12%,45%)] mb-3">No experiences yet for {company.name}.</p>
                  <Link
                    to={isAuthenticated ? '/add-experience' : '/auth'}
                    state={{ from: { pathname: companyPath } }}
                    className="text-[hsl(221,91%,60%)] text-sm font-medium hover:underline"
                  >
                    Be the first to share
                  </Link>
                </div>
              )}

              {/* Posts — hidden during a reset fetch so stale results aren't shown */}
              <div className="space-y-4">
                {!isReloading && posts.map((post, i) => {
                  // Nobody's cards are locked now: signed-in readers get every
                  // note in full, and guests get every note trimmed server-side.
                  // There is nothing left to withhold in the browser.
                  return (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.5) }}
                    className="group bg-white rounded-2xl border border-[hsl(220,16%,90%)] hover:border-[hsl(221,91%,60%)]/25 hover:shadow-lg hover:shadow-[hsl(221,91%,60%)]/[0.04] transition-all duration-300"
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

                          {/* F7 — leading sample of the candidate's own notes.
                              Rendered only for signed-out readers, which is the
                              one case where the text arrived pre-truncated: the
                              public endpoint returns a single sentence per
                              question, so there is no withheld remainder in the
                              DOM to hide. Signed-in readers get the full notes
                              on the note page itself.

                              This element is what the page's JSON-LD names in
                              hasPart.cssSelector — keep the class and the
                              selector in step (see the useSeo call above). */}
                          {signedOut && firstNoteOf(post) && (
                            <div
                              className="mb-5 rounded-xl border border-[hsl(220,16%,92%)] bg-[hsl(220,20%,98%)] px-4 py-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* `paywalled-note` goes on the blurred span inside,
                                  not on this box: the JSON-LD declares that
                                  selector isAccessibleForFree:false, and the
                                  quoted first sentence IS free to everyone. */}
                              <LockedNoteTail
                                compact
                                quoted
                                paywallClass="paywalled-note"
                                text={firstNoteOf(post) as string}
                                company={post.company || company.name}
                                role={post.role}
                                round={post.round}
                                onUnlock={() => navigate('/auth', { state: { from: { pathname: companyPath } } })}
                                label="Create a free account to read the full write-up"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-4 border-t border-[hsl(220,16%,94%)]">
                            <div className="flex items-center gap-4">
                              {/* Locked for guests: muted icons plus one padlock
                                  chip for the group. The clicks already routed
                                  to /auth, but nothing on screen said so — see
                                  the same treatment on the note page. */}
                              <button
                                onClick={(e) => toggleLike(post.id, e)}
                                title={signedOut ? 'Sign in to like this note' : undefined}
                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${signedOut ? 'text-[hsl(222,12%,68%)]' : interactions.get(post.id)?.liked ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)]'}`}
                              >
                                <ThumbsUp className={`w-3.5 h-3.5 transition-transform ${interactions.get(post.id)?.liked && !signedOut ? 'fill-current scale-110' : ''}`} />
                                {interactions.get(post.id)?.likeCount ?? 0}
                              </button>
                              <span
                                title={signedOut ? 'Sign in to read the discussion' : undefined}
                                className={`flex items-center gap-1.5 text-xs ${signedOut ? 'text-[hsl(222,12%,68%)]' : 'text-[hsl(222,12%,55%)]'}`}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {post.commentCount ?? 0}
                              </span>
                              <button
                                onClick={(e) => toggleSave(post.id, e)}
                                title={signedOut ? 'Sign in to save this note' : undefined}
                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${signedOut ? 'text-[hsl(222,12%,68%)]' : interactions.get(post.id)?.saved ? 'text-[hsl(221,91%,60%)]' : 'text-[hsl(222,12%,55%)] hover:text-[hsl(222,22%,15%)]'}`}
                              >
                                <Bookmark className={`w-3.5 h-3.5 transition-transform ${interactions.get(post.id)?.saved && !signedOut ? 'fill-current scale-110' : ''}`} />
                                {interactions.get(post.id)?.saveCount ?? 0}
                              </button>
                              {signedOut && (
                                <span
                                  title="Sign in to like, save or comment"
                                  className="flex items-center gap-1 rounded-full border border-[hsl(220,16%,91%)] bg-[hsl(220,20%,98%)] px-2 py-0.5 text-[10px] font-medium text-[hsl(222,12%,50%)]"
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  Sign in to interact
                                </span>
                              )}
                              <SharePopover
                                data={{
                                  title: `${post.company} — ${post.round || 'Interview Experience'}`,
                                  subtitle: post.role,
                                  tags: [post.level, post.outcome, post.round].filter(Boolean),
                                  summary: post.summary || `Interview experience at ${post.company} for ${post.role} position`,
                                  url: shareUrl(post.id),
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
                              to={experiencePath(post.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="px-4 py-1.5 rounded-lg bg-[hsl(222,22%,15%)] text-white text-xs font-medium hover:bg-[hsl(222,22%,20%)] transition-colors"
                            >
                              View Post
                            </Link>
                          </div>
                    </div>
                  </motion.article>
                  );
                })}
              </div>

              {/* Load More */}
              {/* Guests paginate off the real match count the public endpoint
                  returns; members off "did this page come back full", since the
                  authenticated search has no total. */}
              {posts.length > 0 && (signedOut ? hasMorePublic : hasMore) && !loading && (
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

              {loading && !isReloading && posts.length > 0 && (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-[hsl(221,91%,60%)] mx-auto" />
                </div>
              )}
            </div>

            {/* ── Sidebar ── */}
            <aside className="space-y-5 lg:sticky lg:top-24 lg:h-fit">
              {/* Search — hidden for guests / low-tier users (the public + Free/Basic
                  endpoints ignore the search param). */}
              {!restrictedBrowsing && (
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
              )}

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

      <UpgradeModal
        open={upgradeOpen}
        count={notesCount}
        onClose={() => setUpgradeOpen(false)}
        onUpgrade={() => {
          // upgrade_clicked —— paywall 弹窗内的升级 CTA（文案为 "Upgrade to Advanced"）
          safeCapture(posthog, EVENTS.UPGRADE_CLICKED, {
            current_tier: planData.currentPlan.toLowerCase(),
            target_tier: 'advanced',
            source: 'paywall',
          });
          setUpgradeOpen(false);
          navigate('/#pricing');
        }}
      />
    </Layout>
  );
}

export default CompanyDetailPage;
