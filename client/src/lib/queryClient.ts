import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Get response text and use it directly for the error message without status code
    const text = (await res.text()) || res.statusText;
    
    // Include the status in console for debugging, but not in the user-facing message
    console.error(`API error ${res.status}: ${text}`);
    
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
      return await res.json();
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
  
  // Frequently accessed endpoints - more aggressive caching to reduce redundant requests
  if (urlStr.includes('/api/companies/current')) {
    return {
      refetchInterval: 60000,       // 1 minute - poll for updates periodically 
      refetchOnWindowFocus: true,   // Fetch when tab becomes active
      staleTime: 30000,             // 30 seconds - keep data fresh for 30 seconds
      retry: false,
      cacheTime: 5 * 60 * 1000,     // 5 minutes - keep in cache longer
      refetchOnReconnect: true,
      refetchOnMount: true,
    };
  }
  
  // Tasks endpoint - slightly different caching strategy
  if (urlStr.includes('/api/tasks')) {
    return {
      refetchInterval: 45000,       // 45 seconds - poll for updates periodically
      refetchOnWindowFocus: true,   // Fetch when tab becomes active
      staleTime: 20000,             // 20 seconds - keep data fresh for 20 seconds
      retry: false,
      cacheTime: 3 * 60 * 1000,     // 3 minutes - keep in cache
      refetchOnReconnect: true,
      refetchOnMount: true,
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
