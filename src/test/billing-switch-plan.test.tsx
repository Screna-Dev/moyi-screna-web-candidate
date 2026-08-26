import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// ─── Mocks ────────────────────────────────────────────────
const mockGetSubscription = vi.fn();
const mockGetCredits = vi.fn();
const mockChangeTier = vi.fn();
const mockCancelSubscription = vi.fn();
const mockResumeSubscription = vi.fn();
const mockGetInvoices = vi.fn();
const mockGetCreditUsage = vi.fn();
const mockCancelPendingDowngrade = vi.fn();
const mockGetPaymentMethod = vi.fn();
const mockCreatePaymentMethodSetupSession = vi.fn();
const mockRetryPayment = vi.fn();

vi.mock('@/services', () => ({
  PaymentService: {
    getSubscription: (...a: unknown[]) => mockGetSubscription(...a),
    getCredits: (...a: unknown[]) => mockGetCredits(...a),
    changeTier: (...a: unknown[]) => mockChangeTier(...a),
    cancelSubscription: (...a: unknown[]) => mockCancelSubscription(...a),
    resumeSubscription: (...a: unknown[]) => mockResumeSubscription(...a),
    changeBillingCycle: vi.fn(),
    cancelPendingDowngrade: (...a: unknown[]) => mockCancelPendingDowngrade(...a),
    createSubscription: vi.fn(),
    getCreditUsage: (...a: unknown[]) => mockGetCreditUsage(...a),
    getInvoices: (...a: unknown[]) => mockGetInvoices(...a),
    getPaymentMethod: (...a: unknown[]) => mockGetPaymentMethod(...a),
    createPaymentMethodSetupSession: (...a: unknown[]) => mockCreatePaymentMethodSetupSession(...a),
    retryPayment: (...a: unknown[]) => mockRetryPayment(...a),
    purchaseCustomPack: vi.fn(),
    redeemCode: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Test User' }, isAuthenticated: true, isLoading: false }),
  isStaffRole: () => false,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));

import { BillingTab } from '@/components/newDesign/billing-tab-design';

// jsdom refuses real navigation, so capture what the component assigns.
let assignedHref: string | null = null;
beforeEach(() => {
  assignedHref = null;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      get href() {
        return 'http://localhost/settings';
      },
      set href(v: string) {
        assignedHref = v;
      },
    },
  });
  // Payment method is its own live Stripe round-trip (C6) and most describe
  // blocks below aren't testing it, so give it a harmless default everywhere
  // — otherwise every member-state test would hit the unmocked-call fallback
  // (pmError=true, rendered but assertionless) instead of a deliberate state.
  mockGetPaymentMethod.mockResolvedValue({
    data: { data: { brand: null, last4: null, expMonth: null, expYear: null, status: 'NONE' } },
  });
});

const subscriptionRes = (over: Record<string, unknown> = {}) => ({
  data: {
    data: {
      memberPlan: 'BASIC_MONTHLY',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      currentPeriodEnd: '2026-09-17T00:00:00Z',
      cancelAtPeriodEnd: false,
      ...over,
    },
  },
});

const renderBilling = async () => {
  render(
    <MemoryRouter>
      <BillingTab />
    </MemoryRouter>,
  );
  // Wait for the subscription card to render from live data.
  await waitFor(() => expect(screen.getByText(/Basic plan/)).toBeInTheDocument());
};

const openSwitchPanel = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Switch plan' }));
  await screen.findByRole('button', { name: /Confirm change/ });
};

// Writes are applied asynchronously (webhook → SQS → worker), so the hook polls
// GET until the new state appears. Mocks must therefore *change* what GET
// returns once the write has been called, or the poll never settles.
const changeTierLandsAs = (over: Record<string, unknown>) => {
  let applied = false;
  mockChangeTier.mockImplementation(async () => {
    applied = true;
    return { data: { data: {} } };
  });
  mockGetSubscription.mockImplementation(async () =>
    subscriptionRes(applied ? over : {}),
  );
};

// A tier row in the switch panel. The header text ("Basic plan · $7.99/mo ·
// Monthly") lives in a single span, so an exact match only hits the row label.
const tierRow = (name: string) => screen.getByText(name).parentElement!;

// Confirming a switch is two steps: the panel button opens a confirm modal,
// then the modal fires the API call.
const confirmInModal = async (
  user: ReturnType<typeof userEvent.setup>,
  action: RegExp = /Confirm and pay/,
) => {
  await user.click(screen.getByRole('button', { name: /Confirm change/ }));
  await screen.findByRole('button', { name: action });
  await user.click(screen.getByRole('button', { name: action }));
};

