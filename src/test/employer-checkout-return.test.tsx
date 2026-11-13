import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as employerApi from '@/pages/employer/employerApi';
import { EmployerApp } from '@/pages/employer/EmployerApp';
import { apiJob } from './employer-fixtures';

// Stripe returns every employer purchase to /employer/credits?checkout=…&jobId=….
// Report Credits bought from the board (marked in sessionStorage) go back to
// that job's board; Interview Credits (the wizard) reopen the wizard.

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/pages/employer/employerApi', async (orig) => ({
  ...(await orig<object>()),
  getOrganization: vi.fn(),
  getCredits: vi.fn(),
  getNewApplicationsCount: vi.fn(),
  getBoardSummary: vi.fn(),
  listBoardCandidates: vi.fn(),
  listApplicationsJobs: vi.fn(),
  recordBoardVisit: vi.fn(),
  getJob: vi.fn(),
  getPublishCheck: vi.fn(),
}));
const api = vi.mocked(employerApi);

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/employer/*" element={<EmployerApp />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // jsdom has no element.scrollTo (the store scrolls <main> on navigation).
  Element.prototype.scrollTo = vi.fn() as unknown as Element['scrollTo'];
  localStorage.setItem(
    'screna_employer_session',
    JSON.stringify({ email: 'alex@lumen.io', domain: 'lumen.io', name: 'Alex Jordan', title: 'Recruiter', companyName: 'Lumen Metrics', signedInAt: '', accessToken: 'a.b.c', refreshToken: 'r' }),
  );
  sessionStorage.clear();
  api.getOrganization.mockRejectedValue(new Error('offline'));
  api.getCredits.mockResolvedValue({ interview: 10, report: 14 });
  api.getNewApplicationsCount.mockResolvedValue(0);
  api.listApplicationsJobs.mockResolvedValue({ counts: { active: 0, closed: 0, total: 0 }, items: [], pageMeta: { pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0, first: true, last: true } });
  api.getBoardSummary.mockResolvedValue({
    job: { id: 'job-1', title: 'Backend Engineer', status: 'OPEN', closesAt: null, closedAt: null, timezone: 'America/Chicago' },
    rankingUpdatedAt: null,
    cards: { applications: 0, notCompleted: 0, interviewsCompleted: 0, completedLast7Days: 0, reportsUnlocked: 0, reportCreditsRemaining: 14, movedForward: 0, movedForwardContacted: 0, rejected: 0 },
    inProgressCount: 0,
  });
  api.listBoardCandidates.mockResolvedValue({ content: [], pageMeta: { pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0, first: true, last: true } });
  api.recordBoardVisit.mockResolvedValue(undefined);
  api.getJob.mockResolvedValue(apiJob({ status: 'OPEN' }));
});

describe('Stripe return', () => {
  it('Report Credits bought from the board return to that board', async () => {
    sessionStorage.setItem('screna_employer_report_checkout', 'job-1');
    renderAt('/employer/credits?checkout=success&jobId=job-1');
    expect(await screen.findByText('Application board')).toBeInTheDocument();
    await waitFor(() => expect(api.getBoardSummary).toHaveBeenCalledWith('job-1'));
    expect(api.getJob).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('screna_employer_report_checkout')).toBeNull();
  });

  it('Interview Credits (no board mark) reopen the job in the wizard', async () => {
    renderAt('/employer/credits?checkout=success&jobId=job-1');
    await waitFor(() => expect(api.getJob).toHaveBeenCalledWith('job-1'));
    expect(api.getBoardSummary).not.toHaveBeenCalled();
  });
});
