/**
 * WebSocket Service
 * 
 * This service provides a centralized way to interact with WebSockets in the application.
 * It handles:
 * - Broadcasting events to all connected clients
 * - Broadcasting events to specific clients based on criteria
 * - Managing WebSocket connections
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { Express } from 'express';

// Types
interface WebSocketMessage {
  type: string;
  data?: any;
  payload?: any; // For legacy support
}

let wss: WebSocketServer | null = null;

/**
 * Initialize WebSocket server
 * @param server HTTP server instance
 * @param app Express app instance
 */
export function setupWebSocket(server: Server, app?: Express) {
  if (wss) {
    console.warn('[WebSocket] Server already initialized');
    return wss;
  }
  
  wss = new WebSocketServer({ 
    server, 
    path: '/ws',
    // Ignore Vite HMR WebSocket connections
    verifyClient: (info: any) => {
      const protocol = info.req.headers['sec-websocket-protocol'];
      return protocol !== 'vite-hmr';
    }
  });

  console.log('[WebSocket] Server initialized on path: /ws');
  
  // Set up connection handling
  wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    
    // Send connected message
    ws.send(JSON.stringify({
      type: 'connection_established',
      payload: {  // Changed from 'data' to 'payload' for consistency
        timestamp: new Date().toISOString()
      }
    }));
    
    // Handle messages
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        
        // Handle ping/pong for client heartbeats
        if (parsedMessage.type === 'ping') {
          console.log('[WebSocket] Received ping');
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }
        
        console.log('[WebSocket] Received message:', parsedMessage);
        
        // Process different message types
        // Add more handlers as needed
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', (code, reason) => {
      console.log('WebSocket client disconnected with code', code, 'and reason:', reason.toString());
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('[WebSocket] Client connection error:', error);
    });
  });
  
  // Register global error handler
  wss.on('error', (error) => {
    console.error('[WebSocket] Server error:', error);
  });
  
  if (app) {
    // Expose WSS instance for testing endpoints
    console.log('[WebSocket] WebSocketServer instance exported for test endpoints');
    (app as any).wsServer = wss;
  }
  
  return wss;
}

/**
 * Get the WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}

/**
 * Broadcast a message to all connected clients
 * @param type Message type
 * @param data Message data
 */
export function broadcast(type: string, data: any) {
  if (!wss) {
    console.warn('[WebSocket] Cannot broadcast, server not initialized');
    return false;
  }
  
  const message = JSON.stringify({ 
    type, 
    payload: data  // Using 'payload' to match client expectations
  });
  let clientCount = 0;
  
  // Add timestamp if not provided
  if (data && !data.timestamp) {
    data.timestamp = new Date().toISOString();
  }
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        clientCount++;
      } catch (err) {
        console.error('[WebSocket] Error sending message to client:', err);
      }
    }
  });
  
  console.log(`[WebSocket] Broadcast "${type}" sent to ${clientCount} clients`, {
    type,
    dataKeys: data ? Object.keys(data) : [],
    timestamp: data?.timestamp || new Date().toISOString(),
    clientCount
  });
  
  return clientCount > 0;
}

/**
 * Broadcast a submission status update for a task
 * @param taskId Task ID
 * @param status Submission status
 */
