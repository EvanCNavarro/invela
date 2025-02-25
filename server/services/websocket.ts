/**
 * @file websocket.ts
 * @description WebSocket server implementation for real-time communication.
 * Handles client connections, message parsing, and broadcasting updates.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { 
  WebSocketMessage, 
  TaskUpdateMessage,
  ConnectionEstablishedMessage,
  FileUpdateMessage,
  PingMessage,
  PongMessage,
  ErrorMessage
} from '@shared/types/websocket';
import type { TaskStatus } from '@shared/types/tasks';

// Global WebSocket server instance
let wss: WebSocketServer;

/**
 * Sets up the WebSocket server and attaches it to the HTTP server.
 * Configures event handlers for connection management and message processing.
 * 
 * @param server - The HTTP server to attach the WebSocket server to
 */
export function setupWebSocket(server: Server) {
  // Create WebSocket server with proper configuration
  wss = new WebSocketServer({ 
    noServer: true,
    path: '/ws',
    clientTracking: true,
    perMessageDeflate: false,
    maxPayload: 1024 * 1024 // 1MB
  });

  // Handle upgrade requests manually
  server.on('upgrade', (request, socket, head) => {
    // Skip vite-hmr websocket connections
    if (request.headers['sec-websocket-protocol'] === 'vite-hmr') {
      return;
    }

    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  console.log('[WebSocket] Server initialized on path: /ws');

  // Handle new client connections
  wss.on('connection', (ws) => {
    console.log('[WebSocket] New client connected');

    // Send initial connection acknowledgment
    const connectionMessage: ConnectionEstablishedMessage = {
      type: 'connection_established',
      timestamp: new Date().toISOString(),
      data: { timestamp: new Date().toISOString() }
    };
    ws.send(JSON.stringify(connectionMessage));
    console.log('[WebSocket] Sent connection acknowledgment');

    // Set up ping/pong with longer intervals for connection health checks
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
          const pingMessage: PingMessage = { 
            type: 'ping',
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(pingMessage));
          console.log('[WebSocket] Sent ping to client');
        } catch (error) {
          console.error('[WebSocket] Error sending ping:', error);
        }
      }
    }, 45000); // Match client's interval

    // Handle ping messages from client
    ws.on('ping', () => {
      try {
        ws.pong();
        console.log('[WebSocket] Received ping, sent pong');
      } catch (error) {
        console.error('[WebSocket] Error sending pong:', error);
      }
    });

    // Handle pong messages from client
    ws.on('pong', () => {
      // Reset any ping timeouts here if needed
      console.log('[WebSocket] Received pong from client');
    });

    // Handle incoming messages from client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString()) as WebSocketMessage;
        console.log('[WebSocket] Received message:', { type: data.type });

        // Handle ping messages immediately
        if (data.type === 'ping') {
          const pongMessage: PongMessage = { 
            type: 'pong',
            timestamp: new Date().toISOString()
          };
          ws.send(JSON.stringify(pongMessage));
          console.log('[WebSocket] Received ping, sent pong response');
          return;
        }

        // Log other message types
        console.log('[WebSocket] Processing message:', { 
          type: data.type, 
          timestamp: data.timestamp 
        });
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
        const errorMessage: ErrorMessage = {
          type: 'error',
          timestamp: new Date().toISOString(),
          error: {
            code: 'PARSE_ERROR',
            message: 'Failed to parse message'
          }
        };
        ws.send(JSON.stringify(errorMessage));
        console.log('[WebSocket] Sent error response for parse failure');
      }
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error('[WebSocket] Client connection error:', error);
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      clearInterval(pingInterval);
      console.log(`[WebSocket] Client disconnected with code ${code}${reason ? ` and reason: ${reason}` : ''}`);
    });
  });

  // Handle server-level errors
  wss.on('error', (error) => {
    console.error('[WebSocket] Server error:', error);
  });
}

/**
 * Broadcasts a task update to all connected clients.
 * Used when a task is created, updated, or deleted.
 * 
 * @param taskUpdate - The task data to broadcast
 */
export function broadcastTaskUpdate(taskUpdate: TaskUpdateMessage['data']): void {
  if (!wss) {
    console.warn('[WebSocket] Cannot broadcast task update: WebSocket server not initialized');
    return;
  }

  const message: TaskUpdateMessage = {
    type: 'task_update',
    timestamp: new Date().toISOString(),
    data: taskUpdate
  };

  let clientCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        clientCount++;
      } catch (error) {
        console.error('[WebSocket] Error broadcasting task update:', error);
      }
    }
  });
  
  console.log(`[WebSocket] Broadcast task update to ${clientCount} clients:`, { 
    taskId: taskUpdate.id,
    status: taskUpdate.status,
    progress: taskUpdate.progress
  });
}

/**
 * Broadcasts a file update to all connected clients.
 * Used when a file is uploaded, updated, or deleted.
 * 
 * @param fileUpdate - The file data to broadcast
 */
export function broadcastFileUpdate(fileUpdate: FileUpdateMessage['data']): void {
  if (!wss) {
    console.warn('[WebSocket] Cannot broadcast file update: WebSocket server not initialized');
    return;
  }

  const message: FileUpdateMessage = {
    type: 'file_update',
    timestamp: new Date().toISOString(),
    data: fileUpdate
  };

  let clientCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        clientCount++;
      } catch (error) {
        console.error('[WebSocket] Error broadcasting file update:', error);
      }
    }
  });
  
  console.log(`[WebSocket] Broadcast file update to ${clientCount} clients:`, { 
    fileId: fileUpdate.id,
    fileName: fileUpdate.file_name,
    status: fileUpdate.status
  });
}
