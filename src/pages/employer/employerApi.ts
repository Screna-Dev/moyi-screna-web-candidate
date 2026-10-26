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

export type InterviewSettings = {
  durationMinutes: 20 | 30 | 45;
  language: string;
  candidateInstructions: string | null;
  passScore: number | null;
  interviewPayer: InterviewPayer | null; // null until chosen
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
  wizardStep: 1 | 2 | 3 | 4; // furthest step reached; only grows
  interviewSettings: InterviewSettings;
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
// language come from the saved draft (30 min / en until step 3 is saved).
export async function suggestQuestions(jobId: string, criteria: { name: string; description?: string | null }[]): Promise<AiTask> {
  const { taskId } = data<{ taskId: string }>(await employerApi.post(`${jobPath(jobId)}/ai/question-suggestions`, { criteria }));
  return pollAiTask(jobId, taskId);
}

// --- Preview / publish -------------------------------------------------------

export type PublishCheck = {
  ready: boolean;
  missing: string[]; // job fields, same values as JOB_NOT_READY
  profileComplete: boolean;
  profileMissingFields: OrgField[];
  creditsRequired: number;
  interviewCreditsAvailable: number;
  enoughCredits: boolean;
};

export type PublishResult = {
  jobId: string;
  title: string;
  status: 'OPEN' | 'SCHEDULED';
  opensAt: string;
  closesAt: string;
  timezone: string;
  publishedAt: string;
  creditsCharged: number;
  interviewCreditsRemaining: number;
  alreadyPublished: boolean; // retry of a published job: nothing charged
};

export async function getPublishCheck(jobId: string): Promise<PublishCheck> {
  return data(await employerApi.get(`${jobPath(jobId)}/publish-check`));
}

// Costs 1 Interview Credit. Safe to retry. Errors, checked in this order and
// none of them charging: 400 JOB_NOT_READY {missing}, 400
// ORGANIZATION_PROFILE_INCOMPLETE {missingFields}, 403 INSUFFICIENT_CREDITS.
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
  close: boolean;
  reopen: boolean;
};

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
  closeReason: 'DEADLINE' | 'MANUAL' | null;
  timezone: string | null;
  publishedAt: string | null;
  applicationCount: number;
  completedCount: number;
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
export async function saveJobPosting(jobId: string, body: JobDetailsBody): Promise<ApiJob> {
  return data(await employerApi.put(`${jobPath(jobId)}/posting`, body));
}

// OPEN: moves the deadline. SCHEDULED: also moves opensAt. CLOSED: reopens
// (no credit charged). closesAt must be in the future.
export async function updateJobWindow(jobId: string, body: { opensAt: string | null; closesAt: string }): Promise<ApiJob> {
  return data(await employerApi.put(`${jobPath(jobId)}/window`, body));
}

export async function closeJob(jobId: string): Promise<ApiJob> {
  return data(await employerApi.post(`${jobPath(jobId)}/close`));
}

// --- Errors ------------------------------------------------------------------

export type FieldError = { property: string; message: string };

// Body `data` of an error envelope: VALIDATION_ERROR gives FieldError[],
// JOB_NOT_READY {missing}, ORGANIZATION_PROFILE_INCOMPLETE {missingFields},
// INSUFFICIENT_CREDITS {required, available}.
export function errorData<T = unknown>(err: unknown): T | undefined {
  return axios.isAxiosError(err) ? ((err.response?.data as { data?: T } | undefined)?.data ?? undefined) : undefined;
}
