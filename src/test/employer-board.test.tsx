import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { ReactNode } from 'react';
import * as employerApi from '@/pages/employer/employerApi';
import type { ApplicationsJob, BoardCandidate, BoardSummary, CandidateReport, Outreach, Page } from '@/pages/employer/employerApi';
import { mockCompanies } from '@/components/admin/console/pages/employer/mockData';
import { CreditsContext } from '@/pages/employer/creditsContext';
import { EmployerApplicationsView } from '@/pages/employer/EmployerApplicationsView';
import { EmployerBoardView } from '@/pages/employer/EmployerBoardView';
import { EmployerReportView } from '@/pages/employer/EmployerReportView';
import { EmployerContactView } from '@/pages/employer/EmployerContactView';

// Employer board guide (backend docs/frontend-employer-board-api.md):
// Applications list, board (+ visit after render), unlock, report, decision,
// resume/media links, outreach.

const go = vi.fn();
vi.mock('@/components/admin/console/pages/employer/store', async (orig) => ({
  ...(await orig<object>()),
  useEmployerStore: () => ({ company: mockCompanies[0], go }),
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

vi.mock('@/pages/employer/employerApi', async (orig) => ({
  ...(await orig<object>()),
  listApplicationsJobs: vi.fn(),
  getBoardSummary: vi.fn(),
  listBoardCandidates: vi.fn(),
  recordBoardVisit: vi.fn(),
  unlockApplication: vi.fn(),
  getCandidateReport: vi.fn(),
  getResumeLink: vi.fn(),
  getQuestionMedia: vi.fn(),
  setHiringDecision: vi.fn(),
  getOutreach: vi.fn(),
  saveOutreach: vi.fn(),
  outreachAction: vi.fn(),
  startCreditsCheckout: vi.fn(),
  closeJob: vi.fn(),
}));
const api = vi.mocked(employerApi);

const pageOf = <T,>(content: T[], extra: Partial<Page<T>['pageMeta']> = {}): Page<T> => ({
  content,
  pageMeta: { pageNumber: 0, pageSize: 10, totalElements: content.length, totalPages: 1, first: true, last: true, ...extra },
});

function apiError(errorCode: string, status: number, data?: unknown) {
  const err = new AxiosError('fail', String(status));
  err.response = { status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { status: 'ERROR', errorCode, data } };
  return err;
}

const job = (over: Partial<ApplicationsJob> = {}): ApplicationsJob => ({
  jobId: 'job-1',
  title: 'Backend Engineer',
  location: 'Chicago, IL',
  workplaceType: 'HYBRID',
  status: 'OPEN',
  opensAt: '2026-10-01T05:00:00Z',
  closesAt: '2026-11-07T23:00:00Z',
  closedAt: null,
  timezone: 'America/Chicago',
  applicationCount: 47,
  completedCount: 31,
  unlockedCount: 6,
  newCount: 3,
  updatedAt: '2026-10-09T05:06:29Z',
  ...over,
});

const summary = (over: Partial<BoardSummary['cards']> = {}, inProgressCount = 4): BoardSummary => ({
  job: { id: 'job-1', title: 'Backend Engineer', status: 'OPEN', closesAt: '2026-11-07T23:00:00Z', closedAt: null, timezone: 'America/Chicago' },
  rankingUpdatedAt: new Date().toISOString(),
  cards: {
    applications: 47,
    notCompleted: 16,
    interviewsCompleted: 31,
    completedLast7Days: 5,
    reportsUnlocked: 6,
    reportCreditsRemaining: 14,
    movedForward: 2,
    movedForwardContacted: 1,
    rejected: 1,
    ...over,
  },
  inProgressCount,
});

const row = (over: Partial<BoardCandidate> = {}): BoardCandidate => ({
  applicationId: 'app-1',
  rank: 1,
  movement: 0,
  isNew: false,
  candidate: { label: 'A. Kowalski', candidateNo: 101, unlocked: true },
  latestInterview: { completedAt: '2026-09-19T13:52:46Z', durationMinutes: 18 },
  score: 88,
  criteria: [
    { criterionId: 'c1', name: 'Technical Skills', score: 91 },
    { criterionId: 'c2', name: 'Behavioral', score: 82 },
  ],
  weakestCriterion: null,
  minCriterionScore: 82,
  screening: { met: 0, total: 0 },
  reportStatus: 'UNLOCKED',
  hiringStatus: 'AWAITING',
  ...over,
});

const report = (over: Partial<CandidateReport> = {}): CandidateReport => ({
  candidate: { name: 'Anna Kowalski', email: 'anna@example.com', initials: 'AK' },
  job: { id: 'job-1', title: 'Backend Engineer', companyName: 'Lumen Metrics' },
  reportStatus: 'UNLOCKED',
  hiringStatus: 'AWAITING',
  contactStatus: 'NOT_CONTACTED',
  interview: { assessmentId: 'as-1', completedAt: '2026-09-19T13:52:46Z', durationMinutes: 18, language: 'en', questionCount: 5 },
  overallScore: 88,
  rank: { position: 1, outOf: 31 },
  screening: { met: 0, total: 0, items: [] },
  criteria: [{ criterionId: 'c1', name: 'Technical Skills', score: 91, evidence: null }],
  questions: [
    {
      questionId: null,
      seq: 1,
      text: 'Tell us about a backend project you contributed to.',
      score: 80,
      summary: 'Solid project walk-through.',
      criteria: [],
      evidenceObserved: null,
      areasToProbe: null,
      answerText: 'I built the billing service.',
      gapAnalysis: 'Did not quantify impact.',
      hasTranscript: false,
      hasAudio: false,
      audioSeconds: null,
    },
  ],
  strengths: ['Backend reliability'],
  probeAreas: ['Assumptions behind the proposed solution'],
  resume: { fileName: 'Anna_Kowalski_Resume.pdf', available: true },
  applicationsStillOpen: true,
  ...over,
});

const outreach = (over: Partial<Outreach> = {}): Outreach => ({
  applicationId: 'app-1',
  status: 'DRAFT',
  to: 'anna@example.com',
  subject: 'Next steps for your Backend Engineer application at Lumen Metrics',
  body: 'Hi Anna,\n\nThanks!',
  isEdited: false,
  sentAt: null,
  contactStatus: 'NOT_CONTACTED',
  mailtoUrl: 'mailto:anna@example.com?subject=Next%20steps',
  ...over,
});

const refresh = vi.fn();
function withCredits(ui: ReactNode, report = 14) {
  return <CreditsContext.Provider value={{ credits: { interview: 10, report }, refresh }}>{ui}</CreditsContext.Provider>;
}

beforeEach(() => {
  sessionStorage.clear();
  api.recordBoardVisit.mockResolvedValue(undefined);
  api.listApplicationsJobs.mockResolvedValue({ counts: { active: 2, closed: 1, total: 3 }, items: [], pageMeta: pageOf([]).pageMeta });
});

// ─── Applications ─────────────────────────────────────────────────────────────

describe('Applications list', () => {
  it('shows real jobs and counts, grouped active / closed, and opens the board', async () => {
    api.listApplicationsJobs.mockResolvedValue({
      counts: { active: 2, closed: 1, total: 3 },
      items: [job(), job({ jobId: 'job-2', title: 'Data Analyst', status: 'CLOSED', closedAt: '2026-10-01T00:00:00Z', newCount: 0, applicationCount: 12, location: 'Austin, TX', workplaceType: 'REMOTE' })],
      pageMeta: pageOf([]).pageMeta,
    });
    render(<EmployerApplicationsView />);

    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Active jobs · 1')).toBeInTheDocument();
    expect(screen.getByText('Closed jobs · 1')).toBeInTheDocument();
    expect(screen.getByText('All jobs 3')).toBeInTheDocument();
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('3 New')).toBeInTheDocument();
    expect(screen.getByText('Chicago, IL · Hybrid')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'View applications' })[0]);
    expect(go).toHaveBeenCalledWith({ name: 'board', jobId: 'job-1' });
  });

  it('search, tabs and sort go to the server', async () => {
    render(<EmployerApplicationsView />);
    await waitFor(() => expect(api.listApplicationsJobs).toHaveBeenCalledWith({ q: '', status: 'ALL', sort: 'RECENTLY_UPDATED', page: 0 }));

    fireEvent.click(await screen.findByText('Active 2'));
    await waitFor(() => expect(api.listApplicationsJobs).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'ACTIVE' })));

    fireEvent.change(screen.getByLabelText('Search by job title'), { target: { value: 'eng' } });
    await waitFor(() => expect(api.listApplicationsJobs).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'eng', page: 0 })));
  });

  it('with no published jobs, offers to create one', async () => {
    api.listApplicationsJobs.mockResolvedValue({ counts: { active: 0, closed: 0, total: 0 }, items: [], pageMeta: pageOf([]).pageMeta });
    render(<EmployerApplicationsView />);
    expect(await screen.findByText('No published jobs yet')).toBeInTheDocument();
  });
});

