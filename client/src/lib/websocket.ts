type MessageHandler = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers = new Map<string, Set<MessageHandler>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000;
  private connectionPromise: Promise<void> | null = null;
  private connectionResolve: (() => void) | null = null;

  constructor() {
    this.connect();
  }

  private getWebSocketUrl(): string {
    // Get the full hostname from the current window location
    const fullUrl = new URL(window.location.href);
    const protocol = fullUrl.protocol === 'https:' ? 'wss:' : 'ws:';

    // Construct WebSocket URL using the full hostname and path
    const wsUrl = `${protocol}//${fullUrl.host}/ws`;
    console.log('Constructing WebSocket URL:', wsUrl);
    return wsUrl;
  }

  private async connect(): Promise<void> {
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise((resolve) => {
      this.connectionResolve = resolve;

      try {
        const wsUrl = this.getWebSocketUrl();
        console.log('WebSocket connecting to:', wsUrl);

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.reconnectTimeout = 1000;
          if (this.connectionResolve) {
            this.connectionResolve();
            this.connectionResolve = null;
          }
        };

        this.socket.onmessage = (event) => {
          try {
            const { type, data } = JSON.parse(event.data);
            console.log('Received WebSocket message:', { type, data });
            this.handleMessage(type, data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onclose = (event) => {
          console.log('WebSocket connection closed', event.code, event.reason);
          this.handleReconnect();
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.socket) {
            this.socket.close();
          }
        };
      } catch (error) {
        console.error('Error establishing WebSocket connection:', error);
        this.handleReconnect();
      }
    });

    return this.connectionPromise;
  }

  private handleReconnect() {
    this.socket = null;
    this.connectionPromise = null;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection attempt failed:', error);
        });
        this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 30000);
      }, this.reconnectTimeout);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private handleMessage(type: string, data: any) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in message handler for type "${type}":`, error);
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
      throw new Error('WebSocket is not connected');
    }
  }
}

export const wsService = new WebSocketService();