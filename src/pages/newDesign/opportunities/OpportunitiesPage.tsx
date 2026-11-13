import { useEffect, useState, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { salaryRangeLabel, toOpportunityJob, type LiveOpportunityJob } from "@/components/newDesign/opportunities/careersDesignData";
import { useCareerInterviewStarter } from "@/components/newDesign/opportunities/careersShared";
import { getCareerJob, listCareerJobs, type CareerJobSort, type ExperienceBand, type WorkplaceType } from "@/services/careersApi";

// Design page (Downloads export) fed by GET /careers/jobs. Cards are mapped
// onto the design's OpportunityJob shape (see careersDesignData); a field the
// API doesn't have is hidden, never filled with sample data. Sort, role,
// location, experience and work arrangement go to the API (#325); the search
// box filters the loaded jobs by title or company.

const PAGE_LIMIT = 5; // 50 jobs

const assetPathPrefix = "/images/opportunities";
const imgSearch = `${assetPathPrefix}/cd8fa.svg`;
const imgChevronDown = `${assetPathPrefix}/f7035.svg`;
const imgGift = `${assetPathPrefix}/4c819.svg`;

const SORT_OPTIONS: { value: CareerJobSort; label: string }[] = [
  { value: "NEWEST", label: "Newest" },
  { value: "CLOSING_SOON", label: "Closing soon" },
  { value: "HIGHEST_SALARY", label: "Salary: High to low" },
];

const EXPERIENCE_OPTIONS: { value: ExperienceBand; label: string }[] = [
  { value: "YEARS_0_2", label: "0–2 years" },
  { value: "YEARS_3_5", label: "3–5 years" },
  { value: "YEARS_6_9", label: "6–9 years" },
  { value: "YEARS_10_PLUS", label: "10+ years" },
];

const WORKPLACE_OPTIONS: { value: WorkplaceType; label: string }[] = [
  { value: "ON_SITE", label: "On-site" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "REMOTE", label: "Remote" },
];

// Every job is a Partner Job this release (backend 11-12): no Screna
// Sponsored tab or banner line.
type JobTab = "all" | "partner";

const TEXT_FILTER_DEBOUNCE_MS = 400;

type FilterKey = "role" | "location" | "experience" | "workplace";

function FilterButton({ label, active, open, onToggle, children }: { label: string; active: boolean; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`flex items-center gap-2 border rounded-xl px-3.5 py-2.5 text-[14px] leading-5 transition-colors ${
          active ? "bg-[rgba(60,119,246,0.08)] border-[rgba(60,119,246,0.3)] text-[#1751cf]" : "bg-white border-[#e1e4ea] text-[#5a6172] hover:bg-[#f3f4f7]"
        }`}
        style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
      >
        {label}
        <img src={imgChevronDown} alt="" className="w-4 h-4 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-[#e1e4ea] rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.08)] z-10 min-w-[220px] p-2">
          {children}
        </div>
      )}
    </div>
  );
}

function JobTypeBadge({ type }: { type: "Partner Job" | "Screna Sponsored" }) {
  const isPartner = type === "Partner Job";
  return (
    <span
      className={`inline-flex items-center px-3 py-0.5 rounded-full text-[12px] font-semibold leading-5 border ${
        isPartner
          ? "bg-[rgba(60,119,246,0.08)] border-[rgba(60,119,246,0.15)] text-[#3c77f6]"
          : "bg-[rgba(60,119,246,0.08)] border-[rgba(60,119,246,0.15)] text-[#3c77f6]"
      }`}
      style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
    >
      {type}
    </span>
  );
}

