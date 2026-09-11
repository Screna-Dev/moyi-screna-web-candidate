import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from '@/hooks/useUserPlan';
import {
  useCompanyPasses,
  passDaysLeft,
  COMPANY_PASS_DAYS,
  COMPANY_PASS_PRICE_LABEL,
  type CompanyPass,
} from '@/hooks/useCompanyPass';

export { COMPANY_PASS_DAYS, COMPANY_PASS_PRICE_LABEL };

// What a signed-in user is entitled to on a single company's page:
//   none         → Free/Basic, no pass for this company (2 newest notes only)
//   pass-active  → Company Pass in effect (full access to THIS company)
//   pass-expired → pass lapsed (gated again, offer a renewal)
//   advanced     → ADVANCED/FLAGSHIP subscriber (every company, no banner)
export type CompanyEntitlement = 'none' | 'pass-active' | 'pass-expired' | 'advanced';

export interface CompanyEntitlementResult {
  entitlement: CompanyEntitlement;
  /** Days remaining on an active pass; null in every other state. */
  daysLeft: number | null;
  /** The raw pass record, when one is held (carries PAUSED + remainingSeconds). */
  pass: CompanyPass | null;
  /** True while the plan or the pass lookup is still resolving. */
  isLoading: boolean;
  /** ADVANCED+, or a pass for this company. */
  hasFullAccess: boolean;
  /** ADVANCED+ specifically — a pass covers one company, this covers all. */
  hasSubscriptionAccess: boolean;
  /** Signed in, but this company's notes are still gated. */
  isGated: boolean;
}

const OVERRIDES: Record<string, { entitlement: CompanyEntitlement; daysLeft: number | null }> = {
  none: { entitlement: 'none', daysLeft: null },
  'pass-active': { entitlement: 'pass-active', daysLeft: 5 },
  'pass-expired': { entitlement: 'pass-expired', daysLeft: null },
  advanced: { entitlement: 'advanced', daysLeft: null },
};

/**
 * Resolves what this user gets on one company's page, combining the
 * subscription tier with any Company Pass they hold.
 *
 * ⚠️ `pass-expired` is not reachable from live data: GET /payments/company-pass
 * returns only passes with time left, so a lapsed pass looks identical to never
 * having bought one and both resolve to 'none'. The state and its UI are kept
 * for when the backend exposes pass history (and for the dev override below).
 *
 * For review, `?entitlement=none|pass-active|pass-expired|advanced` forces a
 * state in development builds only; it is ignored in production.
 */
export function useCompanyEntitlement(companyName?: string): CompanyEntitlementResult {
  const { isAuthenticated } = useAuth();
  const { isPremium, isLoading: isPlanLoading } = useUserPlan();
  const { find, isLoading: isPassLoading } = useCompanyPasses();
  const { search } = useLocation();

  // Dev-only preview override. Cosmetic either way — which posts and filters
  // actually resolve is enforced server-side.
  const override = useMemo(() => {
    if (!import.meta.env.DEV) return null;
    const value = new URLSearchParams(search).get('entitlement');
    return value ? OVERRIDES[value] ?? null : null;
  }, [search]);

  const pass = find(companyName);

  return useMemo(() => {
    const isLoading = isPlanLoading || isPassLoading;

    let entitlement: CompanyEntitlement = 'none';
    let daysLeft: number | null = null;
    if (isPremium) {
      // ADVANCED+ outranks a pass. A pass held at the same time is PAUSED by the
      // backend, so nothing is being burned while the subscription covers it.
      entitlement = 'advanced';
    } else if (pass) {
      entitlement = 'pass-active';
      daysLeft = passDaysLeft(pass);
    }

    if (override) {
      entitlement = override.entitlement;
      daysLeft = override.daysLeft;
    }

    const hasFullAccess = entitlement === 'advanced' || entitlement === 'pass-active';

    return {
      entitlement,
      daysLeft,
      pass: pass ?? null,
      isLoading,
      hasFullAccess,
      hasSubscriptionAccess: override ? override.entitlement === 'advanced' : isPremium,
      // Guests are handled separately (they see a sign-in prompt, not a paywall).
      isGated: isAuthenticated && !isLoading && !hasFullAccess,
    };
  }, [isAuthenticated, isPremium, isPlanLoading, isPassLoading, pass, override]);
}

export default useCompanyEntitlement;
