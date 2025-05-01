/**
 * WebSocket Connection Manager
 * 
 * This utility establishes and manages a persistent WebSocket connection
 * to receive real-time updates from the server.
 */

class WebSocketManager {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPongReceived = 0;
  
  // Event handlers for different message types
  private eventHandlers: Record<string, ((data: any) => void)[]> = {};
  
  /**
   * Initialize the WebSocket connection
   */
  initialize() {
    console.log('[WebSocket] Smart WebSocket connection manager initialized');
    this.connect();
  }
  
  /**
   * Connect to the WebSocket server
   */
  private connect() {
    try {
      // Determine the correct WebSocket URL
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.info('[WebSocket] Connecting to WebSocket:', wsUrl);
      
      this.socket = new WebSocket(wsUrl);
      
      // Setup event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.warn('[WebSocket] Connection to ' + window.location.host + '/ws failed:', error);
      this.scheduleReconnect();
    }
  }
  
  /**
   * Handle WebSocket connection open
   */
  private handleOpen() {
    console.info('[WebSocket] WebSocket connection established');
    
    // Reset reconnect attempts on successful connection
    this.reconnectAttempts = 0;
    
    // Send authentication message
    this.send('authenticate', { timestamp: new Date().toISOString() });
    
    // Start sending ping messages to keep the connection alive
    this.startPingInterval();
  }
  
  /**
   * Start sending periodic ping messages to prevent timeout
   */
  private startPingInterval() {
    // Clear any existing interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    // Reset the last pong timestamp
    this.lastPongReceived = Date.now();
    
    // Send a ping message every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Send ping message
        this.socket.send(JSON.stringify({ type: 'ping' }));
        
        // Check if we've received a pong recently
        const timeSinceLastPong = Date.now() - this.lastPongReceived;
        if (timeSinceLastPong > 70000) { // 70 seconds
          console.warn('[WebSocket] No pong received, reconnecting...');
          this.socket.close();
        }
      }
    }, 30000); // 30 seconds
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data);
      console.info('[WebSocket] Received message:', message);
      
      // Update the last pong timestamp
      if (message.type === 'pong') {
        this.lastPongReceived = Date.now();
        return;
      }
      
      // Handle connection_established message
      if (message.type === 'connection_established') {
        console.info('[WebSocket] Server connection confirmed:', message.message);
        return;
      }
      
      // The server may send data in either message.data or message.payload format
      // We need to support both formats for backward compatibility
      const payload = message.data !== undefined ? message.data : message.payload;
      
      // Trigger any registered event handlers for this message type
      if (this.eventHandlers[message.type]) {
        this.eventHandlers[message.type].forEach(handler => {
          try {
            handler(payload);
          } catch (handlerError) {
            console.error(`[WebSocket] Error in handler for ${message.type}:`, handlerError);
          }
        });
      }
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error, event.data);
    }
  }
  
  /**
   * Handle WebSocket connection close
   */
  private handleClose(event: CloseEvent) {
    console.info('[WebSocket] WebSocket connection closed:', event.code, event.reason);
    
    // Clean up ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Attempt to reconnect
    this.scheduleReconnect();
  }
  
  /**
   * Handle WebSocket errors
   */
  private handleError(event: Event) {
    console.error('[WebSocket] WebSocket error:', event);
    console.error('[WebSocket] Connection error:', event);
  }
  
  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Maximum reconnection attempts reached');
      return;
    }
    
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    // Calculate delay with exponential backoff
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    console.info(`[WebSocket] Scheduling reconnection attempt in ${delay/1000} seconds...`);
    
    this.reconnectTimeout = setTimeout(() => {
      console.info(`[WebSocket] Attempting to reconnect (attempt ${this.reconnectAttempts})...`);
      this.connect();
    }, delay);
  }
  
  /**
   * Register an event handler for a specific message type
   */
  on(eventType: string, handler: (data: any) => void) {
    if (!this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = [];
    }
    this.eventHandlers[eventType].push(handler);
    
    return () => this.off(eventType, handler);
  }
  
  /**
   * Remove an event handler
   */
  off(eventType: string, handler: (data: any) => void) {
    if (this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = this.eventHandlers[eventType].filter(h => h !== handler);
    }
  }
  
  /**
   * Send a message to the server
   */
  send(type: string, data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
      return true;
    }
    return false;
  }
  
  /**
   * Close the WebSocket connection
   */
  close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

// Export a singleton instance
const wsManager = new WebSocketManager();
export default wsManager;
