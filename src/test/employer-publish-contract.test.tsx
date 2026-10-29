import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { toast } from 'sonner';
import type { ApiJob } from '@/pages/employer/employerApi';
import { FIXTURE_CLOSES_LABEL, apiJob, check } from './employer-fixtures';
import * as employerApi from '@/pages/employer/employerApi';
import { addDays, apiToJob, dateOf, defaultWindow, detailsBody, opensAtIso, todayIn, withDate } from '@/pages/employer/jobMapping';
import { windowLabel } from '@/components/admin/console/pages/employer/views/wizard/logic';
import { mockCompanies } from '@/components/admin/console/pages/employer/mockData';
import { HiringGuide } from '@/components/admin/console/pages/employer/views/HiringGuide';
import { EmployerJobWizard } from '@/pages/employer/EmployerJobWizard';

// Publish contract of 2026-10-20: publishing is free, publish-check gates on
// `ready` only, and sponsorshipUnfunded is a warning, not a blocker.

const go = vi.fn();
vi.mock('@/components/admin/console/pages/employer/store', async (orig) => ({
  ...(await orig<object>()),
  useEmployerStore: () => ({ company: mockCompanies[0], go }),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/pages/employer/employerApi', async (orig) => ({
  ...(await orig<object>()),
  getJob: vi.fn(),
  getPublishCheck: vi.fn(),
  publishJob: vi.fn(),
  getCredits: vi.fn(),
  startCreditsCheckout: vi.fn(),
  saveJobDetails: vi.fn(),
  saveJobAssessment: vi.fn(),
  saveInterviewSettings: vi.fn(),
  saveJobPosting: vi.fn(),
  updateJobWindow: vi.fn(),
  createJob: vi.fn(),
}));

const api = vi.mocked(employerApi);

const publishButton = () => screen.getByRole('button', { name: /^Publish job/ });

beforeEach(() => {
  sessionStorage.clear();
  api.getCredits.mockResolvedValue({ interview: 0, report: 0 });
});

// ─── Pure logic ───────────────────────────────────────────────────────────────

describe('job defaults', () => {
  it('a new job opens today and closes 7 days later (design default)', () => {
    const today = todayIn('Central Time (CT)');
    const w = defaultWindow('Central Time (CT)');
    expect(dateOf(w.opensAt)).toBe(today);
    expect(dateOf(w.closesAt)).toBe(addDays(today, 7));
    expect(w.closesAt).toMatch(/11:59 PM$/);
  });

  it('interview length falls back to 20 minutes, and keeps a saved length', () => {
    const noSettings = apiJob({ interviewSettings: null as unknown as ApiJob['interviewSettings'] });
    expect(apiToJob(noSettings, 'c').interviewLength).toBe(20);
    const saved = apiJob();
    saved.interviewSettings.durationMinutes = 45;
    expect(apiToJob(saved, 'c').interviewLength).toBe(45);
  });
});

describe('opening date → API', () => {
  const tz = 'America/Chicago';
  const today = todayIn(tz);

  it('a draft that opens on publish (opensAt null) shows today', () => {
    expect(dateOf(apiToJob(apiJob(), 'c').opensAt)).toBe(today);
  });

  it('today is sent as null (open on publish); a later date schedules the job', () => {
    const job = apiToJob(apiJob(), 'c');
    expect(opensAtIso(job)).toBeNull();
    expect(detailsBody(job).opensAt).toBeNull();
    const later = { ...job, opensAt: withDate(addDays(today, 3), '00:00') };
    expect(opensAtIso(later)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/);
    expect(Date.parse(opensAtIso(later)!)).toBeGreaterThan(Date.now());
  });

  it('labels the window by its dates', () => {
    expect(windowLabel(apiToJob(apiJob(), 'c'))).toMatch(new RegExp(`^[A-Z][a-z]{2} \\d{1,2}(, \\d{4})? – ${FIXTURE_CLOSES_LABEL}$`));
  });
});

// ─── Wizard: preview & publish ────────────────────────────────────────────────

