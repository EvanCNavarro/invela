// At the top of the file, before any imports
// Create a custom fetch to suppress 401 errors for /api/user
// Only apply in browser environments
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = async function suppressAuthCheckErrors(input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';
    
    // Handle regular fetch for all other requests
    const response = await originalFetch(input, init);
    
    // Only for GET /api/user requests that result in 401 status,
    // create a response that won't trigger browser console errors
    if (url.endsWith('/api/user') && method === 'GET' && response.status === 401) {
      // Create a "successful" response with null data to avoid browser logging the 401
      // This is specifically for the auth check endpoint which is expected to fail for unauthenticated users
      const modifiedResponse = new Response(JSON.stringify(null), {
        status: 200, // Change status to 200 to avoid browser console errors
        statusText: 'OK',
        headers: new Headers({
          'Content-Type': 'application/json'
        })
      });
      
      // Add a custom property to the response so our code knows the original status
      Object.defineProperty(modifiedResponse, '_originalStatus', {
        value: 401,
        writable: false
      });
      
      return modifiedResponse;
    }
    
    return response;
  };
}

import { QueryClient, Query } from "@tanstack/react-query";
import { AppError } from "@shared/utils/errors";

async function throwIfResNotOk(res: Response) {
  // Check for our custom property that indicates a modified 401 response
  const actualStatus = (res as any)._originalStatus === 401 ? 401 : res.status;
  
  if (!res.ok && actualStatus !== 401) {
    // Clone the response before reading it
    const clonedRes = res.clone();
    
    try {
      const errorData = await clonedRes.json();
      throw new AppError(
        errorData.message || res.statusText,
        errorData.code || 'API_ERROR',
        actualStatus
      );
    } catch (e) {
      if (e instanceof AppError) throw e;
      
      // If parsing JSON failed, try to get the text from the original response
      try {
        const text = await res.text();
        throw new AppError(text || res.statusText, 'API_ERROR', actualStatus);
      } catch (textError) {
        // If even text() fails, just use status text
        throw new AppError(res.statusText || 'Unknown Error', 'API_ERROR', actualStatus);
      }
    }
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown,
): Promise<T> {
  // Special handling for user authentication check to prevent console errors
  const isUserAuthCheck = method === 'GET' && url.endsWith('/api/user');
  
  // Only log non-auth check requests to avoid console clutter
  if (!isUserAuthCheck) {
    console.log('[API Request]', {
      method,
      url,
      data: data ? { ...data, password: data.hasOwnProperty('password') ? '[REDACTED]' : undefined } : undefined
    });
  }

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Check for our custom property that indicates a modified 401 response
  const actualStatus = (res as any)._originalStatus === 401 ? 401 : res.status;
  const isActuallyUnauthorized = actualStatus === 401;

  // Only log non-auth check responses or successful auth checks
  if (!isUserAuthCheck || res.ok) {
    console.log('[API Response]', {
      status: actualStatus, // Show the actual status, not the modified one
      statusText: isActuallyUnauthorized ? 'Unauthorized' : res.statusText,
      url: res.url
    });
  }

  // For 401 responses on the user endpoint, return null instead of throwing
  // This is a special case for checking authentication status
  if (isActuallyUnauthorized && url.endsWith('/api/user')) {
    return null as T;
  }

  // For regular responses, proceed with error handling
  if (!isActuallyUnauthorized) {
    await throwIfResNotOk(res);
  }
  
  // Only try to parse as JSON if there's content
  if (res.status !== 204) {
    return await res.json();
  }
  
  // Return empty object for 204 No Content
  return {} as T;
}

// Define query keys as constants for consistency
export const queryKeys = {
  user: () => ['/api/user'],
  tasks: (filters?: Record<string, any>) => ['/api/tasks', ...(filters ? [filters] : [])],
  task: (id: string | number) => ['/api/tasks', id],
  companies: () => ['/api/companies'],
  company: (id: string | number) => ['/api/companies', id],
  currentCompany: () => ['/api/companies/current'],
  files: () => ['/api/files'],
  file: (id: string | number) => ['/api/files', id],
} as const;

/**
 * Logs the current state of a specific query key in the cache
 * @param queryKey The query key to check
 * @param label Optional label for the log message
 */
export function logQueryState(queryKey: unknown[], label = 'Query State'): void {
  if (process.env.NODE_ENV === 'production') return;
  
  const state = queryClient.getQueryState(queryKey);
  console.log(`[QueryClient] ${label}:`, {
    queryKey,
    exists: !!state,
    status: state?.status,
    hasData: !!state?.data,
    dataUpdateCount: state?.dataUpdateCount ?? 0,
    fetchStatus: state?.fetchStatus,
    isStale: state?.isInvalidated,
    timestamp: new Date().toISOString()
  });
}

/**
 * Prefetches company data if it's not already in the cache
 * This can be called from components to ensure company data
 * is available synchronously
 */
export async function ensureCompanyData(): Promise<void> {
  const companyKey = queryKeys.currentCompany();
  const state = queryClient.getQueryState(companyKey);
  
  if (!state?.data) {
    console.log('[QueryClient] Prefetching missing company data');
    try {
      const data = await apiRequest('GET', '/api/companies/current');
      if (data) {
        queryClient.setQueryData(companyKey, data);
        console.log('[QueryClient] Successfully prefetched company data');
      }
    } catch (error) {
      console.error('[QueryClient] Failed to prefetch company data:', error);
    }
  }
}

// Enhanced debug functions for React Query
const logQueryCache = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[QueryClient] Current cache state:', {
      queries: queryClient.getQueryCache().getAll().map(query => ({
        queryKey: query.queryKey,
        state: query.state.status,
        dataUpdatedAt: query.state.dataUpdatedAt ? new Date(query.state.dataUpdatedAt).toISOString() : null,
        // Use type assertion for isStale since it might be missing in some versions
        isStale: query.state.isInvalidated,
        hasData: query.state.data !== undefined
      }))
    });
  }
};

