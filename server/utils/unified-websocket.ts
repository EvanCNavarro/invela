/**
 * Unified WebSocket Server Module
 * 
 * This module provides a centralized way to manage WebSocket connections and broadcasts
 * across the application, ensuring consistent messaging format and error handling.
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

let wss: WebSocketServer | null = null;
let clients: Map<string, WebSocket> = new Map();

/**
 * Initialize the WebSocket server
 */
export function initWebSocketServer(server: http.Server, path: string = '/ws') {
  if (wss) {
    console.log('[WebSocket] WebSocket server already initialized');
    return wss;
  }
  
  // Create WebSocket server on the specified path
  wss = new WebSocketServer({ 
    server, 
    path,
    clientTracking: true,
    // Configure for better reliability
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      // Below options specified as default values
      clientNoContextTakeover: true, // Defaults to negotiated value
      serverNoContextTakeover: true, // Defaults to negotiated value
      serverMaxWindowBits: 10, // Defaults to negotiated value
      concurrencyLimit: 10, // Limits zlib concurrency for performance
      threshold: 1024 // Size below which messages are not compressed
    }
  });
  
  // Generate a unique ID for the server instance
  const serverId = `${Math.random().toString(36).substring(2, 8)}`;
  console.log(`[INFO] Unified WebSocket server initialized successfully with details:`, {
    clients: wss.clients.size,
    path,
    id: serverId,
    timestamp: new Date().toISOString(),
  });
  
  // Set up heartbeat interval to detect and clean up dead connections
  const pingInterval = setInterval(() => {
    if (!wss || wss.clients.size === 0) return;
    
    // Send a heartbeat ping to all clients at regular interval
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          // Send a ping to keep connection alive and detect dead clients
          client.ping('', false, (error) => {
            if (error) console.error('[WebSocket] Ping error:', error);
          });
        } catch (e) {
          console.error('[WebSocket] Error sending ping:', e);
        }
      }
    });
  }, 30000); // Every 30 seconds
  
  // Handle new connections
  wss.on('connection', (ws, req) => {
    // Generate a unique client ID with timestamp for tracking
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    clients.set(clientId, ws);
    
    // Track connection health
    const connectionData = {
      id: clientId,
      lastActivity: Date.now(),
      isAlive: true,
      hasIdentified: false,
      userId: null as number | null,
      companyId: null as number | null,
      connectTime: new Date().toISOString(),
    };
    
    console.log(`[INFO] [WebSocket] Client connected: ${clientId}`);
    
    // When a pong is received, mark the connection as alive
    ws.on('pong', () => {
      connectionData.isAlive = true;
      connectionData.lastActivity = Date.now();
    });
    
    // Send a welcome message to confirm connection
    try {
      ws.send(JSON.stringify({
        type: 'connection_established',
        payload: {
          message: 'Connection established',
          clientId,
          timestamp: new Date().toISOString(),
        },
        data: {
          message: 'Connection established',
          clientId,
          timestamp: new Date().toISOString(),
        }
      }));
    } catch (sendError) {
      console.error(`[ERROR] [WebSocket] Error sending welcome message:`, sendError);
    }
    
    // Listen for messages from this client
    ws.on('message', (message) => {
      connectionData.lastActivity = Date.now();
      connectionData.isAlive = true;
      
      try {
        const parsedMessage = JSON.parse(message.toString());
        console.log(`[INFO] [WebSocket] Received message from client ${clientId}:`, parsedMessage);
        
        // Handle authentication message
        if (parsedMessage.type === 'authenticate') {
          const { userId, companyId } = parsedMessage;
          connectionData.userId = userId || null;
          connectionData.companyId = companyId || null;
          connectionData.hasIdentified = true;
          
          console.log(`[INFO] [WebSocket] Authentication from client ${clientId}:`, {
            userId,
            companyId,
            hasToken: !!req.headers.cookie?.includes('connect.sid')
          });
          
          // Send authentication confirmation
          ws.send(JSON.stringify({
            type: 'authenticated',
            payload: {
              userId,
              companyId,
              clientId,
              timestamp: new Date().toISOString(),
            },
            data: {
              userId,
              companyId,
              clientId,
              timestamp: new Date().toISOString(),
            }
          }));
        }
        
        // Handle ping message
        if (parsedMessage.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            payload: {
              timestamp: new Date().toISOString(),
            },
            data: {
              timestamp: new Date().toISOString(),
            }
          }));
        }
      } catch (error) {
        console.error(`[ERROR] [WebSocket] Error processing message:`, error);
      }
    });
    
    // Handle disconnections
    ws.on('close', (code, reason) => {
      console.log(`[INFO] [WebSocket] Client disconnected: ${clientId}`, {
        code,
        reason: reason.toString() || 'No reason provided',
        connectionDuration: `${Math.round((Date.now() - new Date(connectionData.connectTime).getTime()) / 1000)}s`
      });
      clients.delete(clientId);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error(`[ERROR] [WebSocket] Client error: ${clientId}`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    });
  });
  
  // Handle server errors with detailed logging
  wss.on('error', (error) => {
    console.error(`[ERROR] [WebSocket] Server error:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      clients: wss.clients.size
    });
  });
  
  // Handle server shutdown
  process.on('SIGTERM', () => {
    console.log('[INFO] [WebSocket] SIGTERM received, closing WebSocket server');
    clearInterval(pingInterval);
    
    if (wss) {
      try {
        wss.close();
        console.log('[INFO] [WebSocket] Server closed successfully');
      } catch (error) {
        console.error('[ERROR] [WebSocket] Error closing server:', error);
      }
    }
  });
  
  return wss;
}

/**
 * Broadcast a message to all connected clients
 */
export function broadcast(type: string, payload: any) {
  if (!wss) {
    console.warn('[WARN] [WebSocket] Cannot broadcast, WebSocket server not initialized');
    return false;
  }
  
  // Extract taskId if present to ensure it's available at the top level
  const taskId = payload.taskId || payload.id || null;
  
  const message = JSON.stringify({
    type,
    payload,
    data: payload, // For backward compatibility
    taskId: taskId, // Include taskId at the top level for client compatibility
    timestamp: new Date().toISOString(),
  });
  
  let sent = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  });
  
  if (sent > 0) {
    console.log(`[INFO] [WebSocket] Broadcast ${type} to ${sent} clients`);
  }
  
  return sent > 0;
}

// Alias for broadcast to maintain backward compatibility with existing code
export const broadcastMessage = broadcast;

/**
 * Get the active WebSocket server instance
 */
export function getWebSocketServer() {
  return wss;
}

/**
 * Get the number of connected clients
 */
export function getConnectedClientCount() {
  if (!wss) return 0;
  return wss.clients.size;
}

/**
 * Broadcast a company tabs update message to all connected clients
 * 
 * This is a critical function for ensuring clients see the file-vault tab
 * immediately after form submission and file creation.
 * 
 * @param companyId The ID of the company whose tabs were updated
 * @param availableTabs The updated array of available tabs
 * @param metadata Additional metadata to include in the message
 * @returns Boolean indicating whether the broadcast was successful
 */
export function broadcastCompanyTabsUpdate(
  companyId: number,
  availableTabs: string[],
  metadata: Record<string, any> = {}
) {
  // Create timestamp once for consistent messaging
  const timestamp = new Date().toISOString();
  
  // Log detailed information
  console.log(`[WebSocket] Broadcasting company tabs update:`, {
    companyId,
    availableTabs,
    hasFileVault: availableTabs.includes('file-vault'),
    timestamp
  });
  
  // Create a standardized message payload structure
  const payload = {
    companyId,
    availableTabs,
    metadata: {
      ...metadata,
      cache_invalidation: true, // Always force cache invalidation
      timestamp
    },
    timestamp
  };
  
  // Send both specific and general broadcasts for maximum compatibility
  // 1. First send the specific 'company_tabs_updated' event
  const tabsUpdateResult = broadcast('company_tabs_updated', payload);
  
  // 2. Send a general company_updated event as well for clients that listen for that
  const companyUpdateResult = broadcast('company_updated', {
    ...payload,
    company: {
      id: companyId,
      available_tabs: availableTabs
    }
  });
  
  // 3. Schedule additional delayed broadcasts to ensure clients receive updates
  // This is critical for clients that might reconnect after network issues
  const delayTimes = [1000, 2500]; // 1s, 2.5s delays
  delayTimes.forEach(delay => {
    setTimeout(() => {
      try {
        console.log(`[WebSocket] Sending delayed (${delay}ms) company tabs broadcast for company ${companyId}`);
        broadcast('company_tabs_updated', {
          ...payload,
          delayed: true,
          delayMs: delay
        });
      } catch (e) {
        console.error(`[WebSocket] Error in delayed tabs broadcast:`, e);
      }
    }, delay);
  });
  
  return tabsUpdateResult || companyUpdateResult;
}

/**
 * Broadcast a task update message to all connected clients
 * 
 * @param taskId The ID of the task that was updated
 * @param progress The new progress value (0-100)
 * @param status The new status ('not_started', 'in_progress', etc.)
 * @param metadata Additional metadata to include in the message
 * @returns Boolean indicating whether the broadcast was successful
 */
export function broadcastTaskUpdate(
  taskId: number,
  progress: number,
  status: string,
  metadata: Record<string, any> = {}
) {
  // Create timestamp once for consistent messaging
  const timestamp = new Date().toISOString();
  
  // Create a standardized message payload structure
  const payload = {
    id: taskId,
    taskId,
    status,
    progress,
    metadata: {
      ...metadata,
      lastUpdate: timestamp
    },
    timestamp
  };
  
  return broadcast('task_update', payload);
}

/**
 * Broadcast a form submission event to all connected clients
 * 
 * @param formType The type of form that was submitted ('kyb', 'ky3p', 'open_banking')
 * @param taskId The ID of the task associated with the submission
 * @param companyId The ID of the company associated with the submission
 * @param metadata Additional metadata to include in the message
 * @returns Boolean indicating whether the broadcast was successful
 */
export function broadcastFormSubmission(
  formType: string,
  taskId: number,
  companyId: number,
  metadata: Record<string, any> = {}
) {
  // Create timestamp once for consistent messaging
  const timestamp = new Date().toISOString();
  
  // Extract file information from metadata if present
  const fileId = metadata.fileId;
  const fileName = metadata.fileName;
  
  // Log detailed information about file references included in broadcast
  console.log(`[WebSocket] Broadcasting form submission with file details:`, {
    taskId,
    formType,
    companyId,
    hasFileId: !!fileId,
    hasFileName: !!fileName,
    timestamp
  });
  
  // Create a standardized message payload structure with enhanced file information
  const payload = {
    formType,
    taskId,
    companyId,
    fileId, // Include file ID directly in the root payload for easier access
    fileName, // Include file name directly in the root payload for easier access
    status: 'submitted', // Always include status for consistency
    metadata: {
      ...metadata,
      fileIncluded: !!fileId,
      timestamp,
      // File vault related information
      downloadUrl: fileId ? `/api/files/${fileId}/download` : undefined,
      previewUrl: fileId ? `/api/files/${fileId}/preview` : undefined,
    },
    timestamp
  };
  
  // First broadcast the form submission event
  const formSubmittedResult = broadcast('form_submitted', payload);
  
  // Additionally broadcast a task update to ensure clients have multiple ways to receive the update
  // This helps with client synchronization even if they missed the form_submitted event
  const taskUpdateResult = broadcastTaskUpdate(taskId, 100, 'submitted', {
    ...metadata,
    fileId,
    fileName,
    formType,
    formSubmission: true,
    submissionComplete: true
  });
  
  // Also broadcast a specific file_vault_update event to notify file vault components
  if (fileId) {
    const fileUpdateResult = broadcast('file_vault_update', {
      fileId,
      fileName,
      taskId,
      companyId,
      formType,
      action: 'added',
      timestamp
    });
    
    // Return true if any of the broadcasts were successful
    return formSubmittedResult || taskUpdateResult || fileUpdateResult;
  }
  
  return formSubmittedResult || taskUpdateResult;
}
