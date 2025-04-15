import { useQuery } from '@tanstack/react-query';

export interface User {
  id: number;
  name: string;
  email: string;
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
    retry: 2,
    refetchOnWindowFocus: false
  });

  return {
    user,
    isLoading,
    isError,
    error
  };
}