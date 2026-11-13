import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import * as employerApi from '@/pages/employer/employerApi';
import type { BoardCandidate, CreditBalances, EmployerDashboardData, EmployerPlan, JobList, JobListItem, Page } from '@/pages/employer/employerApi';
import { mockCandidates, mockCompanies, mockJobs } from '@/components/admin/console/pages/employer/mockData';
import { applicantTrend } from '@/components/admin/console/pages/employer/views/jobTableHelpers';
import { CreditsContext, LOW_REPORT_UNLOCKS, reportUnlocksLeft } from '@/pages/employer/creditsContext';
import { EmployerDashboard } from '@/pages/employer/EmployerDashboard';

// Employer dashboard (#326): GET /employer/dashboard feeds the stats, chart,
// pipeline and decisions; GET /employer/jobs the job counts, attention items
// and My Jobs; the board list the recent candidates. The shared store still
// holds the design's sample candidates: none of them may show.

vi.mock('@/components/admin/console/pages/employer/store', async (orig) => ({
  ...(await orig<object>()),
  useEmployerStore: () => ({
    company: mockCompanies[0],
    jobs: mockJobs,
    candidatesFor: (id: string) => mockCandidates.filter((c) => c.jobId === id),
    go: vi.fn(),
  }),
}));
vi.mock('@/pages/employer/employerApi', async (orig) => ({
  ...(await orig<object>()),
  listJobs: vi.fn(),
  getEmployerDashboard: vi.fn(),
  listBoardCandidates: vi.fn(),
  getBoardSummary: vi.fn(),
  recordBoardVisit: vi.fn(),
}));
const api = vi.mocked(employerApi);

const job: JobListItem = {
  jobId: 'j1',
  title: 'Backend Engineer',
  status: 'OPEN',
  wizardStep: 4,
  location: null,
  workplaceType: null,
  opensAt: null,
  closesAt: null,
  closedAt: null,
  closeReason: null,
  timezone: 'America/Chicago',
  publishedAt: '2026-11-01T00:00:00Z',
  applicationCount: 12,
  completedCount: 7,
  unlockedCount: 4,
  updatedAt: '2026-11-01T00:00:00Z',
  actions: { continueDraft: false, delete: false, editPosting: true, changeWindow: true, close: true, reopen: false, editSponsorship: false },
};
const list: JobList = {
  counts: { draft: 0, active: 1, closed: 0, total: 1 },
  items: [job],
  pageMeta: { pageNumber: 0, pageSize: 10, totalElements: 1, totalPages: 1, first: true, last: true },
};

const dash = (over: Partial<EmployerDashboardData> = {}): EmployerDashboardData => ({
  jobs: { openCount: 3, scheduledCount: 2, draftCount: 1, closedCount: 4 },
  applicants: { totalCount: 211, last30DaysCount: 46, prior30DaysCount: 40 },
  interviews: { completedCount: 133, completedLast7DaysCount: 9 },
  unlockedReportCount: 27,
  decisions: { pendingCount: 6, movedForwardCount: 11, rejectedCount: 10, contactedCount: 5 },
  daily: Array.from({ length: 90 }, (_, i) => ({ date: `d${i}`, applicationCount: 1, interviewCount: 0, reportUnlockCount: 0 })),
  recentCandidatesJobId: 'j1',
  ...over,
});

const cand = (rank: number, unlocked: boolean): BoardCandidate => ({
  applicationId: `app-${rank}`,
  rank,
  movement: rank === 2 ? 1 : null,
  isNew: false,
  candidate: { label: unlocked ? `Person ${rank}` : `Candidate #${100 + rank}`, candidateNo: 100 + rank, unlocked },
  latestInterview: { completedAt: '2026-11-10T00:00:00Z', durationMinutes: 18 },
  score: 95 - rank,
  criteria: [],
  weakestCriterion: null,
  minCriterionScore: null,
  screening: { met: 0, total: 0 },
  reportStatus: unlocked ? 'UNLOCKED' : 'LOCKED',
  hiringStatus: 'AWAITING',
});
const board: Page<BoardCandidate> = {
  content: [cand(1, true), cand(2, false), cand(3, false), cand(4, true)],
  pageMeta: { pageNumber: 0, pageSize: 10, totalElements: 4, totalPages: 1, first: true, last: true },
};

const FREE: EmployerPlan = { plan: 'FREE', billingCycle: null, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: null, allowance: null, overage: null };
const business = (status: EmployerPlan['status'], used: number): EmployerPlan => ({
  ...FREE,
  plan: 'BUSINESS',
  billingCycle: 'MONTHLY',
  status,
  allowance: { periodStart: '', periodEnd: '', reports: { included: 50, used }, interviews: { included: 10, used: 0, held: 0 } },
});

function renderDash(credits: CreditBalances | null = { report: 20, interview: 5 }, planArg: EmployerPlan | null | 'not-loaded' = FREE) {
  const plan = planArg === 'not-loaded' ? undefined : planArg;
  const wrap = (c: ReactNode) => <CreditsContext.Provider value={{ credits, plan, refresh: vi.fn() }}>{c}</CreditsContext.Provider>;
  return render(wrap(<EmployerDashboard />));
}

// Recharts' ResponsiveContainer needs ResizeObserver (absent in jsdom).
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

beforeEach(() => {
  vi.clearAllMocks();
  api.listJobs.mockResolvedValue(list);
  api.getEmployerDashboard.mockResolvedValue(dash());
  api.listBoardCandidates.mockResolvedValue(board);
});

