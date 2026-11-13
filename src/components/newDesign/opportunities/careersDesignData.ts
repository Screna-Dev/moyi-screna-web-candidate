import { fundingOf, type CareerApplication, type CareerJob, type CareerResultStanding, type StandingStatus } from "@/services/careersApi";
import { isBeingScored } from "./careersEnded";
import { type AssessmentStatus, type MyJob, type OpportunityJob } from "./mockJobs";

// Maps /careers/* data onto the design's data shapes (mockJobs.ts) so the
// original design renders unchanged. No sample values: where the API has no
// value the field is empty and the page hides it (backend 11-12, "before
// launch" item 1). Real candidates must never see made-up figures.

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
export const workplaceLabel = (w: string | null | undefined) => (w ? WORKPLACE[w] ?? w : "");

// "5+ years", "3–5 years", "Up to 2 years"; "" when neither bound is set.
export function yearsLabel(min?: number | null, max?: number | null) {
  if (min != null && max != null) return min === max ? `${min} years` : `${min}–${max} years`;
  if (min != null) return `${min}+ years`;
  if (max != null) return `Up to ${max} years`;
  return "";
}

// The design's "Senior (5+ years)".
export function levelLabel(seniority: string | null, min?: number | null, max?: number | null) {
  const level = seniorityLabel(seniority);
  const years = yearsLabel(min, max);
  return level && years ? `${level} (${years})` : level || years;
}

// "4h 32m left to start" until the retake window ends; "" when there's no
// deadline or it has passed.
export function leftToStartLabel(deadline: string | null | undefined, now = Date.now()) {
  if (!deadline) return "";
  const mins = Math.floor((new Date(deadline).getTime() - now) / 60000);
  if (!(mins > 0)) return "";
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const parts = d ? [`${d}d`, `${h}h`] : h ? [`${h}h`, `${m}m`] : [`${m}m`];
  return `${parts.join(" ")} left to start`;
}

const SALARY_PERIOD: Record<string, string> = { YEAR: "/yr", MONTH: "/mo", WEEK: "/wk", DAY: "/day", HOUR: "/hr" };

// "$150,000 – $200,000/yr", "From $90,000/yr", "Up to $40/hr"; "" when the
// employer hides pay (never a made-up range).
export function salaryRangeLabel(job: Pick<CareerJob, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod">) {
  const { salaryMin: min, salaryMax: max } = job;
  if (min == null && max == null) return "";
  let money: Intl.NumberFormat;
  try {
    money = new Intl.NumberFormat("en-US", { style: "currency", currency: job.salaryCurrency || "USD", maximumFractionDigits: 0 });
  } catch {
    money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }
  const period = SALARY_PERIOD[job.salaryPeriod ?? "YEAR"] ?? "";
  if (min != null && max != null) return min === max ? `${money.format(min)}${period}` : `${money.format(min)} – ${money.format(max)}${period}`;
  return min != null ? `From ${money.format(min)}${period}` : `Up to ${money.format(max!)}${period}`;
}

// Interview cost line in the design's wording. A candidate-paid interview uses
// 1 interview from the candidate's quota (change C9), not credits.
export function costLabel(payer: CareerJob["interviewPayer"], minutes: number) {
  return payer === "EMPLOYER" ? `Sponsored · Up to ${minutes} minutes` : `1 interview · ~${minutes} minutes`;
}

export type LiveOpportunityJob = OpportunityJob & { career: CareerJob };

