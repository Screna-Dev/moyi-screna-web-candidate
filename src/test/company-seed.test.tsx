/**
 * Company page (/interview-questions/meta) booted from the server-embedded copy.
 *
 * F2: the embedded first page is the UNFILTERED newest ten, so it may stand in
 * for the feed only on a first open with no filter, sort or search — including
 * none restored from sessionStorage. Any later change fetches, and clearing the
 * filters again fetches rather than falling back to the embedded ten.
 *
 * Also: the embedded copy is the public payload (`user: null` on every card),
 * so its cards must never be shown as Free/Basic previews.
 *
 * The page reads the embedded tag once, at import, so it is planted in
 * vi.hoisted — before the page module loads.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import {
  companyMocks,
  defaultAnswers,
  filterPopoversMock,
  saveFilters,
  setPlan,
  setSignedIn,
  stablePosthog,
  INTRO,
  FAQ_Q1,
  passesMock,
} from './company-page-mocks';

vi.hoisted(() => {
  const card = (i: number) => ({
    id: `seed-${i}`,
    company: 'Meta',
    role: 'Software Engineer',
    round: 'Technical Phone Screen',
    date: '2026-09-01T00:00:00Z',
    summary: `Seeded summary ${i}.`,
    status: 'PUBLISHED',
    user: null,
    isAnonymous: false,
    questions: [{ id: `sq-${i}`, title: 'Design a rate limiter', categories: [], notes: `Seeded sentence ${i}.` }],
  });
  const seed = {
    profile: { displayName: 'Meta', category: 'FAANG / Big Tech', postCount: 40 },
    breakdown: {
      company: 'Meta',
      totalPosts: 40,
      topRoles: [{ name: 'Software Engineer', posts: 30 }],
      topRounds: [{ name: 'Technical Phone Screen', posts: 25 }],
      roundTopics: { 'Technical Phone Screen': [{ name: 'System Design', questions: 12 }] },
    },
    posts: Array.from({ length: 10 }, (_, i) => card(i + 1)),
    total: 40,
    page: null,
    // The server's call (here: a body under the word floor). 40 notes clears
    // MIN_POSTS_FOR_PAGE, so only the seed can make this page noindex.
    noindex: true,
  };
  const tag = document.createElement('script');
  tag.type = 'application/json';
  tag.id = '__prerender_company__';
  tag.textContent = JSON.stringify(seed);
  document.body.appendChild(tag);
});

vi.mock('posthog-js/react', () => ({ usePostHog: () => stablePosthog }));
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

const renderCompany = () =>
  render(
    <MemoryRouter initialEntries={['/interview-questions/meta']}>
      <Routes>
        <Route path="/interview-questions/:companyId" element={<CompanyDetailPage isPublic />} />
      </Routes>
    </MemoryRouter>,
  );

/** Let effects and any (unwanted) fetch settle. */
const settle = () => new Promise((r) => setTimeout(r, 200));

const feedCalls = () => [
  ...companyMocks.community.getPosts.mock.calls,
  ...companyMocks.community.getPublicPosts.mock.calls,
].map((c) => c[0]);

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  setSignedIn(false);
  setPlan('Free');
  defaultAnswers();
});

describe('F2 — embedded first page and filters', () => {
  it.each([
    ['a guest', false, 'Free'],
    ['an Advanced reader', true, 'Advanced'],
  ] as const)('shows the embedded ten to %s with no list request', async (_who, signedIn, plan) => {
    setSignedIn(signedIn);
    setPlan(plan);
    renderCompany();
    expect(await screen.findByText('Seeded summary 1.')).toBeInTheDocument();
    expect(screen.getByText('Seeded summary 10.')).toBeInTheDocument();
    await settle();
    expect(feedCalls()).toEqual([]);
  });

  it('fetches with the role when one is applied, and again without it when cleared', async () => {
    setSignedIn(true);
    setPlan('Advanced');
    companyMocks.community.getPosts.mockResolvedValue({ data: { data: [] } });
    renderCompany();
    await screen.findByText('Seeded summary 1.');

    fireEvent.click(screen.getByRole('button', { name: 'apply role' }));
    await waitFor(() =>
      expect(companyMocks.community.getPosts).toHaveBeenLastCalledWith(
        expect.objectContaining({ company: 'Meta', role: 'Software Engineer', page: 0 }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'clear role' }));
    await waitFor(() => expect(companyMocks.community.getPosts).toHaveBeenCalledTimes(2));
    expect(companyMocks.community.getPosts.mock.calls[1][0]).not.toHaveProperty('role');
    // Cleared, but not back to the embedded ten: the feed answered empty.
    await waitFor(() => expect(screen.queryByText('Seeded summary 1.')).toBeNull());
  });

  it('fetches with filters restored from the session on a refresh', async () => {
    setSignedIn(true);
    setPlan('Advanced');
    saveFilters('meta', { role: 'Software Engineer' });
    renderCompany();
    await waitFor(() =>
      expect(companyMocks.community.getPosts).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'Software Engineer', page: 0 }),
      ),
    );
    await settle();
    expect(screen.queryByText('Seeded summary 1.')).toBeNull();
  });

  it('fetches with a restored sort', async () => {
    setSignedIn(true);
    setPlan('Advanced');
    saveFilters('meta', { sort: 'Hot' });
    renderCompany();
    await waitFor(() =>
      expect(companyMocks.community.getPosts).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'HOT' })),
    );
  });
});

describe('embedded copy — indexing', () => {
  it("keeps the server's noindex and writes no JSON-LD", async () => {
    renderCompany();
    await screen.findByText('Seeded summary 1.');
    await waitFor(() => expect(document.documentElement.getAttribute('data-seo-ready')).toBe('1'));
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow');
    expect(document.head.querySelector('script[data-seo]')).toBeNull();
  });
});

describe('embedded copy — intro, FAQ and Free/Basic cards', () => {
  it('builds the intro and FAQ from the embedded breakdown, without asking for it', async () => {
    renderCompany();
    expect(await screen.findByText(INTRO)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: FAQ_Q1 })).toBeInTheDocument();
    await settle();
    expect(companyMocks.community.getPublicCompanyBreakdown).not.toHaveBeenCalled();
  });

  it('does not show embedded cards to a Free reader as previews', async () => {
    setSignedIn(true);
    setPlan('Free');
    renderCompany();
    await screen.findByText('Seeded summary 1.');
    expect(screen.queryByRole('button', { name: /Upgrade to Advanced to read the full write-up/ })).toBeNull();
  });
});
