import API from "./api";

// Base endpoint for payments
const BASE_URL = '/payments';

export const getPlanUsage = () => {
  return API.get(`${BASE_URL}/plan-usage`);
};

export const changePlan = (planType) => {
  return API.post(`${BASE_URL}/change-plan`, { planType });
};

export const getCreditUsage = (page = 0) => {
  return API.get(`${BASE_URL}/credit-usage`, {
    params: { page }
  });
};

// New separate endpoints for credit packs
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
  getPlanUsage,
  changePlan,
  getCreditUsage,
  purchaseStarterPack,
  purchaseGrowthPack,
  purchaseCustomPack,
  createOneTimeSession,
  redeemCode,
  getInvoices,
};

export default PaymentService;