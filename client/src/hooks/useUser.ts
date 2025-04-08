import { useQuery } from '@tanstack/react-query';

export interface User {
  id: number;
  name: string | null;
  email: string;
  company_id: number;
  role: string;
  status: string;
}

export function useUser() {
  const { 
    data: user, 
    isLoading, 
    isError, 
    error 
  } = useQuery<User>({ 
    queryKey: ['/api/auth/me'],
    retry: false,
    refetchOnWindowFocus: false
  });

  return {
    user,
    isLoading,
    isError,
    error
  };
}