/**
 * Form Submission Service
 * 
 * This service centralizes form submission logic across different form types
 * and handles the submission process, response formatting, and feedback.
 */

import { apiRequest } from '@/lib/queryClient';

export interface FormSubmissionOptions {
  taskId: number;
  formType: string;
  formData: Record<string, any>;
  fileName?: string;
  onSuccess?: (result: FormSubmissionResponse) => void;
  onError?: (error: Error) => void;
}

export interface FormSubmissionResponse {
  success: boolean;
  taskId: number;
  formType: string;
  status: string;
  details?: string;
  fileId?: number;
  fileName?: string;
  unlockedTabs?: string[];
  unlockedTasks?: number[];
  error?: string;
}

/**
 * Format success actions to display in the success modal
 * 
 * @param result The form submission response
 * @returns Array of formatted action strings
 */
export function formatSuccessActions(result: FormSubmissionResponse): string[] {
  const actions: string[] = [];
  
  // Add basic success message
  actions.push(`Form has been successfully submitted.`);
  
  // Add file generation message if applicable
  if (result.fileId && result.fileName) {
    actions.push(`Generated file "${result.fileName}" (ID: ${result.fileId}).`);
  }
  
  // Add unlocked tasks message if applicable
  if (result.unlockedTasks && result.unlockedTasks.length > 0) {
    actions.push(`Unlocked ${result.unlockedTasks.length} dependent task(s).`);
  }
  
  // Add unlocked tabs message if applicable
  if (result.unlockedTabs && result.unlockedTabs.length > 0) {
    const readableTabs = result.unlockedTabs.map(tab => 
      tab.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    );
    actions.push(`Unlocked new company features: ${readableTabs.join(', ')}.`);
  }
  
  return actions;
}

/**
 * Centralized form submission service
 */
export const formSubmissionService = {
  /**
   * Submit a form of any type using the unified endpoint
   * 
   * @param options Form submission options
   * @returns Promise with submission result
   */
  submitForm: async (options: FormSubmissionOptions): Promise<FormSubmissionResponse> => {
    const { taskId, formType, formData, fileName, onSuccess, onError } = options;
    
    try {
      // Make API request using the unified submission endpoint
      const response = await apiRequest({
        url: `/api/form-submission`,
        method: 'POST',
        data: {
          formType,
          formData,
          fileName
        }
      });
      
      // Validate response
      if (!response || !response.success) {
        throw new Error(response?.error || 'Form submission failed');
      }
      
      // Format the response
      const result: FormSubmissionResponse = {
        success: true,
        taskId,
        formType,
        status: response.status || 'submitted',
        details: response.details,
        fileId: response.fileId,
        fileName: response.fileName,
        unlockedTabs: response.unlockedTabs,
        unlockedTasks: response.unlockedTasks
      };
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (error) {
      console.error('[FormSubmissionService] Error submitting form:', error);
      
      // Call error callback if provided
      if (onError) {
        onError(error as Error);
      }
      
      // Return error response
      return {
        success: false,
        taskId,
        formType,
        status: 'error',
        error: (error as Error).message
      };
    }
  }
};

export default formSubmissionService;