import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { toast } from 'sonner';
import * as employerApi from '@/pages/employer/employerApi';
import { addDays, addMonths, apiToJob, closingRange, settingsBody, todayIn } from '@/pages/employer/jobMapping';
import { mockCompanies } from '@/components/admin/console/pages/employer/mockData';
import { EmployerJobWizard } from '@/pages/employer/EmployerJobWizard';
import { FIXTURE_CLOSES, apiJob, check } from './employer-fixtures';

// Create-job wizard, design c-雇主端 of 2026-10-28 (Figma tv7ju8o58LXo6ZJEsJI6kZ):
// step 1 holds the application window (dates only, closing defaults to
// opening + 7 days); step 3 has only Maximum sponsored candidates and the
// "After the sponsorship limit is reached" choice.

vi.mock('@/components/admin/console/pages/employer/store', async (orig) => ({
  ...(await orig<object>()),
  useEmployerStore: () => ({ company: mockCompanies[0], go: vi.fn() }),
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
  saveSponsorship: vi.fn(),
  saveJobPosting: vi.fn(),
  updateJobWindow: vi.fn(),
  createJob: vi.fn(),
  suggestCriteria: vi.fn(),
  suggestQuestions: vi.fn(),
}));

const api = vi.mocked(employerApi);
const FORM_KEY = 'screna_employer_job_form_job-1';
const today = todayIn('America/Chicago');
const dateInput = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

beforeEach(() => {
  localStorage.clear();
  api.getPublishCheck.mockResolvedValue(check());
});

// ─── Step 1 ───────────────────────────────────────────────────────────────────

describe('step 1: application window', () => {
  it('a new job shows the window in Role information, opening today and closing 7 days later', () => {
    render(<EmployerJobWizard />);
    // Section heading + the summary card's row.
    expect(screen.getAllByText('Application window')).toHaveLength(2);
    expect(screen.getByText('Choose when candidates can apply. The closing date defaults to 7 days after the opening date.')).toBeInTheDocument();
    const localToday = new Date().toLocaleDateString('en-CA');
    const opens = dateInput('Opening date').value;
    expect([today, localToday]).toContain(opens);
    expect(dateInput('Closing date').value).toBe(addDays(opens, 7));
  });

  it('drops the fields the design removed', () => {
    render(<EmployerJobWizard />);
    expect(screen.queryByText('HR contact number')).not.toBeInTheDocument();
    expect(screen.queryByText('Time zone')).not.toBeInTheDocument();
    expect(screen.queryByText('Maximum applicants')).not.toBeInTheDocument();
  });

  it('moving the opening date carries the default closing date along', () => {
    render(<EmployerJobWizard />);
    const opens = addDays(dateInput('Opening date').value, 2);
    fireEvent.change(dateInput('Opening date'), { target: { value: opens } });
    expect(dateInput('Closing date').value).toBe(addDays(opens, 7));
  });

  it('keeps a closing date the employer picked', () => {
    render(<EmployerJobWizard />);
    const start = dateInput('Opening date').value;
    fireEvent.change(dateInput('Closing date'), { target: { value: addDays(start, 20) } });
    fireEvent.change(dateInput('Opening date'), { target: { value: addDays(start, 1) } });
    expect(dateInput('Closing date').value).toBe(addDays(start, 20));
  });

  it('closing less than 3 days after opening blocks Continue', async () => {
    api.getJob.mockResolvedValue(apiJob({ wizardStep: 1 }));
    render(<EmployerJobWizard jobId="job-1" />);
    await screen.findByLabelText('Opening date');
    fireEvent.change(dateInput('Opening date'), { target: { value: addDays(today, 5) } });
    fireEvent.change(dateInput('Closing date'), { target: { value: addDays(today, 7) } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to interview/ }));
    expect(await screen.findByText('Must be at least 3 days after the opening date')).toBeInTheDocument();
    expect(api.saveJobDetails).not.toHaveBeenCalled();
  });

  it('closing more than 1 month after opening blocks Continue', async () => {
    api.getJob.mockResolvedValue(apiJob({ wizardStep: 1 }));
    render(<EmployerJobWizard jobId="job-1" />);
    await screen.findByLabelText('Opening date');
    fireEvent.change(dateInput('Closing date'), { target: { value: addDays(addMonths(today, 1), 1) } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to interview/ }));
    expect(await screen.findByText('Must be within 1 month of the opening date')).toBeInTheDocument();
    expect(api.saveJobDetails).not.toHaveBeenCalled();
  });

  it('the closing picker only offers 3 days to 1 month after opening', () => {
    render(<EmployerJobWizard />);
    const opens = dateInput('Opening date').value;
    expect(dateInput('Closing date').min).toBe(addDays(opens, 3));
    expect(dateInput('Closing date').max).toBe(addMonths(opens, 1));
  });

  it('moving the opening date past a picked closing date resets it to +7 days', () => {
    render(<EmployerJobWizard />);
    const start = dateInput('Opening date').value;
    fireEvent.change(dateInput('Closing date'), { target: { value: addDays(start, 20) } });
    fireEvent.change(dateInput('Opening date'), { target: { value: addDays(start, 19) } });
    expect(dateInput('Closing date').value).toBe(addDays(start, 26));
  });

  it('saves a later opening date as a scheduled opensAt, and the closing date at end of day', async () => {
    api.getJob.mockResolvedValue(apiJob({ wizardStep: 1 }));
    api.saveJobDetails.mockImplementation(async (_id, body) => apiJob({ ...body, wizardStep: 2 }));
    render(<EmployerJobWizard jobId="job-1" />);
    await screen.findByLabelText('Opening date');
    fireEvent.change(dateInput('Opening date'), { target: { value: addDays(today, 3) } });
    // The saved closing date was the employer's choice and is still in range, so it stayed put.
    expect(dateInput('Closing date').value).toBe(FIXTURE_CLOSES);
    fireEvent.change(dateInput('Closing date'), { target: { value: addDays(today, 12) } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to interview/ }));

    await waitFor(() => expect(api.saveJobDetails).toHaveBeenCalled());
    const body = api.saveJobDetails.mock.calls[0][1];
    expect(Date.parse(body.opensAt!)).toBeGreaterThan(Date.now());
    // 23:59 in Chicago = 04:59Z (CDT) or 05:59Z (CST).
    expect(body.closesAt).toMatch(new RegExp(`^${addDays(today, 13)}T0[45]:59:00Z$`));
  });
});

