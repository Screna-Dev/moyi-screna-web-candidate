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
  createOneTimeSession,
  redeemCode,
  getInvoices,
};

export default PaymentService;