/**
 * ========================================
 * Unified WebSocket Service
 * ========================================
 * 
 * Single source of truth for all WebSocket connections across the application.
 * Replaces multiple competing WebSocket services to eliminate race conditions
 * and modal rendering issues.
 * 
 * Key Features:
 * - Single connection per user session
 * - Event subscription management
 * - Automatic reconnection with exponential backoff
 * - Message routing to subscribed components
 * 
 * @module services/websocket-unified
 * @version 1.0.0
 * @since 2025-05-30
 */

// ========================================
// TYPES & INTERFACES
// ========================================

interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: string;
}

interface MessageHandler {
  (data: any): void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// ========================================
// UNIFIED WEBSOCKET SERVICE
// ========================================

class UnifiedWebSocketService {
  private socket: WebSocket | null = null;
  private subscribers = new Map<string, Set<MessageHandler>>();
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<void> | null = null;
  
  // Static instance for singleton pattern
  private static instance: UnifiedWebSocketService | null = null;
  
  private constructor() {
    // Private constructor for singleton
  }
  
  static getInstance(): UnifiedWebSocketService {
    if (!UnifiedWebSocketService.instance) {
      UnifiedWebSocketService.instance = new UnifiedWebSocketService();
    }
    return UnifiedWebSocketService.instance;
  }
  
  // ========================================
  // CONNECTION MANAGEMENT
  // ========================================
  
  async connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    
    if (this.connectionPromise) {
      return this.connectionPromise;
    }
    
    this.connectionPromise = this.establishConnection();
    return this.connectionPromise;
  }
  
  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.status = 'connecting';
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          this.status = 'connected';
          this.reconnectAttempts = 0;
          this.connectionPromise = null;
          this.startHeartbeat();
          console.log('[UnifiedWebSocket] Connection established successfully');
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };
        
        this.socket.onclose = () => {
          this.status = 'disconnected';
          this.cleanup();
          this.scheduleReconnect();
        };
        
        this.socket.onerror = () => {
          this.status = 'error';
          reject(new Error('WebSocket connection failed'));
        };
        
      } catch (error) {
        this.status = 'error';
        this.connectionPromise = null;
        reject(error);
      }
    });
  }
  
  disconnect(): void {
    this.cleanup();
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    this.status = 'disconnected';
  }
  
  // ========================================
  // MESSAGE HANDLING
  // ========================================
  
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Minimal debug logging for task updates only
      if (message.type === 'task_updated' || message.type === 'task_update') {
        const taskId = message.data?.taskId || (message as any).payload?.taskId || (message as any).taskId;
        if (taskId) {
          console.log(`[WebSocket] ${message.type} for task ${taskId}`);
        }
      }
      
      // Handle system messages
      if (message.type === 'pong') {
        return; // Heartbeat response
      }
      
      // Route message to subscribers
      const handlers = this.subscribers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            // Extract data from the proper location - server sends payload structure
            const messageData = (message as any).payload || message.data || message;
            handler(messageData);
          } catch (error) {
            console.error('[WebSocket] Error in message handler:', error);
          }
        });
      }
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error);
    }
  }
  
  send(type: string, data?: any): boolean {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString()
      };
      
      this.socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }
  
  // ========================================
  // SUBSCRIPTION MANAGEMENT
  // ========================================
  
  subscribe(messageType: string, handler: MessageHandler): () => void {
    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, new Set());
    }
    
    const handlers = this.subscribers.get(messageType)!;
    handlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(messageType);
      }
    };
  }
  
  // ========================================
  // CONNECTION UTILITIES
  // ========================================
  
  getStatus(): ConnectionStatus {
    return this.status;
  }
  
  isConnected(): boolean {
    return this.status === 'connected' && this.socket?.readyState === WebSocket.OPEN;
  }
  
  private startHeartbeat(): void {
    // Heartbeat functionality removed - relying on real-time WebSocket events only
  }
  
  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    this.reconnectTimeout = setTimeout(() => {
      console.log(`[WebSocket] Reconnection attempt ${this.reconnectAttempts}`);
      this.connect().catch(console.error);
    }, delay);
  }
}

// ========================================
// EXPORTS
// ========================================

export const unifiedWebSocketService = UnifiedWebSocketService.getInstance();
export type { WebSocketMessage, MessageHandler, ConnectionStatus };