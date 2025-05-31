/**
 * ========================================
 * Query Client - API Communication Layer
 * ========================================
 * 
 * Centralized API communication system for the enterprise risk assessment platform.
 * Implements TanStack Query integration with custom error handling, request
 * configuration, and response processing for all HTTP operations.
 * 
 * Key Features:
 * - Type-safe API request functions
 * - Automatic error handling and reporting
 * - Multiple request method support (GET, POST, PUT, DELETE)
 * - Response validation and error extraction
 * - Debug logging for development
 * 
 * Request Methods:
 * - GET: Data retrieval operations
 * - POST: Data creation and submissions
 * - PUT/PATCH: Data updates
 * - DELETE: Resource removal
 * 
 * @module lib/queryClient
 * @version 1.0.0
 * @since 2025-05-23
 */

import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * HTTP Response Validator
 * 
 * Validates HTTP responses and extracts error messages for user display.
 * Provides clean error messages without exposing internal status codes.
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Get response text and use it directly for the error message without status code
    const text = (await res.text()) || res.statusText;
    
    // Include the status in console for debugging, but not in the user-facing message
    console.error(`API error ${res.status}: ${text.substring(0, 200)}...`);
    
    // Throw a clean error without the status code prefix
    throw new Error(text);
  }
}

export async function apiRequest<T>(
  methodOrUrl: string,
  urlOrData?: string | unknown,
  data?: unknown,
): Promise<T> {
  let method: string = 'GET';
  let url: string;
  let bodyData: unknown | undefined;

  // Handle both function signatures:
  // 1. apiRequest<T>(url) - GET request
  // 2. apiRequest<T>(method, url, data) - method with optional data
  if (urlOrData === undefined) {
    // No second parameter, assume methodOrUrl is the URL and this is a GET request
    url = methodOrUrl;
    bodyData = undefined;
  } else if (typeof urlOrData === 'string') {
    // Second parameter is a string, assume it's the URL and methodOrUrl is the HTTP method
    method = methodOrUrl;
    url = urlOrData;
    bodyData = data;
  } else {
    // Second parameter is not a string, assume it's the request data and methodOrUrl is the URL
    url = methodOrUrl;
    bodyData = urlOrData;
    
    // CRITICAL FIX: If we have body data but no explicit method, use POST instead of GET
    // This is the root cause of the "Request with GET/HEAD method cannot have body" error
    if (bodyData && method === 'GET') {
      console.log(`[API Request] Auto-switching to POST method for request with body to ${url}`);
      method = 'POST';
    }
  }

  // Enhanced logging for risk score priorities API calls
  const isRiskPriorities = url.includes('/api/risk-score/priorities');
  
  if (isRiskPriorities) {
    console.log(`[RiskPriorities API] ${method} ${url} Request:`, bodyData);
  } else {
    // Regular logging for other API calls
    console.log(`[API Request] ${method} ${url} with${bodyData ? '' : 'out'} body data`, 
      bodyData ? { bodyPreview: typeof bodyData === 'object' ? '(Object)' : String(bodyData).substring(0, 50) } : '');
  }

  try {
    // Generate a unique request ID
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Ensure all requests are authenticated with proper headers
    const res = await fetch(url, {
      method,
      headers: {
        ...(bodyData ? { "Content-Type": "application/json" } : {}),
        "X-Request-ID": requestId, // Add request ID for tracing
        "X-Client-Timestamp": new Date().toISOString() // Add client timestamp
      },
      body: bodyData ? JSON.stringify(bodyData) : undefined,
      credentials: "include", // Always include credentials for authentication
    });

    // Enhanced logging for risk score priorities API calls
    if (isRiskPriorities) {
      console.log(`[RiskPriorities API] ${method} ${url} - Status: ${res.status}`);
      
      // Special handling for 401 errors
      if (res.status === 401) {
        console.error(`[RiskPriorities API] Authentication failure. This explains why changes don't persist.`);
        // Still throw the error to be handled by the mutation's onError callback
      }
    } else {
      // Regular response logging for other API calls
      console.log(`[API Response] ${method} ${url} - Status: ${res.status}`);
    }
    
    await throwIfResNotOk(res);
    
    // Get the text first to check for HTML content
    const text = await res.text();
    
    // Check if the response is HTML (likely a login redirect or error page)
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      console.error(`[API Error] ${method} ${url} - Received HTML response instead of JSON`);
      throw new Error('Server returned HTML instead of JSON. This could be due to an authentication issue or server error.');
    }
    
    // If empty response, return empty object
    if (!text.trim()) {
      console.warn(`[API Response] ${method} ${url} - Empty response, returning empty object`);
      return {} as T;
    }
    
    // Try to parse JSON
    try {
      const result = JSON.parse(text) as T;
      
      // Special logging for risk priorities success
      if (isRiskPriorities) {
        console.log(`[RiskPriorities API] ${method} ${url} Success! Response:`, result);
      }
      
      return result;
    } catch (jsonError) {
      console.error(`[API Error] ${method} ${url} - Invalid JSON:`, text.substring(0, 100));
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
    }
  } catch (error) {
    console.error(`[API Error] ${method} ${url} - Failed:`, error);
    
    // For risk priorities, add a more helpful error message
    if (isRiskPriorities) {
      console.error(`[RiskPriorities API] This error explains why risk priorities don't persist. ` + 
        `The API request is failing due to authentication issues, but the UI shows a success message.`);
    }
    
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    // Only log in development mode and suppress repetitive logs
    if (process.env.NODE_ENV === 'development') {
      // Don't log common API calls that happen frequently
      if (!url.includes('/api/companies/current') && !url.includes('/api/tasks')) {
        console.log(`[TanStack Query] Fetching: ${url}`);
      }
    }

    // Add request ID for tracing
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    try {
      const res = await fetch(url, {
        credentials: "include",
        headers: {
          "X-Request-ID": requestId
        }
      });

      // Only log responses in development mode and suppress repetitive logs
      if (process.env.NODE_ENV === 'development') {
        // Don't log common API calls that happen frequently
        if (!url.includes('/api/companies/current') && !url.includes('/api/tasks')) {
          console.log(`[TanStack Query] Response for ${url}: Status ${res.status}`);
        }
      }

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        // Only log 401 errors even in production as they're important
        console.log(`[TanStack Query] 401 Unauthorized for ${url}, returning null as configured`);
        return null;
      }

      await throwIfResNotOk(res);
      
      // Get the text first so we can check for HTML
      const text = await res.text();
      
      // Check if the response is HTML (likely a login redirect)
      if (text.includes('<!DOCTYPE html>')) {
        console.warn(`[TanStack Query] HTML response received from ${url}, likely needs authentication`);
        return {}; // Return empty object
      }
      
      // Check if empty response
      if (!text.trim()) {
        console.warn(`[TanStack Query] Empty response from ${url}`);
        return {};
      }
      
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error(`[TanStack Query] Invalid JSON in response from ${url}:`, e);
        return {}; // Return empty object on parse error
      }
    } catch (error) {
      console.error(`[TanStack Query] Error fetching ${url}:`, error);
      throw error;
    }
  };

