/**
 * WebSocket Service
 * 
 * This service manages WebSocket connections for real-time communications.
 * It follows the JavaScript WebSocket development guidelines by:
 * 1. Using the correct WebSocket protocol (ws:// or wss://)
 * 2. Connecting to the correct path (/ws)
 * 3. Using WebSocket.OPEN constant when checking connection state
 * 4. Implementing reconnection logic if connection is lost
 */

import { toast } from "@/hooks/use-toast";

interface WebSocketOptions {
  debug?: boolean;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

// Default options
const defaultOptions: WebSocketOptions = {
  debug: false,
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
};

export class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private options: WebSocketOptions;
  private connectionId: string;
  private eventHandlers: Map<string, Array<(data: any) => void>> = new Map();

  constructor(options: WebSocketOptions = {}) {
    this.options = { ...defaultOptions, ...options };
    this.connectionId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    this.log("WebSocket service created");
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.socket) {
      this.log("WebSocket already connected or connecting");
      return;
    }

    try {
      // Determine the correct protocol based on the current page protocol
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.log(`Connecting to WebSocket: ${wsUrl}`);
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      
      this.log("Connection attempt initiated");
    } catch (error) {
      this.error("Error creating WebSocket connection", error);
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (!this.socket) {
      return;
    }

    try {
      this.socket.close();
      this.socket = null;
      this.log("Disconnected from WebSocket server");
    } catch (error) {
      this.error("Error disconnecting from WebSocket server", error);
    }
  }

  /**
   * Send a message to the WebSocket server
   * 
   * @param type Message type
   * @param data Message data
   * @returns True if message was sent, false otherwise
   */
  public send(type: string, data: any = {}): boolean {
    if (!this.isConnected()) {
      this.warn("Cannot send message: WebSocket not connected");
      return false;
    }

    try {
      const message = {
        type,
        ...data,
        timestamp: new Date().toISOString(),
        connectionId: this.connectionId
      };

      this.socket!.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.error("Error sending message", error);
      return false;
    }
  }

  /**
   * Register an event handler
   * 
   * @param event Event name
   * @param handler Event handler function
   */
  public on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }

    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Unregister an event handler
   * 
   * @param event Event name
   * @param handler Event handler function
   */
  public off(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      return;
    }

    const handlers = this.eventHandlers.get(event)!;
    const index = handlers.indexOf(handler);

    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }

  /**
   * Send a ping message to keep the connection alive
   */
  public ping(): void {
    this.send("ping");
  }

  /**
   * Check if connected to the WebSocket server
   */
  public isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Get the current connection state
   */
  public getState(): number {
    return this.socket ? this.socket.readyState : -1;
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(event: Event): void {
    this.log("Connection established");
    this.reconnectAttempts = 0;
    this.triggerEvent("open", event);
    
    // Authenticate if needed
    if (this.hasAuthenticationData()) {
      this.authenticate();
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    this.log(`Connection closed: ${event.code} ${event.reason}`);
    this.triggerEvent("close", event);
    this.socket = null;

    if (this.options.autoReconnect) {
      this.attemptReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    this.error("Connection error:", event);
    this.triggerEvent("error", event);
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      this.log("Received message:", message);
      
      // Trigger event handlers for this message type
      this.triggerEvent(message.type, message);
      
      // Also trigger general 'message' event handlers
      this.triggerEvent("message", message);
    } catch (error) {
      this.error("Error parsing message", error);
    }
  }

  /**
   * Attempt to reconnect to the WebSocket server
   */
  private attemptReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.options.maxReconnectAttempts && 
        this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.warn(`Maximum reconnect attempts (${this.options.maxReconnectAttempts}) reached`);
      this.triggerEvent("maxReconnectAttemptsReached", {
        attempts: this.reconnectAttempts
      });
      return;
    }

    const delay = this.options.reconnectDelay! * Math.pow(1.5, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts || 'unlimited'})`);

    this.reconnectTimeout = setTimeout(() => {
      this.log(`Executing reconnection attempt ${this.reconnectAttempts}`);
      this.connect();
    }, delay);
  }

  /**
   * Trigger event handlers for an event
   */
  private triggerEvent(event: string, data: any): void {
    if (!this.eventHandlers.has(event)) {
      return;
    }

    for (const handler of this.eventHandlers.get(event)!) {
      try {
        handler(data);
      } catch (error) {
        this.error(`Error in "${event}" event handler`, error);
      }
    }
  }

  /**
   * Check if we have authentication data
   */
  private hasAuthenticationData(): boolean {
    // In a real app, this would check if we have a user session or token
    return true;
  }

  /**
   * Send authentication message
   */
  private authenticate(): void {
    // Get user data from your auth service, local storage, etc.
    const userId = 331; // Example user ID
    const companyId = 288; // Example company ID

    this.send("authenticate", {
      userId,
      companyId,
      clientId: this.connectionId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log message if debug is enabled
   */
  private log(message: string, data?: any): void {
    if (!this.options.debug) {
      return;
    }

    if (data) {
      console.log(`[WebSocket] ${message}`, data);
    } else {
      console.log(`[WebSocket] ${message}`);
    }
  }

  /**
   * Log warning message
   */
  private warn(message: string, data?: any): void {
    console.warn(`%c[WebSocket] ${message}`, "color: #FF9800", data || "");
  }

  /**
   * Log error message
   */
  private error(message: string, error?: any): void {
    console.error(`[WebSocket] ${message}:`, error || "");
  }
}

// Create a singleton instance
const websocketService = new WebSocketService({ debug: true });

// Export singleton
export default websocketService;