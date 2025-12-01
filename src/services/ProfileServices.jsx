import API from "./api";

// Base endpoint for profile
const BASE_URL = '/profile';

/**
 * Get complete profile data
 * @returns {Promise} API response with full profile including resume data
 */
export const getProfile = () => {
  return API.get(BASE_URL);
};

/**
 * Save complete profile data
 * @param {Object} profileData - Complete profile data structure
 * @returns {Promise} API response
 */
export const updateProfile = (profileData) => {
  return API.post(BASE_URL, profileData);
};

/**
 * Upload resume file for parsing
 * @param {File} file - Resume file (PDF, DOC, DOCX)
 * @returns {Promise} API response with structured resume data
 */
export const uploadResume = (file) => {
  const formData = new FormData();
  formData.append('file', file);
       
  return API.post(`${BASE_URL}/upload-resume`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Export as default object for easier imports
const ProfileService = {
  getProfile,
  updateProfile,
  uploadResume,
};

export default ProfileService;