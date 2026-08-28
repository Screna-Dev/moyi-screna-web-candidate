import API from './api';

// Mentor discovery. Supported params (see src/constants/mentorship.ts for the
// enum values — anything outside those sets 400s):
//   discipline  Discipline           single-select
//   services    ServiceType[]        multi-select, contains-any (OR within the
//                                    filter, AND against the other filters)
//   yoeRange    YoeRange             single bucket; mentors with unset or <3
//                                    years never match
//   priceMin / priceMax              cents
//   availability 'THIS_WEEK' | 'NEXT_WEEK'
//   ratingMin, sortBy, sortDir, page, size
// `indexes: null` makes axios emit repeated bare keys (?services=A&services=B).
// Its default (`services[]=A`) is not what the backend binds to.
export const getMentors = (params = {}) =>
  API.get('/mentorship/mentors', { params, paramsSerializer: { indexes: null } });
export const getMentor = (mentorId) => API.get(`/mentorship/mentors/${mentorId}`);
export const getMentorSlots = (mentorId, topicId, duration = 30) =>
  API.get(`/mentorship/mentors/${mentorId}/topics/${topicId}/slots`, { params: { duration } });

// Bookable slots for the $1 special offer. Always 30-minute granularity — a
// 15-minute trial still occupies a full 30-minute block. Quota and the
// one-per-student rule are enforced at booking time, NOT here, so a non-empty
// result does not guarantee the booking will succeed.
// 400 when the mentor has no special offer configured; 403 MENTOR_SUSPENDED;
// 503 CALENDAR_UNAVAILABLE (retryable).
export const getSpecialOfferSlots = (mentorId) =>
  API.get(`/mentorship/mentors/${mentorId}/special-offer/slots`);

// payload: { topicId, startTime, durationMinutes, note?, serviceTags, isSpecialOffer? }
//   serviceTags     REQUIRED ServiceType[] (≥1, subset of the mentor's services)
//   isSpecialOffer  optional, default false
//   durationMinutes 30|60 for regular bookings, 15|30 for special offers —
//                   mismatching the flag is a 400.
export const createBooking = (mentorId, payload) =>
  API.post(`/mentorship/bookings/mentors/${mentorId}`, payload);

// Student booking list. Optional params:
//   status  BookingStatus — OMITTED returns only CONFIRMED + COMPLETED (this is
//           the fix for unpaid sessions leaking into the list). 'PENDING' is the
//           awaiting-payment bucket; 'EXPIRED'/'CANCELLED' always return an
//           empty page (students never see those).
//   past    boolean — true = already finished, false = future, omitted = both
//           (measured on the session's end time).
//   page, size (default 0 / 10)
// NOTE: because the default now hides PENDING, any surface that renders an
// "awaiting payment" state must explicitly fetch the PENDING bucket as a second
// call and merge — see training-history-design.tsx / dashboard-home-design.tsx.
export const listMyBookings = (params = {}) =>
  API.get('/mentorship/bookings', { params });

export const getBooking = (bookingId) =>
  API.get(`/mentorship/bookings/${bookingId}`);

export const cancelBooking = (bookingId) =>
  API.post(`/mentorship/bookings/${bookingId}/cancel`);

export const rescheduleBooking = (bookingId, startTime) =>
  API.post(`/mentorship/bookings/${bookingId}/reschedule`, { startTime });

export const submitDispute = (bookingId, payload) =>
  API.post(`/mentorship/bookings/${bookingId}/disputes`, payload);

export const updateDispute = (bookingId, payload) =>
  API.put(`/mentorship/bookings/${bookingId}/disputes`, payload);

