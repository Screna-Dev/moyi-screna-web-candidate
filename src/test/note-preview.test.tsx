/**
 * Note page (/experience/:id) — the Free/Basic preview.
 *
 * Free/Basic readers get the 2 newest notes per company in full; every other
 * note now comes back 200 trimmed (first sentence per question, `user: null`)
 * instead of 403 INSUFFICIENT_PLAN_TIER. The page must show the trimmed note
 * with an upgrade prompt — never the empty upgrade dialog — and must not mark
 * full notes, anonymous notes or Advanced+ readers as previews.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { noteMocks, notePost, setPass, setPlan, setSignedIn } from './note-page-mocks';

vi.mock('@/services/CommunityService', async (orig) => ({ ...(await orig<object>()), ...noteMocks.community }));
vi.mock('@/services/api', async (orig) => ({ ...(await orig<object>()), hasStoredSession: () => noteMocks.session.signedIn }));
vi.mock('@/services/QuestionBankService', () => ({ getQuestionAiHints: () => new Promise(() => {}) }));
vi.mock('@/hooks/useDwellTracking', () => ({ useDwellTracking: () => {} }));
vi.mock('@/components/newDesign/dashboard-layout', () => ({ DashboardLayout: ({ children }: any) => <div data-testid="dashboard">{children}</div> }));
vi.mock('@/components/newDesign/insights-layout', () => ({ InsightsLayout: ({ children }: any) => <div data-testid="insights">{children}</div> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => noteMocks.auth() }));
vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => noteMocks.plan() }));
vi.mock('@/hooks/useCompanyPass', () => ({ useCompanyPasses: () => noteMocks.passes() }));

import { ExperienceDetailPage } from '@/pages/newDesign/experience-detail';
import { safeCapture } from '@/utils/posthog';

const renderNote = () =>
  render(
    <MemoryRouter initialEntries={['/experience/post-1']}>
      <Routes>
        <Route path="/experience/:id" element={<ExperienceDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

const FULL_NOTE = 'They asked me to design a rate limiter. I started with a token bucket and then discussed sliding windows.';
const TRIMMED_NOTE = 'They asked me to design a rate limiter.';

/** The company's page-0 search rows; the first 2 are its newest (full) notes. */
const companyRows = (...ids: string[]) =>
  noteMocks.community.getPosts.mockResolvedValue({ data: { data: ids.map((id) => ({ id })) } });

beforeEach(() => {
  vi.clearAllMocks();
  setSignedIn(true);
  setPlan('Free');
  setPass(null);
  // By default post-1 is the company's 4th newest — outside the full pair.
  companyRows('new-1', 'new-2', 'new-3', 'post-1');
});

