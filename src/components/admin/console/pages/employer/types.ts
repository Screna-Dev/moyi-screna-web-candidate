// Employer hiring — admin-operated. There is no employer-facing login yet;
// Screna admins act on behalf of each employer from the admin console.
// No backend yet: everything here is in-memory mock state (see store.tsx).

export type WorkplaceType = 'On-site' | 'Hybrid' | 'Remote';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
export type PayPeriod = 'Hourly' | 'Annual';

export type JobStatus = 'Draft' | 'Scheduled' | 'Open' | 'Closed';

// Who pays for a candidate's first interview.
export type InterviewSponsor = 'employer' | 'candidate';

export type HiringContact = {
  name: string;
  title: string;
  email: string;
  phone: string;
};

export type Company = {
  id: string;
  name: string;
  initials: string;
  website: string;
  linkedin: string;
  industry: string;
  size: string;
  yearFounded: string;
  headquarters: string;
  headline: string;
  description: string;
  workplaceTags: string[];
  contact: HiringContact;
  authorized: boolean;
};

export type Criterion = {
  id: string;
  name: string;
  description: string;
};

export type InterviewQuestion = {
  id: string;
  text: string;
  criteriaIds: string[];
  minutes: number;
};

export type Sponsorship = {
  totalBudget: string;
  dailyBudget: string;
  maxCandidates: string;
};

export type Job = {
  id: string;
  companyId: string;
  status: JobStatus;
  title: string;
  department: string;
  employmentType: EmploymentType;
  workplace: WorkplaceType;
  location: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  payPeriod: PayPeriod;
  showSalary: boolean;
  overview: string;
  responsibilities: string[];
  requirements: string[];
  preferred: string[];
  criteria: Criterion[];
  questions: InterviewQuestion[];
  interviewLength: 20 | 30 | 45;
  candidateInstructions: string;
  language: string;
  interviewConfirmed: boolean;
  opensAt: string;   // display string, e.g. "Oct 24, 2026 09:00 AM"
  closesAt: string;  // display string
  timeZone: string;
  maxApplicants: string;
  sponsor: InterviewSponsor;
  sponsorship: Sponsorship;
  // Board stats (mock). For drafts/scheduled these are 0.
  applicants: number;
  interviewsCompleted: number;
  updatedAt: string; // ISO, for "recently updated" sort
  lastEditedLabel?: string;
};

export type HiringDecision = 'pending' | 'moved_forward' | 'rejected';
export type ContactStatus = 'not_contacted' | 'contacted';

export type CriterionScore = {
  criterionId: string;
  score: number;
  note: string;
};

export type QuestionEvidence = {
  id: string;
  question: string;
  summary: string;
  criteriaIds: string[];
  observed: string;
  probe: string;
  durationLabel: string;
};

export type Candidate = {
  id: string;
  jobId: string;
  // Shown while locked ("Candidate #117"); real name once unlocked.
  anonLabel: string;
  name: string;
  email: string;
  resumeFile: string;
  score: number;
  rankDelta?: number; // +1 = moved up one place since last visit
  completedAt: string; // "Sep 17"
  completedAtFull: string; // "Sep 17, 2026 at 10:42 AM CT"
  durationMin: number;
  weakestLabel: string; // "Collaboration: 72" or "All criteria 82+"
  performance: ('green' | 'amber' | 'orange')[]; // 4 bar segments
  screeningMet: number;
  screeningTotal: number;
  criterionScores: CriterionScore[];
  screening: { label: string; met: boolean }[];
  evidence: QuestionEvidence[];
  strengths: string[];
  probeAreas: string[];
  unlocked: boolean;
  decision: HiringDecision;
  contact: ContactStatus;
};

// In-page navigation for the Employers admin section. The admin console
// switches pages with state rather than routes, so this does the same.
export type EmployerView =
  | { name: 'dashboard' }
  | { name: 'jobs' }
  | { name: 'applications' }
  | { name: 'board'; jobId: string }
  | { name: 'report'; jobId: string; candidateId: string }
  | { name: 'contact'; jobId: string; candidateId: string }
  | { name: 'wizard'; jobId?: string };
