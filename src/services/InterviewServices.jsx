import API from "./api";

// Base endpoint for interviews
const BASE_URL = '/interviews/training-plans';

// GET /interviews/training-plans - List training plans
export const getTrainingPlans = () => {
  return API.get(`${BASE_URL}`);
};

// POST /interviews/training-plans - Create training plan
export const createTrainingPlan = (data) => {
  return API.post(`${BASE_URL}`, {
    jobTitle: data.jobTitle,
    company: data.company,
    jobDescription: data.jobDescription,
  });
};

// GET /interviews/training-plans/{trainingPlanId} - Get training plan
export const getTrainingPlanById = (trainingPlanId) => {
  return API.get(`${BASE_URL}/${trainingPlanId}`);
};

const InterviewServices = {
  getTrainingPlans,
  createTrainingPlan,
  getTrainingPlanById,
};

export default InterviewServices;