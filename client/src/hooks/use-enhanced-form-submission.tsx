/**
 * ========================================
 * Enhanced Form Submission Hook - Advanced Multi-Stage Processing
 * ========================================
 * 
 * Advanced form submission hook providing multi-stage form processing
 * with preparation and submission phases for complex enterprise workflows.
 * Manages sophisticated form states, validation, and recovery mechanisms.
 * 
 * Key Features:
 * - Multi-stage submission with preparation and execution phases
 * - Advanced state management for complex submission workflows
 * - Intelligent retry logic with connection issue detection
 * - Comprehensive error handling and recovery mechanisms
 * - Toast notification system for real-time user feedback
 * 
 * Enhanced Processing:
 * - Pre-submission data preparation and validation
 * - Staged submission workflow with intermediate states
 * - Connection resilience with automatic retry mechanisms
 * - Success and error modal management for user guidance
 * - Query cache synchronization for data consistency
 * 
 * @module hooks/use-enhanced-form-submission
 * @version 1.0.0
 * @since 2025-05-23
 */

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface UseEnhancedFormSubmissionOptions {
  prepareEndpoint: string;
  submitEndpoint: string;
  invalidateQueries?: string[];
  maxRetries?: number;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface SubmissionState {
  isPreparing: boolean;
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
 * Custom hook for enhanced two-step form submissions
 * 
 * This hook implements the improved two-step submission process:
 * 1. Prepare the form for submission (sets status to ready_for_submission)
 * 2. Submit the form (sets status to submitted)
 * 
 * Features:
 * - Loading states for both prepare and submit phases
 * - Success/error states
 * - Toast notifications
 * - Automatic query invalidation
 * - Automatic retries for connection issues
 * - Success and connection issue modals
 */
export default function useEnhancedFormSubmission({
  prepareEndpoint,
  submitEndpoint,
  invalidateQueries = [],
  maxRetries = 3,
  retryDelay = 2000,
  onSuccess,
  onError,
}: UseEnhancedFormSubmissionOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [state, setState] = useState<SubmissionState>({
    isPreparing: false,
    isSubmitting: false,
    isSuccess: false,
    isError: false,
    error: null,
    showSuccessModal: false,
    showConnectionIssueModal: false,
    retryCount: 0,
    data: null,
  });

  // Step 1: Prepare the form for submission
  const prepareForSubmission = async (taskId: number) => {
    console.log(`[EnhancedSubmission] Preparing task ${taskId} for submission`);
    
    setState(prev => ({
      ...prev,
      isPreparing: true,
      isError: false,
      error: null,
    }));

    try {
      // Call the prepare endpoint
      const response = await fetch(prepareEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Error ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      if (!responseData.success) {
        throw new Error(responseData.error || "Failed to prepare form for submission");
      }

      console.log(`[EnhancedSubmission] Successfully prepared task for submission`, responseData);
      
      setState(prev => ({
        ...prev,
        isPreparing: false,
      }));

      return responseData;
    } catch (error) {
      console.error("[EnhancedSubmission] Error preparing form for submission:", error);
      
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      
      // Handle connection issues
      const isConnectionIssue = 
        errorMessage.includes("Failed to fetch") || 
        errorMessage.includes("Network Error") ||
        errorMessage.toLowerCase().includes("timeout");
      
      toast({
        title: "Preparation Failed",
        description: isConnectionIssue 
          ? "Connection issue while preparing the form. Please try again." 
          : errorMessage,
        variant: "destructive",
      });
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
      
      setState(prev => ({
        ...prev,
        isPreparing: false,
        isError: true,
        error: error instanceof Error ? error : new Error(errorMessage),
      }));
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  // Step 2: Submit the prepared form
  const submitForm = async (formData: any) => {
    console.log(`[EnhancedSubmission] Submitting form data with ${Object.keys(formData).length} fields`);
    
    // Reset state at the start of submission
    setState(prev => ({
      ...prev,
      isSubmitting: true,
      isSuccess: false,
      isError: false,
      error: null,
      showConnectionIssueModal: false,
    }));

    // Get the task ID from the form data
    const taskId = formData.task_id;

    // Step 1: Prepare the form for submission
    const prepareResult = await prepareForSubmission(taskId);
    if (!prepareResult.success) {
      return {
        success: false,
        error: "Failed to prepare form for submission"
      };
    }

    // Show toast to indicate submission is in progress
    toast({
      title: "Submitting...",
      description: "Working on submitting your data...",
      duration: 3000,
    });

    try {
      // Step 2: Submit the form
      const response = await fetch(submitEndpoint, {
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
      console.error("[EnhancedSubmission] Form submission error:", error);
      
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
      isPreparing: false,
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