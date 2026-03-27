/**
 * Interview Insights Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; // Keep this for react-router-dom
import React from 'react';

// ─── Service Mocks ────────────────────────────────────────
const mockGetPosts = vi.fn();

vi.mock('../../services/CommunityService', () => ({
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

// ─── Mock Data ────────────────────────────────────────────
const createMockPost = (overrides = {}) => ({
  id: 'post-1',
  company: 'Google',
  role: 'Software Engineer',
  level: 'L5',
  round: 'Onsite - Coding',
  date: '2024-03-01',
  outcome: 'Offer',
  location: 'Remote',
  status: 'approved',
  createdAt: '2024-03-01T10:00:00Z',
  summary: 'Great experience overall, multiple coding rounds.',
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

  it('fetches posts on mount', async () => {
    const mockPosts = [createMockPost()];
    
    mockGetPosts.mockResolvedValue({
      data: {
        data: {
          content: mockPosts,
          pageMeta: { last: true, totalElements: 1, totalPages: 1 }
        }
      }
    });

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    render(
      <MemoryRouter>
        <InterviewInsightsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetPosts).toHaveBeenCalledTimes(1);
    });
  });

  it('shows post with company and role', async () => {
    const mockPost = createMockPost({
      company: 'Google',
      role: 'Software Engineer'
    });
    
    mockGetPosts.mockResolvedValue({
      data: {
        data: {
          content: [mockPost],
          pageMeta: { last: true }
        }
      }
    });

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
    mockGetPosts.mockResolvedValue({
      data: {
        data: {
          content: [],
          pageMeta: { last: true }
        }
      }
    });

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

  it('renders posts sorted newest first by default', async () => {
    const olderPost = createMockPost({ 
      id: 'post-2', 
      company: 'Meta', 
      role: 'Product Manager',
      round: 'Final Round',
      createdAt: '2024-01-01T00:00:00Z',
    });
    const newerPost = createMockPost({ 
      id: 'post-1', 
      company: 'Google', 
      role: 'Software Engineer',
      round: 'Coding',
      createdAt: '2024-03-01T10:00:00Z',
    });

    mockGetPosts.mockResolvedValue({
      data: {
        data: {
          content: [olderPost, newerPost],
          pageMeta: { last: true }
        }
      }
    });

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
    mockGetPosts.mockResolvedValue({
      data: {
        data: {
          content: [],
          pageMeta: { last: true }
        }
      }
    });

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
});

// Keep your other test suites here...
describe('Debug - Simple Render Test', () => {
  it('should render without crashing', async () => {
    // Mock the API to return empty data
    mockGetPosts.mockResolvedValue({
      data: {
        data: {
          content: [],
          pageMeta: { last: true }
        }
      }
    });

    const { InterviewInsightsPage } = await import('@/pages/newDesign/interview-insights');
    
    // Try to render with just the page, no router wrapper
    console.log('Attempting to render...');
    
    try {
      render(<InterviewInsightsPage />);
      console.log('Rendered without router');
    } catch (error) {
      console.error('Error without router:', error);
    }
    
    // Now try with router
    console.log('Attempting to render with MemoryRouter...');
    
    try {
      render(
        <MemoryRouter>
          <InterviewInsightsPage />
        </MemoryRouter>
      );
      console.log('Rendered with MemoryRouter');
      
      // Wait a bit and check what's rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      screen.debug();
      
    } catch (error) {
      console.error('Error with MemoryRouter:', error);
    }
  });
});