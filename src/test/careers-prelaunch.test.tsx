import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { CareerApplication, CareerJob, CareerJobDetail } from '@/services/careersApi';
import { toMyJob, toOpportunityJob } from '@/components/newDesign/opportunities/careersDesignData';

// Backend "before launch" list (11-12): no design sample values anywhere a
// candidate looks; sort / filters go to GET /careers/jobs (#325); assessment
// areas come from posting.interview.criteria (#325); the contact-recruiter
// flow (Screna Sponsored) is hidden.

const api = vi.hoisted(() => ({ listCareerJobs: vi.fn(), getCareerJob: vi.fn() }));
vi.mock('@/services/careersApi', async (orig) => ({ ...(await orig<object>()), ...api }));
vi.mock('@/components/newDesign/opportunities/careersShared', () => ({
  useCareerInterviewStarter: () => ({ begin: vi.fn(), openDialog: vi.fn(), busyJob: null, ui: null }),
  languageLabel: (l: string) => (l === 'en' ? 'English' : l),
}));

import { OpportunitiesPage } from '@/pages/newDesign/opportunities/OpportunitiesPage';
import { JobDetailPage } from '@/pages/newDesign/opportunities/JobDetailPage';
import { ContactRecruiterPage } from '@/pages/newDesign/opportunities/ContactRecruiterPage';

function job(over: Partial<CareerJob> = {}): CareerJob {
  return {
    jobId: 'job-1', title: 'Backend Engineer', companyName: 'Lumen Metrics', companyLogoUrl: null,
    location: null, workplaceType: null, employmentType: null, seniority: null, role: null,
    salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null, summary: null,
    closesAt: null, timezone: null, publishedAt: null, interviewDurationMinutes: 20, interviewPayer: 'EMPLOYER', applied: false,
    ...over,
  };
}

const page = (content: CareerJob[]) => ({ content, pageMeta: { pageNumber: 0, pageSize: 10, totalElements: content.length, totalPages: 1, first: true, last: true } });

function detail(criteria: { name: string; description: string | null }[]): CareerJobDetail {
  return {
    posting: {
      jobId: 'job-1', status: 'OPEN',
      company: { name: 'Lumen Metrics', logoUrl: null, website: null, linkedinUrl: null, industry: null, companySize: null, headquarters: null, headline: null, description: null, workplaceTags: [] },
      title: 'Backend Engineer', department: null, employmentType: null, workplaceType: null, location: null, seniority: null, role: null,
      yearsExperienceMin: null, yearsExperienceMax: null, skills: [], salaryMin: null, salaryMax: null, salaryCurrency: null, salaryPeriod: null,
      summary: null, roleOverview: null, responsibilities: [], requirements: [], preferredQualifications: [], benefits: [],
      opensAt: null, closesAt: null, timezone: null,
      interview: { durationMinutes: 20, language: 'en', questionCount: 4, interviewPayer: 'EMPLOYER', candidateInstructions: null, criteria },
      screeningCriteria: [],
    },
    interviewFunding: 'EMPLOYER',
    myApplication: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listCareerJobs.mockResolvedValue(page([job()]));
});

describe('no sample values in the mappings', () => {
  it('a job card with nothing but a title stays empty, not sample-filled', () => {
    const card = toOpportunityJob(job());
    expect([card.location, card.workType, card.level, card.description, card.closingDateLabel]).toEqual(['', '', '', '', '']);
    expect(card.salaryMin).toBeNull();
    expect(card.salaryMax).toBeNull();
    expect(card.tags).toEqual([]);
    expect(card.applicationCount).toBeUndefined();
  });

  it('a finished application is "Completed", never a sample qualification', () => {
    const app = { applicationId: 'a', jobId: 'job-1', jobTitle: 'X', companyName: 'Y', companyLogoUrl: null, jobStatus: 'OPEN', closesAt: null, timezone: null, appliedAt: '2026-11-01T00:00:00Z', interviewStatus: 'COMPLETED', interviewCompletedAt: '2026-11-02T00:00:00Z', interviewDurationMinutes: 20, interviewLanguage: 'en', questionCount: 3, interviewPayer: 'EMPLOYER', canStartInterview: false } as CareerApplication;
    const row = toMyJob(app);
    expect(row.assessmentStatus).toBe('Completed');
    expect(row.location).toBe('');
  });
});

