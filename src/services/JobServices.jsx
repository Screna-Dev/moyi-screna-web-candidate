import API from "./api";

const BASE_URL = '/jobs';

export const searchJobs = (params = {}) => {
  return API.get(`${BASE_URL}/search`, { params });
};

export const getRecommendations = (params = {}) => {
  return API.get('/apply/candidates/recommendations', { params });
};

export const getApplications = (params = {}) => {
  return API.get('/apply/candidates/applications', { params });
};

export const getApplicationsCount = () => {
  return API.get('/apply/candidates/applications/count');
};

export const getApplication = (applicationId) => {
  return API.get(`/apply/candidates/applications/${applicationId}`);
};

export const acceptRecommendation = (recommendationId) => {
  return API.post(`/apply/candidates/recommendations/${recommendationId}/accept`);
};

export const rejectRecommendation = (recommendationId) => {
  return API.post(`/apply/candidates/recommendations/${recommendationId}/reject`);
};

const JobService = {
  searchJobs,
  getRecommendations,
  getApplications,
  getApplicationsCount,
  getApplication,
  acceptRecommendation,
  rejectRecommendation,
};

export default JobService;