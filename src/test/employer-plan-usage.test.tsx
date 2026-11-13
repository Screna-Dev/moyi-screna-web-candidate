import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as employerApi from '@/pages/employer/employerApi';
import type { EmployerPlan } from '@/pages/employer/employerApi';
import { CreditsContext, PLAN_CHECKOUT_KEY, hasBusinessIntent, markBusinessIntent, takeBusinessIntent } from '@/pages/employer/creditsContext';
import { openBusinessCheckout } from '@/pages/employer/businessCheckout';
import { clearEmployerSession, saveEmployerSession } from '@/pages/employer/employerAuth';
import { toast } from 'sonner';
import { EmployerPlanView } from '@/pages/employer/EmployerPlanView';
import { formatMoney } from '@/pages/employer/money';
import { mockCompanies } from '@/components/admin/console/pages/employer/mockData';

// Plan & Usage shows live numbers: GET /employer/plan for Business, the
// org's credits (GET /employer/credits) for Free, both re-read on each visit.

vi.mock('@/components/admin/console/pages/employer/store', async (orig) => {
  const actual = await orig<typeof import('@/components/admin/console/pages/employer/store')>();
  return { ...actual, useEmployerStore: () => ({ company: mockCompanies[0], plan: { seats: 3, seatsUsed: 1, invoices: [] }, unlocksLeft: 99, sponsoredLeft: 99, go: vi.fn() }) };
});
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }) }));
vi.mock('@/pages/employer/employerApi', async (orig) => ({
  ...(await orig<object>()),
  getEmployerPlan: vi.fn(),
  getEmployerPlanPrices: vi.fn(),
  setOverageCap: vi.fn(),
  startPlanCheckout: vi.fn(),
}));

const api = vi.mocked(employerApi);

const FREE: EmployerPlan = { plan: 'FREE', billingCycle: null, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: null, allowance: null, overage: null };
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
  overage: { spentCents: 1250, capCents: null, capReached: false, reportUnitCents: 500, interviewUnitCents: 300, allowed: true },
};

function renderPlan(credits = { report: 4, interview: 9 }, shellPlan: EmployerPlan | null = null) {
  const refresh = vi.fn();
  render(
    <CreditsContext.Provider value={{ credits, plan: shellPlan, refresh }}>
      <EmployerPlanView />
    </CreditsContext.Provider>,
  );
  return { refresh };
}

const PRICES: employerApi.EmployerPlanPrices = {
  business: {
    monthly: { amountCents: 39900, currency: 'usd' },
    annual: { amountCents: 399000, currency: 'usd' },
    reportAllowance: 100,
    interviewAllowance: 50,
    overage: { reportUnitCents: 500, interviewUnitCents: 300 },
  },
  reportCredit: { amountCents: 800, currency: 'usd' },
  interviewCredit: { amountCents: 500, currency: 'usd' },
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  clearEmployerSession();
  api.getEmployerPlanPrices.mockResolvedValue(PRICES);
});

function stubLocation() {
  let href = 'http://localhost/employers';
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, get href() { return href; }, set href(v: string) { href = v; } },
  });
  return () => href;
}

const signIn = () =>
  saveEmployerSession({
    email: 'a@acme.com', domain: 'acme.com', name: 'A', title: '', companyName: 'Acme',
    signedInAt: new Date().toISOString(), accessToken: 't', refreshToken: 'r',
  } as Parameters<typeof saveEmployerSession>[0]);

describe('Start Business from the landing page', () => {
  it('the intent survives sign-in, expires after 30 minutes and is used once', () => {
    sessionStorage.clear();
    markBusinessIntent('ANNUAL');
    expect(hasBusinessIntent()).toBe(true);
    expect(takeBusinessIntent()).toBe('ANNUAL');
    expect(takeBusinessIntent()).toBeNull();
    markBusinessIntent();
    expect(takeBusinessIntent()).toBe('MONTHLY');
    sessionStorage.setItem('screna_employer_business_intent', JSON.stringify({ at: Date.now() - 31 * 60_000, cycle: 'MONTHLY' }));
    expect(takeBusinessIntent()).toBeNull();
  });

  it('opening checkout marks the return and sends the browser to Stripe', async () => {
    const href = stubLocation();
    api.startPlanCheckout.mockResolvedValue('https://checkout.stripe.com/biz');
    void openBusinessCheckout();
    await waitFor(() => expect(href()).toBe('https://checkout.stripe.com/biz'));
    expect(api.startPlanCheckout).toHaveBeenCalledWith('MONTHLY');
    expect(sessionStorage.getItem(PLAN_CHECKOUT_KEY)).toBe('MONTHLY');
  });
});

