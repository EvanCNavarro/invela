import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCallback } from "react";

interface User {
  id: number;
  email: string;
  company_id: number;
}

// Custom error class for user-related errors
class UserError extends Error {
  statusCode?: number;
  
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "UserError";
    this.statusCode = statusCode;
  }
}

/**
 * Hook to fetch and manage user data
 * @returns User data, loading state, and error state
 */
export function useUser() {
  const queryClient = useQueryClient();
  
  const {
    data: user,
    isLoading,
    error,
    refetch
  } = useQuery<User, UserError>({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/user");
        
        if (!response.ok) {
          const statusCode = response.status;
          let errorMessage = "Failed to fetch user data";
          
          // Handle different error status codes
          if (statusCode === 401) {
            errorMessage = "Authentication required";
          } else if (statusCode === 403) {
            errorMessage = "You don't have permission to access this resource";
          } else if (statusCode === 404) {
            errorMessage = "User not found";
          }
          
          throw new UserError(errorMessage, statusCode);
        }
        
        const userData = await response.json();
        
        // Validate user data
        if (!userData || !userData.id) {
          throw new UserError("Invalid user data received");
        }
        
        return userData;
      } catch (err) {
        if (err instanceof UserError) {
          throw err;
        }
        throw new UserError("An unexpected error occurred while fetching user data");
      }
    },
    // Don't retry on 401/403 errors
    retry: (failureCount, error) => {
      if (error.statusCode === 401 || error.statusCode === 403) {
        return false;
      }
      return failureCount < 3;
    },
    // Cache user data for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Use previous data as placeholder while fetching
    placeholderData: (previousData) => previousData
  });

  // Function to invalidate user data and force a refresh
  const refreshUser = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
  }, [queryClient]);

  return {
    user,
    isLoading,
    error,
    refreshUser,
    refetch
  };
}