describe('note page — Free/Basic preview', () => {
  it('shows a trimmed note as a preview with an upgrade prompt, not the upgrade dialog', async () => {
    noteMocks.community.getPost.mockResolvedValue({ data: { data: notePost({ user: null, notes: TRIMMED_NOTE }) } });
    renderNote();
    expect(await screen.findByText("You're reading a preview")).toBeInTheDocument();
    expect(screen.getByText(TRIMMED_NOTE)).toBeInTheDocument();
    expect(screen.getByText('First line only')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upgrade to Advanced to read the full note/ })).toBeInTheDocument();
    expect(screen.queryByText('Upgrade to view this post')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('reports the preview as a paywall view', async () => {
    noteMocks.community.getPost.mockResolvedValue({ data: { data: notePost({ user: null, notes: TRIMMED_NOTE }) } });
    renderNote();
    await screen.findByText("You're reading a preview");
    expect(safeCapture).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({ note_id: 'post-1', required_tier: 'advanced', user_current_tier: 'free' }),
    );
  });

  it('shows one of the 2 newest notes in full, with no preview marks', async () => {
    noteMocks.community.getPost.mockResolvedValue({
      data: { data: notePost({ user: { id: 'u9', name: 'Author' }, notes: FULL_NOTE }) },
    });
    renderNote();
    expect(await screen.findByText(FULL_NOTE)).toBeInTheDocument();
    expect(screen.queryByText("You're reading a preview")).toBeNull();
    expect(screen.queryByText('First line only')).toBeNull();
  });

  it('decides by rank: looks the note up on page 0 of its company', async () => {
    noteMocks.community.getPost.mockResolvedValue({ data: { data: notePost({ user: null, notes: TRIMMED_NOTE }) } });
    renderNote();
    await screen.findByText("You're reading a preview");
    expect(noteMocks.community.getPosts).toHaveBeenCalledWith({ company: 'Meta', page: 0 });
  });

  it('does not look anything up for a note with an author shown', async () => {
    noteMocks.community.getPost.mockResolvedValue({
      data: { data: notePost({ user: { id: 'u9', name: 'Author' }, notes: FULL_NOTE }) },
    });
    renderNote();
    await screen.findByText(FULL_NOTE);
    expect(noteMocks.community.getPosts).not.toHaveBeenCalled();
  });

  it('does not mark an anonymous note among the 2 newest, although its user is null', async () => {
    companyRows('post-1', 'new-2', 'new-3');
    noteMocks.community.getPost.mockResolvedValue({
      data: { data: notePost({ user: null, isAnonymous: true, notes: FULL_NOTE }) },
    });
    renderNote();
    expect(await screen.findByText(FULL_NOTE)).toBeInTheDocument();
    await waitFor(() => expect(noteMocks.community.getPosts).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText("You're reading a preview")).toBeNull();
  });

  it('marks an anonymous note outside the 2 newest as a preview', async () => {
    noteMocks.community.getPost.mockResolvedValue({
      data: { data: notePost({ user: null, isAnonymous: true, notes: TRIMMED_NOTE }) },
    });
    renderNote();
    expect(await screen.findByText("You're reading a preview")).toBeInTheDocument();
  });

  it('never marks a note as a preview for a Company Pass holder on that company', async () => {
    setPass('Meta');
    noteMocks.community.getPost.mockResolvedValue({
      data: { data: notePost({ user: null, isAnonymous: true, notes: FULL_NOTE }) },
    });
    renderNote();
    expect(await screen.findByText(FULL_NOTE)).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText("You're reading a preview")).toBeNull();
    expect(noteMocks.community.getPosts).not.toHaveBeenCalled();
  });

  it('falls back to the payload when the rank lookup fails', async () => {
    noteMocks.community.getPosts.mockRejectedValue(new Error('down'));
    noteMocks.community.getPost.mockResolvedValue({ data: { data: notePost({ user: null, notes: TRIMMED_NOTE }) } });
    renderNote();
    expect(await screen.findByText("You're reading a preview")).toBeInTheDocument();
  });

  it.each(['Advanced', 'Flagship'] as const)('never marks a note as a preview for %s', async (plan) => {
    setPlan(plan);
    noteMocks.community.getPost.mockResolvedValue({ data: { data: notePost({ user: null, notes: FULL_NOTE }) } });
    renderNote();
    expect(await screen.findByText(FULL_NOTE)).toBeInTheDocument();
    expect(screen.queryByText("You're reading a preview")).toBeNull();
    expect(screen.queryByText('First line only')).toBeNull();
  });

  it('still handles a 403 from an older backend with the upgrade dialog', async () => {
    noteMocks.community.getPost.mockRejectedValue({
      response: { status: 403, data: { errorCode: 'INSUFFICIENT_PLAN_TIER' } },
    });
    renderNote();
    expect(await screen.findByText('Upgrade to view this post')).toBeInTheDocument();
  });
});

describe('note page — guests are unchanged', () => {
  it('reads the public endpoint and offers sign-in, not an upgrade', async () => {
    setSignedIn(false);
    noteMocks.community.getPublicPost.mockResolvedValue({
      data: { data: { posts: [notePost({ user: null, notes: TRIMMED_NOTE })], total: 1, size: 10, page: 0 } },
    });
    renderNote();
    expect(await screen.findByText('First line only')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create a free account to read the full note/ })).toBeInTheDocument();
    expect(screen.queryByText("You're reading a preview")).toBeNull();
    expect(noteMocks.community.getPost).not.toHaveBeenCalled();
    await waitFor(() => expect(noteMocks.community.getPublicPost).toHaveBeenCalledWith('post-1'));
  });
});