// ─── Board ────────────────────────────────────────────────────────────────────

describe('Candidate board', () => {
  it('renders ranked rows, then records the visit (never before)', async () => {
    api.getBoardSummary.mockResolvedValue(summary());
    api.listBoardCandidates.mockResolvedValue(
      pageOf([
        row({ movement: 2, isNew: true }),
        row({
          applicationId: 'app-2',
          rank: 2,
          movement: -1,
          candidate: { label: 'Candidate #119', candidateNo: 119, unlocked: false },
          reportStatus: 'LOCKED',
          score: 87,
          weakestCriterion: { name: 'Behavioral', score: 76 },
          minCriterionScore: 76,
          screening: { met: 2, total: 3 },
        }),
      ]),
    );
    let rowsOnScreenAtVisit = false;
    api.recordBoardVisit.mockImplementation(async () => {
      rowsOnScreenAtVisit = !!screen.queryByText('Candidate #119');
    });
    render(withCredits(<EmployerBoardView jobId="job-1" />));

    expect(await screen.findByText('A. Kowalski')).toBeInTheDocument();
    await waitFor(() => expect(api.recordBoardVisit).toHaveBeenCalledWith('job-1'));
    expect(rowsOnScreenAtVisit).toBe(true);
    expect(api.recordBoardVisit).toHaveBeenCalledTimes(1);

    expect(screen.getByText('88/100')).toBeInTheDocument();
    expect(screen.getByText('All criteria 82+')).toBeInTheDocument();
    expect(screen.getByText('Behavioral: 76')).toBeInTheDocument();
    expect(screen.getByTitle('Up 2 places since your last visit.')).toBeInTheDocument();
    expect(screen.getByTitle('Down 1 place since your last visit.')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    // Real screening when the API has it; design sample (3 dots) when it's 0/0.
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('5 completed this week')).toBeInTheDocument();
    expect(screen.getByText('14 report unlocks remaining')).toBeInTheDocument();
    expect(screen.getByText('1 contacted')).toBeInTheDocument();
    expect(screen.queryByText(/notified/)).not.toBeInTheDocument();
  });

  it('filters map to the API: locked chip, score band, search', async () => {
    api.getBoardSummary.mockResolvedValue(summary());
    // A fresh page per call, like the real API.
    api.listBoardCandidates.mockImplementation(async () => pageOf([row()]));
    render(withCredits(<EmployerBoardView jobId="job-1" />));
    await screen.findByText('A. Kowalski');

    fireEvent.click(screen.getByText('Locked 25'));
    await waitFor(() => expect(api.listBoardCandidates).toHaveBeenLastCalledWith('job-1', expect.objectContaining({ report: 'LOCKED', page: 0 })));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Below 70' } });
    await waitFor(() => expect(api.listBoardCandidates).toHaveBeenLastCalledWith('job-1', expect.objectContaining({ maxScore: 69 })));

    fireEvent.change(screen.getByLabelText('Search candidate ID or unlocked name'), { target: { value: '#117' } });
    await waitFor(() => expect(api.listBoardCandidates).toHaveBeenLastCalledWith('job-1', expect.objectContaining({ q: '#117' })));
    // Let the re-filtered rows render, then check: the visit is recorded once
    // for the board, not per filter change.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(api.recordBoardVisit).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state with candidates still interviewing', async () => {
    api.getBoardSummary.mockResolvedValue(summary({ interviewsCompleted: 0, reportsUnlocked: 0 }, 8));
    api.listBoardCandidates.mockResolvedValue(pageOf([]));
    render(withCredits(<EmployerBoardView jobId="job-1" />));
    expect(await screen.findByText('No completed interviews yet')).toBeInTheDocument();
    expect(screen.getByText('8 candidates have applied and are still completing the interview.')).toBeInTheDocument();
  });

  it('unlocking spends 1 Report Credit, refreshes, and opens the report', async () => {
    api.getBoardSummary.mockResolvedValue(summary());
    api.listBoardCandidates.mockResolvedValue(pageOf([row({ candidate: { label: 'Candidate #119', candidateNo: 119, unlocked: false }, reportStatus: 'LOCKED' })]));
    api.unlockApplication.mockResolvedValue({ applicationId: 'app-1', unlocked: true, reportCreditsBalance: 13 });
    render(withCredits(<EmployerBoardView jobId="job-1" />));

    fireEvent.click(await screen.findByRole('button', { name: 'Unlock Report' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Unlock Candidate #119’s report?')).toBeInTheDocument();
    expect(within(dialog).getByText('Uses 1 Report Credit')).toBeInTheDocument();
    expect(within(dialog).getByText('13')).toBeInTheDocument(); // remaining after unlock

    fireEvent.click(within(dialog).getByRole('button', { name: 'Unlock Report' }));
    await waitFor(() => expect(api.unlockApplication).toHaveBeenCalledWith('app-1'));
    expect(refresh).toHaveBeenCalled();
    expect(go).toHaveBeenCalledWith({ name: 'report', jobId: 'job-1', candidateId: 'app-1' });
  });

  it('with no Report Credits, offers to buy them and returns to this board', async () => {
    api.getBoardSummary.mockResolvedValue(summary());
    api.listBoardCandidates.mockResolvedValue(pageOf([row({ candidate: { label: 'Candidate #119', candidateNo: 119, unlocked: false }, reportStatus: 'LOCKED' })]));
    api.startCreditsCheckout.mockResolvedValue('about:blank');
    render(withCredits(<EmployerBoardView jobId="job-1" />, 0));

    fireEvent.click(await screen.findByRole('button', { name: 'Unlock Report' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buy Report Credits' }));
    await waitFor(() => expect(api.startCreditsCheckout).toHaveBeenCalledWith({ creditType: 'EMPLOYER_REPORT', quantity: 5, jobId: 'job-1' }));
    expect(sessionStorage.getItem('screna_employer_report_checkout')).toBe('job-1');
    expect(api.unlockApplication).not.toHaveBeenCalled();
  });

  it('a server INSUFFICIENT_CREDITS switches the dialog to buying', async () => {
    api.getBoardSummary.mockResolvedValue(summary());
    api.listBoardCandidates.mockResolvedValue(pageOf([row({ candidate: { label: 'Candidate #119', candidateNo: 119, unlocked: false }, reportStatus: 'LOCKED' })]));
    api.unlockApplication.mockRejectedValue(apiError('INSUFFICIENT_CREDITS', 403, { required: 1, available: 0 }));
    render(withCredits(<EmployerBoardView jobId="job-1" />, 3));

    fireEvent.click(await screen.findByRole('button', { name: 'Unlock Report' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Unlock Report' }));
    expect(await screen.findByRole('button', { name: 'Buy Report Credits' })).toBeInTheDocument();
    expect(go).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'report' }));
  });
});

// ─── Report ───────────────────────────────────────────────────────────────────

describe('Candidate report', () => {
  it('shows the real report; new-interview questions use the answer and gap analysis', async () => {
    api.getCandidateReport.mockResolvedValue(report());
    render(withCredits(<EmployerReportView jobId="job-1" applicationId="app-1" />));

    expect((await screen.findAllByText('Anna Kowalski')).length).toBeGreaterThan(0);
    expect(screen.getByText('88/100')).toBeInTheDocument();
    expect(screen.getByText('#1 of 31')).toBeInTheDocument();
    expect(screen.getByText('91/100')).toBeInTheDocument();
    expect(screen.getByText('I built the billing service.')).toBeInTheDocument();
    // Completion time in the viewer's zone, never a bare UTC.
    const zone = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date('2026-09-19T13:52:46Z')).find((p) => p.type === 'timeZoneName')!.value;
    expect(screen.getByText(new RegExp(`Latest interview completed Sep 19, 2026 at .* ${zone.replace(/[+]/g, '\\+')}`))).toBeInTheDocument();
    expect(screen.getByText('Did not quantify impact.')).toBeInTheDocument();
    // No transcript / audio on new interviews: controls disabled.
    expect(screen.getByRole('button', { name: 'View full transcript' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Play recording' })).toBeDisabled();
    expect(screen.queryByText(/will be notified/)).not.toBeInTheDocument();
  });

  it('moving forward saves the decision and offers to contact the candidate', async () => {
    api.getCandidateReport.mockResolvedValue(report());
    api.setHiringDecision.mockResolvedValue(row({ hiringStatus: 'MOVED_FORWARD' }));
    render(withCredits(<EmployerReportView jobId="job-1" applicationId="app-1" />));

    fireEvent.click(await screen.findByRole('button', { name: 'Move forward' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Move forward' }));
    await waitFor(() => expect(api.setHiringDecision).toHaveBeenCalledWith('app-1', 'MOVED_FORWARD'));
    fireEvent.click(await screen.findByRole('button', { name: 'Contact candidate →' }));
    expect(go).toHaveBeenCalledWith({ name: 'contact', jobId: 'job-1', candidateId: 'app-1' });
  });

  it('fetches a fresh resume link on every click (links expire)', async () => {
    api.getCandidateReport.mockResolvedValue(report());
    api.getResumeLink.mockResolvedValue({ fileName: 'cv.pdf', url: 'https://s3/cv.pdf', expiresAt: null });
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(withCredits(<EmployerReportView jobId="job-1" applicationId="app-1" />));

    fireEvent.click(await screen.findByRole('button', { name: 'Preview resume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download resume' }));
    await waitFor(() => expect(api.getResumeLink).toHaveBeenCalledTimes(2));
    expect(open).toHaveBeenCalledWith('https://s3/cv.pdf', '_blank', 'noopener');
    open.mockRestore();
  });

  it('older interviews with media load the transcript link on click', async () => {
    const q = { ...report().questions[0], questionId: 'q-1', hasTranscript: true, hasAudio: true, audioSeconds: 265 };
    api.getCandidateReport.mockResolvedValue(report({ questions: [q] }));
    api.getQuestionMedia.mockResolvedValue({ transcriptUrl: 'https://s3/t.txt', audioUrl: 'https://s3/a.mp3', durationSeconds: 265, expiresAt: null });
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(withCredits(<EmployerReportView jobId="job-1" applicationId="app-1" />));

    expect(await screen.findByText('0:00 / 4:25')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View full transcript' }));
    await waitFor(() => expect(api.getQuestionMedia).toHaveBeenCalledWith('app-1', 'q-1'));
    expect(open).toHaveBeenCalledWith('https://s3/t.txt', '_blank', 'noopener');
    open.mockRestore();
  });

  it('a locked report offers to unlock', async () => {
    api.getCandidateReport.mockRejectedValue(apiError('REPORT_LOCKED', 403));
    render(withCredits(<EmployerReportView jobId="job-1" applicationId="app-1" />));
    expect(await screen.findByText('This report is locked')).toBeInTheDocument();
  });
});

// ─── Contact ──────────────────────────────────────────────────────────────────

describe('Contact candidate', () => {
  const realLocation = window.location;
  afterEach(() => {
    Object.defineProperty(window, 'location', { value: realLocation, writable: true, configurable: true });
  });

  it('saves edits, then opens the server mailto in the employer’s mail app', async () => {
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true, configurable: true });
    api.getCandidateReport.mockResolvedValue(report({ hiringStatus: 'MOVED_FORWARD' }));
    api.getOutreach.mockResolvedValue(outreach());
    api.saveOutreach.mockImplementation(async (_id, b) => outreach({ ...b, isEdited: true, mailtoUrl: 'mailto:anna@example.com?subject=Edited' }));
    render(<EmployerContactView jobId="job-1" applicationId="app-1" />);

    const subject = await screen.findByDisplayValue('Next steps for your Backend Engineer application at Lumen Metrics');
    fireEvent.change(subject, { target: { value: 'Edited' } });
    fireEvent.click(screen.getByRole('button', { name: /Open in email app/ }));

    await waitFor(() => expect(api.saveOutreach).toHaveBeenCalledWith('app-1', { subject: 'Edited', body: 'Hi Anna,\n\nThanks!' }));
    await waitFor(() => expect(window.location.href).toBe('mailto:anna@example.com?subject=Edited'));
  });

  it('mark as sent locks the draft; undo reopens it', async () => {
    api.getCandidateReport.mockResolvedValue(report({ hiringStatus: 'MOVED_FORWARD' }));
    api.getOutreach.mockResolvedValue(outreach());
    api.outreachAction.mockImplementation(async (_id, action) =>
      action === 'mark-sent' ? outreach({ status: 'SENT', contactStatus: 'CONTACTED', sentAt: '2026-10-28T00:00:00Z' }) : outreach(),
    );
    render(<EmployerContactView jobId="job-1" applicationId="app-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Mark as sent' }));
    expect(await screen.findByText('Email marked as sent')).toBeInTheDocument();
    expect(api.outreachAction).toHaveBeenCalledWith('app-1', 'mark-sent');
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Reset draft' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(api.outreachAction).toHaveBeenCalledWith('app-1', 'undo-sent'));
    expect(await screen.findByRole('button', { name: 'Mark as sent' })).toBeInTheDocument();
  });

  it('reset regenerates the draft from the template', async () => {
    api.getCandidateReport.mockResolvedValue(report({ hiringStatus: 'MOVED_FORWARD' }));
    api.getOutreach.mockResolvedValue(outreach({ subject: 'My edit', isEdited: true }));
    api.outreachAction.mockResolvedValue(outreach());
    render(<EmployerContactView jobId="job-1" applicationId="app-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Reset draft' }));
    await waitFor(() => expect(api.outreachAction).toHaveBeenCalledWith('app-1', 'reset'));
    expect(await screen.findByDisplayValue('Next steps for your Backend Engineer application at Lumen Metrics')).toBeInTheDocument();
  });

  it('without a Move forward decision, explains why it can’t contact yet', async () => {
    api.getCandidateReport.mockResolvedValue(report());
    api.getOutreach.mockRejectedValue(apiError('INVALID_STATE', 409));
    render(<EmployerContactView jobId="job-1" applicationId="app-1" />);
    expect(await screen.findByText('Move this candidate forward to contact them')).toBeInTheDocument();
  });
});
