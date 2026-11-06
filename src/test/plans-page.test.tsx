import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

// In-app Pricing (/plans, Figma "Candidate pricing"): the three plans, the
// add-on row, compare table and FAQ, with checkout wired per plan.

const svc = vi.hoisted(() => ({
  getInterviewQuota: vi.fn(),
  createSubscription: vi.fn(),
  createPro90DayCheckout: vi.fn(),
  createInterviewAddOnCheckout: vi.fn(),
}));
vi.mock('@/services', () => ({ PaymentService: svc }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Test User' }, isAuthenticated: true, isLoading: false }),
  isStaffRole: () => false,
}));
vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));
vi.mock('@/components/newDesign/dashboard-layout', () => ({
  DashboardLayout: ({ children, headerTitle }: { children: React.ReactNode; headerTitle: string }) => (
    <div>
      <p>{headerTitle}</p>
      {children}
    </div>
  ),
}));

import { PlansPage } from '@/pages/newDesign/plans-page';

const quota = (plan: string) => ({ data: { data: { plan, available: 1, grants: [] } } });
let href: string | null = null;

const renderPlans = () =>
  render(
    <MemoryRouter initialEntries={['/plans']}>
      <Routes>
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/settings" element={<p>Billing page</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  href = null;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, get href() { return 'http://localhost/plans'; }, set href(v: string) { href = v; } },
  });
  svc.getInterviewQuota.mockResolvedValue(quota('FREE'));
});

describe('Pricing page', () => {
  it('shows the design: plans, add-on, compare table, FAQ', async () => {
    renderPlans();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Getting seen is always free. Knowing where you stand is Pro.')).toBeInTheDocument();
    expect(screen.getByText('$29 / month')).toBeInTheDocument();
    expect(screen.getByText('$79 one time')).toBeInTheDocument();
    expect(screen.getByText('Compare plans')).toBeInTheDocument();
    expect(screen.getByText('Pro · $29/mo')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Current plan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Available with Pro' })).toBeDisabled();
  });

  it('FAQ answers open on click', async () => {
    const user = userEvent.setup();
    renderPlans();
    expect(screen.queryByText(/Starting and leaving early/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /What counts as an interview/ }));
    expect(screen.getByText(/Starting and leaving early/)).toBeInTheDocument();
  });

  it('Free → Get Pro starts the monthly Pro checkout', async () => {
    const user = userEvent.setup();
    svc.createSubscription.mockResolvedValue({ data: { data: { url: 'https://checkout.stripe.com/pro' } } });
    renderPlans();
    await screen.findByRole('button', { name: 'Current plan' });
    await user.click(screen.getByRole('button', { name: 'Get Pro' }));
    await waitFor(() => expect(href).toBe('https://checkout.stripe.com/pro'));
    expect(svc.createSubscription).toHaveBeenCalledWith('PRO', 'MONTHLY');
    expect(JSON.parse(sessionStorage.getItem('pendingCheckout')!)).toMatchObject({ kind: 'subscription' });
  });

  it('Get 90 days of Pro starts the one-time checkout', async () => {
    const user = userEvent.setup();
    svc.createPro90DayCheckout.mockResolvedValue({ data: { data: { url: 'https://checkout.stripe.com/p90' } } });
    renderPlans();
    await user.click(screen.getByRole('button', { name: 'Get 90 days of Pro' }));
    await waitFor(() => expect(href).toBe('https://checkout.stripe.com/p90'));
    expect(JSON.parse(sessionStorage.getItem('pendingCheckout')!)).toMatchObject({ kind: 'pro-90-day' });
  });

  it('a subscriber manages their plan in Billing, and can add interviews', async () => {
    const user = userEvent.setup();
    svc.getInterviewQuota.mockResolvedValue(quota('PRO'));
    renderPlans();
    expect(await screen.findByRole('button', { name: 'Add 5 interviews' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Manage plan' }));
    expect(await screen.findByText('Billing page')).toBeInTheDocument();
    expect(svc.createSubscription).not.toHaveBeenCalled();
  });
});
