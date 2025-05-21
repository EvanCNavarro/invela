/**
 * Form Submission Service
 * 
 * This service provides a unified API for form submissions with WebSocket integration.
 * It handles the form submission process, including:
 * 1. Client-side validation
 * 2. WebSocket connection setup
 * 3. Form data submission
 * 4. Status tracking
 * 5. Success/error handling
 * 6. Optimized final submission without redundant data transfer
 */

import getLogger from '@/utils/logger';
import { toast } from '@/hooks/use-toast';
import { submitFormTransactional } from '@/api/form-submission-api';

const logger = getLogger('FormSubmissionService');

export interface FormSubmissionOptions {
  taskId: number;
  formType: string;
  companyId?: number;
  formData: Record<string, any>;
  onSuccess?: (result: FormSubmissionResult) => void;
  onError?: (error: Error) => void;
  onInProgress?: () => void;
  showToasts?: boolean;
  isFinalSubmit?: boolean; // Flag to indicate this is the final submission
}

export interface FormSubmissionResult {
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
}

/**
 * Submit a form with WebSocket progress updates
 */
export async function submitFormWithWebSocketUpdates(options: FormSubmissionOptions): Promise<FormSubmissionResult> {
  const { 
    taskId, 
    formType, 
    companyId, 
    formData, 
    onSuccess, 
    onError, 
    onInProgress,
    showToasts = true,
    isFinalSubmit = false
  } = options;

  try {
    // Use streamlined submission path for final submit with no new data
    if (isFinalSubmit) {
      return await submitFormFinal(taskId, formType, companyId, onSuccess, onError, onInProgress, showToasts);
    }
    
    logger.info(`Starting form submission for task ${taskId} (${formType})`);
    
    // Show in-progress indication
    if (showToasts) {
      toast({
        title: "Submitting form...",
        description: "Please wait while your form is being processed.",
        variant: "default",
        duration: 3000,
      });
    }
    
    // Call in-progress callback
    if (onInProgress) {
      onInProgress();
    }
    
    // Submit the form data to the server using the transactional endpoint
    const result = await submitFormTransactional(taskId, formType, formData, companyId);
    
    logger.info(`Form submission completed successfully for task ${taskId}`, result);
    
    // Show success toast if needed
    if (showToasts) {
      toast({
        title: "Form submitted successfully",
        description: result.message || "Your form has been processed successfully.",
        variant: "success",
        duration: 5000,
      });
    }
    
    // Call success callback if provided
    if (onSuccess) {
      onSuccess(result);
    }
    
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    logger.error(`Form submission failed for task ${taskId}:`, error);
    
    // Show error toast if needed
    if (showToasts) {
      toast({
        title: "Form submission failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    }
    
    // Call error callback if provided
    if (onError && error instanceof Error) {
      onError(error);
    }
    
    throw error;
  }
}

/**
 * Optimized final form submission that doesn't resend existing data
 * This is used when all data is already saved incrementally and we just need to finalize
 */
async function submitFormFinal(
  taskId: number, 
  formType: string, 
  companyId?: number,
  onSuccess?: (result: FormSubmissionResult) => void,
  onError?: (error: Error) => void,
  onInProgress?: () => void,
  showToasts = true
): Promise<FormSubmissionResult> {
  try {
    logger.info(`Starting optimized final submission for task ${taskId} (${formType})`);
    
    // Show in-progress indication
    if (showToasts) {
      toast({
        title: "Finalizing submission...",
        description: "Processing your completed form...",
        variant: "default",
        duration: 3000,
      });
    }
    
    // Call in-progress callback
    if (onInProgress) {
      onInProgress();
    }
    
    // Use an empty object for formData to signal final submission
    const result = await submitFormTransactional(taskId, formType, {}, companyId);
    
    logger.info(`Final submission completed successfully for task ${taskId}`, result);
    
    // Show success toast if needed
    if (showToasts) {
      toast({
        title: "Form submitted successfully",
        description: result.message || "Your form has been processed successfully.",
        variant: "success",
        duration: 5000,
      });
    }
    
    // Call success callback if provided
    if (onSuccess) {
      onSuccess(result);
    }
    
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    logger.error(`Final form submission failed for task ${taskId}:`, error);
    
    // Show error toast if needed
    if (showToasts) {
      toast({
        title: "Form submission failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    }
    
    // Call error callback if provided
    if (onError && error instanceof Error) {
      onError(error);
    }
    
    throw error;
  }
}

/**
 * Check form submission status
 */
export async function checkFormSubmissionStatus(taskId: number, formType: string): Promise<FormSubmissionResult> {
  try {
    const response = await fetch(`/api/submissions/status/${formType}/${taskId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to check submission status: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    logger.error(`Error checking submission status for task ${taskId}:`, error);
    throw error;
  }
}

/**
 * Form Submission Service default export
 */
const formSubmissionService = {
  submitFormWithWebSocketUpdates,
  checkFormSubmissionStatus
};

export default formSubmissionService;