export function broadcastSubmissionStatus(taskId: number, status: string) {
  broadcast('submission_status', {
    taskId,
    status,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast a task update
 * @param data Task data (must include an id property)
 */
export function broadcastTaskUpdate(data: any) {
  if (!data || !data.id) {
    console.error('[WebSocket] broadcastTaskUpdate: Missing task ID in data');
    return;
  }
  
  broadcast('task_updated', {
    ...data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast a company tabs update
 * This is a specialized function for handling company tab updates
 * which is a critical workflow for the application
 * 
 * @param companyId Company ID
 * @param availableTabs Available tabs array
 */
export function broadcastCompanyTabsUpdate(
  companyId: number, 
  availableTabs: string[], 
  options: { cache_invalidation?: boolean, source?: string } = {}
) {
  if (!wss) {
    console.warn('[WebSocket] Cannot broadcast company tabs update, server not initialized');
    return;
  }
  
  // Create message with the correct format expected by the client
  const message = JSON.stringify({
    type: 'company_tabs_updated',
    payload: {  // Changed 'data' to 'payload' to match client expectations
      companyId,
      availableTabs,
      timestamp: new Date().toISOString(),
      cache_invalidation: options.cache_invalidation === true,
      source: options.source || 'server'
    }
  });
  
  let clientCount = 0;
  
  // Send to all connected clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      clientCount++;
    }
  });
  
  console.log(`[WebSocket] Broadcast "company_tabs_updated" sent to ${clientCount} clients for company ${companyId}`, {
    availableTabs,
    clientCount,
    timestamp: new Date().toISOString(),
    cache_invalidation: options.cache_invalidation === true,
    source: options.source || 'server'
  });
  
  // For debugging, also log out the available tabs
  if (clientCount === 0) {
    console.warn(`[WebSocket] No connected clients to receive company tabs update for company ${companyId}`);
  }
}

// Add broadcastMessage as an alias for broadcast to maintain compatibility
export const broadcastMessage = broadcast;

// Add broadcastDocumentCountUpdate for files.ts
export function broadcastDocumentCountUpdate(companyId: number, count: number) {
  broadcast('document_count_update', {
    companyId,
    count,
    timestamp: new Date().toISOString()
  });
}

// Add broadcastFieldUpdate for kyb.ts
export function broadcastFieldUpdate(taskId: number, fieldId: number, data: any) {
  broadcast('field_update', {
    taskId,
    fieldId,
    ...data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast form submission status
 * This specialized function is used by the unified form submission endpoint
 * to notify clients about form submission events.
 * 
 * @param taskId Task ID
 * @param formType Form type (kyb, ky3p, card, open_banking)
 * @param status Status of the submission (success, error, in_progress)
 * @param companyId Company ID
 * @param data Additional data to include in the payload
 */
export function broadcastFormSubmission(
  taskId: number,
  formType: string,
  status: 'success' | 'error' | 'in_progress',
  companyId: number,
  data: {
    submissionDate?: string;
    unlockedTabs?: string[];
    unlockedTasks?: number[];
    fileName?: string;
    fileId?: number;
    error?: string;
  } = {}
) {
  // Create standardized payload for form submission events
  const payload = {
    taskId,
    formType,
    status,
    companyId,
    submissionDate: data.submissionDate || new Date().toISOString(),
    ...data
  };
  
  // Broadcast using the form_submitted event type
  broadcast('form_submitted', payload);
  
  console.log(`[WebSocket] Form submission broadcast: taskId=${taskId}, formType=${formType}, status=${status}`);
  console.log(`[WebSocket] Form submission details:`, {
    taskId,
    formType,
    status,
    companyId,
    submissionDate: data.submissionDate || new Date().toISOString(),
    unlockedTabs: data.unlockedTabs || [],
    unlockedTasks: data.unlockedTasks || [],
    fileInfo: data.fileName ? { fileName: data.fileName, fileId: data.fileId } : 'No file generated',
    error: data.error || null,
    timestamp: new Date().toISOString()
  });
  
  // For successful submissions, also broadcast a task update to ensure UI reflects new status
  if (status === 'success') {
    console.log(`[WebSocket] Broadcasting task status update for task ${taskId} to 'submitted' with 100% progress`);
    broadcastTaskUpdate({
      id: taskId,
      status: 'submitted',
      progress: 100
    });
  }
}

export default {
  setupWebSocket,
  getWebSocketServer,
  broadcast,
  broadcastMessage,
  broadcastSubmissionStatus,
  broadcastTaskUpdate,
  broadcastCompanyTabsUpdate,
  broadcastDocumentCountUpdate,
  broadcastFieldUpdate,
  broadcastFormSubmission
};