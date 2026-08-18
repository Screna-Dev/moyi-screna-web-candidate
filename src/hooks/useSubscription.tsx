import { useCallback, useEffect, useRef, useState } from 'react';
import { PaymentService } from '@/services';
import { useToast } from '@/hooks/use-toast';
import { useAuth, isStaffRole } from '@/contexts/AuthContext';

export type Tier = 'basic' | 'advanced' | 'flagship';
export type BillingCycle = 'monthly' | 'quarterly' | 'annual';
export type SubscriptionStatus =
  | 'incomplete'   // created in Stripe, first payment not succeeded
  | 'active'       // paying customer, current period
  | 'past_due'     // payment failed; Stripe retrying (grace)
  | 'unpaid'       // retries exhausted
  | 'canceled';    // ended

export interface SubscriptionData {
  id: string;
  // null when the row is on a retired tier (STARTER / PREMIUM). The record still
  // exists and can be canceled — it just has no current tier to render.
  plan: Tier | null;
  // Raw backend `memberPlan`, kept so legacy rows can still be named in the UI.
  rawPlan: string | null;
  isLegacyPlan: boolean;
  status: SubscriptionStatus;
  billingCycle: BillingCycle | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  // First-ever subscription date; not refreshed on re-subscribe. Anchors the
  // 3-day refund window. Null on older rows.
  firstSubAt: string | null;
  // Scheduled downgrade (tier or cycle). Backend field: `downgradePendingPlan`.
  // Stored here as separate normalized fields for the UI.
  downgradePendingTier?: Tier | null;
  downgradePendingCycle?: BillingCycle | null;
  nextBillingAmount?: number | null;
  currency?: string;
}

// Backend entitlement rule (EntitlementService): paid features stay on while
// Stripe retries a failed renewal, so PAST_DUE still counts as entitled.
export const ENTITLED_STATUSES: ReadonlySet<SubscriptionStatus> = new Set<SubscriptionStatus>([
  'active',
  'past_due',
]);

export const hasEntitlement = (sub: SubscriptionData | null): boolean =>
  sub !== null && ENTITLED_STATUSES.has(sub.status);

export interface CreditsData {
  recurringCreditBalance: number;
  permanentCreditBalance: number;
  totalBalance: number;
  monthlyAllowance: number;
  resetDate: string | null;
}

// Result of a plan mutation.
//
// Every write except cancel-pending-downgrade only *tells Stripe*; our own row
// is updated later by webhook → SQS → worker. So a 200 means "accepted", not
// "applied" — and for an upgrade it doesn't even mean the card cleared (the
// backend uses PENDING_IF_INCOMPLETE). Each action therefore polls GET until the
// expected state shows up:
//   settled: true  → confirmed applied
//   settled: false → still pending when we gave up waiting; show "processing",
//                    never "failed" — the event is most likely still queued.
export interface ChangeResult {
  ok: boolean;
  settled: boolean;
  url: string | null;
}

// Cancel has two backend paths that return byte-identical responses, so the only
// way to know which ran is to poll and look at the resulting state.
export interface CancelResult {
  ok: boolean;
  settled: boolean;
  // true  → immediate cancel + full refund (inside the one-time 3-day window)
  // false → scheduled: access continues to the end of the period
  refunded: boolean;
}

