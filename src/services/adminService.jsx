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
// User → Ops Assignment APIs
// ============================================

const USER_OPS_URL = '/apply/admin/user-ops-assignments';

/**
 * List candidate → ops assignments (filterable).
 * @param {Object} [params]
 * @param {string} [params.userId]
 * @param {string} [params.opsUserId]
 * @param {boolean} [params.includeRevoked]
 * @param {number} [params.offset]
 */
export const listUserOpsAssignments = (params = {}) => {
  return API.get(USER_OPS_URL, { params });
};

/**
 * Assign or re-assign a candidate to an ops operator.
 * @param {Object} body
 * @param {string} body.user_id
 * @param {string} body.ops_user_id
 */
export const assignUserToOps = (body) => {
  return API.put(USER_OPS_URL, body);
};

/**
 * Revoke the active candidate → ops mapping for a user.
 * @param {string} userId
 */
export const revokeUserOpsAssignment = (userId) => {
  return API.delete(`${USER_OPS_URL}/${userId}`);
};

// ============================================
// Ops Account APIs
// ============================================

/**
 * Sign up a new Ops account (admin-created).
 * Password must satisfy the shared policy in src/lib/passwordPolicy.tsx
 * (≥8 chars, uppercase, lowercase, digit, special char). Validate client-side
 * before calling.
 * @param {Object} body
 * @param {string} body.email - Email address (max 128 chars)
 * @param {string} body.password
 * @param {string} body.name - Full name (max 512 chars)
 * @returns {Promise} API response
 */
export const opsSignup = (body) => {
  return API.post(`${BASE_URL}/ops/signup`, body);
};

// ============================================
// Ops Console - Tickets & Applications APIs
// ============================================

const OPS_TICKETS_URL = '/apply/ops/tickets';
const OPS_APPLICATIONS_URL = '/apply/ops/applications';

/**
 * List ops tickets (filterable, sortable, paginated).
 * @param {Object} [params]
 * @param {"OPEN"|"CLAIMED"|"IN_PROGRESS"|"COMPLETED"|"FAILED"} [params.status]
 * @param {string} [params.assignedTo]
 * @param {string} [params.userId] - Filter by candidate user_id (if backend supports)
 * @param {string} [params.sort] - e.g. "priority"
 * @param {number} [params.limit]
 * @param {number} [params.offset]
 */
export const listOpsTickets = (params = {}) => {
  return API.get(OPS_TICKETS_URL, { params });
};

/**
 * Ticket detail — aggregate of ticket + application + job + candidate.
 * @param {string} ticketId
 */
export const getOpsTicket = (ticketId) => {
  return API.get(`${OPS_TICKETS_URL}/${ticketId}`);
};

/**
 * Atomic claim — OPEN → CLAIMED (assigned to caller).
 * @param {string} ticketId
 */
export const claimOpsTicket = (ticketId) => {
  return API.post(`${OPS_TICKETS_URL}/${ticketId}/claim`);
};

/**
 * Start work — ticket CLAIMED → IN_PROGRESS + application QUEUED → IN_PROGRESS.
 * @param {string} ticketId
 */
export const startOpsTicket = (ticketId) => {
  return API.post(`${OPS_TICKETS_URL}/${ticketId}/start`);
};

/**
 * Mark application submitted (multipart with screenshot).
 * App IN_PROGRESS → SUBMITTED + ticket → COMPLETED.
 * @param {string} applicationId
 * @param {File|Blob} screenshot - Application screenshot (PNG/JPEG/WebP/PDF, ≤10 MB)
 * @param {Object} [opts]
 * @param {string} [opts.notes]
 * @param {string} [opts.browserbase_session_id]
 */
export const markApplicationSubmitted = (applicationId, screenshot, opts = {}) => {
  const form = new FormData();
  form.append('screenshot', screenshot);
  return API.post(
    `${OPS_APPLICATIONS_URL}/${applicationId}/mark-submitted`,
    form,
    {
      params: {
        ...(opts.notes ? { notes: opts.notes } : {}),
        ...(opts.browserbase_session_id ? { browserbase_session_id: opts.browserbase_session_id } : {}),
      },
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
};

/**
 * Mark application failed (multipart, screenshot optional).
 * App IN_PROGRESS → FAILED + ticket → FAILED.
 * @param {string} applicationId
 * @param {Object} args
 * @param {string} args.failure_reason
 * @param {string} args.layer
 * @param {File|Blob} [args.screenshot] - Optional failure screenshot
 */
export const markApplicationFailed = (applicationId, { failure_reason, layer, screenshot } = {}) => {
  const form = new FormData();
  if (screenshot) form.append('screenshot', screenshot);
  return API.post(
    `${OPS_APPLICATIONS_URL}/${applicationId}/mark-failed`,
    form,
    {
      params: { failure_reason, layer },
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
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
  // Ops Account
  opsSignup,
  // User → Ops Assignments
  listUserOpsAssignments,
  assignUserToOps,
  revokeUserOpsAssignment,
  // Ops Console - Tickets
  listOpsTickets,
  getOpsTicket,
  claimOpsTicket,
  startOpsTicket,
  markApplicationSubmitted,
  markApplicationFailed,
};

export default adminService;