export function toOpportunityJob(job: CareerJob): LiveOpportunityJob {
  const my = job.myApplication ?? null;
  // Who pays now: an employer-sponsored job whose sponsorship ran out is
  // candidate-paid (interviewFunding), even though interviewPayer says EMPLOYER.
  // Applied (#320): the application's interviewFunding, which covers retakes.
  // Before #320 is deployed: once interviewed, the next one is a retake and
  // always the candidate's; other applied rows fall back to the job's.
  const bestScore = my ? my.bestScore ?? job.myBestScore ?? null : job.myBestScore ?? null;
  const scored = bestScore != null;
  const done = my ? my.interviewStatus === "COMPLETED" : scored;
  const funding = my ? my.interviewFunding ?? (done ? "CANDIDATE" : fundingOf(job)) : job.applied && scored ? "CANDIDATE" : fundingOf(job);
  const employerPays = funding === "EMPLOYER";
  // "4h 32m left to start": only a completed application with a retake open.
  // (During a retake in progress retakeAvailability can also read AVAILABLE.)
  const left = my && done && my.retakeAvailability === "AVAILABLE" ? leftToStartLabel(my.retakeDeadline) : "";
  const live = my?.interviewStatus === "IN_PROGRESS" && !isBeingScored(my);
  // Who pays is shown only when an interview can start now.
  const costLine = my && !my.canStartInterview ? "" : [costLabel(funding, job.interviewDurationMinutes), left].filter(Boolean).join("\n");
  return {
    id: job.jobId,
    initials: initialsOf(job.companyName),
    company: job.companyName,
    title: job.title,
    // Employer-published jobs are the design's "Partner Jobs": the employer
    // runs the interview and can unlock the report.
    jobType: "Partner Job",
    location: job.location ?? "",
    workType: workplaceLabel(job.workplaceType),
    level: levelLabel(job.seniority, job.yearsExperienceMin, job.yearsExperienceMax),
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    description: job.summary ?? "",
    tags: job.skills ?? [],
    // Applicant count / cap and free spots: not shown to candidates (11-12).
    sponsorInfo: employerPays ? "First interview sponsored by recruiter" : "Self-funded interview",
    spotsUsed: undefined,
    spotsTotal: undefined,
    spotsRemaining: undefined,
    closingDate: job.closesAt ?? "",
    closingDateLabel: job.closesAt ? `Closes ${dateLabel(job.closesAt, job.timezone)}` : "",
    postedDate: job.publishedAt ?? "",
    interviewCost: employerPays ? 0 : 1, // interviews; sorts sponsored first
    interviewCostLabel: costLine,
    // Already interviewed: the design's retake state. If a retake isn't
    // allowed, starting one says why.
    primaryAction: live ? "Continue interview" : done ? "Retake interview" : "Quick interview",
    scoreValue: scored ? `${bestScore}/100` : undefined,
    scoreStatus: undefined, // qualification is never returned to candidates
    // The result 409s while a retake is in progress: report only when COMPLETED.
    reportAvailable: my ? done : undefined,
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

export function toMyJob(app: CareerApplication): LiveMyJob {
  const closed = app.jobStatus !== "OPEN";
  const done = app.interviewStatus === "COMPLETED";
  // Ended in this browser and still being scored: nothing to continue.
  const scoring = isBeingScored(app);
  // Retake offered (and the countdown shown) only while one can start now.
  const retake = done && app.canStartInterview && (app.retakeAvailability ?? "AVAILABLE") === "AVAILABLE";
  const left = leftToStartLabel(app.retakeDeadline);
  // Qualification is never returned to candidates (and Qualified belongs to
  // the Screna Sponsored flow, not in this release): a finished interview is
  // just "Completed".
  const assessmentStatus: AssessmentStatus = done ? "Completed" : app.interviewStatus === "IN_PROGRESS" ? "In progress" : "Not started";
  const actions: MyJob["actions"] = done
    ? [
        { label: "View report", variant: "secondary" },
        ...(retake ? [{ label: "Retake interview", variant: "primary" as const }] : []),
      ]
    : scoring
      ? [{ label: closed ? "Browse opportunities" : "View details", variant: closed ? ("primary" as const) : ("secondary" as const) }]
      : app.canStartInterview
      ? [
          ...(closed ? [] : [{ label: "View details", variant: "secondary" as const }]),
          { label: app.interviewStatus === "IN_PROGRESS" ? "Continue interview" : "Start interview", variant: "primary" as const },
        ]
      : [{ label: "Browse opportunities", variant: "primary" }];
  return {
    id: app.applicationId,
    initials: initialsOf(app.companyName),
    company: app.companyName,
    title: app.jobTitle,
    location: [app.location, workplaceLabel(app.workplaceType)].filter(Boolean).join(" · "),
    jobType: closed ? "Job closed" : "Partner Job",
    isClosed: closed,
    assessmentStatus,
    applicationStatus: app.hiringDecision === "REJECTED" ? "Not selected" : "Applied",
    bestScore: app.bestScore ?? null,
    guidance: scoring
      ? "We're scoring your interview. This updates by itself when your result is ready."
      : closed ? "This role is closed." : "",
    updatedLabel: updatedLabel(app.interviewCompletedAt ?? app.appliedAt),
    actions,
    // Retakes are always candidate-paid.
    creditInfo: retake
      ? ["1 interview", left].filter(Boolean).join(" · ")
      : !done && !scoring && app.canStartInterview && fundingOf(app) === "CANDIDATE"
        ? `1 interview · up to ${app.interviewDurationMinutes} minutes`
        : undefined,
    career: app,
  };
}

// What to tell the candidate after a start / rejoin answered 409 INVALID_STATE,
// from the reloaded application (don't retry).
export function applicationStateMessage(a: CareerApplication) {
  if (a.interviewStatus === "COMPLETED") {
    return a.retakeAvailability === "AVAILABLE" && a.canStartInterview
      ? "Your interview is complete. You can start a retake from My Jobs."
      : retakeBlockedMessage(a);
  }
  if (a.interviewStatus === "IN_PROGRESS") return "Your interview is already in progress. Reopen it from My Jobs.";
  if (a.jobStatus !== "OPEN" || !a.canStartInterview) return "This role is no longer accepting interviews.";
  return "This interview can't start right now. Please try again in a moment.";
}

// Why a completed application can't start a retake, from retakeAvailability.
export function retakeBlockedMessage(a: CareerApplication) {
  switch (a.retakeAvailability) {
    case "DECIDED":
      return "The recruiter has already made a decision on this application, so retakes are closed.";
    case "WINDOW_CLOSED":
      return "The time to retake this interview has ended.";
    case "LIMIT_REACHED":
      return "You've used all retakes for this role.";
    default:
      return "You've already completed the interview for this role. The recruiter will review it.";
  }
}

// Third score tile (backend #312, rules decided 11-09; standingStatus #324).
// - Pro / Pro 90-day: rank of rankedCandidates.
// - Free: topPercent (10 / 25 / 50; null in the lower half) + pointsBehindTop5
//   (null within the top 5). All four null = in the top 5 but not the top
//   half (small jobs). pointsBehindTop5 0 = tied with #5, who first completed
//   earlier: never "0 pts behind".
// - standing null: standingStatus says why. TOO_FEW_CANDIDATES: refreshing
//   won't change it. PENDING: a new best not ranked yet (the page polls; after
//   the limit, gaveUp → "updates soon"). Missing (before #324): neutral
//   "refresh in a moment", never "too few candidates".
export function standingTile(st: CareerResultStanding | null | undefined, status?: StandingStatus, gaveUp = false) {
  const sub = "Candidates with completed assessments";
  if (!st) {
    const why =
      status === "TOO_FEW_CANDIDATES"
        ? "Your ranking appears once more candidates finish their interviews."
        : status === "PENDING"
          ? gaveUp
            ? "Your ranking updates soon."
            : "Updating your ranking…"
          : "Your ranking isn't available yet. Refresh in a moment.";
    return { label: "CURRENT RANK", value: "—", sub: why };
  }
  if (st.rank != null) return { label: "CURRENT RANK", value: `#${st.rank}${st.rankedCandidates != null ? ` of ${st.rankedCandidates}` : ""}`, sub };
  const behind =
    st.pointsBehindTop5 == null
      ? "You're in the top 5"
      : st.pointsBehindTop5 === 0
        ? "Tied with #5 — they completed their first interview earlier"
        : `${st.pointsBehindTop5} pts behind the top 5`;
  if (st.topPercent != null) return { label: "CURRENT STANDING", value: `Top ${st.topPercent}%`, sub: behind };
  if (st.pointsBehindTop5 == null) return { label: "CURRENT STANDING", value: "Top 5", sub: behind };
  return { label: "CURRENT STANDING", value: st.pointsBehindTop5 === 0 ? "Tied #5" : `${st.pointsBehindTop5} pts`, sub: st.pointsBehindTop5 === 0 ? behind : "behind the top 5" };
}