interface UseSubscriptionResult {
  subscription: SubscriptionData | null;
  credits: CreditsData;
  isLoading: boolean;
  isActing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  subscribe: (plan: Tier, billingCycle: BillingCycle) => Promise<string | null>;
  changeTier: (plan: Tier) => Promise<ChangeResult>;
  changeBillingCycle: (billingCycle: BillingCycle) => Promise<ChangeResult>;
  cancelPendingDowngrade: () => Promise<boolean>;
  cancel: () => Promise<CancelResult>;
  resume: () => Promise<ChangeResult>;
  // Poll GET until `predicate` holds. Exposed for the Stripe Checkout return,
  // where the caller waits for a brand-new subscription to appear.
  waitForSubscription: (
    predicate: (sub: SubscriptionData | null) => boolean,
    opts?: { timeoutMs?: number; intervalMs?: number },
  ) => Promise<SubscriptionData | null>;
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

// API may return enum values as UPPERCASE strings (e.g. "ADVANCED", "MONTHLY", "ACTIVE")
// — normalize to our lowercase internal types.
const toLower = <T extends string>(v: unknown): T | null =>
  typeof v === 'string' ? (v.toLowerCase() as T) : null;

// Like toLower, but only accepts values from the allowed set. Anything else
// (e.g. a legacy "PREMIUM"/"STARTER" row) returns null so the caller treats
// the subscription as Free instead of surfacing a plan that no longer exists.
const toKnown = <T extends string>(v: unknown, allowed: ReadonlySet<string>): T | null => {
  const low = toLower<T>(v);
  return low !== null && allowed.has(low) ? low : null;
};

interface RawSubscription {
  id?: string;
  // Combined tier+cycle field returned by the backend, e.g. "ADVANCED_MONTHLY".
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
  firstSubAt?: string | null;
  updatedAt?: string | null;
}

const TIER_VALUES: ReadonlySet<string> = new Set(['basic', 'advanced', 'flagship']);
const CYCLE_VALUES: ReadonlySet<string> = new Set(['monthly', 'quarterly', 'annual']);
// Retired tiers that only exist on pre-migration rows. The backend rejects every
// tier/billing-cycle change on these, so the UI offers cancel only.
const LEGACY_TIER_VALUES: ReadonlySet<string> = new Set(['starter', 'premium']);

// Parse a combined "TIER_CYCLE" string (e.g. "ADVANCED_MONTHLY") into parts.
// Also tolerates split-only values like just "ADVANCED" or "MONTHLY".
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

  // Parse the combined memberPlan first, then fall back to split fields —
  // which may themselves hold a combined "TIER_CYCLE" value, so run them
  // through the same parser.
  const fromCombined = parseMemberPlan(raw.memberPlan);
  const rawTier = raw.tier ?? raw.plan;
  const fromSplit = parseMemberPlan(typeof rawTier === 'string' ? rawTier : null);
  const plan: Tier | null = fromCombined.tier ?? fromSplit.tier;
  const billingCycle: BillingCycle | null =
    fromCombined.cycle ?? fromSplit.cycle ?? toKnown<BillingCycle>(raw.billingCycle, CYCLE_VALUES);
  const status = toLower<SubscriptionStatus>(raw.status);

  // `status` is the only field that must be present — it's what makes this a
  // record rather than the 400 "Subscription not found" that means Free.
  //
  // A retired tier (STARTER / PREMIUM) leaves `plan` null. It used to make this
  // return null too, which hid the entire subscription — including the cancel
  // button, the one action those users are still allowed. Keep the record and
  // flag it instead.
  if (!status) return null;

  const rawPlanText = [raw.memberPlan, raw.tier, raw.plan]
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase();
  const isLegacyPlan =
    plan === null && [...LEGACY_TIER_VALUES].some(t => rawPlanText.includes(t));

  // Pending downgrade — also a combined value per backend convention.
  const pending = parseMemberPlan(raw.downgradePendingPlan);
  const pendingTierExplicit = toKnown<Tier>(raw.downgradePendingTier, TIER_VALUES);
  const pendingCycleExplicit = toKnown<BillingCycle>(
    raw.downgradePendingCycle ?? raw.downgradePendingBillingCycle,
    CYCLE_VALUES,
  );

