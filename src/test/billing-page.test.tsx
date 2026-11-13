import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Settings → Billing, new design (Figma "profile-billing", 2026-11): current
// plan card, usage tiles (interviews / practice / add-on), the add-on row,
// one-step cancel, payment history. Wired to the same billing APIs as before.

const svc = vi.hoisted(() => ({
  getSubscription: vi.fn(),
  getCredits: vi.fn(),
  getCreditUsage: vi.fn(),
  getInvoices: vi.fn(),
  getPaymentMethod: vi.fn(),
  getInterviewQuota: vi.fn(),
  changeTier: vi.fn(),
  cancelSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
  cancelPendingDowngrade: vi.fn(),
  createPaymentMethodSetupSession: vi.fn(),
  retryPayment: vi.fn(),
  createPro90DayCheckout: vi.fn(),
  createInterviewAddOnCheckout: vi.fn(),
  purchaseCustomPack: vi.fn(),
  redeemCode: vi.fn(),
  createSubscription: vi.fn(),
  changeBillingCycle: vi.fn(),
  getPrices: vi.fn(),
}));
vi.mock('@/services', () => ({ PaymentService: svc }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Test User' }, isAuthenticated: true, isLoading: false }),
  isStaffRole: () => false,
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));

import { BillingTab } from '@/components/newDesign/billing-tab-design';
import { resetCandidatePricesCache } from '@/hooks/useCandidatePrices';

let assignedHref: string | null = null;
const ok = (data: unknown = {}) => ({ data: { data } });
const sub = (over: Record<string, unknown> = {}) =>
  ok({ memberPlan: 'PRO_MONTHLY', tier: 'PRO', status: 'ACTIVE', billingCycle: 'MONTHLY', currentPeriodEnd: '2026-12-03T00:00:00Z', cancelAtPeriodEnd: false, ...over });
const VISA = ok({ brand: 'visa', last4: '4242', expMonth: 11, expYear: 2028, status: 'VALID' });
const PRO_QUOTA = ok({
  plan: 'PRO',
  available: 4,
  grants: [
    { source: 'PRO_PERIOD', sessions: 15, remaining: 1, expiresAt: '2026-12-03T00:00:00Z' },
    { source: 'ADD_ON', sessions: 5, remaining: 3, expiresAt: '2027-02-01T00:00:00Z' },
  ],
});
const FREE_QUOTA = ok({ plan: 'FREE', available: 1, grants: [{ source: 'FREE_MONTHLY', sessions: 2, remaining: 1, expiresAt: '2026-12-01T00:00:00Z' }], resetsAt: '2026-12-01T00:00:00Z' });
const notFound = { response: { status: 400, data: { message: 'Subscription not found' } } };

function renderBilling(path = '/settings?tab=billing') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BillingTab />
    </MemoryRouter>,
  );
}
const loaded = (title = 'Pro · $29 / month') => screen.findByText(title);

beforeEach(() => {
  vi.clearAllMocks();
  resetCandidatePricesCache();
  // GET /payments/prices unreadable by default: the published defaults show.
  svc.getPrices.mockRejectedValue({ response: { status: 500 } });
  sessionStorage.clear();
  assignedHref = null;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, get href() { return 'http://localhost/settings'; }, set href(v: string) { assignedHref = v; } },
  });
  svc.getSubscription.mockResolvedValue(sub());
  svc.getCredits.mockResolvedValue(ok({ recurringCreditBalance: 80, permanentCreditBalance: 0 }));
  svc.getCreditUsage.mockResolvedValue(ok({
    content: [{ amount: -120, transactionType: 'DEBIT', createdAt: new Date().toISOString() }],
    pageMeta: { last: true },
  }));
  svc.getInvoices.mockResolvedValue(ok({ content: [] }));
  svc.getPaymentMethod.mockResolvedValue(VISA);
  svc.getInterviewQuota.mockResolvedValue(PRO_QUOTA);
  svc.cancelSubscription.mockResolvedValue(ok());
  svc.resumeSubscription.mockResolvedValue(ok());
});

