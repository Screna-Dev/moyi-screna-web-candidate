import API from "./api";

// Base endpoint for interviews
const BASE_URL = '/training-plans';

// GET /interviews/training-plans - List training plans
export const getTrainingPlans = () => {
  return API.get(`${BASE_URL}`);
};

// POST /interviews/training-plans - Create training plan
export const createTrainingPlan = (data) => {
  return API.post(`${BASE_URL}/from-input`, {
    jobTitle: data.jobTitle,
    company: data.company,
    jobDescription: data.jobDescription,
  });
};

// GET /interviews/training-plans/{trainingPlanId} - Get training plan
export const getTrainingPlanById = (trainingPlanId) => {
  return API.get(`${BASE_URL}/${trainingPlanId}`);
};

// DELETE /training-plans/{trainingPlanId} - Delete training plan
export const deleteTrainingPlan = (trainingPlanId) => {
  return API.delete(`${BASE_URL}/${trainingPlanId}`);
};

export const createTrainingPlanFromJobId = (jobId) => {
  return API.post(`${BASE_URL}`, {
    jobId: jobId,
  });
};

export const endTrainingModule = (moduleId)=> {
    return API.post(`${BASE_URL}/modules/${moduleId}`, {
    moduleId: moduleId,
  });
}

const InterviewServices = {
  getTrainingPlans,
  createTrainingPlan,
  getTrainingPlanById,
  deleteTrainingPlan,
  createTrainingPlanFromJobId,
  endTrainingModule
};

export default InterviewServices;