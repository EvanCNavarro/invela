/**
 * Task Update Broadcaster
 * 
 * This utility module provides functions for broadcasting task updates
 * to all connected WebSocket clients. It ensures consistent formatting
 * of messages across different parts of the application.
 */

import { WebSocketServer } from 'ws';
import { logger } from './logger';
import { getWebSocketServer } from './unified-websocket-server';

/**
 * Broadcast a task update to all connected WebSocket clients
 * 
 * This function sends a task_update message to all connected clients
 * to inform them about changes in a task's progress, status, or other properties.
 * 
 * @param taskId The ID of the task that was updated
 * @param progress The new progress value (0-100)
 * @param status The new status ('not_started', 'in_progress', etc.)
 * @param metadata Additional metadata to include in the message
 * @param diagnosticId Optional diagnostic ID for tracing
 * @returns Object with broadcast results
 */
export async function broadcastTaskUpdate(
  taskId: number,
  progress: number,
  status: string,
  metadata: Record<string, any> = {},
  diagnosticId?: string
) {
  try {
    // Get the WebSocket server instance
    const wss = await getWebSocketServer();
    
    if (!wss) {
      logger.error('[broadcastTaskUpdate] No WebSocket server available');
      return { success: false, error: 'No WebSocket server available' };
    }
    
    // Create timestamp once for consistent messaging
    const timestamp = new Date().toISOString();
    
    // Create a standardized message that works with all client versions
    const enhancedMetadata = {
      ...metadata,
      lastUpdate: timestamp
    };
    
    // Prepare the nested structure needed by clients
    const payload = {
      id: taskId,
      status,
      progress,
      metadata: enhancedMetadata,
      timestamp
    };
    
    // Create the full message with redundant structure for compatibility
    const message = {
      type: 'task_update',
      payload: {
        payload, // Nested payload for newer clients
        data: payload, // Duplicate as data for compatibility
        taskId,
        timestamp
      },
      data: {
        payload,
        data: payload,
        taskId,
        timestamp
      },
      taskId,
      timestamp
    };
    
    // Convert to JSON once outside the loop for efficiency
    const messageString = JSON.stringify(message);
    
    // Track broadcast statistics
    let clientCount = 0;
    let errorCount = 0;
    
    // Broadcast to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocketServer.OPEN) {
        try {
          client.send(messageString);
          clientCount++;
        } catch (err) {
          errorCount++;
          logger.error('[broadcastTaskUpdate] Error sending to client', {
            error: err instanceof Error ? err.message : String(err),
            diagnosticId
          });
        }
      }
    });
    
    logger.info('[broadcastTaskUpdate] Broadcast completed', {
      taskId,
      clientCount,
      errorCount,
      diagnosticId
    });
    
    return {
      success: true,
      clientCount,
      errorCount,
      message: `Broadcast task_update for task ${taskId} to ${clientCount} clients`
    };
  } catch (error) {
    logger.error('[broadcastTaskUpdate] Error during broadcast', {
      error: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack : undefined,
      taskId,
      diagnosticId
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
