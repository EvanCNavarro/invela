/**
 * Unified WebSocket Server
 * 
 * This module provides a standardized WebSocket implementation for the application,
 * supporting real-time communication with clients across various features.
 * 
 * Features:
 * - Centralized WebSocket server management
 * - Typed message handling for different event types
 * - Client authentication and connection tracking
 * - Broadcast functionality for server-to-client notifications
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from './logger';

const wsLogger = logger.child({ module: 'WebSocket' });

// WebSocket server instance
let wss: WebSocketServer | null = null;

// Connected clients with authentication status
interface ConnectedClient {
  socket: WebSocket;
  clientId: string;
  userId?: number;
  companyId?: number;
  authenticated: boolean;
  connectedAt: Date;
}

// Track connected clients
const clients: Map<string, ConnectedClient> = new Map();

// Import the MessageType from our types file
import { MessageType as AppMessageType } from '../types';

// Message types
type InternalMessageType = 
  | 'authenticate'
  | 'ping'
  | 'pong'
  | 'task_updated'
  | 'task_reconciled'
  | 'form_submission_completed'
  | 'tabs_updated'
  | 'notification'
  | 'tutorial_updated';

// Union type that includes all possible message types
type MessageType = InternalMessageType | AppMessageType;

// Base message interface
interface WebSocketMessage {
  type: MessageType;
  timestamp: string;
}

// Authentication message
interface AuthMessage extends WebSocketMessage {
  type: 'authenticate';
  userId: number;
  companyId: number;
  clientId: string;
}

// Ping message for connection keepalive
interface PingMessage extends WebSocketMessage {
  type: 'ping';
}

// Pong response message
interface PongMessage extends WebSocketMessage {
  type: 'pong';
  echo?: any;
}

// Task update message
interface TaskUpdateMessage extends WebSocketMessage {
  type: 'task_updated';
  id: number;
  taskId: number;
  message?: string;
  progress?: number;
  status?: string;
  metadata?: Record<string, any>;
}

// Task reconciliation message
interface TaskReconciledMessage extends WebSocketMessage {
  type: 'task_reconciled';
  taskId: number;
  progress: number;
  status: string;
  metadata?: Record<string, any>;
}

// Form submission completed message
interface FormSubmissionCompletedMessage extends WebSocketMessage {
  type: 'form_submission_completed';
  taskId: number;
  formType: string;
  status: string;
  companyId?: number;
  fileName?: string;
  fileId?: number | string;
  unlockedTabs?: string[];
  message?: string;
  progress?: number;
  metadata?: Record<string, any>;
}

// Tabs updated message
interface TabsUpdatedMessage extends WebSocketMessage {
  type: 'tabs_updated';
  companyId: number;
  tabs: string[];
  metadata?: Record<string, any>;
}

// Notification message
interface NotificationMessage extends WebSocketMessage {
  type: 'notification';
  title: string;
  message: string;
  variant?: 'default' | 'destructive' | 'success';
  metadata?: Record<string, any>;
}

// Tutorial update message
interface TutorialUpdateMessage extends WebSocketMessage {
  type: 'tutorial_updated';
  tabName: string;
  userId: number;
  currentStep: number;
  completed: boolean;
  metadata?: Record<string, any>;
}

// Union type of all message types
type WebSocketPayload = 
  | AuthMessage
  | PingMessage
  | PongMessage
  | TaskUpdateMessage
  | TaskReconciledMessage
  | FormSubmissionCompletedMessage
  | TabsUpdatedMessage
  | NotificationMessage
  | TutorialUpdateMessage;

/**
 * Initialize the WebSocket server
 * 
 * @param server HTTP server instance to attach WebSocket server to
 * @param path Path for the WebSocket server
 */
