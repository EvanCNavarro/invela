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

/**
 * Test function to broadcast a form error event via WebSocket
 * This is used for testing only and should not be used in production
 * 
 * @param taskId The task ID
 * @param formType The form type
 * @param companyId The company ID
 * @param errorMessage Optional error message
 * @returns Promise with the test response
 */
export async function testFormErrorBroadcast(
  taskId: number,
  formType: string,
  companyId: number,
  errorMessage?: string
) {
  return apiRequest('/api/test/websocket/broadcast-form-error', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taskId,
      formType,
      companyId,
      errorMessage,
    }),
  });
}

/**
 * Test function to broadcast a form in-progress event via WebSocket
 * This is used for testing only and should not be used in production
 * 
 * @param taskId The task ID
 * @param formType The form type
 * @param companyId The company ID
 * @returns Promise with the test response
 */
export async function testFormInProgressBroadcast(
  taskId: number,
  formType: string,
  companyId: number
) {
  return apiRequest('/api/test/websocket/broadcast-in-progress', {
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

/**
 * Function to send a direct WebSocket message for testing
 * This is used to test custom WebSocket message types
 * 
 * @param type The message type
 * @param payload The message payload
 * @returns Promise that resolves when the message is sent
 */
export async function sendWebSocketTestMessage(type: string, payload: any) {
  return apiRequest('/api/test/websocket/custom-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      payload,
    }),
  });
}

export default {
  submitForm,
  checkSubmissionStatus,
  retrySubmission,
  testFormSubmissionBroadcast,
  testFormErrorBroadcast,
  testFormInProgressBroadcast,
  sendWebSocketTestMessage,
};