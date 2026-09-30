import type { Candidate, Company, Criterion, InterviewQuestion, Job } from './types';

// Mock data for the admin-operated employer flow. Replace with API calls
// once the employer endpoints exist.

export const EMPTY_COMPANY_FIELDS: Omit<Company, 'id' | 'name' | 'initials'> = {
  website: '',
  linkedin: '',
  industry: '',
  size: '',
  yearFounded: '',
  headquarters: '',
  headline: '',
  description: '',
  workplaceTags: [],
  contact: { name: '', title: '', email: '', phone: '' },
  authorized: false,
};

export const mockCompanies: Company[] = [
  {
    id: 'c-lumen',
    name: 'Lumen Metrics',
    initials: 'LM',
    website: 'https://lumenmetrics.com',
    linkedin: 'https://linkedin.com/company/lumen-metrics',
    industry: 'Data Analytics & Business Intelligence',
    size: '51–200 employees',
    yearFounded: '2019',
    headquarters: 'Austin, Texas',
    headline: 'AI-powered analytics that help teams make better decisions faster',
    description:
      'Lumen Metrics builds intelligent analytics tools that transform raw business data into actionable insights. Our platform combines machine learning with intuitive dashboards to help product, marketing, and operations teams understand user behavior, forecast trends, and optimize performance. Founded in Austin, we are a remote-friendly team of engineers, designers, and data scientists.',
    workplaceTags: ['Remote-friendly', 'Flexible hours'],
    contact: { name: 'Alex Johnson', title: 'Head of Talent', email: 'alex@lumenmetrics.com', phone: '+1 (512) 555-0147' },
    authorized: true,
  },
  {
    id: 'c-northwind',
    name: 'Northwind Labs',
    initials: 'NL',
    ...EMPTY_COMPANY_FIELDS,
    website: 'https://northwindlabs.io',
    contact: { name: 'Priya Shah', title: '', email: 'priya@northwindlabs.io', phone: '' },
  },
];

export const backendCriteria: Criterion[] = [
  { id: 'cr-tps', name: 'Technical problem solving', description: 'Explains backend decisions and solves technical problems clearly.' },
  { id: 'cr-sc', name: 'Structured communication', description: 'Communicates reasoning in a concise and organized way.' },
  { id: 'cr-own', name: 'Ownership', description: 'Takes responsibility and works independently when needed.' },
  { id: 'cr-col', name: 'Collaboration', description: 'Works effectively with teammates and responds constructively to feedback.' },
];

export const backendQuestions: InterviewQuestion[] = [
  { id: 'q1', text: 'Tell us about a backend project you worked on recently. What was your role and what technical decisions did you make?', criteriaIds: ['cr-tps', 'cr-sc'], minutes: 5 },
  { id: 'q2', text: 'Describe a time you had to debug an unexpected production issue. Walk us through your approach.', criteriaIds: ['cr-tps'], minutes: 6 },
  { id: 'q3', text: 'How would you design a scalable API service for a high-traffic application? What trade-offs would you consider?', criteriaIds: ['cr-tps', 'cr-sc'], minutes: 7 },
  { id: 'q4', text: 'Tell us about a time you disagreed with a teammate on a technical approach. How did you handle it?', criteriaIds: ['cr-col', 'cr-sc'], minutes: 5 },
  { id: 'q5', text: 'Describe a situation where you had to take ownership of an unfamiliar problem. What did you do?', criteriaIds: ['cr-own'], minutes: 7 },
];

// Offered by "Generate suggested criteria" in the wizard.
export const SUGGESTED_CRITERIA: Criterion[] = [
  { id: 'sg-sd', name: 'System design', description: 'Designs scalable, reliable services and explains important architectural trade-offs.' },
  { id: 'sg-rel', name: 'Reliability and observability', description: 'Anticipates failure scenarios and uses monitoring, logging, and metrics to diagnose issues.' },
  { id: 'sg-sec', name: 'Security awareness', description: 'Considers data protection, access control, and security risks when making technical decisions.' },
  { id: 'sg-pj', name: 'Product judgment', description: 'Balances technical quality, candidate or user needs, delivery speed, and business impact.' },
  { id: 'sg-la', name: 'Learning agility', description: 'Adapts quickly to unfamiliar systems, tools, and technical requirements.' },
];

const DEFAULT_INSTRUCTIONS =
  'Please complete this interview independently in a quiet environment. Answer each question thoughtfully and speak clearly. You will have the estimated time shown for each question.';

