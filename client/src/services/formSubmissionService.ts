/**
 * Universal Form Submission Service
 * 
 * This service provides a standardized interface for submitting all form types
 * (KYB, KY3P, Open Banking) using a consistent pattern.
 * 
 * Features:
 * - Uses a single endpoint pattern for all form types
 * - Handles all form submission states (loading, success, error)
 * - Provides detailed feedback and standardized response format
 * - Logs all submission steps for debugging and verification
 */

import { toast } from '@/hooks/use-toast';
import getLogger from '@/utils/logger';

const logger = getLogger('FormSubmissionService');

export interface SubmissionOptions {
  taskId: number;
  formType: string;
  formData: Record<string, any>;
  fileName?: string;
  showToasts?: boolean;
  onSuccess?: (result: SubmissionResult) => void;
  onError?: (error: Error) => void;
}

export interface SubmissionResult {
  success: boolean;
  taskId: number;
  formType: string;
  status: string;
  fileId?: number;
  fileName?: string;
  details?: string;
  unlockedTabs?: string[];
  unlockedTasks?: Array<{id: number, title: string}>;
  error?: string;
}

/**
 * Success action displayed in the success modal
 */
export interface SuccessAction {
  label: string;
  description: string;
}

/**
 * Format success actions for the modal based on the submission result
 */
export function formatSuccessActions(result: any): SuccessAction[] {
  const actions: SuccessAction[] = [
    { 
      label: "Form Submitted", 
      description: "Your form has been successfully processed and submitted." 
    }
  ];
  
  // Add file creation action if a file was created
  if (result.fileId) {
    actions.push({
      label: "File Created",
      description: `A file of your submission has been created${result.fileName ? `: ${result.fileName}` : '.'}`
    });
  }
  
  // Add unlocked tabs if any
  if (result.unlockedTabs && result.unlockedTabs.length > 0) {
    actions.push({
      label: "Tabs Unlocked",
      description: `The following tabs are now available: ${result.unlockedTabs.join(', ')}`
    });
  }
  
  // Add unlocked tasks if any
  if (result.unlockedTasks && result.unlockedTasks.length > 0) {
    actions.push({
      label: "Tasks Unlocked",
      description: `The following tasks are now available: ${result.unlockedTasks.map(t => t.title).join(', ')}`
    });
  }
  
  // Add risk score if generated
  if (result.riskScore) {
    actions.push({
      label: "Risk Score Generated",
      description: `A risk score of ${result.riskScore} has been calculated based on your submission.`
    });
  }
  
  return actions;
}

/**
 * Universal Form Submission Service
 */
export const formSubmissionService = {
  /**
   * Submit any form type using the unified endpoint
   */
  submitForm: async (options: SubmissionOptions): Promise<SubmissionResult> => {
    const { 
      taskId, 
      formType, 
      formData, 
      fileName, 
      showToasts = true,
      onSuccess, 
      onError 
    } = options;
    
    logger.info(`Starting ${formType} form submission for task ${taskId}`, { 
      taskId, 
      formType, 
      timestamp: new Date().toISOString() 
    });
    
    // Show loading toast if enabled
    if (showToasts) {
      toast({
        title: `Submitting ${formType.toUpperCase()} Form`,
        description: "Please wait while we process your submission...",
        variant: "default",
        duration: null, // Infinite duration for loading toasts
      });
    }
    
    try {
      // Always use the universal endpoint for all form types
      const endpoint = `/api/tasks/${taskId}/submit`;
      
      logger.info(`Submitting to unified endpoint: ${endpoint}`, { 
        taskId, 
        formType, 
        fieldCount: Object.keys(formData).length 
      });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          formType,
          formData,
          fileName,
          timestamp: new Date().toISOString()
        })
      });
      
      // Handle non-successful responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `Server returned status ${response.status}` 
        }));
        
        const errorMessage = errorData.error || `Failed to submit ${formType} form`;
        
        logger.error(`Submission failed with status ${response.status}`, { 
          error: errorMessage, 
          status: response.status,
          response: errorData
        });
        
        throw new Error(errorMessage);
      }
      
      // Parse successful response
      const result = await response.json();
      
      logger.info(`${formType} form submission successful`, { 
        taskId, 
        formType,
        fileId: result.fileId,
        fileName: result.fileName
      });
      
      // Show success toast if enabled
      if (showToasts) {
        // Clear existing toasts first
        toast.dismiss();
        
        toast({
          title: 'Form Submitted',
          description: `Your ${formType.toUpperCase()} form has been successfully submitted.`,
          variant: 'success',
          duration: 5000,
        });
      }
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result);
      }
      
      // Return standardized result
      return {
        success: true,
        taskId,
        formType,
        status: 'submitted',
        ...result
      };
    } catch (error) {
      logger.error(`Submission error`, { 
        taskId, 
        formType, 
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Show error toast if enabled
      if (showToasts) {
        // Clear existing toasts first
        toast.dismiss();
        
        toast({
          title: 'Submission Failed',
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive',
          duration: 8000,
        });
      }
      
      // Call error callback if provided
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
      
      // Return error result
      return {
        success: false,
        taskId,
        formType,
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
};

export default formSubmissionService;