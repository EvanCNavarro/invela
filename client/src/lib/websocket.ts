type MessageHandler = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers = new Map<string, Set<MessageHandler>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000;
  private connectionPromise: Promise<void> | null = null;
  private connectionResolve: (() => void) | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.connect();
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));

        // Set a timeout for pong response
        this.pongTimeout = setTimeout(() => {
          console.log('[WebSocket] No pong received, reconnecting...');
          this.reconnect();
        }, 10000); // Wait 10s for pong before reconnecting
      }
    }, 45000); // Send heartbeat every 45s
  }

  private async connect(): Promise<void> {
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise((resolve) => {
      this.connectionResolve = resolve;

      try {
        const wsUrl = this.getWebSocketUrl();
        console.log('[WebSocket] Connecting to:', wsUrl);

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('[WebSocket] Connected successfully');
          this.reconnectAttempts = 0;
          this.reconnectTimeout = 1000;
          this.startHeartbeat();
          if (this.connectionResolve) {
            this.connectionResolve();
            this.connectionResolve = null;
          }
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            // Handle pong responses
            if (message.type === 'pong') {
              if (this.pongTimeout) {
                clearTimeout(this.pongTimeout);
              }
              return;
            }

            const { type, data } = message;
            this.handleMessage(type, data);
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log('[WebSocket] Connection closed:', event.code, event.reason);
          this.cleanup();
          this.handleReconnect();
        };

        this.socket.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          // Don't close the socket here, let the onclose handler deal with reconnection
        };
      } catch (error) {
        console.error('[WebSocket] Error establishing connection:', error);
        this.cleanup();
        this.handleReconnect();
      }
    });

    return this.connectionPromise;
  }

  private cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    this.socket = null;
    this.connectionPromise = null;
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[WebSocket] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connect().catch(error => {
          console.error('[WebSocket] Reconnection attempt failed:', error);
        });
        // Exponential backoff with max of 30 seconds
        this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 30000);
      }, this.reconnectTimeout);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
  }

  private reconnect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }

  private handleMessage(type: string, data: any) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[WebSocket] Error in message handler for type "${type}":`, error);
        }
      });
    }
  }

  public async subscribe(type: string, handler: MessageHandler): Promise<() => void> {
    await this.connect();

    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  public async send(type: string, data: any): Promise<void> {
    await this.connect();

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    } else {
      throw new Error('[WebSocket] Connection not ready');
    }
  }
}

export const wsService = new WebSocketService();