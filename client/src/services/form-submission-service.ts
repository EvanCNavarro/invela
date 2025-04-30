/**
 * Unified Form Submission Service
 * 
 * This service provides a unified interface for form submissions across different form types.
 * It integrates WebSocket events to provide real-time feedback on form submission status.
 */

import { toast } from '@/hooks/use-toast';
import getLogger from '@/utils/logger';

// Import the submission tracker for event tracking
import submissionTracker from '@/utils/submission-tracker';

// Define the FormData type for type safety
export type FormData = Record<string, any>;

// Logger for this service
const logger = getLogger('FormSubmissionService', {
  levels: { debug: true, info: true, warn: true, error: true }
});

// Define form types constants
export const FORM_TYPES = {
  KYB: 'kyb',
  KY3P: 'ky3p',
  OPEN_BANKING: 'open_banking',
  CARD: 'card',
};

/**
 * Submit a form to the appropriate endpoint based on form type
 * 
 * @param taskId The task ID
 * @param taskType The task type (e.g., 'kyb', 'ky3p', 'open_banking', 'card')
 * @param formData The form data to submit
 * @returns Promise with the submission result
 */
export async function submitForm(taskId: number, taskType: string, formData: FormData): Promise<any> {
  try {
    // Start tracking the submission
    submissionTracker.startTracking(taskId.toString(), taskType);
    submissionTracker.trackEvent('Form submission started', { taskType });
    
    // Log the submission attempt
    logger.info(`Submitting ${taskType} form for task ${taskId}`);
    
    // Determine the endpoint based on the form type
    let endpoint: string;
    
    switch (taskType) {
      case FORM_TYPES.KYB:
        endpoint = `/api/kyb/submit/${taskId}`;
        break;
      case FORM_TYPES.KY3P:
        endpoint = `/api/ky3p/submit/${taskId}`;
        break;
      case FORM_TYPES.OPEN_BANKING:
        endpoint = `/api/open-banking/submit/${taskId}`;
        break;
      case FORM_TYPES.CARD:
        endpoint = `/api/card/submit/${taskId}`;
        break;
      default:
        endpoint = `/api/forms/submit/${taskType}/${taskId}`;
    }
    
    // Show an initial toast to indicate the submission is in progress
    toast({
      title: "Submitting Form",
      description: "Your form is being submitted...",
      variant: "info",
    });
    
    submissionTracker.trackEvent('Sending to API endpoint', { endpoint });
    
    // Prepare the submission data with additional context
    const submissionData = {
      ...formData,
      taskId,
      taskType,
      timestamp: new Date().toISOString(),
      explicitSubmission: true,
    };
    
    // Make the API request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionData),
    });
    
    // Process the response
    const responseData = await response.json();
    
    // Check if the submission was successful
    if (!response.ok) {
      throw new Error(responseData.message || 'Form submission failed');
    }
    
    // Log the successful submission
    logger.info(`Form submission for task ${taskId} was successful`, responseData);
    submissionTracker.trackEvent('API submission successful', { status: response.status });
    submissionTracker.stopTracking(true);
    
    // Return the response data
    return responseData;
    
  } catch (error) {
    // Log the error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during form submission';
    logger.error(`Form submission error for task ${taskId}:`, error);
    
    // Track the error
    submissionTracker.trackEvent('API submission failed', { error: errorMessage });
    submissionTracker.stopTracking(false);
    
    // Show an error toast
    toast({
      title: "Submission Failed",
      description: errorMessage,
      variant: "destructive",
    });
    
    // Re-throw the error to let the calling component handle it
    throw error;
  }
}

/**
 * Check the status of a form submission
 * 
 * @param taskId The task ID
 * @returns Promise with the submission status
 */
export async function checkSubmissionStatus(taskId: number): Promise<any> {
  try {
    // Make the API request
    const response = await fetch(`/api/tasks/${taskId}/submission-status`);
    
    // Process the response
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to check submission status');
    }
    
    return data;
    
  } catch (error) {
    logger.error(`Error checking submission status for task ${taskId}:`, error);
    throw error;
  }
}

export default {
  submitForm,
  checkSubmissionStatus,
  FORM_TYPES,
};