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
      payload: { timestamp: new Date().toISOString() } // Changed 'data' to 'payload' for consistent message format
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
        // Format message with consistent payload structure
        client.send(JSON.stringify({
          type: 'document_count_update',
          payload: update // Wrap in payload property for consistency
        }));
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
        // Format message with consistent payload structure
        client.send(JSON.stringify({
          type: 'upload_progress',
          payload: update // Wrap in payload property for consistency
        }));
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
 * 
 * @param taskId Task ID
 * @param fieldKey Field key (field_key from the database)
 * @param value Field value
 * @param status Optional status (e.g., 'complete', 'incomplete', 'empty')
 */
export function broadcastFieldUpdate(taskId: number, fieldKey: string, value: string, status?: string) {
  if (!wss) {
    console.warn('[WebSocket] Server not initialized, cannot broadcast field update');
    return;
  }

  console.log(`[WebSocket] Broadcasting field update for task ${taskId}, field "${fieldKey}":`, {
    value: value,
    status: status || 'complete',
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'field_update',
          payload: {
            taskId,
            fieldKey, // Always use field_key for consistent reference
            value,
            status: status || 'complete', // Default to 'complete' if not provided
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
/**
 * Broadcast a company tabs update with cache invalidation
 * This function is crucial for ensuring file vault tab appears after form submission
 */
export function broadcastCompanyTabsUpdate(companyId: number, availableTabs: string[]) {
  if (!wss) {
    console.warn('[WebSocket] Server not initialized, cannot broadcast company tabs update');
    return;
  }

  console.log(`[WebSocket] Broadcasting company tabs update for company ${companyId}:`, {
    availableTabs,
    timestamp: new Date().toISOString()
  });

  // Directly try to invalidate company data in the cache
  // Since we can't access the cache directly due to circular dependencies,
  // we'll broadcast a special internal message that the client will use
  // to force a cache refresh
  console.log(`[WebSocket] Sending cache invalidation message for company ${companyId}`);
  
  // Include cache_invalidation field in the payload to trigger client-side cache busting
  const cacheInvalidationPayload = {
    companyId,
    availableTabs,
    timestamp: new Date().toISOString(),
    cache_invalidation: true
  };
  
  // We'll handle cache busting on the client side instead

  // Build the message with consistent payload format
  const message = JSON.stringify({
    type: 'company_tabs_updated',
    payload: cacheInvalidationPayload
  });
  
  // Track successful sends
  let successCount = 0;
  
  // Count active clients for debugging
  let openClientCount = 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      openClientCount++;
    }
  });

  // Send to all clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        successCount++;
      } catch (error) {
        console.error('[WebSocket] Error broadcasting company tabs update:', error);
      }
    }
  });
  
  console.log(`[WebSocket] Company tabs update broadcast summary:`, {
    companyId,
    successCount,
    totalClients: openClientCount,
    timestamp: new Date().toISOString()
  });
  
  // Set up delayed retries to ensure message delivery even if clients reconnect
  const delayTimes = [500, 1500, 3000]; // 0.5s, 1.5s, 3s delays
  for (const delay of delayTimes) {
    setTimeout(() => {
      try {
        let retryOpenClients = 0;
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            retryOpenClients++;
            client.send(message);
          }
        });
        
        console.log(`[WebSocket] Delayed company tabs update (${delay}ms) sent to ${retryOpenClients} clients`);
      } catch (e) {
        console.error(`[WebSocket] Error in delayed company tabs broadcast (${delay}ms):`, e);
      }
    }, delay);
  }
}

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
    openClients: openClientCount,
    clientsDetail: Array.from(wss.clients).map(c => ({ 
      readyState: c.readyState, 
      readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][c.readyState] || 'UNKNOWN' 
    }))
  });

  // If no clients are connected, log a warning
  if (openClientCount === 0) {
    console.warn('[WebSocket] No connected clients to receive submission status update');
    console.log('[WebSocket] Server will attempt broadcast anyway in case clients reconnect');
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
  
  // Set up multiple retries to ensure message delivery
  // This is critical for ensuring the form submission confirmation reaches clients
  const maxRetries = 5; // Try up to 5 times
  for (let i = 1; i <= maxRetries; i++) {
    setTimeout(() => {
      let retryCount = 0;
      
      // Count current open clients
      let currentOpenClients = 0;
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          currentOpenClients++;
        }
      });
      
      console.log(`[WebSocket] Retry #${i} for task ${taskId}:`, {
        openClients: currentOpenClients,
        timestamp: new Date().toISOString()
      });
      
      // If there are open clients now, send to them
      if (currentOpenClients > 0) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            try {
              client.send(message);
              retryCount++;
            } catch (error) {
              console.error(`[WebSocket] Error on retry #${i} broadcast:`, error);
            }
          }
        });
        
        console.log(`[WebSocket] Retry #${i} broadcast for task ${taskId} sent to ${retryCount} clients`);
      } else {
        console.log(`[WebSocket] Retry #${i}: No open clients to receive message`);
      }
    }, 500 * i); // Stagger retries: 500ms, 1000ms, 1500ms, etc.
  }
  
  // Also use the generic broadcast method as a fallback
  setTimeout(() => {
    broadcastMessage('task_status_update', { 
      taskId, 
      status, 
      source: 'submission_status_fallback',
      timestamp: Date.now()
    });
  }, 1000);
}