/**
 * Optimizes TanStack Query's behavior for different endpoints by providing
 * custom cache configurations based on the endpoint
 */
export function getOptimizedQueryOptions(url: string | string[]) {
  const urlStr = Array.isArray(url) ? url[0] : url;
  
  // Default configuration (moderate caching)
  const defaultOptions = {
    refetchInterval: false as const,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60, // 1 minute
    retry: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
  };
  
  // Risk score data - critical to always fetch fresh from server
  if (urlStr.includes('/api/risk-score/')) {
    return {
      refetchInterval: false as const,  // Don't poll automatically
      refetchOnWindowFocus: true,   // Always fetch when window gets focus
      staleTime: 0,                 // Always consider data stale - critical fix
      gcTime: 1000 * 60,           // 1 minute garbage collection time (React Query v5)
      retry: true,                  // Retry failed requests
      retryDelay: 1000,             // Retry after 1 second
      refetchOnReconnect: true,     // Always refetch on reconnect
      refetchOnMount: true,         // Always refetch on mount - critical fix
    };
  }
  
  // Frequently accessed endpoints - moderate caching but ensure updates are reflected for company permissions
  if (urlStr.includes('/api/companies/current')) {
    return {
      refetchInterval: 180000,      // 3 minutes - poll more frequently to catch permission changes
      refetchOnWindowFocus: true,   // Fetch when tab becomes active to check for updated permissions
      staleTime: 60000,             // 1 minute - keep data fresh for less time to reflect permission changes
      retry: false,
      gcTime: 5 * 60 * 1000,        // 5 minutes - garbage collection time (React Query v5)
      refetchOnReconnect: true,     // Refetch on reconnect to ensure permissions are current
      refetchOnMount: true,         // Refetch on mount to ensure permissions are current
    };
  }
  
  // Tasks endpoint - COMPLETELY DISABLED polling for true WebSocket architecture
  if (urlStr.includes('/api/tasks')) {
    return {
      refetchInterval: false,       // DISABLED - no polling at all
      refetchOnWindowFocus: false,  // DISABLED - no automatic fetching
      staleTime: Infinity,          // DISABLED - cache forever until WebSocket invalidates
      retry: false,
      gcTime: 30 * 60 * 1000,       // 30 minutes - garbage collection time (React Query v5)
      refetchOnReconnect: false,    // DISABLED - no automatic refetching
      refetchOnMount: false,        // DISABLED - no automatic mounting fetch
    };
  }
  
  // KYB fields - aggressive caching since form fields rarely change
  if (urlStr.includes('/api/kyb/fields') || urlStr.includes('/api/form-fields/')) {
    return {
      refetchInterval: false as const,  // Don't poll automatically
      refetchOnWindowFocus: false,  // Don't fetch on window focus
      staleTime: 3600000,           // 1 hour - form fields basically never change
      retry: false,
      gcTime: 3600000,              // 1 hour garbage collection time (React Query v5)
      refetchOnReconnect: false,    // Don't refetch on reconnect
      refetchOnMount: false,        // Don't refetch on mount
    };
  }
  
  // Task form data - cache longer since it changes less frequently
  if (urlStr.includes('/api/task-templates')) {
    return {
      refetchInterval: false as const,  // Don't poll automatically
      refetchOnWindowFocus: false,  // Don't fetch on window focus
      staleTime: 5 * 60 * 1000,     // 5 minutes - form templates rarely change
      retry: false,
      gcTime: 10 * 60 * 1000,       // 10 minutes - garbage collection time (React Query v5)
      refetchOnReconnect: true,
      refetchOnMount: true,
    };
  }
  
  return defaultOptions;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // These are the global defaults, but individual queries should use getOptimizedQueryOptions
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,          // DISABLED: Prevent artificial 30-second polling that triggers fake updates
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
