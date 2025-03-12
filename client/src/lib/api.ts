
import { QueryClient } from '@tanstack/react-query';

// Default fetch wrapper with error handling
export async function fetchAPI<T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include' // Include cookies for auth
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(error.message || `API request failed with status ${response.status}`);
  }

  return response.json();
}

// Create API query functions for common endpoints
export const api = {
  // Tasks
  getTasks: (params?: Record<string, any>) => {
    const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return fetchAPI(`/api/tasks${queryString}`);
  },
  getTask: (id: number) => fetchAPI(`/api/tasks/${id}`),
  
  // Companies
  getCurrentCompany: () => fetchAPI('/api/companies/current'),
  getCompanies: (filter?: string) => {
    const queryString = filter ? `?filter=${filter}` : '';
    return fetchAPI(`/api/companies${queryString}`);
  },
  
  // Files
  getFiles: () => fetchAPI('/api/files'),
  
  // Additional endpoints can be added here
};

// Create and configure query client with default query function
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      queryFn: async ({ queryKey }) => {
        // Default query function that uses the first element of queryKey as the URL
        const url = queryKey[0];
        if (typeof url !== 'string') {
          throw new Error('Invalid query key: first element must be a string URL');
        }
        
        // If second element is an object, use it as query params
        if (queryKey.length > 1 && typeof queryKey[1] === 'object') {
          const params = queryKey[1];
          const queryString = new URLSearchParams(params as any).toString();
          return fetchAPI(`${url}?${queryString}`);
        }
        
        return fetchAPI(url);
      }
    },
  },
});
