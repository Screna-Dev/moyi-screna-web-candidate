import type { Company, Criterion, InterviewQuestion, Job } from '../../types';

export type JobPatch = Partial<Job> | ((j: Job) => Partial<Job>);

// Real AI suggestions (employer app). Without it the interview step falls back
// to the canned mock suggestions the admin console uses.
export type InterviewAI = {
  suggestCriteria: () => Promise<Criterion[]>;
  suggestQuestions: (criteria: Criterion[]) => Promise<InterviewQuestion[]>;
};

export type StepProps = {
  job: Job;
  update: (patch: JobPatch) => void;
  showErrors: boolean;
  company: Company;
  ai?: InterviewAI;
};

export const STEPS = ['Job details', 'Interview', 'Application & sponsorship', 'Preview & publish'] as const;

export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'] as const;
export const CURRENCIES = ['USD ($)', 'EUR (€)', 'GBP (£)', 'CAD ($)'];
export const TIME_ZONES = ['Pacific Time (PT)', 'Mountain Time (MT)', 'Central Time (CT)', 'Eastern Time (ET)', 'UTC'];

const filled = (s: string) => s.trim().length > 0;

// ─── Validation — one function per step, shared by stepper, summary and footer ─

export function jobDetailsErrors(j: Job): Record<string, boolean> {
  return {
    title: !filled(j.title),
    location: !filled(j.location),
    overview: !filled(j.overview),
    responsibilities: !j.responsibilities.some(filled),
    requirements: !j.requirements.some(filled),
  };
}

// Limits enforced by PUT /employer/jobs/{id}/assessment.
export const MAX_CRITERIA = 8;
export const MAX_QUESTIONS = 15;

// apiRules adds what the employer API rejects: too many criteria/questions,
// duplicate criterion names, and questions that evaluate no criterion.
export function interviewErrors(j: Job, apiRules = false): Record<string, boolean> {
  const names = j.criteria.map((c) => c.name.trim().toLowerCase());
  return {
    criteria:
      j.criteria.length === 0 ||
      j.criteria.some((c) => !filled(c.name)) ||
      (apiRules && (j.criteria.length > MAX_CRITERIA || new Set(names).size !== names.length)),
    questions:
      j.questions.length === 0 ||
      j.questions.some((q) => !filled(q.text)) ||
      (apiRules && (j.questions.length > MAX_QUESTIONS || j.questions.some((q) => q.criteriaIds.length === 0))),
    confirmed: !j.interviewConfirmed,
  };
}

export function applicationErrors(j: Job): Record<string, boolean> {
  const sponsored = j.sponsor === 'employer';
  return {
    opensAt: !filled(j.opensAt),
    // Also blocks a closing time at or before the opening time.
    closesAt: !filled(j.closesAt) || (filled(j.opensAt) && displayToInput(j.closesAt) <= displayToInput(j.opensAt)),
    timeZone: !filled(j.timeZone),
    totalBudget: sponsored && !filled(j.sponsorship.totalBudget),
    dailyBudget: sponsored && !filled(j.sponsorship.dailyBudget),
    maxCandidates: sponsored && !filled(j.sponsorship.maxCandidates),
  };
}

const none = (e: Record<string, boolean>) => !Object.values(e).some(Boolean);

export function stepValid(j: Job, step: number): boolean {
  if (step === 0) return none(jobDetailsErrors(j));
  if (step === 1) return none(interviewErrors(j));
  if (step === 2) return none(applicationErrors(j));
  return none(jobDetailsErrors(j)) && none(interviewErrors(j)) && none(applicationErrors(j));
}

// ─── Dates — Job stores display strings ("Oct 24, 2026 09:00 AM"); the inputs
// are datetime-local. Parsed by hand because Safari's Date() rejects this format.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDisplay(s: string): { y: number; m: number; d: number; h: number; min: number } | null {
  const m = s.match(/^([A-Za-z]{3}) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}) (AM|PM)$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1]);
  if (month < 0) return null;
  let h = Number(m[4]) % 12;
  if (m[6] === 'PM') h += 12;
  return { y: Number(m[3]), m: month, d: Number(m[2]), h, min: Number(m[5]) };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function displayToInput(s: string): string {
  const p = parseDisplay(s);
  return p ? `${p.y}-${pad(p.m + 1)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}` : '';
}

export function inputToDisplay(v: string): string {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return '';
  const h24 = Number(m[4]);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${MONTHS[Number(m[2]) - 1]} ${pad(Number(m[3]))}, ${m[1]} ${pad(h12)}:${m[5]} ${h24 >= 12 ? 'PM' : 'AM'}`;
}

// "Oct 24 – Nov 7, 2026"; "On publish – Nov 7, 2026" when opensAt is blank.
export function windowLabel(j: Job): string {
  const a = parseDisplay(j.opensAt);
  const b = parseDisplay(j.closesAt);
  if (!b) return 'Not set';
  if (!a) return `On publish – ${MONTHS[b.m]} ${b.d}, ${b.y}`;
  const left = `${MONTHS[a.m]} ${a.d}${a.y !== b.y ? `, ${a.y}` : ''}`;
  return `${left} – ${MONTHS[b.m]} ${b.d}, ${b.y}`;
}

// "Nov 7, 2026 at 5:00 PM CT"
export function closeLabel(j: Job): string {
  const b = parseDisplay(j.closesAt);
  if (!b) return 'Not set';
  const h12 = b.h % 12 === 0 ? 12 : b.h % 12;
  const tz = j.timeZone.match(/\(([^)]+)\)/)?.[1] ?? j.timeZone;
  return `${MONTHS[b.m]} ${b.d}, ${b.y} at ${h12}:${pad(b.min)} ${b.h >= 12 ? 'PM' : 'AM'} ${tz}`.trim();
}

export function salaryLabel(j: Job): string | null {
  if (!j.showSalary || !filled(j.salaryMin) || !filled(j.salaryMax)) return null;
  const sym = j.currency.match(/\(([^)]+)\)/)?.[1] ?? '$';
  return `${sym}${j.salaryMin}–${sym}${j.salaryMax}${j.payPeriod === 'Annual' ? '/yr' : '/hr'}`;
}

export function numberOf(s: string): number {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
