/**
 * WebSocket Service
 * 
 * This service manages WebSocket connections and provides methods
 * for broadcasting messages to clients.
 */

import { WebSocketServer, WebSocket } from 'ws';

/**
 * Message types that can be sent over WebSocket
 */
export type MessageType = 
  | 'ping'
  | 'pong'
  | 'authenticate'
  | 'authenticated'
  | 'notification'
  | 'tutorial_progress'
  | 'tutorial_completed'
  | 'task_updated'
  | 'form_submission_update'
  | 'error';

/**
 * WebSocket message interface
 */
export interface WebSocketMessage {
  type: MessageType | string;
  timestamp?: string;
  [key: string]: any;
}

/**
 * Form submission payload interface
 */
export interface FormSubmissionPayload {
  taskId: number;
  formType: string;
  status: 'success' | 'error';
  companyId: number;
  unlockedTabs?: string[];
  unlockedTasks?: number[];
  submissionDate?: string;
  fileName?: string;
  fileId?: number;
  error?: string;
}

/**
 * WebSocket Service for broadcasting messages to clients
 */
export class WebSocketService {
  private wss: WebSocketServer | null;
  private clients: Set<WebSocket> = new Set();
  private isEnabled = false;
  
  /**
   * Create a new WebSocketService
   * 
   * @param wss The WebSocket server to use
   */
  constructor(wss: WebSocketServer | null) {
    this.wss = wss;
    
    if (this.wss) {
      this.isEnabled = true;
      this.setupConnectionHandlers();
      console.log('[WebSocketService] Initialized successfully');
    } else {
      this.isEnabled = false;
      console.log('[WebSocketService] Initialized in fallback mode (WebSocket server not available)');
    }
  }
  
  /**
   * Set up WebSocket connection handlers
   */
  private setupConnectionHandlers() {
    if (!this.wss) {
      console.log('[WebSocketService] Cannot set up connection handlers: WebSocket server is null');
      return;
    }
    
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[WebSocketService] New client connected');
      this.clients.add(ws);
      
      // Send connection established message
      this.sendToClient(ws, {
        type: 'connection_established',
        payload: {
          timestamp: new Date().toISOString()
        }
      });
      
      // Handle client disconnection
      ws.on('close', () => {
        console.log('[WebSocketService] Client disconnected');
        this.clients.delete(ws);
      });
      
      // Handle connection errors
      ws.on('error', (error: Error) => {
        console.error('[WebSocketService] WebSocket error:', error);
      });
    });
  }
  
  /**
   * Set up WebSocket server for initial connection handling
   * This method is needed for deployment compatibility
   * 
   * @param server The HTTP server to attach the WebSocket server to
   * @param path The path for the WebSocket server
   * @returns The WebSocket server instance
   */
  static initializeWebSocketServer(server: any, path: string = '/ws'): WebSocketServer {
    const wss = new WebSocketServer({ 
      server,
      path,
      // Important: Skip HMR WebSocket connections
      verifyClient: (info: any) => {
        const protocol = info.req.headers['sec-websocket-protocol'];
        return protocol !== 'vite-hmr';
      }
    });
    
    console.log(`[WebSocketService] Unified WebSocket server initialized successfully`, {
      module: 'WebSocket',
      clients: 0,
      path,
      id: Math.random().toString(36).substring(2, 8),
      timestamp: new Date().toISOString()
    });
    
    return wss;
  }
  
  /**
   * Send a message to a specific client
   * 
   * @param client The client to send the message to
   * @param message The message to send
   */
  private sendToClient(client: WebSocket, message: WebSocketMessage) {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('[WebSocketService] Error sending message to client:', error);
    }
  }
  
  /**
   * Broadcast a message to all connected clients
   * 
   * @param message The message to broadcast
   */
  broadcast(message: WebSocketMessage) {
    console.log(`[WebSocketService] Broadcasting message: ${message.type}`);
    
    // If WebSocket is not enabled, log a message and skip broadcasting
    if (!this.isEnabled) {
      console.log(`[WebSocketService] WebSocket is not enabled, skipping broadcast: ${message.type}`);
      return;
    }
    
    if (this.clients.size === 0) {
      console.log(`[WebSocketService] No connected clients, skipping broadcast: ${message.type}`);
      return;
    }
    
    this.clients.forEach(client => {
      this.sendToClient(client, message);
    });
  }
  
  /**
   * Broadcast a general message to all clients
   * This method is needed for deployment compatibility
   * 
   * @param type The message type
   * @param data The message data
   */
  static broadcastMessage(type: string, data: any) {
    const instance = globalWebSocketService;
    if (!instance) {
      console.warn(`[WebSocketService] No global WebSocket service instance available, cannot broadcast message of type: ${type}`);
      return;
    }
    
    instance.broadcast({
      type,
      ...data,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Broadcast a form submission completion event
   * This method is needed for deployment compatibility
   * 
   * @param data The form submission data
   */
  static broadcastFormSubmissionCompleted(data: any) {
    const instance = globalWebSocketService;
    if (!instance) {
      console.warn('[WebSocketService] No global WebSocket service instance available, cannot broadcast form submission completed');
      return;
    }
    
    instance.broadcast({
      type: 'form_submission_completed',
      ...data,
      timestamp: new Date().toISOString()
    });
    
    return true;
  }
  
  /**
   * Broadcast a form submission event
   * 
   * @param payload The form submission payload
   */
  broadcastFormSubmission(payload: FormSubmissionPayload) {
    console.log(`[WebSocketService] Broadcasting form submission: ${payload.formType} for task ${payload.taskId}`);
    
    if (!this.isEnabled) {
      console.log(`[WebSocketService] WebSocket is not enabled, skipping form submission broadcast for task ${payload.taskId}`);
      return;
    }
    
    this.broadcast({
      type: 'form_submission_update',
      payload
    });
  }
  
  /**
   * Broadcast a company tabs update
   * 
   * @param companyId The company ID
   * @param tabs The updated tabs
   */
  broadcastCompanyTabsUpdate(companyId: number, tabs: string[]) {
    console.log(`[WebSocketService] Broadcasting company tabs update for company ${companyId}`);
    
    if (!this.isEnabled) {
      console.log(`[WebSocketService] WebSocket is not enabled, skipping company tabs update broadcast for company ${companyId}`);
      return;
    }
    
    this.broadcast({
      type: 'company_tabs_updated',
      payload: {
        companyId,
        availableTabs: tabs,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  /**
   * Broadcast a task update
   * 
   * @param taskId The task ID
   * @param status The updated status
   * @param progress The updated progress
   */
  broadcastTaskUpdate(taskId: number, status: string, progress: number) {
    console.log(`[WebSocketService] Broadcasting task update for task ${taskId}: ${status} (${progress}%)`);
    
    if (!this.isEnabled) {
      console.log(`[WebSocketService] WebSocket is not enabled, skipping task update broadcast for task ${taskId}`);
      return;
    }
    
    this.broadcast({
      type: 'task_update',
      payload: {
        taskId,
        status,
        progress,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Create a global instance for static method access
let globalWebSocketService: WebSocketService | null = null;

// Export a function to set the global instance
export function setGlobalWebSocketService(instance: WebSocketService) {
  globalWebSocketService = instance;
  console.log('[WebSocketService] Global WebSocket service instance set');
  return instance;
}

export default WebSocketService;