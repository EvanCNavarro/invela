type MessageHandler = (data: any) => void;

const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30000;
const MAX_RETRIES = 5;
const CONNECTION_TIMEOUT = 10000;
const HEARTBEAT_INTERVAL = 30000;

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers = new Map<string, Set<MessageHandler>>();
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;
  private connectionResolve: (() => void) | null = null;

  constructor() {
    this.connect();
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  private clearTimers() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

          // Set timeout for pong response
          this.pongTimeout = setTimeout(() => {
            console.log('[WebSocket] No pong received, reconnecting...');
            this.reconnect();
          }, 10000);
        } catch (error) {
          console.error('[WebSocket] Error sending heartbeat:', error);
          this.reconnect();
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  private async connect(): Promise<void> {
    if (this.isConnecting || this.connectionPromise) {
      return this.connectionPromise!;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve) => {
      this.connectionResolve = resolve;

      try {
        const wsUrl = this.getWebSocketUrl();
        console.log('[WebSocket] Connecting to:', wsUrl);

        this.socket = new WebSocket(wsUrl);

        // Set connection timeout
        this.connectionTimeout = setTimeout(() => {
          if (this.socket?.readyState !== WebSocket.OPEN) {
            console.log('[WebSocket] Connection timeout, attempting reconnect...');
            this.socket?.close();
            this.cleanup();
            this.handleReconnect();
          }
        }, CONNECTION_TIMEOUT);

        this.socket.onopen = () => {
          console.log('[WebSocket] Connected successfully');
          if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.isConnecting = false;
          if (this.connectionResolve) {
            this.connectionResolve();
            this.connectionResolve = null;
          }
          this.connectionPromise = null;
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'pong') {
              if (this.pongTimeout) {
                clearTimeout(this.pongTimeout);
                this.pongTimeout = null;
              }
              return;
            }

            if (message.type === 'connection_established') {
              console.log('[WebSocket] Connection established:', message.data);
              return;
            }

            this.handleMessage(message.type, message.data);
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
    this.clearTimers();
    this.socket = null;
    this.isConnecting = false;
    this.connectionPromise = null;
    this.connectionResolve = null;
  }

  private getRetryDelay(): number {
    // Exponential backoff with jitter
    const baseDelay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, this.reconnectAttempts),
      MAX_RETRY_DELAY
    );
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return baseDelay + jitter;
  }

  private handleReconnect() {
    if (this.reconnectAttempts < MAX_RETRIES) {
      this.reconnectAttempts++;
      console.log(`[WebSocket] Attempting to reconnect (${this.reconnectAttempts}/${MAX_RETRIES})...`);

      const delay = this.getRetryDelay();
      this.reconnectTimeout = setTimeout(() => {
        this.connect().catch(error => {
          console.error('[WebSocket] Reconnection attempt failed:', error);
        });
      }, delay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
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

  public reconnect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
}

export const wsService = new WebSocketService();