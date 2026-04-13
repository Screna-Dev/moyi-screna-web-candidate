/**
 * Interview Insights Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ─── Service Mocks ────────────────────────────────────────
const mockGetPosts = vi.fn();

vi.mock('@/services/CommunityService', () => ({
  getPosts: mockGetPosts,
  getPost: vi.fn(),
  createPost: vi.fn(),
  getComments: vi.fn(),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  getReplies: vi.fn(),
  createReply: vi.fn(),
  deleteReply: vi.fn(),
}));

// ─── AuthContext Mock ─────────────────────────────────────
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@screna.ai', name: 'Test User', role: 'CANDIDATE' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    signup: vi.fn(),
    loginWithGoogle: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerificationCode: vi.fn(),
    setUserFromToken: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── UserPlanProvider Mock ────────────────────────────────
vi.mock('@/hooks/useUserPlan', () => ({
  useUserPlan: () => ({
    planData: {
      currentPlan: 'Free',
      subscriptionCancelPending: false,
      planDowngradePending: false,
      creditBalance: 100,
      nextBillingDate: null,
      updatedAt: null,
      trialExpiresAt: null,
      isTrialActive: false,
      effectivePlan: 'Free',
      trialDaysRemaining: 0,
      recurringCreditBalance: 0,
      permanentCreditBalance: 100,
    },
    isLoading: false,
    error: null,
    isPremium: false,
    isElite: false,
    isFree: true,
    isPro: false,
    canAccessJobs: false,
    canAccessPremiumReport: false,
    canPushProfile: false,
    canAccessMentorship: false,
    refreshPlan: vi.fn(),
    changePlan: vi.fn(),
    buyCredits: vi.fn(),
    isChangingPlan: false,
    isBuyingCredits: false,
  }),
  UserPlanProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Component Mocks ──────────────────────────────────────
vi.mock('../../components/newDesign/home/navbar', () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock('../../components/newDesign/home/footer', () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock('../../components/newDesign/share-experience-modal', () => ({
  ShareExperienceModal: () => null,
}));

vi.mock('@/components/newDesign/share-popover', () => ({
  SharePopover: () => null,
}));

// ─── Helper: build mock API response (new format: data is an array, no pageMeta) ──
const mockApiResponse = (posts: any[]) => ({
  data: { data: posts },
});

// ─── Mock Data ────────────────────────────────────────────
const createMockPost = (overrides = {}) => ({
  id: 'post-1',
  user: { id: 'user-1', name: 'Test User' },
  company: 'Google',
  role: 'Software Engineer',
  level: 'L5',
  round: 'Onsite - Coding',
  date: '2024-03-01',
  outcome: 'Offer',
  location: 'Remote',
  status: 'PENDING',
  isAnonymous: false,
  createdAt: '2024-03-01T10:00:00Z',
  summary: 'Great experience overall, multiple coding rounds.',
  commentCount: 0,
  questions: [
    {
      id: 'q1',
      seq: 1,
      label: 'Q1',
      title: 'Merge two sorted arrays',
      categories: ['Coding'],
      notes: ''
    },
    {
      id: 'q2',
      seq: 2,
      label: 'Q2',
      title: 'Design a rate limiter',
      categories: ['System Design'],
      notes: ''
    },
  ],
  ...overrides,
});

describe('Interview Insights - View Posts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches posts on mount with default sortBy=NEWEST', async () => {
    mockGetPosts.mockResolvedValue(mockApiResponse([createMockPost()]));

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalledTimes(1);
      expect(mockGetPosts).toHaveBeenCalledWith(
        expect.objectContaining({ page: 0, sortBy: 'NEWEST' })
      );
    });
  });

  it('shows post with company and role', async () => {
    const mockPost = createMockPost({ company: 'Google', role: 'Software Engineer' });
    mockGetPosts.mockResolvedValue(mockApiResponse([mockPost]));

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
    });
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
  });

  it('shows "Share Your Experience" button that links to /add-experience', async () => {
    mockGetPosts.mockResolvedValue(mockApiResponse([]));

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalled();
    });
    const link = screen.getByRole('link', { name: /share your experience/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/add-experience');
  });

  it('renders posts from API in order (API returns sorted)', async () => {
    const post1 = createMockPost({ id: 'post-1', company: 'Google', createdAt: '2024-03-01T10:00:00Z' });
    const post2 = createMockPost({ id: 'post-2', company: 'Meta', createdAt: '2024-01-01T00:00:00Z' });
    // API returns them already sorted newest-first
    mockGetPosts.mockResolvedValue(mockApiResponse([post1, post2]));

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('Meta')).toBeInTheDocument();
    });

    const companies = screen.getAllByText(/Google|Meta/);
    expect(companies[0]).toHaveTextContent('Google');
    expect(companies[1]).toHaveTextContent('Meta');
  });

  it('handles empty post list gracefully', async () => {
    mockGetPosts.mockResolvedValue(mockApiResponse([]));

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no experiences match your filters/i)).toBeInTheDocument();
    });
  });

  it('determines hasMore=false when API returns fewer than 10 results', async () => {
    // 5 posts < 10 → last page, no "Load More" button
    const posts = Array.from({ length: 5 }, (_, i) =>
      createMockPost({ id: `post-${i}`, company: `Company${i}` })
    );
    mockGetPosts.mockResolvedValue(mockApiResponse(posts));

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Company0')).toBeInTheDocument();
    });
    expect(screen.queryByText(/load more/i)).not.toBeInTheDocument();
  });

  it('shows Load More when API returns 10 results (possibly more pages)', async () => {
    const posts = Array.from({ length: 10 }, (_, i) =>
      createMockPost({ id: `post-${i}`, company: `Company${i}` })
    );
    mockGetPosts.mockResolvedValue(mockApiResponse(posts));

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Company0')).toBeInTheDocument();
    });
    expect(screen.getByText(/load more/i)).toBeInTheDocument();
  });
});

describe('Interview Insights - Search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends search param to API after debounce', async () => {
    mockGetPosts.mockResolvedValue(mockApiResponse([]));

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalledTimes(1);
    });
    mockGetPosts.mockClear();

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'Google');

    // After debounce, API should be called with search param
    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Google', page: 0 })
      );
    }, { timeout: 2000 });
  });
});

describe('Interview Insights - Filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends role filter param to API', async () => {
    mockGetPosts.mockResolvedValue(mockApiResponse([
      createMockPost({ role: 'Data Scientist' }),
    ]));

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalledTimes(1);
    });
    mockGetPosts.mockClear();

    // Open Role filter dropdown
    const roleFilterBtn = screen.getByText('Role');
    fireEvent.click(roleFilterBtn);

    // Select "Frontend Engineer" from the filter dropdown (checkbox label)
    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox', { name: /Frontend Engineer/i });
      fireEvent.click(checkbox);
    });

    // Apply filter
    const applyBtn = screen.getByText(/apply/i);
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'Frontend Engineer', page: 0 })
      );
    });
  });

  it('sends company filter param to API', async () => {
    mockGetPosts.mockResolvedValue(mockApiResponse([]));

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalledTimes(1);
    });
    mockGetPosts.mockClear();

    // Open Company filter dropdown
    const companyFilterBtn = screen.getByText('Company');
    fireEvent.click(companyFilterBtn);

    // Select "Adobe" from the filter dropdown (checkbox label)
    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox', { name: /Adobe/i });
      fireEvent.click(checkbox);
    });

    // Apply filter
    const applyBtn = screen.getByText(/apply/i);
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalledWith(
        expect.objectContaining({ company: 'Adobe', page: 0 })
      );
    });
  });

  it('sends level filter param to API', async () => {
    mockGetPosts.mockResolvedValue(mockApiResponse([]));

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalledTimes(1);
    });
    mockGetPosts.mockClear();

    // Open Level filter dropdown
    const levelFilterBtn = screen.getByText('Level');
    fireEvent.click(levelFilterBtn);

    // Select "Senior" from the filter dropdown (checkbox label)
    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox', { name: /Senior/i });
      fireEvent.click(checkbox);
    });

    // Apply filter
    const applyBtn = screen.getByText(/apply/i);
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalledWith(
        expect.objectContaining({ Level: 'Senior', page: 0 })
      );
    });
  });
});

describe('Interview Insights - Sort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends sortBy=RELEVANCE when Relevance sort is selected', async () => {
    mockGetPosts.mockResolvedValue(mockApiResponse([createMockPost()]));

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    // Wait for initial fetch (default is Newest)
    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'NEWEST' })
      );
    });
    mockGetPosts.mockClear();

    // Open sort dropdown and select Relevance
    const sortBtn = screen.getByText(/sort: newest/i);
    fireEvent.click(sortBtn);

    const relevanceOption = screen.getByText('Relevance');
    fireEvent.click(relevanceOption);

    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'RELEVANCE', page: 0 })
      );
    });
  });

  it('defaults to sortBy=NEWEST on mount', async () => {
    mockGetPosts.mockResolvedValue(mockApiResponse([]));

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'NEWEST', page: 0 })
      );
    });
  });
});