// Attach a screenshot (PNG/JPEG/WEBP, max 5MB) to a PENDING dispute.
export const submitDisputeScreenshot = (bookingId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return API.post(`/mentorship/bookings/${bookingId}/disputes/screenshot`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getBookingScriptUrl = (bookingId) =>
  API.get(`/mentorship/bookings/${bookingId}/script`);

export const submitMentorReview = (bookingId, payload) =>
  API.post(`/mentorship/bookings/${bookingId}/reviews`, payload);

export const applyMentor = (payload) => API.post('/mentorship/apply', payload);
export const getCalendarAuthUrl = (redirectUri) =>
  API.get('/mentorship/mentor/calendar/authorize', { params: { redirectUri } });
export const connectCalendar = (payload) =>
  API.post('/mentorship/mentor/calendar/connect', payload);

// ─── Mentor-side profile management ──────────────────────────────────────────
export const getMyMentorProfile = () => API.get('/mentorship/profile');
// Partial update: omitting a field (or sending null) leaves it unchanged, an
// empty array clears it. `services` (ServiceType[]) and `disciplines`
// (Discipline[]) replaced the old free-text `expertiseTags` — array elements
// may not be null, and at least one of each is required for the mentor to go
// live (otherwise status flips to PENDING with a `statusReason` of
// "No service type selected" / "No discipline selected").
export const updateMyMentorProfile = (payload) =>
  API.put('/mentorship/profile', payload);

// Mentor's own timezone preference, independent of Google Calendar's.
// payload = { timezone: 'America/New_York' } — IANA zone id, non-empty, ≤100
// chars; anything else 400s. Returns the updated MentorProfileDto, whose
// `googleTimezone` reflects the new value.
export const updateMyMentorTimezone = (timezone) =>
  API.put('/mentorship/profile/timezone', { timezone });

// Recompute `hasSlotsThisWeek` / `hasSlotsNextWeek` on demand — the flags that
// drive the Availability filter in mentor discovery. Idempotent, no body.
// Returns the updated MentorProfileDto. 503 (errorCode CALENDAR_UNAVAILABLE)
// when Google is temporarily unreachable; retryable.
export const refreshMyAvailability = () =>
  API.post('/mentorship/profile/refresh-availability');

export const getMyCalendarStatus = () =>
  API.get('/mentorship/profile/calendar/status');

// ─── Mentor-side office hours (weekly availability) ──────────────────────────
// Returns the per-day grouped schedule:
//   [{ dayOfWeek (1=Mon … 7=Sun), active, ranges: [{ id, startTime, endTime }] }]
// Times are HH:mm:ss in the mentor's Google-calendar timezone. Inactive days
// still return their ranges (they just don't generate bookable slots).
export const getMyOfficeHours = () => API.get('/mentorship/profile/office-hours');
// Full-week replace. `payload` = { ranges, activeDays }:
//   ranges:     [{ dayOfWeek (1=Mon … 7=Sun), startTime: "HH:mm", endTime: "HH:mm" }]
//   activeDays: [{ dayOfWeek, active }]
// Rules (else 400): every dayOfWeek in `ranges` must appear in `activeDays`;
// no duplicate dayOfWeek in `activeDays`; same-day ranges can't overlap;
// endTime > startTime. Days omitted from the request are cleared.
export const setMyOfficeHours = (payload) =>
  API.put('/mentorship/profile/office-hours', payload);

// ─── Mentor-side availability: full-day blocks ───────────────────────────────
// Block dates make a whole day unbookable. `reason` is internal-only (free text,
// never shown to students). Can't block a past or duplicate date.
export const getMyBlockDates = () =>
  API.get('/mentorship/profile/availability/blocks');
// payload = { blockDate: "YYYY-MM-DD", reason?: string }
export const createMyBlockDate = (payload) =>
  API.post('/mentorship/profile/availability/blocks', payload);
export const deleteMyBlockDate = (id) =>
  API.delete(`/mentorship/profile/availability/blocks/${id}`);

// ─── Mentor-side availability: one-off (ad-hoc) extra slots ──────────────────
// Stacks on top of the recurring office hours. Can't be in the past, can't fall
// on a blocked date, endTime > startTime, no same-day overlap. Times are HH:mm
// in the mentor's Google-calendar timezone.
export const getMyAdHocSlots = () =>
  API.get('/mentorship/profile/availability/ad-hoc');
// payload = { adhocDate: "YYYY-MM-DD", startTime: "HH:mm", endTime: "HH:mm" }
export const createMyAdHocSlot = (payload) =>
  API.post('/mentorship/profile/availability/ad-hoc', payload);
export const deleteMyAdHocSlot = (id) =>
  API.delete(`/mentorship/profile/availability/ad-hoc/${id}`);

// ─── Mentor-side reviews (paginated) ─────────────────────────────────────────
// Returns a Spring page of ReviewDto, newest first, excluding deleted ones.
export const getMyMentorReviews = (params = { page: 0, size: 10 }) =>
  API.get('/mentorship/profile/reviews', { params });

// ─── Mentor-side transactions (unsettled, paginated) ─────────────────────────
// Returns a Spring page of MentorTransactionDto:
//   { bookingId, date, description, amountCents, status }
//   status: PENDING | AVAILABLE | ON_HOLD | REFUNDED  (PAID is excluded)
// amountCents is the post-platform-fee mentor share, in cents. These are
// display-only approximations — do NOT sum them client-side; the authoritative
// totals come from getMyMentorEarnings().
export const getMyMentorTransactions = (params = { page: 0, size: 10 }) =>
  API.get('/mentorship/profile/transactions', { params });

// ─── Mentor-side topic / booking management ──────────────────────────────────
// A mentor's single topic is auto-created when admin approves them (no
// client-side create). It is edited via two dedicated endpoints — no topicId.
// Update topic content. title/description/mentorNote all optional; omitted = unchanged.
export const updateMyTopicContent = (payload) =>
  API.put('/mentorship/profile/topic', payload);
// Update topic price. price30min/price60min in cents; omit/null = unchanged.
// A price, once set, cannot be cleared.
export const updateMyTopicPrice = (payload) =>
  API.put('/mentorship/profile/topic/price', payload);

// Mentor booking list. Same optional `status` / `past` / `page` / `size` params
// as listMyBookings, with one difference: a mentor may only ever see CONFIRMED
// and COMPLETED, so passing any other `status` (including PENDING) returns an
// empty page. Omit `status` to get both.
export const listMyMentorBookings = (params = {}) =>
  API.get('/mentorship/profile/bookings', { params });
export const mentorCancelBooking = (bookingId) =>
  API.post(`/mentorship/profile/bookings/${bookingId}/cancel`);
export const mentorRescheduleBooking = (bookingId, startTime) =>
  API.patch(`/mentorship/profile/bookings/${bookingId}/reschedule`, { startTime });
export const updateBookingMentorNote = (bookingId, note) =>
  API.patch(`/mentorship/profile/bookings/${bookingId}/note`, { note });
export const getBookingScriptUploadUrl = (bookingId) =>
  API.get(`/mentorship/profile/bookings/${bookingId}/script-upload`);

// ─── Mentor-side avatar ──────────────────────────────────────────────────────
// JPEG/PNG. Returns updated MentorProfileDto; data.avatarUrl is the new URL.
export const uploadMyMentorAvatar = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return API.post('/mentorship/profile/avatar', formData);
};
// Removes mentor-specific avatar; avatarUrl falls back to the student avatar.
export const deleteMyMentorAvatar = () =>
  API.delete('/mentorship/profile/avatar');

// ─── Mentor-side vacation mode ───────────────────────────────────────────────
// When true: mentor is hidden from public list, slot lookups return [],
// and new booking attempts get 400.
export const setMyVacation = (vacation) =>
  API.put('/mentorship/profile/vacation', { vacation });

// ─── Mentor-side earnings ────────────────────────────────────────────────────
// Returns { availableCents, pendingCents, lifetimeCents } (units: cents).
export const getMyMentorEarnings = () =>
  API.get('/mentorship/profile/earnings');

// ─── Mentor-side payment method (PDF) ────────────────────────────────────────
// Upload PDF. Returns { url, expiresAt } — 1h presigned URL.
export const uploadMyPaymentMethod = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return API.post('/mentorship/profile/payment-method', formData);
};
// Get a fresh 1h presigned download URL for the current mentor's payment method.
export const getMyPaymentMethod = () =>
  API.get('/mentorship/profile/payment-method');

// Admin-only: get presigned download URL for a specific mentor's payment method.
export const getMentorPaymentMethodAsAdmin = (mentorId) =>
  API.get(`/mentorship/admin/mentors/${mentorId}/payment-method`);
