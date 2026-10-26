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
// - interviewPayer is the employer's call. CANDIDATE: start pre-charges the
//   full duration (audio 1 credit/min, video ×1.5) and refunds the unused part
//   afterwards. EMPLOYER: free for the candidate.
// - Results are async: after /end, poll the application until
//   interviewStatus = COMPLETED. Candidates never see scores or reports (v1).
// - Show "start interview" from canStartInterview, never from the status.

export type WorkplaceType = 'ON_SITE' | 'HYBRID' | 'REMOTE';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'TEMPORARY';
export type SalaryPeriod = 'YEAR' | 'MONTH' | 'WEEK' | 'DAY' | 'HOUR';
export type InterviewPayer = 'EMPLOYER' | 'CANDIDATE';
export type InterviewStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

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
  interviewPayer: InterviewPayer;
  canStartInterview: boolean;
};

export type CareerJobDetail = { posting: CareerPosting; myApplication: CareerApplication | null };

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

// Starts the interview, or rejoins the one in progress. audioOnly=false adds
// video (×1.5 when the candidate pays).
export async function startCareerInterview(applicationId: string, audioOnly: boolean): Promise<CareerInterviewSession> {
  return data(await API.post(`/careers/applications/${enc(applicationId)}/interview`, { audioOnly }));
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