/**
 * The query function for fetching company data.
 * This is exported so it can be reused in multiple places.
 */
export const fetchCompanyData = async () => {
  console.log('[QueryClient] Fetching company data');
  return await apiRequest('GET', '/api/companies/current');
};

/**
 * The query function for fetching user data.
 * This is exported so it can be reused in multiple places.
 */
export const fetchUserData = async () => {
  return await apiRequest('GET', '/api/user');
};

/**
 * Pre-register commonly used queries to prevent "Missing queryFn" errors
 * when the application is refocused or a query is marked for revalidation.
 * This is particularly important for queries that are populated via setQueryData.
 */
export function registerCriticalQueries() {
  if (typeof window === 'undefined') return; // Only run in browser
  
  console.log('[QueryClient] Registering critical queries');
  
  // Pre-register the company data query
  queryClient.prefetchQuery({
    queryKey: queryKeys.currentCompany(),
    queryFn: fetchCompanyData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
  
  // Pre-register the user data query
  queryClient.prefetchQuery({
    queryKey: queryKeys.user(),
    queryFn: fetchUserData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
  
  // Add event listeners to handle tab focus/visibility changes
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('[QueryClient] Tab became visible, ensuring critical queries are registered');
        
        // Re-register critical queries when tab becomes visible
        const userState = queryClient.getQueryState(queryKeys.user());
        const companyState = queryClient.getQueryState(queryKeys.currentCompany());
        
        // Only prefetch if we already have data (meaning the user was authenticated)
        if (userState?.data) {
          queryClient.prefetchQuery({
            queryKey: queryKeys.user(),
            queryFn: fetchUserData,
            staleTime: 5 * 60 * 1000,
          });
        }
        
        if (companyState?.data) {
          queryClient.prefetchQuery({
            queryKey: queryKeys.currentCompany(),
            queryFn: fetchCompanyData,
            staleTime: 5 * 60 * 1000,
          });
        }
      }
    });
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Increase stale time to reduce refetches
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Add gcTime (renamed from cacheTime in React Query v4+)
      gcTime: 10 * 60 * 1000, // 10 minutes
      // Add a default select function to handle null data gracefully
      select: (data: any) => data,
      retry: (failureCount, error) => {
        // Don't retry on certain errors
        if (error instanceof AppError && (error.statusCode === 401 || error.statusCode === 403)) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: process.env.NODE_ENV === 'production',
    },
    mutations: {
      // Add global error handling for mutations
      onError: (error) => {
        console.error('Mutation error:', error);
        // The actual toast will be handled by the useApiError hook in components
      }
    }
  },
});

// Add listeners for debug logging - only in development
if (process.env.NODE_ENV !== 'production') {
  // Instead of using listeners (which have type issues), 
  // we'll log query status through the defaultOptions
  console.log('[QueryClient] Debug logging enabled for development');
  
  // Set up a simple monitor for cache updates
  setInterval(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    const activeQueries = queries.filter(q => q.isActive());
    
    if (activeQueries.length > 0) {
      console.log('[QueryClient] Active queries:', activeQueries.map(q => ({
        queryKey: q.queryKey,
        state: q.state.status,
        lastUpdated: new Date(q.state.dataUpdatedAt).toISOString()
      })));
    }
  }, 10000); // Check every 10 seconds
}

// Log initial cache state after creation
if (process.env.NODE_ENV !== 'production') {
  console.log('[QueryClient] Initialized with default settings:', {
    staleTime: '5 minutes',
    gcTime: '10 minutes',
    timestamp: new Date().toISOString()
  });
}

// Register critical queries on startup
registerCriticalQueries();

// Create a wrapper for API mutations that includes error handling
export function createMutation<TData = unknown, TError = unknown, TVariables = void, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void | Promise<unknown>;
    onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void | Promise<unknown>;
    onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables, context: TContext | undefined) => void | Promise<unknown>;
  }
) {
  return {
    mutationFn,
    ...options,
    // The component using this mutation should use the useApiError hook
    // to handle errors appropriately
  };
}

// Export a utility function to check auth state (useful for debugging)
export function checkAuthState() {
  // Get all cookies as an object
  const getCookies = () => {
    return document.cookie.split(';')
      .reduce((cookies, cookie) => {
        const [name, value] = cookie.trim().split('=').map(decodeURIComponent);
        if (name) {
          // Only show if cookie exists, not the value for security
          cookies[name] = value ? '(set)' : '(empty)';
        }
        return cookies;
      }, {} as Record<string, string>);
  };

  // Also log the current React Query cache
  logQueryCache();

  const authData = {
    cookies: getCookies(),
    hasSid: document.cookie.includes('sid='),
    hasRefreshToken: document.cookie.includes('refresh_token='),
    userInCache: queryClient.getQueryData(['/api/user']) !== undefined,
    companyInCache: queryClient.getQueryData(['/api/companies/current']) !== undefined,
    timestamp: new Date().toISOString()
  };

  console.log('[Auth Debug] Current auth state:', authData);
  return authData;
}
