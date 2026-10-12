/**
 * Company archive page (/interview-questions/meta/page/2) booted from its
 * server-embedded window.
 *
 * The archive view has no toolbar and ignores filters, so filters saved in the
 * session (from the company page) must not make it throw away the window the
 * server rendered and refetch.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import {
  companyMocks,
  defaultAnswers,
  filterPopoversMock,
  saveFilters,
  setSignedIn,
  setPlan,
  stablePosthog,
  passesMock,
} from './company-page-mocks';

vi.hoisted(() => {
  const seed = {
    profile: { displayName: 'Meta', postCount: 25 },
    breakdown: null,
    posts: Array.from({ length: 10 }, (_, i) => ({
      id: `arch-${i + 11}`,
      company: 'Meta',
      role: 'Software Engineer',
      round: 'Technical Phone Screen',
      date: '2026-09-01T00:00:00Z',
      summary: `Archive summary ${i + 11}.`,
      status: 'PUBLISHED',
      user: null,
      questions: [],
    })),
    total: 25,
    page: 2,
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

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  setSignedIn(true);
  setPlan('Advanced');
  defaultAnswers();
});

describe('archive page — embedded window', () => {
  it('keeps the embedded window when filters were saved in the session', async () => {
    saveFilters('meta', { role: 'Software Engineer', sort: 'Hot' });
    render(
      <MemoryRouter initialEntries={['/interview-questions/meta/page/2']}>
        <Routes>
          <Route path="/interview-questions/:companyId/page/:n" element={<CompanyDetailPage isPublic />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Archive summary 11.')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 200));
    expect(companyMocks.community.getPosts).not.toHaveBeenCalled();
    expect(companyMocks.community.getPublicPosts).not.toHaveBeenCalled();
    expect(screen.getByText('Archive summary 20.')).toBeInTheDocument();
  });
});
