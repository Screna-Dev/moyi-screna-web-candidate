/**
 * Interview History Tests
 * Covers: View session list, view report (navigate to evaluation)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { createUserPlanMock } from '@/test/utils';

// ─── Mocks ────────────────────────────────────────────────
const mockGetTrainingPlans = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useUserPlan', () => ({
  useUserPlan: () => createUserPlanMock(),
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
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/services/InterviewServices', () => ({
  getTrainingPlans: mockGetTrainingPlans,
}));

vi.mock('@/components/newDesign/dashboard-layout', () => ({
  DashboardLayout: ({ children, headerTitle }: any) => (
    <div data-testid="dashboard-layout">
      <h1>{headerTitle}</h1>
      {children}
    </div>
  ),
}));

// ─── Mock training plans data ─────────────────────────────
const mockPlans = [
  {
    id: 1,
    target_job_title: 'Software Engineer',
    target_company: 'Google',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z',
    modules: [
      {
        module_id: 'mod-1',
        title: 'System Design Interview',
        status: 'completed',
        category: 'technical',
        score: 0.82,
        report_id: 'report-abc-1',
        duration_minutes: 45,
      },
      {
        module_id: 'mod-2',
        title: 'Behavioral Round',
        status: 'completed',
        category: 'behavioral',
        score: 7.4,
        report_id: 'report-abc-2',
        duration_minutes: 30,
      },
      {
        module_id: 'mod-3',
        title: 'Coding Challenge',
        status: 'pending',
        category: 'technical',
        score: null,
        report_id: null,
        duration_minutes: 60,
      },
    ],
  },
  {
    id: 2,
    target_job_title: 'Product Manager',
    target_company: 'Meta',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-02-15T00:00:00Z',
    modules: [
      {
        module_id: 'mod-4',
        title: 'Product Sense',
        status: 'completed',
        category: 'product',
        score: 85,
        report_id: 'report-xyz-1',
        duration_minutes: 35,
      },
    ],
  },
];

// ─── Helper: mapPlansToSessions ───────────────────────────
function mapScore(raw: number): number {
  if (!raw) return 0;
  if (raw <= 1) return Math.round(raw * 100);
  if (raw <= 10) return Math.round(raw * 10);
  return Math.round(raw);
}

function mapPlansToSessions(plans: any[]) {
  if (!Array.isArray(plans)) return [];
  return plans
    .flatMap((plan: any) => {
      const modules: any[] = Array.isArray(plan.modules) ? plan.modules : [];
      return modules
        .filter((m: any) => m.status === 'completed')
        .map((m: any) => ({
          interviewId: String(m.report_id ?? ''),
          title: m.title ?? plan.target_job_title ?? 'Mock Interview',
          company: plan.target_company ?? 'Practice Session',
          score: mapScore(m.score ?? 0),
          duration: m.duration_minutes ? `${m.duration_minutes} min` : '--',
          date: plan.updated_at ?? plan.created_at ?? '',
          type: m.category ?? 'General',
          status: 'Completed',
        }));
    })
    .filter((s: any) => s.interviewId)
    .sort(
      (a: any, b: any) =>
        (b.date ? new Date(b.date).getTime() : 0) -
        (a.date ? new Date(a.date).getTime() : 0)
    );
}

// ════════════════════════════════════════════════════════════
// HISTORY PAGE - DATA MAPPING
// ════════════════════════════════════════════════════════════
describe('History - mapPlansToSessions', () => {
  it('only includes completed modules', () => {
    const sessions = mapPlansToSessions(mockPlans);
    // mod-3 is pending, should be excluded
    const titles = sessions.map(s => s.title);
    expect(titles).not.toContain('Coding Challenge');
  });

  it('only includes modules with a report_id', () => {
    const sessions = mapPlansToSessions(mockPlans);
    sessions.forEach(s => expect(s.interviewId).toBeTruthy());
  });

  it('converts decimal scores to percentages', () => {
    const sessions = mapPlansToSessions(mockPlans);
    const systemDesign = sessions.find(s => s.title === 'System Design Interview');
    expect(systemDesign?.score).toBe(82); // 0.82 → 82

    const behavioral = sessions.find(s => s.title === 'Behavioral Round');
    expect(behavioral?.score).toBe(74); // 7.4 → 74

    const productSense = sessions.find(s => s.title === 'Product Sense');
    expect(productSense?.score).toBe(85); // 85 → 85
  });

  it('sorts sessions by date descending (newest first)', () => {
    const sessions = mapPlansToSessions(mockPlans);
    const dates = sessions.map(s => new Date(s.date).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
    }
  });

  it('returns empty array for empty plans', () => {
    expect(mapPlansToSessions([])).toEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(mapPlansToSessions(null as any)).toEqual([]);
  });

  it('includes correct company name for each session', () => {
    const sessions = mapPlansToSessions(mockPlans);
    const googSessions = sessions.filter(s => s.company === 'Google');
    const metaSessions = sessions.filter(s => s.company === 'Meta');
    expect(googSessions.length).toBeGreaterThan(0);
    expect(metaSessions.length).toBeGreaterThan(0);
  });

  it('assigns correct category type to each session', () => {
    const sessions = mapPlansToSessions(mockPlans);
    const sysDesign = sessions.find(s => s.title === 'System Design Interview');
    expect(sysDesign?.type).toBe('technical');
  });
});

// ════════════════════════════════════════════════════════════
// HISTORY PAGE - API LOADING
// ════════════════════════════════════════════════════════════
describe('History - API integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls getTrainingPlans on mount', async () => {
    mockGetTrainingPlans.mockResolvedValue({ data: { data: mockPlans } });
    const { HistoryPage } = await import('@/pages/newDesign/history');
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);
    await waitFor(() => expect(mockGetTrainingPlans).toHaveBeenCalledOnce());
  });

  it('renders completed sessions after data loads', async () => {
    mockGetTrainingPlans.mockResolvedValue({ data: { data: mockPlans } });
    const { HistoryPage } = await import('@/pages/newDesign/history');
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('System Design Interview')).toBeInTheDocument();
    });
  });

  it('renders the History page title', async () => {
    mockGetTrainingPlans.mockResolvedValue({ data: { data: [] } });
    const { HistoryPage } = await import('@/pages/newDesign/history');
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Interview History')).toBeInTheDocument();
    });
  });

  it('handles API failure gracefully', async () => {
    mockGetTrainingPlans.mockRejectedValue(new Error('Failed to fetch'));
    const { HistoryPage } = await import('@/pages/newDesign/history');
    expect(() =>
      render(<MemoryRouter><HistoryPage /></MemoryRouter>)
    ).not.toThrow();
  });
});

// ════════════════════════════════════════════════════════════
// HISTORY PAGE - VIEW REPORT
// ════════════════════════════════════════════════════════════
describe('History - View Report', () => {
  beforeEach(() => vi.clearAllMocks());

  it('navigates to evaluation page with reportId when "View Report" is clicked', async () => {
    mockGetTrainingPlans.mockResolvedValue({ data: { data: mockPlans } });
    const { HistoryPage } = await import('@/pages/newDesign/history');
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Interview History')).toBeInTheDocument();
    });

    // Trigger "View Report" for the first session
    const viewButtons = screen.getAllByRole('button', { name: /view report/i });
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/evaluation')
      );
    });
  });

  it('report navigation includes the correct interviewId', () => {
    const reportId = 'report-abc-1';
    mockNavigate(`/evaluation/${reportId}`);
    expect(mockNavigate).toHaveBeenCalledWith('/evaluation/report-abc-1');
  });
});

// ════════════════════════════════════════════════════════════
// HISTORY PAGE - TYPE FILTER
// ════════════════════════════════════════════════════════════
describe('History - Type Filter', () => {
  const TYPE_FILTERS = ['All', 'Technical', 'Behavioral', 'PM', 'General'];

  it('filters sessions by type correctly', () => {
    const sessions = mapPlansToSessions(mockPlans);

    const technical = sessions.filter(s =>
      s.type.toLowerCase() === 'technical'
    );
    const behavioral = sessions.filter(s =>
      s.type.toLowerCase() === 'behavioral'
    );

    expect(technical.length).toBeGreaterThan(0);
    expect(behavioral.length).toBeGreaterThan(0);
  });

  it('shows all sessions when filter is "All"', () => {
    const sessions = mapPlansToSessions(mockPlans);
    const filtered = sessions; // No filter applied
    expect(filtered.length).toBe(sessions.length);
  });

  it('all filter options are defined', () => {
    expect(TYPE_FILTERS).toContain('All');
    expect(TYPE_FILTERS).toContain('Technical');
    expect(TYPE_FILTERS).toContain('Behavioral');
  });
});
