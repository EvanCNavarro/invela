/**
 * WebSocket Client
 * 
 * This file contains a WebSocket client singleton for communication with the server
 */

let webSocketService: WebSocketService | null = null;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private connectionId: string = '';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();
  
  constructor() {
    this.connectionId = `ws_${Date.now()}_${this.generateRandomId()}`;
    this.connect();
    
    // Keep alive with ping
    setInterval(() => {
      this.ping();
    }, 30000);
  }
  
  /**
   * Generate a random ID for connection tracking
   */
  private generateRandomId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
  
  /**
   * Connect to the WebSocket server
   */
  private connect(): void {
    try {
      // Use correct protocol based on page protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`%c[WebSocket] Connecting to ${wsUrl}`, 'color: #2196F3');
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('%c[WebSocket] Connection error:', 'color: #F44336', error);
    }
  }
  
  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log('%c[WebSocket] Connection established', 'color: #4CAF50');
    this.reconnectAttempts = 0;
  }
  
  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('[WebSocket] Received message:', data);
      
      if (data.type === 'pong') {
        return; // Ignore pong responses
      }
      
      // Notify all handlers for this message type
      const handlers = this.messageHandlers.get(data.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data.payload);
          } catch (error) {
            console.error(`%c[WebSocket] Error in handler for ${data.type}:`, 'color: #F44336', error);
          }
        });
      }
    } catch (error) {
      console.error('%c[WebSocket] Error processing message:', 'color: #F44336', error);
    }
  }
  
  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log(`%c[WebSocket] Connection closed: ${event.code} - ${event.reason}`, 'color: #FF9800');
    
    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000 && event.code !== 1001) {
      this.attemptReconnect();
    }
  }
  
  /**
   * Handle WebSocket error event
   */
  private handleError(error: Event): void {
    console.error('%c[WebSocket] Error:', 'color: #F44336', {
      error,
      connectionId: this.connectionId,
      timestamp: new Date().toISOString()
    });
    
    // The socket will automatically try to reconnect after an error
  }
  
  /**
   * Attempt to reconnect to the WebSocket server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('%c[WebSocket] Max reconnection attempts reached', 'color: #F44336');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`%c[WebSocket] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`, 'color: #FF9800');
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  /**
   * Send a ping to keep the connection alive
   */
  private ping(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'ping' }));
    }
  }
  
  /**
   * Send a message to the server
   */
  send(type: string, payload: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('%c[WebSocket] Cannot send message, socket not connected', 'color: #F44336');
      return false;
    }
    
    try {
      const message = JSON.stringify({ type, payload });
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('%c[WebSocket] Error sending message:', 'color: #F44336', error);
      return false;
    }
  }
  
  /**
   * Subscribe to a message type
   */
  subscribe(type: string, handler: (data: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    
    this.messageHandlers.get(type)?.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }
  
  /**
   * Close the WebSocket connection
   */
  close(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

/**
 * Get or create the WebSocket service
 */
export function getWebSocketService(): WebSocketService {
  if (!webSocketService) {
    webSocketService = new WebSocketService();
  }
  
  return webSocketService;
}

export default getWebSocketService;