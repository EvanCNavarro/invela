/**
 * ========================================
 * Authentication State Synchronization Utilities
 * ========================================
 * 
 * Utility functions for managing frontend authentication state synchronization
 * with backend session changes, particularly after automatic login processes.
 * 
 * Key Features:
 * - React Query cache invalidation for auth state
 * - Comprehensive logging for debugging auth flow
 * - Fallback strategies for failed synchronization
 * - Type-safe error handling
 * 
 * @module auth-sync-utils
 * @version 1.0.0
 * @since 2025-05-26
 */

// ========================================
// IMPORTS
// ========================================

import type { QueryClient } from '@tanstack/react-query';

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Authentication synchronization result interface
 * Provides detailed feedback about cache invalidation success/failure
 */
interface AuthSyncResult {
  success: boolean;
  action: 'cache_invalidated' | 'cache_failed' | 'fallback_used';
  timestamp: string;
  error?: string;
  duration?: number;
}

/**
 * Authentication sync options configuration
 * Allows customization of sync behavior and timing
 */
interface AuthSyncOptions {
  retryAttempts?: number;
  delayMs?: number;
  fallbackNavigation?: boolean;
  queryKey?: string[];
}

// ========================================
// CONSTANTS
// ========================================

/** Default React Query key for user authentication */
const DEFAULT_AUTH_QUERY_KEY = ["/api/user"];

/** Default sync configuration */
const DEFAULT_SYNC_OPTIONS: Required<AuthSyncOptions> = {
  retryAttempts: 2,
  delayMs: 200,
  fallbackNavigation: true,
  queryKey: DEFAULT_AUTH_QUERY_KEY,
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Enhanced logging utility for authentication synchronization events
 * Provides consistent, trackable log messages with structured data
 * 
 * @param level - Log level (info, warn, error)
 * @param message - Primary log message
 * @param data - Additional structured data for debugging
 */
function logAuthSync(
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    module: 'AuthSync',
    ...data,
  };

  const logMessage = `[AuthSync] ${message}`;
  
  switch (level) {
    case 'info':
      console.log(logMessage, logData);
      break;
    case 'warn':
      console.warn(logMessage, logData);
      break;
    case 'error':
      console.error(logMessage, logData);
      break;
  }
}

/**
 * Synchronizes frontend authentication state with backend session
 * Invalidates React Query cache to force refetch of user authentication status
 * 
 * @param queryClient - React Query client instance
 * @param options - Synchronization configuration options
 * @returns Promise that resolves with sync result details
 * 
 * @example
 * const result = await synchronizeAuthState(queryClient);
 * if (result.success) {
 *   // Navigate to authenticated route
 * }
 */
export async function synchronizeAuthState(
  queryClient: QueryClient,
  options: AuthSyncOptions = {}
): Promise<AuthSyncResult> {
  const config = { ...DEFAULT_SYNC_OPTIONS, ...options };
  const startTime = Date.now();
  
  logAuthSync('info', 'Starting authentication state synchronization', {
    queryKey: config.queryKey,
    retryAttempts: config.retryAttempts,
  });

  try {
    // Attempt to invalidate authentication cache
    await queryClient.invalidateQueries({
      queryKey: config.queryKey,
      refetchType: 'active', // Only refetch active queries
    });

    // Add small delay to ensure cache refresh completes
    await new Promise(resolve => setTimeout(resolve, config.delayMs));

    const duration = Date.now() - startTime;
    const result: AuthSyncResult = {
      success: true,
      action: 'cache_invalidated',
      timestamp: new Date().toISOString(),
      duration,
    };

    logAuthSync('info', 'Authentication cache successfully invalidated', {
      duration,
      queryKey: config.queryKey,
    });

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
    
    const result: AuthSyncResult = {
      success: false,
      action: 'cache_failed',
      timestamp: new Date().toISOString(),
      error: errorMessage,
      duration,
    };

    logAuthSync('error', 'Failed to invalidate authentication cache', {
      error: errorMessage,
      duration,
      fallbackEnabled: config.fallbackNavigation,
    });

    return result;
  }
}

/**
 * Attempts to import queryClient dynamically with error handling
 * Provides safe access to React Query client instance
 * 
 * @returns Promise that resolves with queryClient or throws descriptive error
 */
export async function getQueryClient(): Promise<QueryClient> {
  try {
    const { queryClient } = await import('@/lib/queryClient');
    return queryClient;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown import error';
    logAuthSync('error', 'Failed to import queryClient', { error: errorMessage });
    throw new Error(`QueryClient import failed: ${errorMessage}`);
  }
}

/**
 * Complete authentication synchronization workflow
 * Combines queryClient import and state synchronization with comprehensive error handling
 * 
 * @param options - Synchronization configuration options
 * @returns Promise that resolves with detailed sync result
 * 
 * @example
 * const result = await performAuthSync();
 * if (result.success) {
 *   // Proceed with authenticated navigation
 * } else {
 *   // Handle sync failure appropriately
 * }
 */
export async function performAuthSync(
  options: AuthSyncOptions = {}
): Promise<AuthSyncResult> {
  logAuthSync('info', 'Initiating complete authentication synchronization workflow');

  try {
    // Step 1: Get queryClient instance
    const queryClient = await getQueryClient();
    
    // Step 2: Perform synchronization
    const syncResult = await synchronizeAuthState(queryClient, options);
    
    logAuthSync('info', 'Authentication synchronization workflow completed', {
      success: syncResult.success,
      action: syncResult.action,
      duration: syncResult.duration,
    });

    return syncResult;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown workflow error';
    
    const result: AuthSyncResult = {
      success: false,
      action: 'cache_failed',
      timestamp: new Date().toISOString(),
      error: errorMessage,
    };

    logAuthSync('error', 'Authentication synchronization workflow failed', {
      error: errorMessage,
      stage: 'workflow_execution',
    });

    return result;
  }
}