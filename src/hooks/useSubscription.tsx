import { useCallback, useEffect, useState } from 'react';
import { PaymentService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type Tier = 'starter' | 'premium';
export type BillingCycle = 'monthly' | 'quarterly' | 'annual';
export type SubscriptionStatus =
  | 'incomplete'   // created in Stripe, first payment not succeeded
  | 'active'       // paying customer, current period
  | 'past_due'     // payment failed; Stripe retrying (grace)
  | 'unpaid'       // retries exhausted
  | 'canceled';    // ended

export interface SubscriptionData {
  id: string;
  plan: Tier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  // Scheduled downgrade (tier or cycle). Backend field: `downgradePendingPlan`.
  // Stored here as separate normalized fields for the UI.
  downgradePendingTier?: Tier | null;
  downgradePendingCycle?: BillingCycle | null;
  nextBillingAmount?: number | null;
  currency?: string;
}

export interface CreditsData {
  recurringCreditBalance: number;
  permanentCreditBalance: number;
  totalBalance: number;
  monthlyAllowance: number;
  resetDate: string | null;
}

interface UseSubscriptionResult {
  subscription: SubscriptionData | null;
  credits: CreditsData;
  isLoading: boolean;
  isActing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  subscribe: (plan: Tier, billingCycle: BillingCycle) => Promise<string | null>;
  changeTier: (plan: Tier) => Promise<boolean>;
  changeBillingCycle: (billingCycle: BillingCycle) => Promise<boolean>;
  cancelPendingDowngrade: () => Promise<boolean>;
  cancel: () => Promise<boolean>;
  resume: () => Promise<boolean>;
}

const defaultCredits: CreditsData = {
  recurringCreditBalance: 0,
  permanentCreditBalance: 0,
  totalBalance: 0,
  monthlyAllowance: 0,
  resetDate: null,
};

const unwrap = (res: { data?: { data?: unknown } } | undefined) => {
  return (res?.data as { data?: unknown })?.data ?? res?.data ?? null;
};

const errMsg = (e: unknown, fallback: string): string => {
  const axiosErr = e as { response?: { data?: { message?: string } }; message?: string };
  return axiosErr?.response?.data?.message || axiosErr?.message || fallback;
};

// API may return enum values as UPPERCASE strings (e.g. "STARTER", "MONTHLY", "ACTIVE")
// — normalize to our lowercase internal types.
const toLower = <T extends string>(v: unknown): T | null =>
  typeof v === 'string' ? (v.toLowerCase() as T) : null;

interface RawSubscription {
  id?: string;
  // Combined tier+cycle field returned by the backend, e.g. "STARTER_QUARTERLY".
  memberPlan?: string;
  // Optional split fields (kept for forward compatibility).
  tier?: string;
  plan?: string;
  billingCycle?: string;
  status?: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
  // Pending downgrade — either a memberPlan-style combined value or split fields.
  downgradePendingPlan?: string | null;
  downgradePendingTier?: string | null;
  downgradePendingCycle?: string | null;
  downgradePendingBillingCycle?: string | null;
  nextBillingAmount?: number | null;
  currency?: string;
}

const TIER_VALUES: ReadonlySet<string> = new Set(['starter', 'premium']);
const CYCLE_VALUES: ReadonlySet<string> = new Set(['monthly', 'quarterly', 'annual']);

// Parse a combined "TIER_CYCLE" string (e.g. "STARTER_QUARTERLY") into parts.
// Also tolerates split-only values like just "STARTER" or "MONTHLY".
const parseMemberPlan = (
  value: string | null | undefined,
): { tier: Tier | null; cycle: BillingCycle | null } => {
  if (!value) return { tier: null, cycle: null };
  const parts = value.toLowerCase().split('_');
  let tier: Tier | null = null;
  let cycle: BillingCycle | null = null;
  for (const p of parts) {
    if (TIER_VALUES.has(p)) tier = p as Tier;
    else if (CYCLE_VALUES.has(p)) cycle = p as BillingCycle;
  }
  return { tier, cycle };
};

const normalizeSubscription = (raw: RawSubscription | null): SubscriptionData | null => {
  if (!raw) return null;

  // Parse the combined memberPlan first, then fall back to split fields.
  const fromCombined = parseMemberPlan(raw.memberPlan);
  const plan: Tier | null =
    fromCombined.tier ?? toLower<Tier>(raw.tier ?? raw.plan);
  const billingCycle: BillingCycle | null =
    fromCombined.cycle ?? toLower<BillingCycle>(raw.billingCycle);
  const status = toLower<SubscriptionStatus>(raw.status);

  // Need at least tier + cycle + status to render a meaningful subscription.
  if (!plan || !billingCycle || !status) return null;

  // Pending downgrade — also a combined value per backend convention.
  const pending = parseMemberPlan(raw.downgradePendingPlan);
  const pendingTierExplicit = toLower<Tier>(raw.downgradePendingTier);
  const pendingCycleExplicit = toLower<BillingCycle>(
    raw.downgradePendingCycle ?? raw.downgradePendingBillingCycle,
  );

  return {
    // Backend doesn't include an id. Synthesize a stable key for React.
    id: raw.id ?? `${plan}_${billingCycle}`,
    plan,
    status,
    billingCycle,
    currentPeriodStart: raw.currentPeriodStart ?? null,
    currentPeriodEnd: raw.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: Boolean(raw.cancelAtPeriodEnd),
    canceledAt: raw.canceledAt ?? null,
    downgradePendingTier: pendingTierExplicit ?? pending.tier,
    downgradePendingCycle: pendingCycleExplicit ?? pending.cycle,
    nextBillingAmount: raw.nextBillingAmount ?? null,
    currency: raw.currency ?? 'usd',
  };
};

export function useSubscription(): UseSubscriptionResult {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [credits, setCredits] = useState<CreditsData>(defaultCredits);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setSubscription(null);
      setCredits(defaultCredits);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [subRes, credRes] = await Promise.allSettled([
        PaymentService.getSubscription(),
        PaymentService.getCredits(),
      ]);

      if (subRes.status === 'fulfilled') {
        const raw = unwrap(subRes.value) as RawSubscription | null;
        setSubscription(normalizeSubscription(raw));
      } else {
        // Backend returns 400/404 with message "Subscription not found" for
        // non-members. Treat both as a valid Free state, not an error.
        const reason = subRes.reason as {
          response?: { status?: number; data?: { message?: string; errorCode?: string } };
        };
        const httpStatus = reason?.response?.status;
        const body = reason?.response?.data;
        const isNotFound =
          httpStatus === 404 ||
          (httpStatus === 400 && /not found/i.test(body?.message ?? ''));
        if (isNotFound) {
          setSubscription(null);
        } else {
          setError(errMsg(subRes.reason, 'Failed to load subscription'));
        }
      }

      if (credRes.status === 'fulfilled') {
        const c = unwrap(credRes.value) as Partial<CreditsData> | null;
        if (c) {
          setCredits({
            recurringCreditBalance: c.recurringCreditBalance ?? 0,
            permanentCreditBalance: c.permanentCreditBalance ?? 0,
            totalBalance:
              c.totalBalance ??
              (c.recurringCreditBalance ?? 0) + (c.permanentCreditBalance ?? 0),
            monthlyAllowance: c.monthlyAllowance ?? 0,
            resetDate: c.resetDate ?? null,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthLoading) return;
    refresh();
  }, [isAuthLoading, isAuthenticated, refresh]);

  const subscribe = useCallback(
    async (plan: Tier, billingCycle: BillingCycle): Promise<string | null> => {
      setIsActing(true);
      try {
        const res = await PaymentService.createSubscription(plan, billingCycle);
        const url = (unwrap(res) as { url?: string } | null)?.url;
        if (url) return url;
        // If no URL returned, treat as success (e.g. with saved payment method)
        await refresh();
        return null;
      } catch (e) {
        toast({
          title: 'Subscription failed',
          description: errMsg(e, 'Unable to start subscription'),
          variant: 'destructive',
        });
        return null;
      } finally {
        setIsActing(false);
      }
    },
    [toast, refresh],
  );

  const changeTierAction = useCallback(
    async (plan: Tier): Promise<boolean> => {
      setIsActing(true);
      try {
        await PaymentService.changeTier(plan);
        await refresh();
        return true;
      } catch (e) {
        toast({
          title: 'Plan change failed',
          description: errMsg(e, 'Unable to change tier'),
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsActing(false);
      }
    },
    [toast, refresh],
  );

  const changeBillingCycleAction = useCallback(
    async (billingCycle: BillingCycle): Promise<boolean> => {
      setIsActing(true);
      try {
        await PaymentService.changeBillingCycle(billingCycle);
        await refresh();
        return true;
      } catch (e) {
        toast({
          title: 'Billing cycle change failed',
          description: errMsg(e, 'Unable to change billing cycle'),
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsActing(false);
      }
    },
    [toast, refresh],
  );

  const cancelPendingDowngradeAction = useCallback(async (): Promise<boolean> => {
    setIsActing(true);
    try {
      await PaymentService.cancelPendingDowngrade();
      await refresh();
      return true;
    } catch (e) {
      toast({
        title: 'Unable to cancel downgrade',
        description: errMsg(e, 'Please try again'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsActing(false);
    }
  }, [toast, refresh]);

  const cancelAction = useCallback(async (): Promise<boolean> => {
    setIsActing(true);
    try {
      await PaymentService.cancelSubscription();
      await refresh();
      return true;
    } catch (e) {
      toast({
        title: 'Cancellation failed',
        description: errMsg(e, 'Unable to cancel subscription'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsActing(false);
    }
  }, [toast, refresh]);

  const resumeAction = useCallback(async (): Promise<boolean> => {
    setIsActing(true);
    try {
      await PaymentService.resumeSubscription();
      await refresh();
      return true;
    } catch (e) {
      toast({
        title: 'Resume failed',
        description: errMsg(e, 'Unable to resume subscription'),
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsActing(false);
    }
  }, [toast, refresh]);

  return {
    subscription,
    credits,
    isLoading: isAuthLoading || isLoading,
    isActing,
    error,
    refresh,
    subscribe,
    changeTier: changeTierAction,
    changeBillingCycle: changeBillingCycleAction,
    cancelPendingDowngrade: cancelPendingDowngradeAction,
    cancel: cancelAction,
    resume: resumeAction,
  };
}

export default useSubscription;
