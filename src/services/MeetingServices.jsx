import API from "./api";

// Base endpoint for meetings
const BASE_URL = '/screenings';

export const verifyScreening = (screeningId, email) => {
  return API.post(`${BASE_URL}/${screeningId}/verify`, { email });
};

export const createMeeting = (screeningId) => {
  return API.post(`${BASE_URL}/${screeningId}/meetings`, {});
};

export const getAudioWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const baseUrl = process.env.REACT_APP_API_URL || 'localhost:8080';
  return `${protocol}//${baseUrl}/api/v1/audio`;
};

export const submitBrowserEvents = (screeningId, meetingId, eventData) => {
  return API.post(`${BASE_URL}/${screeningId}/meetings/${meetingId}/browser-events`, eventData);
};

const MeetingService = {
  verifyScreening,
  createMeeting,
  getAudioWebSocketUrl,
  submitBrowserEvents
};

export default MeetingService;