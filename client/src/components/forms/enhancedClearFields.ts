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
import getLogger from '@/utils/logger';

const logger = getLogger('EnhancedClearFields');

interface ClearFieldsOptions {
  preserveProgress?: boolean;
  skipBroadcast?: boolean;
  resetUI?: boolean;
  clearSections?: boolean;
}

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
): Promise<{success: boolean, message: string}> {
  const operationId = `clear_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Default options
  const opts = {
    preserveProgress: false,
    skipBroadcast: false,
    resetUI: true,
    clearSections: true,
    ...options
  };
  
  logger.info(`[EnhancedClear] Starting enhanced clear operation for task ${taskId} (${formType})`, {
    operationId,
    options: opts
  });

  try {
    // Map formType to URL-friendly form type for API consistency
    let formTypeForApi = formType;
    if (formType === 'company_kyb') {
      formTypeForApi = 'kyb';
    } else if (formType === 'open_banking') {
      formTypeForApi = 'open-banking';
    }
    
    // STEP 1: First, forcefully remove all existing cached data about this form
    // to ensure we don't have stale data influencing our UI
    const keysToRemove = [
      `/api/tasks/${taskId}`,
      `/api/${formTypeForApi}/progress/${taskId}`,
      `/api/${formTypeForApi.replace('-', '_')}/progress/${taskId}`,
      `/api/kyb/progress/${taskId}`,
      `/api/ky3p/progress/${taskId}`,
      `/api/open-banking/progress/${taskId}`
    ];
    
    logger.info(`[EnhancedClear] Removing form data from cache BEFORE API call`, {
      keys: keysToRemove,
      operationId
    });
    
    // Remove cache entries BEFORE the API call to prevent stale data influence
    for (const key of keysToRemove) {
      queryClient.removeQueries({ queryKey: [key] });
    }
    
    // STEP 2: Call API to clear fields on the server
    const clearUrl = `/api/${formTypeForApi}/clear/${taskId}${opts.preserveProgress ? '?preserveProgress=true' : ''}`;
    
    logger.info(`[EnhancedClear] Calling API to clear fields: ${clearUrl}`, {
      taskId,
      formType,
      operationId
    });
    
    const response = await fetch(clearUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add cache-busting headers
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify({ 
        preserveProgress: opts.preserveProgress,
        resetUI: opts.resetUI,
        clearSections: opts.clearSections,
        timestamp: Date.now(), // Include timestamp to prevent caching
        operationId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${await response.text()}`);
    }
    
    // Parse response
    const result = await response.json();
    
    // STEP 3: Purge all potentially affected API endpoints again
    // This ensures any in-flight requests or race conditions are addressed
    logger.info(`[EnhancedClear] Purging cache again AFTER successful API call`, {
      operationId
    });
    
    for (const key of keysToRemove) {
      queryClient.removeQueries({ queryKey: [key] });
    }
    
    // STEP 4: Force a fresh data fetch by refetching key data
    logger.info(`[EnhancedClear] Forcing fresh data fetch`, {
      operationId
    });
    
    // Get fresh task data with staleTime: 0 to force network request
    await queryClient.fetchQuery({ 
      queryKey: [`/api/tasks/${taskId}`],
      staleTime: 0
    });
    
    // Get fresh form progress data with staleTime: 0 to force network request
    await queryClient.fetchQuery({
      queryKey: [`/api/${formTypeForApi}/progress/${taskId}`],
      staleTime: 0
    });
    
    // STEP 5: Store operation in window._lastClearOperation to prevent redundant operations
    try {
      const now = Date.now();
      const blockExpiration = now + 60000; // 60 seconds
      
      // Store in window for cross-component access
      window._lastClearOperation = {
        taskId,
        timestamp: now,
        formType,
        blockExpiration,
        operationId
      };
      
      // Backup in localStorage for page refreshes
      localStorage.setItem('lastClearOperation', JSON.stringify({
        taskId,
        timestamp: now,
        formType,
        blockExpiration,
        operationId
      }));
      
      logger.info(`[EnhancedClear] Set window._lastClearOperation`, {
        taskId,
        formType,
        operationId,
        expires: new Date(blockExpiration).toISOString()
      });
    } catch (err) {
      // Non-critical error, just log it
      logger.warn(`[EnhancedClear] Failed to store operation info:`, err);
    }
    
    // STEP 6: Verify data is cleared with a direct fetch
    try {
      const freshDataResponse = await fetch(`/api/${formTypeForApi}/progress/${taskId}?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (freshDataResponse.ok) {
        const freshData = await freshDataResponse.json();
        logger.info(`[EnhancedClear] Verified fresh data:`, {
          formData: Object.keys(freshData.formData || {}).length,
          progress: freshData.progress,
          status: freshData.status,
          operationId
        });
      }
    } catch (fetchError) {
      // Non-critical error, just log it
      logger.warn(`[EnhancedClear] Error verifying fresh data:`, fetchError);
    }
    
    logger.info(`[EnhancedClear] Successfully completed clear operation`, {
      taskId,
      formType,
      operationId
    });
    
    return {
      success: true,
      message: result.message || 'Form fields cleared successfully'
    };
  } catch (error) {
    logger.error(`[EnhancedClear] Error clearing fields:`, error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to clear fields'
    };
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
  try {
    // Check window variable first
    if (window._lastClearOperation) {
      const { taskId: lastTaskId, formType: lastFormType, blockExpiration } = window._lastClearOperation;
      
      if (lastTaskId === taskId && lastFormType === formType && blockExpiration > Date.now()) {
        logger.info(`[EnhancedClear] Blocking clear operation for task ${taskId} due to recent clear`, {
          lastClear: new Date(window._lastClearOperation.timestamp).toISOString(),
          expiresAt: new Date(blockExpiration).toISOString(),
          timeRemaining: Math.floor((blockExpiration - Date.now()) / 1000) + ' seconds'
        });
        return true;
      }
    }
    
    // Fallback to localStorage if window variable isn't set
    const storedValue = localStorage.getItem('lastClearOperation');
    if (storedValue) {
      try {
        const stored = JSON.parse(storedValue);
        
        if (stored.taskId === taskId && 
            stored.formType === formType && 
            stored.blockExpiration > Date.now()) {
          logger.info(`[EnhancedClear] Blocking clear operation for task ${taskId} from localStorage`, {
            lastClear: new Date(stored.timestamp).toISOString(),
            expiresAt: new Date(stored.blockExpiration).toISOString(),
            timeRemaining: Math.floor((stored.blockExpiration - Date.now()) / 1000) + ' seconds'
          });
          return true;
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // If we get here, it's safe to proceed
    return false;
  } catch (e) {
    // If we encounter any errors checking, err on the side of allowing the operation
    logger.warn(`[EnhancedClear] Error checking block status:`, e);
    return false;
  }
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
  event: any,
  queryClient: QueryClient
): void {
  // Extract task info from the event
  const taskId = event.payload?.taskId || event.data?.taskId;
  const formType = event.payload?.formType || event.data?.formType;
  
  if (!taskId || !formType) {
    logger.warn('[WebSocketClear] Invalid clear fields event, missing taskId or formType', event);
    return;
  }
  
  logger.info(`[WebSocketClear] Processing WebSocket clear fields event for task ${taskId} (${formType})`, {
    eventType: event.type,
    timestamp: event.timestamp || new Date().toISOString()
  });
  
  // Map formType to API-friendly format
  let formTypeForApi = formType;
  if (formType === 'company_kyb') {
    formTypeForApi = 'kyb';
  } else if (formType === 'open_banking') {
    formTypeForApi = 'open-banking';
  }
  
  // Identify and remove all relevant cache entries
  const keysToRemove = [
    `/api/tasks/${taskId}`,
    `/api/${formTypeForApi}/progress/${taskId}`,
    `/api/${formTypeForApi.replace('-', '_')}/progress/${taskId}`,
    `/api/kyb/progress/${taskId}`,
    `/api/ky3p/progress/${taskId}`,
    `/api/open-banking/progress/${taskId}`
  ];
  
  // Remove all affected queries from cache
  for (const key of keysToRemove) {
    queryClient.removeQueries({ queryKey: [key] });
  }
  
  // Schedule a refetch of the key data to ensure fresh state
  setTimeout(() => {
    // Get fresh task data
    queryClient.fetchQuery({ 
      queryKey: [`/api/tasks/${taskId}`],
      staleTime: 0
    }).catch(err => logger.warn('[WebSocketClear] Error refetching task data', err));
    
    // Get fresh form progress data
    queryClient.fetchQuery({
      queryKey: [`/api/${formTypeForApi}/progress/${taskId}`],
      staleTime: 0
    }).catch(err => logger.warn('[WebSocketClear] Error refetching progress data', err));
    
    logger.info(`[WebSocketClear] Scheduled refetch of fresh data for task ${taskId}`);
  }, 100);
  
  // Store operation in window._lastClearOperation to prevent redundant operations
  try {
    const now = Date.now();
    const blockExpiration = now + 60000; // 60 seconds
    
    // Use operation ID from event if available
    const operationId = event.payload?.operationId || 
                        event.payload?.metadata?.operationId || 
                        `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    // Store in window for cross-component access
    window._lastClearOperation = {
      taskId,
      timestamp: now,
      formType,
      blockExpiration,
      operationId
    };
    
    // Backup in localStorage for page refreshes
    localStorage.setItem('lastClearOperation', JSON.stringify({
      taskId,
      timestamp: now,
      formType,
      blockExpiration,
      operationId
    }));
    
    logger.info(`[WebSocketClear] Set window._lastClearOperation`, {
      taskId,
      formType,
      operationId,
      expires: new Date(blockExpiration).toISOString()
    });
  } catch (err) {
    // Non-critical error, just log it
    logger.warn(`[WebSocketClear] Failed to store operation info:`, err);
  }
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
): Promise<boolean> {
  const operationId = `clear_broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  try {
    logger.info(`[BroadcastClear] Broadcasting clear fields operation for task ${taskId} (${formType})`, {
      operationId
    });
    
    // Use the task broadcast endpoint to trigger a clear fields event
    const response = await fetch(`/api/tasks/${taskId}/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: JSON.stringify({
        type: 'clear_fields',
        payload: {
          taskId,
          formType,
          preserveProgress: options.preserveProgress || false,
          resetUI: options.resetUI !== false,
          clearSections: options.clearSections !== false,
          timestamp: new Date().toISOString(),
          metadata: {
            operationId,
            source: 'client_broadcast',
            initiatedAt: new Date().toISOString()
          }
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${await response.text()}`);
    }
    
    logger.info(`[BroadcastClear] Successfully broadcasted clear fields operation`, {
      taskId,
      formType,
      operationId,
      status: response.status
    });
    
    return true;
  } catch (error) {
    logger.error(`[BroadcastClear] Error broadcasting clear fields:`, error);
    return false;
  }
}