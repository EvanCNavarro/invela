/**
 * Form Submission API
 * 
 * This module provides API functions for form submission operations.
 */

import { apiRequest } from '@/lib/queryClient';

/**
 * Submit a form to the server
 * 
 * @param taskId - The ID of the task
 * @param formType - The type of form (kyb, ky3p, open_banking, etc.)
 * @param formData - The form data to submit
 * @param companyId - Optional company ID
 * @returns The submission result
 */
export async function submitForm(
  taskId: number, 
  formType: string, 
  formData: Record<string, any>,
  companyId?: number
): Promise<{
  success: boolean;
  message: string;
  taskId: number;
  formType: string;
  submissionDate: string;
  status: string;
  unlockedTabs?: string[];
  fileName?: string;
  fileId?: number;
  error?: string;
  timestamp?: string;
}> {
  const url = `/api/forms/submit/${formType}/${taskId}`;
  
  const payload = {
    formData,
    companyId
  };
  
  // Use the correct signature for apiRequest: (method, url, data)
  // apiRequest already returns the parsed JSON response
  return await apiRequest('POST', url, payload);
}

/**
 * Get form submission status
 * 
 * @param taskId - The ID of the task
 * @param formType - The type of form
 * @returns The submission status
 */
export async function getFormSubmissionStatus(
  taskId: number,
  formType: string
): Promise<{
  success: boolean;
  status: string;
  message: string;
  submissionDate?: string;
}> {
  const url = `/api/forms/status/${formType}/${taskId}`;
  
  // apiRequest already handles error checking and JSON parsing
  return await apiRequest(url);
}