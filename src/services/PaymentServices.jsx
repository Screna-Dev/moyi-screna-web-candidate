import API from "./api";

// Base endpoint for payments
const BASE_URL = '/payments';

// ─── Subscriptions (Starter / Premium tier model) ──────────────────
// API enums are UPPERCASE; UI uses lowercase. Convert at the boundary.
const toApiEnum = (v) => String(v).toUpperCase();

// First-time subscription: creates a new sub for the user. Returns Stripe URL.
// body: { tier: 'STARTER' | 'PREMIUM', billingCycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' }
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

// Change tier (Starter ↔ Premium). Upgrade prorated immediate, downgrade pending.
// body: { tier: 'STARTER' | 'PREMIUM' }
export const changeTier = (tier) => {
  return API.post(`${BASE_URL}/subscriptions/tier`, { tier: toApiEnum(tier) });
};

// Change billing cycle. Upgrade prorated immediate, downgrade pending.
// body: { billingCycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' }
export const changeBillingCycle = (billingCycle) => {
  return API.post(`${BASE_URL}/subscriptions/billing-cycle`, {
    billingCycle: toApiEnum(billingCycle),
  });
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
export const purchaseStarterPack = () => {
  return API.post(`${BASE_URL}/credits/starter`);
};

export const purchaseGrowthPack = () => {
  return API.post(`${BASE_URL}/credits/growth`);
};

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
  getCredits,
  getCreditUsage,
  purchaseStarterPack,
  purchaseGrowthPack,
  purchaseCustomPack,
  createOneTimeSession,
  redeemCode,
  getInvoices,
};

export default PaymentService;
