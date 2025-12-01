import API from "./api";

const BASE_URL = '/jobs';

export const searchJobs = (params = {}) => {
  return API.get(`${BASE_URL}/search`, { params });
};

const JobService = {
  searchJobs
};

export default JobService;