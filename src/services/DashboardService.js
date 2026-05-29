import API from './api';

export const getDashboardStats = () => API.get('/dashboard/stats');

const DashboardService = {
  getDashboardStats,
};

export default DashboardService;
