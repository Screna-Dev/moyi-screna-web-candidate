// Employer hiring — admin-operated. There is no employer-facing login yet;
// Screna admins act on behalf of each employer from the admin console.
// No backend yet: everything here is in-memory mock state (see store.tsx).

export type WorkplaceType = 'On-site' | 'Hybrid' | 'Remote';
// Temporary only arrives from the employer API; the wizard doesn't offer it.
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Temporary';
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
  logoUrl?: string; // set when the org profile comes from the employer API
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

// source/edited are tracked for the employer API only (AI-suggested vs typed,
// and whether an AI question's text was changed).
export type Criterion = {
  id: string;
  name: string;
  description: string;
  source?: 'AI' | 'MANUAL';
};

export type InterviewQuestion = {
  id: string;
  text: string;
  criteriaIds: string[];
  minutes: number;
  source?: 'AI' | 'MANUAL';
  edited?: boolean;
};

// What happens once every sponsored interview spot is used (employer app).
export type AfterSponsorshipLimit = 'keep' | 'close';

export type Sponsorship = {
  totalBudget: string;
  dailyBudget: string;
  maxCandidates: string;
  afterLimit?: AfterSponsorshipLimit | null;
};

export type Job = {
  id: string;
  companyId: string;
  status: JobStatus;
  title: string;
  department: string;
  hrContactPhone: string;
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
  // null = not chosen yet (employer app: the employer must pick one; the
  // admin console always starts from 'employer').
  sponsor: InterviewSponsor | null;
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

// Employer subscription (Figma 2451:1052). Free is a one-time pool of report
// unlocks; Business is a monthly allowance with per-unit overage up to a cap.
export type PlanTier = 'free' | 'business';

export type Invoice = {
  id: string;
  date: string; // "Oct 1, 2026"
  description: string;
  amount: number; // USD
};

export type EmployerPlan = {
  tier: PlanTier;
  unlockAllowance: number;
  unlocksUsed: number;
  sponsoredAllowance: number;
  sponsoredUsed: number;
  renewsOn: string; // "Nov 1, 2026"
  resetsOn: string; // "Nov 1"
  seats: number;
  seatsUsed: number;
  overageUnitPrice: number; // per report unlock past the allowance
  overageCap: number; // USD; 0 = no overage allowed
  overageThisMonth: number; // USD
  invoices: Invoice[];
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
  // checkout: back from Stripe after buying Interview Credits (employer app).
  | { name: 'wizard'; jobId?: string; checkout?: 'success' | 'cancelled' }
  | { name: 'plan' }
  // Employer-only. returnJobId: came from the wizard's publish gate.
  | { name: 'profile'; returnJobId?: string };
