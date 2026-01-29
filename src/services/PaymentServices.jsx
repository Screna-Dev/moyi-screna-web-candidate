import API from "./api";

// Base endpoint for payments
const BASE_URL = '/payments';

// ============================================
// Plan & Usage APIs
// ============================================

/**
 * Get current plan and usage information
 * @returns {Promise} API response with plan usage data
 * @example Response data:
 * {
 *   currentPlan: "Free" | "Pro" | "Elite",
 *   subscriptionCancelPending: boolean,
 *   planDowngradePending: boolean,
 *   creditBalance: number,
 *   nextBillingDate: string (ISO date),
 *   updatedAt: string (ISO date)
 * }
 */
export const getPlanUsage = () => {
  return API.get(`${BASE_URL}/plan-usage`);
};

/**
 * Create a subscription session for changing plan
 * Returns a Stripe checkout URL to redirect the user
 * @param {string} planType - Plan type to change to ("Free" | "Pro" | "Elite")
 * @returns {Promise} API response with Stripe checkout URL
 * @example Response data:
 * {
 *   type: "CREATED",
 *   url: string (Stripe checkout URL)
 * }
 */
export const changePlan = (planType) => {
  return API.post(`${BASE_URL}/change-plan`, { planType });
};

// ============================================
// Credit Purchase APIs
// ============================================

/**
 * Create a one-time session for purchasing credits
 * Returns a Stripe checkout URL to redirect the user
 * @param {number} numberOfCredits - Number of credits to purchase
 * @returns {Promise} API response with Stripe checkout URL
 * @example Response data:
 * {
 *   url: string (Stripe checkout URL)
 * }
 */
export const createOneTimeSession = (numberOfCredits) => {
  return API.post(`${BASE_URL}/one-time-session`, { numberOfCredits });
};

// ============================================
// Redeem Code APIs
// ============================================

/**
 * Redeem a promotion code to receive credits
 * @param {string} code - The promotion code to redeem
 * @returns {Promise} API response with redemption result
 * @example Response data:
 * {
 *   status: "string",
 *   message: "string",
 *   errorCode: "string",
 *   data: "string"
 * }
 */
export const redeemCode = (code) => {
  return API.post(`${BASE_URL}/redeem`, { code });
};

// ============================================
// Invoice APIs
// ============================================

/**
 * Get paginated list of invoices
 * @param {number} page - Page number (0-indexed)
 * @returns {Promise} API response with invoices and pagination metadata
 * @example Response data:
 * {
 *   content: [{
 *     stripeInvoiceId: string,
 *     amount: number (in cents, divide by 100 for dollars),
 *     currency: string,
 *     description: string,
 *     reason: string,
 *     invoiceNumber: string,
 *     invoiceUrl: string,
 *     createdAt: string (ISO date)
 *   }],
 *   pageMeta: {
 *     pageNumber: number,
 *     pageSize: number,
 *     totalElements: number,
 *     totalPages: number,
 *     first: boolean,
 *     last: boolean
 *   }
 * }
 */
export const getInvoices = (page = 0) => {
  return API.get(`${BASE_URL}/invoices`, {
    params: { page }
  });
};

// Export as default object for easier imports
const PaymentService = {
  // Plan & Usage
  getPlanUsage,
  changePlan,
  // Credit Purchase
  createOneTimeSession,
  // Redeem Code
  redeemCode,
  // Invoices
  getInvoices,
};

export default PaymentService;