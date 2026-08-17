import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────
const mockGetSubscription = vi.fn();
const mockGetCredits = vi.fn();
const mockChangeTier = vi.fn();
const mockCreateSubscription = vi.fn();

vi.mock('@/services', () => ({
  PaymentService: {
    getSubscription: (...args: unknown[]) => mockGetSubscription(...args),
    getCredits: (...args: unknown[]) => mockGetCredits(...args),
    createSubscription: (...args: unknown[]) => mockCreateSubscription(...args),
    changeTier: (...args: unknown[]) => mockChangeTier(...args),
    cancelSubscription: vi.fn(),
    createOneTimeSession: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
  // useUserPlan imports isStaffRole from AuthContext; the mock must provide it
  // or the hook throws before rendering the plan.
  isStaffRole: () => false,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('posthog-js/react', () => ({
  usePostHog: () => null,
}));

import { UserPlanProvider, useUserPlan, type PlanType } from '@/hooks/useUserPlan';

// Probe exposing changePlan so the create-vs-change-tier routing (and the
// payment URL each returns) can be asserted.
let changePlanFn: ((plan: PlanType) => Promise<{
  success: boolean;
  url?: string | null;
  message?: string;
}>) | null = null;

function ChangePlanProbe() {
  const { changePlan, isLoading, planData } = useUserPlan();
  changePlanFn = changePlan;
  if (isLoading) return <div>loading</div>;
  return <span data-testid="plan">{planData.currentPlan}</span>;
}

// Probe component exposing the resolved plan state.
function PlanProbe() {
  const { planData, isPremium, isFree, isLoading } = useUserPlan();
  if (isLoading) return <div>loading</div>;
  return (
    <div>
      <span data-testid="plan">{planData.currentPlan}</span>
      <span data-testid="premium">{String(isPremium)}</span>
      <span data-testid="free">{String(isFree)}</span>
    </div>
  );
}

const renderPlan = () =>
  render(
    <UserPlanProvider>
      <PlanProbe />
    </UserPlanProvider>,
  );

const okCredits = {
  data: { data: { recurringCreditBalance: 10, permanentCreditBalance: 5 } },
};

describe('useUserPlan tier mapping (BASIC | ADVANCED | FLAGSHIP)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCredits.mockResolvedValue(okCredits);
  });

  it('maps a wrapped ADVANCED_MONTHLY subscription to Advanced / premium', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { data: { memberPlan: 'ADVANCED_MONTHLY', status: 'ACTIVE' } },
    });
    renderPlan();
    await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent('Advanced'));
    expect(screen.getByTestId('premium')).toHaveTextContent('true');
    expect(screen.getByTestId('free')).toHaveTextContent('false');
  });

  it('maps an unwrapped (no envelope) ADVANCED_MONTHLY response to Advanced / premium', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { memberPlan: 'ADVANCED_MONTHLY', status: 'ACTIVE' },
    });
    renderPlan();
    await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent('Advanced'));
    expect(screen.getByTestId('premium')).toHaveTextContent('true');
  });

  it('maps a split tier field ("ADVANCED") to Advanced / premium', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { data: { tier: 'ADVANCED', status: 'ACTIVE' } },
    });
    renderPlan();
    await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent('Advanced'));
    expect(screen.getByTestId('premium')).toHaveTextContent('true');
  });

  it('maps a combined value under `tier` ("ADVANCED_MONTHLY", no memberPlan) to Advanced', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { data: { tier: 'ADVANCED_MONTHLY', status: 'ACTIVE' } },
    });
    renderPlan();
    await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent('Advanced'));
    expect(screen.getByTestId('premium')).toHaveTextContent('true');
  });

  it('maps a combined value under `plan` ("FLAGSHIP_MONTHLY") to Flagship', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { data: { plan: 'FLAGSHIP_MONTHLY', status: 'ACTIVE' } },
    });
    renderPlan();
    await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent('Flagship'));
    expect(screen.getByTestId('premium')).toHaveTextContent('true');
  });

  it('maps FLAGSHIP_MONTHLY to Flagship / premium', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { data: { memberPlan: 'FLAGSHIP_MONTHLY', status: 'ACTIVE' } },
    });
    renderPlan();
    await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent('Flagship'));
    expect(screen.getByTestId('premium')).toHaveTextContent('true');
  });

  it('maps BASIC_MONTHLY to Basic — paid but NOT premium', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { data: { memberPlan: 'BASIC_MONTHLY', status: 'ACTIVE' } },
    });
    renderPlan();
    await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent('Basic'));
    expect(screen.getByTestId('premium')).toHaveTextContent('false');
    expect(screen.getByTestId('free')).toHaveTextContent('false');
  });

  it('treats a canceled ADVANCED subscription as Free', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { data: { memberPlan: 'ADVANCED_MONTHLY', status: 'CANCELED' } },
    });
    renderPlan();
    await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent('Free'));
    expect(screen.getByTestId('premium')).toHaveTextContent('false');
  });

  it('treats a missing subscription (404) as Free', async () => {
    mockGetSubscription.mockRejectedValue({ response: { status: 404 } });
    renderPlan();
    await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent('Free'));
    expect(screen.getByTestId('free')).toHaveTextContent('true');
  });

  it('treats a legacy PREMIUM subscription as Free (plan no longer exists)', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { data: { memberPlan: 'PREMIUM_QUARTERLY', tier: 'PREMIUM', status: 'ACTIVE' } },
    });
    renderPlan();
    await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent('Free'));
    expect(screen.getByTestId('premium')).toHaveTextContent('false');
    expect(screen.getByTestId('free')).toHaveTextContent('true');
  });

  it('treats a legacy STARTER subscription as Free (plan no longer exists)', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { data: { memberPlan: 'STARTER_MONTHLY', status: 'ACTIVE' } },
    });
    renderPlan();
    await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent('Free'));
    expect(screen.getByTestId('premium')).toHaveTextContent('false');
    expect(screen.getByTestId('free')).toHaveTextContent('true');
  });

  it('treats any unknown tier value as Free', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { data: { memberPlan: 'ENTERPRISE_MONTHLY', tier: 'ENTERPRISE', status: 'ACTIVE' } },
    });
    renderPlan();
    await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent('Free'));
    expect(screen.getByTestId('premium')).toHaveTextContent('false');
  });
});

