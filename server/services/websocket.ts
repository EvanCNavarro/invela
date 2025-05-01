/**
 * WebSocket Service
 * 
 * This module provides functionality for broadcasting updates via WebSocket.
 * It handles formatting and sending messages to connected clients.
 */

import getLogger from '../utils/logger';
import { WebSocketServer, WebSocket } from 'ws';

const logger = getLogger('WebSocketService');

// Store for active WebSocket connections
let wss: WebSocketServer | null = null;
let clients: WebSocket[] = [];

/**
 * Get the WebSocket server instance
 * 
 * @returns The WebSocket server instance or null if not initialized
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}

// Initialize WebSocket server
export function initializeWebSocketServer(server: any): WebSocketServer {
  if (wss) {
    logger.info('WebSocket server already initialized');
    return wss;
  }
  
  logger.info('Initializing WebSocket server');
  
  // Create WebSocket server on a distinct path
  wss = new WebSocketServer({ 
    server, 
    path: '/ws' 
  });
  
  // Store connected clients
  wss.on('connection', (ws: WebSocket) => {
    logger.info('New WebSocket connection established');
    
    clients.push(ws);
    
    ws.on('close', () => {
      logger.info('WebSocket connection closed');
      clients = clients.filter(client => client !== ws);
    });
    
    ws.on('error', (error) => {
      logger.error('WebSocket connection error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });
  });
  
  logger.info('WebSocket server initialized successfully');
  return wss;
}

/**
 * Broadcast a message to all connected clients
 * 
 * @param type The type of message to broadcast
 * @param payload The payload to send with the message
 */
export async function broadcast(type: string, payload: any): Promise<void> {
  try {
    if (!wss) {
      logger.warn('WebSocket server not initialized, skipping broadcast');
      return;
    }
    
    // Create the message in the expected format
    const message = {
      type,
      payload,
      timestamp: new Date().toISOString()
    };
    
    // Count active clients
    const activeClientCount = clients.length;
    
    if (activeClientCount === 0) {
      logger.info('No active WebSocket clients, skipping broadcast', {
        messageType: type
      });
      return;
    }
    
    logger.info(`Broadcasting ${type} message to ${activeClientCount} clients`);
    
    // Broadcast to all connected clients
    const messageString = JSON.stringify(message);
    
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    }
    
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
 * @param task The task to broadcast
 */
export async function broadcastTaskUpdate(task: any): Promise<void> {
  await broadcast('task_update', task);
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

export default {
  initializeWebSocketServer,
  getWebSocketServer,
  broadcast,
  broadcastTaskUpdate,
  broadcastCompanyTabsUpdate,
  broadcastEvent
};