export function initializeWebSocketServer(server: Server, path: string = '/ws'): void {
  if (wss) {
    wsLogger.warn('WebSocket server already initialized, skipping initialization');
    return;
  }

  // Create WebSocket server
  wss = new WebSocketServer({ server, path });
  const serverId = Math.random().toString(36).substring(2, 8);

  wsLogger.info('Unified WebSocket server initialized successfully', {
    clients: clients.size,
    path,
    id: serverId,
    timestamp: new Date().toISOString()
  });

  // Set up event handlers
  wss.on('connection', (socket: WebSocket, request) => {
    // Generate a unique client ID
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Store client information
    clients.set(clientId, {
      socket,
      clientId,
      authenticated: false,
      connectedAt: new Date()
    });
    
    wsLogger.info('Client connected', { clientId, clients: clients.size });
    
    // Send connection established message
    socket.send(JSON.stringify({
      type: 'connection_established',
      clientId,
      timestamp: new Date().toISOString(),
      message: 'Connection established'
    }));
    
    // Handle messages from client
    socket.on('message', (rawMessage: string) => {
      try {
        const message = JSON.parse(rawMessage.toString()) as WebSocketPayload;
        
        wsLogger.info(`Received message from client ${clientId}`, message);
        
        // Handle different message types
        switch (message.type) {
          case 'authenticate':
            handleAuthentication(clientId, message as AuthMessage);
            break;
            
          case 'ping':
            // Simple ping-pong to keep connection alive
            socket.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString(),
              echo: message
            }));
            break;
            
          default:
            wsLogger.warn(`Unknown message type: ${message.type} from ${clientId}`);
        }
      } catch (error) {
        wsLogger.error('Error processing WebSocket message', {
          error: error instanceof Error ? error.message : String(error),
          clientId
        });
      }
    });
    
    // Handle client disconnection
    socket.on('close', (code: number, reason: string) => {
      clients.delete(clientId);
      
      wsLogger.info('Client disconnected', {
        clientId,
        code,
        reason: reason.toString(),
        remainingClients: clients.size
      });
    });
    
    // Handle errors
    socket.on('error', (error) => {
      wsLogger.error('[error] [websocket] WebSocket error', {
        errorEvent: error,
        connectionId: clientId,
        timestamp: new Date().toISOString()
      });
    });
  });
  
  // Handle server errors
  wss.on('error', (error) => {
    wsLogger.error('WebSocket server error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  });
}

/**
 * Handle client authentication message
 * 
 * @param clientId Client ID
 * @param message Authentication message
 */
function handleAuthentication(clientId: string, message: AuthMessage): void {
  const client = clients.get(clientId);
  
  if (!client) {
    wsLogger.warn(`Cannot authenticate unknown client: ${clientId}`);
    return;
  }
  
  // Update client with authentication information
  client.userId = message.userId;
  client.companyId = message.companyId;
  client.authenticated = true;
  
  clients.set(clientId, client);
  
  wsLogger.info(`Authentication from client ${clientId}`, {
    userId: message.userId,
    companyId: message.companyId,
    hasToken: true
  });
  
  // Send authentication confirmation
  client.socket.send(JSON.stringify({
    type: 'authenticated',
    userId: message.userId,
    companyId: message.companyId,
    timestamp: new Date().toISOString(),
    message: 'Authentication successful'
  }));
}

/**
 * Broadcast a message to all connected clients
 * 
 * @param type Message type
 * @param payload Message payload
 * @param filter Optional filter function to determine which clients receive the message
 */
export function broadcast<T extends WebSocketPayload>(
  type: MessageType,
  payload: Omit<T, 'type' | 'timestamp'>,
  filter?: (client: ConnectedClient) => boolean
): void {
  if (!wss) {
    wsLogger.warn('Cannot broadcast: WebSocket server not initialized');
    return;
  }
  
  // WebSocketServer does not have readyState property - we can only check if it exists
  // The individual client connections will have their own readyState
  // which we check before sending messages to each client
  
  // Create full message with type, timestamp, and properly structured payload
  const message = {
    type,
    timestamp: new Date().toISOString(),
    payload: payload,
    // Also spread payload directly for backward compatibility
    ...payload
  };
  
  const messageString = JSON.stringify(message);
  
  // Debug logging to see what we're actually sending
  if (type === 'task_update' || type === 'task_updated') {
    wsLogger.info(`Broadcasting ${type} with message structure:`, {
      messageType: type,
      hasPayload: !!message.payload,
      payloadKeys: message.payload ? Object.keys(message.payload) : [],
      rootKeys: Object.keys(message),
      taskId: message.payload?.taskId || message.taskId,
      id: message.payload?.id || message.id
    });
  }
  
  let sentCount = 0;
  
  // Send to all clients, or filtered clients if filter provided
  clients.forEach((client) => {
    if (!filter || filter(client)) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(messageString);
        sentCount++;
      }
    }
  });
  
  wsLogger.info(`Broadcast message of type '${type}' sent to ${sentCount} clients`, {
    messageType: type,
    recipients: sentCount,
    totalClients: clients.size,
    filtered: !!filter
  });
}

