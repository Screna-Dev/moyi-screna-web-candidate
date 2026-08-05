import API from "./api";

// Base endpoint for onboarding. Every call requires a CANDIDATE bearer token.
const BASE_URL = '/onboarding';

/**
 * Get the current user's onboarding progress. Call this on entry to decide
 * which step to resume from.
 *
 * Note: /onboarding/* speaks camelCase (unlike /profile/*'s resume endpoints,
 * which are snake_case because they proxy the AI service).
 *
 * @returns {Promise} data: {
 *   referralSourceCompleted: boolean,   // step 1 done
 *   resumeUploaded: boolean,            // step 2 done
 *   completed: boolean,                 // both steps done
 *   referralSource: string | null,      // enum value chosen in step 1
 *   pendingReferralCredits: number | null // pending invite reward (null = none)
 * }
 */
export const getOnboardingProgress = () => {
  return API.get(`${BASE_URL}/progress`);
};

/**
 * Step 1 — submit referral source (+ optional invite code). Completing this
 * grants +30 credits (first time only). An invalid/duplicate/self invite code
 * does NOT fail the request: it returns 200 with invite_code_applied=false.
 *
 * The backend normalizes the invite code (trims, uppercases, maps look-alike
 * chars) — send whatever the user typed, no client-side cleaning needed.
 *
 * @param {Object} params
 * @param {string} params.referralSource - one of XIAOHONGSHU | REDDIT | X_TWITTER |
 *   LINKEDIN | OTHER_SOCIAL_MEDIA | SOMEWHERE_ELSE | REFERRED_BY_SOMEONE
 * @param {string|null} [params.inviteCode] - someone else's invite code (optional)
 * @returns {Promise} data: { creditsGranted: number, inviteCodeApplied: boolean }
 */
export const submitReferralSource = ({ referralSource, inviteCode }) => {
  const body = { referralSource };
  const code = inviteCode?.trim();
  if (code) body.inviteCode = code;
  return API.post(`${BASE_URL}/referral-source`, body);
};

const OnboardingService = {
  getOnboardingProgress,
  submitReferralSource,
};

export default OnboardingService;
