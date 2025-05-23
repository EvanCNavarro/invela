/**
 * User Authentication State Management Hook - Secure user session handling
 * 
 * Provides React hook for managing authenticated user state with automatic
 * session validation and real-time authentication status monitoring. Integrates
 * with TanStack Query for efficient caching and error handling while ensuring
 * secure access to user profile data and company associations.
 * 
 * Features:
 * - Automatic session validation and refresh
 * - Efficient user data caching with React Query
 * - Authentication error handling without retries
 * - TypeScript-safe user profile interface
 */

// ========================================
// IMPORTS
// ========================================

// External dependencies for state management
import { useQuery } from "@tanstack/react-query";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Authenticated user profile interface
 * Defines the structure of user data returned from authentication endpoints
 */
interface AuthenticatedUser {
  id: number;
  email: string;
  company_id: number;
}

/**
 * User authentication hook return interface
 * Provides type safety for authentication state management
 */
interface UseUserResult {
  user: AuthenticatedUser | undefined;
  isLoading: boolean;
  error: unknown;
}

// ========================================
// CONSTANTS
// ========================================

/**
 * User authentication query configuration
 * Defines query settings for secure user data fetching
 */
const USER_QUERY_CONFIG = {
  queryKey: ['/api/auth/user'],
  retry: false // Prevent retry loops on authentication failures
} as const;

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * React hook for authenticated user state management
 * 
 * Manages user authentication state with automatic session validation
 * and efficient caching. Provides real-time authentication status for
 * components requiring user context and authorization checks.
 * 
 * @returns Object containing user data, loading state, and error status
 */
export function useUser(): UseUserResult {
  const { data: user, isLoading, error } = useQuery<AuthenticatedUser>({
    ...USER_QUERY_CONFIG
  });

  return {
    user,
    isLoading,
    error
  };
}