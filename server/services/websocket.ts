/**
 * WebSocket Service
 * 
 * This module provides functionality for broadcasting updates via WebSocket.
 * It handles formatting and sending messages to connected clients.
 * 
 * Uses the improved websocketBroadcast utility for robust handling
 */

import { logger } from '../utils/logger';
import { WebSocketServer, WebSocket } from 'ws';
import { broadcastMessage as wsBroadcastMessage, setupWebSocketServerHandlers, hasConnectedClients } from '../utils/websocketBroadcast';

// Import the unified WebSocket server instance and functions
import { 
  getWebSocketServer as getUnifiedWebSocketServer,
  broadcastTaskUpdate as unifiedBroadcastTaskUpdate
} from '../utils/unified-websocket';

// Store for active WebSocket connections - use the unified websocket server
let wss: WebSocketServer | null = null;

/**
 * Get the WebSocket server instance
 * 
 * @returns The WebSocket server instance or null if not initialized
 */
export function getWebSocketServer(): WebSocketServer | null {
  // First try to use our local reference
  if (wss) {
    return wss;
  }
  
  // Fall back to the unified WebSocket server
  const unifiedWss = getUnifiedWebSocketServer();
  if (unifiedWss) {
    // Store the reference for future use
    wss = unifiedWss;
    logger.info('Using unified WebSocket server from now on');
  } else {
    // Log warning but don't throw an error - we'll attempt initialization later
    logger.warn('WebSocket server not available from unified implementation');
  }
  
  return wss;
}

// Initialize WebSocket server
export function initializeWebSocketServer(server: any): WebSocketServer {
  // First check if we already have a local reference
  if (wss) {
    logger.info('WebSocket server already initialized');
    return wss;
  }
  
  // Check if unified WebSocket server exists
  const unifiedWss = getUnifiedWebSocketServer();
  if (unifiedWss) {
    logger.info('Using existing unified WebSocket server');
    wss = unifiedWss;
    return wss;
  }
  
  logger.info('Initializing new WebSocket server');
  
  // Create WebSocket server on a distinct path to avoid conflicts with Vite HMR
  wss = new WebSocketServer({ 
    server, 
    path: '/ws',
    // Verify the connection is not Vite HMR
    verifyClient: (info: { req: { headers: Record<string, string | string[] | undefined> } }) => {
      const isViteHmr = info.req.headers['sec-websocket-protocol'] === 'vite-hmr';
      if (isViteHmr) {
        logger.info('Rejecting Vite HMR WebSocket connection');
        return false;
      }
      return true;
    }
  });
  
  // Set up standardized WebSocket server handlers using our utility
  setupWebSocketServerHandlers(wss);
  
  logger.info('WebSocket server initialized successfully');
  return wss;
}

/**
 * Broadcast a message to all connected clients
 * 
 * This enhanced version supports multiple message formats for compatibility
 * with different client implementations and improves error handling.
 * 
 * Uses our robust utility function under the hood.
 * 
 * @param type The type of message to broadcast
 * @param payload The payload to send with the message
 */
