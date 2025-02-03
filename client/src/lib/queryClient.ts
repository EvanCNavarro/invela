import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: FormData | string | unknown;
  credentials?: RequestCredentials;
}

export async function apiRequest(url: string, options?: RequestOptions): Promise<any> {
  const headers: Record<string, string> = {};

  // Don't set Content-Type for FormData as the browser will set it with the boundary
  if (options?.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method: options?.method || 'GET',
    headers: { ...headers, ...options?.headers },
    body: options?.body instanceof FormData 
      ? options.body 
      : typeof options?.body === 'string' 
        ? options.body 
        : options?.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(response);

  // For DELETE requests, we might not have any content
  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch (e) {
    // If the response cannot be parsed as JSON, return null
    return null;
  }
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