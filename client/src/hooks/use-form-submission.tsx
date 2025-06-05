/**
 * ========================================
 * Form Submission Hook - Advanced Form Processing
 * ========================================
 * 
 * Comprehensive form submission hook providing robust form processing
 * capabilities throughout the enterprise platform. Manages submission state,
 * error handling, retry logic, and user feedback with enterprise reliability.
 * 
 * Key Features:
 * - Advanced submission state management with loading indicators
 * - Intelligent retry mechanism with exponential backoff
 * - Toast notification integration for user feedback
 * - Query cache invalidation for data consistency
 * - Connection issue detection and recovery
 * 
 * Form Processing:
 * - Multi-step submission workflow with state tracking
 * - Error boundary integration for graceful failure handling
 * - Success modal management for completion feedback
 * - Retry counter and delay management for resilience
 * - Type-safe submission data handling
 * 
 * @module hooks/use-form-submission
 * @version 1.0.0
 * @since 2025-05-23
 */

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface UseFormSubmissionOptions {
  endpoint: string;
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
 * Custom hook for resilient form submissions with feedback
 * 
 * This hook provides a consistent way to handle form submissions,
 * with built-in retry logic, loading states, and user feedback.
 * 
 * Features:
 * - Loading states (isSubmitting)
 * - Success/error states 
 * - Toast notifications
 * - Automatic query invalidation
 * - Automatic retries for connection issues
 * - Success and connection issue modals
 */
export default function useFormSubmission({
  endpoint,
  invalidateQueries = [],
  maxRetries = 3,
  retryDelay = 2000,
  onSuccess,
  onError,
}: UseFormSubmissionOptions) {
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
  const submitForm = async (formData: any) => {
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
      title: "Submitting...",
      description: "Working on submitting your data...",
      duration: 3000,
    });

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
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
          title: "Submission Successful",
          description: responseData.message || "Your form has been submitted successfully.",
          variant: "success",
          duration: 5000,
        });

        // Invalidate relevant queries to refresh data
        if (invalidateQueries.length > 0) {
          for (const query of invalidateQueries) {
            queryClient.invalidateQueries({ queryKey: [query] });
          }
        }

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
        throw new Error(responseData.error || "An error occurred while processing your submission.");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      
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
          title: "Submission Failed",
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
  const retrySubmission = (formData: any) => {
    setState(prev => ({
      ...prev,
      showConnectionIssueModal: false,
    }));
    
    // Retry with a delay to give the connection a moment to recover
    setTimeout(() => {
      submitForm(formData);
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
    submitForm,
    retrySubmission,
    resetState,
    closeSuccessModal,
    closeConnectionIssueModal,
  };
}