import axios from 'axios';
import API from './api';

// Candidate side of employer hiring: browse jobs employers published, apply,
// take the job's AI interview. Not the scraped-jobs search (/jobs/search) used
// for mock interviews.
//
// - Only OPEN jobs are visible; anything else 404s (an application keeps
//   showing its job's status after the job closes).
// - Applying snapshots the resume currently on the profile; none → 400
//   RESUME_REQUIRED. Applying twice returns the same application.
// - One completed interview per application. Unfinished attempts (dropped,
//   AI failure, never spoke) don't count. Calling start again while one is in
//   progress rejoins it (resumed: true) without charging again.
// - interviewPayer is the employer's setting; who actually pays is
//   interviewFunding (job detail, application). An EMPLOYER-sponsored job can
//   run out (limit reached or no employer credits): funding turns CANDIDATE,
//   and start returns 409 SELF_PAY_CONFIRMATION_REQUIRED until the candidate
//   agrees (acceptSelfPay: true). Candidate-paid (change C9, #298): start
//   holds 1 interview from the candidate's quota (GET /payments/interview-quota),
//   never credits; it's used once the interview has a result, and given back if
//   it never really ran. None left → 403 INSUFFICIENT_INTERVIEW_QUOTA
//   {plan, available: 0, resetsAt?}. Voice or video makes no difference.
//   The public page has no interviewFunding: never promise a free interview there.
// - A job auto-closed when sponsorship ran out (closeReason
//   SPONSORSHIP_EXHAUSTED) takes no new applications, but existing applicants
//   can still start (canStartInterview stays true).
// - Results are async: after /end, poll the application until
//   interviewStatus = COMPLETED. Candidates never see scores or reports (v1).
// - Show "start interview" from canStartInterview, never from the status.

export type WorkplaceType = 'ON_SITE' | 'HYBRID' | 'REMOTE';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'TEMPORARY';
export type SalaryPeriod = 'YEAR' | 'MONTH' | 'WEEK' | 'DAY' | 'HOUR';
export type InterviewPayer = 'EMPLOYER' | 'CANDIDATE';
export type InterviewStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type HiringDecision = 'AWAITING' | 'MOVED_FORWARD' | 'REJECTED';

export type PageMeta = { pageNumber: number; pageSize: number; totalElements: number; totalPages: number; first: boolean; last: boolean };
export type Page<T> = { content: T[]; pageMeta: PageMeta };

export type CareerJob = {
  jobId: string;
  title: string;
  companyName: string;
  companyLogoUrl: string | null;
  location: string | null;
  workplaceType: WorkplaceType | null;
  employmentType: EmploymentType | null;
  seniority: string | null;
  role: string | null;
  salaryMin: number | null; // all salary fields null when the employer hides pay
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod | null;
  summary: string | null;
  closesAt: string | null;
  timezone: string | null;
  publishedAt: string | null;
  interviewDurationMinutes: number;
  interviewPayer: InterviewPayer;
  applied: boolean;
};

// Same shape as the employer's preview of the job. No question text.
export type CareerPosting = {
  jobId: string;
  status: string;
  company: {
    name: string;
    logoUrl: string | null;
    website: string | null;
    linkedinUrl: string | null;
    industry: string | null;
    companySize: string | null;
    headquarters: string | null;
    headline: string | null;
    description: string | null;
    workplaceTags: string[];
  };
  title: string;
  department: string | null;
  employmentType: EmploymentType | null;
  workplaceType: WorkplaceType | null;
  location: string | null;
  seniority: string | null;
  role: string | null;
  yearsExperienceMin: number | null;
  yearsExperienceMax: number | null;
  skills: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod | null;
  summary: string | null;
  roleOverview: string | null;
  responsibilities: string[];
  requirements: string[];
  preferredQualifications: string[];
  benefits: string[];
  opensAt: string | null;
  closesAt: string | null;
  timezone: string | null;
  interview: {
    durationMinutes: number;
    language: string;
    questionCount: number;
    interviewPayer: InterviewPayer;
    candidateInstructions: string | null;
  };
  screeningCriteria: string[]; // hard requirements confirmed during the interview
};

export type CareerApplication = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyLogoUrl: string | null;
  jobStatus: string; // the job may have closed since
  closesAt: string | null;
  timezone: string | null;
  appliedAt: string;
  interviewStatus: InterviewStatus;
  interviewCompletedAt: string | null;
  interviewDurationMinutes: number;
  interviewLanguage: string;
  questionCount: number;
  hiringDecision?: HiringDecision; // AWAITING until the recruiter decides
  interviewPayer: InterviewPayer; // the employer's setting
  // Not started: who would pay if it started now. In progress / completed:
  // who paid. Optional only until backend #297 is live.
  interviewFunding?: InterviewPayer;
  canStartInterview: boolean;
};

export type CareerJobDetail = {
  posting: CareerPosting;
  interviewFunding?: InterviewPayer; // who pays if an interview starts now (#297)
  myApplication: CareerApplication | null;
};

