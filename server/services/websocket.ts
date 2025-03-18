import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { TaskStatus } from '@db/schema';
import { DocumentCategory } from '@db/schema';

let wss: WebSocketServer;

interface TaskUpdate {
  id: number;
  status: TaskStatus;
  progress: number;
  metadata?: Record<string, any>;
}

interface DocumentCountUpdate {
  type: 'COUNT_UPDATE';
  category: typeof DocumentCategory[keyof typeof DocumentCategory];
  count: number;
  companyId: string;
}

interface UploadProgress {
  type: 'UPLOAD_PROGRESS';
  fileId: number | null;
  fileName: string;
  status: 'uploading' | 'uploaded' | 'error';
  progress?: number;
  error?: string;
}

type WebSocketMessage = TaskUpdate | DocumentCountUpdate | UploadProgress;

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ 
    noServer: true,
    path: '/ws',
    clientTracking: true,
    perMessageDeflate: false,
    maxPayload: 1024 * 1024 // 1MB
  });

  server.on('upgrade', (request, socket, head) => {
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

    ws.send(JSON.stringify({
      type: 'connection_established',
      data: { timestamp: new Date().toISOString() }
    }));

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('[WebSocket] Error sending ping:', error);
        }
      }
    }, 45000);

    ws.on('ping', () => {
      try {
        ws.pong();
      } catch (error) {
        console.error('[WebSocket] Error sending pong:', error);
      }
    });

    ws.on('pong', () => {
      console.log('[WebSocket] Received pong');
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }
        console.log('[WebSocket] Received message:', data);
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Client error:', error);
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
    console.warn('[WebSocket] Server not initialized');
    return;
  }

  console.log('[WebSocket] Broadcasting task update:', {
    taskId: task.id,
    status: task.status,
    progress: task.progress,
    metadata: task.metadata
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'task_update',
          payload: task
        }));
      } catch (error) {
        console.error('[WebSocket] Error broadcasting task update:', error);
      }
    }
  });
}

export function broadcastDocumentCountUpdate(update: DocumentCountUpdate) {
  if (!wss) {
    console.warn('[WebSocket] Server not initialized');
    return;
  }

  console.log('[WebSocket] Broadcasting document count update:', update);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(update));
      } catch (error) {
        console.error('[WebSocket] Error broadcasting document count:', error);
      }
    }
  });
}

export function broadcastUploadProgress(update: UploadProgress) {
  if (!wss) {
    console.warn('[WebSocket] Server not initialized');
    return;
  }

  console.log('[WebSocket] Broadcasting upload progress:', update);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(update));
      } catch (error) {
        console.error('[WebSocket] Error broadcasting upload progress:', error);
      }
    }
  });
}