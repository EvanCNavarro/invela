/**
 * Form Submission Service
 * 
 * This service handles the submission of form data to the server
 * and manages WebSocket-based feedback for form submissions.
 */

import { apiRequest } from '@/lib/queryClient';

interface FormSubmissionRequest {
  taskId: number;
  formType: string;
  formData: Record<string, any>;
  fileName?: string;
}

interface FormSubmissionResponse {
  success: boolean;
  error?: string;
  taskId?: number;
  formType?: string;
  status?: string;
  details?: string;
  fileId?: number;
  fileName?: string;
  unlockedTabs?: string[];
  unlockedTasks?: number[];
}

/**
 * Format success actions for display in UI
 */
export function formatSuccessActions(response: FormSubmissionResponse): string[] {
  const actions: string[] = [];
  
  // Add details if available
  if (response.details) {
    actions.push(response.details);
  }
  
  // Add file information
  if (response.fileName) {
    actions.push(`Generated file: ${response.fileName}`);
  }
  
  // Add unlocked tabs information
  if (response.unlockedTabs && response.unlockedTabs.length > 0) {
    actions.push(`Unlocked tabs: ${response.unlockedTabs.join(', ')}`);
  }
  
  // Add unlocked tasks information
  if (response.unlockedTasks && response.unlockedTasks.length > 0) {
    actions.push(`Unlocked tasks: ${response.unlockedTasks.length} task(s)`);
  }
  
  // If no specific actions, add a generic success message
  if (actions.length === 0) {
    actions.push('Form submitted successfully.');
  }
  
  return actions;
}

/**
 * Form Submission Service
 * 
 * Handles the submission of forms to the server and provides feedback
 * on the submission status.
 */
export const formSubmissionService = {
  /**
   * Submit a form to the server
   * 
   * @param request Form submission request with taskId, formType, and formData
   * @returns Promise resolving to submission result
   */
  async submitForm(request: FormSubmissionRequest): Promise<FormSubmissionResponse> {
    try {
      // Ensure taskId is included in the form data
      const formData = {
        ...request.formData,
        taskId: request.taskId
      };
      
      // Prepare the request body according to API contract
      const requestBody = {
        formType: request.formType,
        formData,
        fileName: request.fileName
      };
      
      // Submit the form to the unified endpoint
      const response = await apiRequest('/api/form-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      // Check for success/failure
      if (response.success) {
        console.log(`[FormSubmissionService] Form submission successful:`, response);
        return {
          success: true,
          taskId: response.taskId,
          formType: response.formType,
          status: response.status,
          details: response.details,
          fileId: response.fileId,
          fileName: response.fileName,
          unlockedTabs: response.unlockedTabs,
          unlockedTasks: response.unlockedTasks
        };
      } else {
        console.error(`[FormSubmissionService] Form submission failed:`, response.error);
        return {
          success: false,
          error: response.error || 'Unknown error occurred'
        };
      }
    } catch (error) {
      console.error(`[FormSubmissionService] Error submitting form:`, error);
      return {
        success: false,
        error: (error as Error).message || 'Network error occurred'
      };
    }
  }
};

export default formSubmissionService;