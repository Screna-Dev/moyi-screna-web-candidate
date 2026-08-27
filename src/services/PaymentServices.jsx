import API from "./api";

// Base endpoint for payments
const BASE_URL = '/payments';

// ─── Subscriptions (Starter / Premium tier model) ──────────────────
// API enums are UPPERCASE; UI uses lowercase. Convert at the boundary.
const toApiEnum = (v) => String(v).toUpperCase();

// First-time subscription: creates a new sub for the user. Returns Stripe URL.
// body: { tier: 'BASIC' | 'ADVANCED' | 'FLAGSHIP', billingCycle: 'MONTHLY' } (MONTHLY only for now)
export const createSubscription = (tier, billingCycle) => {
  return API.post(`${BASE_URL}/subscriptions`, {
    tier: toApiEnum(tier),
    billingCycle: toApiEnum(billingCycle),
  });
};

// Fetch current subscription record (may be null/404 for non-members)
export const getSubscription = () => {
  return API.get(`${BASE_URL}/subscriptions`);
};

// Change tier for an existing subscriber. Upgrade prorated immediate, downgrade pending.
// body: { tier: 'BASIC' | 'ADVANCED' | 'FLAGSHIP' }
export const changeTier = (tier) => {
  return API.post(`${BASE_URL}/subscriptions/tier`, { tier: toApiEnum(tier) });
};

// Change billing cycle. Upgrade prorated immediate, downgrade pending.
// body: { billingCycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' }
//
// ⚠️ RETIRED (backend change C4) — the route is unregistered and this now 404s.
// Current tiers only price MONTHLY, so no call here could ever have succeeded.
// Kept (unused) so the backend logic — and this doc trail — aren't lost; it'll
// come back once quarterly pricing ships. Do not wire this into any UI.
export const changeBillingCycle = (billingCycle) => {
  return API.post(`${BASE_URL}/subscriptions/billing-cycle`, {
    billingCycle: toApiEnum(billingCycle),
  });
};

// ─── Payment method (backend change C6) ─────────────────────────────
// Query the card Stripe will charge on next renewal. `status` is computed
// against the NEXT renewal date, not "today" — a card expiring next month is
// still VALID if the renewal lands before that. 200 + status:'NONE' when there
// is no saved card (not a 404). This hits Stripe directly, so callers should
// give it its own loading/error state rather than blocking the rest of billing.
export const getPaymentMethod = () => {
  return API.get(`${BASE_URL}/payment-method`);
};

// Returns a Stripe-hosted page to add/replace the card (single-card model: the
// new card becomes the default and the old one is removed). No request body.
// `url` must be opened via window.location.href — Stripe refuses to be framed.
export const createPaymentMethodSetupSession = () => {
  return API.post(`${BASE_URL}/payment-method/setup-session`);
};

// Immediately retries the subscription's open invoice against the current
// default card. Stripe's own dunning retries are day-scale, so this exists for
// "I just updated my card, don't make me wait" and for a fresh card that was
// itself declined. No request body.
export const retryPayment = () => {
  return API.post(`${BASE_URL}/payment-method/retry-payment`);
};

// Cancel a pending downgrade (tier or billing-cycle) before it takes effect.
export const cancelPendingDowngrade = () => {
  return API.post(`${BASE_URL}/subscriptions/cancel-pending-downgrade`);
};

// Cancel subscription — takes effect at end of current cycle (cancelAtPeriodEnd).
export const cancelSubscription = () => {
  return API.post(`${BASE_URL}/subscriptions/cancel`);
};

// Resume a subscription that's pending cancellation.
export const resumeSubscription = () => {
  return API.post(`${BASE_URL}/subscriptions/resume`);
};

// ─── Credits ──────────────────────────────────────────────────────
export const getCredits = () => {
  return API.get(`${BASE_URL}/credits`);
};

export const getCreditUsage = (page = 0) => {
  return API.get(`${BASE_URL}/credit-usage`, {
    params: { page }
  });
};

// ─── Credit packs (pay-as-you-go) ─────────────────────────────────
// Fixed-price top-up: numberOfCredits must be 50–1000 in multiples of 10.
// Price is a flat $0.10 / credit (total = numberOfCredits × 0.10).
export const purchaseCustomPack = (numberOfCredits) => {
  return API.post(`${BASE_URL}/credits/custom`, { numberOfCredits });
};

// Legacy - kept for backward compatibility if needed
export const createOneTimeSession = (numberOfCredits) => {
  return API.post(`${BASE_URL}/one-time-session`, { numberOfCredits });
};

export const redeemCode = (code) => {
  return API.post(`${BASE_URL}/redeem`, { code });
};

export const getInvoices = (page = 0) => {
  return API.get(`${BASE_URL}/invoices`, {
    params: { page }
  });
};

const PaymentService = {
  createSubscription,
  getSubscription,
  changeTier,
  changeBillingCycle,
  cancelPendingDowngrade,
  cancelSubscription,
  resumeSubscription,
  getPaymentMethod,
  createPaymentMethodSetupSession,
  retryPayment,
  getCredits,
  getCreditUsage,
  purchaseCustomPack,
  createOneTimeSession,
  redeemCode,
  getInvoices,
};

export default PaymentService;
