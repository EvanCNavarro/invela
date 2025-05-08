import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger';
import { TaskStatus } from '@db/schema';

// Store a reference to the WebSocket server
let wssInstance: WebSocketServer | null = null;

/**
 * Register the WebSocket server instance
 * 
 * @param wss The WebSocket server instance to register
 */
export function registerWebSocketServer(wss: WebSocketServer): void {
  wssInstance = wss;
  logger.info('WebSocket server registered with broadcasting utility');
}

/**
 * Get the WebSocket server instance
 * 
 * @returns The current WebSocket server instance or null if not registered
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wssInstance;
}

/**
 * Broadcast a message to all connected WebSocket clients
 * 
 * @param type The type of message to broadcast
 * @param payload The payload to send with the message
 * @returns Object with result of the broadcast operation
 */
export function broadcast(type: string, payload: any): { 
  success: boolean;
  messageId: string;
  clientCount: number;
  errorCount: number;
 } {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  if (!wssInstance) {
    logger.error(`WebSocket server not available, cannot broadcast ${type} message`);
    return { success: false, messageId, clientCount: 0, errorCount: 0 };
  }
  
  const message = JSON.stringify({
    type,
    payload,
    data: payload, // Ensure both formats for backward compatibility
    timestamp: new Date().toISOString()
  });
  
  let errorCount = 0;
  let clientCount = 0;
  
  wssInstance.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        clientCount++;
      } catch (error) {
        logger.error(`Failed to send ${type} message to client`, { error });
        errorCount++;
      }
    }
  });
  
  logger.info(`Broadcast ${type} to ${clientCount} clients (${errorCount} errors)`, { messageId });
  
  return { 
    success: true, 
    messageId, 
    clientCount, 
    errorCount 
  };
}

/**
 * Broadcast a task update to all connected WebSocket clients
 * 
 * @param taskId - The ID of the task that has been updated
 * @param status - The new status of the task
 * @param progress - The new progress value (0-100)
 * @param metadata - Optional additional data to include in the broadcast
 * @returns Object with result of the broadcast operation
 */
export function broadcastTaskUpdate(
  taskId: number, 
  status: TaskStatus | string, 
  progress: number = 0,
  metadata: Record<string, any> = {}
): ReturnType<typeof broadcast> {
  return broadcast('task_update', {
    taskId,
    status,
    progress,
    ...(metadata || {}),
    timestamp: new Date().toISOString()
  });
}