describe('BillingTab — switch plan wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSubscription.mockResolvedValue(subscriptionRes());
    mockGetCredits.mockResolvedValue({
      data: { data: { recurringCreditBalance: 10, permanentCreditBalance: 5 } },
    });
    mockGetCreditUsage.mockResolvedValue({ data: { data: { content: [], pageMeta: { last: true } } } });
    mockGetInvoices.mockResolvedValue({ data: { data: { content: [] } } });
    mockChangeTier.mockResolvedValue({ data: {} });
    mockCancelSubscription.mockResolvedValue({ data: {} });
    mockResumeSubscription.mockResolvedValue({ data: {} });
  });

  it('marks the tier from the API as Current — not a hardcoded one', async () => {
    const user = userEvent.setup();
    await renderBilling();
    await openSwitchPanel(user);

    // "Current" sits on the Basic row, matching the header.
    expect(within(tierRow('Basic')).getByText('Current')).toBeInTheDocument();
    expect(within(tierRow('Advanced')).queryByText('Current')).not.toBeInTheDocument();
  });

  it('sends the selected tier to the change-tier endpoint', async () => {
    const user = userEvent.setup();
    await renderBilling();
    await openSwitchPanel(user);

    await user.click(screen.getByText('Flagship'));
    await confirmInModal(user);

    await waitFor(() => expect(mockChangeTier).toHaveBeenCalledWith('flagship'));
    // The hook re-reads the subscription after a successful change.
    expect(mockGetSubscription.mock.calls.length).toBeGreaterThan(1);
  });

  // The charge is immediate, so the panel button must not reach the API on its
  // own — it only opens the confirmation.
  it('does not call the API until the confirmation is accepted', async () => {
    const user = userEvent.setup();
    await renderBilling();
    await openSwitchPanel(user);

    await user.click(screen.getByText('Flagship'));
    await user.click(screen.getByRole('button', { name: /Confirm change/ }));

    const heading = await screen.findByText('Upgrade to Flagship?');
    // The modal spells out the immediate charge (the panel hint says so too, so
    // scope the assertion to the modal).
    expect(within(heading.parentElement!).getByText(/charged/)).toBeInTheDocument();
    expect(mockChangeTier).not.toHaveBeenCalled();

    // Backing out leaves the subscription untouched.
    await user.click(screen.getByRole('button', { name: 'Go back' }));
    expect(mockChangeTier).not.toHaveBeenCalled();
  });

  it('labels a downgrade as scheduled rather than charged', async () => {
    const user = userEvent.setup();
    mockGetSubscription.mockResolvedValue(subscriptionRes({ memberPlan: 'FLAGSHIP_MONTHLY' }));
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Flagship plan/)).toBeInTheDocument());
    await openSwitchPanel(user);

    await user.click(screen.getByText('Basic'));
    await user.click(screen.getByRole('button', { name: /Confirm change/ }));

    expect(await screen.findByText('Switch to Basic?')).toBeInTheDocument();
    expect(screen.getByText(/Nothing is charged today/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Schedule change/ }));
    await waitFor(() => expect(mockChangeTier).toHaveBeenCalledWith('basic'));
  });

  // An upgrade that needs payment comes back with a Stripe URL and is NOT
  // applied yet — the user has to be sent there.
  it('redirects to the payment URL returned by the change-tier response', async () => {
    const user = userEvent.setup();
    mockChangeTier.mockResolvedValue({
      data: { data: { url: 'https://checkout.stripe.com/session-123' } },
    });
    await renderBilling();
    await openSwitchPanel(user);

    await user.click(screen.getByText('Flagship'));
    await confirmInModal(user);

    await waitFor(() => expect(assignedHref).toBe('https://checkout.stripe.com/session-123'));
    // Nothing applied yet, so don't re-read the subscription or claim success.
    expect(mockGetSubscription).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Plan upgraded')).not.toBeInTheDocument();
  });

  it('applies the change in place when no URL is returned', async () => {
    const user = userEvent.setup();
    mockChangeTier.mockResolvedValue({ data: { data: {} } });
    await renderBilling();
    await openSwitchPanel(user);

    await user.click(screen.getByText('Flagship'));
    await confirmInModal(user);

    await waitFor(() => expect(mockGetSubscription.mock.calls.length).toBeGreaterThan(1));
    expect(assignedHref).toBeNull();
  });

  // Refreshing only the subscription left the invoice table (and credits/usage)
  // showing pre-upgrade data.
  it('refetches every billing section after an upgrade applies', async () => {
    const user = userEvent.setup();
    changeTierLandsAs({ memberPlan: 'FLAGSHIP_MONTHLY' });
    await renderBilling();
    await waitFor(() => expect(mockGetInvoices).toHaveBeenCalledTimes(1));
    const before = {
      subscription: mockGetSubscription.mock.calls.length,
      credits: mockGetCredits.mock.calls.length,
      usage: mockGetCreditUsage.mock.calls.length,
      invoices: mockGetInvoices.mock.calls.length,
    };

    await openSwitchPanel(user);
    await user.click(screen.getByText('Flagship'));
    await confirmInModal(user);

    await waitFor(() => {
      expect(mockGetSubscription.mock.calls.length).toBeGreaterThan(before.subscription);
      expect(mockGetCredits.mock.calls.length).toBeGreaterThan(before.credits);
      expect(mockGetCreditUsage.mock.calls.length).toBeGreaterThan(before.usage);
      expect(mockGetInvoices.mock.calls.length).toBeGreaterThan(before.invoices);
    });
  });

  it('renders the invoice rows returned after the upgrade', async () => {
    const user = userEvent.setup();
    changeTierLandsAs({ memberPlan: 'FLAGSHIP_MONTHLY' });
    await renderBilling();
    await waitFor(() => expect(screen.getByText('No invoices yet')).toBeInTheDocument());

    // The refetch that follows the upgrade returns the new invoice.
    mockGetInvoices.mockResolvedValue({
      data: {
        data: {
          content: [
            {
              stripeInvoiceId: 'in_123',
              amount: 7999,
              currency: 'usd',
              invoiceUrl: 'https://stripe/invoice.pdf',
              createdAt: '2026-08-17T00:00:00Z',
            },
          ],
        },
      },
    });

    await openSwitchPanel(user);
    await user.click(screen.getByText('Flagship'));
    await confirmInModal(user);

    await waitFor(() => expect(screen.queryByText('No invoices yet')).not.toBeInTheDocument());
  });

  it('disables Confirm change while the current tier is selected', async () => {
    const user = userEvent.setup();
    await renderBilling();
    await openSwitchPanel(user);

    // Panel opens preselected on the live tier, so there is nothing to confirm.
    expect(screen.getByRole('button', { name: /Confirm change/ })).toBeDisabled();
    expect(mockChangeTier).not.toHaveBeenCalled();
  });

  it('explains that a downgrade is deferred to the period end', async () => {
    const user = userEvent.setup();
    mockGetSubscription.mockResolvedValue(subscriptionRes({ memberPlan: 'FLAGSHIP_MONTHLY' }));
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Flagship plan/)).toBeInTheDocument());

    await openSwitchPanel(user);
    await user.click(screen.getByText('Basic'));

    expect(screen.getByText(/Downgrades take effect/)).toBeInTheDocument();
  });

  it('surfaces a scheduled tier downgrade returned by the API', async () => {
    mockGetSubscription.mockResolvedValue(
      subscriptionRes({ downgradePendingPlan: 'BASIC_MONTHLY', memberPlan: 'ADVANCED_MONTHLY' }),
    );
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Changing to Basic on/)).toBeInTheDocument());
  });

  // A billing-cycle downgrade is deferred to the period end the same way a tier
  // downgrade is, and used to be invisible here.
  it('surfaces a scheduled billing-cycle downgrade', async () => {
    mockGetSubscription.mockResolvedValue(
      subscriptionRes({
        memberPlan: 'ADVANCED_QUARTERLY',
        // C1: the backend now sends `tier`/`billingCycle` as authoritative
        // first-class fields, so the current cycle has to be stated explicitly
        // here rather than relying on it being parsed out of `memberPlan`.
        billingCycle: 'QUARTERLY',
        downgradePendingCycle: 'MONTHLY',
      }),
    );
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText(/Changing to Monthly billing on/)).toBeInTheDocument(),
    );
  });

  // Without this the scheduled change is irreversible until the period ends,
  // even though the backend has an endpoint to undo it.
  it('lets the user cancel a scheduled downgrade', async () => {
    const user = userEvent.setup();
    mockCancelPendingDowngrade.mockResolvedValue({ data: {} });
    mockGetSubscription.mockResolvedValue(
      subscriptionRes({ memberPlan: 'ADVANCED_MONTHLY', downgradePendingPlan: 'BASIC_MONTHLY' }),
    );
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Changing to Basic on/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Cancel change/ }));
    await waitFor(() => expect(mockCancelPendingDowngrade).toHaveBeenCalled());
    // Every section refreshes so the pending line clears from live data.
    expect(mockGetSubscription.mock.calls.length).toBeGreaterThan(1);
  });

  // The backend rejects EVERY /tier call while a downgrade is pending — not just
  // re-requesting the same one — so the whole entry point is closed off and the
  // only way forward is undoing the scheduled change.
  it('blocks plan switching entirely while a downgrade is scheduled', async () => {
    const user = userEvent.setup();
    mockGetSubscription.mockResolvedValue(
      subscriptionRes({ memberPlan: 'ADVANCED_MONTHLY', downgradePendingPlan: 'BASIC_MONTHLY' }),
    );
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Advanced plan/)).toBeInTheDocument());

    const switchButton = screen.getByRole('button', { name: 'Switch plan' });
    expect(switchButton).toBeDisabled();
    expect(switchButton).toHaveAttribute('title', expect.stringContaining('already scheduled'));

    await user.click(switchButton);
    expect(screen.queryByRole('button', { name: /Confirm change/ })).not.toBeInTheDocument();
    expect(mockChangeTier).not.toHaveBeenCalled();

    // The undo is still available.
    expect(screen.getByRole('button', { name: /Cancel change/ })).toBeEnabled();
  });

  // A cancellation supersedes a queued downgrade — the downgrade only lands at
  // the next renewal, and a canceled subscription has none. Showing both would
  // contradict itself, and cancel-pending-downgrade 400s while a cancel is
  // pending (the user must resume first).
  it('hides a scheduled downgrade once a cancellation is scheduled', async () => {
    mockGetSubscription.mockResolvedValue(
      subscriptionRes({
        memberPlan: 'ADVANCED_MONTHLY',
        downgradePendingPlan: 'BASIC_MONTHLY',
        cancelAtPeriodEnd: true,
      }),
    );
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Cancellation scheduled/)).toBeInTheDocument());

    expect(screen.queryByText(/Changing to Basic on/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel change/ })).not.toBeInTheDocument();
    // …but the user is told resuming brings it back.
    expect(screen.getByText(/Reactivating restores the scheduled change to Basic/)).toBeInTheDocument();
  });

  it('blocks plan switching while a cancellation is scheduled', async () => {
    mockGetSubscription.mockResolvedValue(subscriptionRes({ cancelAtPeriodEnd: true }));
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Cancellation scheduled/)).toBeInTheDocument());

    const switchButton = screen.getByRole('button', { name: 'Switch plan' });
    expect(switchButton).toBeDisabled();
    expect(switchButton).toHaveAttribute('title', expect.stringContaining('Reactivate'));
  });

  it('shows no undo affordance when nothing is scheduled', async () => {
    await renderBilling();
    expect(screen.queryByRole('button', { name: /Cancel change/ })).not.toBeInTheDocument();
  });

  it('surfaces a combined tier + cycle downgrade', async () => {
    mockGetSubscription.mockResolvedValue(
      subscriptionRes({
        memberPlan: 'FLAGSHIP_QUARTERLY',
        // C1: explicit `billingCycle` is authoritative now, so it has to match
        // the scenario (currently quarterly) rather than the fixture default.
        billingCycle: 'QUARTERLY',
        downgradePendingPlan: 'BASIC_MONTHLY',
      }),
    );
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    // downgradePendingPlan is a combined "TIER_CYCLE" value — both halves show.
    await waitFor(() =>
      expect(screen.getByText(/Changing to Basic · Monthly billing on/)).toBeInTheDocument(),
    );
  });
});