describe('closing range', () => {
  it('is 3 days to 1 calendar month after opening, clamped at month end', () => {
    expect(closingRange('2026-10-28')).toEqual({ min: '2026-10-31', max: '2026-11-28' });
    expect(closingRange('2026-01-31').max).toBe('2026-02-28');
    expect(closingRange('2028-01-31').max).toBe('2028-02-29');
    expect(closingRange('2026-12-15')).toEqual({ min: '2026-12-18', max: '2027-01-15' });
  });
});

// ─── Step 2: interview language ─────────────────────────────────────────────

describe('interview language', () => {
  it('has no language field: interviews are English only', async () => {
    api.getJob.mockResolvedValue(apiJob({ wizardStep: 2 }));
    render(<EmployerJobWizard jobId="job-1" />);
    expect(await screen.findByText('Candidate instructions')).toBeInTheDocument();
    expect(screen.queryByText('Interview language')).not.toBeInTheDocument();
  });

  it('never sends length or language, even for an older job saved with 45 min in Spanish (#305)', () => {
    const saved = apiJob();
    saved.interviewSettings.language = 'es';
    saved.interviewSettings.durationMinutes = 45;
    const job = apiToJob(saved, 'c');
    expect(job.language).toBe('English');
    expect(settingsBody(job, saved)).toEqual({ candidateInstructions: null, passScore: null });
  });

  it('shows the fixed length instead of a 20 / 30 / 45 choice', async () => {
    api.getJob.mockResolvedValue(apiJob({ wizardStep: 2 }));
    render(<EmployerJobWizard jobId="job-1" />);
    expect(await screen.findByText('Up to 20 min · English')).toBeInTheDocument();
    expect(screen.queryByText('30 min (Suggested)')).not.toBeInTheDocument();
  });
});

// ─── Step 3 ───────────────────────────────────────────────────────────────────