describe('Employer dashboard', () => {
  it('renders the API values in the stat cards, pipeline and decisions', async () => {
    renderDash();
    expect(await screen.findByText('Applicants · Last 30 Days')).toBeInTheDocument();
    expect(api.getEmployerDashboard).toHaveBeenCalledWith(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(screen.getByText('5')).toBeInTheDocument(); // 3 open + 2 scheduled
    expect(screen.getByText('3 open · 2 scheduled')).toBeInTheDocument();
    expect(screen.getByText('46')).toBeInTheDocument();
    expect(screen.getByText('+15% vs prior period')).toBeInTheDocument();
    expect(screen.getAllByText('133').length).toBeGreaterThan(0);
    expect(screen.getByText('9 completed this week')).toBeInTheDocument();
    expect(screen.getByText('211')).toBeInTheDocument(); // pipeline: all applicants
    expect(screen.getByText('27')).toBeInTheDocument(); // reports unlocked
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5 candidates contacted')).toBeInTheDocument();
    expect(screen.getByText('6 candidates are waiting for a decision')).toBeInTheDocument();
    // Chart totals the last 30 daily entries.
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('1.0')).toBeInTheDocument();
    expect(screen.queryByText(/\+18%|8 completed this week|placeholders/)).not.toBeInTheDocument();
  });

  it('recent candidates: top 3 of the board, and never records a board visit', async () => {
    renderDash();
    expect(await screen.findByText('Person 1')).toBeInTheDocument();
    expect(api.listBoardCandidates).toHaveBeenCalledWith('j1', { report: 'ALL', page: 0 });
    expect(screen.getByText('Candidate #102')).toBeInTheDocument();
    expect(screen.getByText('Candidate #103')).toBeInTheDocument();
    expect(screen.queryByText('Person 4')).not.toBeInTheDocument();
    expect(screen.getByText(/Backend Engineer · Score 93 · ↑1/)).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 20));
    expect(api.recordBoardVisit).not.toHaveBeenCalled();
  });

  it('hides recent candidates when recentCandidatesJobId is null', async () => {
    api.getEmployerDashboard.mockResolvedValue(dash({ recentCandidatesJobId: null }));
    renderDash();
    expect(await screen.findByText('Candidate Pipeline')).toBeInTheDocument();
    expect(screen.queryByText(/Recent Candidates/)).not.toBeInTheDocument();
    expect(api.listBoardCandidates).not.toHaveBeenCalled();
  });

  it('dashboard endpoint down: its blocks are hidden, never sample data', async () => {
    api.getEmployerDashboard.mockRejectedValue(new Error('500'));
    renderDash();
    expect(await screen.findByText('Active Jobs')).toBeInTheDocument();
    for (const t of ['Applicants · Last 30 Days', 'Decisions Pending', 'Candidate Pipeline', 'Daily Average:']) {
      expect(screen.queryByText(t)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/Recent Candidates|waiting for a decision/)).not.toBeInTheDocument();
  });

  it('My Jobs shows each job’s unlockedCount', async () => {
    renderDash();
    const header = await screen.findByRole('columnheader', { name: 'Unlocked' });
    const table = header.closest('table')!;
    const row = within(table).getByText('Backend Engineer').closest('tr')!;
    expect(within(row).getByText('4')).toBeInTheDocument();
  });

  it(`shows "Report credits are running low" at ${LOW_REPORT_UNLOCKS} or fewer unlocks left`, async () => {
    renderDash({ report: 3, interview: 0 }, FREE);
    expect(await screen.findByText('Report credits are running low')).toBeInTheDocument();
    expect(screen.getByText('3 report unlocks left.')).toBeInTheDocument();
  });

  it('Business with allowance left: no low-credits warning', async () => {
    renderDash({ report: 0, interview: 0 }, business('active', 10));
    await screen.findByText('Active Jobs');
    await waitFor(() => expect(screen.queryByText('Report credits are running low')).not.toBeInTheDocument());
  });

  it('plan not loaded yet: no warning from the prepaid count alone', async () => {
    renderDash({ report: 1, interview: 0 }, 'not-loaded');
    await screen.findByText('Active Jobs');
    expect(screen.queryByText('Report credits are running low')).not.toBeInTheDocument();
  });
});

describe('applicant trend (+N% vs prior period)', () => {
  it('compares the last 30 days with the 30 before; hidden when the prior period is 0', () => {
    expect(applicantTrend(46, 40)).toEqual({ text: '+15% vs prior period', tone: 'green' });
    expect(applicantTrend(30, 40)).toEqual({ text: '-25% vs prior period', tone: undefined });
    expect(applicantTrend(40, 40)?.text).toBe('0% vs prior period');
    expect(applicantTrend(12, 0)).toBeNull();
  });
});

describe('report unlocks left', () => {
  it('Free: Report Credits only', () => {
    expect(reportUnlocksLeft({ report: 7, interview: 1 }, FREE)).toBe(7);
  });
  it('Business: remaining allowance + prepaid credits', () => {
    expect(reportUnlocksLeft({ report: 7, interview: 1 }, business('active', 45))).toBe(12);
    expect(reportUnlocksLeft({ report: 7, interview: 1 }, business('active', 60))).toBe(7); // overused allowance never subtracts
  });
  it('past_due: prepaid only', () => {
    expect(reportUnlocksLeft({ report: 2, interview: 1 }, business('past_due', 0))).toBe(2);
  });
  it('credits not loaded: unknown', () => {
    expect(reportUnlocksLeft(null, FREE)).toBeNull();
  });
});
