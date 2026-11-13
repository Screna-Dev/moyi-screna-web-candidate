import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { CareerApplication } from '@/services/careersApi';
import { markInterviewEnded } from '@/components/newDesign/opportunities/careersEnded';
import { CareerResultWatcher } from '@/components/newDesign/opportunities/CareerResultWatcher';

// After an interview ends the candidate can go anywhere; the watcher keeps
// checking the application in the background and says when the result lands.

const api = vi.hoisted(() => ({ getMyApplication: vi.fn() }));
vi.mock('@/services/careersApi', async (orig) => ({ ...(await orig<object>()), ...api }));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
const auth = vi.hoisted(() => ({ isAuthenticated: true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

function app(over: Partial<CareerApplication> = {}): CareerApplication {
  return {
    applicationId: 'app-1', jobId: 'job-1', jobTitle: 'Platform Engineer', companyName: 'Acme', companyLogoUrl: null,
    jobStatus: 'OPEN', closesAt: null, timezone: null, appliedAt: '2026-11-01T00:00:00Z',
    interviewStatus: 'IN_PROGRESS', interviewCompletedAt: null, interviewDurationMinutes: 20,
    interviewLanguage: 'en', questionCount: 3, interviewPayer: 'EMPLOYER', canStartInterview: true,
    ...over,
  };
}

const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <CareerResultWatcher />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  auth.isAuthenticated = true;
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearInterval', 'Date'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('CareerResultWatcher', () => {
  it('makes no calls when no interview is waiting for a result', async () => {
    renderAt('/opportunities');
    await advance(30_000);
    expect(api.getMyApplication).not.toHaveBeenCalled();
  });

  it('checks in the background and says when the result is ready', async () => {
    markInterviewEnded('app-1');
    api.getMyApplication
      .mockResolvedValueOnce(app())
      .mockResolvedValue(app({ interviewStatus: 'COMPLETED', canStartInterview: false }));
    renderAt('/opportunities');

    await advance(0);
    expect(toast.success).not.toHaveBeenCalled();
    await advance(5000);
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success.mock.calls[0][0]).toBe('Your interview result for Platform Engineer is ready');
    expect(toast.success.mock.calls[0][1].action.label).toBe('View result');
    expect(localStorage.getItem('careerInterviewEnded:app-1')).toBeNull();

    // Settled: no more calls.
    const calls = api.getMyApplication.mock.calls.length;
    await advance(60_000);
    expect(api.getMyApplication.mock.calls.length).toBe(calls);
  });

  it('says so when the attempt did not count', async () => {
    markInterviewEnded('app-1');
    api.getMyApplication.mockResolvedValue(app({ interviewStatus: 'NOT_STARTED' }));
    renderAt('/opportunities/my-jobs');
    await advance(0);
    expect(toast).toHaveBeenCalledWith("Your interview for Platform Engineer didn't count", expect.anything());
  });

  it('a retake that ends without a result does not announce the old result (11-10)', async () => {
    markInterviewEnded('app-1', 1);
    // Back to COMPLETED, completedAttempts unchanged: the previous result stands.
    api.getMyApplication.mockResolvedValue(app({ interviewStatus: 'COMPLETED', completedAttempts: 1, bestScore: 70, canStartInterview: true }));
    renderAt('/opportunities');
    await advance(0);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("Your interview for Platform Engineer didn't count", expect.objectContaining({ description: expect.stringMatching(/previous result still stands/) }));
    expect(localStorage.getItem('careerInterviewEnded:app-1')).toBeNull();
  });

  it('a retake with a new result announces it', async () => {
    markInterviewEnded('app-1', 1);
    api.getMyApplication.mockResolvedValue(app({ interviewStatus: 'COMPLETED', completedAttempts: 2, canStartInterview: true }));
    renderAt('/opportunities');
    await advance(0);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('reads marks written before attempts were tracked', async () => {
    localStorage.setItem('careerInterviewEnded:app-1', String(Date.now()));
    api.getMyApplication.mockResolvedValue(app({ interviewStatus: 'COMPLETED', completedAttempts: 1 }));
    renderAt('/opportunities');
    await advance(0);
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it('checks every 5 s at first, then every 20 s after 3 minutes', async () => {
    markInterviewEnded('app-1');
    api.getMyApplication.mockResolvedValue(app());
    renderAt('/opportunities');
    await advance(0);
    await advance(60_000);
    expect(api.getMyApplication).toHaveBeenCalledTimes(13); // 0 s + every 5 s
    await advance(180_000);
    const at4min = api.getMyApplication.mock.calls.length;
    await advance(60_000);
    expect(api.getMyApplication.mock.calls.length - at4min).toBe(3);
  });

  it("leaves the interview alone while its own room or result page is open", async () => {
    markInterviewEnded('app-1');
    api.getMyApplication.mockResolvedValue(app());
    renderAt('/opportunities/applications/app-1/interview');
    await advance(30_000);
    expect(api.getMyApplication).not.toHaveBeenCalled();
  });

  it('does nothing when signed out', async () => {
    auth.isAuthenticated = false;
    markInterviewEnded('app-1');
    renderAt('/opportunities');
    await advance(30_000);
    expect(api.getMyApplication).not.toHaveBeenCalled();
  });
});
