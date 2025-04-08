// WebSocket service for client-side
export class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageListeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Start with disconnected state
    this.socket = null;
  }
  
  // Connect to the WebSocket server
  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      console.log('WebSocket is already connected or connecting');
      return;
    }
    
    try {
      // Determine the protocol based on whether the page is served over HTTPS or HTTP
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Create the WebSocket URL using the current host and the /ws path
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Connecting to WebSocket server at ${wsUrl}`);
      this.socket = new WebSocket(wsUrl);
      
      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }
  
  // Disconnect from the WebSocket server
  public disconnect(): void {
    this.clearPingInterval();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.notifyConnectionListeners(false);
  }
  
  // Check if the WebSocket is connected
  public isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }
  
  // Send a message to the server
  public send(message: any): boolean {
    if (!this.isConnected()) {
      console.warn('Cannot send message: WebSocket is not connected');
      return false;
    }
    
    try {
      const messageString = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
      
      this.socket!.send(messageString);
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }
  
  // Add a listener for a specific message type
  public addMessageListener(type: string, callback: (data: any) => void): void {
    if (!this.messageListeners.has(type)) {
      this.messageListeners.set(type, new Set());
    }
    
    this.messageListeners.get(type)!.add(callback);
  }
  
  // Remove a listener for a specific message type
  public removeMessageListener(type: string, callback: (data: any) => void): void {
    const listeners = this.messageListeners.get(type);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.messageListeners.delete(type);
      }
    }
  }
  
  // Add a connection state change listener
  public addConnectionListener(callback: (connected: boolean) => void): void {
    this.connectionListeners.add(callback);
    // Immediately notify of current state
    callback(this.isConnected());
  }
  
  // Remove a connection state change listener
  public removeConnectionListener(callback: (connected: boolean) => void): void {
    this.connectionListeners.delete(callback);
  }
  
  // Handle the WebSocket open event
  private handleOpen(): void {
    console.log('WebSocket connection established');
    this.reconnectAttempts = 0;
    this.setupPingInterval();
    this.notifyConnectionListeners(true);
  }
  
  // Handle incoming WebSocket messages
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Handle message based on its type
      if (data && typeof data === 'object' && data.type) {
        const listeners = this.messageListeners.get(data.type);
        if (listeners) {
          listeners.forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error(`Error in message listener for type ${data.type}:`, error);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }
  
  // Handle WebSocket close event
  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.clearPingInterval();
    this.notifyConnectionListeners(false);
    
    // Attempt to reconnect if the close wasn't intentional
    if (this.socket) {
      this.socket = null;
      this.scheduleReconnect();
    }
  }
  
  // Handle WebSocket errors
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    // The close handler will be called after this and will handle reconnection
  }
  
  // Set up a ping interval to keep the connection alive
  private setupPingInterval(): void {
    this.clearPingInterval();
    
    // Send a ping message every 30 seconds to keep the connection alive
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping', timestamp: new Date().toISOString() });
      } else {
        this.clearPingInterval();
      }
    }, 30000);
  }
  
  // Clear the ping interval
  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
  
  // Schedule a reconnection attempt
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      // Exponential backoff for reconnection attempts
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else {
      console.error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`);
    }
  }
  
  // Notify all connection listeners of a state change
  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection state listener:', error);
      }
    });
  }
}

// Create a singleton instance
let webSocketClient: WebSocketClient | null = null;

// Get the WebSocketClient instance, creating it if it doesn't exist
export function getWebSocketClient(): WebSocketClient {
  if (!webSocketClient) {
    webSocketClient = new WebSocketClient();
  }
  return webSocketClient;
}