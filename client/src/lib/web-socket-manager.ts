/**
 * WebSocket Manager
 * 
 * A centralized WebSocket manager that provides event-based communication
 * for real-time updates across the application. This manager handles
 * connection, authentication, and event subscription.
 */

import riskScoreLogger from './risk-score-logger';

// Define WebSocket event types for type safety
export type WebSocketEventType = 
  | 'connection_established'
  | 'authenticated'
  | 'risk_score_update'
  | 'risk_priorities_update'
  | 'risk_priority_update' // Legacy name for backward compatibility
  | 'task_updated'
  | 'company_updated'
  | 'form_submitted'
  | 'ping'
  | 'pong'
  | 'error';

// WebSocket event handler type
export type WebSocketEventHandler = (data: any) => void;

/**
 * WebSocket Manager Class
 * Provides centralized WebSocket connection and event handling
 */
class WebSocketManager {
  private socket: WebSocket | null = null;
  private eventHandlers: Map<WebSocketEventType, WebSocketEventHandler[]> = new Map();
  private connectionId: string = '';
  private isAuthenticated: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeoutId: number | null = null;
  private pingIntervalId: number | null = null;
  private userId: number | null = null;
  private companyId: number | null = null;
  
  /**
   * Connect to the WebSocket server
   * @param userId Optional user ID for authentication
   * @param companyId Optional company ID for authentication
   */
  connect(userId?: number, companyId?: number): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }
    
    if (userId) this.userId = userId;
    if (companyId) this.companyId = companyId;
    
    try {
      // Determine the correct WebSocket URL based on environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      // Create a new WebSocket connection
      this.socket = new WebSocket(wsUrl);
      
      // Set up connection event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      
      console.log('[WebSocket] Connection attempt initiated');
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
    }
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.clearPingInterval();
    
    if (this.reconnectTimeoutId) {
      window.clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    if (this.socket) {
      // Remove event handlers to prevent memory leaks
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      
      // Close the connection if it's still open
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
      
      this.socket = null;
      this.isAuthenticated = false;
      console.log('[WebSocket] Disconnected');
    }
  }
  
  /**
   * Subscribe to a WebSocket event
   * @param eventType The event type to listen for
   * @param handler The handler function to call when the event occurs
   * @returns A function to unsubscribe the handler
   */
  on(eventType: WebSocketEventType, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    
    const handlers = this.eventHandlers.get(eventType)!;
    handlers.push(handler);
    
    // Return an unsubscribe function
    return () => {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }
  
  /**
   * Send a message to the WebSocket server
   * @param type Message type
   * @param data Optional payload data
   */
  send(type: string, data: any = {}): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message, socket not connected');
      return;
    }
    
    try {
      const message = {
        type,
        timestamp: new Date().toISOString(),
        connectionId: this.connectionId,
        ...data
      };
      
      this.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('[WebSocket] Error sending message:', error);
    }
  }
  
  /**
   * Authenticate with the WebSocket server
   */
  authenticate(): void {
    if (!this.userId || !this.companyId) {
      console.warn('[WebSocket] Cannot authenticate, missing user or company ID');
      return;
    }
    
    this.send('authenticate', {
      userId: this.userId,
      companyId: this.companyId,
      clientId: this.connectionId
    });
    
    console.log('[WebSocket] Sending authentication message', {
      userId: this.userId,
      companyId: this.companyId,
      connectionId: this.connectionId,
      hasUserData: !!this.userId,
      hasCompanyData: !!this.companyId
    });
  }
  
  /**
   * Start sending periodic ping messages to keep the connection alive
   */
  startPingInterval(): void {
    this.clearPingInterval();
    
    // Send a ping every 30 seconds to keep the connection alive
    this.pingIntervalId = window.setInterval(() => {
      this.send('ping');
    }, 30000);
  }
  
  /**
   * Clear the ping interval
   */
  clearPingInterval(): void {
    if (this.pingIntervalId) {
      window.clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }
  
  /**
   * Handle WebSocket connection open event
   */
  private handleOpen(event: Event): void {
    console.log('[WebSocket] Connection established');
    this.reconnectAttempts = 0;
    
    // Generate a unique connection ID if none exists
    if (!this.connectionId) {
      this.connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Emit the connection established event
    this.emit('connection_established', {
      clientId: this.connectionId,
      timestamp: new Date().toISOString(),
      message: 'Connection established'
    });
    
    // Authenticate if we have user and company information
    if (this.userId && this.companyId) {
      this.authenticate();
    }
    
    // Start the ping interval to keep the connection alive
    this.startPingInterval();
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      console.log('[WebSocket] Received message:', data);
      
      if (data.type === 'authenticated') {
        this.isAuthenticated = true;
        console.log('[WebSocket] WebSocket authentication confirmed for client:', this.userId || 'unknown');
      }
      
      // Emit the event to all registered handlers
      this.emit(data.type as WebSocketEventType, data);
      
      // Handle ping/pong for connection health checks
      if (data.type === 'ping') {
        this.send('pong', { echo: { type: 'ping' } });
      }
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error);
    }
  }
  
  /**
   * Handle WebSocket connection close event
   */
  private handleClose(event: CloseEvent): void {
    console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason}`);
    this.clearPingInterval();
    
    // Attempt to reconnect if we haven't reached the maximum attempts
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`[WebSocket] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimeoutId = window.setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(this.userId || undefined, this.companyId || undefined);
      }, delay);
    } else {
      console.log('[WebSocket] Maximum reconnection attempts reached');
    }
  }
  
  /**
   * Handle WebSocket error events
   */
  private handleError(event: Event): void {
    console.error('[WebSocket] Connection error:', event);
    this.emit('error', {
      timestamp: new Date().toISOString(),
      message: 'WebSocket connection error',
      event
    });
  }
  
  /**
   * Emit an event to all registered handlers
   * @param eventType The type of event to emit
   * @param data The event data
   */
  private emit(eventType: WebSocketEventType, data: any): void {
    const handlers = this.eventHandlers.get(eventType);
    
    if (handlers && handlers.length > 0) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WebSocket] Error in event handler for ${eventType}:`, error);
        }
      });
    }
  }
  
  /**
   * Check if the WebSocket is connected
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }
  
  /**
   * Get the current connection ID
   * @returns The connection ID
   */
  getConnectionId(): string {
    return this.connectionId;
  }
  
  /**
   * Check if the WebSocket is authenticated
   * @returns True if authenticated, false otherwise
   */
  isAuthenticatedStatus(): boolean {
    return this.isAuthenticated;
  }
}

// Create a singleton instance
const wsManager = new WebSocketManager();

// Auto-connect if we're in a browser environment
if (typeof window !== 'undefined') {
  // Small delay to allow other initialization to complete
  setTimeout(() => {
    try {
      riskScoreLogger.log('websocket', 'Initializing WebSocket connection');
      wsManager.connect();
    } catch (error) {
      console.error('[WebSocket] Auto-connect error:', error);
    }
  }, 100);
}

export default wsManager;