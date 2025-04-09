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
    console.log(`[TanStack Query] Fetching: ${url}`);

    // Add request ID for tracing
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    try {
      const res = await fetch(url, {
        credentials: "include",
        headers: {
          "X-Request-ID": requestId
        }
      });

      console.log(`[TanStack Query] Response for ${url}: Status ${res.status}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
