/**
 * Company page (/interview-questions/:company and /interview-insights/:company),
 * without an embedded copy — i.e. reached by in-app navigation.
 *
 * Covers:
 *   • the Free/Basic preview on note cards (trimmed cards get an upgrade line)
 *   • the intro paragraph + FAQ built from companies/breakdown (public page only)
 *   • the company × role page (/interview-questions/:company/:role)
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
  PROFILE,
  SUMMARY,
  stablePosthog,
  passesMock,
} from './company-page-mocks';

vi.mock('posthog-js/react', () => ({ usePostHog: () => stablePosthog }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...(await orig<object>()), useNavigate: () => mockNavigate }));
vi.mock('@/services/CommunityService', async (orig) => ({ ...(await orig<object>()), ...companyMocks.community }));
vi.mock('@/services/api', async (orig) => ({ ...(await orig<object>()), hasStoredSession: () => companyMocks.session.signedIn }));
vi.mock('@/components/newDesign/interview-insights/filter-popovers', () => filterPopoversMock);
vi.mock('@/components/newDesign/interview-insights/quick-mock', () => ({ CompanyMockLauncher: () => null }));
vi.mock('@/components/newDesign/dashboard-layout', () => ({ DashboardLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/newDesign/insights-layout', () => ({ InsightsLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => companyMocks.auth() }));
vi.mock('@/hooks/useUserPlan', () => ({ useUserPlan: () => companyMocks.plan() }));
vi.mock('@/hooks/useCompanyPass', () => ({ useCompanyPasses: () => passesMock() }));
// The role links' client-side count is one search per role; stubbed so the
// feed assertions below count feed requests only.
const roleLinksMock = vi.hoisted(() => vi.fn());
// The company × role stats (one cached list in the real module), per test.
const roleStatsMock = vi.hoisted(() => vi.fn());
const roleLabelsMock = vi.hoisted(() => vi.fn());
vi.mock('@/utils/companyRole', async (orig) => ({
  ...(await orig<object>()),
  getCompanyRoleLinks: roleLinksMock,
  getRoleStats: roleStatsMock,
  getCompanyRoleLabels: roleLabelsMock,
}));

import { CompanyDetailPage } from '@/pages/newDesign/company-detail';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/interview-questions/:companyId" element={<CompanyDetailPage isPublic />} />
        <Route path="/interview-questions/:companyId/page/:n" element={<CompanyDetailPage isPublic />} />
        <Route path="/interview-questions/:companyId/:role" element={<CompanyDetailPage isPublic />} />
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
  roleLinksMock.mockResolvedValue([]);
  roleStatsMock.mockResolvedValue([]);
  roleLabelsMock.mockResolvedValue([]);
});

describe('company page — identity from the slug', () => {
  // The URL segment is the backend's slug; the profile is looked up by it and
  // every other endpoint is queried with the profile's displayName.
  it('looks the profile up by slug and the feed by its displayName', async () => {
    companyMocks.community.getPublicCompanyProfile.mockResolvedValue({
      data: { data: { ...PROFILE, displayName: 'AT&T', slug: 'at-t' } },
    });
    renderAt('/interview-questions/at-t');
    await waitFor(() => expect(companyMocks.community.getPublicPosts).toHaveBeenCalled());
    expect(companyMocks.community.getPublicCompanyProfile).toHaveBeenCalledWith({ slug: 'at-t' });
    expect(companyMocks.community.getPublicPosts.mock.calls[0][0]).toMatchObject({ company: 'AT&T' });
    expect(companyMocks.community.getPublicCompanyBreakdown).toHaveBeenCalledWith('AT&T');
  });

  // Without a company, the public search answers with site-wide notes — which
  // would render every company's notes under this heading.
  it('asks for no notes when the profile is NOT_FOUND', async () => {
    companyMocks.community.getPublicCompanyProfile.mockRejectedValue({
      response: { status: 400, data: { status: 'ERROR', errorCode: 'NOT_FOUND' } },
    });
    renderAt('/interview-questions/no-such-company');
    await waitFor(() => expect(companyMocks.community.getPublicCompanyProfile).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 300));
    expect(companyMocks.community.getPublicPosts).not.toHaveBeenCalled();
    expect(companyMocks.community.getPublicCompanyBreakdown).not.toHaveBeenCalled();
  });
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

describe('company × role page', () => {
  const roleFeed = (n: number, total: number) => ({
    data: { data: { posts: Array.from({ length: n }, (_, i) => feedPost(`swe-${i}`)), total, size: 10, page: 0 } },
  });

  it('locks the feed to the role label and shows its count, breadcrumb and head tags', async () => {
    companyMocks.community.getPublicPosts.mockResolvedValue(roleFeed(10, 15));
    renderAt('/interview-questions/meta/software-engineer');
    await waitFor(() => expect(document.title).toBe('Meta Software Engineer Interview Questions | Screna AI'));
    expect(companyMocks.community.getPublicPosts.mock.calls[0][0]).toMatchObject({
      company: 'Meta',
      role: 'Software Engineer',
    });
    // No breakdown: the opening paragraph is the role's own count.
    expect(companyMocks.community.getPublicCompanyBreakdown).not.toHaveBeenCalled();
    expect(
      screen.getByText(/15 Software Engineers have shared notes from their Meta interviews/),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Meta›Software Engineer');
    expect(screen.queryByText(FAQ_Q1)).not.toBeInTheDocument();
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://www.screna.ai/interview-questions/meta/software-engineer',
    );
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index, follow');
    expect(jsonLd().some((d) => d['@type'] === 'BreadcrumbList')).toBe(true);
  });

  it('ignores a role filter restored for the company page', async () => {
    sessionStorage.setItem(
      'interviewInsights:companyFilters:meta',
      JSON.stringify({ role: 'Data Scientist', round: '', level: '', time: '', sort: '', search: '' }),
    );
    companyMocks.community.getPublicPosts.mockResolvedValue(roleFeed(10, 15));
    renderAt('/interview-questions/meta/software-engineer');
    await waitFor(() => expect(companyMocks.community.getPublicPosts).toHaveBeenCalled());
    expect(companyMocks.community.getPublicPosts.mock.calls[0][0]).toMatchObject({ role: 'Software Engineer' });
  });

  it('is noindex below the threshold', async () => {
    companyMocks.community.getPublicPosts.mockResolvedValue(roleFeed(4, 4));
    renderAt('/interview-questions/meta/software-engineer');
    await waitFor(() =>
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow'),
    );
  });

  it('gets the count from the public endpoint for a signed-in reader', async () => {
    setSignedIn(true);
    setPlan('Advanced');
    companyMocks.community.getPosts.mockResolvedValue({ data: { data: [feedPost('swe-0')] } });
    companyMocks.community.getPublicPosts.mockResolvedValue(roleFeed(10, 15));
    renderAt('/interview-questions/meta/software-engineer');
    await waitFor(() => expect(screen.getByText(/15 Software Engineers have shared notes/)).toBeInTheDocument());
    expect(companyMocks.community.getPosts.mock.calls[0][0]).toMatchObject({ role: 'Software Engineer' });
  });

  it.each(['not-a-role', 'page'])('renders not-found for /meta/%s and fetches no notes', async (slug) => {
    renderAt(`/interview-questions/meta/${slug}`);
    expect(await screen.findByText('There is no such role for this company.')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 300));
    expect(companyMocks.community.getPublicPosts).not.toHaveBeenCalled();
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow');
  });
});

describe('role links', () => {
  const LINKS = [
    { slug: 'software-engineer', label: 'Software Engineer', count: 1188 },
    { slug: 'data-scientist', label: 'Data Scientist', count: 489 },
  ];

  it('counts them client-side when there is no seed, and links each role page', async () => {
    roleLinksMock.mockResolvedValue(LINKS);
    renderAt('/interview-questions/meta');
    const bar = await screen.findByRole('navigation', { name: 'Interview questions by role' });
    expect(roleLinksMock).toHaveBeenCalledWith('Meta');
    expect(bar.querySelector('a[href="/interview-questions/meta/software-engineer"]')).toHaveTextContent(
      'Software Engineer1,188',
    );
    // Locked Round / Level / Time stay; the locked Role chip is gone.
    expect(screen.queryByRole('button', { name: 'Role' })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Round' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent(/Unlock all/);
  });

  it('highlights the current role on a role page', async () => {
    roleLinksMock.mockResolvedValue(LINKS);
    companyMocks.community.getPublicPosts.mockResolvedValue({
      data: { data: { posts: [feedPost('swe-0')], total: 15, size: 10, page: 0 } },
    });
    renderAt('/interview-questions/meta/software-engineer');
    const bar = await screen.findByRole('navigation', { name: 'Interview questions by role' });
    expect(bar.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe(
      '/interview-questions/meta/software-engineer',
    );
    expect(screen.queryByRole('heading', { name: 'Meta interview guides by role' })).toBeNull();
  });

  it('shows nothing when no role qualifies', async () => {
    renderAt('/interview-questions/meta');
    await waitFor(() => expect(roleLinksMock).toHaveBeenCalled());
    expect(screen.queryByRole('navigation', { name: 'Interview questions by role' })).toBeNull();
  });

  // The three public routes render the same component, so its state survives
  // a link between them — the previous role's count must not.
  it("shows each role's own count after moving between role pages, signed in", async () => {
    setSignedIn(true);
    setPlan('Advanced');
    roleLinksMock.mockResolvedValue(LINKS);
    companyMocks.community.getPosts.mockResolvedValue({ data: { data: [feedPost('p-0')] } });
    companyMocks.community.getPublicPosts.mockImplementation(({ role }: { role?: string }) =>
      Promise.resolve({
        data: { data: { posts: [], total: role === 'Data Scientist' ? 12 : 15, size: 10, page: 0 } },
      }),
    );
    renderAt('/interview-questions/meta/software-engineer');
    expect(await screen.findByText(/^15 Software Engineers have shared notes/)).toBeInTheDocument();
    const bar = screen.getByRole('navigation', { name: 'Interview questions by role' });
    fireEvent.click(bar.querySelector('a[href="/interview-questions/meta/data-scientist"]')!);
    expect(await screen.findByText(/^12 Data Scientists have shared notes/)).toBeInTheDocument();
  });

  it('stops loading on a role page of an unknown company', async () => {
    companyMocks.community.getPublicCompanyProfile.mockRejectedValue({
      response: { status: 400, data: { status: 'ERROR', errorCode: 'NOT_FOUND' } },
    });
    renderAt('/interview-questions/no-such-company/software-engineer');
    await waitFor(() =>
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow'),
    );
    expect(screen.queryByLabelText('Loading stats')).toBeNull();
    expect(companyMocks.community.getPublicPosts).not.toHaveBeenCalled();
  });

  it('keeps the Role filter on the personal-centre page', async () => {
    setSignedIn(true);
    setPlan('Advanced');
    renderAt('/interview-insights/meta');
    expect(await screen.findByRole('button', { name: 'apply role' })).toBeInTheDocument();
    expect(roleLinksMock).not.toHaveBeenCalled();
  });
});

describe('More roles fold', () => {
  const LINKS = [
    { slug: 'software-engineer', label: 'Software Engineer', count: 1194 },
    { slug: 'data-scientist', label: 'Data Scientist', count: 489 },
  ];
  const STATS = [
    { company: 'Meta', role: 'Software Engineer', postCount: 1194 },
    { company: 'Meta', role: 'Data Scientist', postCount: 489 },
    { company: 'Meta', role: 'Product Designer', postCount: 5 },
    { company: 'Meta', role: 'Backend Engineer', postCount: 4 },
    { company: 'Meta', role: 'Data Analyst', postCount: 4 },
    { company: 'Meta', role: 'Performance Engineer', postCount: 2 },
    { company: 'Google', role: 'Business Analyst', postCount: 9 },
  ];
  const bar = () => screen.findByRole('navigation', { name: 'Interview questions by role' });

  it('lists the other roles, most notes first, as nofollow links behind a closed fold', async () => {
    roleLinksMock.mockResolvedValue(LINKS);
    roleStatsMock.mockResolvedValue(STATS);
    renderAt('/interview-questions/meta');
    const nav = await bar();
    const toggle = await screen.findByRole('button', { name: 'More roles' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(nav.querySelector('a[href="/interview-questions/meta/product-designer"]')).toBeNull();
    fireEvent.click(toggle);
    const fold = [...nav.querySelectorAll('#more-roles a')];
    expect(fold.map((a) => a.textContent)).toEqual(['Product Designer5', 'Backend Engineer4', 'Data Analyst4']);
    expect(fold.every((a) => a.getAttribute('rel') === 'nofollow')).toBe(true);
    // The indexed links stay followed and out of the fold.
    const followed = nav.querySelector('a[href="/interview-questions/meta/software-engineer"]')!;
    expect(followed.getAttribute('rel')).toBeNull();
    expect(nav.querySelector('#more-roles a[href$="/software-engineer"]')).toBeNull();
    expect(nav.querySelector('a[href*="performance"]')).toBeNull();
  });

  it('shows All + More roles for a company with no indexed role', async () => {
    roleStatsMock.mockResolvedValue(STATS.filter((r) => !LINKS.some((l) => l.label === r.role)));
    renderAt('/interview-questions/meta');
    const nav = await bar();
    expect([...nav.querySelectorAll(':scope > ul a')].map((a) => a.textContent)).toEqual(['All']);
    expect(await screen.findByRole('button', { name: 'More roles' })).toBeInTheDocument();
  });

  it('shows no bar when the company has a single role', async () => {
    roleStatsMock.mockResolvedValue([{ company: 'Meta', role: 'Product Designer', postCount: 5 }]);
    renderAt('/interview-questions/meta');
    await waitFor(() => expect(roleStatsMock).toHaveBeenCalled());
    await waitFor(() => expect(roleLinksMock).toHaveBeenCalled());
    expect(screen.queryByRole('navigation', { name: 'Interview questions by role' })).toBeNull();
  });

  it('opens the fold on a fold role page, with that role current', async () => {
    roleLinksMock.mockResolvedValue(LINKS);
    roleStatsMock.mockResolvedValue(STATS);
    companyMocks.community.getPublicPosts.mockResolvedValue({
      data: { data: { posts: [feedPost('pd-0')], total: 5, size: 10, page: 0 } },
    });
    renderAt('/interview-questions/meta/product-designer');
    expect(await screen.findByRole('button', { name: 'More roles' })).toHaveAttribute('aria-expanded', 'true');
    const nav = await bar();
    expect(nav.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe(
      '/interview-questions/meta/product-designer',
    );
    expect(companyMocks.community.getPublicPosts).toHaveBeenCalledWith(
      expect.objectContaining({ company: 'Meta', role: 'Product Designer' }),
    );
  });

  it('is the same for an Advanced reader on the public page (no Role dropdown)', async () => {
    setSignedIn(true);
    setPlan('Advanced');
    roleLinksMock.mockResolvedValue(LINKS);
    roleStatsMock.mockResolvedValue(STATS);
    renderAt('/interview-questions/meta');
    expect(await screen.findByRole('button', { name: 'More roles' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'apply role' })).toBeNull();
  });
});

describe('personal centre Role filter', () => {
  it('is an unlocked filter for Free readers; Round stays locked', async () => {
    setSignedIn(true);
    setPlan('Free');
    companyMocks.community.getPosts.mockResolvedValue({ data: { data: [feedPost('p-0')] } });
    renderAt('/interview-insights/meta');
    fireEvent.click(await screen.findByRole('button', { name: 'apply role' }));
    await waitFor(() =>
      expect(companyMocks.community.getPosts).toHaveBeenLastCalledWith(
        expect.objectContaining({ company: 'Meta', role: 'Software Engineer' }),
      ),
    );
    expect(screen.queryByRole('button', { name: 'Role' })).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Interview questions by role' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Round' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent(/Unlock all/);
    expect(roleLabelsMock).toHaveBeenCalledWith('Meta');
  });
});
