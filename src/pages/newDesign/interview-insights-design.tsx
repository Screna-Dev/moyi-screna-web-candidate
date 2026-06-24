import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Clock, Search } from "lucide-react";
import { DashboardLayout } from "@/components/newDesign/dashboard-layout";
import { WidePageContainer } from "@/components/newDesign/dashboard-page";
import ShareButton from "@/components/newDesign/interview/share-experience-button";
import { type CompanyData } from "@/components/newDesign/interview/company-card";
import { getCompanyLogoUrl } from "@/components/newDesign/ui/company-logo";
import { RoleFilter, CompanyFilter, RoundFilter, LevelFilter, TimeFilter } from "@/components/newDesign/interview/filter-popovers";
import { InterviewNoteCard, type InterviewNote } from "@/components/newDesign/interview/interview-note-card";
import { InterviewNotesFilterBar } from "@/components/newDesign/interview/interview-notes-filter-bar";
import { getPosts, getPublicPosts, getCompaniesStats } from "@/services/CommunityService";
import { useAuth } from "@/contexts/AuthContext";
import imgFaang from "@/assets/newDesign/cat-faang.png";
import imgLargeEnt from "@/assets/newDesign/cat-large-ent.png";
import imgMidSized from "@/assets/newDesign/cat-mid-sized.png";
import imgSmall from "@/assets/newDesign/cat-small.png";

// ─── API post shape (from /community/posts/search) ─────────
type ApiPostQuestion = { id?: string; title?: string; label?: string };
type ApiPost = {
  id: string;
  company?: string;
  role?: string;
  level?: string;
  round?: string;
  date?: string;
  outcome?: string;
  summary?: string;
  questions?: (ApiPostQuestion | string)[];
  isAnonymous?: boolean;
  user?: { id?: string; name?: string };
  likeCount?: number;
  saveCount?: number;
  commentCount?: number;
  createdAt?: string;
};

// Map an API outcome string onto the card's outcome union.
function mapOutcome(outcome: string | undefined): InterviewNote["outcome"] {
  const o = (outcome ?? "").toLowerCase();
  if (o.includes("offer") && !o.includes("no")) return "Offer";
  if (o.includes("reject")) return "Rejected";
  if (o.includes("no offer") || o.includes("no response")) return "No Offer";
  return "Pending";
}

// Read a question's display title whether it's a string or an object.
function questionTitle(q: ApiPostQuestion | string): string {
  if (typeof q === "string") return q;
  return q.title || q.label || "Question";
}

// Format an ISO/date string into a short "Mon YYYY" label.
function formatNoteDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

// Format an ISO timestamp into a short "x ago" label for the ticker.
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

// ApiPost -> the exact shape InterviewNoteCard consumes.
function mapPostToNote(post: ApiPost, index: number): InterviewNote {
  return {
    id: post.id,
    company: post.company || "Unknown",
    role: post.role || "Unknown Role",
    round: post.round || "Not specified",
    level: post.level || "",
    outcome: mapOutcome(post.outcome),
    date: formatNoteDate(post.date),
    author: post.isAnonymous ? "Anonymous" : (post.user?.name || "Anonymous"),
    excerpt: post.summary || "",
    questions: (post.questions ?? []).map(questionTitle),
    upvotes: post.likeCount ?? 0,
    comments: post.commentCount ?? 0,
    saves: post.saveCount ?? 0,
    featured: index === 0,
  };
}

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

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

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

function InlineCompanyCard({ company }: { company: CompanyData }) {
  return (
    <Link
      to={`/interview-insights/${company.id}`}
      className="group relative flex min-h-[160px] w-full flex-col justify-between rounded-[16px] border border-border bg-[#F7F8F9] p-5 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:border-border/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:border-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
          <CardLogo name={company.name} size="sm" />
          <div className="flex min-w-0 flex-col pt-0.5">
            <h3 className="truncate text-[15px] font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
              {company.name}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                {company.category ?? "Company"}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                Updated {company.updatedAgo}
              </span>
            </div>
          </div>
        </div>
        <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" strokeWidth={2} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border/60 pt-3.5">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Total notes</span>
          <span className="mt-1 text-[17px] font-bold leading-none tracking-tight text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
            {company.totalNotes?.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="whitespace-nowrap text-[11px] font-medium text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Last 30 days</span>
          <span className="mt-1 text-[17px] font-bold leading-none tracking-tight text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
            +{company.last30Days ?? 0}
          </span>
        </div>
      </div>
    </Link>
  );
}

function LargeCompanyCard({ company }: { company: CompanyData }) {
  return (
    <Link
      to={`/interview-insights/${company.id}`}
      className="group relative flex h-full min-h-[300px] w-full flex-col rounded-[16px] border border-border bg-surface-0 p-6 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:border-border/80 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:border-primary"
    >
      <div className="flex items-start justify-between gap-4">
        <CardLogo name={company.name} size="lg" />
        <ArrowRight className="mt-2 size-5 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-1 group-hover:text-foreground" strokeWidth={2} />
      </div>
      <div className="mt-6 flex flex-col">
        <h3 className="text-xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
          {company.name}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground" style={{ fontFamily: "var(--font-sans)" }}>
            {company.category ?? "Company"}
          </span>
          <span className="text-[12px] font-medium text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
            Updated {company.updatedAgo}
          </span>
        </div>
      </div>
      {company.description && (
        <p className="mt-4 flex-1 text-[14px] leading-relaxed text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
          {company.description}
        </p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/60 pt-5">
        <div className="flex flex-col">
          <span className="text-[12px] font-medium text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Total notes</span>
          <span className="mt-1 text-2xl font-bold leading-none tracking-tight text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
            {company.totalNotes?.toLocaleString() ?? 0}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="whitespace-nowrap text-[12px] font-medium text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>Last 30 days</span>
          <span className="mt-1 text-2xl font-bold leading-none tracking-tight text-foreground" style={{ fontFamily: "var(--font-sans)" }}>
            +{company.last30Days ?? 0}
          </span>
        </div>
      </div>
    </Link>
  );
}

// Loading frames shown while the directory / feed requests are in flight.
function LoadingCards({ count = 9 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-[var(--radius)] border border-border bg-secondary/40" style={{ height: 150 }} />
      ))}
    </div>
  );
}

