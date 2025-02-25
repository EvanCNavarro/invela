import { QueryClient } from "@tanstack/react-query";
import { AppError } from "@shared/utils/errors";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const errorData = await res.json();
      throw new AppError(
        errorData.message || res.statusText,
        res.status,
        errorData.code || 'API_ERROR',
        errorData.details
      );
    } catch (e) {
      if (e instanceof AppError) throw e;
      const text = await res.text();
      throw new AppError(text || res.statusText, res.status);
    }
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown,
): Promise<T> {
  console.log('[API Request]', {
    method,
    url,
    data: data ? { ...data, password: data.hasOwnProperty('password') ? '[REDACTED]' : undefined } : undefined
  });

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log('[API Response]', {
    status: res.status,
    statusText: res.statusText,
    url: res.url
  });

  await throwIfResNotOk(res);
  return await res.json();
}

// Define query keys as constants for consistency
export const queryKeys = {
  user: () => ['/api/user'],
  tasks: (filters?: Record<string, any>) => ['/api/tasks', ...(filters ? [filters] : [])],
  task: (id: string | number) => ['/api/tasks', id],
  companies: () => ['/api/companies'],
  company: (id: string | number) => ['/api/companies', id],
  files: () => ['/api/files'],
  file: (id: string | number) => ['/api/files', id],
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on certain errors
        if (error instanceof AppError && (error.status === 401 || error.status === 403)) {
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

  const authData = {
    cookies: getCookies(),
    hasSid: document.cookie.includes('sid='),
    hasRefreshToken: document.cookie.includes('refresh_token='),
    userInCache: queryClient.getQueryData(['/api/user']) !== undefined,
    timestamp: new Date().toISOString()
  };

  console.log('[Auth Debug] Current auth state:', authData);
  return authData;
}
