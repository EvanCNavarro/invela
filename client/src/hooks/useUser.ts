import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';

export interface User {
  id: number;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  role?: string;
  preferences?: Record<string, any>;
}

export function useUser() {
  const { 
    data: user, 
    isLoading, 
    isError, 
    error 
  } = useQuery<User>({ 
    queryKey: ['/api/users/current'],
    queryFn: getQueryFn({ on401: "returnNull", on500: "returnNull" }),
    retry: 1,
    refetchOnWindowFocus: false,
    // Prevent parsing errors from crashing the app
    onError: (err) => {
      console.error('Error fetching user data:', err);
    }
  });

  return {
    user,
    isLoading,
    isError,
    error
  };
}