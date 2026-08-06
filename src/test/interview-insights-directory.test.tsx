/**
 * Interview Insights directory (interview-insights-design.tsx)
 * Regression: a company returned under more than one category group must render
 * exactly once, and must not accumulate ghost cards when toggling category tiles.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

const mockGetCompaniesStats = vi.fn();

vi.mock('@/services/CommunityService', () => ({
  getPosts: vi.fn(() => Promise.resolve({ data: { data: [] } })),
  getPublicPosts: vi.fn(() => Promise.resolve({ data: { data: [] } })),
  getCompaniesStats: (...args: any[]) => mockGetCompaniesStats(...args),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'CANDIDATE' }, isAuthenticated: true, isLoading: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/newDesign/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/newDesign/dashboard-page', () => ({
  WidePageContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/newDesign/interview/share-experience-button', () => ({
  default: () => <button>Share Your Experience</button>,
}));

// "Scale.ai" is returned by the stats API under two different category groups.
const statsResponse = {
  data: {
    data: {
      totalCompanyCount: 3,
      totalPostCount: 30,
      totalRecentPostCount: 5,
      categories: [
        {
          category: 'Mid-sized',
          postCount: 12,
          companies: [{ company: 'Scale.ai', postCount: 12, recentPostCount: 3, latestUpdatedAt: '2026-08-01T00:00:00Z' }],
        },
        {
          category: 'FAANG / Big Tech',
          postCount: 18,
          companies: [
            { company: 'Google', postCount: 10, recentPostCount: 1, latestUpdatedAt: '2026-08-02T00:00:00Z' },
            { company: 'Scale.ai', postCount: 8, recentPostCount: 1, latestUpdatedAt: '2026-08-03T00:00:00Z' },
          ],
        },
      ],
    },
  },
};

const countCards = (name: string) =>
  screen.queryAllByRole('heading', { name, level: 3 }).length;

describe('Interview Insights directory - duplicate companies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCompaniesStats.mockResolvedValue(statsResponse);
    // jsdom does not implement scrollIntoView (used by the category auto-scroll).
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders a company appearing in multiple category groups only once', async () => {
    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights-design');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(countCards('Google')).toBe(1));
    expect(countCards('Scale.ai')).toBe(1);
  });

  it('does not accumulate duplicate cards when toggling category tiles', async () => {
    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights-design');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(countCards('Google')).toBe(1));

    // Scale.ai merges into "Mid-sized" (12 posts there vs 8 under FAANG), so it
    // shows in that filter only — and never more than once, however many times
    // the tiles are toggled.
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('heading', { name: 'Mid-sized', level: 3 }));
      await waitFor(() => expect(countCards('Scale.ai')).toBe(1));
      expect(countCards('Google')).toBe(0);

      fireEvent.click(screen.getByRole('heading', { name: 'FAANG / Big Tech', level: 3 }));
      await waitFor(() => expect(countCards('Google')).toBe(1));
      expect(countCards('Scale.ai')).toBe(0);
    }
  });
});