describe('Plan & Usage', () => {
  it("Free: shows the org's real credits, not sample numbers, and re-reads them on each visit", async () => {
    api.getEmployerPlan.mockResolvedValue(FREE);
    const { refresh } = renderPlan();
    expect(await screen.findByText('4 free unlocks left · 9 sponsored interviews left')).toBeInTheDocument();
    expect(screen.queryByText(/99/)).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows the shell's plan at once instead of waiting for its own read", async () => {
    api.getEmployerPlan.mockReturnValue(new Promise(() => {}));
    renderPlan(undefined, BUSINESS);
    expect(await screen.findByText('$12.50')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).toBeNull();
  });

  it('Business: usage and overage come from GET /employer/plan', async () => {
    api.getEmployerPlan.mockResolvedValue(BUSINESS);
    renderPlan();
    expect(await screen.findByText('$12.50')).toBeInTheDocument();
    expect(screen.getByText(/Report unlocks/)).toBeInTheDocument();
    expect(screen.getByText(/7/)).toBeInTheDocument();
  });

  it('Business: the price comes from GET /employer/plan/prices; no seats or invoices', async () => {
    api.getEmployerPlan.mockResolvedValue(BUSINESS);
    renderPlan();
    expect(await screen.findByText('$399/month')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to annual · $3,990' })).toBeInTheDocument();
    expect(api.getEmployerPlanPrices).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/seats in use/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage seats' })).not.toBeInTheDocument();
    expect(screen.queryByText('Invoices')).not.toBeInTheDocument();
  });

  it('prices unreadable (500): no made-up price anywhere', async () => {
    api.getEmployerPlanPrices.mockRejectedValue(new Error('500'));
    api.getEmployerPlan.mockResolvedValue({ ...BUSINESS, allowance: null });
    renderPlan();
    expect(await screen.findByRole('button', { name: 'Switch to annual' })).toBeInTheDocument();
    expect(screen.queryByText(/\/month|\/year/)).not.toBeInTheDocument();
    expect(screen.getByText('Need more unlocks or custom workflows?')).toBeInTheDocument();
  });

  it('Free: the upgrade dialog shows live prices', async () => {
    api.getEmployerPlan.mockResolvedValue(FREE);
    renderPlan();
    fireEvent.click(await screen.findByRole('button', { name: 'Upgrade to Business' }));
    expect(await screen.findByRole('button', { name: 'Monthly · $399/month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annual · $3,990/year' })).toBeInTheDocument();
  });

  it('formatMoney keeps cents only when there are any', () => {
    expect(formatMoney({ amountCents: 39900, currency: 'usd' })).toBe('$399');
    expect(formatMoney({ amountCents: 1250, currency: 'USD' })).toBe('$12.50');
  });

  it('Save cap calls the API and shows the returned plan', async () => {
    api.getEmployerPlan.mockResolvedValue(BUSINESS);
    api.setOverageCap.mockResolvedValue({ ...BUSINESS, overage: { ...BUSINESS.overage!, capCents: 20000 } });
    renderPlan();
    const input = await screen.findByLabelText('Monthly overage cap in dollars');
    fireEvent.change(input, { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save cap' }));
    await waitFor(() => expect(api.setOverageCap).toHaveBeenCalledWith(20000));
    expect(screen.getByDisplayValue('200')).toBeInTheDocument();
  });
});

describe('landing page pricing', () => {
  const renderLanding = async () => {
    const { MemoryRouter } = await import('react-router-dom');
    const { EmployerLandingPage } = await import('@/pages/employerLanding/employer-landing');
    render(
      <MemoryRouter>
        <EmployerLandingPage />
      </MemoryRouter>,
    );
  };

  it('signed in: "Start Business" goes straight to the Business checkout', async () => {
    signIn();
    const href = stubLocation();
    api.startPlanCheckout.mockResolvedValue('https://checkout.stripe.com/biz');
    await renderLanding();
    fireEvent.click(screen.getByRole('link', { name: 'Start Business' }));
    expect(await screen.findByRole('link', { name: 'Opening checkout…' })).toBeInTheDocument();
    await waitFor(() => expect(href()).toBe('https://checkout.stripe.com/biz'));
    expect(api.startPlanCheckout).toHaveBeenCalledTimes(1);
    expect(api.startPlanCheckout).toHaveBeenCalledWith('MONTHLY');
    expect(hasBusinessIntent()).toBe(false);
  });

  it('signed in: "Start annual" goes straight to the annual checkout', async () => {
    signIn();
    const href = stubLocation();
    api.startPlanCheckout.mockResolvedValue('https://checkout.stripe.com/biz-annual');
    await renderLanding();
    expect(screen.getByText('Business Annual')).toBeInTheDocument();
    expect(screen.getByText('$3,990')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Start annual' }));
    await waitFor(() => expect(href()).toBe('https://checkout.stripe.com/biz-annual'));
    expect(api.startPlanCheckout).toHaveBeenCalledWith('ANNUAL');
    expect(sessionStorage.getItem(PLAN_CHECKOUT_KEY)).toBe('ANNUAL');
  });

  it('signed out: "Start annual" remembers annual through sign-in', async () => {
    await renderLanding();
    fireEvent.click(screen.getByRole('link', { name: 'Start annual' }));
    expect(takeBusinessIntent()).toBe('ANNUAL');
  });

  it('signed out: marks the intent and goes to sign in (checkout opens right after)', async () => {
    await renderLanding();
    const link = screen.getByRole('link', { name: 'Start Business' });
    expect(link).toHaveAttribute('href', '/employer/login');
    fireEvent.click(link);
    expect(hasBusinessIntent()).toBe(true);
    expect(api.startPlanCheckout).not.toHaveBeenCalled();
    // The free plan's sign-up doesn't.
    sessionStorage.clear();
    screen.getAllByRole('link', { name: 'Post a role free' }).forEach((l) => fireEvent.click(l));
    expect(hasBusinessIntent()).toBe(false);
  });

  it('already on Business: says so', async () => {
    signIn();
    const err = Object.assign(new Error('409'), { isAxiosError: true, response: { status: 409, data: { errorCode: 'INVALID_STATE' } } });
    api.startPlanCheckout.mockRejectedValue(err);
    await renderLanding();
    fireEvent.click(screen.getByRole('link', { name: 'Start Business' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("You're already on Business."));
  });
});
