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
import { CONSENT_VERSION } from '@/components/newDesign/opportunities/interviewConsent';

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
const quota = vi.hoisted(() => ({
  current: { plan: 'FREE', available: 2, grants: [], resetsAt: '2026-12-01T00:00:00Z' } as { plan: string; available: number; grants: unknown[]; resetsAt: string | null },
  startQuotaCheckout: vi.fn(),
}));
vi.mock('@/hooks/useInterviewQuota', () => ({
  useInterviewQuota: () => ({ quota: quota.current, loading: false, refresh: async () => quota.current }),
  fetchInterviewQuota: async () => quota.current,
  grantKeys: () => [],
  startQuotaCheckout: quota.startQuotaCheckout,
}));
vi.mock('@/services/ProfileServices', () => ({ uploadResumeAndWait: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/hooks/useResumeUploaded', () => ({ emitResumeUploaded: vi.fn() }));
vi.mock('@/components/newDesign/video-interview', () => ({
  VideoInterview: ({ onEnd }: { onEnd: () => void }) => <button onClick={onEnd}>End interview</button>,
}));

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

function apiError(errorCode: string, status = 400, data?: unknown) {
  const err = new AxiosError('fail', String(status));
  err.response = { status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { status: 'ERROR', errorCode, data } };
  return err;
}

// A camera + microphone stream for the device-check step (jsdom has none).
const getUserMedia = vi.fn();
function fakeStream() {
  const track = (kind: string) => ({ kind, stop: vi.fn() });
  const video = [track('video')];
  const audio = [track('audio')];
  return { getVideoTracks: () => video, getAudioTracks: () => audio, getTracks: () => [...video, ...audio] };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  Object.values(api).forEach((f) => f.mockReset());
  getUserMedia.mockReset().mockImplementation(async () => fakeStream());
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
});

afterEach(() => {
  vi.useRealTimers();
});

// Start → authorization step → agree → device check → start.
async function agreeAndStart() {
  fireEvent.click(screen.getByRole('button', { name: 'Start AI interview' }));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Agree and continue' }));
  await passDeviceCheck();
}

async function passDeviceCheck() {
  const start = await screen.findByRole('button', { name: 'Start interview' });
  await waitFor(() => expect(start).toBeEnabled());
  fireEvent.click(start);
}

// ─── Authorization before every interview ─────────────────────────────────────

describe('start interview: authorization', () => {
  it('asks for consent before starting, and starts only after agreeing', async () => {
    api.startCareerInterview.mockResolvedValueOnce(session);
    render(<StartInterviewDialog app={app()} onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start AI interview' }));
    expect(screen.getByText('Before your interview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agree and continue' })).toBeDisabled();
    expect(api.startCareerInterview).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Agree and continue' }));
    expect(api.startCareerInterview).not.toHaveBeenCalled();
    await passDeviceCheck();
    await waitFor(() => expect(api.startCareerInterview).toHaveBeenCalledTimes(1));
  });

  it('asks again on every new dialog', () => {
    const { unmount } = render(<StartInterviewDialog app={app()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start AI interview' }));
    fireEvent.click(screen.getByRole('checkbox'));
    unmount();

    render(<StartInterviewDialog app={app()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start AI interview' }));
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});

// ─── Camera / microphone check ────────────────────────────────────────────────

describe('start interview: device check', () => {
  function toDeviceStep() {
    fireEvent.click(screen.getByRole('button', { name: 'Start AI interview' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Agree and continue' }));
  }

  it('comes after the authorization, captures camera + mic, and starts only from here', async () => {
    api.startCareerInterview.mockResolvedValueOnce(session);
    render(<StartInterviewDialog app={app()} onClose={() => {}} />);
    toDeviceStep();
    expect(screen.getByText('Check your camera and microphone')).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: expect.anything(), video: expect.anything() }));
    expect(await screen.findAllByText('Working')).toHaveLength(1);
    expect(api.startCareerInterview).not.toHaveBeenCalled();
    await passDeviceCheck();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/opportunities/applications/app-1/interview', expect.anything()));
  });

  it('blocked permission: explains, keeps start disabled, and Try again asks again', async () => {
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    render(<StartInterviewDialog app={app()} onClose={() => {}} />);
    toDeviceStep();
    expect(await screen.findByText(/Camera or microphone access is blocked/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start interview' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start interview' })).toBeEnabled());
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(api.startCareerInterview).not.toHaveBeenCalled();
  });

  it('no camera found: says so', async () => {
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error('none'), { name: 'NotFoundError' }));
    render(<StartInterviewDialog app={app()} onClose={() => {}} />);
    toDeviceStep();
    expect(await screen.findByText(/couldn't find a camera or microphone/)).toBeInTheDocument();
  });

  it('stops the test stream when leaving, and Back returns to the authorization', async () => {
    const stream = fakeStream();
    getUserMedia.mockResolvedValueOnce(stream);
    render(<StartInterviewDialog app={app()} onClose={() => {}} />);
    toDeviceStep();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start interview' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Before your interview')).toBeInTheDocument();
    stream.getTracks().forEach((t) => expect(t.stop).toHaveBeenCalled());
  });
});

describe('start interview: consent fields (#304)', () => {
  it('sends consentAccepted and the version with the start, and with the retry after a resume upload', async () => {
    api.startCareerInterview.mockRejectedValueOnce(apiError('RESUME_REQUIRED')).mockResolvedValueOnce(session);
    render(<StartInterviewDialog app={app()} onClose={() => {}} />);
    await agreeAndStart();
    await waitFor(() => expect(api.startCareerInterview).toHaveBeenCalledWith('app-1', { acceptSelfPay: false, consentVersion: CONSENT_VERSION }));
    const input = await waitFor(() => document.querySelector('input[type=file]') as HTMLInputElement);
    fireEvent.change(input, { target: { files: [new File(['x'], 'cv.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(api.startCareerInterview).toHaveBeenCalledTimes(2));
    expect(api.startCareerInterview).toHaveBeenLastCalledWith('app-1', { acceptSelfPay: false, consentVersion: CONSENT_VERSION });
  });

  it('INTERVIEW_CONSENT_REQUIRED goes back to the consent step', async () => {
    api.startCareerInterview.mockRejectedValueOnce(apiError('INTERVIEW_CONSENT_REQUIRED'));
    render(<StartInterviewDialog app={app()} onClose={() => {}} />);
    await agreeAndStart();
    expect(await screen.findByText('Please review and agree to the interview terms to continue.')).toBeInTheDocument();
    expect(screen.getByText('Before your interview')).toBeInTheDocument();
  });

  it('the version fits the 64-character limit', () => {
    expect(CONSENT_VERSION.length).toBeGreaterThan(0);
    expect(CONSENT_VERSION.length).toBeLessThanOrEqual(64);
  });
});

// ─── RESUME_REQUIRED when starting ────────────────────────────────────────────

describe('start interview: RESUME_REQUIRED', () => {
  it('asks for the resume again, then starts once it is uploaded', async () => {
    api.startCareerInterview.mockRejectedValueOnce(apiError('RESUME_REQUIRED')).mockResolvedValueOnce(session);
    render(<StartInterviewDialog app={app()} onClose={() => {}} />);

    await agreeAndStart();
    expect(await screen.findByText('Upload your resume again')).toBeInTheDocument();
    expect(screen.getByText(/Nothing was charged/)).toBeInTheDocument();

    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'cv.pdf', { type: 'application/pdf' })] } });

    await waitFor(() => expect(api.startCareerInterview).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/opportunities/applications/app-1/interview', expect.anything()));
  });
});

// ─── Sponsorship ran out (#297, data shape from #298) ─────────────────────────

describe('start interview: sponsorship ran out', () => {
  it('asks to use one of their interviews, then starts again with acceptSelfPay', async () => {
    api.startCareerInterview
      .mockRejectedValueOnce(apiError('SELF_PAY_CONFIRMATION_REQUIRED', 409, { interviewsRequired: 1, interviewsAvailable: 4 }))
      .mockResolvedValueOnce(session);
    render(<StartInterviewDialog app={app()} onClose={() => {}} />);

    await agreeAndStart();
    expect(await screen.findByText('Sponsored interviews have run out')).toBeInTheDocument();
    expect(screen.getByText('1 interview (4 left)')).toBeInTheDocument();
    expect(api.startCareerInterview).toHaveBeenLastCalledWith('app-1', { acceptSelfPay: false, consentVersion: CONSENT_VERSION });
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Use 1 interview and start' }));
    await waitFor(() => expect(api.startCareerInterview).toHaveBeenLastCalledWith('app-1', { acceptSelfPay: true, consentVersion: CONSENT_VERSION }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/opportunities/applications/app-1/interview', expect.anything()));
  });

  it('with none left, skips the confirmation and shows how to get more', async () => {
    api.startCareerInterview.mockRejectedValueOnce(apiError('SELF_PAY_CONFIRMATION_REQUIRED', 409, { interviewsRequired: 1, interviewsAvailable: 0 }));
    render(<StartInterviewDialog app={app()} onClose={() => {}} />);
    await agreeAndStart();
    expect(await screen.findByText("You've used this month's interviews")).toBeInTheDocument();
    expect(screen.queryByText('Sponsored interviews have run out')).not.toBeInTheDocument();
  });

  it('shows the cost from interviewFunding, not the employer setting', () => {
    render(<StartInterviewDialog app={app({ interviewPayer: 'EMPLOYER', interviewFunding: 'CANDIDATE' })} onClose={() => {}} />);
    expect(screen.getByText('1 interview')).toBeInTheDocument();
    expect(screen.getByText('Interviews left')).toBeInTheDocument();
    expect(screen.queryByText('Free · sponsored by recruiter')).not.toBeInTheDocument();
  });
});

// ─── Interview quota (#298, change C9) ────────────────────────────────────────

describe('start interview: no interviews left', () => {
  it('Free: says when new interviews arrive and points at the Pro plans', async () => {
    api.startCareerInterview.mockRejectedValueOnce(apiError('INSUFFICIENT_INTERVIEW_QUOTA', 403, { plan: 'FREE', available: 0, resetsAt: '2026-12-01T00:00:00Z' }));
    render(<StartInterviewDialog app={app({ interviewPayer: 'CANDIDATE' })} onClose={() => {}} />);
    await agreeAndStart();
    expect(await screen.findByText("You've used this month's interviews")).toBeInTheDocument();
    expect(screen.getByText('Dec 1, 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'See Pro plans' }));
    expect(mockNavigate).toHaveBeenCalledWith('/plans');
  });

  it('Pro: offers an add-on checkout', async () => {
    quota.startQuotaCheckout.mockReturnValue(new Promise(() => {}));
    api.startCareerInterview.mockRejectedValueOnce(apiError('INSUFFICIENT_INTERVIEW_QUOTA', 403, { plan: 'PRO', available: 0 }));
    render(<StartInterviewDialog app={app({ interviewPayer: 'CANDIDATE' })} onClose={() => {}} />);
    await agreeAndStart();
    expect(await screen.findByText("You're out of interviews")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Buy more interviews' }));
    await waitFor(() => expect(quota.startQuotaCheckout).toHaveBeenCalledWith('interview-add-on'));
    expect(screen.getByRole('button', { name: 'Opening checkout…' })).toBeDisabled();
  });

  it('is video only: no voice / video choice, and the start sends no mode', async () => {
    api.startCareerInterview.mockResolvedValueOnce(session);
    render(<StartInterviewDialog app={app({ interviewPayer: 'CANDIDATE' })} onClose={() => {}} />);
    expect(screen.queryByText('Voice interview')).not.toBeInTheDocument();
    expect(screen.queryByText('Video interview')).not.toBeInTheDocument();
    expect(screen.getByText(/It's a video interview/)).toBeInTheDocument();
    await agreeAndStart();
    await waitFor(() => expect(api.startCareerInterview).toHaveBeenCalledWith('app-1', { acceptSelfPay: true, consentVersion: CONSENT_VERSION }));
  });
});

describe('retake', () => {
  it('a retake on a sponsored job is candidate-paid: the start sends acceptSelfPay', async () => {
    api.startCareerInterview.mockResolvedValueOnce(session);
    render(<StartInterviewDialog app={app({ interviewStatus: 'COMPLETED', interviewFunding: 'EMPLOYER', retakeAvailability: 'AVAILABLE' })} onClose={() => {}} />);
    await agreeAndStart();
    await waitFor(() => expect(api.startCareerInterview).toHaveBeenCalledWith('app-1', { acceptSelfPay: true, consentVersion: CONSENT_VERSION }));
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
  // Ending never blocks: the room says "submitted" at once and the candidate
  // can leave; while it stays open it keeps checking (every 4 s).
  const poll = async (ms = 4000) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  };

  it('releases the candidate at once, then shows the result when it lands', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    api.endCareerInterview.mockResolvedValue(undefined);
    api.getMyApplication
      .mockResolvedValueOnce(app({ interviewStatus: 'IN_PROGRESS' }))
      .mockResolvedValue(app({ interviewStatus: 'COMPLETED', canStartInterview: false }));
    renderRoom({ session, title: 'Backend Engineer', minutes: 20 });

    fireEvent.click(screen.getByRole('button', { name: 'End interview' }));
    await poll(0);
    expect(api.endCareerInterview).toHaveBeenCalledWith('app-1');
    expect(screen.getByText('Interview submitted')).toBeInTheDocument();
    expect(screen.getByText(/you don't need to wait here/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to My Jobs' })).toBeInTheDocument();
    expect(isBeingScored(app({ interviewStatus: 'IN_PROGRESS' }))).toBe(true);

    await poll(); // still scoring
    expect(screen.getByText('Interview submitted')).toBeInTheDocument();
    await poll(); // done
    expect(screen.getByText('Your result is ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View result' })).toBeInTheDocument();
    expect(localStorage.getItem('careerInterviewEnded:app-1')).toBeNull();
  });

  it('a reload rejoins with the consent, without asking again (#304)', async () => {
    api.getMyApplication.mockResolvedValue(app({ interviewStatus: 'IN_PROGRESS' }));
    api.startCareerInterview.mockResolvedValue({ ...session, resumed: true, maxInterviewDuration: null });
    renderRoom();
    await waitFor(() => expect(api.startCareerInterview).toHaveBeenCalledWith('app-1', { consentVersion: CONSENT_VERSION }));
    expect(screen.queryByText('Before your interview')).not.toBeInTheDocument();
  });

  it('a reload during scoring shows "submitted" instead of rejoining', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    markInterviewEnded('app-1');
    api.getMyApplication
      .mockResolvedValueOnce(app({ interviewStatus: 'IN_PROGRESS' }))
      .mockResolvedValue(app({ interviewStatus: 'COMPLETED', canStartInterview: false }));
    renderRoom();

    await poll(0);
    expect(screen.getByText('Interview submitted')).toBeInTheDocument();
    await poll();
    expect(screen.getByText('Your result is ready')).toBeInTheDocument();
    expect(api.startCareerInterview).not.toHaveBeenCalled();
  });

  it('an attempt that did not count says so and clears the mark', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    api.endCareerInterview.mockResolvedValue(undefined);
    api.getMyApplication.mockResolvedValue(app({ interviewStatus: 'NOT_STARTED' }));
    renderRoom({ session, title: 'Backend Engineer', minutes: 20 });

    fireEvent.click(screen.getByRole('button', { name: 'End interview' }));
    await poll(0);
    await poll();
    expect(screen.getByText(/This attempt didn't count/)).toBeInTheDocument();
    expect(localStorage.getItem('careerInterviewEnded:app-1')).toBeNull();
  });

  it('keeps checking with no time limit while scoring is slow', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    api.endCareerInterview.mockResolvedValue(undefined);
    api.getMyApplication.mockResolvedValue(app({ interviewStatus: 'IN_PROGRESS' }));
    renderRoom({ session, title: 'Backend Engineer', minutes: 20 });

    fireEvent.click(screen.getByRole('button', { name: 'End interview' }));
    await poll(0);
    await poll(300_000);
    expect(screen.getByText('Interview submitted')).toBeInTheDocument();
    expect(api.getMyApplication.mock.calls.length).toBeGreaterThan(50);
    // Still scoring, so My Jobs keeps "Continue" hidden.
    expect(localStorage.getItem('careerInterviewEnded:app-1')).not.toBeNull();
  });
});
