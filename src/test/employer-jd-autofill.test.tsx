import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import * as employerApi from '@/pages/employer/employerApi';
import type { JdPrefill } from '@/pages/employer/employerApi';
import { withPrefill } from '@/pages/employer/jobMapping';
import { mockCompanies } from '@/components/admin/console/pages/employer/mockData';
import { EmployerJobWizard } from '@/pages/employer/EmployerJobWizard';
import { apiJob, check } from './employer-fixtures';

// JD autofill (backend #307, AI checklist F1–F3): paste a job description,
// fill only the empty fields, and carry the fields the form has no input for
// into the next details save. A new job starts with a choice: "Fill everything
// with AI" opens the intake (one paste fills step 1, then on to the interview
// when step 1 is complete); "step by step" opens step 1 without the JD card.
// Existing drafts keep the card on step 1.

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
  saveJobDetails: vi.fn(),
  createJob: vi.fn(),
  parseJobDescription: vi.fn(),
  suggestCriteria: vi.fn(),
  suggestQuestions: vi.fn(),
}));

const api = vi.mocked(employerApi);

const PREFILL: JdPrefill = {
  title: 'Staff Platform Engineer',
  employmentType: 'CONTRACT',
  workplaceType: 'REMOTE',
  seniority: 'SENIOR',
  role: 'Backend Engineer',
  yearsExperienceMin: 5,
  yearsExperienceMax: null,
  skills: ['Go', 'Kubernetes'],
  salaryMin: 12000,
  salaryMax: 15000,
  salaryCurrency: 'USD',
  salaryPeriod: 'MONTH',
  summary: 'Run the platform.',
  roleOverview: 'Own the platform that every team ships on.',
  responsibilities: ['Run the clusters'],
  requirements: ['5+ years of Go'],
  preferredQualifications: [],
  benefits: ['Equity'],
};

const FAIL = "Couldn't read this job description. Please fill the form manually.";
const box = () => screen.getByLabelText('Paste job description');

// Step 1's card (existing drafts, or after the AI intake).
function paste(text = 'Staff Platform Engineer\nRun the platform that…') {
  fireEvent.change(box(), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: /Autofill/ }));
}

// New job → "Fill everything with AI" → paste on the intake.
function aiIntake(text = 'Staff Platform Engineer\nRun the platform that…') {
  fireEvent.click(screen.getByRole('button', { name: /Fill everything with AI/ }));
  fireEvent.change(box(), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: /Fill with AI/ }));
}

const draftJob = () => apiJob({ wizardStep: 1, location: '', roleOverview: '', title: 'Platform Lead', responsibilities: [], requirements: [], salaryMin: null, salaryMax: null });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  api.getPublishCheck.mockResolvedValue(check());
});

