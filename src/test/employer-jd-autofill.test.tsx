import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import * as employerApi from '@/pages/employer/employerApi';
import type { JdPrefill } from '@/pages/employer/employerApi';
import { withPrefill } from '@/pages/employer/jobMapping';
import { mockCompanies } from '@/components/admin/console/pages/employer/mockData';
import { EmployerJobWizard } from '@/pages/employer/EmployerJobWizard';
import { apiJob, check } from './employer-fixtures';

// JD autofill on step 1 (backend #307, AI checklist F1–F3): paste a job
// description, fill only the empty fields, and carry the fields the form has
// no input for into the next details save.

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

function paste(text = 'Staff Platform Engineer\nRun the platform that…') {
  fireEvent.change(box(), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: /Autofill/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  api.getPublishCheck.mockResolvedValue(check());
});

describe('JD autofill', () => {
  it('sends the title and location already on the form', async () => {
    api.parseJobDescription.mockResolvedValue(PREFILL);
    render(<EmployerJobWizard />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Backend Engineer'), { target: { value: 'Platform Lead' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. Chicago, Illinois'), { target: { value: 'Remote (US)' } });
    paste('  JD text  ');
    await waitFor(() => expect(api.parseJobDescription).toHaveBeenCalled());
    expect(api.parseJobDescription.mock.calls[0][0]).toEqual({ jdText: 'JD text', title: 'Platform Lead', location: 'Remote (US)' });
  });

  it('fills only empty fields and keeps what the employer typed', async () => {
    api.parseJobDescription.mockResolvedValue(PREFILL);
    render(<EmployerJobWizard />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Backend Engineer'), { target: { value: 'Platform Lead' } });
    paste();
    await waitFor(() => expect(screen.getByDisplayValue('Own the platform that every team ships on.')).toBeInTheDocument());
    expect(screen.getByDisplayValue('Platform Lead')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Staff Platform Engineer')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('12,000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Run the clusters')).toBeInTheDocument();
  });

  it('fills the location when the response has one and the field is empty', async () => {
    api.parseJobDescription.mockResolvedValue({ ...PREFILL, location: 'Austin, TX' });
    render(<EmployerJobWizard />);
    paste();
    await waitFor(() => expect(screen.getByDisplayValue('Austin, TX')).toBeInTheDocument());
  });

  it('keeps a location the employer typed', async () => {
    api.parseJobDescription.mockResolvedValue({ ...PREFILL, location: 'Austin, TX' });
    render(<EmployerJobWizard />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Chicago, Illinois'), { target: { value: 'Remote (US)' } });
    paste();
    await waitFor(() => expect(screen.getByDisplayValue('Own the platform that every team ships on.')).toBeInTheDocument());
    expect(screen.getByDisplayValue('Remote (US)')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Austin, TX')).not.toBeInTheDocument();
  });

  it('creates the draft with the fields the form has no input for', async () => {
    api.parseJobDescription.mockResolvedValue(PREFILL);
    api.createJob.mockImplementation(async (body) => apiJob({ ...body, wizardStep: 1 }));
    render(<EmployerJobWizard />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Chicago, Illinois'), { target: { value: 'Remote (US)' } });
    paste();
    await waitFor(() => expect(screen.getByDisplayValue('Staff Platform Engineer')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.createJob).toHaveBeenCalled());
    const body = api.createJob.mock.calls[0][0];
    expect(body).toMatchObject({
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
    api.parseJobDescription.mockRejectedValue(new Error('TOO_MANY_REQUESTS'));
    render(<EmployerJobWizard />);
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
