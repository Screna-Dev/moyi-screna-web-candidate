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

export const applyMentor = (payload) => API.post('/mentorship/apply', payload);
export const getCalendarAuthUrl = (redirectUri) =>
  API.get('/mentorship/mentor/calendar/authorize', { params: { redirectUri } });
export const connectCalendar = (payload) =>
  API.post('/mentorship/mentor/calendar/connect', payload);