describe('BillingTab — cancel / reactivate wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSubscription.mockResolvedValue(subscriptionRes());
    mockGetCredits.mockResolvedValue({
      data: { data: { recurringCreditBalance: 10, permanentCreditBalance: 5 } },
    });
    mockGetCreditUsage.mockResolvedValue({ data: { data: { content: [], pageMeta: { last: true } } } });
    mockGetInvoices.mockResolvedValue({ data: { data: { content: [] } } });
    mockCancelSubscription.mockResolvedValue({ data: {} });
    mockResumeSubscription.mockResolvedValue({ data: {} });
  });

  // Regression: the cancel link used to call an undeclared setCancelState and
  // threw a ReferenceError instead of opening anything.
  it('opens the confirm modal and calls the cancel endpoint', async () => {
    const user = userEvent.setup();
    await renderBilling();

    await user.click(screen.getByRole('button', { name: 'Cancel subscription' }));
    const heading = await screen.findByText('Cancel subscription?');
    expect(mockCancelSubscription).not.toHaveBeenCalled();

    // The modal adds a second button with the same label as the page link, so
    // scope the click to the modal panel.
    const modal = heading.parentElement!;
    await user.click(within(modal).getByRole('button', { name: 'Cancel subscription' }));

    await waitFor(() => expect(mockCancelSubscription).toHaveBeenCalled());
  });

  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

  // C5: `refundOnCancel` is the backend's live verdict — it already folds in
  // firstSubAt, the 3-day window, AND the one-time-refund flag we can't see.
  // The frontend just reads it; it no longer derives a window from dates.
  it('offers the refund path when the backend says refundOnCancel is true', async () => {
    const user = userEvent.setup();
    let canceled = false;
    mockCancelSubscription.mockImplementation(async () => {
      canceled = true;
      return { data: { data: { outcome: 'REFUNDED_IMMEDIATELY', effectiveAt: new Date().toISOString() } } };
    });
    mockGetSubscription.mockImplementation(async () =>
      subscriptionRes({
        firstSubAt: daysAgo(1),
        refundOnCancel: true,
        ...(canceled ? { status: 'CANCELED' } : {}),
      }),
    );
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("You're eligible for a full refund.")).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Cancel and refund' }));
    // No reason/comment form, and no promise of a review or an email.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/24 hours/)).not.toBeInTheDocument();
    expect(screen.queryByText(/email/i)).not.toBeInTheDocument();
    // refundOnCancel already answered this, so the copy states the outcome as
    // fact rather than hedging ("if this subscription qualifies…").
    expect(await screen.findByText(/You'll get/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Confirm cancellation/ }));
    await waitFor(() => expect(mockCancelSubscription).toHaveBeenCalled());
    // The response's own `outcome` says REFUNDED_IMMEDIATELY — no need to infer
    // it from polling the resulting status.
    expect(await screen.findByText(/refund on its way/)).toBeInTheDocument();
  });

  // A user who has already used their one-time refund and re-subscribed still
  // has a recent-ish firstSubAt-adjacent history, but the backend's verdict is
  // what governs — not a date computed on the frontend.
  it('does not offer the refund path when refundOnCancel is false', async () => {
    mockGetSubscription.mockResolvedValue(
      subscriptionRes({ firstSubAt: daysAgo(1), refundOnCancel: false }),
    );
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Basic plan/)).toBeInTheDocument());

    expect(screen.queryByText("You're eligible for a full refund.")).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel and refund' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel subscription' })).toBeInTheDocument();
  });

  // When the refund path runs, access ends at once → the refreshed subscription
  // reads as Free, unmounting the module and its inline confirmation.
  it('still reports the refund after immediate cancellation hides the module', async () => {
    const user = userEvent.setup();
    let canceled = false;
    mockCancelSubscription.mockImplementation(async () => {
      canceled = true;
      return { data: { data: { outcome: 'REFUNDED_IMMEDIATELY', effectiveAt: new Date().toISOString() } } };
    });
    mockGetSubscription.mockImplementation(async () =>
      subscriptionRes({
        firstSubAt: daysAgo(1),
        refundOnCancel: true,
        ...(canceled ? { status: 'CANCELED' } : {}),
      }),
    );
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Basic plan/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Cancel and refund' }));
    await user.click(await screen.findByRole('button', { name: /Confirm cancellation/ }));

    // Module gone…
    await waitFor(() => expect(screen.queryByText(/Basic plan/)).not.toBeInTheDocument());
    // …but the refund message is still on screen.
    expect(await screen.findByText(/refund on its way/)).toBeInTheDocument();
  });

  // Race: GET said 'active' (no pending cancel) when this render happened, but
  // by the time /cancel is called — another tab, or a click just ahead of a
  // refresh — one is already scheduled. The response's own `outcome` must win
  // over what this render's state implies, and ALREADY_SCHEDULED is defined as
  // a no-op, so it skips polling for a state change entirely.
  it('reports ALREADY_SCHEDULED as scheduled without polling for a state change', async () => {
    const user = userEvent.setup();
    mockCancelSubscription.mockResolvedValue({
      data: { data: { outcome: 'ALREADY_SCHEDULED', effectiveAt: '2026-09-17T00:00:00Z' } },
    });
    mockGetSubscription.mockResolvedValue(subscriptionRes());
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Basic plan/)).toBeInTheDocument());

    const callsBefore = mockGetSubscription.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Cancel subscription' }));
    const heading = await screen.findByText('Cancel subscription?');
    await user.click(within(heading.parentElement!).getByRole('button', { name: 'Cancel subscription' }));

    await waitFor(() => expect(mockCancelSubscription).toHaveBeenCalled());
    // refreshBilling() still does its usual one re-read; what ALREADY_SCHEDULED
    // skips is the multi-attempt poll loop (2s per attempt, up to 30s) that the
    // other two outcomes require to confirm the write landed. Exactly +1 here
    // means no poll ran; if it had, this would need several more calls.
    await waitFor(() => expect(mockGetSubscription.mock.calls.length).toBe(callsBefore + 1));
  });

  it('offers no refund once the 3-day window has passed', async () => {
    mockGetSubscription.mockResolvedValue(subscriptionRes({ firstSubAt: daysAgo(10) }));
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Basic plan/)).toBeInTheDocument());

    expect(screen.queryByText(/refund window/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel and refund' })).not.toBeInTheDocument();
    // Falls back to plain cancel-at-period-end.
    expect(screen.getByRole('button', { name: 'Cancel subscription' })).toBeInTheDocument();
  });

  it('reactivates a subscription that is pending cancellation', async () => {
    const user = userEvent.setup();
    let resumed = false;
    mockResumeSubscription.mockImplementation(async () => {
      resumed = true;
      return { data: {} };
    });
    mockGetSubscription.mockImplementation(async () =>
      subscriptionRes({ cancelAtPeriodEnd: !resumed }),
    );
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Cancellation scheduled/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Reactivate/ }));
    await waitFor(() => expect(mockResumeSubscription).toHaveBeenCalled());
    // Polling saw cancelAtPeriodEnd flip back to false.
    expect(await screen.findByText('Subscription reactivated')).toBeInTheDocument();
  });
});

