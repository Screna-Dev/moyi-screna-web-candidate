import API from './api';

export const getMentors = (params = {}) => API.get('/mentorship/mentors', { params });
export const getMentor = (mentorId) => API.get(`/mentorship/mentors/${mentorId}`);
export const getMentorSlots = (mentorId, topicId, duration = 30) =>
  API.get(`/mentorship/mentors/${mentorId}/topics/${topicId}/slots`, { params: { duration } });
