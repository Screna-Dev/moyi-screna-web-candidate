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
      subscriptionRes({ memberPlan: 'ADVANCED_QUARTERLY', downgradePendingCycle: 'MONTHLY' }),
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

  // The refund window is anchored on firstSubAt (first ever subscription) and is
  // one-time, so renewals do NOT reopen it. Whether the refund actually applies
  // is only knowable after the call, so the copy stays conditional.
  it('offers the refund path within 3 days of the FIRST subscription', async () => {
    const user = userEvent.setup();
    let canceled = false;
    mockCancelSubscription.mockImplementation(async () => {
      canceled = true;
      return { data: {} };
    });
    mockGetSubscription.mockImplementation(async () =>
      subscriptionRes({
        firstSubAt: daysAgo(1),
        ...(canceled ? { status: 'CANCELED' } : {}),
      }),
    );
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText(/within 3 days of your first subscription/)).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Cancel and refund' }));
    // No reason/comment form, and no promise of a review or an email.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/24 hours/)).not.toBeInTheDocument();
    expect(screen.queryByText(/email/i)).not.toBeInTheDocument();
    // Conditional, because firstSubRefundUsed isn't exposed.
    expect(await screen.findByText(/If this subscription qualifies/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Confirm cancellation/ }));
    await waitFor(() => expect(mockCancelSubscription).toHaveBeenCalled());
    // Polling saw status CANCELED → the refund path ran.
    expect(await screen.findByText(/refund on its way/)).toBeInTheDocument();
  });

  // Renewals must NOT reopen the window: a long-time subscriber who just renewed
  // has a recent currentPeriodStart but an old firstSubAt.
  it('does not offer the refund path to a subscriber who merely renewed', async () => {
    mockGetSubscription.mockResolvedValue(
      subscriptionRes({ firstSubAt: daysAgo(200), currentPeriodStart: daysAgo(1) }),
    );
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Basic plan/)).toBeInTheDocument());

    expect(screen.queryByText(/first subscription/)).not.toBeInTheDocument();
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
      return { data: {} };
    });
    mockGetSubscription.mockImplementation(async () =>
      subscriptionRes({
        firstSubAt: daysAgo(1),
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
