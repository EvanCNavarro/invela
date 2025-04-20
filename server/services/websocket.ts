import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { TaskStatus } from '@db/schema';
import { DocumentCategory } from '@db/schema';

// Make wss available for external modules to access
let wss: WebSocketServer;
export { wss };

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
  
  // Initialize WebSocketServer reference in the test router
  try {
    // Will be imported at runtime when routes.ts registers all routes
    console.log('[WebSocket] WebSocketServer instance exported for test endpoints');
  } catch (error) {
    console.warn('[WebSocket] Error in WebSocket setup:', error);
  }

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

// Generic broadcast function for task events
export function broadcastMessage(type: string, payload: any) {
  if (!wss) {
    console.warn('[WebSocket] Server not initialized');
    return;
  }
  
  console.log(`[WebSocket] Broadcasting message: ${type}`, payload);
  
  // Handle specific message types
  if (type.includes('task') && (payload.task || payload.taskId)) {
    // If it's a task-related message, use the specific task update function
    // to ensure consistent payload format
    broadcastTaskUpdate({
      id: payload.task?.id || payload.taskId,
      status: payload.task?.status || payload.status || 'not_started',
      progress: payload.task?.progress || payload.progress || 0,
      metadata: payload.task?.metadata || payload.metadata
    });
    // Return early to avoid double broadcasting
    return;
  }
  
  // For non-task messages, broadcast generic message to all clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type,
          payload
        }));
      } catch (error) {
        console.error(`[WebSocket] Error broadcasting ${type} message:`, error);
      }
    }
  });
}

/**
 * Broadcast a field update to all connected clients
 * This ensures form fields like legalEntityName stay in sync across clients
 */
export function broadcastFieldUpdate(taskId: number, fieldKey: string, value: string) {
  if (!wss) {
    console.warn('[WebSocket] Server not initialized, cannot broadcast field update');
    return;
  }

  console.log(`[WebSocket] Broadcasting field update for task ${taskId}, field "${fieldKey}":`, {
    value: value,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'field_update',
          payload: {
            taskId,
            fieldKey,
            value,
            timestamp: Date.now()
          }
        }));
      } catch (error) {
        console.error('[WebSocket] Error broadcasting field update:', error);
      }
    }
  });
}

/**
 * Broadcast a submission status update to all connected clients
 * This ensures the success modal always shows, even when HTTP API calls fail
 * 
 * Enhanced with better logging, multiple attempts, and client counting
 */
export function broadcastSubmissionStatus(taskId: number, status: string) {
  if (!wss) {
    console.warn('[WebSocket] Server not initialized, cannot broadcast submission status');
    return;
  }

  // Count active clients for debugging
  let openClientCount = 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      openClientCount++;
    }
  });

  console.log(`[WebSocket] Broadcasting submission status for task ${taskId}:`, {
    status,
    timestamp: new Date().toISOString(),
    openClients: openClientCount
  });

  // If no clients are connected, log a warning
  if (openClientCount === 0) {
    console.warn('[WebSocket] No connected clients to receive submission status update');
  }

  // Message to send
  const message = JSON.stringify({
    type: 'submission_status',
    payload: {
      taskId,
      status,
      timestamp: Date.now(),
      source: 'server-broadcast'
    }
  });

  // Track successful sends
  let successCount = 0;
  
  // Send to all clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        successCount++;
      } catch (error) {
        console.error('[WebSocket] Error broadcasting submission status:', error);
      }
    }
  });
  
  // Log success summary
  console.log(`[WebSocket] Submission status broadcast summary for task ${taskId}:`, {
    status,
    successCount,
    totalClients: openClientCount
  });
  
  // Try once more after a short delay if any sends failed
  if (successCount < openClientCount) {
    setTimeout(() => {
      let retryCount = 0;
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(message);
            retryCount++;
          } catch (error) {
            console.error('[WebSocket] Error on retry broadcast:', error);
          }
        }
      });
      console.log(`[WebSocket] Retry broadcast for task ${taskId} sent to ${retryCount} clients`);
    }, 500);
  }
}