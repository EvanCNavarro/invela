import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { TaskStatus } from '@db/schema';
import { DocumentCategory } from './openai';

let wss: WebSocketServer;

interface TaskUpdate {
  id: number;
  status: TaskStatus;
  progress: number;
  metadata?: Record<string, any>;
}

interface DocumentCountUpdate {
  type: 'COUNT_UPDATE';
  category: DocumentCategory;
  count: number;
  companyId: string;
}

interface ClassificationUpdate {
  type: 'CLASSIFICATION_UPDATE';
  fileId: string;
  category: DocumentCategory;
  confidence: number;
}

type WebSocketMessage = TaskUpdate | DocumentCountUpdate | ClassificationUpdate;

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

  wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');

    // Send initial connection acknowledgment
    ws.send(JSON.stringify({
      type: 'connection_established',
      data: { timestamp: new Date().toISOString() }
    }));

    // Set up ping/pong with longer intervals
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('[WebSocket] Error sending ping:', error);
        }
      }
    }, 45000); // 45 second interval

    ws.on('ping', () => {
      try {
        ws.pong();
      } catch (error) {
        console.error('[WebSocket] Error sending pong:', error);
      }
    });

    ws.on('pong', () => {
      console.log('[WebSocket] Received pong from client');
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle ping messages immediately
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        console.log('Received WebSocket message:', data);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', (code, reason) => {
      clearInterval(pingInterval);
      console.log(`WebSocket client disconnected with code ${code}${reason ? ` and reason: ${reason}` : ''}`);
    });
  });

  wss.on('error', (error) => {
    console.error('[WebSocket] Server error:', error);
  });
}

export function broadcastTaskUpdate(task: TaskUpdate) {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'task_update',
          payload: task
        }));
      } catch (error) {
        console.error('Error broadcasting task update:', error);
      }
    }
  });
}

export function broadcastDocumentCountUpdate(update: DocumentCountUpdate) {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(update));
      } catch (error) {
        console.error('Error broadcasting document count update:', error);
      }
    }
  });
}

export function broadcastClassificationUpdate(update: ClassificationUpdate) {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(update));
      } catch (error) {
        console.error('Error broadcasting classification update:', error);
      }
    }
  });
}