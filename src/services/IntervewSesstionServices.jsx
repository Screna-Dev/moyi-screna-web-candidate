import API from "./api";

// Base endpoint for interview sessions
const BASE_URL = '/training-plans/interviews';

// POST /training-plans/interviews/{interviewId} - Create interview session
// audioOnly: true = voice (1 credit/min), false = video (2 credits/min)
export const createInterviewSession = (interviewId, audioOnly = false, signal) => {
    return API.post(`${BASE_URL}/${interviewId}`, { audioOnly }, { signal });
};

export const getInterviewSession = (interviewId) => {
    return API.get(`${BASE_URL}/${interviewId}/report`)
}

const InterviewSessionService = {
  createInterviewSession
};

export default InterviewSessionService;