/**
 * User Authentication Hook
 * 
 * Provides centralized user data management with React Query v5 patterns.
 * Handles authentication state and user profile information retrieval.
 * 
 * @dependencies @tanstack/react-query
 * @returns User data, loading state, and error handling
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * User interface following enterprise authentication patterns
 */
interface User {
  id: number;
  email: string;
  company_id: number;
}

/**
 * Custom hook for user authentication and profile management
 * 
 * Implements React Query v5 patterns with proper error handling
 * and debug logging following application standards.
 */
export function useUser() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/user'],
    // Don't retry on 401/403 errors to prevent auth loops
    retry: false,
  });

  // Handle success and error logging with useEffect (React Query v5 pattern)
  useEffect(() => {
    if (user) {
      console.log('[useUser] Successfully fetched user data:', user);
    }
  }, [user]);

  useEffect(() => {
    if (error) {
      console.error('[useUser] Error fetching user data:', error);
    }
  }, [error]);

  // Debug logging for development
  console.log('[useUser] Current user state:', { user, isLoading, error });

  return {
    user,
    isLoading,
    error,
  };
}