import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { toast } from 'sonner';
import * as employerApi from '@/pages/employer/employerApi';
import type { JobSuggestion } from '@/pages/employer/employerApi';
import { mockCompanies } from '@/components/admin/console/pages/employer/mockData';
import { EmployerSuggestedJobsView } from '@/pages/employer/EmployerSuggestedJobsView';
import { apiJob } from './employer-fixtures';

// Suggested jobs + one-click publish (#334, frontend-employer-job-suggestions-api.md).

const go = vi.fn();
vi.mock('@/components/admin/console/pages/employer/store', async (orig) => ({
  ...(await orig<object>()),
  useEmployerStore: () => ({ company: mockCompanies[0], go }),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/pages/employer/employerApi', async (orig) => ({
  ...(await orig<object>()),
  listJobSuggestions: vi.fn(),
  getJobSuggestion: vi.fn(),
  prepareJobSuggestion: vi.fn(),
  publishJobSuggestion: vi.fn(),
  draftJobSuggestion: vi.fn(),
}));
const api = vi.mocked(employerApi);

function apiError(errorCode: string, status: number, data?: unknown) {
  const err = new AxiosError('fail', String(status));
  err.response = { status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { status: 'ERROR', errorCode, data } };
  return err;
}

const sug = (status: JobSuggestion['preparation']['status'], missing: string[] = []): JobSuggestion => ({
  suggestionId: 'linkedin-4471933982',
  title: 'Data Engineer',
  location: 'Austin, TX',
  source: 'LinkedIn',
  postedAt: '2026-11-20T00:00:00Z',
  postingUrl: 'https://example.com/job',
  preparation: { status, missing },
});

const listOf = (items: JobSuggestion[]) => ({ items, pageMeta: { pageNumber: 0, pageSize: 10, totalElements: items.length, totalPages: 1, first: true, last: true } });

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Suggested jobs', () => {
  it('prepares, polls every 5 seconds until READY, then publishes', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    api.listJobSuggestions.mockResolvedValue(listOf([sug('NOT_PREPARED')]));
    api.prepareJobSuggestion.mockResolvedValue(sug('PREPARING'));
    api.getJobSuggestion.mockResolvedValueOnce(sug('PREPARING')).mockResolvedValueOnce(sug('READY'));
    api.publishJobSuggestion.mockResolvedValue({
      jobId: 'job-9',
      title: 'Data Engineer',
      status: 'OPEN',
      opensAt: '',
      closesAt: '',
      timezone: 'UTC',
      publishedAt: '',
      alreadyPublished: false,
    });
    render(<EmployerSuggestedJobsView />);

    fireEvent.click(await screen.findByRole('button', { name: 'Prepare' }));
    await waitFor(() => expect(api.prepareJobSuggestion).toHaveBeenCalledWith('linkedin-4471933982'));
    expect(await screen.findByText(/Preparing the posting/)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(api.getJobSuggestion).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(api.getJobSuggestion).toHaveBeenCalledTimes(2);

    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(api.publishJobSuggestion).toHaveBeenCalledWith('linkedin-4471933982'));
    expect(go).toHaveBeenCalledWith({ name: 'jobs' });
  });

  it('READY with missing fields offers only Edit first, which opens the draft in the wizard', async () => {
    api.listJobSuggestions.mockResolvedValue(listOf([sug('READY', ['salaryMin'])]));
    api.draftJobSuggestion.mockResolvedValue(apiJob({ id: 'draft-1' }));
    render(<EmployerSuggestedJobsView />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit first' }));
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    await waitFor(() => expect(go).toHaveBeenCalledWith({ name: 'wizard', jobId: 'draft-1' }));
  });

  it('an incomplete company profile points to the profile', async () => {
    api.listJobSuggestions.mockResolvedValue(listOf([sug('READY')]));
    api.publishJobSuggestion.mockRejectedValue(apiError('ORGANIZATION_PROFILE_INCOMPLETE', 400, { missingFields: ['logo'] }));
    render(<EmployerSuggestedJobsView />);

    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Complete your company profile first/), expect.anything()));
    // Nothing was created: the suggestion stays.
    expect(screen.getByText('Data Engineer')).toBeInTheDocument();
  });

  it('an org without a linked trial code sees an empty state', async () => {
    api.listJobSuggestions.mockResolvedValue(listOf([]));
    render(<EmployerSuggestedJobsView />);
    expect(await screen.findByText('No suggested jobs')).toBeInTheDocument();
  });
});
