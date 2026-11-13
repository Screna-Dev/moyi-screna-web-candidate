import { createContext, useContext } from 'react';
import type { CreditBalances, EmployerPlan } from './employerApi';

// GET /employer/credits, shared by the shell (top-bar badges, sidebar card)
// and the views that spend credits (unlocking a report), which call refresh()
// afterwards so the badges update without a screen change.
// plan: GET /employer/plan (undefined until it answers, null if it failed). A
// Business org can unlock and sponsor from its allowance with 0 credits.
export type CreditsState = { credits: CreditBalances | null; plan?: EmployerPlan | null; refresh: () => void };

export const CreditsContext = createContext<CreditsState>({ credits: null, plan: null, refresh: () => {} });

export const useEmployerCredits = () => useContext(CreditsContext);

// Report unlocks the org can still make before paying more: prepaid Report
// Credits plus, on Business, what's left of this month's allowance. While a
// payment is past due the allowance is capped server-side, so only prepaid
// credits count. null until both credits and plan have answered, so a Business
// org never flashes its prepaid-only count (or a false "running low").
export function reportUnlocksLeft(credits: CreditBalances | null, plan: EmployerPlan | null | undefined): number | null {
  if (!credits || plan === undefined) return null;
  const a = plan?.plan === 'BUSINESS' && plan.status !== 'past_due' ? plan.allowance : null;
  return credits.report + (a ? Math.max(0, a.reports.included - a.reports.used) : 0);
}

// "Report credits are running low" at or below this many unlocks left.
export const LOW_REPORT_UNLOCKS = 5;

// Report Credits bought from the board: Stripe returns to the same
// /employer/credits?checkout=…&jobId=… URL as Interview Credits bought from the
// wizard, so the board marks the purchase to be sent back to the board.
export const REPORT_CHECKOUT_KEY = 'screna_employer_report_checkout';

// Business subscription checkout started from Plan & Usage: the same Stripe
// return then reopens Plan & Usage, which polls until the plan is BUSINESS.
export const PLAN_CHECKOUT_KEY = 'screna_employer_plan_checkout';

// "Start Business" on the landing page. Checkout (POST /employer/plan/checkout)
// needs a signed-in employer with an organization, so the landing page only
// marks the intent for a signed-out visitor and sends them to sign in / sign
// up; the app then opens the checkout right away. Expires so a later, unrelated
// sign-in in the same tab doesn't pop the dialog.
const BUSINESS_INTENT_KEY = 'screna_employer_business_intent';
const BUSINESS_INTENT_TTL_MS = 30 * 60_000;

type BusinessCycle = 'MONTHLY' | 'ANNUAL';

export function markBusinessIntent(cycle: BusinessCycle = 'MONTHLY') {
  try {
    sessionStorage.setItem(BUSINESS_INTENT_KEY, JSON.stringify({ at: Date.now(), cycle }));
  } catch {
    /* storage blocked: they land on the app as usual */
  }
}

function readBusinessIntent(): BusinessCycle | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(BUSINESS_INTENT_KEY) || 'null') as { at?: number; cycle?: BusinessCycle } | null;
    if (!v?.at || Date.now() - v.at >= BUSINESS_INTENT_TTL_MS) return null;
    return v.cycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
  } catch {
    return null;
  }
}

export const hasBusinessIntent = () => readBusinessIntent() !== null;

// The billing cycle they picked, once; null when there's no live intent.
export function takeBusinessIntent(): BusinessCycle | null {
  const cycle = readBusinessIntent();
  try {
    sessionStorage.removeItem(BUSINESS_INTENT_KEY);
  } catch {
    /* storage blocked */
  }
  return cycle;
}
