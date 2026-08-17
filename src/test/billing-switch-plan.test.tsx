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

vi.mock('@/services', () => ({
  PaymentService: {
    getSubscription: (...a: unknown[]) => mockGetSubscription(...a),
    getCredits: (...a: unknown[]) => mockGetCredits(...a),
    changeTier: (...a: unknown[]) => mockChangeTier(...a),
    cancelSubscription: (...a: unknown[]) => mockCancelSubscription(...a),
    resumeSubscription: (...a: unknown[]) => mockResumeSubscription(...a),
    changeBillingCycle: vi.fn(),
    cancelPendingDowngrade: vi.fn(),
    createSubscription: vi.fn(),
    getCreditUsage: vi.fn().mockResolvedValue({ data: { data: { content: [] } } }),
    getInvoices: vi.fn().mockResolvedValue({ data: { data: { content: [] } } }),
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

// A tier row in the switch panel. The header text ("Basic plan · $7.99/mo ·
// Monthly") lives in a single span, so an exact match only hits the row label.
const tierRow = (name: string) => screen.getByText(name).parentElement!;

describe('BillingTab — switch plan wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSubscription.mockResolvedValue(subscriptionRes());
    mockGetCredits.mockResolvedValue({
      data: { data: { recurringCreditBalance: 10, permanentCreditBalance: 5 } },
    });
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
    await user.click(screen.getByRole('button', { name: /Confirm change/ }));

    await waitFor(() => expect(mockChangeTier).toHaveBeenCalledWith('flagship'));
    // The hook re-reads the subscription after a successful change.
    expect(mockGetSubscription.mock.calls.length).toBeGreaterThan(1);
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
    await user.click(screen.getByRole('button', { name: /Confirm change/ }));

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
    await user.click(screen.getByRole('button', { name: /Confirm change/ }));

    await waitFor(() => expect(mockGetSubscription.mock.calls.length).toBeGreaterThan(1));
    expect(assignedHref).toBeNull();
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

  it('surfaces a scheduled downgrade returned by the API', async () => {
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
});

describe('BillingTab — cancel / reactivate wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSubscription.mockResolvedValue(subscriptionRes());
    mockGetCredits.mockResolvedValue({
      data: { data: { recurringCreditBalance: 10, permanentCreditBalance: 5 } },
    });
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

  it('reactivates a subscription that is pending cancellation', async () => {
    const user = userEvent.setup();
    mockGetSubscription.mockResolvedValue(subscriptionRes({ cancelAtPeriodEnd: true }));
    render(
      <MemoryRouter>
        <BillingTab />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Cancellation scheduled/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Reactivate/ }));
    await waitFor(() => expect(mockResumeSubscription).toHaveBeenCalled());
  });
});
