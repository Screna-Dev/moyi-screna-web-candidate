/**
 * Note page (/experience/:id) — the server-embedded copy of the note.
 *
 * Every full load of /experience/:id embeds the PUBLIC payload (trimmed,
 * `user: null`) whoever is reading. Guests boot from it without a request;
 * signed-in readers must fetch their own copy, or Advanced+ would read trimmed
 * notes as whole and Free/Basic would see the preview banner on their 2 newest.
 *
 * The page reads the embedded tag once, at import, so it is planted in
 * vi.hoisted — before the page module loads.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { noteMocks, notePost, setPlan, setSignedIn } from './note-page-mocks';

const TRIMMED_NOTE = 'They asked me to design a rate limiter.';
const FULL_NOTE = 'They asked me to design a rate limiter. I started with a token bucket and then discussed sliding windows.';

vi.hoisted(() => {
  const seed = {
    post: {
      id: 'post-1',
      company: 'Meta',
      role: 'Software Engineer',
      round: 'Technical Phone Screen',
      date: '2026-09-01T00:00:00Z',
      summary: 'Two coding rounds and a design round.',
      status: 'PUBLISHED',
      user: null,
      isAnonymous: false,
      questions: [{ id: 'q-1', seq: 1, title: 'Design a rate limiter', categories: [], notes: 'They asked me to design a rate limiter.' }],
    },
    comments: [],
    // The server's call (here: a body under the word floor). The post itself
    // passes isIndexablePost, so only the seed can make this page noindex.
    noindex: true,
  };
  const tag = document.createElement('script');
  tag.type = 'application/json';
  tag.id = '__prerender_experience__';
  tag.textContent = JSON.stringify(seed);
  document.body.appendChild(tag);
});

vi.mock('@/services/CommunityService', async (orig) => ({ ...(await orig<object>()), ...noteMocks.community }));
vi.mock('@/services/api', async (orig) => ({ ...(await orig<object>()), hasStoredSession: () => noteMocks.session.signedIn }));
vi.mock('@/services/QuestionBankService', () => ({ getQuestionAiHints: () => new Promise(() => {}) }));
vi.mock('@/hooks/useDwellTracking', () => ({ useDwellTracking: () => {} }));
vi.mock('@/components/newDesign/dashboard-layout', () => ({ DashboardLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/newDesign/insights-layout', () => ({ InsightsLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => noteMocks.auth() }));
vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => noteMocks.plan() }));
vi.mock('@/hooks/useCompanyPass', () => ({ useCompanyPasses: () => noteMocks.passes() }));

import { ExperienceDetailPage } from '@/pages/newDesign/experience-detail';

const renderNote = () =>
  render(
    <MemoryRouter initialEntries={['/experience/post-1']}>
      <Routes>
        <Route path="/experience/:id" element={<ExperienceDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

/** robots once useSeo has written the head (data-seo-ready marks that). */
const robotsWhenReady = async () => {
  await waitFor(() => expect(document.documentElement.getAttribute('data-seo-ready')).toBe('1'));
  return document.head.querySelector('meta[name="robots"]')?.getAttribute('content');
};

describe('note page — embedded copy', () => {
  it('boots a guest from it without a request', async () => {
    setSignedIn(false);
    renderNote();
    expect(await screen.findByText(TRIMMED_NOTE)).toBeInTheDocument();
    expect(noteMocks.community.getPublicPost).not.toHaveBeenCalled();
    expect(noteMocks.community.getPost).not.toHaveBeenCalled();
  });

  it("keeps the server's noindex rather than recomputing it", async () => {
    setSignedIn(false);
    renderNote();
    await screen.findByText(TRIMMED_NOTE);
    expect(await robotsWhenReady()).toBe('noindex, follow');
    expect(document.head.querySelector('script[data-seo]')).toBeNull();
  });

  it('falls back to the content gate when there is no seed to read', async () => {
    setSignedIn(true);
    setPlan('Advanced');
    noteMocks.community.getPost.mockResolvedValue({
      data: { data: notePost({ user: { id: 'u9', name: 'Author' }, notes: FULL_NOTE }) },
    });
    renderNote();
    await screen.findByText(FULL_NOTE);
    expect(await robotsWhenReady()).toBe('index, follow');
  });

  it('is ignored for an Advanced reader, who fetches and sees the full note', async () => {
    setSignedIn(true);
    setPlan('Advanced');
    noteMocks.community.getPost.mockResolvedValue({
      data: { data: notePost({ user: { id: 'u9', name: 'Author' }, notes: FULL_NOTE }) },
    });
    renderNote();
    expect(await screen.findByText(FULL_NOTE)).toBeInTheDocument();
    expect(noteMocks.community.getPost).toHaveBeenCalledWith('post-1');
    expect(screen.queryByText(TRIMMED_NOTE)).toBeNull();
  });

  it('is ignored for a Free reader, so one of their 2 newest is not shown as a preview', async () => {
    setSignedIn(true);
    setPlan('Free');
    noteMocks.community.getPost.mockResolvedValue({
      data: { data: notePost({ user: { id: 'u9', name: 'Author' }, notes: FULL_NOTE }) },
    });
    renderNote();
    expect(await screen.findByText(FULL_NOTE)).toBeInTheDocument();
    expect(screen.queryByText("You're reading a preview")).toBeNull();
  });
});
