import API from './api';

// Base endpoint for admin operations
const BASE_URL = '/admin';

/**
 * Approve an application
 * @param {string} email - User email to approve
 * @returns {Promise} - API response
 */
export const approveApplication = (email: string) => {
  if (!email) {
    console.warn('Warning: Approving application without email');
    throw new Error('Email is required for approving application');
  }
  
  return API.post(`${BASE_URL}/approve-app`, { email });
};

/**
 * Get disabled accounts
 * @param {Object} params - Query parameters
 * @returns {Promise} - API response with disabled accounts
 */
export const getDisabledAccounts = (params = {}) => {
  return API.get(`${BASE_URL}/disabled-accounts`, { params });
};

/**
 * Get contacts
 * @param {Object} params - Query parameters
 * @returns {Promise} - API response with contacts
 */
export const getContacts = (params = {}) => {
  return API.get(`${BASE_URL}/contacts`, { params });
};

/**
 * Update a contact
 * @param {string} contactId - Contact ID to update
 * @param {Object} data - Updated contact data
 * @returns {Promise} - API response
 */
export const updateContact = (contactId: string, data: any) => {
  return API.put(`${BASE_URL}/contacts/${contactId}`, data);
};

/**
 * Delete a contact
 * @param {string} contactId - Contact ID to delete
 * @returns {Promise} - API response
 */
export const deleteContact = (contactId: string) => {
  return API.delete(`${BASE_URL}/contacts/${contactId}`);
};