
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
};

// Create and configure query client with default query function
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: ({ queryKey }) => {
        // The first item in the query key should be the endpoint URL
        const [url, params] = queryKey;
        
        if (typeof url !== 'string') {
          throw new Error('Invalid query key: URL must be a string');
        }
        
        // Handle endpoints with special parameters
        if (url === '/api/tasks' && params) {
          return api.getTasks(params);
        } else if (url === '/api/companies/current') {
          return api.getCurrentCompany();
        } else if (url === '/api/companies' && typeof params === 'string') {
          return api.getCompanies(params);
        } else if (url === '/api/tasks') {
          return api.getTasks();
        } else if (url === '/api/files') {
          return api.getFiles();
        }
        
        // Default case - just fetch the URL
        return fetchAPI(url);
      },
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});