const backendBase: Omit<Job, 'id' | 'companyId' | 'status' | 'title' | 'location' | 'workplace' | 'applicants' | 'interviewsCompleted' | 'updatedAt'> = {
  department: 'Engineering',
  employmentType: 'Full-time',
  salaryMin: '120,000',
  salaryMax: '150,000',
  currency: 'USD ($)',
  payPeriod: 'Annual',
  showSalary: true,
  overview:
    'We are looking for a Backend Engineer to join our core product team. You will be responsible for designing and developing our high-throughput AI interview pipelines, maintaining scalable services on cloud infrastructure, and collaborating on API definitions that power client-side structured flows.',
  responsibilities: [
    'Design, build, and maintain robust API services for AI video processing.',
    'Optimize core application performance and manage PostgreSQL scaling.',
    'Collaborate closely with designers and frontend engineers to deploy features.',
  ],
  requirements: [
    '3+ years of professional backend engineering experience (Go, Node, or Python).',
    'Strong understanding of SQL databases and caching layers (Redis, PostgreSQL).',
    'Experience designing RESTful or GraphQL APIs in production environments.',
  ],
  preferred: [
    'Familiarity with cloud-based audio/video streaming protocols.',
    'Prior experience building automated developer tools or SaaS infrastructure.',
  ],
  criteria: backendCriteria,
  questions: backendQuestions,
  interviewLength: 30,
  candidateInstructions: DEFAULT_INSTRUCTIONS,
  language: 'English',
  interviewConfirmed: true,
  opensAt: 'Oct 24, 2026 09:00 AM',
  closesAt: 'Nov 07, 2026 05:00 PM',
  timeZone: 'Central Time (CT)',
  maxApplicants: '',
  sponsor: 'employer',
  sponsorship: { totalBudget: '1,500', dailyBudget: '300', maxCandidates: '50' },
};

export const mockJobs: Job[] = [
  { ...backendBase, id: 'j-backend', companyId: 'c-lumen', status: 'Open', title: 'Backend Engineer', location: 'San Francisco, CA', workplace: 'Remote', applicants: 47, interviewsCompleted: 31, updatedAt: '2026-09-28', closesAt: 'Nov 07, 2026 05:00 PM' },
  { ...backendBase, id: 'j-fullstack', companyId: 'c-lumen', status: 'Open', title: 'Full-stack Engineer', location: 'New York, NY', workplace: 'Hybrid', applicants: 16, interviewsCompleted: 9, updatedAt: '2026-09-26', closesAt: 'Nov 14, 2026 05:00 PM' },
  { ...backendBase, id: 'j-mobile', companyId: 'c-lumen', status: 'Open', title: 'Mobile Engineer', location: 'Austin, TX', workplace: 'Hybrid', applicants: 8, interviewsCompleted: 0, updatedAt: '2026-09-27', closesAt: 'Nov 21, 2026 05:00 PM' },
  { ...backendBase, id: 'j-platform', companyId: 'c-lumen', status: 'Scheduled', title: 'Platform Engineer', location: 'Chicago, IL', workplace: 'Hybrid', applicants: 0, interviewsCompleted: 0, updatedAt: '2026-09-24', opensAt: 'Mar 25, 2027 09:00 AM', closesAt: 'Apr 15, 2027 05:00 PM' },
  { ...backendBase, id: 'j-data', companyId: 'c-lumen', status: 'Draft', title: 'Data Engineer', location: 'Austin, TX', workplace: 'Remote', applicants: 0, interviewsCompleted: 0, updatedAt: '2026-09-23', interviewConfirmed: false, opensAt: '', closesAt: '', lastEditedLabel: 'Last edited 5 days ago.' },
  { ...backendBase, id: 'j-analyst', companyId: 'c-lumen', status: 'Closed', title: 'Product Analyst', location: 'Chicago, IL', workplace: 'Hybrid', applicants: 35, interviewsCompleted: 28, updatedAt: '2026-09-15', closesAt: 'Sep 15, 2026 05:00 PM' },
];

