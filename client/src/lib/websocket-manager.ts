/**
 * WebSocket Connection Manager
 * 
 * A robust WebSocket connection manager that handles:
 * - Connection establishment and maintenance
 * - Automatic reconnection with exponential backoff
 * - Connection health monitoring
 * - Message queuing during disconnections
 * - Event distribution to subscribers
 */

type WebSocketState = 'connecting' | 'open' | 'closing' | 'closed' | 'reconnecting';
type MessageHandler = (data: any) => void;

interface WebSocketManagerOptions {
  url: string;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

interface WebSocketEvent {
  type: string;
  data?: any;
  timestamp: string;
}

class WebSocketManager {
  private socket: WebSocket | null = null;
  private state: WebSocketState = 'closed';
  private url: string;
  private reconnectDelay: number;
  private maxReconnectDelay: number;
  private maxReconnectAttempts: number;
  private currentReconnectAttempts = 0;
  private currentReconnectDelay: number;
  private heartbeatInterval: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: string[] = [];
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private debug: boolean;
  private lastPingTime: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting = false;

  constructor(options: WebSocketManagerOptions) {
    this.url = options.url;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.maxReconnectDelay = options.maxReconnectDelay || 30000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.currentReconnectDelay = this.reconnectDelay;
    this.heartbeatInterval = options.heartbeatInterval || 15000;
    this.debug = options.debug || false;

    // Make the instance globally accessible
    if (typeof window !== 'undefined') {
      (window as any).tutorialWebSocketManager = this;
    }
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.socket && (this.state === 'open' || this.state === 'connecting')) {
      this.log('WebSocket already connected or connecting');
      return;
    }

    this.state = 'connecting';
    this.log(`Connecting to WebSocket: ${this.url}`);

    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      this.logError('Error creating WebSocket connection:', error);
      this.state = 'closed';
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.state = 'closing';
      this.log('Closing WebSocket connection');

      try {
        this.socket.close();
      } catch (error) {
        this.logError('Error closing WebSocket:', error);
      }
      
      this.socket = null;
    }
    
    this.state = 'closed';
  }

  /**
   * Send a message to the WebSocket server
   * If the connection is not open, message will be queued
   */
  public send(message: any): void {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    
    if (this.state === 'open' && this.socket) {
      this.socket.send(messageStr);
      this.log('Sent message:', message);
    } else {
      this.log('Connection not open, queuing message:', message);
      this.messageQueue.push(messageStr);
    }
  }

  /**
   * Subscribe to specific message types
   */
  public subscribe(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    
    this.handlers.get(type)!.add(handler);
    this.log(`Subscribed to ${type} events`);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(type);
        }
      }
    };
  }

  /**
   * Check if the socket is connected
   */
  public isConnected(): boolean {
    return this.state === 'open';
  }

  /**
   * Get the current state of the connection
   */
  public getState(): WebSocketState {
    return this.state;
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(event: Event): void {
    this.log('WebSocket connection established');
    this.state = 'open';
    this.currentReconnectAttempts = 0;
    this.currentReconnectDelay = this.reconnectDelay;
    this.isReconnecting = false;
    
    // Process queued messages
    this.processQueue();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Broadcast connection event
    this.broadcastEvent({
      type: 'connection_state',
      data: { state: 'connected' },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.state = 'closed';
    this.stopHeartbeat();
    
    // Broadcast disconnection event
    this.broadcastEvent({
      type: 'connection_state',
      data: { state: 'disconnected', code: event.code, reason: event.reason },
      timestamp: new Date().toISOString()
    });
    
    // Attempt to reconnect
    this.scheduleReconnect();
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    this.logError('WebSocket error:', event);
    
    // Broadcast error event
    this.broadcastEvent({
      type: 'connection_state',
      data: { state: 'error', error: 'Connection error occurred' },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.log('Received message:', data);
      
      // Handle heartbeat responses
      if (data.type === 'pong') {
        const now = Date.now();
        const latency = now - this.lastPingTime;
        this.log(`Heartbeat latency: ${latency}ms`);
        return;
      }
      
      // Process the message
      this.dispatchMessage(data);
      
      // Also broadcast as a generic message event
      this.broadcastEvent({
        type: 'message',
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logError('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Dispatch a message to subscribers
   */
  private dispatchMessage(data: any): void {
    if (!data.type) {
      this.log('Message has no type, ignoring');
      return;
    }

    const handlers = this.handlers.get(data.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.logError(`Error in handler for ${data.type}:`, error);
        }
      });
    }
  }

  /**
   * Process queued messages
   */
  private processQueue(): void {
    if (this.messageQueue.length === 0) return;
    
    this.log(`Processing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.socket && this.state === 'open') {
        this.socket.send(message);
      } else {
        break;
      }
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isReconnecting || this.state === 'connecting') return;
    
    this.isReconnecting = true;
    
    if (this.currentReconnectAttempts >= this.maxReconnectAttempts) {
      this.log('Maximum reconnection attempts reached');
      
      // Broadcast failed event
      this.broadcastEvent({
        type: 'connection_state',
        data: { state: 'failed', reason: 'Maximum reconnection attempts reached' },
        timestamp: new Date().toISOString()
      });
      
      return;
    }
    
    this.currentReconnectAttempts++;
    
    // Calculate backoff time with jitter
    const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15 multiplier
    const delay = Math.min(this.currentReconnectDelay * jitter, this.maxReconnectDelay);
    
    this.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.currentReconnectAttempts}/${this.maxReconnectAttempts})`);
    
    // Broadcast reconnecting event
    this.broadcastEvent({
      type: 'connection_state',
      data: { 
        state: 'reconnecting', 
        attempt: this.currentReconnectAttempts, 
        maxAttempts: this.maxReconnectAttempts,
        delay: Math.round(delay)
      },
      timestamp: new Date().toISOString()
    });
    
    // Schedule reconnection
    this.reconnectTimer = setTimeout(() => {
      this.state = 'reconnecting';
      this.connect();
      
      // Increase reconnect delay for next attempt (exponential backoff)
      this.currentReconnectDelay = Math.min(this.currentReconnectDelay * 1.5, this.maxReconnectDelay);
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.state === 'open' && this.socket) {
        const pingMessage = {
          type: 'ping',
          timestamp: new Date().toISOString()
        };
        
        this.lastPingTime = Date.now();
        this.send(pingMessage);
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Broadcast event to all listeners
   */
  private broadcastEvent(event: WebSocketEvent): void {
    // Use window.postMessage to broadcast to all components
    if (typeof window !== 'undefined') {
      window.postMessage({
        source: 'tutorial-websocket',
        event
      }, '*');
    }
  }

  /**
   * Log debug messages if debug mode is enabled
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[TutorialWebSocket]', ...args);
    }
  }

  /**
   * Log errors
   */
  private logError(...args: any[]): void {
    console.error('[TutorialWebSocket]', ...args);
  }
}

// Create and export the singleton instance
let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager && typeof window !== 'undefined') {
    // Determine WebSocket URL based on the current environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsManager = new WebSocketManager({
      url: wsUrl,
      debug: true
    });
    
    // Auto-connect
    wsManager.connect();
  }
  
  return wsManager!;
}

export default getWebSocketManager;