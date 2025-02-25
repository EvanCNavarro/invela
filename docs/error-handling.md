# Error Handling Strategy

This document outlines the error handling strategy implemented in our application to ensure a consistent, user-friendly approach to handling errors across the codebase.

## Core Components

Our error handling strategy consists of several key components:

1. **Shared Error Types**: Common error types defined in `@shared/utils/errors.ts`
2. **Error Boundary Component**: React error boundary for catching and displaying UI errors
3. **API Error Hook**: Custom hook for handling API errors consistently
4. **Global Query Client Configuration**: Default error handling for React Query

## Shared Error Types

We use a custom `AppError` class that extends the standard JavaScript `Error` class to provide additional context:

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code: string = 'INTERNAL_SERVER_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

This allows us to include HTTP status codes, error codes, and additional details with our errors.

## Error Boundary Component

The `ErrorBoundary` component (`client/src/components/ErrorBoundary.tsx`) catches JavaScript errors in its child component tree and displays a fallback UI instead of crashing the entire application.

### Usage:

```tsx
import ErrorBoundary from '@/components/ErrorBoundary';

// Wrap components that might throw errors
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

You can also provide a custom fallback UI:

```tsx
<ErrorBoundary fallback={<CustomErrorComponent />}>
  <YourComponent />
</ErrorBoundary>
```

## API Error Hook

The `useApiError` hook (`client/src/hooks/useApiError.ts`) provides a consistent way to handle API errors across the application:

### Usage:

```tsx
import useApiError from '@/hooks/useApiError';

function YourComponent() {
  const { handleError } = useApiError();
  
  // Use with try/catch
  const handleAction = async () => {
    try {
      // Code that might throw an error
      await someApiCall();
    } catch (error) {
      handleError(error);
    }
  };
  
  // Use with React Query
  const mutation = useMutation({
    mutationFn: async (data) => {
      // Your API call
    },
    onError: (error) => {
      handleError(error);
    }
  });
  
  return (
    // Your component JSX
  );
}
```

## Global Query Client Configuration

Our React Query client (`client/src/lib/queryClient.ts`) is configured with default error handling:

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on certain errors
        if (error instanceof AppError && (error.status === 401 || error.status === 403)) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation error:', error);
      }
    }
  },
});
```

We also provide a helper function for creating mutations with error handling:

```typescript
export function createMutation<TData, TError, TVariables, TContext>(
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
  };
}
```

## Server-Side Error Handling

On the server side, we use middleware to catch and format errors consistently:

```typescript
// server/middleware/error.ts
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the error
  console.error('Server error:', err);
  
  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.status).json({
      message: err.message,
      code: err.code,
      details: err.details
    });
  }
  
  // Handle other errors
  return res.status(500).json({
    message: err.message || 'Internal Server Error',
    code: 'INTERNAL_SERVER_ERROR'
  });
};
```

## Best Practices

1. **Use Error Boundaries for UI Components**: Wrap complex UI components with `ErrorBoundary` to prevent the entire application from crashing.

2. **Use `useApiError` for API Calls**: Always use the `useApiError` hook when making API calls to ensure consistent error handling.

3. **Throw Specific Errors**: When throwing errors, use the `AppError` class with appropriate status codes and error codes.

4. **Handle Expected Errors Gracefully**: For expected errors (e.g., validation errors), provide clear error messages to the user.

5. **Log Unexpected Errors**: Always log unexpected errors for debugging purposes.

## Example

See `client/src/components/examples/ErrorHandlingExample.tsx` for a complete example of how to use these error handling components in practice. 