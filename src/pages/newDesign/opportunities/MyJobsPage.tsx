import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { type MyJob, type AssessmentStatus, type ApplicationStatus } from "@/components/newDesign/opportunities/mockJobs";
import { toMyJob, type LiveMyJob } from "@/components/newDesign/opportunities/careersDesignData";
import { StartInterviewDialog } from "@/components/newDesign/opportunities/careersShared";
import { listMyApplications, type CareerApplication } from "@/services/careersApi";

// Design page (Downloads export) fed by GET /careers/applications. Rows are
// mapped onto the design's MyJob shape; scores, qualification and location
// aren't returned yet and come from the design's sample data (see
// careersDesignData). Search and status filters run client-side.

const PAGE_LIMIT = 5; // 50 applications

const assetPathPrefix = "/images/opportunities";
const imgSearch = `${assetPathPrefix}/cd8fa.svg`;
const imgChevronDown = `${assetPathPrefix}/f7035.svg`;

type StatusFilter = "all" | "in-progress" | "not-applied" | "applied";

function assessmentBadge(status: AssessmentStatus) {
  switch (status) {
    case "In progress":
      return { bg: "bg-[#e6edfa]", border: "border-[#bfd2f6]", text: "text-[#3c77f6]", label: "Assessment · In progress" };
    case "Qualified":
      return { bg: "bg-[#f0fdf4]", border: "border-[#bbf7d0]", text: "text-[#16a34a]", label: "Qualified" };
    case "Not yet qualified":
      return { bg: "bg-[#fffbeb]", border: "border-[#fde68a]", text: "text-[#b45309]", label: "Assessment · Not yet qualified" };
    default:
      return { bg: "bg-[#f3f4f7]", border: "border-[#e1e4ea]", text: "text-[#5a6172]", label: "Not started" };
  }
}

function applicationBadge(status: ApplicationStatus) {
  switch (status) {
    case "Applied":
      return { bg: "bg-[#f0fdf4]", border: "border-[#bbf7d0]", text: "text-[#16a34a]", label: "Application · Applied" };
    case "Not selected":
      return { bg: "bg-[#edf0f2]", border: "border-[#e1e4ea]", text: "text-[#596170]", label: "Application · Not selected" };
    default:
      return { bg: "bg-[#f3f4f7]", border: "border-[#e1e4ea]", text: "text-[#5a6172]", label: "Application · Not applied yet" };
  }
}

