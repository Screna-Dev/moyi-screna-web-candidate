import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AxiosError, AxiosHeaders } from 'axios';
import type { CareerApplication, CareerInterviewResult } from '@/services/careersApi';
import { InterviewResultPage } from '@/pages/newDesign/opportunities/InterviewResultPage';
import { toMyJob } from '@/components/newDesign/opportunities/careersDesignData';

// The candidate's own result (#303): real values only. A section the API has
// nothing for is hidden, never filled with the design's samples (backend 11-12).

const api = vi.hoisted(() => ({ getMyInterviewResult: vi.fn(), getMyApplication: vi.fn() }));
vi.mock('@/services/careersApi', async (orig) => ({ ...(await orig<object>()), ...api }));

const RESULT: CareerInterviewResult = {
  applicationId: 'app-1',
  jobId: 'job-1',
  jobTitle: 'Platform Engineer',
  companyName: 'Acme',
  interviewCompletedAt: '2026-11-02T10:00:00Z',
  overallScore: 77,
  criteria: [
    { name: 'Resume & Background', score: 70 },
    { name: 'SQL Proficiency', score: 91 },
  ],
  summary: 'Solid backend fundamentals.',
  strengths: ['Clear trade-offs'],
  areasToStrengthen: [],
};

function app(over: Partial<CareerApplication> = {}): CareerApplication {
  return {
    applicationId: 'app-1', jobId: 'job-1', jobTitle: 'Platform Engineer', companyName: 'Acme', companyLogoUrl: null,
    jobStatus: 'OPEN', closesAt: null, timezone: null, appliedAt: '2026-11-01T00:00:00Z',
    interviewStatus: 'COMPLETED', interviewCompletedAt: '2026-11-02T10:00:00Z', interviewDurationMinutes: 20,
    interviewLanguage: 'en', questionCount: 3, interviewPayer: 'EMPLOYER', canStartInterview: false, hiringDecision: 'AWAITING',
    ...over,
  };
}

function apiError(errorCode: string, status: number) {
  const err = new AxiosError('fail', String(status));
  err.response = { status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { errorCode } };
  return err;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/opportunities/applications/app-1/results']}>
      <Routes>
        <Route path="/opportunities/applications/:applicationId/results" element={<InterviewResultPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.getMyApplication.mockResolvedValue(app());
});

describe('interview result page', () => {
  it('shows the real score, criteria, summary and status, and no samples where the API has nothing', async () => {
    api.getMyInterviewResult.mockResolvedValue(RESULT);
    renderPage();
    expect(await screen.findByText('Platform Engineer · Acme')).toBeInTheDocument();
    expect(screen.getAllByText('77/100')).toHaveLength(2);
    expect(screen.getByText('SQL Proficiency')).toBeInTheDocument();
    expect(screen.getByText('91/100')).toBeInTheDocument();
    expect(screen.getByText('Solid backend fundamentals.')).toBeInTheDocument();
    expect(screen.getByText('Clear trade-offs')).toBeInTheDocument();
    // Empty areas / no questions → hidden, no sample list.
    expect(screen.queryByText('Areas to strengthen')).toBeNull();
    expect(screen.queryByText('State assumptions before presenting a solution.')).toBeNull();
    expect(screen.queryByText('Question-by-question feedback')).toBeNull();
    // No criterion feedback text, qualification, contact or shared-report copy.
    expect(screen.queryByText(/Strong understanding of idempotency/)).toBeNull();
    expect(screen.queryByText(/Qualified|qualified/)).toBeNull();
    expect(screen.queryByText(/Contact recruiter|Email status|Contact eligibility/)).toBeNull();
    expect(screen.queryByText(/shared report/)).toBeNull();
    // A completed interview awaiting a decision reads "Recommended".
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(api.getMyInterviewResult).toHaveBeenCalledWith('app-1');
  });

  it('Download PDF opens the print dialog', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    api.getMyInterviewResult.mockResolvedValue(RESULT);
    renderPage();
    (await screen.findByRole('button', { name: 'Download PDF' })).click();
    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });

  it('standingStatus TOO_FEW_CANDIDATES says so and does not poll (#324)', async () => {
    api.getMyInterviewResult.mockResolvedValue({ ...RESULT, standing: null, standingStatus: 'TOO_FEW_CANDIDATES' });
    renderPage();
    expect(await screen.findByText(/once more candidates finish/)).toBeInTheDocument();
    expect(api.getMyInterviewResult).toHaveBeenCalledTimes(1);
  });

  it('standingStatus PENDING polls until ranked (#324)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      api.getMyInterviewResult
        .mockResolvedValueOnce({ ...RESULT, standing: null, standingStatus: 'PENDING' })
        .mockResolvedValueOnce({ ...RESULT, standing: null, standingStatus: 'PENDING' })
        .mockResolvedValue({ ...RESULT, standing: { rank: 3, rankedCandidates: 12, topPercent: null, pointsBehindTop5: null }, standingStatus: 'RANKED' });
      renderPage();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText('Updating your ranking…')).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });
      expect(screen.getByText('#3 of 12')).toBeInTheDocument();
      const calls = api.getMyInterviewResult.mock.calls.length;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(api.getMyInterviewResult.mock.calls.length).toBe(calls);
    } finally {
      vi.useRealTimers();
    }
  });

  it('standingStatus PENDING stops after the limit and says it updates soon (#324)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      api.getMyInterviewResult.mockResolvedValue({ ...RESULT, standing: null, standingStatus: 'PENDING' });
      renderPage();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(screen.getByText('Your ranking updates soon.')).toBeInTheDocument();
      const calls = api.getMyInterviewResult.mock.calls.length;
      expect(calls).toBe(11); // first load + 10 polls
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(api.getMyInterviewResult.mock.calls.length).toBe(calls);
    } finally {
      vi.useRealTimers();
    }
  });

  it('409 while scoring: says so and keeps checking until the result is ready', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    api.getMyInterviewResult.mockRejectedValueOnce(apiError('INVALID_STATE', 409)).mockResolvedValue(RESULT);
    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText(/We're still scoring your interview/)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByText('Solid backend fundamentals.')).toBeInTheDocument();
    expect(api.getMyInterviewResult).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('404 says it cannot be found', async () => {
    api.getMyInterviewResult.mockRejectedValue(apiError('NOT_FOUND', 404));
    renderPage();
    expect(await screen.findByText("We couldn't find this result.")).toBeInTheDocument();
  });

  it('My Jobs shows a rejected application as not selected', () => {
    expect(toMyJob(app({ hiringDecision: 'REJECTED' })).applicationStatus).toBe('Not selected');
    expect(toMyJob(app()).applicationStatus).toBe('Applied');
  });
});
