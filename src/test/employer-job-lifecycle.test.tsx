import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import * as employerApi from '@/pages/employer/employerApi';
import type { JobList, JobListItem } from '@/pages/employer/employerApi';
import { mockCompanies } from '@/components/admin/console/pages/employer/mockData';
import { CreditsContext } from '@/pages/employer/creditsContext';
import { EmployerJobsView } from '@/pages/employer/EmployerJobsView';
import { apiJob } from './employer-fixtures';

// After publishing (#299, PM 2026-11-02): Edit sponsorship raises the limit or
// changes what happens when it runs out; Close job also closes a job that
// sponsorship already closed, so applicants can no longer start.

vi.mock('@/components/admin/console/pages/employer/store', async (orig) => ({
  ...(await orig<object>()),
  useEmployerStore: () => ({ company: mockCompanies[0], go: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/pages/employer/employerApi', async (orig) => ({
  ...(await orig<object>()),
  listJobs: vi.fn(),
  getJob: vi.fn(),
  saveSponsorship: vi.fn(),
  closeJob: vi.fn(),
}));

const api = vi.mocked(employerApi);

const ACTIONS = { continueDraft: false, delete: false, editPosting: true, changeWindow: true, close: true, reopen: false, editSponsorship: true };

function item(over: Partial<JobListItem> = {}): JobListItem {
  return {
    jobId: 'job-1',
    title: 'Backend Engineer',
    status: 'OPEN',
    wizardStep: 4,
    location: 'Remote',
    workplaceType: 'REMOTE',
    opensAt: null,
    closesAt: '2026-12-01T00:00:00Z',
    closedAt: null,
    closeReason: null,
    timezone: 'America/Chicago',
    publishedAt: '2026-10-28T00:00:00Z',
    applicationCount: 3,
    completedCount: 1,
    unlockedCount: 0,
    updatedAt: '2026-10-28T00:00:00Z',
    actions: ACTIONS,
    ...over,
  };
}

function lists(job: JobListItem) {
  api.listJobs.mockImplementation(async ({ status }): Promise<JobList> => {
    const items = (status === 'CLOSED') === (job.status === 'CLOSED') && status !== 'DRAFT' ? [job] : [];
    return { counts: { draft: 0, active: 1, closed: 0, total: 1 }, items, pageMeta: { pageNumber: 0, pageSize: 10, totalElements: items.length, totalPages: 1, first: true, last: true } };
  });
}

const sponsored = (used: number, max = 50, when: 'KEEP_ACCEPTING' | 'CLOSE_JOB' = 'KEEP_ACCEPTING') =>
  apiJob({ status: 'OPEN', sponsorship: { maxSponsoredCandidates: max, whenLimitReached: when, sponsoredCount: used } }, 'EMPLOYER');

function renderJobs(interviewCredits = 5) {
  return render(
    <CreditsContext.Provider value={{ credits: { interview: interviewCredits, report: 0 }, refresh: () => {} }}>
      <EmployerJobsView />
    </CreditsContext.Provider>,
  );
}

const dialog = () => within(screen.getByRole('dialog'));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Edit sponsorship', () => {
  it('shows usage on the card and only offers what actions allow', async () => {
    lists(item({ actions: { ...ACTIONS, editSponsorship: false, close: false } }));
    api.getJob.mockResolvedValue(sponsored(12));
    renderJobs();
    expect(await screen.findByText('Recruiter-sponsored · 12 of 50 used')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit sponsorship' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close job' })).not.toBeInTheDocument();
  });

  it("won't lower the limit, and sends the current after-limit choice when it isn't touched", async () => {
    lists(item());
    api.getJob.mockResolvedValue(sponsored(12, 50, 'CLOSE_JOB'));
    api.saveSponsorship.mockResolvedValue(sponsored(12, 80, 'CLOSE_JOB'));
    renderJobs();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit sponsorship' }));
    const input = await dialog().findByLabelText('Maximum sponsored candidates');
    expect(input).toHaveValue('50');
    expect(dialog().getByRole('radio', { name: /Close the job automatically/ })).toHaveAttribute('aria-checked', 'true');

    fireEvent.change(input, { target: { value: '40' } });
    fireEvent.click(dialog().getByRole('button', { name: 'Save sponsorship' }));
    expect(dialog().getByText("Can't be lower than the current limit of 50")).toBeInTheDocument();
    expect(api.saveSponsorship).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '80' } });
    fireEvent.click(dialog().getByRole('button', { name: 'Save sponsorship' }));
    await waitFor(() => expect(api.saveSponsorship).toHaveBeenCalledWith('job-1', { interviewPayer: 'EMPLOYER', maxSponsoredCandidates: 80, whenLimitReached: 'CLOSE_JOB' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('warns that CLOSE_JOB closes the job at once when every sponsored spot is used', async () => {
    lists(item());
    api.getJob.mockResolvedValue(sponsored(50));
    renderJobs();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit sponsorship' }));
    await dialog().findByLabelText('Maximum sponsored candidates');
    expect(screen.queryByText(/will close as soon as you save/)).not.toBeInTheDocument();
    fireEvent.click(dialog().getByRole('radio', { name: /Close the job automatically/ }));
    expect(dialog().getByText('All sponsored interviews are used, so the job will close as soon as you save.')).toBeInTheDocument();
    // Raising the limit makes room again.
    fireEvent.change(dialog().getByLabelText('Maximum sponsored candidates'), { target: { value: '60' } });
    expect(screen.queryByText(/will close as soon as you save/)).not.toBeInTheDocument();
  });

  it('warns the same with no Interview Credits', async () => {
    lists(item());
    api.getJob.mockResolvedValue(sponsored(3));
    renderJobs(0);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit sponsorship' }));
    await dialog().findByLabelText('Maximum sponsored candidates');
    fireEvent.click(dialog().getByRole('radio', { name: /Close the job automatically/ }));
    expect(dialog().getByText('You have no Interview Credits, so the job will close as soon as you save.')).toBeInTheDocument();
  });
});

describe('Close job', () => {
  it('a job closed when sponsorship ran out says so and can be closed again', async () => {
    lists(item({ status: 'CLOSED', closeReason: 'SPONSORSHIP_EXHAUSTED', actions: { ...ACTIONS, editPosting: false, changeWindow: false, reopen: true } }));
    api.getJob.mockResolvedValue(sponsored(50));
    api.closeJob.mockResolvedValue(apiJob({ status: 'CLOSED' }));
    renderJobs();
    expect(await screen.findByText('Closed automatically when sponsored interviews ran out. Applicants can still start their interviews.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close job' }));
    expect(dialog().getByText(/Closing it stops anyone who hasn't started/)).toBeInTheDocument();
    fireEvent.click(dialog().getByRole('button', { name: 'Close job' }));
    await waitFor(() => expect(api.closeJob).toHaveBeenCalledWith('job-1'));
  });

  it('shows why a job closed', async () => {
    lists(item({ status: 'CLOSED', closeReason: 'MANUAL', actions: { ...ACTIONS, close: false, editSponsorship: false } }));
    api.getJob.mockResolvedValue(apiJob({ status: 'CLOSED' }));
    renderJobs();
    expect(await screen.findByText('Closed by your team.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close job' })).not.toBeInTheDocument();
  });
});
