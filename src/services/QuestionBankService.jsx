import API from './api';

export const searchQuestions = (params = {}) => {
  return API.get('/question-bank/questions/search', { params });
};

export const getQuestion = (questionId) => {
  return API.get(`/question-bank/questions/${questionId}`);
};

export const getQuestionAiHints = (questionId) => {
  return API.get(`/community/questions/${questionId}/ai-hints`);
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