// Starting point for a brand-new job in the wizard.
export function blankJob(companyId: string, id: string): Job {
  return {
    ...backendBase,
    id,
    companyId,
    status: 'Draft',
    title: '',
    department: '',
    location: '',
    workplace: 'Hybrid',
    salaryMin: '',
    salaryMax: '',
    overview: '',
    responsibilities: [''],
    requirements: [''],
    preferred: [],
    criteria: [],
    questions: [],
    interviewConfirmed: false,
    opensAt: '',
    closesAt: '',
    sponsorship: { totalBudget: '', dailyBudget: '', maxCandidates: '' },
    applicants: 0,
    interviewsCompleted: 0,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

// ─── Candidates ──────────────────────────────────────────────────────────────

const EVIDENCE = [
  { id: 'e1', question: 'Tell us about a backend project you contributed to.', summary: 'Clear project context and contribution scope; measurable business impact could be strengthened.', criteriaIds: ['cr-tps', 'cr-sc'], observed: 'Described the service boundaries and their own contribution clearly.', probe: 'Ask for the measurable outcome of the project.', durationLabel: '5:48' },
  { id: 'e2', question: 'How would you design a pipeline that processes 50,000 billing events per second without losing or double-counting events?', summary: '', criteriaIds: ['cr-tps', 'cr-sc', 'cr-own'], observed: 'The candidate clearly explained delivery guarantees, partitioning strategy, idempotent writes, and the risk of hot partitions.', probe: 'Ask how they would monitor failures, reconcile duplicated events, and validate recovery behavior over time.', durationLabel: '6:12' },
  { id: 'e3', question: 'How would you choose transaction isolation levels for a billing system?', summary: 'Demonstrated understanding of consistency trade-offs and connected the choice to billing-sensitive scenarios.', criteriaIds: ['cr-tps'], observed: 'Compared read committed and serializable with concrete anomalies.', probe: 'Ask about the performance cost at peak load.', durationLabel: '5:05' },
  { id: 'e4', question: 'Describe a time a teammate challenged your technical proposal.', summary: 'Explained the trade-off well; stronger evidence would come from clearer ownership and final outcome.', criteriaIds: ['cr-col'], observed: 'Listened to the objection and ran a small spike to compare options.', probe: 'Ask what the final decision was and who made it.', durationLabel: '4:40' },
  { id: 'e5', question: "How would you investigate a mismatch between usage records and a customer's bill?", summary: 'Showed a structured diagnostic approach; follow-up could focus on validation after the fix is applied.', criteriaIds: ['cr-own', 'cr-tps'], observed: 'Worked from the invoice back to raw events with clear checkpoints.', probe: 'Ask how they would prevent the same mismatch recurring.', durationLabel: '6:30' },
];

type Seed = {
  anon: number;
  name: string;
  score: number;
  unlocked?: boolean;
  delta?: number;
  day: number;
  min: number;
  weakest: string;
  perf: ('green' | 'amber' | 'orange')[];
  met: number;
  decision?: Candidate['decision'];
  contact?: Candidate['contact'];
};

const BACKEND_SEEDS: Seed[] = [
  { anon: 112, name: 'A. Kowalski', score: 88, unlocked: true, delta: 1, day: 17, min: 30, weakest: 'All criteria 82+', perf: ['green', 'green', 'green', 'green'], met: 3 },
  { anon: 117, name: 'R. Okafor', score: 84, delta: 2, day: 17, min: 28, weakest: 'Collaboration: 72', perf: ['green', 'green', 'green', 'amber'], met: 3 },
  { anon: 119, name: 'S. Lindqvist', score: 81, day: 17, min: 32, weakest: 'Ownership: 68', perf: ['green', 'green', 'green', 'amber'], met: 2 },
  { anon: 121, name: 'J. Chen', score: 79, unlocked: true, delta: 1, day: 16, min: 25, weakest: 'Communication: 65', perf: ['green', 'green', 'amber', 'amber'], met: 3, decision: 'moved_forward', contact: 'contacted' },
  { anon: 122, name: 'M. Patel', score: 77, unlocked: true, day: 16, min: 29, weakest: 'Problem solving: 61', perf: ['green', 'green', 'amber', 'amber'], met: 2, decision: 'moved_forward' },
  { anon: 124, name: 'D. Alvarez', score: 74, day: 15, min: 31, weakest: 'Ownership: 58', perf: ['green', 'green', 'orange', 'orange'], met: 2 },
  { anon: 128, name: 'K. Novak', score: 71, day: 15, min: 27, weakest: 'Communication: 55', perf: ['green', 'amber', 'amber', 'orange'], met: 1 },
  { anon: 130, name: 'T. Brooks', score: 68, day: 15, min: 30, weakest: 'Problem solving: 48', perf: ['green', 'amber', 'orange', 'orange'], met: 1, decision: 'rejected' },
];

function scoresFor(total: number): Candidate['criterionScores'] {
  return [
    { criterionId: 'cr-tps', score: Math.min(99, total + 3), note: 'Clearly explained system trade-offs and connected technical decisions to measurable outcomes.' },
    { criterionId: 'cr-sc', score: Math.min(99, total - 2), note: 'Organized the response clearly and separated design constraints from implementation choices.' },
    { criterionId: 'cr-own', score: Math.max(40, total - 3), note: 'Described responsibility for delivery, but ownership would be stronger with clearer personal impact.' },
    { criterionId: 'cr-col', score: Math.max(40, total - 6), note: 'Showed awareness of cross-functional dependencies and explained how feedback influenced the final approach.' },
  ];
}

function makeCandidate(jobId: string, s: Seed): Candidate {
  return {
    id: `${jobId}-${s.anon}`,
    jobId,
    anonLabel: `Candidate #${s.anon}`,
    name: s.name,
    email: `${s.name.replace(/[^a-zA-Z]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '').toLowerCase()}@email.com`,
    resumeFile: `${s.name.replace(/[^a-zA-Z]/g, '_').replace(/_+/g, '_')}_Resume.pdf`,
    score: s.score,
    rankDelta: s.delta,
    completedAt: `Sep ${s.day}`,
    completedAtFull: `Sep ${s.day}, 2026 at 10:42 AM CT`,
    durationMin: s.min,
    weakestLabel: s.weakest,
    performance: s.perf,
    screeningMet: s.met,
    screeningTotal: 3,
    criterionScores: scoresFor(s.score),
    screening: [
      { label: 'Has formal system architecture experience', met: s.met >= 1 },
      { label: 'Has cross-functional project experience', met: s.met >= 2 },
      { label: 'Has independently owned complex projects', met: s.met >= 3 },
    ],
    evidence: EVIDENCE,
    strengths: ['Backend reliability and data correctness', 'Identifying technical trade-offs', 'Responding clearly to follow-up questions'],
    probeAreas: ['Assumptions behind the proposed solution', 'Monitoring and recovery behavior', 'Individual ownership and measurable project outcomes'],
    unlocked: !!s.unlocked,
    decision: s.decision ?? 'pending',
    contact: s.contact ?? 'not_contacted',
  };
}

// Fill out a board to `count` completed interviews with descending scores.
function fillSeeds(seeds: Seed[], count: number): Seed[] {
  const out = [...seeds];
  let anon = 131;
  let score = (seeds[seeds.length - 1]?.score ?? 70) - 1;
  const names = ['L. Moreau', 'P. Singh', 'E. Walsh', 'H. Tanaka', 'N. Costa', 'B. Ibrahim', 'C. Rossi', 'F. Yilmaz', 'G. Park', 'I. Haddad', 'O. Berg', 'V. Kim'];
  while (out.length < count) {
    out.push({
      anon: anon++,
      name: names[out.length % names.length],
      score: Math.max(42, score),
      day: 14 - (out.length % 5),
      min: 24 + (out.length % 9),
      weakest: `Ownership: ${Math.max(35, score - 20)}`,
      perf: score > 60 ? ['green', 'amber', 'orange', 'orange'] : ['amber', 'orange', 'orange', 'orange'],
      met: score > 60 ? 1 : 0,
    });
    score -= 1;
  }
  return out;
}

export const mockCandidates: Candidate[] = [
  ...fillSeeds(BACKEND_SEEDS, 31).map((s) => makeCandidate('j-backend', s)),
  ...fillSeeds(BACKEND_SEEDS.slice(1, 4).map((s) => ({ ...s, unlocked: false, decision: undefined, contact: undefined })), 9).map((s) => makeCandidate('j-fullstack', s)),
  ...fillSeeds(BACKEND_SEEDS.slice(0, 6), 28).map((s) => makeCandidate('j-analyst', s)),
];

// Applications-per-day series for the dashboard chart (last 30 days).
export const applicationsSeries = [
  0, 2, 3, 1, 3, 2, 4, 1, 3, 5, 2, 3, 2, 4, 1, 3, 5, 2, 3, 2, 4, 5, 2, 3, 4, 1, 5, 3, 4, 2,
].map((v, i) => ({ day: i + 1, value: v }));
