import type { MessageHandler } from './types';

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
  private connectionId: string = '';

  constructor() {
    this.connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[WebSocket] Service initialized:', {
      connectionId: this.connectionId,
      timestamp: new Date().toISOString()
    });
    this.connect();
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
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
        // Only log at debug level to reduce console noise
        if (process.env.NODE_ENV === 'development') {
          console.debug('[WebSocket] Sending ping');
        }
        
        this.socket.send(JSON.stringify({ type: 'ping' }));

        // Set a timeout for pong response
        this.pongTimeout = setTimeout(() => {
          console.log('[WebSocket] No pong received, reconnecting...', {
            connectionId: this.connectionId,
            timestamp: new Date().toISOString()
          });
          this.reconnect();
        }, 15000); // Wait 15s for pong before reconnecting
      }
    }, 120000); // Send heartbeat every 2 minutes instead of 45s to reduce network traffic
  }

  private async connect(): Promise<void> {
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise((resolve) => {
      this.connectionResolve = resolve;

      try {
        const wsUrl = this.getWebSocketUrl();
        console.log('[WebSocket] Connecting to:', {
          url: wsUrl,
          connectionId: this.connectionId,
          timestamp: new Date().toISOString()
        });

        this.socket = new WebSocket(wsUrl);

        // Set a generous timeout for the initial connection
        const connectionTimeout = setTimeout(() => {
          if (this.socket?.readyState !== WebSocket.OPEN) {
            console.log('[WebSocket] Connection timeout, attempting reconnect...', {
              connectionId: this.connectionId,
              timestamp: new Date().toISOString()
            });
            this.socket?.close();
            this.cleanup();
            this.handleReconnect();
          }
        }, 20000); // 20 second timeout for initial connection

        this.socket.onopen = () => {
          console.log('[WebSocket] Connected successfully', {
            connectionId: this.connectionId,
            timestamp: new Date().toISOString()
          });
          clearTimeout(connectionTimeout);
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

            if (message.type === 'connection_established') {
              console.log('[WebSocket] Connection established:', {
                connectionId: this.connectionId,
                data: message.data,
                timestamp: new Date().toISOString()
              });
              return;
            }

            this.handleMessage(message.type, message.data);
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', {
              error,
              connectionId: this.connectionId,
              timestamp: new Date().toISOString()
            });
          }
        };

        this.socket.onclose = (event) => {
          console.log('[WebSocket] Connection closed:', {
            code: event.code,
            reason: event.reason,
            connectionId: this.connectionId,
            timestamp: new Date().toISOString()
          });
          clearTimeout(connectionTimeout);
          this.cleanup();

          // Only attempt reconnect for abnormal closures
          if (event.code !== 1000 && event.code !== 1001) {
            this.handleReconnect();
          }
        };

        this.socket.onerror = (error) => {
          console.error('[WebSocket] Error:', {
            error,
            connectionId: this.connectionId,
            timestamp: new Date().toISOString()
          });
          // Don't close the socket here, let the onclose handler deal with reconnection
        };

      } catch (error) {
        console.error('[WebSocket] Error establishing connection:', {
          error,
          connectionId: this.connectionId,
          timestamp: new Date().toISOString()
        });
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
    console.log('[WebSocket] Cleanup completed', {
      connectionId: this.connectionId,
      timestamp: new Date().toISOString()
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[WebSocket] Attempting to reconnect`, {
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
        connectionId: this.connectionId,
        timestamp: new Date().toISOString()
      });

      setTimeout(() => {
        this.connect().catch(error => {
          console.error('[WebSocket] Reconnection attempt failed:', {
            error,
            connectionId: this.connectionId,
            timestamp: new Date().toISOString()
          });
        });
        // Exponential backoff with max of 30 seconds
        this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 30000);
      }, this.reconnectTimeout);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached', {
        connectionId: this.connectionId,
        timestamp: new Date().toISOString()
      });
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
          console.error(`[WebSocket] Error in message handler for type "${type}":`, {
            error,
            connectionId: this.connectionId,
            timestamp: new Date().toISOString()
          });
        }
      });
    }
  }

  public async subscribe(type: string, handler: MessageHandler): Promise<() => void> {
    await this.connect();

    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    console.log('[WebSocket] New subscription added:', {
      type,
      handlersCount: this.messageHandlers.get(type)!.size + 1,
      connectionId: this.connectionId,
      timestamp: new Date().toISOString()
    });

    this.messageHandlers.get(type)!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
        console.log('[WebSocket] Subscription removed:', {
          type,
          remainingHandlers: handlers.size,
          connectionId: this.connectionId,
          timestamp: new Date().toISOString()
        });
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

  public async emit(type: string, data: any): Promise<void> {
    try {
      await this.connect();

      console.log('[WebSocket] Emitting message:', {
        type,
        data,
        connectionId: this.connectionId,
        timestamp: new Date().toISOString()
      });

      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: type.toLowerCase(),
          payload: data
        }));
      } else {
        throw new Error('WebSocket connection not ready');
      }
    } catch (error) {
      console.error('[WebSocket] Error emitting message:', {
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
        connectionId: this.connectionId,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}

export const wsService = new WebSocketService();