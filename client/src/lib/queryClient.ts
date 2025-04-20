import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
  }

  // Log API request for debugging
  console.log(`[API Request] ${method} ${url} with${bodyData ? '' : 'out'} body data`, 
    bodyData ? { bodyPreview: typeof bodyData === 'object' ? '(Object)' : String(bodyData).substring(0, 50) } : '');

  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(bodyData ? { "Content-Type": "application/json" } : {}),
        // Add a request ID to help with debugging
        "X-Request-ID": `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      },
      body: bodyData ? JSON.stringify(bodyData) : undefined,
      credentials: "include", // Always include credentials
    });

    // Log response status
    console.log(`[API Response] ${method} ${url} - Status: ${res.status}`);
    
    await throwIfResNotOk(res);
    return await res.json() as T;
  } catch (error) {
    console.error(`[API Error] ${method} ${url} - Failed:`, error);
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
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60, // 1 minute
    retry: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
  };
  
  // Frequently accessed endpoints - moderate caching but ensure updates are reflected for company permissions
  if (urlStr.includes('/api/companies/current')) {
    return {
      refetchInterval: 180000,      // 3 minutes - poll more frequently to catch permission changes
      refetchOnWindowFocus: true,   // Fetch when tab becomes active to check for updated permissions
      staleTime: 60000,             // 1 minute - keep data fresh for less time to reflect permission changes
      retry: false,
      cacheTime: 5 * 60 * 1000,     // 5 minutes - shorter cache time
      refetchOnReconnect: true,     // Refetch on reconnect to ensure permissions are current
      refetchOnMount: true,         // Refetch on mount to ensure permissions are current
    };
  }
  
  // Tasks endpoint - drastically reduce polling to prevent lag spikes
  if (urlStr.includes('/api/tasks')) {
    return {
      refetchInterval: 600000,      // 10 minutes - drastically reduce polling frequency
      refetchOnWindowFocus: false,  // Don't fetch when tab becomes active
      staleTime: 300000,            // 5 minutes - consider data fresh for much longer
      retry: false,
      cacheTime: 30 * 60 * 1000,    // 30 minutes - keep in cache much longer
      refetchOnReconnect: false,    // Don't refetch on reconnect
      refetchOnMount: false,        // Don't refetch on mount
    };
  }
  
  // KYB fields - aggressive caching since form fields rarely change
  if (urlStr.includes('/api/kyb/fields') || urlStr.includes('/api/form-fields/')) {
    return {
      refetchInterval: false,       // Don't poll automatically
      refetchOnWindowFocus: false,  // Don't fetch on window focus
      staleTime: 3600000,           // 1 hour - form fields basically never change
      retry: false,
      cacheTime: 3600000,           // 1 hour
      refetchOnReconnect: false,    // Don't refetch on reconnect
      refetchOnMount: false,        // Don't refetch on mount
    };
  }
  
  // Task form data - cache longer since it changes less frequently
  if (urlStr.includes('/api/task-templates')) {
    return {
      refetchInterval: false,       // Don't poll automatically
      refetchOnWindowFocus: false,  // Don't fetch on window focus
      staleTime: 5 * 60 * 1000,     // 5 minutes - form templates rarely change
      retry: false,
      cacheTime: 10 * 60 * 1000,    // 10 minutes - keep in cache longer
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
      staleTime: 30000,             // 30 seconds (shorter than previous Infinity)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
