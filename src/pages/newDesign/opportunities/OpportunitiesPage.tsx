import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { opportunityJobs, sortJobs, type SortOption, type OpportunityJob } from "@/components/newDesign/opportunities/mockJobs";
import { QuickInterviewModal } from "@/components/newDesign/opportunities/QuickInterviewModal";
import { useOpportunities } from "@/components/newDesign/opportunities/OpportunitiesContext";

const assetPathPrefix = "/images/opportunities";
const imgSearch = `${assetPathPrefix}/cd8fa.svg`;
const imgChevronDown = `${assetPathPrefix}/f7035.svg`;
const imgGift = `${assetPathPrefix}/4c819.svg`;

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "closing-soon", label: "Closing soon" },
  { value: "salary-high-low", label: "Salary: High to low" },
  { value: "cost-low-high", label: "Interview cost: Low to high" },
];

type JobTab = "all" | "partner" | "sponsored";

function ApplicationBar({ count, max }: { count: number; max: number }) {
  const pct = Math.round((count / max) * 100);
  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-[#1e232f] text-[20px] font-semibold leading-6"
          style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
        >
          {count} / {max}
        </span>
        <span
          className="text-[#5a6172] text-[13px] leading-5"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          Applications
        </span>
      </div>
      <div className="w-[172px] h-1.5 bg-[#e1e4ea] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#3c77f6]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className="text-[#5a6172] text-[13px] leading-5"
        style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
      >
        {max - count} spots remaining
      </span>
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

function JobCard({ job, onViewDetail, onViewReport, onQuickInterview, onContactRecruiter, interviewCompleted, emailSent }: { job: OpportunityJob; onViewDetail?: () => void; onViewReport?: () => void; onQuickInterview: () => void; onContactRecruiter?: () => void; interviewCompleted?: boolean; emailSent?: boolean }) {
  const salaryFormatted = `$${(job.salaryMin / 1000).toFixed(0)},000 – $${(job.salaryMax / 1000).toFixed(0)},000`;

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
        <ApplicationBar count={job.applicationCount} max={job.applicationMax} />
      </div>

      {/* Meta row */}
      <p
        className="text-[#5a6172] text-[14px] leading-5"
        style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
      >
        {job.location} · {job.workType} · {job.level} · {salaryFormatted}
      </p>

      {/* Description */}
      <p
        className="text-[#4d525e] text-[14px] leading-[22px]"
        style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
      >
        {job.description}
      </p>

      {/* Tags */}
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

      {/* Footer */}
      <div className="flex items-end justify-between pt-1">
        <div className="flex flex-col gap-4">
          {/* Sponsor/score row — changes when interview completed */}
          {interviewCompleted ? (
            /* Completed state: show Best score + Qualified */
            <div className="flex items-center gap-[11px]">
              <span className="text-[#4d525e] text-[13px]" style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}>
                Best score: 84/100
              </span>
              <span className="text-[#15a560] text-[13px] font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>
                Qualified
              </span>
            </div>
          ) : job.scoreValue ? (
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

          {/* Second line: CTA text or email status */}
          {interviewCompleted && (
            <div className="flex items-center justify-between w-full gap-4">
              <p className="text-[#666b78] text-[13px]" style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}>
                {emailSent ? "Email sent · Confirmed by you" : "Send your recruiter email to apply."}
              </p>
              {!emailSent && (
                <button
                  onClick={onContactRecruiter}
                  className="text-[#3c77f6] text-[14px] font-medium shrink-0 hover:underline"
                  style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
                >
                  Contact recruiter →
                </button>
              )}
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
          {(job.scoreValue || interviewCompleted) && (
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
            {/* When completed: no Quick interview; show Retake interview */}
            {!interviewCompleted && (
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
            )}
            {interviewCompleted && (
            <button
              className="bg-[#3c77f6] text-white text-[14px] font-medium leading-5 px-3 py-2 rounded-xl hover:bg-[#2d6ae0] transition-colors"
              style={{ fontFamily: "'Inter:Medium', Inter, sans-serif", boxShadow: "0px 4px 3px rgba(60,119,246,0.2)" }}
            >
              Retake interview
            </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5 items-end">
            {job.interviewCostLabel.split("\n").map((line, i) => (
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
  const { interviewStatus, emailStatus } = useOpportunities();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [activeTab, setActiveTab] = useState<JobTab>("all");
  const [sortOpen, setSortOpen] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  const filtered = useMemo(() => {
    let jobs = opportunityJobs;
    if (activeTab === "partner") jobs = jobs.filter((j) => j.jobType === "Partner Job");
    if (activeTab === "sponsored") jobs = jobs.filter((j) => j.jobType === "Screna Sponsored");
    if (search.trim()) {
      const q = search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q)
      );
    }
    return sortJobs(jobs, sort);
  }, [search, sort, activeTab]);

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
          className="text-[#4d525e] text-[14px] leading-5 mb-2"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          <span className="font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>Partner Jobs:</span>{" "}
          Complete an assessment to apply automatically. Recruiters can unlock your profile and report.
        </p>
        <p
          className="text-[#4d525e] text-[14px] leading-5"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          <span className="font-semibold" style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}>Screna Sponsored:</span>{" "}
          Limited free first assessments. Qualify to prepare a recruiter email, then send it yourself to apply.
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
            {filtered.length} open roles
          </span>
        </div>

        {/* Bottom row: tabs + filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Job type tabs */}
          {(["all", "partner", "sponsored"] as const).map((tab) => {
            const labels = { all: "All jobs", partner: "Partner jobs", sponsored: "Screna Sponsored" };
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

          {/* Filter dropdowns */}
          {["Role", "Location", "Experience", "Work arrangement"].map((f) => (
            <button
              key={f}
              className="flex items-center gap-2 bg-white border border-[#e1e4ea] rounded-xl px-3.5 py-2.5 text-[14px] text-[#5a6172] leading-5 hover:bg-[#f3f4f7] transition-colors"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              {f}
              <img src={imgChevronDown} alt="" className="w-4 h-4 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Job cards */}
      <div className="flex flex-col gap-4 pb-12">
        {filtered.map((job) => (
          <JobCard
              key={job.id}
              job={job}
              onViewDetail={
                job.id === "5" ? () => navigate("/opportunities/job/5") :
                job.id === "1" ? () => navigate("/opportunities/job/1") :
                undefined
              }
              onViewReport={job.id === "8" ? () => navigate("/opportunities/job/8/results") : undefined}
              onQuickInterview={() => setShowInterviewModal(true)}
              onContactRecruiter={job.id === "5" ? () => navigate("/opportunities/job/5/contact") : undefined}
              interviewCompleted={job.id === "5" && interviewStatus["5"] === "completed"}
              emailSent={job.id === "5" && emailStatus["5"] === "sent"}
            />
        ))}
        {filtered.length === 0 && (
          <div className="bg-white border border-[#e1e4ea] rounded-2xl px-6 py-12 text-center">
            <p
              className="text-[#5a6172] text-[14px] leading-5"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              No jobs match your search.
            </p>
          </div>
        )}
      </div>

      {/* Close dropdown on outside click */}
      {sortOpen && (
        <div className="fixed inset-0 z-[5]" onClick={() => setSortOpen(false)} />
      )}

      {/* Quick interview modal */}
      {showInterviewModal && (
        <QuickInterviewModal onClose={() => setShowInterviewModal(false)} />
      )}
    </div>
  );
}