function LoadingRows({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-[12px]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-[var(--radius)] border border-border bg-secondary/40" style={{ height: 120 }} />
      ))}
    </div>
  );
}

export function InterviewInsightsPage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"companies" | "feed">("feed");
  const [interviewNotes, setInterviewNotes] = useState<InterviewNote[]>([]);
  const [latest, setLatest] = useState<string[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStat[]>([]);
  const [rollup, setRollup] = useState<{ totalCompanyCount: number; totalPostCount: number; totalRecentPostCount: number } | null>(null);
  const [notesLoading, setNotesLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  // Fetch the interview-experience feed on mount and map it into the card/ticker shapes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fetchFn = isAuthenticated ? getPosts : getPublicPosts;
        const res = await fetchFn(isAuthenticated ? { page: 0, sortBy: "NEWEST" } : { page: 0 });
        const data = res.data?.data ?? res.data;
        const content: ApiPost[] = Array.isArray(data) ? data : [];
        if (cancelled) return;
        setInterviewNotes(content.map(mapPostToNote));
        // Ticker: derived from the newest posts (Company · Round · time-ago).
        setLatest(
          content.slice(0, 6).map((p) =>
            [p.company || "Unknown", p.round || "Interview", timeAgo(p.createdAt || p.date)]
              .filter(Boolean)
              .join(" · ")
          )
        );
      } catch (err) {
        console.error("Failed to fetch interview notes:", err);
      } finally {
        if (!cancelled) setNotesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Load per-company stats once on mount for the companies directory.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getCompaniesStats();
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
        // Highest post count first.
        list.sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0));
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
  }, []);

  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [notesSort, setNotesSort] = useState<"Hot" | "New" | "Top">("Hot");
  const [notesRole, setNotesRole] = useState("Role");
  const [notesCompany, setNotesCompany] = useState("Company");
  const [notesRound, setNotesRound] = useState("Round");
  const [notesLevel, setNotesLevel] = useState("Level");
  const [notesTime, setNotesTime] = useState("Time");
  const [notesPage, setNotesPage] = useState(1);
  const NOTES_PER_PAGE = 5;
  const notesTotalPages = Math.max(1, Math.ceil(interviewNotes.length / NOTES_PER_PAGE));
  const paginatedNotes = interviewNotes.slice((notesPage - 1) * NOTES_PER_PAGE, notesPage * NOTES_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);

  // Directory is API-driven: company name, category, and counts come from the
  // stats endpoint; the description blurb stays curated (the stats API has none).
  const companies = useMemo<CompanyData[]>(() => {
    return companyStats.map((s) => {
      const meta = META_BY_NAME.get(s.company?.toLowerCase().trim());
      return {
        id: meta?.id ?? slugify(s.company),
        name: s.company,
        category: s.category ?? meta?.category ?? "",
        description: meta?.description ?? "",
        totalNotes: s.postCount ?? 0,
        last30Days: s.recentPostCount ?? 0,
        updatedAgo: timeAgo(s.latestUpdatedAt),
      };
    });
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

  const displayedCompanies = useMemo(() => {
    let filtered = companies;
    if (activeCategory !== "All") {
      filtered = filtered.filter((c) => c.category === activeCategory);
    }
    if (query.trim()) {
      const text = query.toLowerCase();
      filtered = filtered.filter((c) => `${c.name} ${c.description} ${c.category}`.toLowerCase().includes(text));
    }
    return filtered;
  }, [companies, activeCategory, query]);

  const ITEMS_PER_PAGE = activeCategory === "All" ? 27 : 19;
  const paginatedCompanies = displayedCompanies.slice(0, currentPage * ITEMS_PER_PAGE);
  const hasMoreCompanies = paginatedCompanies.length < displayedCompanies.length;

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <DashboardLayout headerTitle="InterviewPrep Note" fullBleed>
    <WidePageContainer maxWidth="none">

      {/* Hero & Stats Area */}
      <div className="mb-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground text-[14px]" style={{ fontFamily: "var(--font-sans)" }}>
              Real interview experiences from the community, seamlessly organized by company, role, round, and level.
            </p>
          </div>
          <Link to="/add-experience" className="shrink-0 w-[210px] h-[44px] block">
            <ShareButton />
          </Link>
        </div>

        {/* Stats Row */}
        <div className="mt-12 grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { label: "Companies", value: companiesLoading || !rollup ? "—" : rollup.totalCompanyCount.toLocaleString() },
            { label: "Total Notes", value: companiesLoading || !rollup ? "—" : rollup.totalPostCount.toLocaleString() },
            { label: "New This Month", value: companiesLoading || !rollup ? "—" : rollup.totalRecentPostCount.toLocaleString() },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-3xl font-semibold tracking-tight text-foreground" style={{ fontFamily: "var(--font-mono, monospace)" }}>{stat.value}</div>
              <div className="mt-2 text-sm font-medium text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="mb-10 flex w-full p-[4px]">
        {(["companies", "feed"] as const).map((tab) => {
          const label = tab === "companies" ? "Companies" : "Feed";
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition-all mr-2 last:mr-0 ${
                isActive ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Companies ── */}
      {activeTab === "companies" && (
        <div className="space-y-16">
          {/* Category Tiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '24px' }}>
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
                      <div className="flex flex-wrap gap-2">
                        {cat.examples.map((ex) => (
                          <Link
                            key={ex}
                            to={`/interview-insights/${ex.toLowerCase().replace(/\s+/g, '-')}`}
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

          {/* Search & Filters */}
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <label className="flex flex-1 items-center gap-3 rounded-full border border-border bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-1 focus-within:ring-ring">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={handleQueryChange}
                  placeholder="Search companies, roles, rounds, or interview notes..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  style={{ fontFamily: "var(--font-sans)" }}
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
          </div>

          {/* Companies Grid */}
          <section className="space-y-6">
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
                {activeCategory === "All" ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                    {paginatedCompanies.map((company) => (
                      <InlineCompanyCard key={company.id} company={company} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                    {paginatedCompanies.length > 0 && (
                      <div className="col-span-1 lg:col-span-1">
                        <LargeCompanyCard company={paginatedCompanies[0]} />
                      </div>
                    )}
                    {paginatedCompanies.slice(1).map((company) => (
                      <InlineCompanyCard key={company.id} company={company} />
                    ))}
                  </div>
                )}
                {hasMoreCompanies && (
                  <div className="flex items-center justify-center border-t border-border/60 pt-6">
                    <button
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="flex h-9 items-center justify-center rounded-[var(--radius)] border border-border bg-transparent px-6 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>No companies found matching your search.</div>
            )}
          </section>
        </div>
      )}

      {/* ── Tab 2: Feed ── */}
      {activeTab === "feed" && (
        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-foreground" style={{ fontFamily: "var(--font-serif)", fontSize: "28px", fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                Recent Interview Notes
              </h2>
              <p className="mt-2 text-base text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>
                Fresh notes and experiences across the directory.
              </p>
            </div>
          </div>

          <InterviewNotesFilterBar
            sort={notesSort}
            onSortChange={setNotesSort}
            role={notesRole}
            onRoleChange={setNotesRole}
            company={notesCompany}
            onCompanyChange={setNotesCompany}
            round={notesRound}
            onRoundChange={setNotesRound}
            level={notesLevel}
            onLevelChange={setNotesLevel}
            time={notesTime}
            onTimeChange={setNotesTime}
          />

          {notesLoading ? (
            <LoadingRows count={5} />
          ) : paginatedNotes.length > 0 ? (
            <div className="flex flex-col gap-[12px]">
              {paginatedNotes.map((note) => (
                <InterviewNoteCard key={note.id} note={note} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground" style={{ fontFamily: "var(--font-sans)" }}>No interview notes yet.</div>
          )}

          <div className="flex items-center justify-center gap-2 border-t border-border/60 pt-6">
            <button
              onClick={() => setNotesPage(p => Math.max(1, p - 1))}
              disabled={notesPage === 1}
              className="flex h-9 items-center justify-center rounded-[var(--radius)] border border-border bg-transparent px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: notesTotalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setNotesPage(n)}
                  className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-sm font-medium ${n === notesPage ? "bg-primary text-primary-foreground shadow" : "border border-border bg-transparent text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"}`}
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={() => setNotesPage(p => Math.min(notesTotalPages, p + 1))}
              disabled={notesPage === notesTotalPages}
              className="flex h-9 items-center justify-center rounded-[var(--radius)] border border-border bg-transparent px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Next
            </button>
          </div>
        </section>
      )}

    </WidePageContainer>
    </DashboardLayout>
  );
}

export default InterviewInsightsPage;
