import API from './api';

// Base endpoint for admin operations
const BASE_URL = '/admin';

// GET /admin/users/{userId}/training-plans - Get user training plans
export const getUserTrainingPlans = (userId) => {
  return API.get(`${BASE_URL}/users/${userId}/training-plans`);
};

// GET /admin/users/{userId}/reports - Get user reports
export const getUserReports = (userId) => {
  return API.get(`${BASE_URL}/users/${userId}/reports`);
};

// GET /admin/users/search - Search users with pagination and filters
export const searchUsers = (params = {}) => {
  return API.get(`${BASE_URL}/users/search`, { params });
};

const adminService = {
  getUserTrainingPlans,
  getUserReports,
  searchUsers
};

export default adminService;