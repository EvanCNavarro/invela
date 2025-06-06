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
  company_id?: number;
  preferences?: Record<string, any>;
}

export function useUser() {
  const { 
    data: user, 
    isLoading, 
    isError, 
    error 
  } = useQuery<User>({ 
    queryKey: ['/api/user'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1,
    refetchOnWindowFocus: false
  });

  return {
    user,
    isLoading,
    isError,
    error
  };
}