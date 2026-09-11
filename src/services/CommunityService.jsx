import API from './api';

export const getPosts = (params = {}) => {
  return API.get('/community/posts/search', { params });
};

// ─── Signed-out (public) community reads ────────────────────────────────────
// Three endpoints under /community/public/** are permitAll. They never read
// user state: sending a token changes nothing, so signed-in code paths must use
// the /community/** twins instead. The payload is redacted server-side — no
// `user` key at all, and questions[].notes carries only its first sentence.

export const getPublicPosts = (params = {}) => {
  return API.get('/community/public/posts/search', { params });
};

// Company directory + site-wide roll-up. Byte-identical to the authenticated
// /community/companies/stats, so the same parser and types serve both.
export const getPublicCompaniesStats = (params = {}) => {
  return API.get('/community/public/companies/stats', { params });
};

// One company's { displayName, category, summary, postCount, recentPostCount,
// latestUpdatedAt, passEligible }. Matches on display name, case-insensitively.
// A company that does not exist comes back as HTTP 400 with
// errorCode NOT_FOUND — not a 404. Branch on errorCode, never on the status.
export const getPublicCompanyProfile = (company) => {
  return API.get('/community/public/companies/profile', { params: { company } });
};

/**
 * Read GET /community/public/posts/search into a fixed shape.
 *
 * The endpoint returns { posts, total, size, page }. Only that contract is
 * accepted: an earlier deployment answered with a bare PostDto[] and ignored
 * every query parameter, but frontend and API ship together, so that shape
 * cannot reach this code. Tolerating it here would mean carrying a branch that
 * never runs and cannot be tested — and, worse, one that quietly trusts a
 * response whose `company` filter was never applied.
 *
 * Anything else degrades to an empty page rather than to unfiltered results,
 * so a shape surprise reads as "nothing here" and not as another company's
 * notes under this company's heading.
 */
export const normalizePublicPosts = (res) => {
  const data = res?.data?.data ?? res?.data;
  const posts = Array.isArray(data?.posts) ? data.posts : [];
  return {
    posts,
    total: Number.isFinite(data?.total) ? data.total : posts.length,
    size: Number.isFinite(data?.size) ? data.size : 10,
    page: Number.isFinite(data?.page) ? data.page : 0,
  };
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

// Grouped option lists for the "Share Your Experience" posting form and the
// search-page filters. Returns { roles, categories, rounds } as arrays of
// { category, options } groups, plus a flat `companies` string array.
// Requires a normal CANDIDATE JWT (no X-Service-Token — that is the internal
// AI-only /internal/community/posting-context endpoint, now 401 for the frontend).
export const getPostOptions = () => {
  return API.get('/community/posts/options');
};

// Dynamic company list (companies that actually have posts) — used by the
// search page's company filter. Distinct from the fixed `companies` array in
// getPostOptions(), which is only for the posting form.
export const getCommunityCompanies = (params = {}) => {
  return API.get('/community/companies', { params });
};

export const getPost = (postId) => {
  return API.get(`/community/posts/${postId}`);
};

// Public single-post read for signed-out visitors.
//
// There is no GET /community/public/posts/{id} — that path 404s. Single-post
// access is a parameter on the list endpoint, which returns 0 or 1 rows and
// deliberately does not distinguish "no such post" from "not published", so
// neither should the UI.
export const getPublicPost = (postId) => {
  return API.get('/community/public/posts/search', { params: { postId } });
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

// Signed-out read of one post's discussion.
//
// ⚠️ NOT DEPLOYED YET. The authenticated route above answers 401 without a
// token and there is no public twin: as of 2026-09-10 this path 404s on
// staging (`Resource not found: community/public/posts/{id}/comments`).
// Callers must keep PUBLIC_COMMENTS_ENABLED (experience-detail.tsx) false
// until the backend ships it, or every guest visit fires a 404.
//
// The path follows the same convention as the other three public reads —
// /community/public/** mirroring /community/** — so if the backend picks a
// different shape, this is the one line to change. It is expected to be
// redacted the same way /community/public/posts/search is: no `user` object
// on comments posted non-anonymously by other people.
export const getPublicComments = (postId, query = {}) => {
  return API.get(`/community/public/posts/${postId}/comments`, { params: query });
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
