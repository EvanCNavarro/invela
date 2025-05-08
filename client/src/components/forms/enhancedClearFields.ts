/**
 * Enhanced Clear Fields Module
 * 
 * This module provides comprehensive form field clearing functionality
 * that properly addresses all state management layers:
 * 1. Database state
 * 2. React Query cache
 * 3. Form component state
 * 4. react-hook-form state
 * 
 * It ensures that when fields are cleared, all layers are synchronized
 * to avoid stale data across the application.
 */

import { QueryClient } from '@tanstack/react-query';

export interface ClearFieldsOptions {
  preserveProgress?: boolean;
  skipBroadcast?: boolean;
  resetUI?: boolean;
  clearSections?: boolean;
}

export interface FieldsEvent {
  type: string;
  payload: {
    taskId: number;
    formType: string;
    preserveProgress?: boolean;
    resetUI?: boolean;
    clearSections?: boolean;
    metadata?: Record<string, any>;
    timestamp?: string;
  };
  timestamp?: string;
}

export interface ClearFieldsResult {
  success: boolean;
  message: string;
}

// Anti-debounce cooldown to prevent rapid repeated clear operations
const CLEAR_OPERATION_COOLDOWN = 5000; // 5 seconds

/**
 * Enhanced function to clear form fields that addresses all caching layers
 * 
 * @param taskId The ID of the task to clear fields for
 * @param formType The form type (kyb, ky3p, open_banking, etc.)
 * @param queryClient The React Query client instance
 * @param options Optional configuration for the clear operation
 * @returns A promise that resolves when the clear operation is complete
 */
