import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  email: string;
  company_id: number;
}

export function useUser() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false
  });

  console.log('[useUser] Current user:', user);

  return {
    user,
    isLoading,
    error,
  };
}
