import API from './api';

// Base endpoint for admin operations
const BASE_URL = '/admin';

// ============================================
// User Management APIs
// ============================================

/**
 * Get user overview/summary
 * @param {string} userId - User ID
 * @returns {Promise} API response with user overview data
 */
export const getUserOverview = (userId) => {
  return API.get(`${BASE_URL}/users/${userId}/overview`);
};

/**
 * Get user training plans
 * @param {string} userId - User ID
 * @returns {Promise} API response with training plans
 */
export const getUserTrainingPlans = (userId) => {
  return API.get(`${BASE_URL}/users/${userId}/training-plans`);
};

/**
 * Get user reports
 * @param {string} userId - User ID
 * @returns {Promise} API response with user reports
 */
export const getUserReports = (userId) => {
  return API.get(`${BASE_URL}/users/${userId}/reports`);
};

/**
 * Get specific interview report details
 * @param {string} userId - User ID
 * @param {string} interviewId - Interview ID
 * @returns {Promise} API response with report details
 */
export const getReportDetails = (userId, interviewId) => {
  return API.get(`${BASE_URL}/users/${userId}/report/${interviewId}`);
};

/**
 * Search users with pagination and filters
 * @param {Object} params - Search parameters
 * @returns {Promise} API response with paginated users
 */
export const searchUsers = (params = {}) => {
  return API.get(`${BASE_URL}/users/search`, { params });
};

// ============================================
// Redeem Code Management APIs
// ============================================

/**
 * Get paginated list of redeem codes
 * @param {number} page - Page number (0-indexed)
 * @returns {Promise} API response with redeem codes and pagination metadata
 * @example Response data:
 * {
 *   status: "string",
 *   message: "string",
 *   errorCode: "string",
 *   data: {
 *     content: [{
 *       id: "string",
 *       code: "string",
 *       type: "string",
 *       creditAmount: number,
 *       expiresAt: "string" (ISO date),
 *       isActive: boolean,
 *       createdAt: "string" (ISO date)
 *     }],
 *     pageMeta: {
 *       pageNumber: number,
 *       pageSize: number,
 *       totalElements: number,
 *       totalPages: number,
 *       first: boolean,
 *       last: boolean
 *     }
 *   }
 * }
 */
export const getRedeemCodes = (page = 0) => {
  return API.get(`${BASE_URL}/redeem-codes`, {
    params: { page }
  });
};

/**
 * Create a new redeem code
 * @param {Object} codeData - Redeem code data
 * @param {string} codeData.code - The promotion code string
 * @param {string} codeData.type - Code type (e.g., "signup", "promotion", "beta", "vip", "referral")
 * @param {number} codeData.creditAmount - Number of credits to award
 * @param {string} codeData.expiresAt - Expiration date (ISO format)
 * @returns {Promise} API response with created redeem code
 * @example Response data:
 * {
 *   status: "string",
 *   message: "string",
 *   errorCode: "string",
 *   data: {
 *     id: "string",
 *     code: "string",
 *     type: "string",
 *     creditAmount: number,
 *     expiresAt: "string" (ISO date),
 *     isActive: boolean,
 *     createdAt: "string" (ISO date)
 *   }
 * }
 */
export const createRedeemCode = (codeData) => {
  return API.post(`${BASE_URL}/redeem-codes`, codeData);
};

/**
 * Toggle redeem code active status
 * @param {string} codeId - Redeem code ID
 * @param {boolean} isActive - New active status
 * @returns {Promise} API response
 */
export const updateRedeemCodeStatus = (codeId, isActive) => {
  return API.patch(`${BASE_URL}/redeem-codes/${codeId}`, { isActive });
};

/**
 * Delete a redeem code
 * @param {string} codeId - Redeem code ID
 * @returns {Promise} API response
 */
export const deleteRedeemCode = (codeId) => {
  return API.delete(`${BASE_URL}/redeem-codes/${codeId}`);
};

const adminService = {
  // User Management
  getUserOverview,
  getUserTrainingPlans,
  getUserReports,
  getReportDetails,
  searchUsers,
  // Redeem Code Management
  getRedeemCodes,
  createRedeemCode,
  updateRedeemCodeStatus,
  deleteRedeemCode,
};

export default adminService;