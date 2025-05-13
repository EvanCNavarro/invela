/**
 * WebSocket Server Implementation
 * 
 * This file contains the implementation of the WebSocket server
 * that enables real-time communication for the application.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { logger } from './logger';

// Define message types for WebSocket communication
export type MessageType = 
  | 'ping' 
  | 'pong'
  | 'authenticate'
  | 'authenticated'
  | 'task_updated'
  | 'tutorial_updated'
  | 'company_tabs_updated';

// Structure for WebSocket messages
export interface WebSocketMessage {
  type: MessageType;
  [key: string]: any;
}

// Connected client information
interface ConnectedClient {
  id: string;
  socket: WebSocket;
  userId?: number;
  companyId?: number;
  authenticated: boolean;
}

// Manage WebSocket connections
class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: ConnectedClient[] = [];
  private nextClientId = 1;

  /**
   * Initialize the WebSocket server
   * 
   * @param server The HTTP server to attach the WebSocket server to
   */
  initialize(server: HttpServer) {
    // Create WebSocket server on a distinct path not to conflict with Vite HMR
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    logger.info('[WebSocket] Initializing WebSocket server');

    this.wss.on('connection', (socket, req) => {
      const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      logger.info('[WebSocket] Client connected', { 
        module: 'WebSocket',
        clientId,
        clients: this.clients.length + 1
      });

      // Add client to our list
      this.clients.push({
        id: clientId,
        socket,
        authenticated: false
      });

      // Send connection confirmation
      this.sendToClient(clientId, {
        type: 'connection_established',
        clientId,
        timestamp: new Date().toISOString(),
        message: 'Connection established'
      });

      // Handle incoming messages
      socket.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          logger.error('[WebSocket] Error parsing message', { error });
        }
      });

      // Handle disconnections
      socket.on('close', (code, reason) => {
        logger.info('[WebSocket] Client disconnected', {
          module: 'WebSocket',
          clientId,
          code,
          reason: reason.toString(),
          remainingClients: this.clients.length - 1
        });

        // Remove client from our list
        this.clients = this.clients.filter(client => client.id !== clientId);
      });
    });

    logger.info('[WebSocket] WebSocket server initialized');
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(clientId: string, message: WebSocketMessage) {
    logger.info('[WebSocket] Received message from client', {
      module: 'WebSocket',
      ...message
    });

    const client = this.clients.find(c => c.id === clientId);
    if (!client) return;

    switch (message.type) {
      case 'ping':
        // Respond to ping with pong to keep connection alive
        this.sendToClient(clientId, {
          type: 'pong',
          timestamp: new Date().toISOString(),
          echo: message
        });
        break;

      case 'authenticate':
        // Handle authentication message
        logger.info('[WebSocket] Authentication from client', {
          module: 'WebSocket',
          userId: message.userId,
          companyId: message.companyId,
          hasToken: !!message.data || (!!message.userId && !!message.companyId)
        });
        
        // Set user and company data on the client
        if (message.userId) client.userId = message.userId;
        if (message.companyId) client.companyId = message.companyId;
        client.authenticated = true;

        // Confirm authentication
        this.sendToClient(clientId, {
          type: 'authenticated',
          timestamp: new Date().toISOString(),
          message: 'Authentication successful'
        });
        break;

      default:
        logger.debug('[WebSocket] Unhandled message type', { 
          type: message.type,
          clientId 
        });
        break;
    }
  }

  /**
   * Send a message to a specific client
   */
  private sendToClient(clientId: string, message: WebSocketMessage) {
    const client = this.clients.find(c => c.id === clientId);
    if (!client) return;

    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all connected clients
   * 
   * @param message The message to broadcast
   * @param filterFn Optional filter function to determine which clients receive the message
   */
  broadcastMessage(message: WebSocketMessage, filterFn?: (client: ConnectedClient) => boolean) {
    let recipientCount = 0;
    
    // Send message to each client that passes the filter or all clients if no filter
    this.clients.forEach(client => {
      if (client.socket.readyState === WebSocket.OPEN) {
        if (!filterFn || filterFn(client)) {
          client.socket.send(JSON.stringify(message));
          recipientCount++;
        }
      }
    });

    logger.info('[WebSocket] Broadcast message of type sent to clients', {
      module: 'WebSocket',
      messageType: message.type,
      recipients: recipientCount,
      totalClients: this.clients.length,
      filtered: !!filterFn
    });
  }
}

// Export singleton instance
export const websocketManager = new WebSocketManager();