  return {
    // Backend doesn't include an id. Synthesize a stable key for React.
    id: raw.id ?? `${plan ?? 'legacy'}_${billingCycle ?? 'unknown'}`,
    plan,
    rawPlan: raw.memberPlan ?? (typeof rawTier === 'string' ? rawTier : null),
    isLegacyPlan,
    status,
    billingCycle,
    currentPeriodStart: raw.currentPeriodStart ?? null,
    currentPeriodEnd: raw.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: Boolean(raw.cancelAtPeriodEnd),
    canceledAt: raw.canceledAt ?? null,
    firstSubAt: raw.firstSubAt ?? null,
    downgradePendingTier: pendingTierExplicit ?? pending.tier,
    downgradePendingCycle: pendingCycleExplicit ?? pending.cycle,
    nextBillingAmount: raw.nextBillingAmount ?? null,
    currency: raw.currency ?? 'usd',
  };
};

// ── Polling ─────────────────────────────────────────────────────────────────
// Writes land asynchronously (Stripe → EventBridge → SQS → worker), so every
// action confirms by re-reading GET until the expected state appears.
const POLL_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 2_000;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// GET /payments/subscriptions answers 400 "Subscription not found" for users who
// never subscribed. That is the Free state, not a failure.
const isNotFoundError = (e: unknown): boolean => {
  const err = e as { response?: { status?: number; data?: { message?: string } } };
  const status = err?.response?.status;
  return status === 404 || (status === 400 && /not found/i.test(err?.response?.data?.message ?? ''));
};

