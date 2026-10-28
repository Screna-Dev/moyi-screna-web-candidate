import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { CareerJob } from '@/services/careersApi';
import { createUserPlanMock } from '@/test/utils';
import { DashboardHome } from '@/pages/newDesign/dashboard-home';

// Candidate dashboard, design B-候选人-10-23 (Figma node 102:58): the chart
// has no Applications tab, and a Featured Opportunities row shows the three
// newest /careers jobs.

const mockNavigate = vi.fn();
vi.mock('react-router', async (orig) => ({
  ...(await orig<object>()),
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => createUserPlanMock() }));
vi.mock('@/services/DashboardService', () => ({ getDashboardStats: vi.fn().mockResolvedValue({
    data: { totalLearningTimeMinutes: 30, sessionCompletedCount: 1, dailyLearningTimeMinutes: [{ date: '2026-10-27', value: 10 }, { date: '2026-10-28', value: 20 }] },
  }) }));
vi.mock('@/services/MentorService', () => ({
  listMyBookings: vi.fn().mockResolvedValue({ data: { data: { content: [] } } }),
  cancelBooking: vi.fn(),
  rescheduleBooking: vi.fn(),
  getMentor: vi.fn(),
  getMentorSlots: vi.fn(),
}));
vi.mock('@/services/ProfileServices', () => ({ getProfilePreferences: vi.fn().mockResolvedValue({ data: {} }) }));
vi.mock('@/services/CommunityService', () => ({ getPosts: vi.fn().mockResolvedValue({ data: { data: { content: [] } } }) }));

const listCareerJobs = vi.fn();
vi.mock('@/services/careersApi', async (orig) => ({
  ...(await orig<object>()),
  listCareerJobs: (...args: unknown[]) => listCareerJobs(...args),
}));

function job(over: Partial<CareerJob>): CareerJob {
  return {
    jobId: 'j1',
    title: 'Backend Engineer',
    companyName: 'Acme Robotics',
    companyLogoUrl: null,
    location: 'Austin, TX',
    workplaceType: 'HYBRID',
    employmentType: 'FULL_TIME',
    seniority: 'SENIOR',
    role: null,
    salaryMin: 120000,
    salaryMax: 155500,
    salaryCurrency: 'USD',
    salaryPeriod: 'YEAR',
    summary: null,
    closesAt: '2026-11-01T22:00:00Z',
    timezone: 'America/Chicago',
    publishedAt: '2026-10-20T00:00:00Z',
    interviewDurationMinutes: 20,
    interviewPayer: 'EMPLOYER',
    applied: false,
    ...over,
  };
}

const page = (content: CareerJob[]) => ({
  content,
  pageMeta: { pageNumber: 0, pageSize: 10, totalElements: content.length, totalPages: 1, first: true, last: true },
});

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <DashboardHome userData={{ firstName: 'Alex' } as never} />
    </MemoryRouter>,
  );

const section = () => screen.getByRole('region', { name: 'Featured Opportunities' });

beforeEach(() => {
  listCareerJobs.mockReset();
});

describe('dashboard chart tabs', () => {
  it('has Learning Time and Sessions, and no Applications tab', async () => {
    listCareerJobs.mockResolvedValue(page([]));
    renderDashboard();
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Learning Time', 'Sessions']);
  });

  it('shows Total, Daily Average and Peak Day for learning time', async () => {
    listCareerJobs.mockResolvedValue(page([]));
    renderDashboard();
    expect(await screen.findByText('Peak Day')).toBeInTheDocument();
    expect(screen.getByText('20m')).toBeInTheDocument(); // max of 10, 20
    expect(screen.getByText('15m')).toBeInTheDocument(); // average
  });
});

describe('Featured Opportunities', () => {
  it('shows the three newest careers jobs with real values', async () => {
    listCareerJobs.mockResolvedValue(
      page([
        job({}),
        job({ jobId: 'j2', title: 'Data Analyst', companyName: 'Meridian', workplaceType: 'REMOTE', location: 'New York, NY', interviewPayer: 'CANDIDATE', interviewDurationMinutes: 30, salaryPeriod: 'HOUR', salaryMin: 40, salaryMax: 55 }),
        job({ jobId: 'j3', title: 'PM, Growth' }),
        job({ jobId: 'j4', title: 'Fourth Job' }),
      ]),
    );
    renderDashboard();

    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument();
    expect(listCareerJobs).toHaveBeenCalledWith({ page: 0 });
    const s = within(section());
    expect(s.queryByText('Fourth Job')).not.toBeInTheDocument();
    expect(s.getAllByText('View details')).toHaveLength(3);

    // Card 1: employer-sponsored
    expect(s.getAllByText('Acme Robotics')).toHaveLength(2);
    expect(s.getAllByText('Partner Job')).toHaveLength(3);
    expect(s.getAllByText('Austin, TX · Hybrid')).toHaveLength(2);
    expect(s.getAllByText('$120,000 – $155,500/yr')).toHaveLength(2);
    expect(s.getAllByText('20 min · Free')).toHaveLength(2);
    expect(s.getAllByText('Closes Nov 1, 2026')).toHaveLength(3);
    // Card 2: candidate-paid, hourly
    expect(s.getByText('New York, NY · Remote')).toBeInTheDocument();
    expect(s.getByText('$40 – $55/hr')).toBeInTheDocument();
    expect(s.getByText('30 min · 30 credits')).toBeInTheDocument();
    // Sample copy until the API has a recommendation reason
    expect(s.getAllByText('Why recommended')).toHaveLength(3);
    expect(s.getByText(/SQL proficiency/)).toBeInTheDocument();
  });

  it('links to the job and to the full list', async () => {
    listCareerJobs.mockResolvedValue(page([job({ jobId: 'job 7' })]));
    renderDashboard();
    await screen.findByText('Backend Engineer');

    fireEvent.click(within(section()).getByRole('button', { name: /View details/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/opportunities/job/job%207');
    fireEvent.click(within(section()).getByRole('button', { name: /View all opportunities/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/opportunities');
  });

  it('says so when there are no open roles', async () => {
    listCareerJobs.mockResolvedValue(page([]));
    renderDashboard();
    expect(await screen.findByText('No open roles right now. Check back soon.')).toBeInTheDocument();
  });

  it('says so when the jobs fail to load', async () => {
    listCareerJobs.mockRejectedValue(new Error('500'));
    renderDashboard();
    expect(await screen.findByText("We couldn't load open roles. Refresh to try again.")).toBeInTheDocument();
  });
});
