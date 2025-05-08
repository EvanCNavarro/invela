import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
}: UseKy3pFormSubmissionOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  // Main submit function
  const submitKy3pForm = async (taskId: number) => {
    // Reset state at the start of submission
    setState(prev => ({
      ...prev,
      isSubmitting: true,
      isSuccess: false,
      isError: false,
      error: null,
      showConnectionIssueModal: false,
    }));

    // Show initial toast to indicate submission is being processed
    toast({
      title: "Submitting KY3P form...",
      description: "Processing your submission...",
      duration: 3000,
    });

    try {
      // Use our specialized KY3P submission endpoint
      const endpoint = `/api/ky3p/submit-form/${taskId}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Error ${response.status}: ${response.statusText}`);
      }

      // Parse the response data
      const responseData = await response.json();

      // Handle success
      if (responseData?.success) {
        // Show success toast
        toast({
          title: "KY3P Form Submitted Successfully",
          description: responseData.message || "Your KY3P form has been submitted successfully.",
          variant: "success",
          duration: 5000,
        });

        // Invalidate relevant queries to refresh data
        if (invalidateQueries.length > 0) {
          for (const query of invalidateQueries) {
            queryClient.invalidateQueries({ queryKey: [query] });
          }
        }

        // Always invalidate the task data to ensure UI updates
        queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });

        // Call the success callback if provided
        if (onSuccess) {
          onSuccess(responseData);
        }

        // Update state to show success modal
        setState(prev => ({
          ...prev,
          isSubmitting: false,
          isSuccess: true,
          showSuccessModal: true,
          data: responseData,
        }));
        
        return responseData;
      } else {
        // API returned success: false
        throw new Error(responseData.error || "An error occurred while processing your KY3P submission.");
      }
    } catch (error) {
      console.error("[KY3P Submission] Error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      
      // Determine if it's a connection issue
      const isConnectionIssue = 
        errorMessage.includes("Failed to fetch") || 
        errorMessage.includes("Network Error") ||
        errorMessage.includes("database connection") ||
        errorMessage.toLowerCase().includes("timeout") ||
        (error instanceof TypeError && error.message === "Failed to fetch");
      
      // Handle connection issues with retry
      if (isConnectionIssue && state.retryCount < maxRetries) {
        setState(prev => ({
          ...prev,
          isSubmitting: false,
          showConnectionIssueModal: true,
          retryCount: prev.retryCount + 1,
          error: error instanceof Error ? error : new Error(errorMessage),
        }));
        
        return {
          success: false,
          connectionIssue: true,
          message: errorMessage,
          retryCount: state.retryCount + 1
        };
      } else {
        // Regular error or too many retries
        toast({
          title: "KY3P Submission Failed",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
        
        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage));
        }
        
        setState(prev => ({
          ...prev,
          isSubmitting: false,
          isError: true,
          error: error instanceof Error ? error : new Error(errorMessage),
        }));
        
        return {
          success: false,
          connectionIssue: false,
          message: errorMessage
        };
      }
    }
  };

  // Retry submission function
  const retrySubmission = (taskId: number) => {
    setState(prev => ({
      ...prev,
      showConnectionIssueModal: false,
    }));
    
    // Retry with a delay to give the connection a moment to recover
    setTimeout(() => {
      submitKy3pForm(taskId);
    }, retryDelay);
  };

  // Reset the entire state
  const resetState = () => {
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
  };

  // Modal handlers
  const closeSuccessModal = () => {
    setState(prev => ({
      ...prev,
      showSuccessModal: false,
    }));
  };

  const closeConnectionIssueModal = () => {
    setState(prev => ({
      ...prev,
      showConnectionIssueModal: false,
    }));
  };

  return {
    ...state,
    submitKy3pForm,
    retrySubmission,
    resetState,
    closeSuccessModal,
    closeConnectionIssueModal,
  };
}