export function useSubscription(): UseSubscriptionResult {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const { toast } = useToast();

  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [credits, setCredits] = useState<CreditsData>(defaultCredits);
  // A poll can run for up to 30s; if the consumer unmounts before then we must
  // stop, or it keeps hammering the API and writing to dead state.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    // Staff (admin/ops) have no candidate subscription/credits — skip the calls.
    if (!isAuthenticated || isStaffRole(user?.roles, user?.role)) {
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
      } else if (isNotFoundError(subRes.reason)) {
        setSubscription(null);
      } else {
        setError(errMsg(subRes.reason, 'Failed to load subscription'));
      }

      if (credRes.status === 'fulfilled') {
        const c = unwrap(credRes.value) as Partial<CreditsData> | null;
        if (c) {
          // Recurring can be negative (post-paid interview deductions), so this
          // sum is allowed to go below zero — don't clamp it here.
          const recurring = c.recurringCreditBalance ?? 0;
          const permanent = c.permanentCreditBalance ?? 0;
          setCredits({
            recurringCreditBalance: recurring,
            permanentCreditBalance: permanent,
            totalBalance: c.totalBalance ?? recurring + permanent,
            // Not returned by GET /payments/credits — kept for callers that
            // still read them, always falsy until the API exposes them.
            monthlyAllowance: c.monthlyAllowance ?? 0,
            resetDate: c.resetDate ?? null,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.roles, user?.role]);

  useEffect(() => {
    if (isAuthLoading) return;
    refresh();
  }, [isAuthLoading, isAuthenticated, refresh]);

  // Re-read GET until `predicate` holds, publishing each read so the UI updates
  // the moment the webhook lands. Returns the matching subscription, or null on
  // timeout — the caller must treat that as "still processing", not "failed".
  const waitForSubscription = useCallback(
    async (
      predicate: (sub: SubscriptionData | null) => boolean,
      opts?: { timeoutMs?: number; intervalMs?: number },
    ): Promise<SubscriptionData | null> => {
      const timeoutMs = opts?.timeoutMs ?? POLL_TIMEOUT_MS;
      const intervalMs = opts?.intervalMs ?? POLL_INTERVAL_MS;
      const deadline = Date.now() + timeoutMs;

      for (;;) {
        if (!mountedRef.current) return null;
        let current: SubscriptionData | null = null;
        try {
          const res = await PaymentService.getSubscription();
          current = normalizeSubscription(unwrap(res) as RawSubscription | null);
        } catch (e) {
          if (!isNotFoundError(e)) throw e;
          current = null;
        }
        if (!mountedRef.current) return null;
        setSubscription(current);
        if (predicate(current)) return current;
        if (Date.now() + intervalMs >= deadline) return null;
        await sleep(intervalMs);
      }
    },
    [],
  );

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

  // A tier change is accepted synchronously but applied asynchronously, and an
  // upgrade can still fail at the card (backend uses PENDING_IF_INCOMPLETE and
  // returns 200 either way). So don't trust the 200 — poll for the real state:
  //   upgrade   → `plan` becomes the target
  //   downgrade → `downgradePendingTier` becomes the target
  // Whichever direction, one of the two ends the wait, so we accept either.
  // (`url` is always null on this endpoint today; kept for forward safety.)
  const changeTierAction = useCallback(
    async (plan: Tier): Promise<ChangeResult> => {
      setIsActing(true);
      try {
        const res = await PaymentService.changeTier(plan);
        const url = (unwrap(res) as { url?: string } | null)?.url ?? null;
        if (url) return { ok: true, settled: false, url };
        const settled = await waitForSubscription(
          s => s?.plan === plan || s?.downgradePendingTier === plan,
        );
        return { ok: true, settled: settled !== null, url: null };
      } catch (e) {
        toast({
          title: 'Plan change failed',
          description: errMsg(e, 'Unable to change tier'),
          variant: 'destructive',
        });
        return { ok: false, settled: false, url: null };
      } finally {
        setIsActing(false);
      }
    },
    [toast, waitForSubscription],
  );

  // Same async contract as changeTier.
  const changeBillingCycleAction = useCallback(
    async (billingCycle: BillingCycle): Promise<ChangeResult> => {
      setIsActing(true);
      try {
        const res = await PaymentService.changeBillingCycle(billingCycle);
        const url = (unwrap(res) as { url?: string } | null)?.url ?? null;
        if (url) return { ok: true, settled: false, url };
        const settled = await waitForSubscription(
          s => s?.billingCycle === billingCycle || s?.downgradePendingCycle === billingCycle,
        );
        return { ok: true, settled: settled !== null, url: null };
      } catch (e) {
        toast({
          title: 'Billing cycle change failed',
          description: errMsg(e, 'Unable to change billing cycle'),
          variant: 'destructive',
        });
        return { ok: false, settled: false, url: null };
      } finally {
        setIsActing(false);
      }
    },
    [toast, waitForSubscription],
  );

  // The one write the backend commits before responding — a plain refresh is
  // enough, no polling.
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

  // Two backend paths, identical responses:
  //   • inside the one-time 3-day window → refund + immediate end (status CANCELED)
  //   • otherwise                        → cancelAtPeriodEnd = true
  // Poll until either shows up and report which happened, so the UI can tell the
  // user what actually occurred rather than guessing from a date.
  const cancelAction = useCallback(async (): Promise<CancelResult> => {
    setIsActing(true);
    try {
      await PaymentService.cancelSubscription();
      // A refunded cancellation ends the subscription outright (status CANCELED,
      // the row still exists); the scheduled path leaves it ACTIVE with the flag.
      const settled = await waitForSubscription(
        s => s?.status === 'canceled' || s?.cancelAtPeriodEnd === true,
      );
      return { ok: true, settled: settled !== null, refunded: settled?.status === 'canceled' };
    } catch (e) {
      toast({
        title: 'Cancellation failed',
        description: errMsg(e, 'Unable to cancel subscription'),
        variant: 'destructive',
      });
      return { ok: false, settled: false, refunded: false };
    } finally {
      setIsActing(false);
    }
  }, [toast, waitForSubscription]);

  const resumeAction = useCallback(async (): Promise<ChangeResult> => {
    setIsActing(true);
    try {
      await PaymentService.resumeSubscription();
      const settled = await waitForSubscription(s => s !== null && !s.cancelAtPeriodEnd);
      return { ok: true, settled: settled !== null, url: null };
    } catch (e) {
      toast({
        title: 'Resume failed',
        description: errMsg(e, 'Unable to resume subscription'),
        variant: 'destructive',
      });
      return { ok: false, settled: false, url: null };
    } finally {
      setIsActing(false);
    }
  }, [toast, waitForSubscription]);

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
    waitForSubscription,
  };
}

export default useSubscription;
