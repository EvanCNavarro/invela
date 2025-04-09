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

  const res = await fetch(url, {
    method,
    headers: bodyData ? { "Content-Type": "application/json" } : {},
    body: bodyData ? JSON.stringify(bodyData) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return await res.json() as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
