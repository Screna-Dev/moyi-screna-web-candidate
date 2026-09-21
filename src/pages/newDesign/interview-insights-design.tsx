import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/newDesign/dashboard-layout";
import { InsightsLayout } from "@/components/newDesign/insights-layout";
import { WidePageContainer } from "@/components/newDesign/dashboard-page";
import ShareButton from "@/components/newDesign/interview/share-experience-button";
import { type CompanyData } from "@/components/newDesign/interview/company-card";
import { getCompanyLogoUrl } from "@/components/newDesign/ui/company-logo";
import { getCompaniesStats, getPublicCompaniesStats } from "@/services/CommunityService";
import { hasStoredSession } from "@/services/api";
import { companySlug, MIN_POSTS_FOR_PAGE } from "@/utils/companySlug";
import { readPrerenderSeed } from "@/utils/prerenderSeed";
import { useAuth } from "@/contexts/AuthContext";
import { usePostHog } from "posthog-js/react";
import { safeCapture } from "@/utils/posthog";
import { EVENTS } from "@/constants/analyticsEvents";
import { clearAllCompanyPostFilters } from "@/utils/companyPostFilters";
import { useSeo } from "@/hooks/useSeo";
import { SEO_COPY } from "@/constants/seo";
import { QuickMockWidget } from "@/components/newDesign/interview-insights/quick-mock";
import imgFaang from "@/assets/newDesign/cat-faang.png";
import imgLargeEnt from "@/assets/newDesign/cat-large-ent.png";
import imgMidSized from "@/assets/newDesign/cat-mid-sized.png";
import imgSmall from "@/assets/newDesign/cat-small.png";

// SVG path data for the hero banner's decorative open-book motif (inlined).
const bannerSvg = {
  p3f1d1880: "M687.26 154C733.26 124 791.26 132 855.26 168V258C791.26 220 735.26 216 687.26 242V154Z",
  p13923000: "M885.26 168C947.26 132 1005.26 124 1053.26 154V242C1005.26 216 949.26 220 885.26 258V168Z",
  p33177c00: "M703.26 142C755.26 120 799.26 132 861.26 168V244C797.26 208 747.26 204 703.26 228V142Z",
  p147eae80: "M879.26 168C941.26 132 985.26 120 1037.26 142V228C993.26 204 943.26 208 879.26 244V168Z",
};

