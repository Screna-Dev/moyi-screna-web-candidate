import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as employerApi from '@/pages/employer/employerApi';
import type { EmployerPlan } from '@/pages/employer/employerApi';
import { EmployerApp } from '@/pages/employer/EmployerApp';

// Sidebar "Current Plan" card and top-bar badges: what the employer can still
// spend = credits + (Business) what's left of this month's allowance. Upgrading
// grants allowance, not credits, so without it the numbers didn't move.

vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/pages/employer/employerApi', async (orig) => ({
  ...(await orig<object>()),
  getOrganization: vi.fn(),
  getCredits: vi.fn(),
  getEmployerPlan: vi.fn(),
  getNewApplicationsCount: vi.fn(),
  listApplicationsJobs: vi.fn(),
}));
const api = vi.mocked(employerApi);

const BUSINESS: EmployerPlan = {
  plan: 'BUSINESS',
  billingCycle: 'MONTHLY',
  status: 'active',
  currentPeriodEnd: '2026-12-01T00:00:00Z',
  cancelAtPeriodEnd: false,
  allowance: {
    periodStart: '2026-11-01T00:00:00Z',
    periodEnd: '2026-12-01T00:00:00Z',
    reports: { included: 100, used: 7 },
    interviews: { included: 50, used: 3, held: 2 },
  },
  overage: null,
};

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/employer/applications']}>
      <Routes>
        <Route path="/employer/*" element={<EmployerApp />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollTo = vi.fn() as unknown as Element['scrollTo'];
  localStorage.setItem(
    'screna_employer_session',
    JSON.stringify({ email: 'alex@lumen.io', domain: 'lumen.io', name: 'Alex Jordan', title: 'Recruiter', companyName: 'Lumen Metrics', signedInAt: '', accessToken: 'a.b.c', refreshToken: 'r' }),
  );
  api.getOrganization.mockRejectedValue(new Error('offline'));
  api.getCredits.mockResolvedValue({ interview: 10, report: 14 });
  api.getNewApplicationsCount.mockResolvedValue(0);
  api.listApplicationsJobs.mockResolvedValue({ counts: { active: 0, closed: 0, total: 0 }, items: [], pageMeta: { pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0, first: true, last: true } });
});

describe('shell balances', () => {
  it('Free: credits only', async () => {
    api.getEmployerPlan.mockResolvedValue({ plan: 'FREE', billingCycle: null, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: null, allowance: null, overage: null });
    renderApp();
    expect(await screen.findByRole('button', { name: 'Sponsored 10 left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlocks 14 left' })).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('Business: adds the unused allowance (interviews in progress held) and shows the real tier', async () => {
    api.getEmployerPlan.mockResolvedValue(BUSINESS);
    renderApp();
    // 10 credits + (50 - 3 used - 2 held); 14 credits + (100 - 7).
    expect(await screen.findByRole('button', { name: 'Sponsored 55 left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlocks 107 left' })).toBeInTheDocument();
    expect(screen.getAllByText('55 left').length).toBeGreaterThan(0);
    expect(screen.getByText('Business')).toBeInTheDocument();
  });

  it('a used-up allowance never lowers the credit count', async () => {
    api.getEmployerPlan.mockResolvedValue({ ...BUSINESS, allowance: { ...BUSINESS.allowance!, interviews: { included: 50, used: 49, held: 3 } } });
    renderApp();
    expect(await screen.findByRole('button', { name: 'Sponsored 10 left' })).toBeInTheDocument();
  });
});