/**
 * Get the current count of connected clients
 * 
 * @returns Number of connected clients
 */
export function getConnectedClientCount(): number {
  return clients.size;
}

/**
 * Get the WebSocket server instance
 * 
 * @returns The WebSocket server instance or null if not initialized
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}

// Utility broadcast functions for common scenarios

/**
 * Broadcast a task update message
 * 
 * @param payload Task update payload
 */
export function broadcastTaskUpdate(payload: Omit<TaskUpdateMessage, 'type' | 'timestamp'>): void {
  // Ensure the payload includes the task data properly formatted
  const taskData = {
    taskId: payload.taskId || payload.id,
    id: payload.id || payload.taskId,
    status: payload.status,
    progress: payload.progress,
    metadata: payload.metadata || {}
  };

  // Broadcast with complete task data
  broadcast<TaskUpdateMessage>('task_updated', taskData);
  broadcast('task_update', taskData);
  
  if (!taskData.taskId) {
    wsLogger.warn('Task update broadcast called without task ID', { payload: taskData });
  }
}

/**
 * Broadcast a task reconciliation message
 * 
 * @param payload Task reconciliation payload
 */
export function broadcastTaskReconciled(payload: Omit<TaskReconciledMessage, 'type' | 'timestamp'>): void {
  broadcast<TaskReconciledMessage>('task_reconciled', payload);
}

/**
 * Broadcast a form submission completed message
 * 
 * @param payload Form submission completed payload
 */
export function broadcastFormSubmission(payload: Omit<FormSubmissionCompletedMessage, 'type' | 'timestamp'>): void {
  broadcast<FormSubmissionCompletedMessage>('form_submission_completed', payload);
  
  // Also broadcast a task update for form submission to ensure clients receive the updates
  if (payload.taskId) {
    broadcastTaskUpdate({
      id: payload.taskId,
      taskId: payload.taskId,
      status: payload.status,
      progress: payload.progress || 100,
      metadata: {
        ...payload.metadata,
        formType: payload.formType,
        submitted: true,
        submission_date: new Date().toISOString()
      },
      message: payload.message || `${payload.formType} form submitted successfully`
    });
  }
}

/**
 * Broadcast a tabs updated message
 * 
 * @param payload Tabs updated payload
 */
export function broadcastTabsUpdated(payload: Omit<TabsUpdatedMessage, 'type' | 'timestamp'>): void {
  broadcast<TabsUpdatedMessage>('tabs_updated', payload);
}

/**
 * Broadcast a notification message
 * 
 * @param payload Notification payload
 */
export function broadcastNotification(payload: Omit<NotificationMessage, 'type' | 'timestamp'>): void {
  broadcast<NotificationMessage>('notification', payload);
}

/**
 * Broadcast a tutorial update message
 * 
 * @param payload Tutorial update payload
 * @param filter Optional filter function to determine which clients receive the message
 */
export function broadcastTutorialUpdate(
  payload: Omit<TutorialUpdateMessage, 'type' | 'timestamp'>,
  filter?: (client: ConnectedClient) => boolean
): void {
  broadcast<TutorialUpdateMessage>('tutorial_updated', payload, filter);
}