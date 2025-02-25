# Detailed Implementation Plan for Codebase Improvements

## Context Overview

You are working on a full-stack TypeScript application with a React frontend and Express backend. The application uses:
- React with functional components and hooks
- TanStack React Query for data fetching
- Express.js backend with REST endpoints
- WebSocket for real-time updates
- Drizzle ORM with PostgreSQL
- Authentication with Passport.js
- Vite for frontend build and dev server

## Priority Tasks

Implement these improvements in the following order, as they represent the most critical integration issues:

### 1. Establish Type Consistency Between Client and Server

**Problem:** Types are defined separately in client and server, leading to potential inconsistencies.

**Implementation Instructions:**

1. Create a shared types directory:
```bash
mkdir -p shared/types
```

2. Extract common type definitions from both client and server:
   - Move task status definitions to `shared/types/tasks.ts`:

```typescript
// shared/types/tasks.ts
export const TaskStatus = {
  EMAIL_SENT: 'email_sent',
  COMPLETED: 'completed',
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  READY_FOR_SUBMISSION: 'ready_for_submission',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
} as const;

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export interface Task {
  id: number;
  title: string;
  description?: string;
  task_type: string;
  task_scope: string;
  status: TaskStatus;
  priority: string;
  progress: number;
  assigned_to?: number;
  created_by?: number;
  company_id: number;
  user_email?: string;
  due_date?: string;
  completion_date?: string;
  files_requested: string[];
  files_uploaded: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

3. Define shared authentication types in `shared/types/auth.ts`:

```typescript
// shared/types/auth.ts
export type RegisterData = {
  email: string;
  password: string;
  fullName: string;
  firstName: string;
  lastName: string;
  invitationCode: string;
};

export type LoginData = {
  email: string;
  password: string;
};

export type User = {
  id: number;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  company_id: number;
  onboarding_user_completed: boolean;
  created_at: string;
  updated_at: string;
};
```

4. Update tsconfig.json paths to reference the shared directory:

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./client/src/*"],
      "@db/*": ["./db/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}
```

5. Update all imports in client and server code to reference these shared types.

### 2. Standardize WebSocket Implementation

**Problem:** WebSocket implementations on client and server lack type safety and consistent message formats.

**Implementation Instructions:**

1. Create shared WebSocket message types:

```typescript
// shared/types/websocket.ts
export type WebSocketMessageType = 
  | 'connection_established'
  | 'task_update'
  | 'file_update'
  | 'ping'
  | 'pong'
  | 'error';

export interface WebSocketBaseMessage {
  type: WebSocketMessageType;
  timestamp?: string;
}

export interface ConnectionEstablishedMessage extends WebSocketBaseMessage {
  type: 'connection_established';
  data: {
    timestamp: string;
  };
}

export interface TaskUpdateMessage extends WebSocketBaseMessage {
  type: 'task_update';
  data: {
    id: number;
    status: import('./tasks').TaskStatus;
    progress: number;
    metadata?: Record<string, any>;
  };
}

export interface FileUpdateMessage extends WebSocketBaseMessage {
  type: 'file_update';
  data: {
    id: number;
    file_name: string;
    status: string;
  };
}

export interface PingMessage extends WebSocketBaseMessage {
  type: 'ping';
}

export interface PongMessage extends WebSocketBaseMessage {
  type: 'pong';
}

export interface ErrorMessage extends WebSocketBaseMessage {
  type: 'error';
  error: {
    code: string;
    message: string;
  };
}

export type WebSocketMessage =
  | ConnectionEstablishedMessage
  | TaskUpdateMessage
  | FileUpdateMessage
  | PingMessage
  | PongMessage
  | ErrorMessage;
```

2. Update server WebSocket implementation:

```typescript
// server/services/websocket.ts
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { 
  WebSocketMessage, 
  TaskUpdateMessage 
} from '@shared/types/websocket';
import type { TaskStatus } from '@shared/types/tasks';

// Rest of the implementation...

export function broadcastTaskUpdate(taskUpdate: TaskUpdateMessage['data']): void {
  if (!wss) {
    console.warn('[WebSocket] Cannot broadcast task update: WebSocket server not initialized');
    return;
  }

  const message: TaskUpdateMessage = {
    type: 'task_update',
    timestamp: new Date().toISOString(),
    data: taskUpdate
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}
```