describe('create job: choose how to fill it', () => {
  it('a new job opens on the choice, not the form', () => {
    render(<EmployerJobWizard />);
    expect(screen.getByText('How do you want to create this job?')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('e.g. Backend Engineer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
  });

  it('step by step opens step 1 without the JD card, and Back returns to the choice', () => {
    render(<EmployerJobWizard />);
    fireEvent.click(screen.getByRole('button', { name: /Fill it in step by step/ }));
    expect(screen.getByPlaceholderText('e.g. Backend Engineer')).toBeInTheDocument();
    expect(screen.queryByLabelText('Paste job description')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('How do you want to create this job?')).toBeInTheDocument();
  });

  it('an existing draft skips the choice', async () => {
    api.getJob.mockResolvedValue(apiJob({ wizardStep: 1 }));
    render(<EmployerJobWizard jobId="job-1" />);
    await waitFor(() => expect(box()).toBeInTheDocument());
    expect(screen.queryByText('How do you want to create this job?')).not.toBeInTheDocument();
  });
});

describe('AI intake (new job)', () => {
  it('complete details: creates the draft with every autofilled field and moves on to the interview', async () => {
    api.parseJobDescription.mockResolvedValue({ ...PREFILL, location: 'Remote (US)' });
    api.createJob.mockImplementation(async (body) => apiJob({ ...body, wizardStep: 1 }));
    api.suggestCriteria.mockReturnValue(new Promise(() => {}));
    render(<EmployerJobWizard />);
    aiIntake('  JD text  ');
    await waitFor(() => expect(api.createJob).toHaveBeenCalled());
    expect(api.parseJobDescription.mock.calls[0][0]).toEqual({ jdText: 'JD text', title: undefined, location: undefined });
    expect(api.createJob.mock.calls[0][0]).toMatchObject({
      title: 'Staff Platform Engineer',
      employmentType: 'CONTRACT',
      workplaceType: 'REMOTE',
      location: 'Remote (US)',
      seniority: 'SENIOR',
      role: 'Backend Engineer',
      yearsExperienceMin: 5,
      yearsExperienceMax: null,
      skills: ['Go', 'Kubernetes'],
      salaryMin: 12000,
      salaryMax: 15000,
      salaryCurrency: 'USD',
      salaryPeriod: 'MONTH',
      summary: 'Run the platform.',
      benefits: ['Equity'],
    });
    expect(await screen.findByText('Generating the interview from the job details…')).toBeInTheDocument();
    expect(api.suggestCriteria).toHaveBeenCalledWith('job-1');
  });

  it('missing details: opens step 1 with what was found and marks what is missing, saving nothing', async () => {
    api.parseJobDescription.mockResolvedValue(PREFILL);
    render(<EmployerJobWizard />);
    aiIntake();
    expect(await screen.findByText(/AI filled in what it found/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Staff Platform Engineer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Own the platform that every team ships on.')).toBeInTheDocument();
    expect(api.createJob).not.toHaveBeenCalled();
    // Back from step 1 returns to the intake with the text kept.
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(box()).toHaveValue('Staff Platform Engineer\nRun the platform that…');
  });

  it('failure: one message, stays on the intake, and offers step by step', async () => {
    api.parseJobDescription.mockRejectedValue(new Error('TOO_MANY_REQUESTS'));
    render(<EmployerJobWizard />);
    aiIntake();
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Fill it in step by step instead/ }));
    expect(screen.getByPlaceholderText('e.g. Backend Engineer')).toHaveValue('');
  });

  it('nothing found: says so and stays on the intake', async () => {
    api.parseJobDescription.mockResolvedValue({ ...PREFILL, title: '', employmentType: null, workplaceType: null, seniority: null, role: '', yearsExperienceMin: null, skills: [], salaryMin: null, salaryMax: null, summary: '', roleOverview: '', responsibilities: [], requirements: [], benefits: [] } as unknown as JdPrefill);
    render(<EmployerJobWizard />);
    aiIntake();
    expect(await screen.findByText(/couldn't find job details in this text/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fill with AI/ })).toBeInTheDocument();
  });
});

describe('JD card on step 1 (existing drafts)', () => {
  it('sends the title and location already on the form', async () => {
    api.getJob.mockResolvedValue(draftJob());
    api.parseJobDescription.mockResolvedValue(PREFILL);
    render(<EmployerJobWizard jobId="job-1" />);
    await waitFor(() => expect(box()).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('e.g. Chicago, Illinois'), { target: { value: 'Remote (US)' } });
    paste('  JD text  ');
    await waitFor(() => expect(api.parseJobDescription).toHaveBeenCalled());
    expect(api.parseJobDescription.mock.calls[0][0]).toEqual({ jdText: 'JD text', title: 'Platform Lead', location: 'Remote (US)' });
  });

  it('fills only empty fields and keeps what the employer typed', async () => {
    api.getJob.mockResolvedValue(draftJob());
    api.parseJobDescription.mockResolvedValue(PREFILL);
    render(<EmployerJobWizard jobId="job-1" />);
    await waitFor(() => expect(box()).toBeInTheDocument());
    paste();
    await waitFor(() => expect(screen.getByDisplayValue('Own the platform that every team ships on.')).toBeInTheDocument());
    expect(screen.getByDisplayValue('Platform Lead')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Staff Platform Engineer')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('12,000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Run the clusters')).toBeInTheDocument();
  });

  it('fills the location when the response has one and the field is empty', async () => {
    api.getJob.mockResolvedValue(draftJob());
    api.parseJobDescription.mockResolvedValue({ ...PREFILL, location: 'Austin, TX' });
    render(<EmployerJobWizard jobId="job-1" />);
    await waitFor(() => expect(box()).toBeInTheDocument());
    paste();
    await waitFor(() => expect(screen.getByDisplayValue('Austin, TX')).toBeInTheDocument());
  });

  it('keeps a location the employer typed', async () => {
    api.getJob.mockResolvedValue(draftJob());
    api.parseJobDescription.mockResolvedValue({ ...PREFILL, location: 'Austin, TX' });
    render(<EmployerJobWizard jobId="job-1" />);
    await waitFor(() => expect(box()).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('e.g. Chicago, Illinois'), { target: { value: 'Remote (US)' } });
    paste();
    await waitFor(() => expect(screen.getByDisplayValue('Own the platform that every team ships on.')).toBeInTheDocument());
    expect(screen.getByDisplayValue('Remote (US)')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Austin, TX')).not.toBeInTheDocument();
  });

  it("a saved draft's non-empty values win over the autofill", async () => {
    api.getJob.mockResolvedValue(apiJob({ wizardStep: 1, skills: ['Java'], seniority: 'MID' }));
    api.parseJobDescription.mockResolvedValue(PREFILL);
    api.saveJobDetails.mockImplementation(async (_id, body) => apiJob({ ...body, wizardStep: 1 }));
    render(<EmployerJobWizard jobId="job-1" />);
    await waitFor(() => expect(box()).toBeInTheDocument());
    paste();
    await waitFor(() => expect(screen.getByDisplayValue('12,000')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.saveJobDetails).toHaveBeenCalled());
    const body = api.saveJobDetails.mock.calls[0][1];
    expect(body).toMatchObject({ title: 'Backend Engineer', roleOverview: 'Build APIs.', skills: ['Java'], seniority: 'MID', summary: 'Run the platform.', benefits: ['Equity'] });
  });

  it('shows one message on failure and leaves the form alone', async () => {
    api.getJob.mockResolvedValue(draftJob());
    api.parseJobDescription.mockRejectedValue(new Error('TOO_MANY_REQUESTS'));
    render(<EmployerJobWizard jobId="job-1" />);
    await waitFor(() => expect(box()).toBeInTheDocument());
    paste();
    expect(await screen.findByText(FAIL)).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Staff Platform Engineer')).not.toBeInTheDocument();
  });

  it('is not offered on a published job', async () => {
    api.getJob.mockResolvedValue(apiJob({ status: 'OPEN', publishedAt: '2026-10-28T00:00:00Z' }));
    render(<EmployerJobWizard jobId="job-1" />);
    await waitFor(() => expect(screen.getByText('Edit job')).toBeInTheDocument());
    expect(screen.queryByLabelText('Paste job description')).not.toBeInTheDocument();
  });

  it('role overview allows 5000 characters (F3)', () => {
    render(<EmployerJobWizard />);
    fireEvent.click(screen.getByRole('button', { name: /Fill it in step by step/ }));
    expect(screen.getByText('0 / 5000 chars')).toBeInTheDocument();
  });
});

describe('withPrefill', () => {
  const base = { seniority: null, role: '', yearsExperienceMin: 2, yearsExperienceMax: null, skills: [], summary: null, benefits: ['Gym'], salaryPeriod: 'YEAR' as const };

  it('keeps saved values, takes the experience range as a pair, and the autofill period when it filled the salary', () => {
    expect(withPrefill(base, { seniority: 'SENIOR', role: 'SRE', yearsExperienceMin: 5, yearsExperienceMax: 8, skills: ['Go'], benefits: ['Equity'], salaryPeriod: 'MONTH' })).toEqual({
      seniority: 'SENIOR',
      role: 'SRE',
      yearsExperienceMin: 2,
      yearsExperienceMax: null,
      skills: ['Go'],
      summary: null,
      benefits: ['Gym'],
      salaryPeriod: 'MONTH',
    });
  });

  it('is the saved copy when nothing was autofilled', () => {
    expect(withPrefill(base, null)).toBe(base);
  });
});