describe('Billing — Pro', () => {
  it('shows the plan, renewal and card, and the design actions', async () => {
    renderBilling();
    await loaded();
    expect(await screen.findByText('Renews Dec 3, 2026 · Card ending 4242')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to 90-day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update card' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View pricing' })).toBeInTheDocument();
  });

  it('"X of Y" comes from grants[].sessions, not a hard-coded allowance', async () => {
    svc.getInterviewQuota.mockResolvedValue(ok({ plan: 'PRO', available: 12, grants: [{ source: 'PRO_PERIOD', sessions: 20, remaining: 12, expiresAt: '2026-12-03T00:00:00Z' }] }));
    renderBilling();
    expect(await screen.findByText('8 of 20 used')).toBeInTheDocument();
  });

  it('a used-up plan grant is not listed: all used', async () => {
    svc.getInterviewQuota.mockResolvedValue(ok({ plan: 'PRO', available: 0, grants: [] }));
    renderBilling();
    expect(await screen.findByText('All used')).toBeInTheDocument();
  });

  it('usage tiles come from the interview quota and the credit ledger', async () => {
    renderBilling();
    expect(await screen.findByText('14 of 15 used')).toBeInTheDocument();
    expect(screen.getByText('1 interview left · Resets Dec 3')).toBeInTheDocument();
    expect(screen.getByText('3 left')).toBeInTheDocument();
    expect(screen.getByText('Expires Feb 1')).toBeInTheDocument();
    // Balance only, no "of N" (backend 11-12): 80 minutes left this period.
    expect(await screen.findByText('80 min left')).toBeInTheDocument();
    expect(screen.queryByText(/of 200 min/)).toBeNull();
  });

  it('"Buy 5 more" checks out the add-on and marks the return', async () => {
    const user = userEvent.setup();
    svc.createInterviewAddOnCheckout.mockResolvedValue(ok({ url: 'https://checkout.stripe.com/addon' }));
    renderBilling();
    await user.click(await screen.findByRole('button', { name: 'Buy 5 more' }));
    await waitFor(() => expect(assignedHref).toBe('https://checkout.stripe.com/addon'));
    expect(JSON.parse(sessionStorage.getItem('pendingCheckout')!)).toMatchObject({ kind: 'interview-add-on' });
  });

  it('"Switch to 90-day" checks out Pro 90-Day', async () => {
    const user = userEvent.setup();
    svc.createPro90DayCheckout.mockResolvedValue(ok({ url: 'https://checkout.stripe.com/p90' }));
    renderBilling();
    await user.click(await screen.findByRole('button', { name: 'Switch to 90-day' }));
    await waitFor(() => expect(assignedHref).toBe('https://checkout.stripe.com/p90'));
    expect(JSON.parse(sessionStorage.getItem('pendingCheckout')!)).toMatchObject({ kind: 'pro-90-day' });
  });

  it('"Update card" starts the Stripe setup session', async () => {
    const user = userEvent.setup();
    svc.createPaymentMethodSetupSession.mockResolvedValue(ok({ url: 'https://checkout.stripe.com/setup' }));
    renderBilling();
    await screen.findByText(/Card ending 4242/);
    await user.click(screen.getByRole('button', { name: 'Update card' }));
    await waitFor(() => expect(assignedHref).toBe('https://checkout.stripe.com/setup'));
    expect(JSON.parse(sessionStorage.getItem('pendingCheckout')!)).toMatchObject({ kind: 'card', last4Before: '4242' });
  });

  it('warns when the card expires before the next renewal', async () => {
    svc.getPaymentMethod.mockResolvedValue(ok({ brand: 'visa', last4: '4242', expMonth: 11, expYear: 2026, status: 'EXPIRES_BEFORE_RENEWAL' }));
    renderBilling();
    expect(await screen.findByText(/expires before your next renewal/)).toBeInTheDocument();
  });

  it('payment history names each row and links the receipt', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    svc.getInvoices.mockResolvedValue(ok({
      content: [
        { stripeInvoiceId: 'in_2', amount: 1200, currency: 'usd', invoiceUrl: 'https://pay.stripe.com/2', createdAt: '2026-10-11T00:00:00Z', item: '5 interviews add-on' },
        { stripeInvoiceId: 'in_1', amount: 2900, currency: 'usd', invoiceUrl: 'https://pay.stripe.com/1', createdAt: '2026-10-03T00:00:00Z', item: 'Pro' },
        // Old invoice with neither a plan nor a description: item null (#323).
        { stripeInvoiceId: 'in_0', amount: 2900, currency: 'usd', invoiceUrl: 'https://pay.stripe.com/0', createdAt: '2026-09-03T00:00:00Z', item: null },
      ],
    }));
    renderBilling();
    // The row is named from invoice.item, never guessed from the amount.
    expect(await screen.findByText('5 interviews add-on')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('$12.00')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Download' })[0]);
    expect(open).toHaveBeenCalledWith('https://pay.stripe.com/2', '_blank');
  });
});

