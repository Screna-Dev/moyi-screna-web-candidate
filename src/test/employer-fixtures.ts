import type { ApiJob, PublishCheck } from '@/pages/employer/employerApi';
import { addDays, todayIn, wallToIso } from '@/pages/employer/jobMapping';

// Shared fixtures for the employer wizard tests.

// The saved draft closes 10 days from today, 17:00 Chicago: inside the
// allowed window (3 days to 1 month after opening) and not the 7-day default.
export const FIXTURE_CLOSES = addDays(todayIn('America/Chicago'), 10);
// As windowLabel prints it, e.g. "Nov 7, 2026".
export const FIXTURE_CLOSES_LABEL = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${FIXTURE_CLOSES}T00:00:00Z`));

const CRITERIA = ['Resume & Background', 'Domain Knowledge', 'Technical Skills', 'Behavioral'];

export function apiJob(over: Partial<ApiJob> = {}, payer: 'EMPLOYER' | 'CANDIDATE' = 'CANDIDATE'): ApiJob {
  return {
    id: 'job-1',
    status: 'DRAFT',
    wizardStep: 4,
    title: 'Backend Engineer',
    department: null,
    employmentType: 'FULL_TIME',
    workplaceType: 'REMOTE',
    location: 'Remote',
    seniority: null,
    role: null,
    yearsExperienceMin: null,
    yearsExperienceMax: null,
    skills: [],
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    showSalary: false,
    summary: null,
    roleOverview: 'Build APIs.',
    responsibilities: ['Ship features'],
    requirements: ['Java'],
    preferredQualifications: [],
    benefits: [],
    opensAt: null,
    closesAt: wallToIso(`${FIXTURE_CLOSES}T17:00`, 'America/Chicago')!,
    timezone: 'America/Chicago',
    maxApplicants: null,
    interviewSettings: { durationMinutes: 20, language: 'en', candidateInstructions: null, passScore: null, interviewPayer: payer },
    criteria: CRITERIA.map((name, i) => ({ id: `c${i}`, name, description: null, source: 'AI' as const })),
    screeningCriteria: [],
    questions: [{ id: 'q1', seq: 1, text: 'Tell me about a system you built.', estimatedMinutes: 5, source: 'AI', edited: false, criterionIds: ['c0'], criterionNames: [CRITERIA[0]] }],
    assessmentAreas: [],
    questionsReviewedAt: '2026-10-27T00:00:00Z',
    publishedAt: null,
    createdAt: '2026-10-27T00:00:00Z',
    updatedAt: '2026-10-27T00:00:00Z',
    ...over,
  };
}

export function check(over: Partial<PublishCheck> = {}): PublishCheck {
  return {
    ready: true,
    missing: [],
    profileComplete: true,
    profileMissingFields: [],
    interviewPayer: 'CANDIDATE',
    interviewCreditsAvailable: 0,
    sponsorshipUnfunded: false,
    ...over,
  };
}
