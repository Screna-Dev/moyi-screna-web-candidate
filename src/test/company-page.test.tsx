/**
 * Company page (/interview-questions/:company and /interview-insights/:company),
 * without an embedded copy — i.e. reached by in-app navigation.
 *
 * Covers:
 *   • the Free/Basic preview on note cards (trimmed cards get an upgrade line)
 *   • the intro paragraph + FAQ built from companies/breakdown (public page only)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import {
  companyMocks,
  defaultAnswers,
  feedPost,
  filterPopoversMock,
  setPlan,
  setSignedIn,
  setPass,
  FAQ_Q1,
  FAQ_Q2,
  INTRO,
  SUMMARY,
  stablePosthog,
  passesMock,
} from './company-page-mocks';

vi.mock('posthog-js/react', () => ({ usePostHog: () => stablePosthog }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<object>()), useNavigate: () => mockNavigate }));
vi.mock('@/services/CommunityService', async (orig) => ({ ...(await orig<object>()), ...companyMocks.community }));
vi.mock('@/services/api', async (orig) => ({ ...(await orig<object>()), hasStoredSession: () => companyMocks.session.signedIn }));
vi.mock('@/utils/companySlug', async (orig) => ({
  ...(await orig<object>()),
  resolveCompanyName: () => Promise.resolve({ name: 'Meta', exact: true }),
}));
vi.mock('@/components/newDesign/interview-insights/filter-popovers', () => filterPopoversMock);
vi.mock('@/components/newDesign/interview-insights/quick-mock', () => ({ CompanyMockLauncher: () => null }));
vi.mock('@/components/newDesign/dashboard-layout', () => ({ DashboardLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/newDesign/insights-layout', () => ({ InsightsLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => companyMocks.auth() }));
vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => companyMocks.plan() }));
vi.mock('@/hooks/useCompanyPass', () => ({ useCompanyPasses: () => passesMock() }));

import { CompanyDetailPage } from '@/pages/newDesign/company-detail';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/interview-questions/:companyId" element={<CompanyDetailPage isPublic />} />
        <Route path="/interview-questions/:companyId/page/:n" element={<CompanyDetailPage isPublic />} />
        <Route path="/interview-insights/:companyId" element={<CompanyDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const jsonLd = () =>
  [...document.head.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent || '{}'));

const UPGRADE_LINE = /Upgrade to Advanced to read the full write-up/;

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  document.head.innerHTML = '';
  setSignedIn(false);
  setPlan('Free');
  setPass(null);
  defaultAnswers();
});

describe('company page — Free/Basic preview on cards', () => {
  // Page 0, newest first. For FREE/BASIC the first 2 rows are full and every
  // later row is trimmed (frontend-community-api.md §1) — anonymous or not.
  const feed = [
    feedPost('newest-1'),
    feedPost('newest-2', { user: null, isAnonymous: true, notes: 'Anonymous full note.' }),
    feedPost('trimmed-3', { user: null, notes: 'First sentence of note three.' }),
    feedPost('anon-4', { user: null, isAnonymous: true, notes: 'Anonymous first sentence.' }),
  ];

  it('fetches the feed once, not in a loop', async () => {
    setSignedIn(true);
    companyMocks.community.getPosts.mockResolvedValue({ data: { data: feed } });
    renderAt('/interview-insights/meta');
    await screen.findByText('Summary of trimmed-3.');
    await new Promise((r) => setTimeout(r, 300));
    expect(companyMocks.community.getPosts).toHaveBeenCalledTimes(1);
  });

  it('adds the first line and an upgrade prompt to every card past the 2 newest', async () => {
    setSignedIn(true);
    companyMocks.community.getPosts.mockResolvedValue({ data: { data: feed } });
    renderAt('/interview-insights/meta');
    expect(await screen.findByText('Summary of trimmed-3.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: UPGRADE_LINE })).toHaveLength(2);
    expect(screen.getByText(/First sentence of note three\./)).toBeInTheDocument();
    // Anonymous is no exemption: past the 2 newest it is trimmed too.
    expect(screen.getByText(/Anonymous first sentence\./)).toBeInTheDocument();
    // The 2 newest — one anonymous, so `user: null` — carry no excerpt.
    expect(screen.queryByText(/Notes of newest-1/)).toBeNull();
    expect(screen.queryByText(/Anonymous full note/)).toBeNull();
  });

  it('counts rank across Load more pages', async () => {
    setSignedIn(true);
    // Page 0 is ten full-looking rows; page 1 continues the same ranking.
    companyMocks.community.getPosts
      .mockResolvedValueOnce({ data: { data: Array.from({ length: 10 }, (_, i) => feedPost(`r-${i}`, i < 2 ? {} : { user: null })) } })
      .mockResolvedValueOnce({ data: { data: [feedPost('r-10', { user: null, notes: 'Page two sentence.' })] } });
    renderAt('/interview-insights/meta');
    fireEvent.click(await screen.findByRole('button', { name: 'Load more experiences' }));
    expect(await screen.findByText(/Page two sentence\./)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: UPGRADE_LINE })).toHaveLength(9);
  });

  it('shows no preview marks to a Company Pass holder on this company', async () => {
    setSignedIn(true);
    setPass('Meta');
    companyMocks.community.getPosts.mockResolvedValue({ data: { data: feed } });
    renderAt('/interview-insights/meta');
    expect(await screen.findByText('Summary of trimmed-3.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: UPGRADE_LINE })).toBeNull();
  });

  it('does not blur archive-page cards for a Free reader (public payload, user null on all)', async () => {
    setSignedIn(true);
    companyMocks.community.getPublicPosts.mockResolvedValue({
      data: {
        data: {
          posts: Array.from({ length: 10 }, (_, i) => feedPost(`a-${i}`, { user: null, notes: `Public sentence ${i}.` })),
          total: 25,
          size: 10,
          page: 0,
        },
      },
    });
    renderAt('/interview-questions/meta/page/2');
    expect(await screen.findByText('Summary of a-0.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: UPGRADE_LINE })).toBeNull();
    expect(screen.queryByText(/Public sentence/)).toBeNull();
  });

  it('explains the limit in the banner', async () => {
    setSignedIn(true);
    companyMocks.community.getPosts.mockResolvedValue({ data: { data: feed } });
    renderAt('/interview-insights/meta');
    expect(await screen.findByText('Read every note in full with Advanced')).toBeInTheDocument();
    expect(screen.getByText(/Your plan includes the 2 newest notes for Meta in full/)).toBeInTheDocument();
    expect(screen.queryByText(/is yours to read in full/)).toBeNull();
  });

  it('shows no preview marks to Advanced readers', async () => {
    setSignedIn(true);
    setPlan('Advanced');
    companyMocks.community.getPosts.mockResolvedValue({ data: { data: feed } });
    renderAt('/interview-insights/meta');
    expect(await screen.findByText('Summary of trimmed-3.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: UPGRADE_LINE })).toBeNull();
    expect(screen.queryByText('Read every note in full with Advanced')).toBeNull();
  });

  it('keeps the sign-in prompt for guests', async () => {
    companyMocks.community.getPublicPosts.mockResolvedValue({
      data: { data: { posts: [feedPost('g-1', { user: null, notes: 'Guest sentence.' })], total: 1, size: 10, page: 0 } },
    });
    renderAt('/interview-questions/meta');
    expect(await screen.findByRole('button', { name: /Create a free account to read the full write-up/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: UPGRADE_LINE })).toBeNull();
  });
});

describe('company page — intro and FAQ from the breakdown', () => {
  it('replaces the company summary with the intro on the public page', async () => {
    renderAt('/interview-questions/meta');
    expect(await screen.findByText(INTRO)).toBeInTheDocument();
    expect(companyMocks.community.getPublicCompanyBreakdown).toHaveBeenCalledWith('Meta');
    expect(screen.queryByText(SUMMARY)).toBeNull();
  });

  it('renders the FAQ and its FAQPage JSON-LD, with the intro as Article.description', async () => {
    renderAt('/interview-questions/meta');
    expect(await screen.findByRole('heading', { level: 3, name: FAQ_Q1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: FAQ_Q2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Meta interview FAQ' })).toBeInTheDocument();
    await waitFor(() => expect(jsonLd().map((b) => b['@type'])).toEqual(['Article', 'FAQPage']));
    const [article, faq] = jsonLd();
    expect(article.description).toBe(INTRO);
    expect(faq.mainEntity.map((q: any) => q.name)).toEqual([FAQ_Q1, FAQ_Q2]);
  });

  it('shows neither intro nor summary when the breakdown is NOT_FOUND', async () => {
    companyMocks.community.getPublicCompanyBreakdown.mockRejectedValue({
      response: { status: 400, data: { errorCode: 'NOT_FOUND' } },
    });
    renderAt('/interview-questions/meta');
    await waitFor(() => expect(companyMocks.community.getPublicCompanyBreakdown).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByLabelText('Loading summary')).toBeNull());
    expect(screen.queryByText(SUMMARY)).toBeNull();
    expect(screen.queryByText(/Most of these Meta write-ups/)).toBeNull();
    expect(screen.queryByText('Meta interview FAQ')).toBeNull();
  });

  it('keeps the intro but drops the FAQ on an archive page', async () => {
    companyMocks.community.getPublicPosts.mockResolvedValue({
      data: { data: { posts: Array.from({ length: 10 }, (_, i) => feedPost(`p-${i}`, { user: null })), total: 25, size: 10, page: 0 } },
    });
    renderAt('/interview-questions/meta/page/2');
    expect(await screen.findByText(INTRO)).toBeInTheDocument();
    expect(screen.queryByText('Meta interview FAQ')).toBeNull();
    await waitFor(() => expect(jsonLd().map((b) => b['@type'])).toEqual(['Article']));
  });

  it('leaves the signed-in personal-centre page on the company summary, with no FAQ', async () => {
    setSignedIn(true);
    renderAt('/interview-insights/meta');
    expect(await screen.findByText(SUMMARY)).toBeInTheDocument();
    expect(companyMocks.community.getPublicCompanyBreakdown).not.toHaveBeenCalled();
    expect(screen.queryByText(INTRO)).toBeNull();
    expect(screen.queryByText('Meta interview FAQ')).toBeNull();
  });
});

describe('company page — Load more, FAQ and pager', () => {
  const tenGuestPosts = Array.from({ length: 10 }, (_, i) => feedPost(`p-${i}`, { user: null }));
  const guestFeed = (total: number) =>
    companyMocks.community.getPublicPosts.mockResolvedValue({
      data: { data: { posts: tenGuestPosts, total, size: 10, page: 0 } },
    });

  it('tells a guest they see the newest notes, not all of them', async () => {
    guestFeed(25);
    renderAt('/interview-questions/meta');
    expect(await screen.findByText('The newest notes, shortened answers')).toBeInTheDocument();
    expect(
      await screen.findByText(
        'See the newest notes for Meta, each answer trimmed to its first line — create a free account to browse all 40 and read them in full.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Browse all/)).toBeNull();
  });

  it('has no pager on the company page', async () => {
    guestFeed(25);
    renderAt('/interview-questions/meta');
    await screen.findByText('Summary of p-9.');
    expect(screen.queryByRole('navigation', { name: 'All notes, oldest first' })).toBeNull();
  });

  it('sends a guest to sign in from Load more instead of loading', async () => {
    guestFeed(25);
    renderAt('/interview-questions/meta');
    const button = await screen.findByRole('button', { name: 'Sign in to load more experiences' });
    expect(screen.queryByRole('button', { name: 'Load more experiences' })).toBeNull();
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/^\/auth\?.*interview-questions%2Fmeta/));
    expect(companyMocks.community.getPublicPosts).toHaveBeenCalledTimes(1);
  });

  it('offers a guest nothing when there is nothing more', async () => {
    guestFeed(10);
    renderAt('/interview-questions/meta');
    await screen.findByText('Summary of p-9.');
    expect(screen.queryByRole('button', { name: /load more experiences/i })).toBeNull();
  });

  it('loads the next page for a signed-in reader on the public page', async () => {
    setSignedIn(true);
    setPlan('Advanced');
    companyMocks.community.getPosts.mockResolvedValue({
      data: { data: Array.from({ length: 10 }, (_, i) => feedPost(`s-${i}`)) },
    });
    renderAt('/interview-questions/meta');
    fireEvent.click(await screen.findByRole('button', { name: 'Load more experiences' }));
    await waitFor(() =>
      expect(companyMocks.community.getPosts).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('puts the FAQ after the note cards and Load more', async () => {
    guestFeed(25);
    renderAt('/interview-questions/meta');
    const button = await screen.findByRole('button', { name: 'Sign in to load more experiences' });
    const faq = await screen.findByRole('heading', { level: 2, name: 'Meta interview FAQ' });
    const lastCard = screen.getByText('Summary of p-9.');
    const follows = (a: Node, b: Node) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(lastCard, faq)).toBe(true);
    expect(follows(button, faq)).toBe(true);
  });

  it('keeps the pager on an archive page', async () => {
    companyMocks.community.getPublicPosts.mockResolvedValue({
      data: { data: { posts: tenGuestPosts, total: 25, size: 10, page: 0 } },
    });
    renderAt('/interview-questions/meta/page/2');
    const pager = await screen.findByRole('navigation', { name: 'All notes, oldest first' });
    expect(pager.querySelector('a[href="/interview-questions/meta/page/1"]')).not.toBeNull();
  });

  it('keeps Load more on the personal-centre page', async () => {
    setSignedIn(true);
    setPlan('Advanced');
    companyMocks.community.getPosts.mockResolvedValue({
      data: { data: Array.from({ length: 10 }, (_, i) => feedPost(`m-${i}`)) },
    });
    renderAt('/interview-insights/meta');
    expect(await screen.findByRole('button', { name: 'Load more experiences' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'All notes, oldest first' })).toBeNull();
  });
});
