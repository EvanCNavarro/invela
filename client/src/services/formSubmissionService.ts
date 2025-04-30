/**
 * Form Submission Service
 * 
 * This service centralizes form submission logic across different form types
 * and handles the submission process, response formatting, and feedback.
 */
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

// Types for form submission
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
  
  // Add file creation action
  if (result.fileId && result.fileName) {
    actions.push(`Created file: ${result.fileName}`);
  }
  
  // Add unlocked tabs action
  if (result.unlockedTabs && result.unlockedTabs.length > 0) {
    actions.push(`Unlocked tabs: ${result.unlockedTabs.join(', ')}`);
  }
  
  // Add unlocked tasks action
  if (result.unlockedTasks && result.unlockedTasks.length > 0) {
    actions.push(`Unlocked tasks: ${result.unlockedTasks.length} new task(s)`);
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
      // Send the form data to the unified endpoint
      const response = await apiRequest({
        url: `/api/tasks/${taskId}/submit`,
        method: 'POST',
        data: {
          formType,
          formData,
          fileName
        }
      });
      
      // If the submission was successful
      if (response.success) {
        // Invalidate queries that might be affected by this submission
        const queryClient = useQueryClient();
        
        // Invalidate task queries for this specific task
        queryClient.invalidateQueries({
          queryKey: [`/api/tasks/${taskId}`]
        });
        
        // Invalidate the tasks list
        queryClient.invalidateQueries({
          queryKey: ['/api/tasks']
        });
        
        // Invalidate company tabs if they might be affected
        if (response.unlockedTabs && response.unlockedTabs.length > 0) {
          queryClient.invalidateQueries({
            queryKey: ['/api/companies/current']
          });
        }
        
        // Call the success callback if provided
        if (onSuccess) {
          onSuccess(response);
        }
      } else {
        // Handle API-level errors (successful HTTP response, but API indicates error)
        const error = new Error(response.error || 'Form submission failed');
        
        if (onError) {
          onError(error);
        }
        
        throw error;
      }
      
      return response;
    } catch (error) {
      // Handle network or unexpected errors
      const formattedError = error instanceof Error ? 
        error : 
        new Error('An unexpected error occurred during form submission');
      
      // Call the error callback if provided
      if (onError) {
        onError(formattedError);
      }
      
      throw formattedError;
    }
  }
};

export default formSubmissionService;