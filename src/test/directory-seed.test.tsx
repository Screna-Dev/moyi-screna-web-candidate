/**
 * /interview-questions booted from the build-time snapshot
 * (__prerender_directory__).
 *
 * The snapshot paints the company grid and the Companies / Total Notes figures
 * instantly, but it is frozen at the last build: after the company cleanup the
 * live page kept showing 718 companies while the API said 638. The page now
 * always fetches the live stats and replaces the snapshot in place.
 *
 * The page reads the embedded tag once, at import, so each test plants it and
 * then imports a fresh copy of the page module.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const getPublicCompaniesStats = vi.fn();

vi.mock('@/services/CommunityService', () => ({
  getPublicCompaniesStats: (...a: unknown[]) => getPublicCompaniesStats(...a),
  getCompaniesStats: vi.fn(),
}));
vi.mock('@/services/api', () => ({ hasStoredSession: () => false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));
vi.mock('@/components/newDesign/dashboard-layout', () => ({ DashboardLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/newDesign/insights-layout', () => ({ InsightsLayout: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/newDesign/interview-insights/quick-mock', () => ({ QuickMockWidget: () => null }));
vi.mock('@/components/newDesign/interview/share-experience-button', () => ({ default: () => null }));

const stats = (companies: number, posts: number, names: string[]) => ({
  totalCompanyCount: companies,
  totalPostCount: posts,
  totalRecentPostCount: 0,
  categories: [
    {
      category: 'FAANG / Big Tech',
      postCount: posts,
      companies: names.map((company) => ({ company, postCount: 20, recentPostCount: 0 })),
    },
  ],
});

async function renderSeededDirectory() {
  const tag = document.createElement('script');
  tag.type = 'application/json';
  tag.id = '__prerender_directory__';
  tag.textContent = JSON.stringify({ stats: stats(718, 19042, ['Snapchat']) });
  document.body.appendChild(tag);
  vi.resetModules();
  const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights-design');
  return render(
    <MemoryRouter initialEntries={['/interview-questions']}>
      <InterviewInsightsPage isPublic />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getPublicCompaniesStats.mockReset();
});

describe('/interview-questions — snapshot revalidation', () => {
  it('shows the snapshot first, then the live stats', async () => {
    let resolve!: (v: unknown) => void;
    getPublicCompaniesStats.mockReturnValue(new Promise((r) => (resolve = r)));
    await renderSeededDirectory();
    // First paint: the snapshot, not a loading dash.
    expect(screen.getByText('718')).toBeInTheDocument();
    expect(screen.getByText('19,042')).toBeInTheDocument();
    expect(getPublicCompaniesStats).toHaveBeenCalledTimes(1);

    resolve({ data: { data: stats(638, 18890, ['Snap']) } });
    expect(await screen.findByText('638')).toBeInTheDocument();
    expect(screen.getByText('18,890')).toBeInTheDocument();
    expect(screen.queryByText('718')).toBeNull();
  });

  it('keeps the snapshot when the live fetch fails', async () => {
    getPublicCompaniesStats.mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await renderSeededDirectory();
    await waitFor(() => expect(getPublicCompaniesStats).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('718')).toBeInTheDocument();
  });

  it('keeps the snapshot when the response is not a stats payload', async () => {
    // The prerender browser has no API proxy and can get the HTML shell back.
    getPublicCompaniesStats.mockResolvedValue({ data: '<!doctype html><html></html>' });
    await renderSeededDirectory();
    await waitFor(() => expect(getPublicCompaniesStats).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByText('718')).toBeInTheDocument();
  });
});