// Format an ISO timestamp into a short "x ago" label for the company cards.
function timeAgo(iso: string | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ─── Build-time seed ───────────────────────────────────────────────────────
// The company grid is the crawler's only path from this page to the company
// pages, and the snapshot browser cannot reach the API (the preview server
// mounts no proxy on purpose). So scripts/prerender.mjs fetches the stats
// payload server-side and plants it before the bundle evaluates.
//
// Read at module scope, exactly once, as readPrerenderSeed requires.
const PRERENDER_SEED = readPrerenderSeed<{ stats?: unknown }>('__prerender_directory__');

// Shape returned per-company by GET /community/companies/stats
// (companies are nested under data.categories[].companies[]; each carries its own category).
type CompanyStat = {
  company: string;
  category?: string;
  postCount: number;
  recentPostCount: number;
  latestUpdatedAt?: string;
};

type CompanyCategoryGroup = {
  category: string;
  postCount: number;
  companies: CompanyStat[];
};

// Curated metadata only (category / description / slug). Counts + "updated"
// come live from the API; companies not listed here still render from the API
// with a derived slug and no category/description.
type CompanyMeta = { id: string; name: string; category: string; description: string };

const COMPANY_META: CompanyMeta[] = [
  { id: "google", name: "Google", category: "FAANG / Big Tech", description: "Structured coding, system design, and Googleyness notes from SWE, PM, and EM candidates." },
  { id: "meta", name: "Meta", category: "FAANG / Big Tech", description: "Product sense, execution, coding, and behavioral writeups across IC and manager loops." },
  { id: "openai", name: "OpenAI", category: "Mid-sized", description: "ML systems, research engineering, alignment, and infrastructure interview notes." },
  { id: "amazon", name: "Amazon", category: "FAANG / Big Tech", description: "Leadership Principles, bar raiser, coding, and system design experiences." },
  { id: "apple", name: "Apple", category: "FAANG / Big Tech", description: "Team-specific technical screens and onsite loops for hardware, platform, and product teams." },
  { id: "microsoft", name: "Microsoft", category: "FAANG / Big Tech", description: "Growth-mindset interviews, team-match loops, coding, and design rounds." },
  { id: "anthropic", name: "Anthropic", category: "Mid-sized", description: "Safety-focused technical screens, ML infrastructure, and research collaboration rounds." },
  { id: "deepmind", name: "DeepMind", category: "Mid-sized", description: "Research-heavy interview notes covering ML theory, papers, and systems depth." },
  { id: "stripe", name: "Stripe", category: "Large Enterprises", description: "Practical engineering, debugging, API design, and product-minded system design notes." },
  { id: "figma", name: "Figma", category: "Mid-sized", description: "Collaborative product engineering and design systems interview experiences." },
  { id: "databricks", name: "Databricks", category: "Large Enterprises", description: "Distributed systems, data engineering, and platform interview loops." },
  { id: "citadel", name: "Citadel", category: "Large Enterprises", description: "Low-latency systems, probability, C++, and trading intuition rounds." },
  { id: "salesforce", name: "Salesforce", category: "Large Enterprises", description: "Enterprise product, platform architecture, and customer-centric behavioral loops." },
  { id: "perplexity", name: "Perplexity", category: "Small", description: "Fast-moving AI product interviews with pragmatic systems and product judgment." },
];

const META_BY_NAME = new Map(COMPANY_META.map((c) => [c.name.toLowerCase().trim(), c]));

const categoryTiles = [
  { name: "FAANG / Big Tech", subtitle: "Large-scale engineering and product interviews.", examples: ["Google", "Apple", "Meta", "Amazon"], image: imgFaang },
  { name: "Large Enterprises", subtitle: "Established companies with structured interview loops.", examples: ["Microsoft", "Oracle", "Salesforce", "IBM"], image: imgLargeEnt },
  { name: "Mid-sized", subtitle: "Growing teams with practical and role-specific interviews.", examples: ["Stripe", "Databricks", "Figma", "Notion"], image: imgMidSized },
  { name: "Small", subtitle: "Startup and smaller-company interview experiences.", examples: ["Perplexity", "Cursor", "Linear", "Ramp"], image: imgSmall },
];


// Company logo with graceful fallback to initials (mirrors the old-app CompanyLogo).
// Owns its tile so logos render borderless (clean) while initials keep the framed tile.
function CardLogo({ name, size }: { name: string; size: "sm" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const url = getCompanyLogoUrl(name);
  const showLogo = url && !failed;
  const dim = size === "lg" ? "size-[56px] text-lg" : "size-[42px] text-sm";
  const base = `flex ${dim} shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] font-semibold tracking-tight text-foreground`;
  if (showLogo) {
    return (
      <div className={`${base} bg-white`}>
        <img
          src={url}
          alt={`${name} logo`}
          className="size-full object-contain p-1.5"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }
  return <div className={`${base} bg-surface-1 shadow-sm ring-1 ring-border/50`}>{initials}</div>;
}

function InlineCompanyCard({ company, basePath }: { company: CompanyData; basePath: string }) {
  return (
    <Link
      to={`${basePath}/${company.id}`}
      // Marks a link that came from the live company list, as opposed to the
      // hardcoded example chips on the category tiles. scripts/prerender.mjs
      // counts these to tell "grid rendered" from "grid empty but the tiles
      // still link somewhere" — a distinction the word count cannot make.
      data-company-card
      className="group relative flex min-h-[160px] w-full flex-col justify-between rounded-[16px] border border-border bg-[#F7F8F9] p-5 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:border-border/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:border-primary"
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <CardLogo name={company.name} size="sm" />
        <div className="flex min-w-0 flex-col pt-0.5">
          <h3 className="truncate text-[15px] font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
            {company.name}
          </h3>
          <div className="mt-1.5 flex flex-col items-start gap-1">
            <span className="max-w-full truncate rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              {/* `||`, not `??`: the stats API returns uncategorised companies
                  with an empty category, which `??` would let through as a
                  blank pill. */}
              {company.category || "Company"}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              Updated {company.updatedAgo}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/60 pt-3.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[20px] font-bold leading-none tracking-tight text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
            {company.totalNotes?.toLocaleString() ?? 0}
          </span>
          <span className="text-[12px] font-medium text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
            total notes
          </span>
        </div>
        <ArrowRight className="size-4 shrink-0 text-foreground transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2} />
      </div>
    </Link>
  );
}

// Loading frames shown while the directory / feed requests are in flight.
function LoadingCards({ count = 9 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '24px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-[var(--radius)] border border-border bg-secondary/40" style={{ height: 150 }} />
      ))}
    </div>
  );
}