describe('BillingTab — Stripe Checkout return', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCredits.mockResolvedValue({
      data: { data: { recurringCreditBalance: 10, permanentCreditBalance: 5 } },
    });
    mockGetCreditUsage.mockResolvedValue({ data: { data: { content: [], pageMeta: { last: true } } } });
    mockGetInvoices.mockResolvedValue({ data: { data: { content: [] } } });
    sessionStorage.clear();
  });

  const renderAt = (search: string) =>
    render(
      <MemoryRouter initialEntries={[`/settings${search}`]}>
        <BillingTab />
      </MemoryRouter>,
    );

  // ?checkout=success → wait for the webhook instead of telling a paying user
  // they're on Free. The banner stays up while the subscription is still absent.
  it('waits for the webhook when Stripe reports success', async () => {
    mockGetSubscription.mockRejectedValue({
      response: { status: 400, data: { message: 'Subscription not found' } },
    });
    const { unmount } = renderAt('?tab=billing&checkout=success');

    expect(await screen.findByText('Confirming your payment…')).toBeInTheDocument();
    expect(screen.queryByText(/Basic plan/)).not.toBeInTheDocument();
    // The poll must stop with the component, not run on for its full 30s.
    unmount();
  });

  it('clears the confirming banner once the subscription lands', async () => {
    mockGetSubscription.mockResolvedValue(subscriptionRes());
    renderAt('?tab=billing&checkout=success');

    await waitFor(() => expect(screen.getByText(/Basic plan/)).toBeInTheDocument());
    expect(screen.queryByText('Confirming your payment…')).not.toBeInTheDocument();
  });

  // ?checkout=cancelled → neutral notice, no polling, no scary wording.
  it('reports a cancelled checkout without claiming a failure', async () => {
    mockGetSubscription.mockRejectedValue({
      response: { status: 400, data: { message: 'Subscription not found' } },
    });
    renderAt('?tab=billing&checkout=cancelled');

    expect(await screen.findByText('Checkout canceled')).toBeInTheDocument();
    expect(screen.getByText(/Nothing was charged/)).toBeInTheDocument();
    expect(screen.queryByText('Confirming your payment…')).not.toBeInTheDocument();
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });

  // setup-session (card update) shares this same billing-page URL with
  // subscription/credits Checkout. Without its own `checkout` value, a lost
  // sessionStorage marker (cross-device, private mode, TTL) would fall back to
  // the generic 'success' → wrongly poll for subscription entitlement instead
  // of a new card. `card_success`/`card_cancelled` close that gap.
  it('treats card_success as the card flow even with no sessionStorage marker', async () => {
    // Every mock here resolves instantly, so — same lesson as the payment-method
    // describe block below — asserting the transient banner races the poll to
    // completion. Freeze the fetch so "which banner" is actually observable.
    mockGetSubscription.mockResolvedValue(subscriptionRes());
    mockGetPaymentMethod.mockImplementation(() => new Promise(() => {}));
    renderAt('?tab=billing&checkout=card_success');

    expect(await screen.findByText('Confirming your new card…')).toBeInTheDocument();
    // Never claims a subscription outcome — this was never a subscription flow.
    expect(screen.queryByText('Confirming your payment…')).not.toBeInTheDocument();
  });

  it('resolves the card_success flow once the poll observes a card', async () => {
    mockGetSubscription.mockResolvedValue(subscriptionRes());
    mockGetPaymentMethod.mockResolvedValue({
      data: { data: { brand: 'visa', last4: '4242', expMonth: 11, expYear: 2026, status: 'VALID' } },
    });
    renderAt('?tab=billing&checkout=card_success');

    await waitFor(() => expect(screen.getByText('Visa ending in 4242')).toBeInTheDocument());
    expect(screen.queryByText('Confirming your new card…')).not.toBeInTheDocument();
  });

  it('shows card-specific copy for card_cancelled, not the generic checkout banner', async () => {
    mockGetSubscription.mockResolvedValue(subscriptionRes());
    renderAt('?tab=billing&checkout=card_cancelled');

    expect(await screen.findByText('Card update canceled')).toBeInTheDocument();
    expect(screen.getByText(/payment method is unchanged/)).toBeInTheDocument();
    expect(screen.queryByText('Checkout canceled')).not.toBeInTheDocument();
    expect(screen.queryByText(/Nothing was charged/)).not.toBeInTheDocument();
  });

  it('shows neither banner on a normal visit', async () => {
    mockGetSubscription.mockResolvedValue(subscriptionRes());
    renderAt('?tab=billing');

    await waitFor(() => expect(screen.getByText(/Basic plan/)).toBeInTheDocument());
    expect(screen.queryByText('Confirming your payment…')).not.toBeInTheDocument();
    expect(screen.queryByText('Checkout canceled')).not.toBeInTheDocument();
  });
});

