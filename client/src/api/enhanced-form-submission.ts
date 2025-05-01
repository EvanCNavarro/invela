/**
 * Enhanced Form Submission API
 * 
 * This API provides improved form submission capability that ensures
 * form files are properly tracked and displayed in the File Vault UI.
 */

import { toast } from '@/hooks/use-toast';
import { Logger } from '../utils/logger';

const logger = new Logger('EnhancedFormSubmission');

/**
 * Base result type for form submissions
 */
export interface FormSubmissionResult {
  success: boolean;
  fileId?: number | string;
  message?: string;
  error?: string;
}

/**
 * Submit a KYB form using the enhanced form submission endpoint
 * 
 * @param taskId The ID of the task to submit
 * @param formData The form data to submit
 * @param onSuccess Optional success callback
 * @param onError Optional error callback
 */
export async function submitKybForm(
  taskId: number,
  formData: Record<string, any>,
  onSuccess?: (data: any) => void,
  onError?: (error: Error) => void
): Promise<FormSubmissionResult> {
  try {
    logger.info(`Submitting KYB form with enhanced tracking:`, {
      taskId,
      formDataKeys: Object.keys(formData).length
    });
    
    const response = await fetch(`/api/kyb/enhanced-submit/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ formData })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error || 'Form submission failed';
      logger.error(`Enhanced KYB form submission failed:`, {
        taskId,
        status: response.status,
        errorMessage
      });
      
      if (onError) {
        onError(new Error(errorMessage));
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
    
    const data = await response.json();
    logger.info(`Enhanced KYB form submission succeeded:`, {
      taskId,
      fileId: data.fileId,
      taskStatus: data.taskStatus
    });
    
    if (onSuccess) {
      onSuccess(data);
    }
    
    return {
      success: true,
      fileId: data.fileId,
      message: data.message || 'Form submitted successfully'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Exception in enhanced KYB form submission:`, {
      taskId,
      error: errorMessage
    });
    
    if (onError) {
      onError(error instanceof Error ? error : new Error(errorMessage));
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Submit a KY3P form using the enhanced form submission endpoint
 * 
 * @param taskId The ID of the task to submit
 * @param formData The form data to submit
 * @param onSuccess Optional success callback
 * @param onError Optional error callback
 */
export async function submitKy3pForm(
  taskId: number,
  formData: Record<string, any>,
  onSuccess?: (data: any) => void,
  onError?: (error: Error) => void
): Promise<FormSubmissionResult> {
  try {
    logger.info(`Submitting KY3P form with enhanced tracking:`, {
      taskId,
      formDataKeys: Object.keys(formData).length
    });
    
    const response = await fetch(`/api/ky3p/enhanced-submit/${taskId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ formData })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error || 'Form submission failed';
      logger.error(`Enhanced KY3P form submission failed:`, {
        taskId,
        status: response.status,
        errorMessage
      });
      
      if (onError) {
        onError(new Error(errorMessage));
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
    
    const data = await response.json();
    logger.info(`Enhanced KY3P form submission succeeded:`, {
      taskId,
      fileId: data.fileId,
      taskStatus: data.taskStatus
    });
    
    if (onSuccess) {
      onSuccess(data);
    }
    
    return {
      success: true,
      fileId: data.fileId,
      message: data.message || 'Form submitted successfully'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Exception in enhanced KY3P form submission:`, {
      taskId,
      error: errorMessage
    });
    
    if (onError) {
      onError(error instanceof Error ? error : new Error(errorMessage));
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Enhanced form submission hook that can be used across all form types
 * 
 * @param taskId The ID of the task
 * @param taskType The type of task ('kyb', 'ky3p', 'open_banking', etc.)
 * @returns Form submission function
 */
export function useEnhancedFormSubmission(taskId?: number, taskType?: string) {
  /**
   * Submit form data with enhanced tracking
   * 
   * @param formData The form data to submit
   * @returns Promise with submission result
   */
  const submitForm = async (formData: Record<string, any>) => {
    if (!taskId) {
      toast({
        title: 'Error',
        description: 'Task ID is required for form submission',
        variant: 'destructive'
      });
      return { success: false, error: 'Task ID is required' };
    }
    
    if (!taskType) {
      toast({
        title: 'Error',
        description: 'Task type is required for form submission',
        variant: 'destructive'
      });
      return { success: false, error: 'Task type is required' };
    }
    
    // Use the appropriate submission method based on task type
    try {
      let result;
      
      switch (taskType) {
        case 'kyb':
        case 'company_kyb':
          result = await submitKybForm(taskId, formData);
          break;
        
        // Add cases for other form types as they are enhanced
        case 'ky3p':
        case 'sp_ky3p_assessment':
          result = await submitKy3pForm(taskId, formData);
          break;
        
        default:
          // Fall back to the standard submission if not enhanced yet
          toast({
            title: 'Notice',
            description: `Enhanced submission not yet available for ${taskType} forms. Using standard submission.`,
            variant: 'default'
          });
          
          // Just return a standard format result
          return { success: false, error: 'Enhanced form submission not available for this task type' };
      }
      
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Form submitted successfully',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Form submission failed',
          variant: 'destructive'
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error in enhanced form submission:`, {
        error: errorMessage,
        taskId,
        taskType
      });
      
      toast({
        title: 'Error',
        description: `Form submission failed: ${errorMessage}`,
        variant: 'destructive'
      });
      
      return { success: false, error: errorMessage };
    }
  };
  
  return { submitForm };
}