describe('step 3: sponsorship (PUT sponsorship, #297)', () => {
  it('shows only the design fields, prefilled with 50 candidates and keep accepting', async () => {
    api.getJob.mockResolvedValue(apiJob({ wizardStep: 3 }));
    render(<EmployerJobWizard jobId="job-1" />);
    fireEvent.click(await screen.findByRole('radio', { name: /Sponsor candidates' first interviews/ }));

    expect(screen.getByLabelText('Maximum sponsored candidates')).toHaveValue('50');
    expect(screen.getByRole('radio', { name: /Keep accepting candidates/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Close the job automatically/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByText('Total interview budget')).not.toBeInTheDocument();
    expect(screen.queryByText('Daily interview budget')).not.toBeInTheDocument();
    expect(screen.queryByText('Estimated sponsorship usage')).not.toBeInTheDocument();
    // The window moved to step 1.
    expect(screen.queryByLabelText('Opening date')).not.toBeInTheDocument();
  });

  it('requires the maximum, then saves who pays and the limits with PUT sponsorship', async () => {
    api.getJob.mockResolvedValue(apiJob({ wizardStep: 3 }));
    api.saveSponsorship.mockImplementation(async (_id, body) =>
      apiJob({ wizardStep: 4, sponsorship: { maxSponsoredCandidates: body.maxSponsoredCandidates!, whenLimitReached: body.whenLimitReached!, sponsoredCount: 0 } }, 'EMPLOYER'),
    );
    render(<EmployerJobWizard jobId="job-1" />);
    fireEvent.click(await screen.findByRole('radio', { name: /Sponsor candidates' first interviews/ }));
    fireEvent.change(screen.getByLabelText('Maximum sponsored candidates'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /Continue to preview/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Complete the required fields to continue'));
    expect(api.saveSponsorship).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Maximum sponsored candidates'), { target: { value: '1,200' } });
    fireEvent.click(screen.getByRole('radio', { name: /Close the job automatically/ }));
    expect(screen.getByText('Your interview sponsorship cost: up to 1,200 credits')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Continue to preview/ }));
    await waitFor(() => expect(api.saveSponsorship).toHaveBeenCalled());
    expect(api.saveSponsorship.mock.calls[0][1]).toEqual({ interviewPayer: 'EMPLOYER', maxSponsoredCandidates: 1200, whenLimitReached: 'CLOSE_JOB' });
    expect(api.saveInterviewSettings).not.toHaveBeenCalled();
    expect(await screen.findByText('Ready to publish.')).toBeInTheDocument();
    expect(localStorage.getItem(FORM_KEY)).toBeNull();
  });

  it('candidate-paid needs no limits, costs 0 credits and sends only who pays', async () => {
    api.getJob.mockResolvedValue(apiJob({ wizardStep: 3 }));
    api.saveSponsorship.mockResolvedValue(apiJob({ wizardStep: 4 }));
    render(<EmployerJobWizard jobId="job-1" />);
    expect(await screen.findByRole('radio', { name: /Candidates use their own credits/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Your interview sponsorship cost: 0 credits')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Continue to preview/ }));
    await waitFor(() => expect(api.saveSponsorship).toHaveBeenCalled());
    expect(api.saveSponsorship.mock.calls[0][1]).toEqual({ interviewPayer: 'CANDIDATE' });
  });

  it('interview settings no longer carry who pays', () => {
    expect(settingsBody(apiToJob(apiJob({}, 'EMPLOYER'), 'c'))).not.toHaveProperty('interviewPayer');
  });
});

// ─── Reload ───────────────────────────────────────────────────────────────────

describe('saved sponsorship', () => {
  it('loads from the job, so an employer-sponsored draft can publish after a reload', async () => {
    api.getJob.mockResolvedValue(apiJob({ sponsorship: { maxSponsoredCandidates: 80, whenLimitReached: 'CLOSE_JOB', sponsoredCount: 0 } }, 'EMPLOYER'));
    render(<EmployerJobWizard jobId="job-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: /^Publish job/ })).toBeEnabled());
    expect(screen.getByText('Ready to publish.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Application & credits/ }));
    expect(await screen.findByLabelText('Maximum sponsored candidates')).toHaveValue('80');
    expect(screen.getByRole('radio', { name: /Close the job automatically/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('an employer-paid draft without one is saved on the way through step 3', async () => {
    api.getJob.mockResolvedValue(apiJob({ wizardStep: 3, sponsorship: null }, 'EMPLOYER'));
    api.saveSponsorship.mockResolvedValue(apiJob({ wizardStep: 4 }, 'EMPLOYER'));
    render(<EmployerJobWizard jobId="job-1" />);
    await screen.findByLabelText('Maximum sponsored candidates');
    fireEvent.click(screen.getByRole('button', { name: /Continue to preview/ }));
    await waitFor(() => expect(api.saveSponsorship).toHaveBeenCalled());
    expect(api.saveSponsorship.mock.calls[0][1]).toEqual({ interviewPayer: 'EMPLOYER', maxSponsoredCandidates: 50, whenLimitReached: 'KEEP_ACCEPTING' });
  });
});
