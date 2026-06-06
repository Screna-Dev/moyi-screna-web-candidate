import API from "./api";

// Base endpoint for profile
const BASE_URL = '/profile';

/**
 * Get complete profile data (resume)
 * @returns {Promise} API response with full profile including resume data
 */
export const getProfile = () => {
  return API.get(`${BASE_URL}/resume`);
};

/**
 * Save complete profile data (resume)
 * @param {Object} profileData - Complete profile data structure
 * @returns {Promise} API response
 */
export const updateProfile = (profileData) => {
  return API.post(`${BASE_URL}/resume`, profileData);
};

/**
 * Upload resume file for parsing
 * @param {File} file - Resume file (PDF, DOC, DOCX)
 * @returns {Promise} API response with structured resume data
 */
export const uploadResume = (file) => {
  const formData = new FormData();
  formData.append('file', file);

  // Routed (same-origin) to a dedicated Node serverless function
  // (api/v1/profile/upload-resume.ts) that proxies to the backend with a 60s
  // timeout, bypassing the Edge Middleware's hard 25s limit. Allow up to 2
  // minutes on the client so it never aborts before the function responds.
  return API.post(`${BASE_URL}/upload-resume`, formData, { timeout: 120000 });
};

/**
 * Parse resume from pasted text
 * @param {string} resumeText - Resume text content
 * @returns {Promise} API response with structured resume data
 */
export const parseResumeText = (resumeText) => {
  return API.post(`${BASE_URL}/parse-resume`, { resumeText });
};

// ============================================
// Personal Profile Settings APIs
// ============================================

/**
 * Get personal info (name, email, avatar, country, timezone)
 * @returns {Promise} API response with personal info data
 */
export const getPersonalInfo = () => {
  return API.get(`${BASE_URL}/personal-info`);
};

/**
 * Save personal info
 * @param {Object} personalInfo - Personal info to save
 * @param {string} personalInfo.name - User's full name
 * @param {string} personalInfo.country - User's country code
 * @param {string} personalInfo.timezone - User's timezone
 * @returns {Promise} API response with updated personal info
 */
export const savePersonalInfo = (personalInfo) => {
  return API.post(`${BASE_URL}/personal-info`, personalInfo);
};

/**
 * Upload profile avatar
 * @param {File} file - Avatar image file (JPG, PNG, GIF)
 * @returns {Promise} API response with new avatar URL
 */
export const uploadAvatar = (file) => {
  const formData = new FormData();
  formData.append('file', file);
       
  return API.post(`${BASE_URL}/upload-avatar`, formData);
};

/**
 * Change user password
 * @param {Object} passwordData - Password change data
 * @param {string} passwordData.oldPassword - Current password
 * @param {string} passwordData.newPassword - New password (min 8 chars)
 * @param {string} passwordData.confirmNewPassword - Confirm new password
 * @returns {Promise} API response
 */
export const changePassword = (passwordData) => {
  return API.post(`${BASE_URL}/change-password`, passwordData);
};

/**
 * Get job title recommendations based on user's resume
 * @returns {Promise} API response with recommended job titles
 */
export const getJobTitleRecommendations = () => {
  return API.get(`${BASE_URL}/job-title-recommendations`);
};

// ============================================
// Profile Preferences APIs  (/profile/preferences)
// ============================================

/**
 * Get user profile preferences (replaces the removed /profile/user-insights)
 * @returns {Promise} API response. data.target_roles, target_companies,
 *   company_size_categories (FAANG | LARGE | MID_SIZE | STARTUP),
 *   goal_clarity_level, job_search_stage, priority_needs, work_authorization.
 */
export const getProfilePreferences = () => {
  return API.get(`${BASE_URL}/preferences`);
};

/**
 * Save user profile preferences. Body uses snake_case to match apply node:
 *   target_roles, goal_clarity_level, company_size_categories, target_companies,
 *   job_search_stage, priority_needs, work_authorization.
 */
export const saveProfilePreferences = (preferences) => {
  return API.post(`${BASE_URL}/preferences`, preferences);
};

/**
 * Save onboarding user insights. Body shape (lowercase enum values):
 *   target_roles, goal_clarity_level (know_exactly | deciding_between | exploring),
 *   company_size_categories (faang | large | mid_size | startup), target_companies,
 *   job_search_stage (just_exploring | actively_applying | interviewing | urgent_assistance),
 *   priority_needs (ai_interview_practice | strategic_planning | expert_feedback |
 *                   referrals_and_job_search | not_sure_yet).
 */
export const saveUserInsights = (insights) => {
  return API.post(`${BASE_URL}/user-insights`, insights);
};

// ============================================
// Jobs / Application Preferences APIs  (/apply/candidates/preferences)
// ============================================

export const getJobsPreferences = () => {
  return API.get('/apply/candidates/preferences');
};

export const upsertJobsPreferences = (preferences) => {
  return API.put('/apply/candidates/preferences', preferences);
};

/**
 * Record one or more document_type consents for the current candidate.
 * @param {Array<{document_type: string, document_version: string, agreed: boolean}>} consents
 * @returns {Promise} API response
 */
export const recordCandidateConsent = (consents) => {
  return API.post('/apply/candidates/consent', { consents });
};

/**
 * Get current user's onboarding status (resume_uploaded, preferences_set,
 * consent_agreed, completed).
 * @returns {Promise} API response
 */
export const getOnboardingStatus = () => {
  return API.get('/apply/candidates/onboarding-status');
};

// Export as default object for easier imports
const ProfileService = {
  // Resume profile
  getProfile,
  updateProfile,
  uploadResume,
  parseResumeText,
  // Personal profile settings
  getPersonalInfo,
  savePersonalInfo,
  uploadAvatar,
  changePassword,
  getJobTitleRecommendations,
  // Profile preferences
  getProfilePreferences,
  saveProfilePreferences,
  saveUserInsights,
  // Jobs preferences
  getJobsPreferences,
  upsertJobsPreferences,
  recordCandidateConsent,
  getOnboardingStatus,
};

export default ProfileService;