describe('BillingTab — legacy plans and payment states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCredits.mockResolvedValue({
      data: { data: { recurringCreditBalance: 10, permanentCreditBalance: 5 } },
    });
    mockGetCreditUsage.mockResolvedValue({ data: { data: { content: [], pageMeta: { last: true } } } });
    mockGetInvoices.mockResolvedValue({ data: { data: { content: [] } } });
    mockCancelSubscription.mockResolvedValue({ data: {} });
  });

  // A retired tier used to normalize to null, which hid the whole module — taking
  // away the cancel button, the only action these users are still allowed.
  it('lets a legacy subscriber see and cancel their plan', async () => {
    mockGetSubscription.mockResolvedValue(subscriptionRes({ memberPlan: 'PREMIUM_MONTHLY' }));
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Premium plan/)).toBeInTheDocument());

    expect(screen.getByText(/legacy plan/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch plan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel subscription' })).toBeEnabled();
  });

  // Entitlement is ACTIVE | PAST_DUE — a retrying renewal keeps access.
  it('keeps a PAST_DUE subscriber as a member and warns them', async () => {
    mockGetSubscription.mockResolvedValue(subscriptionRes({ status: 'PAST_DUE' }));
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Basic plan/)).toBeInTheDocument());

    expect(screen.getByText('Past Due')).toBeInTheDocument();
    expect(screen.getByText(/couldn't process your last payment/)).toBeInTheDocument();
    // Plan changes are unavailable until billing recovers.
    expect(screen.getByRole('button', { name: 'Switch plan' })).toBeDisabled();
  });

  it('treats UNPAID as no longer entitled', async () => {
    mockGetSubscription.mockResolvedValue(subscriptionRes({ status: 'UNPAID' }));
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    // Module is hidden — no benefits left, so the upgrade banner takes over.
    await waitFor(() => expect(screen.queryByText(/Basic plan/)).not.toBeInTheDocument());
  });
});

