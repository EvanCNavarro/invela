import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface UseKy3pFormSubmissionOptions {
  invalidateQueries?: string[];
  maxRetries?: number;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface SubmissionState {
  isSubmitting: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  showSuccessModal: boolean;
  showConnectionIssueModal: boolean;
  retryCount: number;
  data: any;
}

/**
 * Custom hook for KY3P form submissions with proper status handling
 * 
 * This hook is specifically designed to handle KY3P form submissions
 * to ensure they get properly marked as "submitted" with 100% progress,
 * fixing the issue where KY3P forms were showing the wrong status.
 */
export default function useKy3pFormSubmission({
  invalidateQueries = [],
  maxRetries = 3,
  retryDelay = 2000,
  onSuccess,
  onError,
}: UseKy3pFormSubmissionOptions = {}) {
  const queryClient = useQueryClient();
  
  // Submission state
  const [state, setState] = useState<SubmissionState>({
    isSubmitting: false,
    isSuccess: false,
    isError: false,
    error: null,
    showSuccessModal: false,
    showConnectionIssueModal: false,
    retryCount: 0,
    data: null,
  });

  // Reset state
  const resetState = useCallback(() => {
    setState({
      isSubmitting: false,
      isSuccess: false,
      isError: false,
      error: null,
      showSuccessModal: false,
      showConnectionIssueModal: false,
      retryCount: 0,
      data: null,
    });
  }, []);

  // Submit KY3P form
  const submitKy3pForm = useCallback(async (taskId: number) => {
    try {
      setState(prev => ({ ...prev, isSubmitting: true, isError: false, error: null }));
      
      // Call our specialized KY3P submission endpoint
      const response = await apiRequest(
        `/api/ky3p/submit-form/${taskId}`, 
        { 
          method: 'POST',
          body: JSON.stringify({ taskId })
        }
      );
      
      // Handle successful submission
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isSuccess: true,
        data: response,
        showSuccessModal: true,
      }));
      
      // Invalidate related queries to refresh data
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(query => {
          queryClient.invalidateQueries({ queryKey: [query] });
        });
      }
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(response);
      }
      
      return response;
    } catch (error) {
      // Handle submission error
      console.error('Error submitting KY3P form:', error);
      
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isError: true,
        error: error as Error,
        showConnectionIssueModal: true,
        retryCount: prev.retryCount + 1,
      }));
      
      // Call error callback if provided
      if (onError) {
        onError(error as Error);
      }
      
      throw error;
    }
  }, [queryClient, invalidateQueries, onSuccess, onError]);

  // Retry submission
  const retrySubmission = useCallback(async (taskId: number) => {
    if (state.retryCount >= (maxRetries || 3)) {
      setState(prev => ({
        ...prev,
        showConnectionIssueModal: false,
        error: new Error(`Maximum retry attempts (${maxRetries}) reached.`),
      }));
      return;
    }
    
    setState(prev => ({
      ...prev,
      showConnectionIssueModal: false,
    }));
    
    // Add a small delay before retrying
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    
    // Retry submission
    return submitKy3pForm(taskId);
  }, [state.retryCount, maxRetries, retryDelay, submitKy3pForm]);

  // Close success modal
  const closeSuccessModal = useCallback(() => {
    setState(prev => ({ ...prev, showSuccessModal: false }));
  }, []);

  // Close connection issue modal
  const closeConnectionIssueModal = useCallback(() => {
    setState(prev => ({ ...prev, showConnectionIssueModal: false }));
  }, []);

  return {
    submitKy3pForm,
    retrySubmission,
    closeSuccessModal,
    closeConnectionIssueModal,
    resetState,
    ...state,
  };
}