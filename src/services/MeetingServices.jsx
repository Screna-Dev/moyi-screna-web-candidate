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
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
  // Extract host from VITE_API_URL (e.g., "https://api-staging.screna.ai/api/v1" -> "api-staging.screna.ai")
  const url = new URL(apiUrl);
  return `${protocol}//${url.host}/api/v1/audio`;
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