describe('BillingTab — payment method (backend change C6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSubscription.mockResolvedValue(subscriptionRes());
    mockGetCredits.mockResolvedValue({
      data: { data: { recurringCreditBalance: 10, permanentCreditBalance: 5 } },
    });
    mockGetCreditUsage.mockResolvedValue({ data: { data: { content: [], pageMeta: { last: true } } } });
    mockGetInvoices.mockResolvedValue({ data: { data: { content: [] } } });
  });

  const pmRes = (over: Record<string, unknown> = {}) => ({
    data: {
      data: { brand: 'visa', last4: '4242', expMonth: 11, expYear: 2026, status: 'VALID', ...over },
    },
  });

  it('shows the saved card for a member with a valid one', async () => {
    mockGetPaymentMethod.mockResolvedValue(pmRes());
    await renderBilling();

    expect(await screen.findByText('Visa ending in 4242')).toBeInTheDocument();
    expect(screen.getByText('Expires 11/2026')).toBeInTheDocument();
    // VALID means no renewal risk — no warning banner.
    expect(screen.queryByText(/expires before your next renewal/)).not.toBeInTheDocument();
    expect(screen.queryByText(/has expired/)).not.toBeInTheDocument();
  });

  // `status` is the backend's verdict against the NEXT renewal date, not
  // "today" — the frontend must not recompute this from expMonth/expYear.
  it('warns when the card expires before the next renewal', async () => {
    mockGetPaymentMethod.mockResolvedValue(pmRes({ status: 'EXPIRES_BEFORE_RENEWAL' }));
    await renderBilling();

    expect(await screen.findByText(/expires before your next renewal/)).toBeInTheDocument();
  });

  it('warns when the card has already expired', async () => {
    mockGetPaymentMethod.mockResolvedValue(pmRes({ status: 'EXPIRED' }));
    await renderBilling();

    expect(await screen.findByText(/This card has expired/)).toBeInTheDocument();
  });

  // NONE means no saved card — not an error, and not the same UI as VALID.
  it('offers to add a card when none is on file', async () => {
    mockGetPaymentMethod.mockResolvedValue(
      pmRes({ brand: null, last4: null, expMonth: null, expYear: null, status: 'NONE' }),
    );
    await renderBilling();

    expect(await screen.findByText('No payment method on file.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add payment method' })).toBeInTheDocument();
  });

  // Free / never-subscribed users get no card section at all, and — since this
  // hits Stripe directly — no wasted call either.
  it('hides the section entirely for a free user and never calls the API', async () => {
    mockGetSubscription.mockRejectedValue({
      response: { status: 400, data: { message: 'Subscription not found' } },
    });
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Upgrade to Member/)).toBeInTheDocument());

    expect(screen.queryByText('Payment method')).not.toBeInTheDocument();
    expect(mockGetPaymentMethod).not.toHaveBeenCalled();
  });

  it('redirects to the Stripe setup session when updating the card', async () => {
    const user = userEvent.setup();
    mockGetPaymentMethod.mockResolvedValue(pmRes());
    mockCreatePaymentMethodSetupSession.mockResolvedValue({
      data: { data: { url: 'https://checkout.stripe.com/setup-session-123' } },
    });
    await renderBilling();

    await user.click(await screen.findByRole('button', { name: 'Update card' }));

    await waitFor(() => expect(assignedHref).toBe('https://checkout.stripe.com/setup-session-123'));
  });

  it("surfaces a failure to start the card update without navigating anywhere", async () => {
    const user = userEvent.setup();
    mockGetPaymentMethod.mockResolvedValue(pmRes());
    mockCreatePaymentMethodSetupSession.mockRejectedValue({
      response: { data: { message: 'Something went wrong' } },
    });
    await renderBilling();

    await user.click(await screen.findByRole('button', { name: 'Update card' }));

    await waitFor(() => expect(screen.getByText('Something went wrong')).toBeInTheDocument());
    expect(assignedHref).toBeNull();
  });

  describe('PAST_DUE recovery entry points', () => {
    beforeEach(() => {
      mockGetSubscription.mockResolvedValue(subscriptionRes({ status: 'PAST_DUE' }));
      mockGetPaymentMethod.mockResolvedValue(pmRes({ status: 'EXPIRED' }));
    });

    it('offers both update and retry from the past-due banner', async () => {
      await renderBilling();

      expect(screen.getByRole('button', { name: 'Update payment method' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry payment' })).toBeInTheDocument();
    });

    it('retries payment and reports success once the subscription settles', async () => {
      const user = userEvent.setup();
      let paid = false;
      mockRetryPayment.mockImplementation(async () => {
        paid = true;
        return { data: { data: { outcome: 'PAID', hostedInvoiceUrl: null } } };
      });
      mockGetSubscription.mockImplementation(async () =>
        subscriptionRes({ status: paid ? 'ACTIVE' : 'PAST_DUE' }),
      );
      await renderBilling();

      await user.click(screen.getByRole('button', { name: 'Retry payment' }));

      expect(await screen.findByText(/Payment succeeded/)).toBeInTheDocument();
    });

    it('sends the user to complete 3DS when the retry requires action', async () => {
      const user = userEvent.setup();
      mockRetryPayment.mockResolvedValue({
        data: { data: { outcome: 'REQUIRES_ACTION', hostedInvoiceUrl: 'https://invoice.stripe.com/i/abc' } },
      });
      await renderBilling();

      await user.click(screen.getByRole('button', { name: 'Retry payment' }));

      await waitFor(() => expect(assignedHref).toBe('https://invoice.stripe.com/i/abc'));
    });

    it('tells the user to replace a card that was declined on retry', async () => {
      const user = userEvent.setup();
      mockRetryPayment.mockResolvedValue({
        data: { data: { outcome: 'DECLINED', hostedInvoiceUrl: null } },
      });
      await renderBilling();

      await user.click(screen.getByRole('button', { name: 'Retry payment' }));

      expect(await screen.findByText(/declined/)).toBeInTheDocument();
    });
  });

  // Setup-session has no subscription-side field to poll — a changed `last4`
  // is the only signal the new card actually became the default.
  //
  // Split into two: with every mock resolving instantly, the confirming banner
  // and the settled result can both land within the same microtask flush, so
  // asserting "banner shown, THEN new card, THEN banner gone" in one test is
  // racing the poll rather than testing it. Pin the transient state with a
  // deliberately-unresolved fetch, and the end state separately.
  it('shows a confirming banner while the card-update poll is in flight', async () => {
    mockGetPaymentMethod.mockImplementation(() => new Promise(() => {})); // never resolves
    mockGetSubscription.mockResolvedValue(subscriptionRes());
    sessionStorage.setItem(
      'pendingCheckout',
      JSON.stringify({ kind: 'card', last4Before: '4242', ts: Date.now() }),
    );

    render(
      <MemoryRouter initialEntries={['/settings?tab=billing']}>
        <BillingTab />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Confirming your new card…')).toBeInTheDocument();
  });

  it('shows the new card and clears the banner once the poll resolves', async () => {
    mockGetPaymentMethod.mockResolvedValue(pmRes({ last4: '9999' }));
    // The setup-session return also triggers an automatic retry-payment on the
    // backend, which can move the subscription — refreshBilling() re-reads it.
    mockGetSubscription.mockResolvedValue(subscriptionRes());
    sessionStorage.setItem(
      'pendingCheckout',
      JSON.stringify({ kind: 'card', last4Before: '4242', ts: Date.now() }),
    );

    render(
      <MemoryRouter initialEntries={['/settings?tab=billing']}>
        <BillingTab />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Visa ending in 9999')).toBeInTheDocument());
    expect(screen.queryByText('Confirming your new card…')).not.toBeInTheDocument();
  });
});
