import API from './api';

export const getPosts = (params = {}) => {
  return API.get('/community/posts/search', { params });
};

export const getPublicPosts = (params = {}) => {
  return API.get('/community/public/posts/search', { params });
};

// Per-company published-post stats + across-all roll-up totals.
// Returns { totalCompanyCount, totalPostCount, totalRecentPostCount,
//           categories: [{ category, postCount, companies: [{ company, category, postCount, recentPostCount, latestUpdatedAt }] }] }
export const getCompaniesStats = (params = {}) => {
  return API.get('/community/companies/stats', { params });
};

// Returns a single company's { displayName, category, summary }, looked up by display name.
export const getCompanyProfile = (company) => {
  return API.get('/community/companies/profile', { params: { company } });
};

export const getPost = (postId) => {
  return API.get(`/community/posts/${postId}`);
};

export const getPostAccessInfo = (postId) => {
  return API.get(`/community/posts/${postId}/access-info`);
};

export const createPost = (data) => {
  return API.post('/community/posts', data);
};

export const deletePost = (postId) => {
  return API.delete(`/community/posts/${postId}`);
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

export const likePost = (postId) => API.put(`/community/posts/${postId}/like`);
export const unlikePost = (postId) => API.delete(`/community/posts/${postId}/unlike`);
export const savePost = (postId) => API.put(`/community/posts/${postId}/save`);
export const unsavePost = (postId) => API.delete(`/community/posts/${postId}/unsave`);

// Current user's contributions
export const getMyPosts = (params = {}) => {
  return API.get('/community/posts/me', { params });
};

export const getMyComments = (params = {}) => {
  return API.get('/community/comments/me', { params });
};

export const getMySavedPosts = (params = {}) => {
  return API.get('/community/posts/me/saved', { params });
};