3. Update client WebSocket hook:

```typescript
// client/src/hooks/useWebSocket.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { 
  WebSocketMessage,
  TaskUpdateMessage,
  FileUpdateMessage
} from '@shared/types/websocket';

interface UseWebSocketReturn {
  socket: WebSocket | null;
  connected: boolean;
  error: Error | null;
}

// Rest of the implementation...

ws.onmessage = (event) => {
  if (!mounted.current) return;

  try {
    const data = JSON.parse(event.data) as WebSocketMessage;
    
    switch (data.type) {
      case 'task_update':
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        break;
      case 'file_update':
        queryClient.invalidateQueries({ queryKey: ['/api/files'] });
        break;
      case 'pong':
        // Reset pong timeout
        break;
      case 'error':
        console.error('[WebSocket] Server error:', data.error.message);
        break;
    }
  } catch (err) {
    console.error('[WebSocket] Message parse error:', err);
  }
};
```

### 3. Enhance Authentication System

**Problem:** Authentication lacks refresh tokens and robust error handling.

**Implementation Instructions:**

1. Update server auth implementation to add refresh tokens:

```typescript
// db/schema.ts - Add refresh tokens table
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});
```

2. Create refresh token service:

```typescript
// server/services/token.ts
import crypto from 'crypto';
import { db } from '@db';
import { refreshTokens } from '@db/schema';
import { eq } from 'drizzle-orm';

const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function generateRefreshToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY);
  
  await db.insert(refreshTokens).values({
    user_id: userId,
    token,
    expires_at: expiresAt
  });
  
  return token;
}

export async function verifyRefreshToken(token: string): Promise<number | null> {
  const result = await db.select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, token))
    .limit(1);
    
  if (result.length === 0) {
    return null;
  }
  
  const refreshToken = result[0];
  
  if (new Date(refreshToken.expires_at) < new Date()) {
    // Token expired, delete it
    await db.delete(refreshTokens)
      .where(eq(refreshTokens.id, refreshToken.id));
    return null;
  }
  
  return refreshToken.user_id;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await db.delete(refreshTokens)
    .where(eq(refreshTokens.token, token));
}

export async function revokeAllUserRefreshTokens(userId: number): Promise<void> {
  await db.delete(refreshTokens)
    .where(eq(refreshTokens.user_id, userId));
}
```

3. Update login and refresh token endpoints:

```typescript
// server/auth.ts - Add to existing file
app.post("/api/login", passport.authenticate('local'), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication failed" });
  }
  
  // Generate refresh token
  const refreshToken = await generateRefreshToken(req.user.id);
  
  // Send refresh token as HTTP-only cookie
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
  
  return res.json(req.user);
});

app.post("/api/refresh", async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  
  if (!refreshToken) {
    return res.status(401).json({ 
      message: "No refresh token provided",
      code: "REFRESH_TOKEN_MISSING"
    });
  }
  
  const userId = await verifyRefreshToken(refreshToken);
  
  if (!userId) {
    res.clearCookie('refresh_token');
    return res.status(401).json({ 
      message: "Invalid or expired refresh token",
      code: "REFRESH_TOKEN_INVALID"
    });
  }
  
  // Look up user
  const userResult = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
    
  if (userResult.length === 0) {
    res.clearCookie('refresh_token');
    return res.status(401).json({ 
      message: "User not found",
      code: "USER_NOT_FOUND"
    });
  }
  
  const user = userResult[0];
  
  // Login the user
  req.login(user, async (err) => {
    if (err) {
      return res.status(500).json({ 
        message: "Error logging in user",
        code: "LOGIN_ERROR"
      });
    }
    
    // Generate new refresh token and revoke old one
    await revokeRefreshToken(refreshToken);
    const newRefreshToken = await generateRefreshToken(user.id);
    
    // Set new refresh token cookie
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    return res.json(user);
  });
});

app.post("/api/logout", requireAuth, async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
    res.clearCookie('refresh_token');
  }
  
  req.logout((err) => {
    if (err) {
      console.error('[Auth] Error during logout:', err);
    }
    res.status(200).json({ message: "Logged out successfully" });
  });
});
```