describe('Opportunities page', () => {
  const renderList = () =>
    render(
      <MemoryRouter>
        <OpportunitiesPage />
      </MemoryRouter>,
    );

  it('asks the API for the newest jobs and shows no sample figures', async () => {
    renderList();
    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument();
    expect(api.listCareerJobs).toHaveBeenCalledWith(expect.objectContaining({ page: 0, sort: 'NEWEST' }));
    expect(screen.queryByText(/Applications$/)).toBeNull();
    expect(screen.queryByText(/spots remaining/)).toBeNull();
    expect(screen.queryByText(/\$/)).toBeNull();
    expect(screen.queryByText(/Screna Sponsored/)).toBeNull();
  });

  it('loads the list once on open (the empty text filters settling must not refetch)', async () => {
    renderList();
    await screen.findByText('Backend Engineer');
    await new Promise((r) => setTimeout(r, 700));
    expect(api.listCareerJobs).toHaveBeenCalledTimes(1);
  });

  it('Escape closes an open sort menu', async () => {
    renderList();
    await screen.findByText('Backend Engineer');
    fireEvent.click(screen.getByRole('button', { name: /Newest/ }));
    expect(screen.getByRole('button', { name: 'Closing soon' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Closing soon' })).toBeNull());
  });

  it('sorts on the server and has no interview-cost sort', async () => {
    renderList();
    await screen.findByText('Backend Engineer');
    fireEvent.click(screen.getByRole('button', { name: /Newest/ }));
    expect(screen.queryByText('Interview cost: Low to high')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Closing soon' }));
    await waitFor(() => expect(api.listCareerJobs).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'CLOSING_SOON' })));
  });

  it('sends experience bands and work arrangement to the API', async () => {
    renderList();
    await screen.findByText('Backend Engineer');
    fireEvent.click(screen.getByRole('button', { name: /^Experience/ }));
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /3–5 years/ }));
    await waitFor(() => expect(api.listCareerJobs).toHaveBeenLastCalledWith(expect.objectContaining({ experience: ['YEARS_3_5'] })));
    fireEvent.click(screen.getByRole('button', { name: /^Work arrangement/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Remote' }));
    await waitFor(() => expect(api.listCareerJobs).toHaveBeenLastCalledWith(expect.objectContaining({ workplaceType: 'REMOTE', experience: ['YEARS_3_5'] })));
  });

  it('sends the typed location once typing pauses', async () => {
    renderList();
    await screen.findByText('Backend Engineer');
    fireEvent.click(screen.getByRole('button', { name: /^Location/ }));
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Austin' } });
    await waitFor(() => expect(api.listCareerJobs).toHaveBeenLastCalledWith(expect.objectContaining({ location: 'Austin' })), { timeout: 2000 });
  });
});

describe('Job detail page', () => {
  const renderDetail = () =>
    render(
      <MemoryRouter initialEntries={['/opportunities/job/job-1']}>
        <Routes>
          <Route path="/opportunities/job/:id" element={<JobDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it('lists the assessment areas from the posting, name only when there is no description', async () => {
    api.getCareerJob.mockResolvedValue(detail([
      { name: 'System design', description: 'Designs services that scale.' },
      { name: 'SQL', description: null },
    ]));
    renderDetail();
    expect(await screen.findByText('Assessment areas')).toBeInTheDocument();
    expect(screen.getByText('System design')).toBeInTheDocument();
    expect(screen.getByText(/Designs services that scale\./)).toBeInTheDocument();
    expect(screen.getByText('SQL').parentElement?.textContent).toBe('SQL');
  });

  it('closed job: no start button unless the application can start (#317)', async () => {
    api.getCareerJob.mockResolvedValue({ ...detail([]), acceptingApplications: false });
    renderDetail();
    expect(await screen.findByText('This role is no longer accepting applications.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start AI interview/ })).toBeNull();
  });

  it('closed job, existing applicant who can still start: the button stays', async () => {
    const myApplication = { applicationId: 'a', jobId: 'job-1', jobTitle: 'X', companyName: 'Y', companyLogoUrl: null, jobStatus: 'CLOSED', closesAt: null, timezone: null, appliedAt: '2026-11-01T00:00:00Z', interviewStatus: 'NOT_STARTED', interviewCompletedAt: null, interviewDurationMinutes: 20, interviewLanguage: 'en', questionCount: 3, interviewPayer: 'EMPLOYER', canStartInterview: true } as CareerApplication;
    api.getCareerJob.mockResolvedValue({ ...detail([]), acceptingApplications: false, myApplication });
    renderDetail();
    expect(await screen.findByRole('button', { name: /Start AI interview/ })).toBeInTheDocument();
  });

  it('shows no sample content, recruiter email or qualification copy', async () => {
    api.getCareerJob.mockResolvedValue(detail([]));
    renderDetail();
    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Assessment areas')).toBeNull();
    expect(screen.queryByText(/xxxxrena/)).toBeNull();
    expect(screen.queryByText(/Driftvale|\$85,000/)).toBeNull();
    expect(screen.queryByText(/qualif/i)).toBeNull();
    expect(screen.queryByText(/public job listing/)).toBeNull();
    expect(screen.queryByText('About the role')).toBeNull();
  });
});

describe('Contact recruiter page', () => {
  it('is hidden this release: sends the candidate to the job', () => {
    render(
      <MemoryRouter initialEntries={['/opportunities/job/job-1/contact']}>
        <Routes>
          <Route path="/opportunities/job/:id/contact" element={<ContactRecruiterPage />} />
          <Route path="/opportunities/job/:id" element={<p>job page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(within(document.body).getByText('job page')).toBeInTheDocument();
  });
});
