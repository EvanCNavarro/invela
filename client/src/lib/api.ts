
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

// Create and configure query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});
