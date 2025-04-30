/**
 * WebSocket Server Module
 * 
 * This module handles real-time WebSocket communication for the application,
 * enabling immediate UI updates when changes occur on the server.
 */

import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { Logger } from './services/logger';

const logger = new Logger('WebSocket');
let wsServer: WebSocketServer | null = null;
const clients = new Set();

/**
 * Initialize the WebSocket server
 * 
 * @param httpServer The HTTP server to attach the WebSocket server to
 */
export function initializeWebSocketServer(httpServer: Server): void {
  // Initialize the WebSocket server
  wsServer = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });

  logger.info('Server initialized on path: /ws');

  wsServer.on('connection', (socket) => {
    logger.info(`New client connected to the pool (${clients.size + 1}/${wsServer.clients.size})`);
    clients.add(socket);

    // Setup event handlers
    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        logger.error('Error processing WebSocket message:', error);
      }
    });

    // Clean up on connection close
    socket.on('close', (code, reason) => {
      clients.delete(socket);
      logger.info(`WebSocket client disconnected with code ${code} and reason: ${reason}`);
    });

    // Send a connection established message to the client
    socket.send(JSON.stringify({
      type: 'connection_established',
      payload: {
        timestamp: new Date().toISOString()
      }
    }));
  });
}

/**
 * Broadcast a task update to all connected clients
 * 
 * @param taskData The updated task data
 */
export function broadcastTaskUpdate(taskData: any): void {
  if (!wsServer) {
    logger.warn('WebSocket server not initialized, cannot broadcast task update');
    return;
  }

  const message = JSON.stringify({
    type: 'task_updated',
    payload: {
      ...taskData,
      timestamp: new Date().toISOString()
    }
  });

  let clientCount = 0;
  
  wsServer.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
      clientCount++;
    }
  });

  // Log only key properties to avoid large logs
  const logData = {
    type: 'task_updated',
    dataKeys: Object.keys(taskData),
    timestamp: new Date().toISOString(),
    clientCount
  };
  
  logger.info('Broadcast "task_updated" sent to ' + clientCount + ' clients', logData);
}

/**
 * Broadcast company tabs update to all connected clients
 * 
 * @param companyId Company ID to update
 */
export function broadcastCompanyTabs(companyId: number): void {
  if (!wsServer) {
    logger.warn('WebSocket server not initialized, cannot broadcast company tabs update');
    return;
  }

  const message = JSON.stringify({
    type: 'company_tabs_updated',
    payload: {
      companyId,
      timestamp: new Date().toISOString()
    }
  });

  let clientCount = 0;
  
  wsServer.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
      clientCount++;
    }
  });

  logger.info(`Broadcast "company_tabs_updated" sent to ${clientCount} clients for company ${companyId}`);
}