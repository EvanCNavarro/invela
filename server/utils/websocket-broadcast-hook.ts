/**
 * WebSocket Broadcast Hook
 * 
 * This utility module provides a standardized way to broadcast task updates via WebSocket.
 * It ensures consistent message format and delivery to all connected clients.
 */

import { WebSocket } from 'ws';
import { Task, TaskStatus } from '@db/schema';

// Interfaces
interface WebSocketMessage {
  type: string;
  taskId?: number;
  id?: number;
  status?: TaskStatus;
  progress?: number;
  metadata?: Record<string, any>;
  timestamp: string;
  messageId?: string;
}

interface WebSocketServer {
  clients: Set<WebSocket>;
  broadcastMessage: (message: WebSocketMessage) => void;
  isClientConnected: (client: WebSocket) => boolean;
}

// Global reference to WebSocket server
let wsServer: WebSocketServer | null = null;

/**
 * Register WebSocket server reference
 * 
 * @param server WebSocket server instance with broadcastMessage method
 */
export function registerWebSocketServer(server: WebSocketServer): void {
  wsServer = server;
  console.log('[WebSocketBroadcastHook] WebSocket server registered successfully');
}

/**
 * Check if WebSocket server is available
 * 
 * @returns true if WebSocket server is registered and ready
 */
export function isWebSocketServerAvailable(): boolean {
  return wsServer !== null && typeof wsServer.broadcastMessage === 'function';
}

/**
 * Broadcast task update to all connected clients
 * 
 * @param taskId Task ID
 * @param status Task status
 * @param progress Task progress (0-100)
 * @param metadata Additional metadata to include
 * @returns messageId of the broadcast message or null if broadcast failed
 */
export function broadcastTaskUpdate(
  taskId: number, 
  status: TaskStatus, 
  progress: number, 
  metadata: Record<string, any> = {}
): string | null {
  if (!wsServer) {
    console.warn('[WebSocketBroadcastHook] WebSocket server not registered');
    return null;
  }

  const timestamp = new Date().toISOString();
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // Create both formats for backward compatibility
  // Format 1: task_updated (newer format with taskId field)
  const taskUpdatedMessage: WebSocketMessage = {
    type: 'task_updated',
    taskId,
    progress,
    status,
    metadata: {
      ...metadata,
      messageId,
      source: 'websocket-broadcast-hook',
      timestamp
    },
    timestamp
  };

  // Format 2: task_update (older format with id field)
  const taskUpdateMessage: WebSocketMessage = {
    type: 'task_update',
    id: taskId,
    status,
    progress,
    metadata: {
      ...metadata,
      messageId,
      source: 'websocket-broadcast-hook',
      timestamp
    },
    timestamp
  };

  try {
    // Send both message formats for compatibility
    wsServer.broadcastMessage(taskUpdatedMessage);
    wsServer.broadcastMessage(taskUpdateMessage);
    
    console.log(`[WebSocketBroadcastHook] Successfully broadcast task update for task ${taskId} (${status}, ${progress}%)`);
    return messageId;
  } catch (error) {
    console.error('[WebSocketBroadcastHook] Error broadcasting task update:', error);
    return null;
  }
}

/**
 * Broadcast full task object update
 * 
 * @param task Complete task object
 * @returns messageId of the broadcast message or null if broadcast failed
 */
export function broadcastFullTaskUpdate(task: Task): string | null {
  return broadcastTaskUpdate(task.id, task.status, task.progress, task.metadata || {});
}

export default {
  registerWebSocketServer,
  isWebSocketServerAvailable,
  broadcastTaskUpdate,
  broadcastFullTaskUpdate
};