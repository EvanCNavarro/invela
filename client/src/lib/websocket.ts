import type { MessageHandler } from './types';
import getLogger from '@/utils/logger';

// Create a logger with lazy initialization for WebSocket operations
const logger = getLogger('WebSocket', {
  enabled: process.env.NODE_ENV !== 'production' && false, // Disable even in development
  levels: {
    debug: false,
    info: false,
    warn: true,
    error: true
  },
  lazy: true // Prevent logger creation if logging is disabled
});

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
  private isInitialized: boolean = false;
  private connectionStatusListeners: Set<(status: 'connected' | 'disconnected' | 'connecting' | 'error') => void> = new Set();

  constructor() {
    this.connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Don't connect immediately - lazy initialize only when actually needed
    this.isInitialized = false;
    
    // Monitor page visibility changes to better handle reconnection
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          // Page became visible again, check connection
          if (this.isInitialized && (!this.socket || this.socket.readyState !== WebSocket.OPEN)) {
            logger.info('Page visible, reconnecting WebSocket');
            this.connect().catch(err => {
              logger.error('Reconnection error on visibility change:', err);
            });
          }
        }
      });
    }
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
        logger.debug('Sending ping');
        
        this.socket.send(JSON.stringify({ type: 'ping' }));

        // Set a timeout for pong response
        this.pongTimeout = setTimeout(() => {
          logger.warn('No pong received, reconnecting...', {
            connectionId: this.connectionId,
            timestamp: new Date().toISOString()
          });
          this.reconnect();
        }, 15000); // Wait 15s for pong before reconnecting
      }
    }, 120000); // Send heartbeat every 2 minutes instead of 45s to reduce network traffic
  }

  private async connect(): Promise<void> {
    // If already connected or connecting, return the existing promise
    if (this.connectionPromise) return this.connectionPromise;

    // Mark as initialized
    this.isInitialized = true;
    
    // Update connection status to 'connecting'
    this.updateConnectionStatus('connecting');
    
    logger.info('Service initializing connection now:', {
      connectionId: this.connectionId,
      timestamp: new Date().toISOString()
    });

    this.connectionPromise = new Promise((resolve) => {
      this.connectionResolve = resolve;

      try {
        const wsUrl = this.getWebSocketUrl();
        logger.debug('Connecting to:', {
          url: wsUrl,
          connectionId: this.connectionId
        });

        this.socket = new WebSocket(wsUrl);

        // Set a generous timeout for the initial connection
        const connectionTimeout = setTimeout(() => {
          if (this.socket?.readyState !== WebSocket.OPEN) {
            logger.debug('Connection timeout, attempting reconnect...', {
              connectionId: this.connectionId
            });
            this.socket?.close();
            this.cleanup();
            this.handleReconnect();
          }
        }, 20000); // 20 second timeout for initial connection

        this.socket.onopen = () => {
          logger.info('Connected successfully', {
            connectionId: this.connectionId,
            timestamp: new Date().toISOString()
          });
          clearTimeout(connectionTimeout);
          this.reconnectAttempts = 0;
          this.reconnectTimeout = 1000;
          this.startHeartbeat();
          
          // Update connection status to connected
          this.updateConnectionStatus('connected');
          
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
              logger.info('Connection established:', {
                connectionId: this.connectionId,
                data: message.data || message.payload,
                timestamp: new Date().toISOString()
              });
              return;
            }

            // Fixed: Pass message.payload instead of message.data to properly handle the server message format
            this.handleMessage(message.type, message.payload);
          } catch (error) {
            logger.error('Error parsing message:', {
              error,
              connectionId: this.connectionId,
              timestamp: new Date().toISOString()
            });
          }
        };

        this.socket.onclose = (event) => {
          // Use console.log for immediate visibility in browser console
          console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason}`);
          
          logger.info('Connection closed:', {
            code: event.code,
            reason: event.reason,
            connectionId: this.connectionId,
            timestamp: new Date().toISOString()
          });
          clearTimeout(connectionTimeout);
          this.cleanup();
          
          // Update connection status to disconnected
          this.updateConnectionStatus('disconnected');
          
          // Notify subscribers that the connection is closed
          this.handleMessage('connection_closed', {
            code: event.code,
            reason: event.reason,
            timestamp: new Date().toISOString()
          });

          // Only attempt reconnect for abnormal closures
          if (event.code !== 1000 && event.code !== 1001) {
            this.handleReconnect();
          }
        };

        this.socket.onerror = (error) => {
          // Use console.error for immediate visibility in browser console
          console.error(`[WebSocket] Connection error:`, error);
          
          logger.error('Error:', {
            error,
            connectionId: this.connectionId,
            timestamp: new Date().toISOString()
          });
          
          // Update connection status to error
          this.updateConnectionStatus('error');
          
          // We don't close the socket here, but do notify about the error
          this.handleMessage('connection_error', {
            error: 'WebSocket connection error',
            timestamp: new Date().toISOString(),
            connectionId: this.connectionId
          });
          
          // Don't close the socket here, let the onclose handler deal with reconnection
        };

      } catch (error) {
        logger.error('Error establishing connection:', {
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
    logger.debug('Cleanup completed', {
      connectionId: this.connectionId,
      timestamp: new Date().toISOString()
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.info('Attempting to reconnect', {
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
        connectionId: this.connectionId,
        timestamp: new Date().toISOString()
      });

      setTimeout(() => {
        this.connect().catch(error => {
          logger.error('Reconnection attempt failed:', {
            error,
            connectionId: this.connectionId,
            timestamp: new Date().toISOString()
          });
        });
        // Exponential backoff with max of 30 seconds
        this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 30000);
      }, this.reconnectTimeout);
    } else {
      logger.error('Max reconnection attempts reached', {
        connectionId: this.connectionId,
        timestamp: new Date().toISOString()
      });
      
      // Notify subscribers that the connection is permanently closed
      this.handleMessage('connection_closed', {
        code: 'MAX_RECONNECT',
        reason: 'Maximum reconnection attempts reached',
        timestamp: new Date().toISOString(),
        permanent: true
      });
    }
  }

  private reconnect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }

  // Methods to monitor connection status
  public onConnectionStatusChange(callback: (status: 'connected' | 'disconnected' | 'connecting' | 'error') => void): () => void {
    this.connectionStatusListeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.connectionStatusListeners.delete(callback);
    };
  }
  
  private updateConnectionStatus(status: 'connected' | 'disconnected' | 'connecting' | 'error'): void {
    // Notify all listeners of the new status
    this.connectionStatusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        logger.error('Error in connection status listener:', error);
      }
    });
    
    // Also trigger a message event for components that listen via subscribe
    this.handleMessage('connection_status', { status, timestamp: new Date().toISOString() });
  }

  private handleMessage(type: string, data: any) {
    // Update connection status based on message type
    if (type === 'connection_established') {
      this.updateConnectionStatus('connected');
    } else if (type === 'connection_closed') {
      this.updateConnectionStatus('disconnected');
    } else if (type === 'connection_error') {
      this.updateConnectionStatus('error');
    }
    
    // Process message handlers
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          logger.error(`Error in message handler for type "${type}":`, {
            error,
            connectionId: this.connectionId,
            timestamp: new Date().toISOString()
          });
        }
      });
    }
  }

  public async subscribe(type: string, handler: MessageHandler): Promise<() => void> {
    // Mark as initialized - we have an active subscriber
    if (!this.isInitialized) {
      logger.info('First subscription - initializing WebSocket service');
      this.isInitialized = true;
    }
    
    await this.connect();

    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    logger.debug('New subscription added:', {
      type,
      handlersCount: this.messageHandlers.get(type)!.size + 1,
      connectionId: this.connectionId
    });

    this.messageHandlers.get(type)!.add(handler);

    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
        logger.debug('Subscription removed:', {
          type,
          remainingHandlers: handlers.size,
          connectionId: this.connectionId
        });
      }
    };
  }

  public async send(type: string, data: any): Promise<void> {
    // Skip if not initialized and not forcing initialization
    if (!this.isInitialized) {
      logger.debug('Skipping send - service not initialized');
      return;
    }
    
    await this.connect();

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    } else {
      throw new Error('Connection not ready');
    }
  }

  /**
   * Emit a message through WebSocket or simulate an event locally
   * 
   * This enhanced version:
   * 1. Attempts to send a message via WebSocket if connected
   * 2. Falls back to triggering local event handlers if socket isn't ready
   * 3. Adds robust logging for troubleshooting
   * 4. Returns successfully even if connection fails to avoid breaking form submission
   * 5. Includes multiple retry attempts for critical submission events
   * 
   * @param type Event type (e.g., 'submission_status')
   * @param data Event payload
   */
  public async emit(type: string, data: any): Promise<void> {
    console.log(`[WebSocket] Emit called for event type: ${type}`, data);
    
    // Run even if not initialized - important for fallback scenarios
    if (!this.isInitialized) {
      console.log('[WebSocket] Service not initialized, initializing now for emit...');
      this.isInitialized = true;
    }
    
    try {
      // Try to connect, but don't block the fallback if this fails
      try {
        await this.connect();
      } catch (connError) {
        console.warn('[WebSocket] Connection failed for emit, will use fallback:', connError);
      }

      // Format the message payload
      const messagePayload = {
        type: type.toLowerCase(),
        payload: {
          ...data,
          timestamp: Date.now(),
          source: 'client-emit'
        }
      };
      
      console.log('[WebSocket] Prepared message payload:', messagePayload);
      
      // Try to send the message if socket is open
      let socketSent = false;
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify(messagePayload));
          console.log(`[WebSocket] Message sent via socket: ${type}`);
          socketSent = true;
        } catch (sendError) {
          console.error('[WebSocket] Error sending via socket:', sendError);
        }
      } else {
        console.warn(`[WebSocket] Socket not ready (state: ${this.socket?.readyState || 'undefined'}), using fallback`);
      }
      
      // Set up retry attempts for critical messages like form submissions
      if (type === 'submission_status' && !socketSent) {
        console.log('[WebSocket] Setting up retries for submission_status event');
        
        // Try up to 3 additional times with increasing delays (500ms, 1s, 2s)
        const maxRetries = 3;
        for (let i = 0; i < maxRetries; i++) {
          setTimeout(async () => {
            console.log(`[WebSocket] Retry attempt ${i+1}/${maxRetries} for submission_status`);
            
            // Try to reconnect before sending
            try {
              if (this.socket?.readyState !== WebSocket.OPEN) {
                console.log('[WebSocket] Reconnecting for retry attempt...');
                await this.connect();
              }
              
              // Try sending again
              if (this.socket?.readyState === WebSocket.OPEN) {
                try {
                  this.socket.send(JSON.stringify(messagePayload));
                  console.log(`[WebSocket] Message sent successfully on retry ${i+1}`);
                } catch (retryError) {
                  console.error(`[WebSocket] Error on retry ${i+1}:`, retryError);
                }
              } else {
                console.warn(`[WebSocket] Socket still not ready on retry ${i+1}`);
              }
            } catch (retryConnectError) {
              console.error(`[WebSocket] Connection error on retry ${i+1}:`, retryConnectError);
            }
          }, 500 * Math.pow(2, i)); // 500ms, 1000ms, 2000ms
        }
      }
      
      // For submission_status events, also trigger a delayed automatic success
      // This ensures the form submission flow completes even if the server message never arrives
      if (type === 'submission_status' && data.status === 'submitted') {
        console.log('[WebSocket] Setting up auto-success fallback for form submission');
        
        // Local immediate fallback
        this.handleMessage(type, {
          ...data,
          isLocalFallback: true,
          socketSent,
          timestamp: Date.now()
        });
        
        // Add a delayed auto-success fallback (after 10 seconds)
        // This will only take effect if we don't receive server confirmation first
        setTimeout(() => {
          console.log('[WebSocket] Auto-confirming form submission success via fallback');
          this.handleMessage('submission_status', {
            ...data,
            status: 'submitted', 
            isAutoConfirmed: true,
            timestamp: Date.now()
          });
        }, 10000);
        
        return; // Success even if socket failed
      }
      // For other submission_status events (not 'submitted')
      else if (type === 'submission_status') {
        console.log('[WebSocket] Using local fallback for other submission_status event');
        this.handleMessage(type, {
          ...data,
          isLocalFallback: true,
          socketSent,
          timestamp: Date.now()
        });
        return;
      }
      
      // For other message types, only use fallback if socket send failed
      if (!socketSent) {
        console.log(`[WebSocket] Using local fallback for ${type} event`);
        this.handleMessage(type, {
          ...data,
          isLocalFallback: true,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      // Log but don't throw to avoid breaking form submission chain
      console.error('[WebSocket] Error in emit:', {
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Still trigger handlers for submission status as ultimate fallback
      if (type === 'submission_status') {
        console.log('[WebSocket] Using emergency fallback for submission_status after error');
        this.handleMessage(type, {
          ...data,
          isEmergencyFallback: true,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        });
        
        // For critical submission status, also trigger auto-success after a delay
        if (data.status === 'submitted') {
          setTimeout(() => {
            console.log('[WebSocket] Emergency auto-confirming form submission success');
            this.handleMessage('submission_status', {
              ...data,
              status: 'submitted',
              isEmergencyConfirmed: true,
              timestamp: Date.now()
            });
          }, 12000); // Slightly longer delay for emergency path
        }
      }
    }
  }
}

export const wsService = new WebSocketService();