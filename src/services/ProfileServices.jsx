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
 * Poll the parse status of a resume upload job.
 * @param {string} jobId - job_id returned by uploadResume
 * @returns {Promise} data: {
 *   job_id, status ('PENDING'|'succeeded'|'failed'|...), attempts, error,
 *   structured_resume, raw_text
 * }
 */
export const getResumeUploadStatus = (jobId) => {
  return API.get(`${BASE_URL}/upload-resume/status/${jobId}`);
};

/**
 * Persist a structured resume (POST /profile/resume — same endpoint as
 * updateProfile).
 *
 * NOT needed after a successful file upload: the backend auto-saves the parsed
 * resume the moment the status poll returns `succeeded`. Only call this when
 *   a) the user EDITED the parsed result and you're overwriting it, or
 *   b) you went through parseResumeText (pasted text), which has no auto-save.
 * @param {Object} structuredResume - the StructuredResume object (sent as-is)
 * @returns {Promise} API response
 */
export const saveResume = (structuredResume) => {
  return API.post(`${BASE_URL}/resume`, structuredResume);
};

/**
 * Parse resume from pasted text
 *
 * ⚠️ Unlike the file-upload path this does NOT auto-save. Follow it with
 * saveResume() or the resume is never persisted.
 * @param {string} resumeText - Resume text content
 * @returns {Promise} API response with structured resume data
 */
export const parseResumeText = (resumeText) => {
  return API.post(`${BASE_URL}/parse-resume`, { resumeText });
};

// ── Resume upload orchestration ───────────────────────────────────────────────

export const RESUME_POLL_INTERVAL_MS = 2000;
export const RESUME_POLL_MAX_ATTEMPTS = 45; // ~90s ceiling

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Unwrap the CustomApiResponse envelope: res.data.data ?? res.data.
const envelope = (res) => res?.data?.data ?? res?.data ?? null;

/**
 * Upload a resume file and wait for the backend to finish parsing it.
 *
 * This is the ONLY resume-upload entry point call sites should use.
 * POST /profile/upload-resume answers 202 with just { job_id, status } — the
 * parsed resume is never in that response, so every caller has to poll.
 *
 * When the poll returns `succeeded` the backend has ALREADY persisted the
 * structured resume (and released any pending invite reward). Callers must
 * therefore NOT follow this with saveResume()/updateProfile() — only do that if
 * the user edits the parsed result.
 *
 * Polling stops the instant we see `succeeded`: the auto-save runs on every
 * `succeeded` response, so re-polling a finished job would overwrite the user's
 * edits with the original parse.
 *
 * @param {File} file - PDF/DOC/DOCX, max 1MB
 * @param {Object} [opts]
 * @param {(info: {attempt: number, status: string}) => void} [opts.onPoll] - progress hook
 * @param {number} [opts.intervalMs]
 * @param {number} [opts.maxAttempts]
 * @returns {Promise<{structuredResume: Object|null, rawText: string|null,
 *   resumePath: string|null, jobId: string|null}>}
 * @throws when the parse job fails, times out, or no job id comes back
 */
export const uploadResumeAndWait = async (file, opts = {}) => {
  const {
    onPoll,
    intervalMs = RESUME_POLL_INTERVAL_MS,
    maxAttempts = RESUME_POLL_MAX_ATTEMPTS,
  } = opts;

  const uploaded = envelope(await uploadResume(file)) || {};

  // Defensive: if a deployment ever answers synchronously with the parsed
  // resume, take it and skip polling entirely.
  if (uploaded.structured_resume) {
    return {
      structuredResume: uploaded.structured_resume,
      rawText: uploaded.raw_text ?? null,
      resumePath: uploaded.resume_path ?? null,
      jobId: uploaded.job_id ?? uploaded.jobId ?? null,
    };
  }

  const jobId = uploaded.job_id ?? uploaded.jobId;
  if (!jobId) {
    throw new Error('Resume upload did not return a parse job id.');
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(intervalMs);
    const s = envelope(await getResumeUploadStatus(jobId)) || {};
    const status = String(s.status || '').toLowerCase();

    if (status === 'succeeded') {
      // Resume is saved server-side at this point. Stop polling.
      return {
        structuredResume: s.structured_resume ?? null,
        rawText: s.raw_text ?? null,
        resumePath: s.resume_path ?? null,
        jobId,
      };
    }
    if (status === 'failed') {
      throw new Error(s.error || 'Resume parsing failed.');
    }
    onPoll?.({ attempt, status });
  }

  throw new Error('Timed out while processing your resume.');
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
  getResumeUploadStatus,
  uploadResumeAndWait,
  saveResume,
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