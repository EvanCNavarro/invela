import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  email: string;
  company_id: number;
}

export function useUser() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    // Don't retry on 401/403 errors
    retry: false,
    // Add debug logging
    onSuccess: (data) => {
      console.log('[useUser] Successfully fetched user data:', data);
    },
    onError: (err) => {
      console.error('[useUser] Error fetching user data:', err);
    }
  });

  console.log('[useUser] Current user state:', { user, isLoading, error });

  return {
    user,
    isLoading,
    error,
  };
}