4. Update client-side authentication hook to handle token refresh:

```typescript
// client/src/hooks/use-auth.tsx
// Add to existing file

const refreshSession = useCallback(async () => {
  try {
    const res = await apiRequest("POST", "/api/refresh");
    const user = await res.json();
    queryClient.setQueryData(["/api/user"], user);
    return user;
  } catch (error) {
    // Session expired or other error
    queryClient.setQueryData(["/api/user"], null);
    return null;
  }
}, [queryClient]);

// Add refreshSession to the context value
const value = React.useMemo(() => ({
  user: user ?? null,
  isLoading,
  error,
  loginMutation,
  logoutMutation,
  registerMutation,
  refreshSession
}), [user, isLoading, error, loginMutation, logoutMutation, registerMutation, refreshSession]);
```

### 4. Implement Consistent Error Handling

**Problem:** Error handling is inconsistent across the application.

**Implementation Instructions:**

1. Create unified error class in `shared/utils/errors.ts`:

```typescript
// shared/utils/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code: string = 'UNKNOWN_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    code: string = 'AUTH_ERROR'
  ) {
    super(message, 401, code);
    this.name = 'AuthError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    details?: any
  ) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(
    entity: string = 'Resource',
    id?: string | number
  ) {
    const message = id 
      ? `${entity} with ID ${id} not found` 
      : `${entity} not found`;
    
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}
```

2. Create an error middleware for the server:

```typescript
// server/middleware/error.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@shared/utils/errors';
import { fromZodError } from 'zod-validation-error';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error, 
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  console.error(`[Error] ${req.method} ${req.path}:`, err);
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return res.status(400).json({
      status: 400,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: validationError.details,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    });
  }
  
  // Handle known application errors
  if (err instanceof AppError) {
    return res.status(err.status).json({
      status: err.status,
      message: err.message,
      code: err.code,
      details: err.details,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    });
  }
  
  // Handle unknown errors
  const isProduction = process.env.NODE_ENV === 'production';
  const status = 500;
  
  return res.status(status).json({
    status,
    message: isProduction ? 'Internal Server Error' : err.message,
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    ...(isProduction ? {} : { stack: err.stack })
  });
}
```

3. Register the error middleware in `server/index.ts`:

```typescript
// server/index.ts
// Replace existing error handler with import
import { errorHandler } from './middleware/error';

// ... existing code ...

// Error handling middleware - place after all routes
app.use(errorHandler);
```

4. Create a client-side error boundary component:

```typescript
// client/src/components/ErrorBoundary.tsx
import React from 'react';
import { useToast } from '@/hooks/use-toast';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends React.Component<
  ErrorBoundaryProps & { showToast: (error: Error) => void },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { showToast: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Uncaught error:", error, errorInfo);
    this.props.showToast(error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-4 border rounded-md bg-red-50 border-red-300">
          <h2 className="text-lg font-medium text-red-800">Something went wrong</h2>
          <p className="mt-1 text-sm text-red-700">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button 
            className="mt-2 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded-md"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary(props: ErrorBoundaryProps): JSX.Element {
  const { toast } = useToast();
  
  const showToast = React.useCallback((error: Error) => {
    toast({
      title: "An error occurred",
      description: error.message,
      variant: "destructive",
    });
  }, [toast]);
  
  return <ErrorBoundaryClass {...props} showToast={showToast} />;
}
```

5. Wrap major components with the error boundary in `App.tsx`:

```typescript
// client/src/App.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ... existing imports ...

function Router() {
  // ... existing code ...

  return (
    <ErrorBoundary>
      <Switch>
        {/* Routes wrapped with ErrorBoundary */}
      </Switch>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <Router />
          <Toaster position="bottom-right" />
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
```

### 5. Optimize React Query Implementation

**Problem:** React Query usage lacks optimistic updates and consistent cache invalidation.

**Implementation Instructions:**

1. Create a queryClient configuration file:

```typescript
// client/src/lib/queryClient.ts
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
  },
});
```

