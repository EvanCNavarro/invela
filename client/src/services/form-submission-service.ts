/**
 * Unified Form Submission Service
 * 
 * This service provides a unified interface for form submissions across different form types.
 * It integrates WebSocket events to provide real-time feedback on form submission status.
 */

import { apiRequest } from '@/lib/queryClient';

/**
 * Type definitions for form submission data
 */
export type FormData = Record<string, any>;

/**
 * Form types supported by the application
 */
export const FORM_TYPES = {
  KYB: 'kyb',
  KY3P: 'ky3p',
  OPEN_BANKING: 'open_banking',
  CARD: 'card',
  SECURITY_ASSESSMENT: 'security_assessment',
  COMPANY_KYB: 'company_kyb',
  SECURITY: 'security',
  SP_KY3P_ASSESSMENT: 'sp_ky3p_assessment'
};

class FormSubmissionService {
  /**
   * Submit a form to the appropriate endpoint based on form type
   * 
   * @param taskId The task ID
   * @param taskType The task type (e.g., 'kyb', 'ky3p', 'open_banking', 'card')
   * @param formData The form data to submit
   * @returns Promise with the submission result
   */
  async submitForm(taskId: number, taskType: string, formData: FormData): Promise<any> {
    console.log(`[FormSubmissionService] Submitting ${taskType} form for task ${taskId}`);
    
    try {
      // Use unified form submission endpoint
      const result = await apiRequest(`/api/form-submission`, {
        method: 'POST',
        body: JSON.stringify({
          taskId,
          formType: taskType,
          formData,
          metadata: {
            submissionDate: new Date().toISOString(),
            explicitSubmission: true
          }
        })
      });
      
      console.log(`[FormSubmissionService] Form submission response:`, result);
      return result;
      
    } catch (error) {
      console.error(`[FormSubmissionService] Error submitting form:`, error);
      throw error;
    }
  }
  
  /**
   * Check the status of a form submission
   * 
   * @param taskId The task ID
   * @returns Promise with the submission status
   */
  async checkSubmissionStatus(taskId: number): Promise<any> {
    console.log(`[FormSubmissionService] Checking submission status for task ${taskId}`);
    
    try {
      const result = await apiRequest(`/api/form-submission/status/${taskId}`);
      console.log(`[FormSubmissionService] Submission status:`, result);
      return result;
      
    } catch (error) {
      console.error(`[FormSubmissionService] Error checking submission status:`, error);
      throw error;
    }
  }
  
  /**
   * Retry a failed form submission
   * 
   * @param taskId The task ID
   * @param formType The form type
   * @returns Promise with the retry result
   */
  async retrySubmission(taskId: number, formType: string): Promise<any> {
    console.log(`[FormSubmissionService] Retrying submission for task ${taskId}`);
    
    try {
      const result = await apiRequest(`/api/form-submission/retry/${taskId}`, {
        method: 'POST',
        body: JSON.stringify({
          formType,
          timestamp: new Date().toISOString()
        })
      });
      
      console.log(`[FormSubmissionService] Retry response:`, result);
      return result;
      
    } catch (error) {
      console.error(`[FormSubmissionService] Error retrying submission:`, error);
      throw error;
    }
  }
  
  /**
   * Trigger a test form submission event via WebSocket
   * 
   * This is for testing purposes only and doesn't actually submit a form
   * 
   * @param taskId The task ID
   * @param formType The form type
   * @param companyId The company ID
   * @param status The submission status (success, error, in_progress)
   * @returns Promise with the test result
   */
  async testFormSubmission(
    taskId: number, 
    formType: string, 
    companyId: number,
    status: 'success' | 'error' | 'in_progress'
  ): Promise<any> {
    console.log(`[FormSubmissionService] Testing form submission event with status: ${status}`);
    
    try {
      const result = await fetch(
        `/api/test/form-submission/broadcast?taskId=${taskId}&formType=${formType}&companyId=${companyId}&status=${status}`
      ).then(response => response.json());
      
      console.log(`[FormSubmissionService] Test response:`, result);
      return result;
      
    } catch (error) {
      console.error(`[FormSubmissionService] Error testing form submission:`, error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export default new FormSubmissionService();