import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { clearEmployerSession, getEmployerSession, saveEmployerSession } from './employerAuth';

// Authenticated client for /employer/* endpoints. Separate from the candidate
// `API` instance (src/services/api.js) on purpose: it reads the employer
// session's tokens and, when the session can't be refreshed, sends the user to
// /employer/login rather than the candidate /auth page.
//
// Refresh uses the shared POST /auth/refresh-token { userId, refreshToken }.
// userId is the access token's `sub`; refresh tokens are not rotated, so only
// the access token is replaced (same contract as candidates).

const employerApi = axios.create({ baseURL: '/api/v1', withCredentials: true });

function subOf(token: string): string | null {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(atob(b64)) as { sub?: unknown };
    return typeof p.sub === 'string' ? p.sub : null;
  } catch {
    return null;
  }
}

let refreshing: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (refreshing) return refreshing;
  const session = getEmployerSession();
  const userId = session ? subOf(session.accessToken) : null;
  if (!session?.refreshToken || !userId) return Promise.reject(new Error('No employer refresh token'));
  refreshing = axios
    .post(`${employerApi.defaults.baseURL}/auth/refresh-token`, { userId, refreshToken: session.refreshToken })
    .then((res) => {
      const token = (res.data?.data ?? res.data)?.accessToken as string | undefined;
      if (!token) throw new Error('No access token in refresh response');
      const latest = getEmployerSession();
      if (latest) saveEmployerSession({ ...latest, accessToken: token });
      return token;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function endSession() {
  clearEmployerSession();
  if (window.location.pathname !== '/employer/login') window.location.href = '/employer/login';
}

employerApi.interceptors.request.use((config) => {
  const token = getEmployerSession()?.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

employerApi.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    // 403 is "signed in but not allowed" — never a reason to refresh.
    if (error.response?.status !== 401 || !original || original._retried) return Promise.reject(error);
    original._retried = true;
    try {
      const token = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${token}`;
      return employerApi(original);
    } catch {
      endSession();
      return Promise.reject(error);
    }
  },
);

// --- Organization ------------------------------------------------------------

export type CompanySize = '1_10' | '11_50' | '51_200' | '201_500' | '501_1000' | '1001_PLUS';

export type WorkplaceTag = 'remote_friendly' | 'hybrid' | 'on_site' | 'flexible_hours' | 'early_stage_startup' | 'growth_stage_company';

// missingFields uses these DTO names, always in this order.
export type OrgField =
  | 'name'
  | 'logo'
  | 'website'
  | 'industry'
  | 'companySize'
  | 'headquarters'
  | 'description'
  | 'contactName'
  | 'contactEmail'
  | 'authorizedConfirmed';

export type OrgContact = { name: string; title: string; email: string; phone: string };

export type Organization = {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  linkedinUrl: string | null;
  industry: string | null;
  companySize: CompanySize | null;
  yearFounded: number | null;
  headquarters: string | null;
  headline: string | null;
  description: string | null;
  workplaceTags: WorkplaceTag[];
  contact: Partial<OrgContact> | null;
  authorizedConfirmed: boolean;
  completion: { percent: number; profileComplete: boolean; missingFields: OrgField[] };
  updatedAt: string;
};

// PUT body: the whole form every time (blank/null clears a field). Every
// field completion counts except the logo must be filled on every save, and
// authorizedConfirmed must be sent (false is allowed but blocks publishing).
// website must be on the sign-up email's company domain (subdomains and www.
// are fine) or the save fails with ORGANIZATION_WEBSITE_DOMAIN_MISMATCH, whose
// message names the expected domain. The logo is not part of it — see
// uploadOrganizationLogo.
export type OrganizationForm = {
  name: string;
  website: string | null;
  linkedinUrl: string | null;
  industry: string | null;
  companySize: CompanySize | null;
  yearFounded: number | null;
  headquarters: string | null;
  headline: string | null;
  description: string | null;
  workplaceTags: WorkplaceTag[];
  contact: OrgContact;
  authorizedConfirmed: boolean;
};

const unwrap = (res: { data: unknown }) => ((res.data as { data?: unknown })?.data ?? res.data) as Organization;

export async function getOrganization(): Promise<Organization> {
  return unwrap(await employerApi.get('/employer/organization'));
}

export async function saveOrganization(form: OrganizationForm): Promise<Organization> {
  return unwrap(await employerApi.put('/employer/organization', form));
}

export async function uploadOrganizationLogo(file: File): Promise<Organization> {
  const body = new FormData();
  body.append('file', file);
  return unwrap(await employerApi.post('/employer/organization/logo', body));
}

export const ORGANIZATION_NOT_FOUND = 'ORGANIZATION_NOT_FOUND';
export const ORGANIZATION_WEBSITE_DOMAIN_MISMATCH = 'ORGANIZATION_WEBSITE_DOMAIN_MISMATCH';
// 409: another tab's save or a logo upload changed the profile mid-request.
// Ask the user to refresh; never replay automatically.
export const CONFLICT = 'CONFLICT';

// --- Credits -----------------------------------------------------------------

// Spendable balances: balance minus credits held for interviews in progress.
// Interview credits pay for publishing (1 per job); report credits unlock reports.
export type CreditBalances = { interview: number; report: number };

export async function getCredits(): Promise<CreditBalances> {
  const d = ((await employerApi.get('/employer/credits')).data?.data ?? {}) as Partial<CreditBalances>;
  return { interview: d.interview ?? 0, report: d.report ?? 0 };
}

// --- Dashboard (#326) ---------------------------------------------------------
// Counts over every job of the org. Days and the 30-day periods follow
// `timezone` (IANA; UTC when missing). daily: 90 entries, oldest first, today
// last. recentCandidatesJobId: the open job with the most recently completed
// interview (show its top candidates from the board list), null when none.

export type EmployerDashboardDay = { date: string; applicationCount: number; interviewCount: number; reportUnlockCount: number };

export type EmployerDashboardData = {
  jobs: { openCount: number; scheduledCount: number; draftCount: number; closedCount: number };
  applicants: { totalCount: number; last30DaysCount: number; prior30DaysCount: number };
  interviews: { completedCount: number; completedLast7DaysCount: number };
  unlockedReportCount: number;
  // consideringCount (#330): "Still considering", not part of pendingCount. Missing before #330.
  // pendingCount leaves out jobs Screna removed as FRAUD (#335).
  decisions: { pendingCount: number; movedForwardCount: number; rejectedCount: number; contactedCount: number; consideringCount?: number };
  daily: EmployerDashboardDay[];
  recentCandidatesJobId: string | null;
};

export async function getEmployerDashboard(timezone?: string | null): Promise<EmployerDashboardData> {
  return data(await employerApi.get('/employer/dashboard', { params: { timezone: timezone || undefined } }));
}

// --- Applications ------------------------------------------------------------

// Sidebar "N New" badge: candidates who completed an interview since the
// caller last opened each job's board, summed over OPEN/SCHEDULED/CLOSED jobs.
export async function getNewApplicationsCount(): Promise<number> {
  const res = await employerApi.get('/employer/applications/new-count');
  const total = ((res.data?.data ?? res.data) as { total?: unknown })?.total;
  return typeof total === 'number' ? total : 0;
}

// --- Jobs (create-job wizard + My Jobs) ---------------------------------------
// Every PUT is a full replace: send the whole form, unsent fields are cleared
// (screeningCriteria is the exception: omitted = unchanged). Only DRAFT jobs
// can be edited, deleted, sent to AI or publish-checked (else 409 INVALID_STATE).
// After publishing, only the posting text (PUT posting) and the window
// (PUT window) can change. All times are ISO-8601 UTC; timezone is IANA.

export type ApiJobStatus = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED';
export type ApiEmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'TEMPORARY';
export type ApiWorkplaceType = 'ON_SITE' | 'HYBRID' | 'REMOTE';
export type ApiSalaryPeriod = 'YEAR' | 'MONTH' | 'WEEK' | 'DAY' | 'HOUR';
export type InterviewPayer = 'EMPLOYER' | 'CANDIDATE';
export type ContentSource = 'AI' | 'MANUAL';

// Step 1 body (POST /employer/jobs, PUT details, PUT posting).
export type JobDetailsBody = {
  title: string;
  department: string | null;
  employmentType: ApiEmploymentType;
  workplaceType: ApiWorkplaceType;
  location: string;
  seniority: string | null;
  role: string | null;
  yearsExperienceMin: number | null;
  yearsExperienceMax: number | null;
  skills: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: ApiSalaryPeriod | null;
  showSalary: boolean;
  summary: string | null;
  roleOverview: string;
  responsibilities: string[];
  requirements: string[];
  preferredQualifications: string[];
  benefits: string[];
  opensAt: string | null; // null = opens when published
  closesAt: string;
  timezone: string;
  maxApplicants: number | null;
};

// Step 2 body. Who pays moved to PUT sponsorship (2026-10-29, #297): an
// interviewPayer sent here is ignored.
// durationMinutes / language (#305, ADR-013 / ADR-022 D-15): only 20 and "en"
// are accepted, and leaving them out means exactly that; anything else is 400.
// The wizard leaves them out.
export type InterviewSettings = {
  durationMinutes?: 20;
  language?: 'en';
  candidateInstructions: string | null;
  passScore: number | null;
};

// As read back: older jobs may still say 30 / 45 or another language, but every
// interview runs 20 minutes in English. Never base UI on these, never send them back.
export type ApiInterviewSettings = Omit<InterviewSettings, 'durationMinutes' | 'language'> & {
  durationMinutes: number;
  language: string;
  interviewPayer: InterviewPayer | null; // null until step 3 is saved
};

export type WhenLimitReached = 'KEEP_ACCEPTING' | 'CLOSE_JOB';

// Step 3 body. EMPLOYER needs maxSponsoredCandidates (≥ 1); whenLimitReached
// defaults to KEEP_ACCEPTING. CANDIDATE deletes a saved sponsorship.
export type SponsorshipBody = {
  interviewPayer: InterviewPayer | null;
  maxSponsoredCandidates?: number | null;
  whenLimitReached?: WhenLimitReached;
};

// "Used up" = maxSponsoredCandidates reached, or no Interview Credit left.
export type ApiSponsorship = {
  maxSponsoredCandidates: number;
  whenLimitReached: WhenLimitReached;
  sponsoredCount: number; // in progress + completed
};

export type ApiCriterion = { id: string; name: string; description: string | null; source: ContentSource };
export type ApiScreeningCriterion = { id: string; text: string };
export type ApiQuestion = {
  id: string;
  seq: number;
  text: string;
  estimatedMinutes: number | null;
  source: ContentSource;
  edited: boolean;
  criterionIds: string[];
  criterionNames: string[];
};

export type ApiJob = JobDetailsBody & {
  id: string;
  status: ApiJobStatus;
  applicantLimit?: number; // #332, see JobListItem
  wizardStep: 1 | 2 | 3 | 4; // furthest step reached; only grows
  interviewSettings: ApiInterviewSettings;
  sponsorship: ApiSponsorship | null; // EMPLOYER-paid jobs only
  criteria: ApiCriterion[];
  screeningCriteria: ApiScreeningCriterion[];
  questions: ApiQuestion[];
  assessmentAreas: string[];
  questionsReviewedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// Step 2: criteria, screening criteria and questions in one save. Items with
// an id update that row (renames keep the id); items without one are created.
// Saved items left out are deleted. Questions link criteria by NAME (trimmed,
// case-insensitive), so they can point at criteria created in the same call.
export type AssessmentBody = {
  criteria: { id?: string; name: string; description?: string | null; source?: ContentSource }[];
  screeningCriteria?: { id?: string; text: string }[];
  questions: {
    id?: string;
    text: string;
    estimatedMinutes?: number | null;
    criterionNames: string[];
    source?: ContentSource;
    edited?: boolean;
  }[];
  assessmentAreas?: string[];
};

const data = <T>(res: { data: unknown }) => ((res.data as { data?: unknown })?.data ?? res.data) as T;
const jobPath = (jobId: string) => `/employer/jobs/${encodeURIComponent(jobId)}`;

export async function createJob(body: JobDetailsBody): Promise<ApiJob> {
  return data(await employerApi.post('/employer/jobs', body));
}

export async function getJob(jobId: string): Promise<ApiJob> {
  return data(await employerApi.get(jobPath(jobId)));
}

export async function deleteJob(jobId: string): Promise<void> {
  await employerApi.delete(jobPath(jobId));
}

export async function saveJobDetails(jobId: string, body: JobDetailsBody): Promise<ApiJob> {
  return data(await employerApi.put(`${jobPath(jobId)}/details`, body));
}

export async function saveJobAssessment(jobId: string, body: AssessmentBody): Promise<ApiJob> {
  return data(await employerApi.put(`${jobPath(jobId)}/assessment`, body));
}

export async function saveInterviewSettings(jobId: string, body: InterviewSettings): Promise<ApiJob> {
  return data(await employerApi.put(`${jobPath(jobId)}/interview-settings`, body));
}

// Drafts: anything goes; sets wizardStep to 4. Published employer-paid jobs
// (#299): interviewPayer must stay EMPLOYER, the maximum can only go up, and
// whenLimitReached must be sent (omitted = KEEP_ACCEPTING); otherwise 409
// INVALID_STATE. It never reopens a closed job. Saving CLOSE_JOB on an open job
// whose sponsorship is already used up (limit reached or no Interview Credit)
// closes it at once: the response has status CLOSED.
export async function saveSponsorship(jobId: string, body: SponsorshipBody): Promise<ApiJob> {
  return data(await employerApi.put(`${jobPath(jobId)}/sponsorship`, body));
}

// --- AI suggestions: async tasks, never saved by the backend ------------------
// Criteria suggestions are currently canned on the backend (task id
// fake-criteria-<jobId>, SUCCEEDED on the first poll); treat them like real AI.

export type AiTaskKind = 'CRITERIA' | 'QUESTIONS';
export type AiTask = {
  taskId: string;
  kind: AiTaskKind;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  criteria: { name: string; description: string | null }[] | null;
  questions: { text: string; estimatedMinutes: number | null; criterionNames: string[] }[] | null;
  assessmentAreas: string[] | null;
  error: string | null;
};

const POLL_MS = 1500;
const POLL_LIMIT_MS = 120_000;

async function pollAiTask(jobId: string, taskId: string): Promise<AiTask> {
  const deadline = Date.now() + POLL_LIMIT_MS;
  for (;;) {
    const task = data<AiTask>(await employerApi.get(`${jobPath(jobId)}/ai/tasks/${encodeURIComponent(taskId)}`));
    if (task.status === 'SUCCEEDED') return task;
    if (task.status === 'FAILED') throw new Error(task.error || 'AI suggestion failed');
    if (Date.now() > deadline) throw new Error('AI suggestion timed out');
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

// Uses the SAVED job details, so save step 1 first.
export async function suggestCriteria(jobId: string): Promise<AiTask> {
  const { taskId } = data<{ taskId: string }>(await employerApi.post(`${jobPath(jobId)}/ai/criteria-suggestions`));
  return pollAiTask(jobId, taskId);
}

// Takes the criteria currently on the form (unsaved is fine). Duration and
// language come from the saved draft (20 min / en until step 3 is saved).
export async function suggestQuestions(jobId: string, criteria: { name: string; description?: string | null }[]): Promise<AiTask> {
  const { taskId } = data<{ taskId: string }>(await employerApi.post(`${jobPath(jobId)}/ai/question-suggestions`, { criteria }));
  return pollAiTask(jobId, taskId);
}

// --- JD autofill: async task, nothing is saved by the backend -----------------
// The employer pastes a whole job description on step 1; the AI reads the
// step 1 fields out of it. No draft is needed. prefill already passes step 1
// validation (lists cut to 30, long text truncated, an unacceptable salary or
// experience range nulled as a group). It has no department. location joins
// every parsed place with "; " (2026-11-10).
// 429 TOO_MANY_REQUESTS after 30 submissions per org per hour.

export type JdPrefill = {
  title: string | null;
  location?: string | null;
  employmentType: ApiEmploymentType | null;
  workplaceType: ApiWorkplaceType | null;
  seniority: string | null;
  role: string | null;
  yearsExperienceMin: number | null;
  yearsExperienceMax: number | null;
  skills: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: ApiSalaryPeriod | null;
  summary: string | null;
  roleOverview: string | null;
  responsibilities: string[];
  requirements: string[];
  preferredQualifications: string[];
  benefits: string[];
};

type JdParseTask = {
  taskId: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  error: string | null; // FAILED: a fixed employer-facing message
  prefill: JdPrefill | null; // SUCCEEDED only
};

export const JD_TEXT_MAX = 50_000;
const JD_POLL_MS = 2000;
const JD_POLL_LIMIT_MS = 60_000;

// title / location: what the form already has, so the AI doesn't guess them.
// Rejects on FAILED, timeout, 404 or 503 alike.
export async function parseJobDescription(body: { jdText: string; title?: string; location?: string }, signal?: AbortSignal): Promise<JdPrefill> {
  const { taskId } = data<{ taskId: string }>(await employerApi.post('/employer/jobs/jd-parse', body, { signal }));
  const deadline = Date.now() + JD_POLL_LIMIT_MS;
  // A repeat of an already parsed text may come back SUCCEEDED: GET it all the same.
  for (;;) {
    const task = data<JdParseTask>(await employerApi.get(`/employer/jobs/jd-parse/${encodeURIComponent(taskId)}`, { signal }));
    if (task.status === 'SUCCEEDED' && task.prefill) return task.prefill;
    if (task.status === 'FAILED') throw new Error(task.error || 'JD parse failed');
    if (Date.now() > deadline) throw new Error('JD parse timed out');
    await new Promise((r) => setTimeout(r, JD_POLL_MS));
    if (signal?.aborted) throw new Error('JD parse cancelled');
  }
}

// --- Preview / publish -------------------------------------------------------

export type PublishCheck = {
  ready: boolean;
  missing: string[]; // job fields, same values as JOB_NOT_READY
  profileComplete: boolean;
  profileMissingFields: OrgField[];
  interviewPayer: InterviewPayer | null;
  interviewCreditsAvailable: number;
  // EMPLOYER-sponsored with no Interview Credit: a warning, never a blocker.
  // What it means depends on sponsorship.whenLimitReached.
  sponsorshipUnfunded: boolean;
};

export type PublishResult = {
  jobId: string;
  title: string;
  status: 'OPEN' | 'SCHEDULED';
  opensAt: string;
  closesAt: string;
  timezone: string;
  publishedAt: string;
  alreadyPublished: boolean; // retry of a published job
};

export async function getPublishCheck(jobId: string): Promise<PublishCheck> {
  return data(await employerApi.get(`${jobPath(jobId)}/publish-check`));
}

// Free (since 2026-10-20) and safe to retry. Errors, in this order: 400
// JOB_NOT_READY {missing}, 400 ORGANIZATION_PROFILE_INCOMPLETE {missingFields}.
export async function publishJob(jobId: string): Promise<PublishResult> {
  return data(await employerApi.post(`${jobPath(jobId)}/publish`));
}

// Credits land asynchronously (Stripe webhook). Stripe returns to
// /employer/credits?checkout=success|cancelled&jobId=<id>.
export async function startCreditsCheckout(body: { creditType: 'EMPLOYER_INTERVIEW' | 'EMPLOYER_REPORT'; quantity: number; jobId?: string }): Promise<string> {
  return data<{ url: string }>(await employerApi.post('/employer/credits/checkout', body)).url;
}

// --- My Jobs -----------------------------------------------------------------

export type JobActions = {
  continueDraft: boolean;
  delete: boolean;
  editPosting: boolean;
  changeWindow: boolean;
  close: boolean; // also true for a job auto-closed when sponsorship ran out
  reopen: boolean;
  editSponsorship: boolean; // published employer-paid jobs (#299)
};

// ADMIN = Screna took the job down (#333): removalReason says why.
// APPLICANT_LIMIT_REACHED (#332): the last spot was taken; can't be reopened.
export type CloseReason = 'DEADLINE' | 'MANUAL' | 'SPONSORSHIP_EXHAUSTED' | 'APPLICANT_LIMIT_REACHED' | 'ADMIN';
// FRAUD also locks every candidate of the job (#335: 410 JOB_REMOVED).
export type RemovalReason = 'FRAUD' | 'POLICY' | 'OTHER';
// #336. ORGANIZATION: the member who pressed Publish (or the org's name when
// unknown / the account has no name). SCRENA: published by Screna ops for the
// org, name is always "Screna". null on drafts.
export type PostedBy = { type: 'ORGANIZATION' | 'SCRENA'; name: string };

export type JobListItem = {
  jobId: string;
  title: string;
  status: ApiJobStatus;
  wizardStep: 1 | 2 | 3 | 4;
  location: string | null;
  workplaceType: ApiWorkplaceType | null;
  opensAt: string | null;
  closesAt: string | null;
  closedAt: string | null;
  closeReason: CloseReason | null;
  removalReason?: RemovalReason | null; // set only when closeReason is ADMIN (#333)
  timezone: string | null;
  publishedAt: string | null;
  // #332: the effective cap, never null (the platform limit, or the employer's
  // lower maxApplicants). Missing before #332: fall back to the job's maxApplicants.
  applicantLimit?: number;
  postedBy?: PostedBy | null;
  applicationCount: number;
  completedCount: number;
  unlockedCount: number; // reports unlocked for this job (#326)
  updatedAt: string;
  actions: JobActions; // drive the buttons from this, not from status
};

export type JobListFilter = 'ALL' | 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type JobListSort = 'RECENTLY_UPDATED' | 'CLOSING_SOON';

export type JobList = {
  counts: { draft: number; active: number; closed: number; total: number }; // ignores q/status
  items: JobListItem[];
  pageMeta: { pageNumber: number; pageSize: number; totalElements: number; totalPages: number; first: boolean; last: boolean };
};

// 10 per page, fixed; page is 0-based.
export async function listJobs(params: { status: JobListFilter; q?: string; sort: JobListSort; page: number }): Promise<JobList> {
  return data(await employerApi.get('/employer/jobs', { params: { ...params, q: params.q || undefined } }));
}

// OPEN/SCHEDULED only. Same body as details; opensAt/closesAt are ignored
// (use updateJobWindow) but still cross-checked, so send the current values.
// #332: a maxApplicants at or below the applicants so far closes the job at
// once (status CLOSED, closeReason APPLICANT_LIMIT_REACHED).
export async function saveJobPosting(jobId: string, body: JobDetailsBody): Promise<ApiJob> {
  return data(await employerApi.put(`${jobPath(jobId)}/posting`, body));
}

// OPEN: moves the deadline. SCHEDULED: also moves opensAt. CLOSED: reopens
// (no credit charged). closesAt must be in the future.
export async function updateJobWindow(jobId: string, body: { opensAt: string | null; closesAt: string }): Promise<ApiJob> {
  return data(await employerApi.put(`${jobPath(jobId)}/window`, body));
}

// OPEN / SCHEDULED, or CLOSED with closeReason SPONSORSHIP_EXHAUSTED (#299) or
// APPLICANT_LIMIT_REACHED (#332): the reason becomes MANUAL and applicants who
// haven't started can no longer start. Otherwise 409 INVALID_STATE.
export async function closeJob(jobId: string): Promise<ApiJob> {
  return data(await employerApi.post(`${jobPath(jobId)}/close`));
}

// --- Applications / board / report / outreach ----------------------------------
// Backend guide: docs/frontend-employer-board-api.md. The org comes from the
// token. Other orgs' jobs and applications 404. Lists are 0-based pages of 10.
// Errors: 404 NOT_FOUND, 403 REPORT_LOCKED (not unlocked), 403
// INSUFFICIENT_CREDITS {required, available}, 409 INVALID_STATE.

export type Page<T> = { content: T[]; pageMeta: { pageNumber: number; pageSize: number; totalElements: number; totalPages: number; first: boolean; last: boolean } };

export type ApplicationsJobFilter = 'ALL' | 'ACTIVE' | 'CLOSED'; // ACTIVE = OPEN + SCHEDULED
export type ApplicationsJob = {
  jobId: string;
  title: string;
  location: string | null;
  workplaceType: ApiWorkplaceType | null;
  status: 'OPEN' | 'SCHEDULED' | 'CLOSED';
  opensAt: string | null;
  closesAt: string | null;
  closedAt: string | null;
  timezone: string | null;
  applicationCount: number;
  completedCount: number;
  unlockedCount: number;
  newCount: number; // completed since this user last opened the board
  updatedAt: string;
};
export type ApplicationsJobList = {
  counts: { active: number; closed: number; total: number }; // ignores q and status
  items: ApplicationsJob[];
  pageMeta: Page<unknown>['pageMeta'];
};

export async function listApplicationsJobs(params: { q?: string; status: ApplicationsJobFilter; sort: JobListSort; page: number }): Promise<ApplicationsJobList> {
  return data(await employerApi.get('/employer/applications/jobs', { params: { ...params, q: params.q?.trim() || undefined } }));
}

export type BoardSummary = {
  // removalReason FRAUD (#335): every row is "Candidate #N" and unlock /
  // report / resume / media / decision / outreach answer 410 JOB_REMOVED.
  job: {
    id: string;
    title: string;
    status: ApiJobStatus;
    closesAt: string | null;
    closedAt: string | null;
    timezone: string | null;
    closeReason?: CloseReason | null;
    removalReason?: RemovalReason | null;
  };
  rankingUpdatedAt: string | null;
  cards: {
    applications: number;
    notCompleted: number;
    interviewsCompleted: number;
    completedLast7Days: number;
    reportsUnlocked: number;
    reportCreditsRemaining: number;
    movedForward: number;
    movedForwardContacted: number;
    rejected: number;
    considering?: number; // #330
  };
  inProgressCount: number;
};

export async function getBoardSummary(jobId: string): Promise<BoardSummary> {
  return data(await employerApi.get(`${jobPath(jobId)}/board/summary`));
}

export type ReportStatus = 'LOCKED' | 'UNLOCKED';
// CONSIDERING (#330): "Still considering", no email, can still become either
// of the other two. MOVED_FORWARD / REJECTED are final and email the candidate.
export type HiringStatus = 'AWAITING' | 'CONSIDERING' | 'MOVED_FORWARD' | 'REJECTED';
export type CriterionScoreDto = { criterionId: string; name: string; score: number | null };

export type BoardCandidate = {
  applicationId: string;
  rank: number;
  movement: number | null; // rank at last visit − rank now: + up, − down, null = no snapshot
  isNew: boolean;
  candidate: { label: string; candidateNo: number; unlocked: boolean }; // locked: label "Candidate #117", no name
  latestInterview: { completedAt: string; durationMinutes: number | null };
  score: number;
  criteria: CriterionScoreDto[];
  weakestCriterion: { name: string; score: number } | null; // null when every criterion ≥ 80
  minCriterionScore: number | null;
  screening: { met: number; total: number }; // {0, 0} this release: AI doesn't assess screening
  reportStatus: ReportStatus;
  hiringStatus: HiringStatus;
};

export type CandidateFilters = {
  q?: string; // digits / "#digits": exact candidate number (finds locked); text: unlocked names only
  report: 'ALL' | 'UNLOCKED' | 'LOCKED';
  hiringStatus?: 'ALL' | HiringStatus;
  minScore?: number;
  maxScore?: number;
  page: number;
};

// Ranked, completed interviews only. Call board/visits only AFTER rendering
// this, or isNew and movement come back as "no change".
export async function listBoardCandidates(jobId: string, f: CandidateFilters): Promise<Page<BoardCandidate>> {
  const params = Object.fromEntries(Object.entries({ ...f, q: f.q?.trim() || undefined }).filter(([, v]) => v !== undefined && v !== ''));
  return data(await employerApi.get(`${jobPath(jobId)}/candidates`, { params }));
}

// Records "last visit" (rank snapshot for movement; resets the job's newCount).
export async function recordBoardVisit(jobId: string): Promise<void> {
  await employerApi.post(`${jobPath(jobId)}/board/visits`);
}

const appPath = (applicationId: string) => `/employer/applications/${encodeURIComponent(applicationId)}`;

// 1 Report Credit per (org, application). Idempotent: repeats don't charge.
// #330 (behind a backend switch): 409 FEEDBACK_REQUIRED {pending} while an
// earlier unlocked candidate of the SAME job has no decision yet. Nothing is
// charged; give feedback on every pending one, then retry. Only data.pending
// decides who: candidates unlocked before the switch don't block.
export type FeedbackPending = { applicationId: string; candidateNo: number };
export async function unlockApplication(applicationId: string): Promise<{ applicationId: string; unlocked: boolean; reportCreditsBalance: number }> {
  return data(await employerApi.post(`${appPath(applicationId)}/unlock`));
}

export type ContactStatus = 'NOT_CONTACTED' | 'CONTACTED';

export type ReportQuestion = {
  questionId: string | null; // only on older interviews
  seq: number; // interview order, AI follow-ups included
  text: string;
  score: number | null;
  summary: string | null;
  criteria: { criterionId: string; name: string }[];
  evidenceObserved: string | null;
  areasToProbe: string | null;
  answerText: string | null;
  gapAnalysis: string | null;
  hasTranscript: boolean;
  hasAudio: boolean;
  audioSeconds: number | null;
};

export type CandidateReport = {
  candidate: { name: string; email: string; initials: string };
  job: { id: string; title: string; companyName: string };
  reportStatus: ReportStatus;
  hiringStatus: HiringStatus;
  contactStatus: ContactStatus;
  interview: { assessmentId: string; completedAt: string; durationMinutes: number | null; language: string; questionCount: number };
  overallScore: number;
  rank: { position: number; outOf: number };
  screening: { met: number; total: number; items: { text: string; met: boolean; evidence: string | null }[] };
  criteria: (CriterionScoreDto & { evidence: string | null })[];
  questions: ReportQuestion[];
  strengths: string[];
  probeAreas: string[];
  resume: { fileName: string | null; available: boolean };
  applicationsStillOpen: boolean;
};

export async function getCandidateReport(applicationId: string): Promise<CandidateReport> {
  return data(await employerApi.get(`${appPath(applicationId)}/report`));
}

// Presigned links valid 15 minutes: fetch on demand, never cache.
export async function getResumeLink(applicationId: string): Promise<{ fileName: string | null; url: string | null; expiresAt: string | null }> {
  return data(await employerApi.get(`${appPath(applicationId)}/resume`));
}

export async function getQuestionMedia(
  applicationId: string,
  questionId: string,
): Promise<{ transcriptUrl: string | null; audioUrl: string | null; durationSeconds: number | null; expiresAt: string | null }> {
  return data(await employerApi.get(`${appPath(applicationId)}/questions/${encodeURIComponent(questionId)}/media`));
}

// #330. Returns the updated board row.
// - MOVED_FORWARD: emails the candidate; shareContact adds the org profile's
//   contact name + email (409 INVALID_STATE when the profile has no email).
// - REJECTED: emails the candidate with `reason` verbatim (50–100 words once
//   the backend switch is on).
// - CONSIDERING: no email; can later become either of the others.
// reason only with REJECTED and shareContact only with MOVED_FORWARD, else 400.
export type DecisionBody =
  | { decision: 'MOVED_FORWARD'; shareContact?: boolean }
  | { decision: 'REJECTED'; reason?: string }
  | { decision: 'CONSIDERING' };

export async function setHiringDecision(applicationId: string, body: DecisionBody): Promise<BoardCandidate> {
  return data(await employerApi.put(`${appPath(applicationId)}/decision`, body));
}

// Needs an unlocked, MOVED_FORWARD application (else 403 REPORT_LOCKED / 409).
// Screna never sends the email: open mailtoUrl, then mark-sent.
export type Outreach = {
  applicationId: string;
  status: 'DRAFT' | 'SENT';
  to: string;
  subject: string;
  body: string;
  isEdited: boolean;
  sentAt: string | null;
  contactStatus: ContactStatus;
  mailtoUrl: string; // RFC 6068; assign to window.location.href as is
};

export async function getOutreach(applicationId: string): Promise<Outreach> {
  return data(await employerApi.get(`${appPath(applicationId)}/outreach`));
}

export async function saveOutreach(applicationId: string, body: { subject: string; body: string }): Promise<Outreach> {
  return data(await employerApi.put(`${appPath(applicationId)}/outreach`, body));
}

export async function outreachAction(applicationId: string, action: 'reset' | 'mark-sent' | 'undo-sent'): Promise<Outreach> {
  return data(await employerApi.post(`${appPath(applicationId)}/outreach/${action}`));
}

// --- Suggested jobs (#334) ---------------------------------------------------
// Jobs from the job pool linked to the trial code the org signed up with. An
// org without one gets an empty list. suggestionId is a pool document id
// (e.g. linkedin-4471933982). Errors: 409 JOB_SUGGESTION_NOT_READY, 409
// INVALID_STATE, 503 JOB_POOL_UNAVAILABLE, 403 ORGANIZATION_SEAT_INACTIVE.
// Once a suggestion becomes a job it leaves the list (it comes back only if
// that draft is deleted).

export type SuggestionStatus = 'NOT_PREPARED' | 'PREPARING' | 'READY' | 'FAILED';
export type JobSuggestion = {
  suggestionId: string;
  title: string;
  location: string | null;
  source: string | null;
  postedAt: string | null;
  postingUrl: string | null;
  preparation: { status: SuggestionStatus; missing: string[] };
};

const suggestionPath = (id: string) => `/employer/job-suggestions/${encodeURIComponent(id)}`;

// 10 per page, newest first. Accepts either page shape ({content} or {items}).
export async function listJobSuggestions(page: number): Promise<{ items: JobSuggestion[]; pageMeta: Page<unknown>['pageMeta'] | null }> {
  const d = data<{ content?: JobSuggestion[]; items?: JobSuggestion[]; pageMeta?: Page<unknown>['pageMeta'] }>(
    await employerApi.get('/employer/job-suggestions', { params: { page } }),
  );
  return { items: d?.content ?? d?.items ?? [], pageMeta: d?.pageMeta ?? null };
}

export async function getJobSuggestion(id: string): Promise<JobSuggestion> {
  return data(await employerApi.get(suggestionPath(id)));
}

// Starts the AI preparation (posting, criteria, questions). Poll getJobSuggestion.
export async function prepareJobSuggestion(id: string): Promise<JobSuggestion> {
  return data(await employerApi.post(`${suggestionPath(id)}/prepare`));
}

// Creates and publishes the job in one step; same response as publishJob.
// 400 JOB_NOT_READY {missing}, 400 ORGANIZATION_PROFILE_INCOMPLETE
// {missingFields}; nothing is created on failure.
export async function publishJobSuggestion(id: string): Promise<PublishResult> {
  return data(await employerApi.post(`${suggestionPath(id)}/publish`));
}

// Creates a draft (wizardStep 4), or returns the one already made from it.
export async function draftJobSuggestion(id: string): Promise<ApiJob> {
  return data(await employerApi.post(`${suggestionPath(id)}/draft`));
}

// --- Business plan (/employer/plan, ADR-021 / ADR-023) -----------------------
// Rules are backend defaults pending PM sign-off. Amounts are CENTS.
// - Subscribing is async: after Stripe, poll GET until plan = BUSINESS (2s, ≤30s).
// - GET /employer/credits is prepaid credits only. A Business org may show 0
//   Interview / Report Credits and still unlock and sponsor from its allowance.
// - Spending order, for unlocks and sponsored interviews alike: this month's
//   allowance → prepaid credits → overage. At the cap (or while past_due) an
//   unlock is 403 PLAN_LIMIT_REACHED {reason: CAP_REACHED | PAST_DUE, capCents,
//   spentCents}; a new sponsored interview counts as "sponsorship used up".
// - Annual can't go back to monthly (cancel, then subscribe monthly later).
// No seats or invoice list yet.

export type BusinessBillingCycle = 'MONTHLY' | 'ANNUAL';

export type EmployerPlan = {
  plan: 'FREE' | 'BUSINESS';
  billingCycle: BusinessBillingCycle | null;
  status: 'active' | 'trialing' | 'past_due' | null;
  currentPeriodEnd: string | null; // a cancelled plan returns to Free here
  cancelAtPeriodEnd: boolean | null;
  // Current allowance month (annual plans are cut into months). Unused doesn't roll over.
  allowance: {
    periodStart: string;
    periodEnd: string;
    reports: { included: number; used: number };
    interviews: { included: number; used: number; held: number }; // held = interviews in progress
  } | null;
  overage: {
    spentCents: number; // this allowance month, incl. amounts held for interviews in progress
    capCents: number | null; // null = no cap
    capReached: boolean; // not even the cheapest overage fits under the cap
    reportUnitCents: number;
    interviewUnitCents: number;
    allowed: boolean; // false while past_due
  } | null;
};

export type PlanLimitReached = { reason: 'CAP_REACHED' | 'PAST_DUE'; capCents: number | null; spentCents: number };

// The shell (on every screen change) and Plan & Usage ask at the same moment;
// they share one request while it's in flight. Nothing is cached after.
let employerPlanInflight: Promise<EmployerPlan> | null = null;
export function getEmployerPlan(): Promise<EmployerPlan> {
  employerPlanInflight ??= employerApi
    .get('/employer/plan')
    .then((res) => data<EmployerPlan>(res))
    .finally(() => {
      employerPlanInflight = null;
    });
  return employerPlanInflight;
}

// → Stripe URL. Returns to /employer/credits?checkout=… (shared with credits).
// 409 INVALID_STATE: a Business subscription already exists (incl. past_due,
// or a first payment still processing).
export async function startPlanCheckout(billingCycle: BusinessBillingCycle): Promise<string> {
  const res = data<{ url: string }>(await employerApi.post('/employer/plan/checkout', { billingCycle }));
  return res.url;
}

// Back to Free at currentPeriodEnd. 409 when not Business / already cancelling.
export async function cancelEmployerPlan(): Promise<EmployerPlan> {
  return data(await employerApi.post('/employer/plan/cancel'));
}

// Undo a cancellation. 409 when not cancelling.
export async function resumeEmployerPlan(): Promise<EmployerPlan> {
  return data(await employerApi.post('/employer/plan/resume'));
}

// Immediate; Stripe charges the prorated difference. 400 PLAN_PAYMENT_FAILED
// (plan unchanged), 409 when not monthly Business or past_due.
export async function switchEmployerPlanToAnnual(): Promise<EmployerPlan> {
  return data(await employerApi.post('/employer/plan/switch-to-annual'));
}

// 0 = no overage. Lowering below what's spent stops further overage, refunds nothing.
// 409 CONFLICT while the subscription syncs: retry.
export async function setOverageCap(capCents: number): Promise<EmployerPlan> {
  return data(await employerApi.put('/employer/plan/overage-cap', { capCents }));
}

export async function clearOverageCap(): Promise<EmployerPlan> {
  return data(await employerApi.delete('/employer/plan/overage-cap'));
}

// Live Stripe prices (#323). All amounts in cents. 500 when Stripe is
// unreadable: callers show nothing rather than a guessed price.
export type Money = { amountCents: number; currency: string };
export type EmployerPlanPrices = {
  business: {
    monthly: Money;
    annual: Money;
    reportAllowance: number;
    interviewAllowance: number;
    overage: { reportUnitCents: number; interviewUnitCents: number };
  };
  reportCredit: Money;
  interviewCredit: Money;
};

export async function getEmployerPlanPrices(): Promise<EmployerPlanPrices> {
  return data(await employerApi.get('/employer/plan/prices'));
}

// --- Errors ------------------------------------------------------------------

export type FieldError = { property: string; message: string };

// Body `data` of an error envelope: VALIDATION_ERROR gives FieldError[],
// JOB_NOT_READY {missing}, ORGANIZATION_PROFILE_INCOMPLETE {missingFields},
// INSUFFICIENT_CREDITS {required, available}.
export function errorData<T = unknown>(err: unknown): T | undefined {
  return axios.isAxiosError(err) ? ((err.response?.data as { data?: T } | undefined)?.data ?? undefined) : undefined;
}
