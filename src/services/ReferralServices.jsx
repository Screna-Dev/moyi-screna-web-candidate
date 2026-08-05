import API from "./api";

// Base endpoint for Refer & Earn. Every call requires a CANDIDATE or MENTOR
// bearer token. /referrals/* speaks camelCase.
const BASE_URL = '/referrals';

/**
 * Own invite code + earnings overview.
 *
 * Notes from the API contract:
 * - `referralCode` is always returned — the backend mints one on the fly for
 *   users who don't have one yet, so this is never null/empty.
 * - `totalEarnedCredits` counts ONLY credits earned by inviting others (the
 *   +30 the user got for entering someone else's code during onboarding is
 *   excluded), and ONLY credits already granted — pending rewards are not
 *   included in the amount, they show up as `pendingInvites` headcount.
 *
 * @returns {Promise} data: {
 *   referralCode: string,          // 8 chars, uppercase alphanumeric
 *   totalEarnedCredits: number,
 *   successfulReferrals: number,   // rewarded (excludes VOIDED)
 *   pendingInvites: number         // signed up, resume not uploaded yet
 * }
 */
export const getReferralOverview = () => {
  return API.get(`${BASE_URL}/me`);
};

/**
 * Paged referral history. Page size is fixed at 10 server-side (no `size`
 * param). Sorted by most recent activity (backend `updatedAt`), not invite
 * time — an invite jumps to the top of the list the moment its reward lands.
 *
 * VOIDED rows are included here even though they're excluded from the
 * overview counters; history should reflect what actually happened.
 *
 * `referrerCreditAmount` is the agreed amount and is populated even while
 * PENDING — use `referrerRewardedAt !== null` to decide whether it landed.
 *
 * @param {number} [page=0] - zero-based, 0–1000
 * @returns {Promise} data: {
 *   content: Array<{
 *     referredUserId: string,
 *     referredUserName: string,
 *     referrerCreditAmount: number,
 *     referrerRewardedAt: string | null,   // ISO-8601, null until rewarded
 *     status: 'PENDING' | 'REWARDED' | 'VOIDED'
 *   }>,
 *   pageMeta: { pageNumber, pageSize, totalElements, totalPages, first, last }
 * }
 */
export const getReferralHistory = (page = 0) => {
  return API.get(`${BASE_URL}/history`, { params: { page } });
};

const ReferralService = {
  getReferralOverview,
  getReferralHistory,
};

export default ReferralService;
