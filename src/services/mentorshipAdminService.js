import API from './api';

const BASE = '/mentorship/admin';

// ─── Mentors ────────────────────────────────────────────────────────────────

export const listMentors = (params = {}) =>
  API.get(`${BASE}/mentors`, { params });

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