2. Create task hooks with optimistic updates:

```typescript
// client/src/hooks/use-tasks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryKeys } from '@/lib/queryClient';
import type { Task, TaskStatus } from '@shared/types/tasks';

interface UpdateTaskStatusData {
  taskId: number;
  status: TaskStatus;
}

export function useTasks(filters?: Record<string, any>) {
  return useQuery<Task[]>({
    queryKey: queryKeys.tasks(filters),
  });
}

export function useTask(taskId: string | number) {
  return useQuery<Task>({
    queryKey: queryKeys.task(taskId),
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: UpdateTaskStatusData) => {
      return apiRequest<Task>('PATCH', `/api/tasks/${taskId}`, { status });
    },
    onMutate: async ({ taskId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.task(taskId) });
      
      // Snapshot the previous value
      const previousTask = queryClient.getQueryData<Task>(queryKeys.task(taskId));
      
      // Optimistically update the cache
      if (previousTask) {
        queryClient.setQueryData<Task>(queryKeys.task(taskId), {
          ...previousTask,
          status,
          // Calculate progress based on status
          progress: status === 'COMPLETED' ? 100 : previousTask.progress,
          updated_at: new Date().toISOString(),
        });
      }
      
      return { previousTask };
    },
    onError: (err, { taskId }, context) => {
      // If the mutation fails, restore the previous value
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.task(taskId), context.previousTask);
      }
    },
    onSettled: (_, __, { taskId }) => {
      // Always refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
    },
  });
}
```

## Additional Implementation Tasks

After completing the priority tasks, proceed with these additional improvements:

### 6. Environment Configuration Validation

1. Create environment validation in `server/utils/env.ts`:

```typescript
// server/utils/env.ts
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).default('5001'),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET must be at least 32 characters"),
  // Add other required environment variables
});

type Env = z.infer<typeof envSchema>;

try {
  // Validate environment variables
  const env = envSchema.parse(process.env);
  export default env;
} catch (error) {
  if (error instanceof z.ZodError) {
    const validationError = fromZodError(error);
    console.error('\nEnvironment validation failed:');
    console.error(validationError.message);
    process.exit(1);
  }
  throw error;
}
```

2. Use validated environment variables in `server/index.ts`:

```typescript
// server/index.ts
import env from './utils/env';

// ... existing code ...

const port = env.PORT;
server.listen(port, () => {
  log(`Server running on port ${port} in ${env.NODE_ENV} mode`);
});
```

### 7. Adding API Documentation

1. Use JSDoc comments to document API endpoints in `server/routes.ts`:

```typescript
// server/routes.ts - Add JSDoc comments above each endpoint

/**
 * @api {get} /api/tasks Get all tasks
 * @apiName GetTasks
 * @apiGroup Task
 * @apiDescription Fetches all tasks for the current user's company
 * 
 * @apiQuery {String} [status] Filter tasks by status
 * @apiQuery {String} [priority] Filter tasks by priority
 * @apiQuery {Number} [assigned_to] Filter tasks by assigned user ID
 * 
 * @apiSuccess {Object[]} tasks List of tasks
 * @apiError {Object} error Error object with message
 */
app.get("/api/tasks", requireAuth, async (req, res, next) => {
  try {
    // ... implementation ...
  } catch (error) {
    next(error);
  }
});
```

## Validation and Testing

After implementing these changes, follow these validation steps:

1. **Type Checking**:
   ```bash
   npm run check
   ```

2. **Run Development Servers**:
   ```bash
   npm run dev
   ```

3. **Test Authentication Flow**:
   - Register a new account
   - Log in
   - Verify session persistence
   - Test refresh token functionality
   - Log out

4. **Test WebSocket Functionality**:
   - Open multiple browser windows
   - Make changes in one window that should broadcast
   - Verify updates appear in other windows

5. **Test Error Handling**:
   - Simulate network errors
   - Submit invalid form data
   - Verify error boundaries catch and display UI errors

## Implementation Notes

- Implement changes incrementally, starting with the shared types
- Test after each major change before proceeding to the next
- Keep the existing functionality working while making improvements
- Document all changes made for future reference 