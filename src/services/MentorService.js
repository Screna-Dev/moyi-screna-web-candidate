import API from './api';

export const getMentors = (params = {}) => API.get('/mentorship/mentors', { params });
export const getMentor = (mentorId) => API.get(`/mentorship/mentors/${mentorId}`);
export const getMentorSlots = (mentorId, topicId, duration = 30) =>
  API.get(`/mentorship/mentors/${mentorId}/topics/${topicId}/slots`, { params: { duration } });

export const createBooking = (mentorId, payload) =>
  API.post(`/mentorship/bookings/mentors/${mentorId}`, payload);

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
export const updateMyMentorProfile = (payload) =>
  API.put('/mentorship/profile', payload);

export const getMyCalendarStatus = () =>
  API.get('/mentorship/profile/calendar/status');

// ─── Mentor-side office hours (weekly availability) ──────────────────────────
export const getMyOfficeHours = () => API.get('/mentorship/profile/office-hours');
// `officeHours`: array of { dayOfWeek (1=Mon … 7=Sun), startTime, endTime }.
export const setMyOfficeHours = (officeHours) =>
  API.put('/mentorship/profile/office-hours', { officeHours });

// ─── Mentor-side topic / booking management ──────────────────────────────────
export const createMyTopic = (payload) =>
  API.post('/mentorship/profile/topics', payload);
export const updateMyTopic = (topicId, payload) =>
  API.put(`/mentorship/profile/topics/${topicId}`, payload);
export const deleteMyTopic = (topicId) =>
  API.delete(`/mentorship/profile/topics/${topicId}`);

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