// Who pays: interviewFunding when the backend sends it, else the employer's setting.
export const fundingOf = (x: { interviewFunding?: InterviewPayer; interviewPayer: InterviewPayer }) => x.interviewFunding ?? x.interviewPayer;

// Credentials for the live interview room (same room service as mock interviews).
export type CareerInterviewSession = {
  assessmentId: string;
  sessionId: string;
  url: string;
  token: string;
  roomName: string;
  maxInterviewDuration: number | null; // minutes; null when rejoining
  resumed: boolean;
};

const data = <T>(res: { data: unknown }) => ((res.data as { data?: unknown })?.data ?? res.data) as T;
const enc = encodeURIComponent;

export type CareerJobFilters = { q?: string; role?: string; workplaceType?: WorkplaceType; employmentType?: EmploymentType; page: number };

// Newest first, 10 per page, page is 0-based.
export async function listCareerJobs(filters: CareerJobFilters): Promise<Page<CareerJob>> {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''));
  return data(await API.get('/careers/jobs', { params }));
}

export async function getCareerJob(jobId: string): Promise<CareerJobDetail> {
  return data(await API.get(`/careers/jobs/${enc(jobId)}`));
}

export async function applyToJob(jobId: string): Promise<CareerApplication> {
  return data(await API.post(`/careers/jobs/${enc(jobId)}/apply`));
}

// Most recent activity first.
export async function listMyApplications(page: number): Promise<Page<CareerApplication>> {
  return data(await API.get('/careers/applications', { params: { page } }));
}

export async function getMyApplication(applicationId: string): Promise<CareerApplication> {
  return data(await API.get(`/careers/applications/${enc(applicationId)}`));
}

// Starts the interview, or rejoins the one in progress.
// - acceptSelfPay: the candidate agreed to use one of their own interviews
//   after the employer's sponsorship ran out; valid for this start only.
//   Without it that case is 409 SELF_PAY_CONFIRMATION_REQUIRED
//   {interviewsRequired, interviewsAvailable}: nothing held, no interview created.
// - consentVersion (#304): the candidate agreed to the authorization page of
//   that version; sent as consentAccepted: true + consentVersion on EVERY call
//   once agreed, rejoins included, since the client can't tell whether the
//   backend resumes or opens a new interview (it does the latter when the last
//   start got stuck). Once the backend makes it required, a new interview
//   without it is 400 INTERVIEW_CONSENT_REQUIRED (nothing started or used).
// (audioOnly was dropped in #298.)
export async function startCareerInterview(
  applicationId: string,
  opts: { acceptSelfPay?: boolean; consentVersion?: string } = {},
): Promise<CareerInterviewSession> {
  const body = {
    acceptSelfPay: !!opts.acceptSelfPay,
    ...(opts.consentVersion ? { consentAccepted: true, consentVersion: opts.consentVersion } : {}),
  };
  return data(await API.post(`/careers/applications/${enc(applicationId)}/interview`, body));
}

export type SelfPayConfirmation = { interviewsRequired: number; interviewsAvailable: number };
export type QuotaShortage = { plan: 'FREE' | 'PRO' | 'PRO_90_DAY'; available: number; resetsAt?: string | null };

// The `data` of an error envelope (409 SELF_PAY_CONFIRMATION_REQUIRED, 403 INSUFFICIENT_INTERVIEW_QUOTA).
export function careersErrorData<T>(err: unknown): T | undefined {
  if (!axios.isAxiosError(err)) return undefined;
  return ((err.response?.data as { data?: T } | undefined)?.data ?? undefined) as T | undefined;
}

// The candidate's own result (#303, ADR-022: score and analysis, no rank).
// Only once interviewStatus is COMPLETED (else 409 INVALID_STATE); someone
// else's or a missing application → 404. Still readable after the job closes.
// No rank, qualification, per-question content, recording or resume. With
// retakes it shows the highest-scoring attempt. The candidate also gets an
// email when it's ready; nothing to do here for that.
export type CareerInterviewResult = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  interviewCompletedAt: string;
  overallScore: number; // 0–100
  criteria: { name: string; score: number }[]; // job order; unscored ones left out
  summary: string | null;
  strengths: string[];
  areasToStrengthen: string[];
};

export async function getMyInterviewResult(applicationId: string): Promise<CareerInterviewResult> {
  return data(await API.get(`/careers/applications/${enc(applicationId)}/result`));
}

export async function endCareerInterview(applicationId: string): Promise<void> {
  await API.post(`/careers/applications/${enc(applicationId)}/interview/end`);
}

export function careersErrorCode(err: unknown): string {
  if (!axios.isAxiosError(err)) return '';
  const d = err.response?.data as { errorCode?: string } | undefined;
  return d?.errorCode ?? '';
}

export function careersErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err)) return err instanceof Error ? err.message : '';
  return (err.response?.data as { message?: string } | undefined)?.message ?? '';
}
