import API from './api';

export const getPosts = (params = {}) => {
  return API.get('/community/posts/search', { params });
};

export const getPublicPosts = (params = {}) => {
  return API.get('/community/public/posts/search', { params });
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

export const getReplies = (commentId, query = {}) => {
  return API.get(`/community/comments/${commentId}/replies`, { params: query });
};

export const createReply = (commentId, data) => {
  return API.post(`/community/comments/${commentId}/replies`, data);
};

export const deleteReply = (replyId) => {
  return API.delete(`/community/replies/${replyId}`);
};
