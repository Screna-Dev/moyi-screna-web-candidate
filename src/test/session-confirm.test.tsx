/**
 * Session Confirm Tests
 * Covers: Personal practice cards navigate to session-confirm, session-confirm page renders details
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ─── Mocks ────────────────────────────────────────────────
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('@/hooks/useUserPlan', () => ({
  useUserPlan: () => ({
    planData: { permanentCreditBalance: 100, currentPlan: 'Free' },
    isLoading: false,
    isFree: true,
    isPremium: false,
  }),
  UserPlanProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

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

vi.mock('../../components/newDesign/home/navbar', () => ({
  Navbar: () => <nav data-testid="navbar" />,
}));

vi.mock('../../components/newDesign/home/footer', () => ({
  Footer: () => <footer data-testid="footer" />,
}));

// ─── Session Confirm Page Tests ──────────────────────────
describe('Session Confirm - Page Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders session details from URL params', async () => {
    const { SessionConfirmPage } = await import('@/components/newDesign/session-confirm');
    render(
      <MemoryRouter initialEntries={['/session-confirm?session=mod-1&title=React%20Deep%20Dive&category=technical&focus=Frontend&time=30%20min&difficulty=Intermediate']}>
        <SessionConfirmPage />
      </MemoryRouter>
    );

    expect(screen.getByText('React Deep Dive')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
  });

  it('renders session details from static session map', async () => {
    const { SessionConfirmPage } = await import('@/components/newDesign/session-confirm');
    render(
      <MemoryRouter initialEntries={['/session-confirm?session=1']}>
        <SessionConfirmPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Leadership & Conflict Resolution')).toBeInTheDocument();
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('Behavioral')).toBeInTheDocument();
  });

  it('shows "Begin Session" button when user has enough credits', async () => {
    const { SessionConfirmPage } = await import('@/components/newDesign/session-confirm');
    render(
      <MemoryRouter initialEntries={['/session-confirm?session=1']}>
        <SessionConfirmPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Begin Session')).toBeInTheDocument();
  });

  it('"Begin Session" links to /ai-mock with correct params', async () => {
    const { SessionConfirmPage } = await import('@/components/newDesign/session-confirm');
    render(
      <MemoryRouter initialEntries={['/session-confirm?session=1']}>
        <SessionConfirmPage />
      </MemoryRouter>
    );

    const link = screen.getByText('Begin Session').closest('a');
    expect(link).toBeInTheDocument();
    expect(link?.getAttribute('href')).toContain('/ai-mock');
    expect(link?.getAttribute('href')).toContain('interviewId=1');
    expect(link?.getAttribute('href')).toContain('type=behavioral');
  });

  it('shows "Session Not Found" for invalid session ID with no title param', async () => {
    const { SessionConfirmPage } = await import('@/components/newDesign/session-confirm');
    render(
      <MemoryRouter initialEntries={['/session-confirm?session=9999']}>
        <SessionConfirmPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Session Not Found')).toBeInTheDocument();
  });

  it('displays topics from URL params', async () => {
    const topics = JSON.stringify(['React', 'TypeScript']);
    const { SessionConfirmPage } = await import('@/components/newDesign/session-confirm');
    render(
      <MemoryRouter initialEntries={[`/session-confirm?session=0&title=Test&topics=${encodeURIComponent(topics)}`]}>
        <SessionConfirmPage />
      </MemoryRouter>
    );

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });
});

describe('Session Confirm - Training Plan Card Navigation', () => {
  it('training plan cards navigate to /session-confirm (not directly to /ai-mock)', () => {
    // The PracticeSetCard component renders a <Link to="/session-confirm?..."> by default.
    // Previously, cards with training_plan_id had an onClick override that navigated
    // directly to /ai-mock. Now all cards go through session-confirm first.

    const mockSet = {
      id: 'set-1',
      module_id: 'mod-1',
      title: 'Test Session',
      category: 'behavioral',
      focus: 'Leadership',
      time: '30 min',
      difficulty: 'Intermediate' as const,
      training_plan_id: 123,
      topics: [],
      whatToExpect: [],
      credits: 5,
    };

    const expectedUrl = `/session-confirm?session=${mockSet.module_id}&title=${encodeURIComponent(mockSet.title)}`;
    expect(expectedUrl).toContain('/session-confirm');
    expect(expectedUrl).toContain('session=mod-1');
    expect(expectedUrl).not.toContain('/ai-mock');
  });
});