function JobTypeBadge({ type, isClosed }: { type: string; isClosed?: boolean }) {
  if (isClosed) {
    return (
      <span
        className="inline-flex items-center px-3 py-0.5 rounded-full text-[12px] font-semibold leading-5 bg-[#f3f4f7] border border-[#e1e4ea] text-[#5a6172]"
        style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
      >
        Job closed
      </span>
    );
  }
  const isPartner = type === "Partner Job";
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold leading-5 border ${
        isPartner
          ? "bg-[#f0fdf4] border-[#bbf7d0] text-[#16a34a]"
          : "bg-[rgba(60,119,246,0.1)] border-[rgba(60,119,246,0.2)] text-[#3c77f6]"
      }`}
      style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
    >
      {type}
    </span>
  );
}

function MyJobCard({ job, onBrowse, onAction }: { job: MyJob; onBrowse: () => void; onAction?: (label: string) => void }) {
  const ab = assessmentBadge(job.assessmentStatus);
  const appB = applicationBadge(job.applicationStatus);

  return (
    <div className="bg-white border border-[#e1e4ea] rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="bg-[#f3f4f7] rounded-xl w-9 h-9 flex items-center justify-center shrink-0">
            <span
              className="text-[#1e232f] text-[12px] font-semibold leading-4"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              {job.initials}
            </span>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onAction?.("View details");
              }}
              className="text-[#3c77f6] text-[18px] font-semibold leading-6 underline decoration-solid decoration-from-font"
              style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
            >
              {job.title}
            </a>
            <p
              className="text-[#5a6172] text-[14px] leading-5"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              {job.company}
            </p>
          </div>
        </div>
        <JobTypeBadge type={job.jobType} isClosed={job.isClosed} />
      </div>

      {/* Location */}
      <p
        className="text-[#5a6172] text-[13px] leading-[19.5px]"
        style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
      >
        {job.location}
      </p>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium leading-[16.5px] border ${ab.bg} ${ab.border} ${ab.text}`}
          style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
        >
          {ab.label}
        </span>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium leading-[16.5px] border ${appB.bg} ${appB.border} ${appB.text}`}
          style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
        >
          {appB.label}
        </span>
      </div>

      {/* Score */}
      {job.bestScore !== null && (
        <p
          className="text-[#4d525e] text-[13px] font-medium leading-[normal]"
          style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
        >
          Best score: {job.bestScore}/100
        </p>
      )}

      {/* Guidance */}
      {job.guidance && (
        <div>
          {job.assessmentStatus === "Qualified" && job.applicationStatus === "Not applied yet" ? (
            <div className="flex items-center gap-3">
              <p
                className="text-[#666b78] text-[13px] leading-[19.5px]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Send your recruiter email to apply.
              </p>
              <a
                href="#"
                className="text-[#3c77f6] text-[14px] font-medium leading-[normal]"
                style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
              >
                Contact recruiter →
              </a>
            </div>
          ) : job.applicationStatus === "Not selected" ? (
            <>
              <p
                className="text-[#5a6172] text-[13px] leading-[19.5px]"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                {job.guidance}
              </p>
              <p
                className="text-[#8f99b5] text-[12px] leading-[19.5px] mt-0.5"
                style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
              >
                Your interview score and report remain available.
              </p>
            </>
          ) : (
            <p
              className="text-[#5a6172] text-[13px] leading-[19.5px]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              {job.guidance}
            </p>
          )}
          {job.isClosed && (
            <p
              className="text-[#5a6172] text-[13px] leading-[19.5px] mt-1"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              This role is closed. Your assessment report remains available.
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-start justify-between">
        <p
          className="text-[#5a6172] text-[13px] leading-[19.5px] mt-1"
          style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
        >
          {job.updatedLabel}
        </p>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex items-center gap-3">
            {job.actions.map((action) =>
              action.variant === "secondary" ? (
                <button
                  key={action.label}
                  onClick={() => onAction?.(action.label)}
                  className="bg-white border border-[#e1e4ea] text-[#1e232f] text-[14px] font-medium leading-5 px-3 py-2 rounded-xl hover:bg-[#f9fafb] transition-colors"
                  style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
                >
                  {action.label}
                </button>
              ) : (
                <button
                  key={action.label}
                  onClick={action.label === "Browse opportunities" ? onBrowse : () => onAction?.(action.label)}
                  className="bg-[#3c77f6] text-white text-[14px] font-medium leading-5 px-3 py-2 rounded-xl hover:bg-[#2d6ae0] transition-colors"
                  style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
                >
                  {action.label}
                </button>
              )
            )}
          </div>
          {job.creditInfo && (
            <p
              className="text-[#5a6172] text-[13px] leading-[19.5px]"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              {job.creditInfo}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function MyJobsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rows, setRows] = useState<LiveMyJob[] | null>(null);
  const [starting, setStarting] = useState<CareerApplication | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all: LiveMyJob[] = [];
      for (let page = 0; page < PAGE_LIMIT; page++) {
        const res = await listMyApplications(page);
        res.content.forEach((a) => all.push(toMyJob(a, all.length)));
        if (res.pageMeta.last || res.content.length === 0) break;
      }
      if (!cancelled) setRows(all);
    })().catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const act = (row: LiveMyJob, label: string) => {
    const jobPath = `/opportunities/job/${encodeURIComponent(row.career.jobId)}`;
    if (label === "View details") return row.career.jobStatus === "OPEN" ? navigate(jobPath) : undefined;
    if (label === "Start interview" || label === "Continue interview") return setStarting(row.career);
    if (label === "View report") return navigate(`${jobPath}/results`);
  };

  const filtered = (rows ?? []).filter((job) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!job.title.toLowerCase().includes(q) && !job.company.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (statusFilter === "in-progress") {
      return job.assessmentStatus === "In progress";
    }
    if (statusFilter === "not-applied") {
      return job.applicationStatus === "Not applied yet";
    }
    if (statusFilter === "applied") {
      return job.applicationStatus === "Applied";
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <button
        onClick={() => navigate("/opportunities")}
        className="text-[#3c77f6] text-[14px] leading-5 text-left w-fit"
        style={{ fontFamily: "'Inter:Medium', Inter, sans-serif", fontVariationSettings: '"wdth" 100' }}
      >
        ← Back
      </button>

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h1
            className="text-[#1e232f] text-[40px] font-semibold leading-10 tracking-[-1px]"
            style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
          >
            My Jobs
          </h1>
          <p
            className="text-[#5a6172] text-[16px] leading-6"
            style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
          >
            Track your assessments, applications, and next steps.
          </p>
        </div>
        <button
          onClick={() => navigate("/opportunities")}
          className="bg-white border border-[#e1e4ea] text-[#1e232f] text-[14px] font-medium leading-5 px-3 py-2 rounded-xl hover:bg-[#f9fafb] transition-colors mt-2"
          style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
        >
          Browse opportunities
        </button>
      </div>

      {/* Search + filters */}
      <div className="bg-white border border-[#e1e4ea] rounded-2xl px-5 py-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
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
          <button
            className="flex items-center gap-2 bg-white border border-[#e1e4ea] rounded-xl px-3.5 py-2.5 text-[14px] font-medium leading-5 text-[#1e232f] hover:bg-[#f9fafb] transition-colors whitespace-nowrap"
            style={{ fontFamily: "'Inter:Medium', Inter, sans-serif" }}
          >
            Recently updated
            <img src={imgChevronDown} alt="" className="w-4 h-4 shrink-0" />
          </button>
          <span
            className="text-[#1e232f] text-[14px] font-semibold leading-5 shrink-0"
            style={{ fontFamily: "'Inter:Semi_Bold', Inter, sans-serif" }}
          >
            {filtered.length} jobs
          </span>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-2">
          {(
            [
              { value: "all", label: "All" },
              { value: "in-progress", label: "In progress" },
              { value: "not-applied", label: "Not applied yet" },
              { value: "applied", label: "Applied" },
            ] as const
          ).map(({ value, label }) => {
            const isActive = statusFilter === value;
            return (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-2 rounded-xl text-[14px] leading-5 border transition-colors ${
                  isActive
                    ? "bg-[#3c77f6] text-white border-[#3c77f6] font-semibold"
                    : "bg-white text-[#5a6172] border-[#e1e4ea] font-medium hover:bg-[#f3f4f7]"
                }`}
                style={{ fontFamily: isActive ? "'Inter:Semi_Bold', Inter, sans-serif" : "'Inter:Medium', Inter, sans-serif" }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Job cards */}
      <div className="flex flex-col gap-4 pb-12">
        {filtered.map((job) => (
          <MyJobCard key={job.id} job={job} onBrowse={() => navigate("/opportunities")} onAction={(label) => act(job, label)} />
        ))}
        {filtered.length === 0 && (
          <div className="bg-white border border-[#e1e4ea] rounded-2xl px-6 py-12 text-center">
            <p
              className="text-[#5a6172] text-[14px] leading-5"
              style={{ fontFamily: "'Inter:Regular', Inter, sans-serif" }}
            >
              {!rows ? "Loading your jobs…" : "No jobs match this filter."}
            </p>
          </div>
        )}
      </div>
      {starting && <StartInterviewDialog app={starting} onClose={() => setStarting(null)} />}
    </div>
  );
}