describe('useUserPlan.changePlan — payment URL passthrough', () => {
  const renderChangePlan = async (expectedPlan: string) => {
    changePlanFn = null;
    render(
      <UserPlanProvider>
        <ChangePlanProbe />
      </UserPlanProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('plan')).toHaveTextContent(expectedPlan));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCredits.mockResolvedValue(okCredits);
  });

  // Members go through /subscriptions/tier, which can also return a Stripe URL.
  // Dropping it left useUpgradePrompt with nothing to redirect to.
  it('returns the URL from a tier change so the caller can redirect', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { data: { memberPlan: 'BASIC_MONTHLY', status: 'ACTIVE' } },
    });
    mockChangeTier.mockResolvedValue({ data: { data: { url: 'https://checkout/tier' } } });
    await renderChangePlan('Basic');

    const res = await changePlanFn!('Flagship');
    expect(mockChangeTier).toHaveBeenCalledWith('flagship');
    expect(res).toMatchObject({ success: true, url: 'https://checkout/tier' });
  });

  it('returns url:null when the tier change applied without payment', async () => {
    mockGetSubscription.mockResolvedValue({
      data: { data: { memberPlan: 'ADVANCED_MONTHLY', status: 'ACTIVE' } },
    });
    mockChangeTier.mockResolvedValue({ data: { data: {} } });
    await renderChangePlan('Advanced');

    const res = await changePlanFn!('Basic');
    expect(res).toMatchObject({ success: true, url: null });
  });

  it('still returns the create-subscription URL for non-members', async () => {
    mockGetSubscription.mockRejectedValue({ response: { status: 404 } });
    mockCreateSubscription.mockResolvedValue({ data: { data: { url: 'https://checkout/new' } } });
    await renderChangePlan('Free');

    const res = await changePlanFn!('Advanced');
    expect(mockCreateSubscription).toHaveBeenCalledWith('advanced', 'monthly');
    expect(res).toMatchObject({ success: true, url: 'https://checkout/new' });
  });
});
