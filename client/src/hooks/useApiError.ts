/**
 * @file useApiError.ts
 * @description Custom React hook for handling API errors consistently.
 * Provides a standardized way to process and display error messages from API calls.
 */

import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';
import { AppError } from '@shared/utils/errors';

/**
 * Type definition for error objects with message property.
 * Used for handling various error formats from API responses.
 */
type ErrorWithMessage = {
  message: string;
  status?: number;
  code?: string;
};

/**
 * Custom hook for handling API errors consistently across the application.
 * Processes different error types and displays appropriate toast notifications.
 * 
 * @returns Object with handleError function
 */
export function useApiError() {
  const { toast } = useToast();

  /**
   * Handles API errors by extracting relevant information and displaying a toast notification.
   * Supports different error types: AppError, standard Error, and API response errors.
   * 
   * @param error - The error object to handle
   * @returns Object containing the error title and description
   */
  const handleError = useCallback((error: unknown) => {
    console.error('[API Error]', error);
    
    let title = 'Error';
    let description = 'An unexpected error occurred';
    
    // Handle AppError instances (from shared error utilities)
    if (error instanceof AppError) {
      title = error.name;
      description = error.message;
      console.log('[API Error] AppError:', { name: error.name, message: error.message, status: error.status, code: error.code });
    } 
    // Handle standard Error objects
    else if (error instanceof Error) {
      description = error.message;
      console.log('[API Error] Standard Error:', { message: error.message });
    } 
    // Handle error responses from fetch or axios
    else if (typeof error === 'object' && error !== null) {
      const errorObj = error as ErrorWithMessage;
      
      if (errorObj.message) {
        description = errorObj.message;
      }
      
      // Add status code if available
      if (errorObj.status) {
        title = `Error ${errorObj.status}`;
      } else if (errorObj.code) {
        title = `Error ${errorObj.code}`;
      }
      
      console.log('[API Error] Response Error:', { 
        message: errorObj.message, 
        status: errorObj.status, 
        code: errorObj.code 
      });
    }
    
    // Display toast notification
    toast({
      variant: 'destructive',
      title,
      description,
    });
    
    console.log('[API Error] Displayed toast notification:', { title, description });
    
    return { title, description };
  }, [toast]);

  return { handleError };
}

export default useApiError; 