function JobCard({ job, onViewDetail, onViewReport, onQuickInterview }: { job: LiveOpportunityJob; onViewDetail?: () => void; onViewReport?: () => void; onQuickInterview: () => void }) {
  // Only what the API sent; a hidden salary is left out.
  const meta = [job.location, job.workType, job.level, salaryRangeLabel(job.career)].filter(Boolean).join(" · ");

  return (
    <div className="bg-white border border-[#e1e4ea] rounded-2xl px-6 py-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="bg-[#f3f4f7] rounded-xl w-9 h-9 flex items-center justify-center shrink-0 mt-1">
            <span
              className="text-[#1e232f] text-[12px] font-semibold leading-4"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              {job.initials}
            </span>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="text-[#1e232f] text-[20px] font-semibold leading-6"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                {job.title}
              </span>
              <JobTypeBadge type={job.jobType} />
            </div>
            <span
              className="text-[#5a6172] text-[14px] leading-5"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              {job.company}
            </span>
          </div>
        </div>
        {/* Applicant count / cap: not shown to candidates (product, 11-12). */}
      </div>

      {/* Meta row */}
      {meta && (
        <p
          className="text-[#5a6172] text-[14px] leading-5"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          {meta}
        </p>
      )}

      {/* Description */}
      {job.description && (
        <p
          className="text-[#4d525e] text-[14px] leading-[22px]"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          {job.description}
        </p>
      )}

      {/* Tags */}
      {job.tags.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {job.tags.map((tag) => (
          <span
            key={tag}
            className="bg-[#f3f4f7] border border-[#e1e4ea] text-[#5a6172] text-[13px] leading-[17px] px-2.5 py-1 rounded-[6px]"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            {tag}
          </span>
        ))}
      </div>
      )}

      {/* Footer */}
      <div className="flex items-end justify-between pt-1">
        <div className="flex flex-col gap-4">
          {/* Sponsor/score row — changes when interview completed */}
          {job.scoreValue ? (
            <div className="flex items-center gap-[11px]">
              <span
                className="text-[#4d525e] text-[13px]"
                style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
              >
                Best score: {job.scoreValue}
              </span>
              <span
                className="text-[#d98c00] text-[13px] font-semibold"
                style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
              >
                {job.scoreStatus}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#f8fbff] border border-[#d7e7ff] rounded-xl px-3 py-2.5">
              <img src={imgGift} alt="" className="shrink-0" style={{ width: 14, height: 16.667 }} />
              <p className="text-[13px] leading-[18px] whitespace-nowrap">
                <span
                  className="text-[#1e232f]"
                  style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
                >
                  {job.sponsorInfo}
                </span>
                {job.spotsUsed !== undefined && (
                  <>
                    <span
                      className="text-[#5a6172] ml-2"
                      style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
                    >
                      {job.spotsUsed} / {job.spotsTotal} free spots used ·
                    </span>
                    <span
                      className="text-[#3c77f6] ml-1"
                      style={{ fontFamily: "'Inter:Bold', Inter, sans-serif" }}
                    >
                      {job.spotsRemaining} remaining
                    </span>
                  </>
                )}
              </p>
            </div>
          )}

          <p
            className="text-[#5a6172] text-[14px] leading-5"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            {job.closingDateLabel}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {(job.reportAvailable ?? !!job.scoreValue) && (
            <button
              onClick={onViewReport}
              className="text-[#3c77f6] text-[14px] hover:underline transition-all"
              style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
            >
              View report
            </button>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={onViewDetail}
              className="bg-white border border-[#e1e4ea] text-[#1e232f] text-[14px] font-medium leading-5 px-3 py-2 rounded-xl hover:bg-[#f9fafb] transition-colors"
              style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
            >
              View details
            </button>
            <button
              onClick={onQuickInterview}
              className="bg-[#3c77f6] text-white text-[14px] font-medium leading-5 px-3 py-2 rounded-xl hover:bg-[#2d6ae0] transition-colors"
              style={{
                fontFamily: "'Inter:Medium', Inter, sans-serif",
                boxShadow: job.primaryBtnShadow ?? "0px 10px 7.5px rgba(60,119,246,0.2), 0px 4px 3px rgba(60,119,246,0.2)",
              }}
            >
              {job.primaryAction}
            </button>
          </div>
          <div className="flex flex-col gap-0.5 items-end">
            {job.interviewCostLabel.split("\n").filter(Boolean).map((line, i) => (
              <p
                key={i}
                className="text-[#5a6172] text-[13px] leading-[18px] text-right"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function OpportunitiesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CareerJobSort>("NEWEST");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [experience, setExperience] = useState<ExperienceBand[]>([]);
  const [workplace, setWorkplace] = useState<WorkplaceType | undefined>();
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  // Typed filters go to the API once typing pauses.
  const [query, setQuery] = useState({ role: "", location: "" });
  useEffect(() => {
    const next = { role: role.trim(), location: location.trim().slice(0, 255) };
    // Same values keep the same object, or the list would reload for nothing.
    const t = window.setTimeout(
      () => setQuery((q) => (q.role === next.role && q.location === next.location ? q : next)),
      TEXT_FILTER_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(t);
  }, [role, location]);
  const [activeTab, setActiveTab] = useState<JobTab>("all");
  const [sortOpen, setSortOpen] = useState(false);
  // Escape closes an open sort / filter menu (outside click does too).
  const menuOpen = sortOpen || openFilter !== null;
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSortOpen(false);
      setOpenFilter(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  const [liveJobs, setLiveJobs] = useState<LiveOpportunityJob[] | null>(null);
  const [failed, setFailed] = useState(false);
  const starter = useCareerInterviewStarter();

  // applicationId from the row's myApplication (#320); before that's deployed,
  // from the job detail.
  const openReport = async (job: LiveOpportunityJob) => {
    const jobId = job.id;
    const appId =
      job.career.myApplication?.applicationId ??
      (await getCareerJob(jobId).then((d) => d.myApplication?.applicationId).catch(() => undefined));
    navigate(appId ? `/opportunities/applications/${encodeURIComponent(appId)}/results` : `/opportunities/job/${encodeURIComponent(jobId)}`);
  };

  const experienceKey = experience.join(",");
  useEffect(() => {
    let cancelled = false;
    setLiveJobs(null);
    setFailed(false);
    (async () => {
      const all: LiveOpportunityJob[] = [];
      for (let page = 0; page < PAGE_LIMIT; page++) {
        const res = await listCareerJobs({
          page,
          sort,
          role: query.role || undefined,
          location: query.location || undefined,
          experience: experienceKey ? (experienceKey.split(",") as ExperienceBand[]) : undefined,
          workplaceType: workplace,
        });
        res.content.forEach((j) => all.push(toOpportunityJob(j)));
        if (res.pageMeta.last || res.content.length === 0) break;
      }
      if (!cancelled) setLiveJobs(all);
    })().catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [sort, query, experienceKey, workplace]);

  // Server order (sort) is kept; tabs and search narrow the loaded jobs.
  const filtered = useMemo(() => {
    let jobs: LiveOpportunityJob[] = liveJobs ?? [];
    if (activeTab === "partner") jobs = jobs.filter((j) => j.jobType === "Partner Job");
    if (search.trim()) {
      const q = search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q)
      );
    }
    return jobs;
  }, [search, activeTab, liveJobs]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Newest";

  return (
    <div className="flex flex-col gap-0">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex flex-col gap-2">
          <h1
            className="text-[#1e232f] text-[40px] font-semibold leading-10 tracking-[-1px]"
            style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
          >
            Opportunities
          </h1>
          <p
            className="text-[#5a6172] text-[16px] leading-6"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            Explore open roles and take an AI assessment to demonstrate your skills.
          </p>
        </div>
        <button
          onClick={() => navigate("/opportunities/my-jobs")}
          className="bg-white border border-[#e1e4ea] text-[#1e232f] text-[14px] font-medium leading-5 px-3 py-2 rounded-xl hover:bg-[#f9fafb] transition-colors shrink-0 mt-2"
          style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
        >
          My Jobs
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-[#f3f4f7] border border-[#e1e4ea] rounded-xl px-5 py-5 mb-6">
        <p
          className="text-[#4d525e] text-[14px] leading-5"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          <span className="font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>Partner Jobs:</span>{" "}
          Complete an assessment to apply automatically. Recruiters can unlock your profile and report.
        </p>
      </div>

      {/* Search & filters */}
      <div className="bg-white border border-[#e1e4ea] rounded-2xl px-5 py-5 mb-6">
        {/* Top row: search + sort + count */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-white border border-[#e1e4ea] rounded-xl px-3.5 py-2.5 flex-1">
            <img src={imgSearch} alt="" className="w-4 h-4 shrink-0" />
            <input
              type="text"
              placeholder="Search by job title or company"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-[14px] leading-5 text-[#1e232f] placeholder:text-[#9ba1b0] outline-none bg-transparent"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center gap-2 bg-white border border-[#e1e4ea] rounded-xl px-3.5 py-2.5 text-[14px] font-medium leading-5 text-[#1e232f] hover:bg-[#f9fafb] transition-colors whitespace-nowrap"
              style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
            >
              {currentSortLabel}
              <img src={imgChevronDown} alt="" className="w-4 h-4 shrink-0" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#e1e4ea] rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.08)] z-10 min-w-[200px] py-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSort(opt.value); setSortOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-[14px] leading-5 hover:bg-[#f3f4f7] transition-colors ${
                      sort === opt.value ? "text-[#1751cf] font-medium" : "text-[#1e232f]"
                    }`}
                    style={{ fontFamily: sort === opt.value ? "'Inter:Medium', Inter, sans-serif" : "'Inter:Regular', Inter, sans-serif" }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span
            className="text-[#5a6172] text-[14px] leading-5 shrink-0"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            {filtered.length} open {filtered.length === 1 ? "role" : "roles"}
          </span>
        </div>

        {/* Bottom row: tabs + filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Job type tabs */}
          {(["all", "partner"] as const).map((tab) => {
            const labels = { all: "All jobs", partner: "Partner jobs" };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 rounded-xl text-[14px] font-medium leading-5 border transition-colors ${
                  isActive
                    ? "bg-[#3c77f6] text-white border-[#3c77f6]"
                    : "bg-white text-[#5a6172] border-[#e1e4ea] hover:bg-[#f3f4f7]"
                }`}
                style={{ fontFamily: isActive ? "'Inter:Semi_Bold', Inter, sans-serif" : "'Inter:Medium', Inter, sans-serif" }}
              >
                {labels[tab]}
              </button>
            );
          })}

          {/* Filter dropdowns (sent to GET /careers/jobs, #325) */}
          <FilterButton label={query.role ? `Role: ${query.role}` : "Role"} active={!!query.role} open={openFilter === "role"} onToggle={() => setOpenFilter((f) => (f === "role" ? null : "role"))}>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Backend Engineer"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setOpenFilter(null)}
              className="w-full border border-[#e1e4ea] rounded-lg px-3 py-2 text-[14px] leading-5 text-[#1e232f] placeholder:text-[#9ba1b0] outline-none focus:border-[#3c77f6]"
              aria-label="Role"
            />
          </FilterButton>
          <FilterButton label={query.location ? `Location: ${query.location}` : "Location"} active={!!query.location} open={openFilter === "location"} onToggle={() => setOpenFilter((f) => (f === "location" ? null : "location"))}>
            <input
              autoFocus
              type="text"
              maxLength={255}
              placeholder="City, state or country"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setOpenFilter(null)}
              className="w-full border border-[#e1e4ea] rounded-lg px-3 py-2 text-[14px] leading-5 text-[#1e232f] placeholder:text-[#9ba1b0] outline-none focus:border-[#3c77f6]"
              aria-label="Location"
            />
            <p className="text-[#8f99b5] text-[12px] leading-4 mt-1.5 px-1">For remote roles, use Work arrangement.</p>
          </FilterButton>
          <FilterButton
            label={experience.length ? `Experience (${experience.length})` : "Experience"}
            active={experience.length > 0}
            open={openFilter === "experience"}
            onToggle={() => setOpenFilter((f) => (f === "experience" ? null : "experience"))}
          >
            {EXPERIENCE_OPTIONS.map((o) => {
              const on = experience.includes(o.value);
              return (
                <button
                  key={o.value}
                  role="menuitemcheckbox"
                  aria-checked={on}
                  onClick={() => setExperience((xs) => (on ? xs.filter((x) => x !== o.value) : EXPERIENCE_OPTIONS.map((e) => e.value).filter((v) => v === o.value || xs.includes(v))))}
                  className={`w-full flex items-center gap-2 text-left px-2 py-2 rounded-lg text-[14px] leading-5 hover:bg-[#f3f4f7] ${on ? "text-[#1751cf] font-medium" : "text-[#1e232f]"}`}
                >
                  <input type="checkbox" readOnly checked={on} tabIndex={-1} className="accent-[#3c77f6]" />
                  {o.label}
                </button>
              );
            })}
          </FilterButton>
          <FilterButton
            label={WORKPLACE_OPTIONS.find((o) => o.value === workplace)?.label ?? "Work arrangement"}
            active={!!workplace}
            open={openFilter === "workplace"}
            onToggle={() => setOpenFilter((f) => (f === "workplace" ? null : "workplace"))}
          >
            {[{ value: undefined, label: "Any" }, ...WORKPLACE_OPTIONS].map((o) => {
              const on = workplace === o.value;
              return (
                <button
                  key={o.label}
                  role="menuitemradio"
                  aria-checked={on}
                  onClick={() => {
                    setWorkplace(o.value);
                    setOpenFilter(null);
                  }}
                  className={`w-full flex items-center gap-2 text-left px-2 py-2 rounded-lg text-[14px] leading-5 hover:bg-[#f3f4f7] ${on ? "text-[#1751cf] font-medium" : "text-[#1e232f]"}`}
                >
                  {o.label}
                </button>
              );
            })}
          </FilterButton>
        </div>
      </div>

      {/* Job cards */}
      <div className="flex flex-col gap-4 pb-12">
        {filtered.map((job) => (
          <JobCard
              key={job.id}
              job={job}
              onViewDetail={() => navigate(`/opportunities/job/${encodeURIComponent(job.id)}`)}
              onQuickInterview={() => void starter.begin(job.id)}
              onViewReport={() => void openReport(job)}
            />
        ))}
        {filtered.length === 0 && (
          <div className="bg-white border border-[#e1e4ea] rounded-2xl px-6 py-12 text-center">
            <p
              className="text-[#5a6172] text-[14px] leading-5"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              {failed ? "We couldn't load open roles. Refresh to try again." : !liveJobs ? "Loading open roles…" : "No jobs match your search or filters."}
            </p>
          </div>
        )}
      </div>

      {/* Close dropdown on outside click */}
      {(sortOpen || openFilter) && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => {
            setSortOpen(false);
            setOpenFilter(null);
          }}
        />
      )}

      {/* Apply → start interview (confirm, resume upload, not-enough-credits) */}
      {starter.ui}
    </div>
  );
}