describe('EmployerJobWizard publish step', () => {
  it('publishes when ready: the button opens the confirm dialog, not Buy credits', async () => {
    api.getJob.mockResolvedValue(apiJob());
    api.getPublishCheck.mockResolvedValue(check());
    // New response shape: no creditsCharged / interviewCreditsRemaining.
    api.publishJob.mockResolvedValue({
      jobId: 'job-1',
      title: 'Backend Engineer',
      status: 'OPEN',
      opensAt: '2026-10-28T00:00:00Z',
      closesAt: '2099-01-15T23:00:00Z',
      timezone: 'America/Chicago',
      publishedAt: '2026-10-28T00:00:00Z',
      alreadyPublished: false,
    });

    render(<EmployerJobWizard jobId="job-1" />);
    await waitFor(() => expect(publishButton()).toBeEnabled());
    expect(screen.getByText('Ready to publish.')).toBeInTheDocument();
    expect(screen.queryByText(/No Interview Credits/)).not.toBeInTheDocument();

    fireEvent.click(publishButton());
    expect(screen.getByText('Publish Backend Engineer?')).toBeInTheDocument();
    expect(screen.queryByText('Buy Interview Credits')).not.toBeInTheDocument();
    // Summary card + confirm dialog: opens today, closes on the saved date.
    expect(screen.getAllByText(new RegExp(` – ${FIXTURE_CLOSES_LABEL}$`))).toHaveLength(2);

    fireEvent.click(screen.getByLabelText(/ready to go live/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and publish' }));
    expect(await screen.findByText('Your job is live')).toBeInTheDocument();
    expect(api.publishJob).toHaveBeenCalledWith('job-1');
  });

  it('sponsorshipUnfunded warns but does not block publishing', async () => {
    api.getJob.mockResolvedValue(apiJob());
    api.getPublishCheck.mockResolvedValue(check({ interviewPayer: 'EMPLOYER', sponsorshipUnfunded: true }));

    render(<EmployerJobWizard jobId="job-1" />);
    expect(await screen.findByText('No Interview Credits for sponsored interviews.')).toBeInTheDocument();
    expect(screen.getByText(/You can still publish/)).toBeInTheDocument();
    expect(publishButton()).toBeEnabled();
    expect(screen.queryByText('Finish the job before publishing.')).not.toBeInTheDocument();

    fireEvent.click(publishButton());
    expect(screen.getByText('Publish Backend Engineer?')).toBeInTheDocument();
  });

  it('not ready: shows what is missing and disables publishing', async () => {
    api.getJob.mockResolvedValue(apiJob());
    api.getPublishCheck.mockResolvedValue(check({ ready: false, missing: ['title'] }));

    render(<EmployerJobWizard jobId="job-1" />);
    expect(await screen.findByText('Finish the job before publishing.')).toBeInTheDocument();
    await waitFor(() => expect(publishButton()).toBeDisabled());
    expect(screen.queryByText(/No Interview Credits/)).not.toBeInTheDocument();
  });

  it('buying credits stashes the current balance and starts checkout for 1 credit', async () => {
    api.getJob.mockResolvedValue(apiJob());
    api.getPublishCheck.mockResolvedValue(check({ interviewPayer: 'EMPLOYER', sponsorshipUnfunded: true, interviewCreditsAvailable: 3 }));
    api.startCreditsCheckout.mockResolvedValue('about:blank');

    render(<EmployerJobWizard jobId="job-1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Buy Interview Credits/ }));
    expect(screen.getByText(/1 per completed interview\. You have 3\./)).toBeInTheDocument();
    expect(screen.queryByText(/publishing \(/)).not.toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(1);

    fireEvent.click(screen.getByRole('button', { name: 'Continue to payment' }));
    await waitFor(() => expect(api.startCreditsCheckout).toHaveBeenCalledWith({ creditType: 'EMPLOYER_INTERVIEW', quantity: 1, jobId: 'job-1' }));
    expect(sessionStorage.getItem('screna_employer_credits_before')).toBe('3');
  });
});

// ─── Wizard: back from Stripe ─────────────────────────────────────────────────

describe('EmployerJobWizard checkout return', () => {
  it('waits until the balance rises above the pre-checkout balance', async () => {
    sessionStorage.setItem('screna_employer_credits_before', '2');
    api.getJob.mockResolvedValue(apiJob());
    api.getPublishCheck
      .mockResolvedValueOnce(check({ interviewCreditsAvailable: 2 })) // step-3 load
      .mockResolvedValueOnce(check({ interviewCreditsAvailable: 2 })) // poll 1: not landed
      .mockResolvedValue(check({ interviewCreditsAvailable: 7 })); // poll 2: landed

    render(<EmployerJobWizard jobId="job-1" checkout="success" />);
    await waitFor(() => expect(api.getPublishCheck).toHaveBeenCalledTimes(2));
    expect(toast.success).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('screna_employer_credits_before')).toBeNull();

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Interview Credits added.', { id: 'employer-checkout' }), { timeout: 4000 });
  });

  it('without a stashed balance, any credits count as landed', async () => {
    api.getJob.mockResolvedValue(apiJob());
    api.getPublishCheck.mockResolvedValue(check({ interviewCreditsAvailable: 5 }));

    render(<EmployerJobWizard jobId="job-1" checkout="success" />);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Interview Credits added.', { id: 'employer-checkout' }));
  });
});

// ─── Hiring guide copy ────────────────────────────────────────────────────────

describe('HiringGuide credits copy', () => {
  it('says publishing is free', () => {
    render(<HiringGuide open onClose={() => {}} onFinish={() => {}} />);
    expect(screen.getByText('Publishing is free.')).toBeInTheDocument();
    expect(screen.getByText('No credits are used to publish a job.')).toBeInTheDocument();
    expect(screen.queryByText(/Publishing uses 1 Interview Credit/)).not.toBeInTheDocument();
  });
});
