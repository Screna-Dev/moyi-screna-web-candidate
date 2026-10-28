import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AxiosError, AxiosHeaders } from 'axios';
import type { CareerApplication, CareerInterviewSession } from '@/services/careersApi';
import { createUserPlanMock } from '@/test/utils';
import { StartInterviewDialog, useCareerInterviewStarter } from '@/components/newDesign/opportunities/careersShared';
import { isBeingScored, markInterviewEnded } from '@/components/newDesign/opportunities/careersEnded';
import { toMyJob } from '@/components/newDesign/opportunities/careersDesignData';
import { CareerInterviewPage } from '@/pages/newDesign/opportunities/CareerInterviewPage';

// Careers guide (backend docs/frontend-careers-api.md): starting an interview
// can return RESUME_REQUIRED (nothing charged → re-upload); while a finished
// interview is scored it still reads IN_PROGRESS with canStartInterview, so
// the frontend hides "Continue interview" itself.

const mockNavigate = vi.fn();
vi.mock('react-router', async (orig) => ({
  ...(await orig<object>()),
  useNavigate: () => mockNavigate,
}));
vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => createUserPlanMock() }));
vi.mock('@/services/ProfileServices', () => ({ uploadResumeAndWait: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/hooks/useResumeUploaded', () => ({ emitResumeUploaded: vi.fn() }));
vi.mock('@/components/newDesign/live-interview', () => ({
  LiveInterview: ({ onEnd }: { onEnd: () => void }) => <button onClick={onEnd}>End interview</button>,
}));
vi.mock('@/components/newDesign/video-interview', () => ({ VideoInterview: () => null }));

const api = vi.hoisted(() => ({
  startCareerInterview: vi.fn(),
  endCareerInterview: vi.fn(),
  getMyApplication: vi.fn(),
  applyToJob: vi.fn(),
}));
vi.mock('@/services/careersApi', async (orig) => ({ ...(await orig<object>()), ...api }));

function app(over: Partial<CareerApplication> = {}): CareerApplication {
  return {
    applicationId: 'app-1',
    jobId: 'job-1',
    jobTitle: 'Backend Engineer',
    companyName: 'Lumen Metrics',
    companyLogoUrl: null,
    jobStatus: 'OPEN',
    closesAt: null,
    timezone: 'America/Chicago',
    appliedAt: '2026-10-28T00:00:00Z',
    interviewStatus: 'NOT_STARTED',
    interviewCompletedAt: null,
    interviewDurationMinutes: 20,
    interviewLanguage: 'en',
    questionCount: 3,
    interviewPayer: 'EMPLOYER',
    canStartInterview: true,
    ...over,
  };
}

const session: CareerInterviewSession = { assessmentId: 'a', sessionId: 's', url: 'wss://x', token: 't', roomName: 'r', maxInterviewDuration: 20, resumed: false };

function apiError(errorCode: string, status = 400) {
  const err = new AxiosError('fail', String(status));
  err.response = { status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { status: 'ERROR', errorCode } };
  return err;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  Object.values(api).forEach((f) => f.mockReset());
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── RESUME_REQUIRED when starting ────────────────────────────────────────────

describe('start interview: RESUME_REQUIRED', () => {
  it('asks for the resume again, then starts once it is uploaded', async () => {
    api.startCareerInterview.mockRejectedValueOnce(apiError('RESUME_REQUIRED')).mockResolvedValueOnce(session);
    render(<StartInterviewDialog app={app()} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start AI interview' }));
    expect(await screen.findByText('Upload your resume again')).toBeInTheDocument();
    expect(screen.getByText(/Nothing was charged/)).toBeInTheDocument();

    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'cv.pdf', { type: 'application/pdf' })] } });

    await waitFor(() => expect(api.startCareerInterview).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/opportunities/applications/app-1/interview', expect.anything()));
  });
});

// ─── Scoring window ───────────────────────────────────────────────────────────

describe('after ending, "Continue interview" is hidden while scoring', () => {
  const labels = (a: CareerApplication) => toMyJob(a, 0).actions.map((x) => x.label);

  it('offers Continue for an interview in progress that was not ended here', () => {
    expect(labels(app({ interviewStatus: 'IN_PROGRESS' }))).toContain('Continue interview');
  });

  it('hides it once this browser ended the interview', () => {
    markInterviewEnded('app-1');
    const a = app({ interviewStatus: 'IN_PROGRESS' });
    expect(isBeingScored(a)).toBe(true);
    expect(labels(a)).toEqual(['View details']);
    expect(toMyJob(a, 0).creditInfo).toBeUndefined();
  });

  it('the mark expires after 30 minutes and never applies to other statuses', () => {
    localStorage.setItem('careerInterviewEnded:app-1', String(Date.now() - 31 * 60_000));
    expect(isBeingScored(app({ interviewStatus: 'IN_PROGRESS' }))).toBe(false);
    markInterviewEnded('app-1');
    expect(isBeingScored(app({ interviewStatus: 'NOT_STARTED' }))).toBe(false);
    expect(labels(app({ interviewStatus: 'NOT_STARTED' }))).toContain('Start interview');
  });

  it('the job page’s start button says it is processing instead of rejoining', async () => {
    markInterviewEnded('app-1');
    api.applyToJob.mockResolvedValue(app({ interviewStatus: 'IN_PROGRESS' }));
    function Harness() {
      const starter = useCareerInterviewStarter();
      return (
        <>
          <button onClick={() => void starter.begin('job-1')}>Quick interview</button>
          {starter.ui}
        </>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Quick interview' }));
    expect(await screen.findByText("We're processing your interview. Check My Jobs in a few minutes.")).toBeInTheDocument();
    expect(screen.queryByText('Rejoin your interview')).not.toBeInTheDocument();
  });
});

// ─── Interview room ───────────────────────────────────────────────────────────

function renderRoom(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/opportunities/applications/app-1/interview', state }]}>
      <Routes>
        <Route path="/opportunities/applications/:applicationId/interview" element={<CareerInterviewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('interview room', () => {
  it('marks the interview as ended, then clears the mark when the result arrives', async () => {
    api.endCareerInterview.mockResolvedValue(undefined);
    let marked: boolean | null = null;
    api.getMyApplication.mockImplementation(async () => {
      marked ??= isBeingScored(app({ interviewStatus: 'IN_PROGRESS' }));
      return app({ interviewStatus: 'COMPLETED', canStartInterview: false });
    });
    renderRoom({ session, video: false, title: 'Backend Engineer', minutes: 20 });

    fireEvent.click(screen.getByRole('button', { name: 'End interview' }));
    expect(await screen.findByText('Interview complete')).toBeInTheDocument();
    expect(api.endCareerInterview).toHaveBeenCalledWith('app-1');
    expect(marked).toBe(true);
    expect(localStorage.getItem('careerInterviewEnded:app-1')).toBeNull();
  });

  it('a reload during scoring keeps waiting instead of rejoining', async () => {
    markInterviewEnded('app-1');
    api.getMyApplication
      .mockResolvedValueOnce(app({ interviewStatus: 'IN_PROGRESS' }))
      .mockResolvedValue(app({ interviewStatus: 'COMPLETED', canStartInterview: false }));
    renderRoom();

    expect(await screen.findByText('Interview complete', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(api.startCareerInterview).not.toHaveBeenCalled();
  }, 10_000);

  it('an attempt that did not count says so and clears the mark', async () => {
    api.endCareerInterview.mockResolvedValue(undefined);
    api.getMyApplication.mockResolvedValue(app({ interviewStatus: 'NOT_STARTED' }));
    renderRoom({ session, video: false, title: 'Backend Engineer', minutes: 20 });

    fireEvent.click(screen.getByRole('button', { name: 'End interview' }));
    expect(await screen.findByText(/This attempt didn't count/)).toBeInTheDocument();
    expect(localStorage.getItem('careerInterviewEnded:app-1')).toBeNull();
  });

  it('after 2 minutes without a result it says "submitted", not "complete"', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    api.endCareerInterview.mockResolvedValue(undefined);
    api.getMyApplication.mockResolvedValue(app({ interviewStatus: 'IN_PROGRESS' }));
    renderRoom({ session, video: false, title: 'Backend Engineer', minutes: 20 });

    fireEvent.click(screen.getByRole('button', { name: 'End interview' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(125_000);
    });
    expect(screen.getByText('Interview submitted')).toBeInTheDocument();
    expect(screen.getByText("We're still processing your interview. Check My Jobs in a few minutes.")).toBeInTheDocument();
    expect(screen.queryByText('Interview complete')).not.toBeInTheDocument();
    // Still scoring, so My Jobs keeps "Continue" hidden.
    expect(localStorage.getItem('careerInterviewEnded:app-1')).not.toBeNull();
  });
});