export async function broadcast(type: string, payload: any): Promise<void> {
  try {
    // First try to use our local reference
    if (!wss) {
      // Try to get the unified WebSocket server
      wss = getUnifiedWebSocketServer();
      if (wss) {
        logger.info('Successfully retrieved unified WebSocket server for broadcast');
      } else {
        logger.warn('WebSocket server not initialized, skipping broadcast');
        return;
      }
    }
    
    // Set standard timestamp for all messages
    const timestamp = new Date().toISOString();
    
    // Add taskId property at the top level if it exists in the payload
    // This ensures compatibility with both formats used by different clients
    const taskId = payload?.taskId || payload?.id || null;
    
    // Create the message in the expected format with both data and payload fields
    // This supports multiple client implementations that expect different formats
    const enhancedPayload = {
      // Include both payload and data fields for cross-compatibility
      payload: {
        ...payload,
        timestamp: timestamp
      },
      data: {
        ...payload,
        timestamp: timestamp
      },
      // Include taskId at the top level if available for compatibility
      ...(taskId && { taskId }),
      // Include timestamp at the top level
      timestamp
    };
    
    if (!hasConnectedClients(wss)) {
      logger.info('No active WebSocket clients, skipping broadcast', {
        messageType: type
      });
      return;
    }
    
    // Use our robust broadcast utility
    wsBroadcastMessage(wss, type, enhancedPayload);
    
    logger.info(`Successfully broadcasted ${type} message`);
  } catch (error) {
    logger.error(`Error broadcasting ${type} message`, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Broadcast a task update to all connected clients
 * 
 * This enhanced version first tries to use our own websocket service, but
 * falls back to the unified implementation if our service is not available.
 * This ensures that task updates are always broadcast, even if our
 * websocket service is not initialized correctly.
 * 
 * @param taskIdOrTask Either a task ID number or an object containing task properties
 * @param status Optional status string (only used if taskIdOrTask is a number)
 * @param metadata Optional metadata object (only used if taskIdOrTask is a number)
 */
export async function broadcastTaskUpdate(
  taskIdOrTask: number | { id: number; status?: string; progress?: number; metadata?: any },
  status?: string,
  metadata?: any
): Promise<void> {
  try {
    // First check if our WebSocket server is initialized
    const isOurWssAvailable = !!wss && wss.clients && hasConnectedClients(wss);
    
    if (!isOurWssAvailable) {
      // If our WebSocket server is not available, fall back to unified implementation
      logger.info('Our WebSocket server not initialized, falling back to unified implementation');
      
      try {
        // Try to use unified implementation
        if (typeof taskIdOrTask === 'number') {
          // Convert to object format for unified implementation
          unifiedBroadcastTaskUpdate({
            id: taskIdOrTask,
            status: status || 'not_started',
            progress: 0,
            metadata: metadata || {}
          });
          
          logger.info('Successfully broadcast task update using unified implementation', {
            taskId: taskIdOrTask,
            status
          });
          
          return;
        } else {
          // Use object format directly
          unifiedBroadcastTaskUpdate(taskIdOrTask);
          
          logger.info('Successfully broadcast task update using unified implementation', {
            taskId: taskIdOrTask.id,
            status: taskIdOrTask.status
          });
          
          return;
        }
      } catch (unifiedError) {
        logger.warn('Failed to use unified implementation, will attempt broadcast with our WSS anyway', {
          error: unifiedError instanceof Error ? unifiedError.message : 'Unknown error'
        });
      }
    }
    
    // If we get here, either our WebSocket server is available or the unified implementation failed
    if (typeof taskIdOrTask === 'number') {
      // Handle the signature: broadcastTaskUpdate(taskId, status, metadata)
      logger.debug('Broadcasting task update with numeric ID', {
        taskId: taskIdOrTask,
        status: status || 'unknown'
      });
      
      await broadcast('task_update', {
        id: taskIdOrTask,
        status,
        metadata
      });
    } else {
      // Handle the signature: broadcastTaskUpdate({ id, status, metadata })
      logger.debug('Broadcasting task update with object format', {
        taskId: taskIdOrTask.id,
        status: taskIdOrTask.status || 'unknown'
      });
      
      await broadcast('task_update', {
        id: taskIdOrTask.id,
        status: taskIdOrTask.status,
        progress: taskIdOrTask.progress,
        metadata: taskIdOrTask.metadata
      });
    }
  } catch (error) {
    logger.error('Error broadcasting task update:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId: typeof taskIdOrTask === 'number' ? taskIdOrTask : taskIdOrTask.id
    });
  }
}

/**
 * Broadcast a company update to all connected clients
 * 
 * @param companyId The company ID
 * @param data The data to broadcast
 */
export async function broadcastCompanyUpdate(companyId: number, data: any): Promise<void> {
  await broadcast('company_update', {
    id: companyId,
    ...data
  });
}

/**
 * Broadcast a message with any payload
 * 
 * @param type The message type
 * @param payload The message payload
 */
export async function broadcastMessage(type: string, payload: any): Promise<void> {
  await broadcast(type, payload);
}

/**
 * Broadcast company tabs update to all connected clients
 * 
 * @param companyId The company ID
 * @param availableTabs The available tabs for the company
 */
export async function broadcastCompanyTabsUpdate(companyId: number, availableTabs: string[]): Promise<void> {
  await broadcast('company_tabs_update', {
    companyId,
    availableTabs
  });
}

/**
 * Broadcast a WebSocket event by type to all clients
 * 
 * @param eventType The type of event to broadcast
 * @param data The data to associate with the event
 */
export async function broadcastEvent(eventType: string, data: any): Promise<void> {
  await broadcast(eventType, data);
}

/**
 * Broadcast a form submission event to all connected clients
 * 
 * This enhanced version includes additional logging, formats the data
 * for maximum compatibility with different client implementations,
 * and broadcasts on multiple channels for reliability.
 * 
 * It also caches the events for potential client reconnections.
 * 
 * @param formSubmissionData Form submission data containing taskId, formType, status, etc.
 */
export async function broadcastFormSubmission(formSubmissionData: {
  taskId: number;
  formType: string;
  status: 'success' | 'error' | 'in_progress';
  companyId?: number;
  fileId?: number | string;
  fileName?: string;
  unlockedTabs?: string[];
  error?: string;
  message?: string;
  completedActions?: any[];
}): Promise<void> {
  try {
    // Add detailed logging to help troubleshoot form submission issues
    logger.info('Broadcasting form submission event', {
      taskId: formSubmissionData.taskId,
      formType: formSubmissionData.formType,
      status: formSubmissionData.status,
      hasFileId: formSubmissionData.fileId !== undefined,
      fileId: formSubmissionData.fileId,
      hasFileName: formSubmissionData.fileName !== undefined,
      fileName: formSubmissionData.fileName,
      hasUnlockedTabs: Array.isArray(formSubmissionData.unlockedTabs) && formSubmissionData.unlockedTabs.length > 0,
      tabCount: Array.isArray(formSubmissionData.unlockedTabs) ? formSubmissionData.unlockedTabs.length : 0,
      hasCompletedActions: Array.isArray(formSubmissionData.completedActions) && formSubmissionData.completedActions.length > 0,
    });

    // Add timestamps for tracking - use the exact same timestamp for all fields
    // to ensure consistency when comparing message timing on the client
    const timestamp = new Date().toISOString();
    const submissionDate = timestamp;
    
    // Generate a unique message ID for tracking/deduplication
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create an enhanced payload with all necessary fields
    const payload = {
      ...formSubmissionData,
      submissionDate,
      timestamp,
      messageId, // Add messageId for tracking
      // Convert any numeric IDs to strings for JSON compatibility
      taskId: String(formSubmissionData.taskId),
      // Ensure fileId is always a string when present
      fileId: formSubmissionData.fileId ? String(formSubmissionData.fileId) : undefined,
      // Set default values for optional fields to avoid undefined issues
      companyId: formSubmissionData.companyId || null,
      fileName: formSubmissionData.fileName || null,
      unlockedTabs: formSubmissionData.unlockedTabs || [],
      error: formSubmissionData.error || null,
      message: formSubmissionData.message || null,
      completedActions: formSubmissionData.completedActions || [],
      // Add source information for debugging
      source: 'server-broadcast',
      serverVersion: '1.0.0-enhanced',
    };
    
    // Also add a numeric taskId for clients expecting that format
    const numericPayload = {
      ...payload,
      taskId: formSubmissionData.taskId,
    };
    
    // Cache the event for potential reconnections
    try {
      // Import dynamically to avoid circular dependencies
      const { cacheFormEvent } = await import('./form-event-cache');
      
      // Cache the form submission event
      cacheFormEvent({
        ...formSubmissionData,
        timestamp,
        messageId,
        // Make sure taskId is numeric in the cache
        taskId: typeof formSubmissionData.taskId === 'string' ? 
          parseInt(formSubmissionData.taskId) : formSubmissionData.taskId
      });
      
      logger.debug('Cached form submission event for potential reconnections', {
        taskId: formSubmissionData.taskId,
        formType: formSubmissionData.formType,
        messageId
      });
    } catch (cacheError) {
      logger.warn('Failed to cache form submission event', {
        error: cacheError instanceof Error ? cacheError.message : 'Unknown error',
        taskId: formSubmissionData.taskId,
        formType: formSubmissionData.formType
      });
    }
    
    // Broadcast on multiple channels for maximum compatibility
    // Different client implementations might be listening to different event types
    await broadcast('form_submission', payload);
    await broadcast('form_submitted', payload);
    
    // Also broadcast with numeric IDs for clients expecting that format
    await broadcast('form_submission', numericPayload);
    await broadcast('form_submitted', numericPayload);
    
    // Broadcast success via specialized 'submission_status' channel for FormSubmissionListener
    await broadcast('submission_status', {
      ...payload,
      type: 'form_submission',
      formId: formSubmissionData.taskId
    });
    
    logger.info('Successfully broadcasted form submission events', {
      taskId: formSubmissionData.taskId,
      status: formSubmissionData.status,
      timestamp,
      messageId
    });
  } catch (error) {
    logger.error('Error broadcasting form submission:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      taskId: formSubmissionData.taskId,
      formType: formSubmissionData.formType
    });
  }
}

export default {
  initializeWebSocketServer,
  getWebSocketServer,
  broadcast,
  broadcastTaskUpdate,
  broadcastCompanyTabsUpdate,
  broadcastCompanyUpdate,
  broadcastMessage,
  broadcastEvent,
  broadcastFormSubmission
};
