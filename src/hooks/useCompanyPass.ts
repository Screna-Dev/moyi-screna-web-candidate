import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PaymentService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import {
  markPendingCheckout,
  readPendingCheckout,
  clearPendingCheckout,
} from '@/utils/pendingCheckout';

// Company Pass (backend change C8) — $7.99 one-time for 7 days of
// ADVANCED-equivalent access to ONE company's published notes, questions, and
// company-scoped search/filter/sort. No renewal, and v1 has no refunds.
export const COMPANY_PASS_PRICE_LABEL = '$7.99';
export const COMPANY_PASS_DAYS = 7;

// A pass pauses while an ADVANCED+ subscription covers the same company, so its
// clock isn't burned by time the user didn't need it. `expiresAt` is null while
// paused — always render remaining time from `remainingSeconds`.
export type CompanyPassStatus = 'ACTIVE' | 'PAUSED';

export interface CompanyPass {
  company: string;
  status: CompanyPassStatus;
  expiresAt: string | null;
  remainingSeconds: number;
}

/** One entry of the purchasable-companies catalogue (published notes >= 10). */
export interface CompanyPassOption {
  company: string;
  postCount?: number;
}

const asArray = <T,>(res: { data?: unknown }): T[] => {
  const body = res?.data as { data?: unknown } | unknown[] | null;
  const data = Array.isArray(body) ? body : (body as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as T[]) : [];
};

const sameCompany = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Whole days left, rounded up — 0 only when the pass is genuinely spent. */
export const passDaysLeft = (pass: Pick<CompanyPass, 'remainingSeconds'>): number =>
  Math.max(0, Math.ceil((pass.remainingSeconds ?? 0) / 86_400));

/**
 * The passes this user currently holds. Guests hold none and skip the request.
 *
 * Expired passes are NOT returned by the endpoint, so a lapsed pass is
 * indistinguishable from never having bought one — see useCompanyEntitlement.
 */
export function useCompanyPasses() {
  const { isAuthenticated } = useAuth();
  const [passes, setPasses] = useState<CompanyPass[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const refresh = useCallback(async (): Promise<CompanyPass[]> => {
    if (!isAuthenticated) {
      setPasses([]);
      return [];
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await PaymentService.getCompanyPasses();
      const list = asArray<CompanyPass>(res);
      if (alive.current) setPasses(list);
      return list;
    } catch {
      // A pass is an add-on: if the lookup fails we fall back to whatever the
      // subscription grants rather than blocking the page.
      if (alive.current) setError('Unable to load your company passes.');
      return [];
    } finally {
      if (alive.current) setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { void refresh(); }, [refresh]);

  const find = useCallback(
    (company?: string) => passes.find((p) => sameCompany(p.company, company)) ?? null,
    [passes],
  );

  return { passes, isLoading, error, refresh, find };
}

/**
 * The purchasable-companies catalogue. `enabled: false` skips the request —
 * pass false when the user's subscription already covers every company, so we
 * don't fetch a list they can't act on.
 */
export function useCompanyPassCatalogue(enabled = true) {
  const [options, setOptions] = useState<CompanyPassOption[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setOptions([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    PaymentService.getCompanyPassCompanies()
      .then((res) => {
        if (cancelled) return;
        setOptions(asArray<CompanyPassOption>(res));
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load companies. Please try again.');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [enabled]);

  return { options, isLoading, error };
}

/**
 * Starts Checkout for one company and redirects the whole page to Stripe.
 *
 * Never resolves on success — the browser navigates away. Callers must keep the
 * button disabled from the moment they call this: completing checkout twice
 * charges twice and the backend ADDS the days (14, not an error), with no
 * refund path.
 */
export async function startCompanyPassCheckout(company: string): Promise<void> {
  const res = await PaymentService.createCompanyPass(company);
  const url = res?.data?.data?.url ?? res?.data?.url;
  if (!url) throw new Error('Checkout is unavailable right now. Please try again.');
  // Success and cancel return to the same URL and fulfilment is async, so the
  // return can only be interpreted with this marker + polling.
  markPendingCheckout('company-pass', company);
  window.location.href = url;
}

/**
 * Poll for a pass to appear after a Checkout return. Fulfilment runs through
 * Stripe → EventBridge → SQS → a worker, so the pass is normally absent for a
 * few seconds. Resolves null on timeout (or if the user actually cancelled) —
 * that is "unknown", not "failed".
 */
export async function waitForCompanyPass(
  company: string,
  { timeoutMs = 30_000, intervalMs = 2_000 } = {},
): Promise<CompanyPass | null> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const list = asArray<CompanyPass>(await PaymentService.getCompanyPasses());
      const found = list.find((p) => sameCompany(p.company, company));
      if (found) return found;
    } catch {
      // Keep polling — a transient read failure isn't a verdict.
    }
    if (Date.now() >= deadline) return null;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/**
 * Handles the return from a Company Pass checkout, wherever Stripe lands the
 * user. Success and cancel share one URL, so the sessionStorage marker is the
 * only signal that a purchase was attempted; the pass itself then has to be
 * polled for because fulfilment is async.
 *
 * Mount this on every page the checkout can return to — the marker is consumed
 * once, by whichever mounts first. `onResolved` gets a null pass on timeout or
 * cancel: that means "unknown", not "failed".
 */
export function useCompanyPassCheckoutReturn(
  onResolved: (result: { company: string; pass: CompanyPass | null }) => void,
) {
  const [pendingCompany, setPendingCompany] = useState<string | null>(null);
  const callback = useRef(onResolved);
  callback.current = onResolved;

  useEffect(() => {
    const marker = readPendingCheckout();
    if (!marker || marker.kind !== 'company-pass' || !marker.target) return;
    clearPendingCheckout();
    const company = marker.target;
    setPendingCompany(company);

    let cancelled = false;
    void waitForCompanyPass(company).then((pass) => {
      if (cancelled) return;
      setPendingCompany(null);
      callback.current({ company, pass });
    });
    return () => { cancelled = true; };
  }, []);

  return { pendingCompany };
}

/** True when this user could buy a pass for this company right now. */
export function useCanBuyCompanyPass({
  company,
  passEligible,
  hasSubscriptionAccess,
}: {
  company?: string;
  /** `CompanyDto.passEligible` — the company has >= 10 published notes. */
  passEligible?: boolean;
  /** ADVANCED+ already covers every company, so a pass adds nothing. */
  hasSubscriptionAccess: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const { find, isLoading } = useCompanyPasses();

  return useMemo(() => {
    const existing = find(company);
    return {
      canBuy:
        isAuthenticated &&
        !!company &&
        passEligible === true &&
        !existing &&
        !hasSubscriptionAccess,
      existingPass: existing,
      isLoading,
    };
  }, [isAuthenticated, company, passEligible, hasSubscriptionAccess, find, isLoading]);
}
