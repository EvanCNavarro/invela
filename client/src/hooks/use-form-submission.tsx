/**
 * Custom hook for handling form submissions with improved error handling
 * 
 * This hook provides a consistent way to handle form submissions with
 * improved user feedback for connection issues and other errors.
 */
import { useState } from 'react';
import { useToast } from './use-toast';
import { useNavigate } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

interface SubmissionOptions {
  taskId: number;
  formType: string;
  formData: Record<string, any>;
  fileName?: string;
  onSuccess?: (result: any) => void;
  redirectPath?: string;
}

interface SubmissionResult {
  success: boolean;
  message: string;
  connectionIssue?: boolean;
  taskId?: number;
  taskStatus?: string;
  [key: string]: any;
}

export function useFormSubmission() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSubmissionData, setLastSubmissionData] = useState<SubmissionOptions | null>(null);

  const submitForm = async (options: SubmissionOptions): Promise<SubmissionResult> => {
    const { taskId, formType, formData, fileName, onSuccess, redirectPath } = options;
    
    if (isSubmitting) {
      return {
        success: false,
        message: 'A submission is already in progress'
      };
    }

    setIsSubmitting(true);
    setError(null);
    setLastSubmissionData(options);

    // Show initial toast
    const toastId = toast({
      title: 'Processing Submission',
      description: 'Working on submitting your data...',
      duration: 10000, // Longer duration in case of slower connections
    });

    try {
      // Determine the API endpoint based on form type
      const endpoint = `/api/${formType}/submit/${taskId}`;
      
      // Make the API request
      const response = await apiRequest('POST', endpoint, {
        formData,
        fileName: fileName || `${formType}_submission_${new Date().toISOString()}.json`,
      });

      if (!response.ok) {
        // Handle HTTP errors
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Server returned ${response.status}`;
        
        throw new Error(errorMessage);
      }

      // Success!
      const result = await response.json();
      
      // Clear any existing error toasts
      toast({
        id: toastId,
        title: `${formType.toUpperCase()} Submitted`,
        description: result.message || 'Your form has been successfully submitted.',
        variant: 'success',
      });

      // Reset retry count on success
      setRetryCount(0);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(result);
      }

      // Navigate if redirect path provided
      if (redirectPath) {
        navigate(redirectPath);
      }

      setIsSubmitting(false);
      return {
        success: true,
        message: result.message || 'Form submitted successfully',
        ...result
      };
    } catch (err: any) {
      setError(err);
      
      // Different handling for connection issues
      const isConnectionIssue = err.message?.includes('timeout') || 
                               err.message?.includes('connection') ||
                               err.message?.includes('network') ||
                               err.message?.includes('failed to fetch');
      
      // Update toast for error
      toast({
        id: toastId,
        title: isConnectionIssue ? 'Connection Issue' : 'Submission Error',
        description: isConnectionIssue
          ? 'Database connection issue. Your progress is saved. Please try submitting again.'
          : `Error: ${err.message}`,
        variant: 'destructive',
        duration: 8000,
      });

      // Increment retry count for connection issues
      if (isConnectionIssue) {
        setRetryCount(prev => prev + 1);
      }

      setIsSubmitting(false);
      return {
        success: false,
        message: err.message,
        connectionIssue: isConnectionIssue,
        taskId
      };
    }
  };

  const retrySubmission = async (): Promise<SubmissionResult | null> => {
    if (!lastSubmissionData) {
      return null;
    }
    
    // Show retry toast
    toast({
      title: 'Retrying Submission',
      description: `Attempting to submit again (try ${retryCount + 1})...`,
      duration: 3000,
    });
    
    return submitForm(lastSubmissionData);
  };

  return {
    submitForm,
    retrySubmission,
    isSubmitting,
    error,
    retryCount,
    hasLastSubmission: !!lastSubmissionData
  };
}