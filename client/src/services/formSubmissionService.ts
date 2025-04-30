/**
 * Form Submission Service
 * 
 * This service provides functions for form submission tracking and notifications.
 */

import { apiRequest } from '../utils/api';

/**
 * Submit a form for processing
 * 
 * @param taskId The task ID
 * @param formType The form type (e.g., 'kyb', 'ky3p', 'open_banking')
 * @param formData The form data to submit
 * @param metadata Optional metadata for the submission
 * @returns Promise with the submission response
 */
export async function submitForm(
  taskId: number,
  formType: string,
  formData: Record<string, any>,
  metadata?: Record<string, any>
) {
  return apiRequest('/api/form-submission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taskId,
      formType,
      formData,
      metadata,
    }),
  });
}

/**
 * Check the status of a form submission
 * 
 * @param taskId The task ID to check
 * @returns Promise with the status response
 */
export async function checkSubmissionStatus(taskId: number) {
  return apiRequest(`/api/form-submission/status/${taskId}`);
}

/**
 * Retry a failed form submission
 * 
 * @param taskId The task ID to retry
 * @param formType The form type
 * @returns Promise with the retry response
 */
export async function retrySubmission(taskId: number, formType: string) {
  return apiRequest(`/api/form-submission/retry/${taskId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      formType,
    }),
  });
}

/**
 * Test function to broadcast a form submission event via WebSocket
 * This is used for testing only and should not be used in production
 * 
 * @param taskId The task ID
 * @param formType The form type
 * @param companyId The company ID
 * @returns Promise with the test response
 */
export async function testFormSubmissionBroadcast(
  taskId: number,
  formType: string,
  companyId: number
) {
  return apiRequest('/api/test/websocket/broadcast-form-submission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taskId,
      formType,
      companyId,
    }),
  });
}

export default {
  submitForm,
  checkSubmissionStatus,
  retrySubmission,
  testFormSubmissionBroadcast,
};