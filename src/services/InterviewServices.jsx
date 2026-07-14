import API from "./api";

// Base endpoint for interviews
const BASE_URL = '/training-plans';

// GET /interviews/training-plans - List training plans
// Takes no query params: it returns every plan for the authenticated user
// (personal, quick, trending), each object carrying its own plan_type field.
// Filter/tag by plan_type on the client. `params` is still forwarded if passed.
export const getTrainingPlans = (params) => {
  return API.get(`${BASE_URL}`, params ? { params } : undefined);
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

export const createTrainingPlanFromJobTitle = (jobTitle) => {
  return API.post(`${BASE_URL}`, {
    jobTitle: jobTitle,
  });
};

export const endTrainingModule = (moduleId)=> {
    return API.post(`${BASE_URL}/modules/${moduleId}`, {
    moduleId: moduleId,
  });
}

// POST /training-plans/modules/{moduleId}/retake - Retake a completed training module
export const retakeTrainingModule = (moduleId) => {
  return API.post(`${BASE_URL}/modules/${moduleId}/retake`);
};

// POST /training-plans/interviews/quick-mock - Create a Quick Mock interview session.
// Backend dynamically builds a temporary plan + module from company/role/level/duration,
// then reuses the normal "create session + pre-deduct credit" chain. Quick Mock is
// audio-only; credits are pre-deducted based on the module duration.
// Returns the same LiveKit credential shape as createInterviewSession
// ({ session_id, url, token, room_name, max_interview_duration, ... }).
export const createQuickMockInterview = ({ company, role, level, durationMinutes }, signal) => {
  return API.post(
    `${BASE_URL}/interviews/quick-mock`,
    { company, role, level, durationMinutes },
    { signal }
  );
};

// Turn a Quick Mock error into a single user-facing message.
//
// The quick-mock endpoint returns HTTP 422 with the reason in `data.detail`, which
// can take two shapes:
//   • Object — question-bank shortage, e.g. { reason: "not_enough_insights", message }
//   • Array  — request validation errors, e.g. [{ loc, msg, type, input, ctx }]
// Other 4xx errors carry a plain-string `detail` or a top-level `message`.
export const parseQuickMockError = (error) => {
  const res = error?.response;
  // Outer envelope is { status, errorCode, message, data: { detail } }, but some
  // responses put `detail` directly under `data` — check both.
  const detail = res?.data?.data?.detail ?? res?.data?.detail;

  // Shape A: question-bank shortage (object)
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    if (detail.reason === 'not_enough_insights') {
      return (
        detail.message ||
        'Not enough interview questions for this company, role and level. Try a shorter duration or a broader role.'
      );
    }
    if (detail.message) return detail.message;
  }

  // Shape B: request validation errors (array)
  if (Array.isArray(detail)) {
    const messages = detail
      .map((d) => {
        const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : null;
        const label = field ? String(field).replace(/_/g, ' ') : null;
        if (!d?.msg) return null;
        return label ? `${label}: ${d.msg}` : d.msg;
      })
      .filter(Boolean);
    if (messages.length) return messages.join('\n');
  }

  // Plain-string detail (generic 4xx) or top-level message fallbacks.
  if (typeof detail === 'string' && detail) return detail;
  return res?.data?.message || error?.message || 'Something went wrong. Please try again.';
};

const InterviewServices = {
  getTrainingPlans,
  createTrainingPlan,
  getTrainingPlanById,
  deleteTrainingPlan,
  createTrainingPlanFromJobId,
  createTrainingPlanFromJobTitle,
  endTrainingModule,
  retakeTrainingModule,
  createQuickMockInterview,
  parseQuickMockError
};

export default InterviewServices;