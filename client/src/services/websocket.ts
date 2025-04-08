/**
 * WebSocket Service
 * 
 * Handles WebSocket connections and message processing.
 */

class WebSocketService {
  private socket: WebSocket | null = null;
  private readonly subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private connectionId: string | null = null;
  private reconnectInterval: number = 2000; // ms
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private connectionPromise: Promise<WebSocket> | null = null;
  private connectionResolver: ((ws: WebSocket) => void) | null = null;

  /**
   * Initialize the WebSocket connection
   */
  public connect(): Promise<WebSocket> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // Connection already established, return silently
      return Promise.resolve(this.socket);
    }
    
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve) => {
      this.connectionResolver = resolve;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    });
    
    return this.connectionPromise;
  }

  /**
   * Close the WebSocket connection
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connectionPromise = null;
      this.connectionResolver = null;
      this.reconnectAttempts = 0;
      // Disconnect log removed to reduce console noise
    }
  }

  /**
   * Send a message to the server
   */
  public async send(type: string, payload: any): Promise<void> {
    const socket = await this.ensureConnection();
    
    const message = JSON.stringify({
      type,
      payload,
      connectionId: this.connectionId
    });
    
    socket.send(message);
  }

  /**
   * Subscribe to a specific message type
   */
  public subscribe(type: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    
    this.subscribers.get(type)?.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(type);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(type);
        }
      }
    };
  }

  /**
   * Ensure there's an active WebSocket connection
   */
  private async ensureConnection(): Promise<WebSocket> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return this.socket;
    }
    
    return this.connect();
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(event: Event): void {
    // Reset reconnect attempts on successful connection
    this.reconnectAttempts = 0;
    
    if (this.connectionResolver && this.socket) {
      this.connectionResolver(this.socket);
      this.connectionResolver = null;
    }
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // If this is a connection establishment message, store any connection ID
      if (data.type === 'connection_established') {
        this.connectionId = data.connectionId || 'ws-1';
        // Connection ID received, but log removed to reduce console noise
        
        // Notify subscribers for connection_established type
        this.subscribers.get('connection_established')?.forEach(callback => {
          callback(data.data || {});
        });
        return;
      }
      
      // Handle ping/pong messages
      if (data.type === 'ping') {
        this.send('pong', { timestamp: new Date().toISOString() });
        return;
      }
      
      // Handle generic message with type/payload format
      if (data.type) {
        // First deliver to specific subscribers
        if (this.subscribers.has(data.type)) {
          this.subscribers.get(data.type)?.forEach(callback => {
            callback(data.payload || data.data || data);
          });
        }
        
        // Then deliver to wildcard subscribers
        if (this.subscribers.has('')) {
          this.subscribers.get('')?.forEach(callback => {
            callback(data);
          });
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.socket = null;
    this.connectionPromise = null;
    
    // Only attempt to reconnect if it wasn't a clean close and we haven't exceeded max attempts
    if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Reconnection log removed to reduce console noise
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WebSocket connection failed after maximum reconnection attempts');
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
  }
}

// Create a singleton instance of the WebSocket service
const webSocketService = new WebSocketService();

export default webSocketService;