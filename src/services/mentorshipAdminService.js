import API from './api';

const BASE = '/mentorship/admin';

// ─── Mentors ────────────────────────────────────────────────────────────────

// params may include `photoStatus` (PhotoStatus) to pull the moderation queue,
// e.g. { photoStatus: 'PHOTO_REVIEW' }. When set, only admin-approved,
// non-suspended, non-rejected mentors are returned, ANDed with reviewState.
export const listMentors = (params = {}) =>
  API.get(`${BASE}/mentors`, { params });

// ─── Avatar moderation (PR-6) ───────────────────────────────────────────────
// An approved photo is the 7th listing requirement. Approving may flip the
// mentor PENDING → APPROVED if every other gate is already satisfied.
// 400 when there is no resolvable avatar, or the mentor is SUSPENDED/REJECTED,
// or their application hasn't been approved yet.
export const approveMentorPhoto = (mentorId) =>
  API.patch(`${BASE}/mentors/${mentorId}/photo/approve`);

// `reason` is required (≤1000 chars). It becomes the mentor's `statusReason`,
// is shown to them, and is included in their notification email. The file is
// NOT deleted — the mentor can view it and upload a replacement.
export const rejectMentorPhoto = (mentorId, reason) =>
  API.patch(`${BASE}/mentors/${mentorId}/photo/reject`, { reason });

export const getMentor = (mentorId) =>
  API.get(`${BASE}/mentors/${mentorId}`);

export const createMentor = (payload) =>
  API.post(`${BASE}/mentors`, payload);

export const onboardMentor = (payload) =>
  API.post(`${BASE}/mentors/onboard`, payload);

export const updateMentorProfile = (mentorId, payload) =>
  API.put(`${BASE}/mentors/${mentorId}/profile`, payload);

export const updateMentorStatus = (mentorId, payload) =>
  API.patch(`${BASE}/mentors/${mentorId}/status`, payload);

export const setMentorOfficeHours = (mentorId, payload) =>
  API.put(`${BASE}/mentors/${mentorId}/office-hours`, payload);

export const refreshMentorAvailability = (mentorId) =>
  API.post(`${BASE}/mentors/${mentorId}/refresh-availability`);

export const setMentorIdentityVerification = (mentorId, payload) =>
  API.patch(`${BASE}/mentors/${mentorId}/identity-verification`, payload);

export const getMentorCalendarStatus = (mentorId) =>
  API.get(`${BASE}/mentors/${mentorId}/calendar/status`);

// Admin-only: get presigned download URL for a specific mentor's resume.
// Returns { url, expiresAt } (short-lived presigned URL), like payment-method.
export const getMentorResumeAsAdmin = (mentorId) =>
  API.get(`${BASE}/mentors/${mentorId}/resume`);

// ─── Topics ─────────────────────────────────────────────────────────────────

export const listMentorTopics = (mentorId) =>
  API.get(`${BASE}/mentors/${mentorId}/topics`);

export const createMentorTopic = (mentorId, payload) =>
  API.post(`${BASE}/mentors/${mentorId}/topics`, payload);

export const batchCreateMentorTopics = (mentorId, payload) =>
  API.post(`${BASE}/mentors/${mentorId}/topics/batch`, payload);

export const updateMentorTopic = (mentorId, topicId, payload) =>
  API.put(`${BASE}/mentors/${mentorId}/topics/${topicId}`, payload);

export const deleteMentorTopic = (mentorId, topicId) =>
  API.delete(`${BASE}/mentors/${mentorId}/topics/${topicId}`);

// ─── Payouts ────────────────────────────────────────────────────────────────

// Per-mentor aggregation of PAYMENT ledger entries (paginated). Each row:
//   { mentorId, mentorName, totalAmountCents, totalPayoutCents, recordCount }
// params: { status?: 'PENDING' | 'PAID', from?, to? (ISO-8601), page?, size? }.
// PENDING = eligible-to-settle set (matches markMentorPayoutsPaid); PAID = history.
export const adminPayoutSummary = (params = {}) =>
  API.get(`${BASE}/payouts`, { params });

// Per-session PAYMENT ledger rows (NOT aggregated per mentor — the client
// groups if it wants to). One row per session/payment:
//   { ledgerId, bookingId, mentorId, mentorName, studentName, studentEmail,
//     sessionStartTime, grossCents, platformFeeCents, mentorPayoutCents,
//     stripePaymentIntentId, status, eligible }
// Amounts are cents. Ordered by sessionStartTime desc.
// `status` is derived, precedence high→low: REFUNDED > DISPUTED > SETTLED >
// READY_TO_SETTLE (ended >7 days ago, no pending dispute/refund/cancellation)
// > PENDING. Only READY_TO_SETTLE rows have `eligible: true` and can settle.
// params: { status?, mentorId?, from?, to?, page?, size? } — size 1–100
// (default 20). NOTE from/to filter the ledger's createdAt, NOT the session date.
export const adminFinanceRows = (params = {}) =>
  API.get(`${BASE}/finance`, { params });

export const listMentorPayouts = (mentorId) =>
  API.get(`${BASE}/mentors/${mentorId}/payouts`);

export const markMentorPayoutsPaid = (mentorId) =>
  API.patch(`${BASE}/mentors/${mentorId}/payout`);

// ─── Bookings ───────────────────────────────────────────────────────────────

export const listBookings = (params = {}) =>
  API.get(`${BASE}/bookings`, { params });

export const adminCancelBooking = (bookingId) =>
  API.post(`${BASE}/bookings/${bookingId}/cancel`);

export const adminRescheduleBooking = (bookingId, startTime) =>
  API.patch(`${BASE}/bookings/${bookingId}/reschedule`, { startTime });

export const markBookingNoShow = (bookingId, noShowType) =>
  API.patch(`${BASE}/bookings/${bookingId}/no-show`, { noShowType });

export const retryBookingRefund = (bookingId) =>
  API.post(`${BASE}/bookings/${bookingId}/retry-refund`);

export const retryBookingCalendar = (bookingId) =>
  API.post(`${BASE}/bookings/${bookingId}/retry-calendar`);

export const getBookingScriptUploadUrl = (bookingId) =>
  API.get(`${BASE}/bookings/${bookingId}/script-upload`);

// ─── Disputes ───────────────────────────────────────────────────────────────

export const listDisputes = (params = {}) =>
  API.get(`${BASE}/disputes`, { params });

export const resolveDispute = (disputeId, payload) =>
  API.patch(`${BASE}/disputes/${disputeId}/resolve`, payload);

// ─── Reviews ────────────────────────────────────────────────────────────────

export const deleteReview = (reviewId) =>
  API.delete(`${BASE}/reviews/${reviewId}`);

// ─── Reports ────────────────────────────────────────────────────────────────

// Exports an Excel (.xlsx) of CONFIRMED and COMPLETED sessions for the period.
// period: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' (UTC). Returns a binary blob.
export const exportSessionReport = (period) =>
  API.get(`${BASE}/reports/sessions`, {
    params: { period },
    responseType: 'blob',
  });
