import { useCallback, useEffect, useState } from 'react';
import { PaymentService } from '@/services';
import { useAuth, isStaffRole } from '@/contexts/AuthContext';

// Interview quota (backend change C9, 2026-11-02). Candidate-paid partner-role
// AI interviews use one interview each, never credits; employer-sponsored ones
// use nothing. An interview counts once it produces a result; one that never
// really ran (no answer, dropped, failed to start) is given back.
//
// Grants, used plan-first then add-ons, earliest expiry first:
//   FREE_MONTHLY  users without Pro / Pro 90-day; expires on the 1st, 00:00 UTC
//   PRO_PERIOD    each paid billing period (Pro and legacy paid plans)
//   PRO_90_DAY    the one-time Pro 90-day purchase
//   ADD_ON        add-on pack, PRO / PRO_90_DAY only
// Counts and prices live in the backend config; the pricing page states them.

export type QuotaPlan = 'FREE' | 'PRO' | 'PRO_90_DAY';
export type QuotaSource = 'FREE_MONTHLY' | 'PRO_PERIOD' | 'PRO_90_DAY' | 'ADD_ON';
// sessions: how many the grant gave (used included; can change, so don't cache).
// A used-up grant isn't listed.
export type QuotaGrant = { source: QuotaSource; sessions?: number; remaining: number; expiresAt: string | null };
export type InterviewQuota = {
  plan: QuotaPlan;
  available: number;
  grants: QuotaGrant[];
  resetsAt: string | null; // FREE only: when next month's interviews arrive
};

export async function fetchInterviewQuota(): Promise<InterviewQuota> {
  const res = await PaymentService.getInterviewQuota();
  const body = (res?.data?.data ?? res?.data ?? {}) as Partial<InterviewQuota>;
  return {
    plan: body.plan ?? 'FREE',
    available: Number(body.available ?? 0),
    grants: Array.isArray(body.grants) ? body.grants : [],
    resetsAt: body.resetsAt ?? null,
  };
}

// Identifies each grant, so a checkout return can tell a new one from one the
// user already had (a Pro subscriber's plan stays PRO after buying Pro 90-day).
export const grantKeys = (q: InterviewQuota | null, source: QuotaSource): string[] =>
  (q?.grants ?? []).filter((g) => g.source === source).map((g) => `${g.source}:${g.expiresAt ?? ''}`);

const POLL_MS = 2000;
const POLL_LIMIT_MS = 30_000;

// After Stripe: poll until a grant of `source` shows up that wasn't in
// `before` (keys from grantKeys taken before the redirect; undefined = the
// marker was lost, so any grant of that source counts). Lands in 1–2 s in the
// sandbox. Returns the quota, or null on timeout ("still processing").
export async function waitForQuotaGrant(source: QuotaSource, before?: string[], isCancelled?: () => boolean): Promise<InterviewQuota | null> {
  const deadline = Date.now() + POLL_LIMIT_MS;
  for (;;) {
    if (isCancelled?.()) return null;
    try {
      const q = await fetchInterviewQuota();
      const keys = grantKeys(q, source);
      if (before ? keys.some((k) => !before.includes(k)) : keys.length > 0) return q;
    } catch {
      /* keep polling until the deadline */
    }
    if (Date.now() > deadline) return null;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

// Staff have no candidate quota, so nothing is fetched for them.
export function useInterviewQuota() {
  const { isAuthenticated, user } = useAuth();
  const enabled = isAuthenticated && !isStaffRole(user?.roles, user?.role);
  const [quota, setQuota] = useState<InterviewQuota | null>(null);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) return null;
    setLoading(true);
    try {
      const q = await fetchInterviewQuota();
      setQuota(q);
      return q;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void refresh();
    else {
      setQuota(null);
      setLoading(false);
    }
  }, [enabled, refresh]);

  return { quota, loading, refresh };
}

// Interviews each plan includes (per month for Free / Pro, once for Pro
// 90-Day), as the pricing page states them. Marketing copy only: usage
// ("X of Y") comes from grants[].sessions.
export const PLAN_INTERVIEWS: Record<QuotaPlan, number> = { FREE: 2, PRO: 15, PRO_90_DAY: 45 };

// The add-on pack as the design states it. The API has neither the price nor
// the count (the sandbox granted +5); keep these in step with Stripe and the
// backend config by hand.
export const ADD_ON_INTERVIEWS = 5;
export const ADD_ON_PRICE = '$12';
export const ADD_ON_VALID_DAYS = 90;

// Starts a one-time checkout and returns the Stripe URL. Callers mark the
// pending checkout (with grantKeys) before redirecting.
export async function startQuotaCheckout(kind: 'pro-90-day' | 'interview-add-on'): Promise<string> {
  const res = kind === 'pro-90-day' ? await PaymentService.createPro90DayCheckout() : await PaymentService.createInterviewAddOnCheckout();
  const url = res?.data?.data?.url ?? res?.data?.url;
  if (!url) throw new Error('Could not start checkout');
  return url;
}
