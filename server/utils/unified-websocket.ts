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

// Message types
type MessageType = 
  | 'authenticate'
  | 'ping'
  | 'task_updated'
  | 'task_reconciled'
  | 'form_submission_completed'
  | 'tabs_updated'
  | 'notification';

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

// Task update message
interface TaskUpdateMessage extends WebSocketMessage {
  type: 'task_updated';
  taskId: number;
  message?: string;
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

// Union type of all message types
type WebSocketPayload = 
  | AuthMessage
  | TaskUpdateMessage
  | TaskReconciledMessage
  | FormSubmissionCompletedMessage
  | TabsUpdatedMessage
  | NotificationMessage;

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
  
  if (wss.readyState !== WebSocket.OPEN) {
    wsLogger.warn(`Cannot broadcast: WebSocket server not in OPEN state (state: ${wss.readyState})`);
    return;
  }
  
  // Create full message with type and timestamp
  const message = {
    type,
    timestamp: new Date().toISOString(),
    ...payload
  };
  
  const messageString = JSON.stringify(message);
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
  broadcast<TaskUpdateMessage>('task_updated', payload);
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