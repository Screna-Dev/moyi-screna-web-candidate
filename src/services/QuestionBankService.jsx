import API from './api';

export const searchQuestions = (params = {}) => {
  return API.get('/question-bank/questions/search', { params });
};

export const getQuestion = (questionId) => {
  return API.get(`/question-bank/questions/${questionId}`);
};

// AI hints for one community question.
//
// Moved to /community/public/** and the old /community/questions/{id}/ai-hints
// was deleted, so this is not a dual-path situation — there is nothing to fall
// back to. It is now permitAll, which is a behaviour change and not just a
// rename: signed-out readers can load hints, where before the request 401'd.
// Callers must not gate it on auth.
export const getQuestionAiHints = (questionId) => {
  return API.get(`/community/public/questions/${questionId}/ai-hints`);
};

export const deleteQuestion = (questionId) => {
  return API.delete(`/question-bank/questions/${questionId}`);
};

export const createBulkQuestions = (data) => {
  return API.post('/question-bank/questions', data);
};

export const getAnswerReplies = (answerId, page = 1) => {
  return API.get(`/question-bank/answers/${answerId}/replies`, { params: { page } });
};

export const createAnswerReply = (answerId, reply) => {
  return API.post(`/question-bank/answers/${answerId}/replies`, { reply });
};
