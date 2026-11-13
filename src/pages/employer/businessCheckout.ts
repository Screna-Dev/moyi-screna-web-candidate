import { startPlanCheckout, type BusinessBillingCycle } from './employerApi';
import { authErrorCode, authErrorMessage } from './employerAuth';
import { PLAN_CHECKOUT_KEY } from './creditsContext';

// Starts the Business subscription checkout (POST /employer/plan/checkout) and
// sends the browser to Stripe. Needs a signed-in employer. Used by Plan &
// Usage, the landing page's "Start Business" and the sign-in that follows it.
// Never resolves on success; callers keep their button disabled until the
// redirect, since a second checkout would be a second charge.
export async function openBusinessCheckout(cycle: BusinessBillingCycle = 'MONTHLY'): Promise<void> {
  const url = await startPlanCheckout(cycle);
  try {
    sessionStorage.setItem(PLAN_CHECKOUT_KEY, cycle);
  } catch {
    /* storage blocked: the return lands on Plan & Usage without the confirming state */
  }
  window.location.href = url;
  await new Promise(() => {});
}

// 409 INVALID_STATE: the org already has a Business subscription (incl. one
// whose first payment is still processing, or past_due).
export const alreadyOnBusiness = (err: unknown) => authErrorCode(err) === 'INVALID_STATE';

export function businessCheckoutError(err: unknown): string {
  return alreadyOnBusiness(err)
    ? 'You already have a Business subscription (it may still be processing). Refresh in a moment.'
    : authErrorMessage(err) || 'Could not start checkout.';
}
