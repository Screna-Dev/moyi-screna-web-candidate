import type { CareerApplication, CareerJob } from "@/services/careersApi";
import { myJobs, opportunityJobs, type AssessmentStatus, type MyJob, type OpportunityJob } from "./mockJobs";

// Maps /careers/* data onto the design's data shapes (mockJobs.ts) so the
// original design renders unchanged. The backend is following the design, so
// anything the API doesn't return yet (applicant counts, tags, free spots,
// scores, qualification, location on applications…) is filled from the
// design's sample data, picked by position so a list looks like the design.
// Replace each fallback as the API grows. Before launch every sample value
// here must be gone, or real candidates will see made-up figures.

const WORKPLACE: Record<string, string> = { ON_SITE: "On-site", HYBRID: "Hybrid", REMOTE: "Remote" };
const SENIORITY: Record<string, string> = {
  INTERNSHIP: "Internship",
  JUNIOR: "Junior",
  INTERMEDIATE: "Mid-level",
  SENIOR: "Senior",
  STAFF: "Staff",
  LEAD: "Lead",
};

export const initialsOf = (name: string) => name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "—";

function dateLabel(iso: string | null, tz?: string | null) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz || undefined }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
  }
}

export const seniorityLabel = (s: string | null) => (s ? SENIORITY[s] ?? s : "");
export const workplaceLabel = (w: string | null) => (w ? WORKPLACE[w] ?? w : "");

// Interview cost line in the design's wording.
export function costLabel(payer: CareerJob["interviewPayer"], minutes: number) {
  return payer === "EMPLOYER" ? `1 credit/min · Up to ${minutes} minutes` : `${minutes} credits · ~${minutes} minutes`;
}

export type LiveOpportunityJob = OpportunityJob & { career: CareerJob };

export function toOpportunityJob(job: CareerJob, index: number): LiveOpportunityJob {
  const sample = opportunityJobs[index % opportunityJobs.length];
  const employerPays = job.interviewPayer === "EMPLOYER";
  return {
    ...sample,
    id: job.jobId,
    initials: initialsOf(job.companyName),
    company: job.companyName,
    title: job.title,
    // Employer-published jobs are the design's "Partner Jobs": the employer
    // runs the interview and can unlock the report.
    jobType: "Partner Job",
    location: job.location ?? sample.location,
    workType: workplaceLabel(job.workplaceType) || sample.workType,
    level: seniorityLabel(job.seniority) || sample.level,
    salaryMin: job.salaryMin ?? sample.salaryMin,
    salaryMax: job.salaryMax ?? sample.salaryMax,
    description: job.summary ?? sample.description,
    // sample: tags, applicationCount, applicationMax
    sponsorInfo: employerPays ? "First interview sponsored by recruiter" : "Self-funded interview",
    spotsUsed: undefined,
    spotsTotal: undefined,
    spotsRemaining: undefined,
    closingDate: job.closesAt ?? sample.closingDate,
    closingDateLabel: job.closesAt ? `Closes ${dateLabel(job.closesAt, job.timezone)}` : sample.closingDateLabel,
    postedDate: job.publishedAt ?? sample.postedDate,
    interviewCost: employerPays ? 0 : job.interviewDurationMinutes,
    interviewCostLabel: costLabel(job.interviewPayer, job.interviewDurationMinutes),
    primaryAction: "Quick interview",
    scoreValue: undefined,
    scoreStatus: undefined,
    career: job,
  };
}

export type LiveMyJob = MyJob & { career: CareerApplication };

function updatedLabel(iso: string | null) {
  if (!iso) return "Updated Today";
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString() ? "Updated Today" : `Updated ${dateLabel(iso)}`;
}

export function toMyJob(app: CareerApplication, index: number): LiveMyJob {
  const sample = myJobs[index % myJobs.length];
  const closed = app.jobStatus !== "OPEN";
  const done = app.interviewStatus === "COMPLETED";
  // Scores and qualification aren't returned to candidates yet: sample values.
  const sampleResult: AssessmentStatus = sample.assessmentStatus === "Not yet qualified" ? "Not yet qualified" : "Qualified";
  const assessmentStatus: AssessmentStatus = done ? sampleResult : app.interviewStatus === "IN_PROGRESS" ? "In progress" : "Not started";
  const actions: MyJob["actions"] = done
    ? [
        { label: "View report", variant: "secondary" },
        { label: "Retake interview", variant: "primary" },
      ]
    : app.canStartInterview
      ? [
          ...(closed ? [] : [{ label: "View details", variant: "secondary" as const }]),
          { label: app.interviewStatus === "IN_PROGRESS" ? "Continue interview" : "Start interview", variant: "primary" as const },
        ]
      : [{ label: "Browse opportunities", variant: "primary" }];
  return {
    ...sample,
    id: app.applicationId,
    initials: initialsOf(app.companyName),
    company: app.companyName,
    title: app.jobTitle,
    location: sample.location, // sample: applications don't carry the job's location
    jobType: closed ? "Job closed" : "Partner Job",
    isClosed: closed,
    assessmentStatus,
    applicationStatus: "Applied",
    bestScore: done ? sample.bestScore ?? 84 : null,
    guidance: done && sampleResult === "Qualified" ? "" : closed ? "This role is closed." : "",
    updatedLabel: updatedLabel(app.interviewCompletedAt ?? app.appliedAt),
    actions,
    creditInfo: !done && app.canStartInterview && app.interviewPayer === "CANDIDATE" ? `${app.interviewDurationMinutes} credits · up to ${app.interviewDurationMinutes} minutes` : done ? sample.creditInfo : undefined,
    career: app,
  };
}