export function InterviewInsightsPage({ isPublic = false }: { isPublic?: boolean } = {}) {
  const { isAuthenticated } = useAuth();
  const posthog = usePostHog();

  // Two things vary, and they are independent:
  //
  //   isPublic  — which surface. /interview-questions is the marketing entry
  //               point: no sidebar for anyone, indexable, and the only one in
  //               robots/sitemap. /interview-insights keeps the personal-centre
  //               sidebar and stays out of the index.
  //   signedOut — which payload. Guests read the redacted /community/public/**
  //               endpoints; members read the authenticated twins. Independent
  //               of the surface, because a signed-in user may well arrive on
  //               the public page from the home nav.
  //
  // signedOut reads storage rather than `isAuthenticated`, which is false on
  // the first render even for a signed-in visitor while AuthContext resolves.
  // Endpoint choice must not flip mid-flight, or the page fires both variants.
  const signedOut = !hasStoredSession();
  const Layout = isPublic ? InsightsLayout : DashboardLayout;
  // Only DashboardLayout renders a top header to title.
  const layoutProps = isPublic ? {} : { headerTitle: "InterviewPrep Note" };
  const basePath = isPublic ? "/interview-questions" : "/interview-insights";
  const shareTo = signedOut ? "/auth" : "/add-experience";

  // interview_notes_browsed —— 进入面经列表页（每次进入上报一次）。
  // view_type 映射：'by_company' = 本页（公司分组网格），'all' = 公司详情页的平铺面经列表。
  // 本页没有视图切换开关，恒为按公司分组浏览。
  useEffect(() => {
    safeCapture(posthog, EVENTS.INTERVIEW_NOTES_BROWSED, { view_type: 'by_company' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Company pages keep their filters/sort/search in sessionStorage so opening a
  // post and coming back doesn't wipe them. Landing here — one level up from a
  // company page — is the navigation that resets them.
  useEffect(() => {
    clearAllCompanyPostFilters();
  }, []);

  const [companyStats, setCompanyStats] = useState<CompanyStat[]>([]);
  const [rollup, setRollup] = useState<{ totalCompanyCount: number; totalPostCount: number; totalRecentPostCount: number } | null>(null);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  // The "Latest" ticker that used to live here is commented out further down
  // (search for latest-marquee). Its fetch went with it: the result was written
  // to state nothing read, and on the authenticated path it could only ever
  // 400, because /community/posts/search requires `company`. To bring the
  // ticker back, re-add a fetch of the newest posts — public via
  // normalizePublicPosts(getPublicPosts({ page: 0 })), authenticated via
  // getPosts({ company, sortBy: 'NEWEST' }).

  // Per-company stats for the directory grid. /community/public/companies/stats
  // is byte-identical to the authenticated twin, so both audiences render from
  // the same payload and the same code below — the only difference is the URL.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Prerendered load: the grid is already rendered from the seed, so
        // refetching would blank and repaint the content the snapshot exists
        // to deliver.
        const res = PRERENDER_SEED?.stats
          ? { data: { data: PRERENDER_SEED.stats } }
          : signedOut
            ? await getPublicCompaniesStats()
            : await getCompaniesStats();
        const data = res.data?.data ?? res.data;
        if (cancelled || !data) return;
        // New shape: companies are grouped under data.categories[].companies[];
        // each company carries its own category. Flatten to a single list,
        // tagging each company with its group's category as a fallback.
        const groups: CompanyCategoryGroup[] = Array.isArray(data?.categories) ? data.categories : [];
        const list: CompanyStat[] = groups.flatMap((g) =>
          (Array.isArray(g.companies) ? g.companies : []).map((c) => ({
            ...c,
            category: c.category ?? g.category,
          }))
        );
        setCompanyStats(list);
        setRollup({
          totalCompanyCount: data?.totalCompanyCount ?? list.length,
          totalPostCount: data?.totalPostCount ?? 0,
          totalRecentPostCount: data?.totalRecentPostCount ?? 0,
        });
      } catch (err) {
        console.error("Failed to fetch company stats:", err);
      } finally {
        if (!cancelled) setCompaniesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const [activeCategory, setActiveCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Directory is API-driven: company name, category, and counts come from the
  // stats endpoint; the description blurb stays curated (the stats API has none).
  //
  // The stats API groups companies by category, so a company whose posts carry
  // inconsistent categories comes back in more than one group (e.g. Scale.ai in
  // both "Mid-sized" and "FAANG / Big Tech"). Those rows are merged by resolved
  // id here — two cards sharing a React key made stale duplicates pile up every
  // time a category tile was toggled. Note counts are summed so the merged card
  // still reflects the company's full total; the category shown is the one that
  // contributed the most posts.
  const companies = useMemo<CompanyData[]>(() => {
    type Merged = CompanyData & { latestUpdatedAt?: string; topCategoryCount: number };
    const byId = new Map<string, Merged>();

    for (const s of companyStats) {
      const name = s.company?.trim();
      if (!name) continue;
      const meta = META_BY_NAME.get(name.toLowerCase());
      const id = meta?.id ?? companySlug(name);
      if (!id) continue;

      const postCount = s.postCount ?? 0;
      const category = s.category ?? meta?.category ?? "";
      const existing = byId.get(id);

      if (!existing) {
        byId.set(id, {
          id,
          name,
          category,
          description: meta?.description ?? "",
          totalNotes: postCount,
          last30Days: s.recentPostCount ?? 0,
          updatedAgo: "",
          latestUpdatedAt: s.latestUpdatedAt,
          topCategoryCount: postCount,
        });
        continue;
      }

      existing.totalNotes += postCount;
      existing.last30Days += s.recentPostCount ?? 0;
      if (postCount > existing.topCategoryCount) {
        existing.category = category;
        existing.topCategoryCount = postCount;
      }
      if (s.latestUpdatedAt && (!existing.latestUpdatedAt || s.latestUpdatedAt > existing.latestUpdatedAt)) {
        existing.latestUpdatedAt = s.latestUpdatedAt;
      }
    }

    // Highest post count first (after merging, so split rows sort by their total).
    return [...byId.values()]
      .sort((a, b) => b.totalNotes - a.totalNotes)
      .map(({ latestUpdatedAt, topCategoryCount: _topCategoryCount, ...c }) => ({
        ...c,
        updatedAgo: timeAgo(latestUpdatedAt),
      }));
  }, [companyStats]);

  // Per-category note totals for the tiles, summed from the live (categorized) companies.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of companies) {
      if (!c.category) continue;
      counts[c.category] = (counts[c.category] ?? 0) + c.totalNotes;
    }
    return counts;
  }, [companies]);

  // ── Head tags ──
  //
  // Both surfaces render the same library, so exactly one may be indexed or
  // they compete for the same queries. /interview-questions carries the real
  // tags; /interview-insights is marked noindex.
  //
  // The personal-centre branch still has to pass an object rather than null:
  // useSeo only sets data-seo-ready once it writes something, and a route that
  // never writes would hang the prerenderer for its full timeout. noindex is
  // the "terminal state, nothing to index" signal that keeps that honest.
  //
  // On the public branch, `null` while the directory loads is deliberate — it
  // is what stops the prerenderer from snapshotting an empty grid. Once loading
  // settles it resolves either way, so an empty library cannot hang the build.
  useSeo(
    !isPublic
      ? {
          ...SEO_COPY.interviewInsights,
          path: '/interview-insights',
          noindex: true,
        }
      : companiesLoading
        ? null
        : {
            ...SEO_COPY.interviewInsights,
            path: '/interview-questions',
            jsonLd: [
              {
                '@context': 'https://schema.org',
                '@type': 'CollectionPage',
                name: 'Interview Questions by Company',
                description: SEO_COPY.interviewInsights.description,
                url: 'https://www.screna.ai/interview-questions',
                ...(rollup
                  ? {
                      mainEntity: {
                        '@type': 'ItemList',
                        numberOfItems: rollup.totalCompanyCount,
                      },
                    }
                  : {}),
              },
            ],
          },
  );

  // Every company the library knows about, by the id the links use.
  //
  // The chips on the category tiles are hardcoded names, so some of them
  // (Oracle, Notion, Cursor…) may not be in the library at all. Their links are
  // ordinary crawlable anchors, and one pointing at a company with no notes is
  // a 404 advertised from an indexed page. Filtering them through this set is
  // cheaper than curating the chip list by hand against live data.
  const knownCompanyIds = useMemo(() => new Set(companies.map((c) => c.id)), [companies]);

  // The featured grid is a shortlist, and on the public surface it is the
  // companies that earn an indexed page of their own — the same threshold the
  // sitemap applies, so the grid and the sitemap put forward the same set.
  // Everything below the threshold is reachable from the full list at the foot
  // of the page, which is where the completeness requirement is met.
  const displayedCompanies = useMemo(() => {
    let filtered = companies;
    if (isPublic) {
      filtered = filtered.filter((c) => (c.totalNotes ?? 0) >= MIN_POSTS_FOR_PAGE);
    }
    if (activeCategory !== "All") {
      filtered = filtered.filter((c) => c.category === activeCategory);
    }
    return filtered;
  }, [companies, activeCategory, isPublic]);

  const ITEMS_PER_PAGE = activeCategory === "All" ? 27 : 19;
  const paginatedCompanies = displayedCompanies.slice(0, currentPage * ITEMS_PER_PAGE);
  const hasMoreCompanies = paginatedCompanies.length < displayedCompanies.length;

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  // Auto-scroll to the Featured Companies section whenever a company-type tile is
  // selected, so it's obvious the list below changed to the picked category.
  const companiesSectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (activeCategory !== "All") {
      companiesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeCategory]);

  // Infinite scroll: reveal the next page as the sentinel scrolls into view.
  // Pagination is client-side (slicing an already-loaded list), so this just
  // bumps the page count; new cards animate in on entry (see motion.div below).
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMoreCompanies) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setCurrentPage((p) => p + 1);
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreCompanies]);

  return (
    <Layout fullBleed {...layoutProps}>
    <WidePageContainer maxWidth="none">

      {/* ── Hero banner — full-bleed, no top/left/right margin ── */}
      <section
        aria-label="InterviewPrep Note hero"
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(to right, #f6fbff, #e8f7ff 44%, #e5faf3)',
          marginTop: 0,
          marginLeft: -32,
          marginRight: -32,
          marginBottom: 28,
        }}
      >
        {/* Decorative: open book illustration (right side) */}
        <svg
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{ right: 0, top: 0, width: '60%', height: '100%', maxWidth: 700 }}
          fill="none"
          viewBox="0 0 1147 330"
          preserveAspectRatio="xMaxYMid meet"
        >
          <ellipse cx="810.26" cy="165" fill="#38BDF8" fillOpacity="0.04" rx="215" ry="165" />
          <g opacity="0.31">
            <path d={bannerSvg.p3f1d1880} fill="#0EA5A4" fillOpacity="0.16" stroke="#0EA5A4" strokeOpacity="0.1" strokeWidth="1.2" />
            <path d={bannerSvg.p13923000} fill="#3B82F6" fillOpacity="0.13" stroke="#3B82F6" strokeOpacity="0.1" strokeWidth="1.2" />
            <path d={bannerSvg.p33177c00} fill="white" fillOpacity="0.48" stroke="#38BDF8" strokeOpacity="0.18" strokeWidth="1.4" />
            <path d={bannerSvg.p147eae80} fill="white" fillOpacity="0.54" stroke="#34D399" strokeOpacity="0.18" strokeWidth="1.4" />
            <circle cx="998.26" cy="147" fill="#0EA5A4" fillOpacity="0.2" r="9" />
            <circle cx="998.26" cy="147" r="8.25" stroke="white" strokeOpacity="0.55" strokeWidth="1.5" />
          </g>
        </svg>

        {/* Content — normal flow, above decoration */}
        <div className="relative flex flex-col" style={{ padding: '48px 32px 0', zIndex: 1 }}>
          {/* Title row */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div style={{ maxWidth: 560 }}>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 34, lineHeight: 1.2, color: '#182033', marginBottom: 10 }}>
                Decode real interview loops
              </h1>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: '22px', color: '#526070', maxWidth: 600 }}>
                Browse community notes by company, role, round, and level so interview patterns are easier to spot.
              </p>
            </div>
            <Link to={shareTo} className="shrink-0 w-[222px] h-[44px] block mt-1">
              <ShareButton />
            </Link>
          </div>

          {/* Stats row — full-bleed within banner, top/bottom border. */}
          <div
            className="grid sm:grid-cols-2"
            style={{ marginTop: 32, marginLeft: -32, marginRight: -32, borderTop: '1px solid #e1e4ea', borderBottom: '1px solid #e1e4ea' }}
          >
            {[
              { label: "Companies", value: companiesLoading || !rollup ? "—" : rollup.totalCompanyCount.toLocaleString() },
              { label: "Total Notes", value: companiesLoading || !rollup ? "—" : rollup.totalPostCount.toLocaleString() },
            ].map((stat, i, arr) => (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center py-8 text-center"
                style={{ borderRight: i < arr.length - 1 ? '1px solid #e1e4ea' : 'none' }}
              >
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: 24, lineHeight: '36px', color: '#1e232f', letterSpacing: '-0.75px' }}>
                  {stat.value}
                </span>
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, lineHeight: '20px', color: '#5a6172', marginTop: 8 }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quick Mock launcher — the entry point moved here from /quick-mock ──
          Both surfaces show the same panel, so the public page is not a lesser
          version of the personal centre. Starting a mock still needs a session
          — the role list, the resume-derived defaults and the credit check are
          all authenticated endpoints — so for guests it renders locked: no
          requests fire, and the start button goes to /auth. */}
      <QuickMockWidget locked={signedOut} />

      <div className="space-y-16">
          {/* Category Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(420px, 100%), 1fr))', gap: '24px' }}>
            {categoryTiles.map((cat) => {
              const isActive = activeCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => handleCategoryChange(isActive ? "All" : cat.name)}
                  className={`group relative flex h-[210px] w-full flex-col items-start overflow-hidden rounded-[16px] text-left transition-all hover:-translate-y-1 hover:shadow-[0px_2px_8px_0px_rgba(0,0,0,0.1)] ${
                    isActive
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md"
                      : "shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 z-0 h-[313px]">
                    <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={cat.image} />
                  </div>
                  <div className="relative z-10 flex size-full flex-col p-6">
                    <div className="mb-1.5 text-[11px] font-bold uppercase leading-[15.4px] tracking-[1.1px] text-primary/80" style={{ fontFamily: "var(--font-sans)" }}>
                      {(categoryCounts[cat.name] ?? 0).toLocaleString()} notes
                    </div>
                    <h3 className="text-[20px] font-bold leading-[28px] tracking-[-0.5px] text-foreground" style={{ fontFamily: "var(--font-sans)" }}>{cat.name}</h3>
                    <p className="mt-1.5 text-[14px] font-medium leading-[22.75px] text-foreground/80" style={{ fontFamily: "var(--font-sans)" }}>{cat.subtitle}</p>
                    <div className="mt-auto w-full space-y-4">
                      {/* Hardcoded example chips, filtered to companies the
                          library actually has notes for: these are crawlable
                          links, and one pointing at a company with no page is a
                          404 advertised from an indexed page. Unfiltered until
                          the stats land, so the tiles are not empty on first
                          paint. */}
                      <div className="flex flex-wrap gap-2">
                        {cat.examples
                          .filter((ex) => knownCompanyIds.size === 0 || knownCompanyIds.has(companySlug(ex)))
                          .map((ex) => (
                          <Link
                            key={ex}
                            to={`${basePath}/${companySlug(ex)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-full bg-white/40 px-[10px] py-1 text-[11px] font-semibold leading-[15.4px] text-foreground transition-colors hover:bg-white/60"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            {ex}
                          </Link>
                        ))}
                      </div>
                      <div className={`flex items-center pt-2 text-[14px] font-semibold leading-[20px] transition-colors ${isActive ? "text-primary" : "text-foreground group-hover:text-foreground/80"}`} style={{ fontFamily: "var(--font-sans)" }}>
                        Explore <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* <div className="space-y-6">
            <div className="flex items-center border-t border-border pt-6">
              <span className="mr-4 inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground z-10" style={{ fontFamily: "var(--font-sans)" }}>
                <Clock className="size-4" /> Latest
              </span>
              <div className="flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]">
                <style>{`@keyframes latest-marquee { to { transform: translateX(-50%); } }`}</style>
                <div className="flex w-max shrink-0 animate-[latest-marquee_30s_linear_infinite] hover:[animation-play-state:paused]">
                  <div className="flex items-center gap-2 pr-2">
                    {latest.map((item, i) => (
                      <button key={`a-${i}`} type="button" className="cursor-pointer rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80" style={{ fontFamily: "var(--font-sans)" }}>{item}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pr-2" aria-hidden="true">
                    {latest.map((item, i) => (
                      <button key={`b-${i}`} type="button" tabIndex={-1} className="cursor-pointer rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80" style={{ fontFamily: "var(--font-sans)" }}>{item}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div> */}

          {/* Companies Grid */}
          <section ref={companiesSectionRef} className="scroll-mt-24 space-y-6">
            <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 className="text-foreground" style={{ fontFamily: "var(--font-serif)", fontSize: "28px", fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                  {activeCategory === "All" ? "Featured Companies" : `${activeCategory} Companies`}
                </h2>
                <p className="mt-2 text-base text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                  {activeCategory === "All"
                    ? "Browse companies with the most recent community interview insights."
                    : categoryTiles.find((c) => c.name === activeCategory)?.subtitle}
                </p>
              </div>
              {activeCategory !== "All" && (
                <button onClick={() => handleCategoryChange("All")} className="shrink-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                  Clear company type
                </button>
              )}
            </div>

            {companiesLoading ? (
              <LoadingCards count={9} />
            ) : displayedCompanies.length > 0 ? (
              <div className="space-y-10">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '24px' }}>
                  {paginatedCompanies.map((company, i) => (
                    <motion.div
                      key={company.id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.35, delay: Math.min((i % ITEMS_PER_PAGE) * 0.03, 0.3) }}
                    >
                      <InlineCompanyCard company={company} basePath={basePath} />
                    </motion.div>
                  ))}
                </div>
                {/* Infinite-scroll sentinel — auto-loads the next page as it nears
                    the viewport; the spinner doubles as the loading animation. */}
                {hasMoreCompanies && (
                  <div ref={loadMoreRef} className="flex items-center justify-center border-t border-border/60 pt-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                      <Loader2 className="size-4 animate-spin text-primary" />
                      Loading more companies…
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>No companies found matching your search.</div>
            )}
          </section>

          {/* ── Every company, in the initial HTML ──
              The grid above is a shortlist that the client slices to 27 cards
              and extends on scroll with an IntersectionObserver. A crawler does
              not scroll, so 27 cards was the entire crawlable width of this
              surface: the ~500 companies below the featured threshold had pages
              that nothing linked to, stranding the notes on them.

              This list is the fix and its requirements are exactly two: every
              company, and present without an interaction. No slicing, no
              observer, no collapsed container. It renders from the same
              `companies` list already in state (the prerender seed on a
              snapshot load), so it costs no extra request.

              Public surface only. /interview-insights is noindex and
              login-walled, so a 700-link index there is noise with no crawl
              value. */}
          {isPublic && companies.length > 0 && (
            <section className="border-t border-border pt-8" aria-labelledby="all-companies">
              <h2
                id="all-companies"
                className="text-foreground"
                style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, lineHeight: 1.2 }}
              >
                All companies
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                Every company with interview notes in the library.
              </p>
              <ul
                className="mt-4 gap-x-6 gap-y-1.5 text-[13px] leading-[1.6]"
                style={{ columnWidth: "200px", columnGap: "24px", listStyle: "none", padding: 0, margin: "16px 0 0" }}
              >
                {companies.map((c) => (
                  <li key={c.id} style={{ breakInside: "avoid" }}>
                    <Link
                      to={`${basePath}/${c.id}`}
                      // Distinct from data-company-card: the prerender build
                      // counts both, because a full grid with an empty index
                      // (or the reverse) is a different failure with the same
                      // word count.
                      data-company-index
                      className="text-muted-foreground transition-colors hover:text-foreground hover:underline"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {c.name}
                      <span className="ml-1 text-[11px] text-muted-foreground/70">{c.totalNotes ?? 0}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
      </div>

    </WidePageContainer>
    </Layout>
  );
}

export default InterviewInsightsPage;
