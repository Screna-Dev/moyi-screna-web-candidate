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

// ============================================
// User Ban/Unban APIs
// ============================================

/**
 * Ban or unban a user
 * @param {string} userId - User ID
 * @param {boolean} banned - true to ban, false to unban (default: true)
 * @returns {Promise} API response
 */
export const banUser = (userId, banned = true) => {
  return API.post(`${BASE_URL}/users/${userId}/ban`, null, {
    params: { banned }
  });
};

/**
 * Reset a user's password
 * @param {string} userId - User ID
 * @param {string} password - Optional new password. If omitted, a temporary password is generated.
 * @returns {Promise} API response with tempPassword if no password provided
 */
export const resetUserPassword = (userId, password = null) => {
  const body = password ? { password } : {};
  return API.post(`${BASE_URL}/users/${userId}/reset-password`, body);
};

/**
 * Deactivate a user so the email can be re-registered
 * This removes login/profile/subscription data while keeping financial records
 * @param {string} userId - User ID
 * @returns {Promise} API response
 */
export const deactivateUser = (userId) => {
  return API.post(`${BASE_URL}/users/${userId}/deactivate`);
};

// ============================================
// User Plan Management APIs
// ============================================

/**
 * Get user billing info
 * @param {string} userId - User ID
 * @returns {Promise} API response with creditBalance (permanent) and recurringCreditBalance
 */
export const getUserBilling = (userId) => {
  return API.get(`${BASE_URL}/users/${userId}/billing`);
};

/**
 * Adjust user credits by delta
 * Positive delta adds credits, negative delta deducts credits.
 * @param {string} userId - User ID
 * @param {Object} data - Billing update data
 * @param {number} data.delta - Credit adjustment amount (required). Positive adds, negative deducts.
 * @param {boolean} [data.recurring=false] - If true, adjusts recurring credits; otherwise adjusts permanent credits.
 * @param {string} [data.reason] - Optional reason for the adjustment (e.g. "Manual adjustment")
 * @returns {Promise} API response with { data: { creditBalance: number } }
 */
export const updateUserBilling = (userId, data) => {
  return API.post(`${BASE_URL}/users/${userId}/billing`, data);
};

/**
 * Change user's billing plan
 * @param {string} userId - User ID
 * @param {string} planType - Plan type (Free, Pro, Elite)
 * @returns {Promise} API response
 */
export const changeUserPlan = (userId, planType) => {
  return API.post(`${BASE_URL}/users/${userId}/billing/plan`, { planType });
};

// ============================================
// Audit Log APIs
// ============================================

/**
 * Get admin audit logs
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (0-indexed)
 * @param {number} params.size - Page size
 * @returns {Promise} API response with audit logs
 * @example Response data:
 * {
 *   status: "string",
 *   message: "string",
 *   errorCode: "string",
 *   data: {
 *     content: [{
 *       id: "string",
 *       adminId: "string",
 *       action: "string",
 *       targetUserId: "string",
 *       requestPath: "string",
 *       httpMethod: "string",
 *       statusCode: number,
 *       payload: "string",
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
export const getAuditLogs = (params = {}) => {
  return API.get(`${BASE_URL}/audit-logs`, { params });
};

// ============================================
// PGS Management APIs
// ============================================

const PGS_URL = '/pgs/admin';

/**
 * List PGS members (paginated, with aggregated stats per member).
 * @param {Object} params
 * @param {string} [params.search] - Search by name, email, or slug
 * @param {"ACTIVE"|"ARCHIVED"} [params.status]
 * @param {"LV0"|"LV1"|"LV2"|"LV3"} [params.level]
 * @param {number} [params.page=0]
 * @param {number} [params.size=20]
 */
export const listPgsMembers = (params = {}) => {
  return API.get(PGS_URL, { params });
};

/**
 * Get full detail for a single PGS member.
 * @param {string} id - PGS member UUID
 */
export const getPgsMember = (id) => {
  return API.get(`${PGS_URL}/${id}`);
};

/**
 * Create a new PGS member (also provisions the redeem code).
 * @param {Object} body
 * @param {string} body.fullName
 * @param {string} body.email
 * @param {"LV0"|"LV1"|"LV2"|"LV3"} body.level
 * @param {string} body.referralSlug
 * @param {"WISE"|"ALIPAY"|"PAYPAL"} body.payoutMethod
 * @param {string} [body.schoolCommunity]
 * @param {string} [body.startDate] - ISO date (YYYY-MM-DD)
 */
export const createPgsMember = (body) => {
  return API.post(PGS_URL, body);
};

/**
 * Update editable fields of a PGS member. referralSlug cannot be changed.
 * If isActive changes, the redeem code is synced automatically.
 * @param {string} id
 * @param {Object} body - { fullName, email, level, payoutMethod, isActive, schoolCommunity, startDate, internalNotes }
 */
export const updatePgsMember = (id, body) => {
  return API.put(`${PGS_URL}/${id}`, body);
};

/**
 * Archive a PGS member. This is permanent and deactivates their redeem code.
 * @param {string} id
 */
export const archivePgsMember = (id) => {
  return API.post(`${PGS_URL}/${id}/archive`);
};

/**
 * List users attributed to this PGS member's referral slug.
 * @param {string} id - PGS member UUID
 * @param {Object} [params]
 * @param {string} [params.search] - Search by user name or email
 * @param {number} [params.page=0]
 * @param {number} [params.size=20]
 */
export const listPgsMemberUsers = (id, params = {}) => {
  return API.get(`${PGS_URL}/${id}/users`, { params });
};

/**
 * Get aggregated stats for a single PGS member.
 * @param {string} id
 */
export const getPgsMemberStats = (id) => {
  return API.get(`${PGS_URL}/${id}/stats`);
};

/**
 * Get global PGS stats across all members matching the filter.
 * @param {"ACTIVE_ENABLED"|"ACTIVE_DISABLED"|"NOT_ARCHIVED"|"ARCHIVED"} [filterStatus]
 */
export const getPgsGlobalStats = (filterStatus) => {
  return API.get(`${PGS_URL}/stats`, {
    params: filterStatus ? { filterStatus } : {},
  });
};

/**
 * Generate a unique referral slug suggestion from a full name.
 * Admin can modify before submitting.
 * @param {string} fullName
 */
export const generatePgsSlug = (fullName) => {
  return API.get(`${PGS_URL}/slug/generate`, { params: { fullName } });
};

const adminService = {
  // User Management
  getUserOverview,
  getUserTrainingPlans,
  getUserReports,
  getReportDetails,
  searchUsers,
  // User Ban/Unban
  banUser,
  // User Password Reset
  resetUserPassword,
  // User Deactivation
  deactivateUser,
  // User Billing
  getUserBilling,
  updateUserBilling,
  // User Plan Management
  changeUserPlan,
  // Redeem Code Management
  getRedeemCodes,
  createRedeemCode,
  updateRedeemCodeStatus,
  deleteRedeemCode,
  // Audit Logs
  getAuditLogs,
  // PGS Management
  listPgsMembers,
  getPgsMember,
  createPgsMember,
  updatePgsMember,
  archivePgsMember,
  listPgsMemberUsers,
  getPgsMemberStats,
  getPgsGlobalStats,
  generatePgsSlug,
};

export default adminService;