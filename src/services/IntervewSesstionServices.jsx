import API from "./api";

// Base endpoint for interview sessions
const BASE_URL = '/training-plans/interviews';

// POST /training-plans/interviews/{interviewId} - Create interview session
export const createInterviewSession = (interviewId) => {
    return API.post(`${BASE_URL}/${interviewId}`);
};

export const getInterviewSession = (interviewId) => {
    return API.get(`${BASE_URL}/${interviewId}/report`)
}

const InterviewSessionService = {
  createInterviewSession,
};

export default InterviewSessionService;