describe('Billing — live prices (#323)', () => {
  it('uses GET /payments/prices instead of the hard-coded amounts', async () => {
    svc.getPrices.mockResolvedValue(ok({
      pro: { amountCents: 3100, currency: 'usd', sessionCount: 15, validDays: null },
      pro90Day: { amountCents: 8900, currency: 'usd', sessionCount: 45, validDays: 90 },
      interviewAddOn: { amountCents: 1450, currency: 'usd', sessionCount: 5, validDays: 90 },
      credit: { amountCents: 10, currency: 'usd', sessionCount: null, validDays: null },
      freeMonthlySessionCount: 2,
    }));
    renderBilling();
    expect(await screen.findByText('Pro · $31 / month')).toBeInTheDocument();
    expect(screen.getByText('Add 5 interviews for $14.50')).toBeInTheDocument();
    expect(screen.queryByText(/\$29 \/ month/)).toBeNull();
  });
});

describe('Billing — cancel and keep', () => {
  it('cancels in one step and says when access ends', async () => {
    const user = userEvent.setup();
    let canceled = false;
    svc.cancelSubscription.mockImplementation(async () => {
      canceled = true;
      return ok({ outcome: 'SCHEDULED', effectiveAt: '2026-12-03T00:00:00Z' });
    });
    svc.getSubscription.mockImplementation(async () => sub({ cancelAtPeriodEnd: canceled }));
    renderBilling();
    expect(await screen.findByText(/You keep Pro until Dec 3, 2026/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel subscription' }));
    await waitFor(() => expect(svc.cancelSubscription).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/access continues until Dec 3, 2026/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Keep Pro' })).toBeInTheDocument();
  });

  it('in the refund window, says the refund outright and reports it', async () => {
    const user = userEvent.setup();
    let canceled = false;
    svc.cancelSubscription.mockImplementation(async () => {
      canceled = true;
      return ok({ outcome: 'REFUNDED_IMMEDIATELY', effectiveAt: new Date().toISOString() });
    });
    svc.getSubscription.mockImplementation(async () => sub({ refundOnCancel: true, ...(canceled ? { status: 'CANCELED' } : {}) }));
    renderBilling();
    expect(await screen.findByText(/You're within the refund window/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel and refund' }));
    expect(await screen.findByText(/refund on its way/)).toBeInTheDocument();
  });

  it('"Keep Pro" resumes a scheduled cancellation', async () => {
    const user = userEvent.setup();
    let resumed = false;
    svc.resumeSubscription.mockImplementation(async () => {
      resumed = true;
      return ok();
    });
    svc.getSubscription.mockImplementation(async () => sub({ cancelAtPeriodEnd: !resumed }));
    renderBilling();
    expect(await screen.findByText('Pro ends Dec 3, 2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Switch to 90-day' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep Pro' }));
    expect(await screen.findByText('Subscription reactivated')).toBeInTheDocument();
  });
});

describe('Billing — other plans and states', () => {
  it('Free: offers Pro and Pro 90-Day, no add-on, nothing to cancel', async () => {
    svc.getSubscription.mockRejectedValue(notFound);
    svc.getInterviewQuota.mockResolvedValue(FREE_QUOTA);
    renderBilling();
    await loaded('Free · $0');
    expect(screen.getByRole('button', { name: 'Get Pro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get Pro 90-Day' })).toBeInTheDocument();
    expect(await screen.findByText('1 of 2 used')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Available with Pro' })).toBeDisabled();
    expect(screen.queryByText(/^Cancel /)).not.toBeInTheDocument();
    expect(svc.getPaymentMethod).not.toHaveBeenCalled();
  });

  it('a retired plan with no amount shows its name alone, never "— / month"', async () => {
    svc.getSubscription.mockResolvedValue(sub({ memberPlan: 'PREMIUM_QUARTERLY', tier: 'PREMIUM', billingCycle: 'QUARTERLY', nextBillingAmount: null }));
    renderBilling();
    expect(await screen.findByText('Premium')).toBeInTheDocument();
    expect(screen.queryByText(/— \/ month/)).toBeNull();
  });

  it('a quarterly amount is shown per quarter', async () => {
    svc.getSubscription.mockResolvedValue(sub({ memberPlan: 'PREMIUM_QUARTERLY', tier: 'PREMIUM', billingCycle: 'QUARTERLY', nextBillingAmount: 47700, currency: 'usd' }));
    renderBilling();
    expect(await screen.findByText('Premium · $477.00 / quarter')).toBeInTheDocument();
  });

  it('a legacy tier switches to Pro after confirming', async () => {
    const user = userEvent.setup();
    svc.getSubscription.mockResolvedValue(sub({ memberPlan: 'ADVANCED_MONTHLY', tier: 'ADVANCED' }));
    svc.changeTier.mockResolvedValue(ok());
    renderBilling();
    await loaded('Advanced · $29.99 / month');
    await user.click(screen.getByRole('button', { name: 'Switch to Pro' }));
    expect(svc.changeTier).not.toHaveBeenCalled();
    await user.click(await screen.findByRole('button', { name: /Confirm/ }));
    await waitFor(() => expect(svc.changeTier).toHaveBeenCalledWith('pro'));
  });

  it('a pending switch to Pro is shown and blocks switching', async () => {
    svc.getSubscription.mockResolvedValue(sub({ memberPlan: 'ADVANCED_MONTHLY', tier: 'ADVANCED', planSwitchPending: 'PRO_MONTHLY' }));
    renderBilling();
    expect(await screen.findByText('Your plan switches to Pro on Dec 3, 2026.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to Pro' })).toBeDisabled();
  });

  it('a scheduled downgrade can be undone', async () => {
    const user = userEvent.setup();
    svc.getSubscription.mockResolvedValue(sub({ memberPlan: 'FLAGSHIP_MONTHLY', tier: 'FLAGSHIP', downgradePendingPlan: 'ADVANCED_MONTHLY' }));
    svc.cancelPendingDowngrade.mockResolvedValue(ok());
    renderBilling();
    expect(await screen.findByText(/Changing to Advanced on Dec 3, 2026/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel change' }));
    await waitFor(() => expect(svc.cancelPendingDowngrade).toHaveBeenCalled());
  });

  it('past due: explains, and offers update and retry', async () => {
    const user = userEvent.setup();
    svc.getSubscription.mockResolvedValue(sub({ status: 'PAST_DUE' }));
    svc.retryPayment.mockResolvedValue(ok({ outcome: 'DECLINED' }));
    renderBilling();
    expect(await screen.findByText(/couldn't process your last payment/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update payment method' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry payment' }));
    expect(await screen.findByText(/That card was declined/)).toBeInTheDocument();
  });
});

describe('Billing — back from Stripe', () => {
  it('cancelled checkout: neutral notice, nothing charged', async () => {
    renderBilling('/settings?tab=billing&checkout=cancelled');
    expect(await screen.findByText('Checkout canceled')).toBeInTheDocument();
    expect(screen.getByText(/Nothing was charged/)).toBeInTheDocument();
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });

  it('card_cancelled: card-specific copy', async () => {
    renderBilling('/settings?tab=billing&checkout=card_cancelled');
    expect(await screen.findByText('Card update canceled')).toBeInTheDocument();
  });

  it('success: waits for the subscription instead of showing Free', async () => {
    svc.getSubscription.mockRejectedValue(notFound);
    const { unmount } = renderBilling('/settings?tab=billing&checkout=success');
    expect(await screen.findByText('Confirming your payment…')).toBeInTheDocument();
    unmount();
  });

  it('Pro 90-Day: polls the quota until the new grant appears', async () => {
    sessionStorage.setItem('pendingCheckout', JSON.stringify({ kind: 'pro-90-day', grantsBefore: [], ts: Date.now() }));
    svc.getSubscription.mockRejectedValue(notFound);
    const landed = ok({ plan: 'PRO_90_DAY', available: 45, grants: [{ source: 'PRO_90_DAY', remaining: 45, expiresAt: '2027-02-02T00:00:00Z' }] });
    svc.getInterviewQuota.mockResolvedValueOnce(FREE_QUOTA).mockResolvedValueOnce(FREE_QUOTA).mockResolvedValue(landed);
    renderBilling('/settings?tab=billing&checkout=success');
    expect(await screen.findByText('Confirming your payment…')).toBeInTheDocument();
    expect(await screen.findByText('Pro 90-Day is active', {}, { timeout: 6000 })).toBeInTheDocument();
    expect(await screen.findByText('Pro 90-day · $79 once')).toBeInTheDocument();
    expect(screen.getByText('0 of 45 used')).toBeInTheDocument();
  }, 10_000);
});
