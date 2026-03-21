import API from './api';

export const getPosts = (params = {}) => {
  return API.get('/community/posts/search', { params });
};

export const getPost = (postId) => {
  return API.get(`/community/posts/${postId}`);
};

export const createPost = (data) => {
  return API.post('/community/posts', data);
};

export const getComments = (postId, query = {}) => {
  return API.get(`/community/posts/${postId}/comments`, { params: query });
};

export const createComment = (postId, data) => {
  return API.post(`/community/posts/${postId}/comments`, data);
};

export const deleteComment = (commentId) => {
  return API.delete(`/community/comments/${commentId}`);
};