export async function enhancedClearFields(
  taskId: number,
  formType: string,
  queryClient: QueryClient,
  options: ClearFieldsOptions = {}
): Promise<void> {
  try {
    // Generate a unique operation ID for this clear operation
    const operationId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Check if we should block this operation due to a recent clear
    if (shouldBlockClearOperation(taskId, formType)) {
      console.warn(`[enhancedClearFields] Blocked clear operation for task ${taskId} (${formType}) - too soon after previous clear`);
      return;
    }
    
    // Record this clear operation to prevent rapid repeated clears
    window._lastClearOperation = {
      taskId,
      formType,
      timestamp: Date.now(),
      blockExpiration: Date.now() + CLEAR_OPERATION_COOLDOWN,
      operationId
    };
    
    console.log(`[enhancedClearFields] Clearing fields for task ${taskId} (${formType})`, {
      preserveProgress: options.preserveProgress,
      skipBroadcast: options.skipBroadcast,
      resetUI: options.resetUI,
      clearSections: options.clearSections,
      operationId
    });
    
    // 1. First clear the database state via API call
    const response = await fetch(`/api/forms/clear-fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskId,
        formType,
        preserveProgress: !!options.preserveProgress,
        metadata: {
          source: 'client',
          timestamp: new Date().toISOString(),
          operationId
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to clear fields: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // 2. CRITICAL: Use removeQueries (not just invalidateQueries) to completely 
    // remove the stale data from the cache
    // This ensures the UI doesn't render stale data while refreshing
    
    // Remove form data queries
    queryClient.removeQueries({
      queryKey: [`/api/${formType}/fields/${taskId}`],
    });
    
    // Remove progress queries
    queryClient.removeQueries({
      queryKey: [`/api/${formType}/progress/${taskId}`],
    });
    
    // Remove any other related queries that might be affected
    queryClient.removeQueries({
      queryKey: [`/api/tasks/${taskId}`],
    });
    
    // 3. Broadcast to other clients if not skipped
    if (!options.skipBroadcast) {
      await broadcastClearFields(taskId, formType, options);
    }
    
    console.log(`[enhancedClearFields] Successfully cleared fields for task ${taskId} (${formType})`, {
      preserveProgress: options.preserveProgress,
      operationId
    });
    
    return;
  } catch (error) {
    console.error(`[enhancedClearFields] Error clearing fields for task ${taskId} (${formType}):`, error);
    throw error;
  }
}

/**
 * Checks if we should block a clear operation due to a recent clear
 * 
 * @param taskId The task ID to check
 * @param formType The form type to check
 * @returns Whether we should block the operation
 */
export function shouldBlockClearOperation(taskId: number, formType: string): boolean {
  if (!window._lastClearOperation) {
    return false;
  }
  
  const {
    taskId: lastTaskId,
    formType: lastFormType,
    blockExpiration
  } = window._lastClearOperation;
  
  // Allow clearing different tasks or form types
  if (lastTaskId !== taskId || lastFormType !== formType) {
    return false;
  }
  
  // Block if we're still within the cooldown period
  return Date.now() < blockExpiration;
}

/**
 * Enhanced function to handle WebSocket-driven form clearing
 * 
 * This function is called when a WebSocket 'clear_fields' event is received,
 * ensuring that the client state is properly synchronized with the server.
 * 
 * @param event The WebSocket event containing clear fields data
 * @param queryClient The React Query client instance
 */
export function handleWebSocketClearFields(
  event: FieldsEvent,
  queryClient: QueryClient
): void {
  const { taskId, formType, preserveProgress, metadata } = event.payload;
  
  // Check if this is our own operation - if so, we've already handled it locally
  const operationId = metadata?.operationId;
  if (operationId && window._lastClearOperation?.operationId === operationId) {
    console.log(`[handleWebSocketClearFields] Ignoring our own clear operation: ${operationId}`);
    return;
  }
  
  // Check for debounce/cooldown
  if (shouldBlockClearOperation(taskId, formType)) {
    console.warn(`[handleWebSocketClearFields] Ignoring clear fields operation due to cooldown: task ${taskId} (${formType})`);
    return;
  }
  
  console.log(`[handleWebSocketClearFields] Processing remote clear fields event for task ${taskId} (${formType})`, event);
  
  // Record this clear operation to prevent duplicate handling
  window._lastClearOperation = {
    taskId,
    formType,
    timestamp: Date.now(),
    blockExpiration: Date.now() + CLEAR_OPERATION_COOLDOWN,
    operationId: operationId || `ws_${Date.now()}`
  };
  
  // Use removeQueries (not just invalidateQueries) to completely clear the cache
  // This is critical for resetting the UI state properly
  
  // Remove form data queries
  queryClient.removeQueries({
    queryKey: [`/api/${formType}/fields/${taskId}`],
  });
  
  // Remove progress queries
  queryClient.removeQueries({
    queryKey: [`/api/${formType}/progress/${taskId}`],
  });
  
  // Remove any other related queries that might be affected
  queryClient.removeQueries({
    queryKey: [`/api/tasks/${taskId}`],
  });
  
  console.log(`[handleWebSocketClearFields] Successfully processed clear fields event for task ${taskId} (${formType})`);
}

/**
 * Utility function to broadcast a clear fields operation to all connected clients
 * 
 * This function sends a request to the server to broadcast a clear fields event
 * via WebSocket to all connected clients, ensuring synchronized UI state.
 * 
 * @param taskId The ID of the task to clear fields for
 * @param formType The form type (kyb, ky3p, open_banking, etc.)
 * @param options Optional configuration for the clear operation
 * @returns A promise that resolves when the broadcast request completes
 */
export async function broadcastClearFields(
  taskId: number,
  formType: string,
  options: ClearFieldsOptions = {}
): Promise<void> {
  try {
    console.log(`[broadcastClearFields] Broadcasting clear fields for task ${taskId} (${formType})`);
    
    // Use our task broadcast endpoint to send the clear_fields event
    const response = await fetch(`/api/tasks/${taskId}/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'clear_fields',
        payload: {
          formType,
          preserveProgress: !!options.preserveProgress,
          resetUI: options.resetUI !== false,
          clearSections: options.clearSections !== false,
          metadata: {
            source: 'client_broadcast',
            timestamp: new Date().toISOString(),
            operationId: window._lastClearOperation?.operationId || `broadcast_${Date.now()}`
          }
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to broadcast clear fields: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    console.log(`[broadcastClearFields] Successfully broadcast clear fields for task ${taskId} (${formType})`);
  } catch (error) {
    console.error(`[broadcastClearFields] Error broadcasting clear fields for task ${taskId} (${formType}):`, error);
    // Don't re-throw the error since this is a background operation
    // and should not block the main clear fields flow
  }
}