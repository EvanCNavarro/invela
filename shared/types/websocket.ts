/**
 * @file websocket.ts
 * @description Shared WebSocket message types for client-server communication.
 * These types ensure consistent message formats between the client and server.
 */

/**
 * Enumeration of all possible WebSocket message types.
 * Used to discriminate between different message formats.
 */
export type WebSocketMessageType = 
  | 'connection_established'
  | 'task_update'
  | 'file_update'
  | 'ping'
  | 'pong'
  | 'error';

/**
 * Base interface for all WebSocket messages.
 * All specific message types extend this interface.
 */
export interface WebSocketBaseMessage {
  type: WebSocketMessageType;
  timestamp?: string;
}

/**
 * Message sent when a WebSocket connection is established.
 * Confirms to the client that the connection was successful.
 */
export interface ConnectionEstablishedMessage extends WebSocketBaseMessage {
  type: 'connection_established';
  data: {
    timestamp: string;
  };
}

/**
 * Message sent when a task is updated.
 * Triggers client-side query invalidation for task data.
 */
export interface TaskUpdateMessage extends WebSocketBaseMessage {
  type: 'task_update';
  data: {
    id: number;
    status: import('./tasks').TaskStatus;
    progress: number;
    metadata?: Record<string, any>;
  };
}

/**
 * Message sent when a file is updated.
 * Triggers client-side query invalidation for file data.
 */
export interface FileUpdateMessage extends WebSocketBaseMessage {
  type: 'file_update';
  data: {
    id: number;
    file_name: string;
    status: string;
  };
}

/**
 * Ping message for connection health checks.
 * Sent periodically to verify the connection is still alive.
 */
export interface PingMessage extends WebSocketBaseMessage {
  type: 'ping';
}

/**
 * Pong message response to ping messages.
 * Confirms the connection is still active.
 */
export interface PongMessage extends WebSocketBaseMessage {
  type: 'pong';
}

/**
 * Error message for WebSocket communication errors.
 * Provides structured error information to the client.
 */
export interface ErrorMessage extends WebSocketBaseMessage {
  type: 'error';
  error: {
    code: string;
    message: string;
  };
}

/**
 * Union type of all possible WebSocket message formats.
 * Used for type discrimination in message handlers.
 */
export type WebSocketMessage =
  | ConnectionEstablishedMessage
  | TaskUpdateMessage
  | FileUpdateMessage
  | PingMessage
  | PongMessage
  | ErrorMessage; 