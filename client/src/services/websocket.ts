// WebSocket service for real-time communication
import { toast } from "@/hooks/use-toast";

type MessageHandler = (data: any) => void;
type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketService {
  connect: () => void;
  disconnect: () => void;
  isConnected: () => boolean;
  subscribe: (eventType: string, handler: MessageHandler) => void;
  unsubscribe: (eventType: string, handler: MessageHandler) => void;
  send: (message: any) => void;
  getStatus: () => WebSocketStatus;
}

// Singleton instance
let wsService: WebSocketService | null = null;

// Create and configure the WebSocket service
export const createWebSocketService = (): WebSocketService => {
  if (wsService) {
    return wsService;
  }

  let socket: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let status: WebSocketStatus = 'disconnected';
  
  // Track subscriptions by event type
  const subscriptions: Record<string, Set<MessageHandler>> = {};
  
  // Connection heartbeat management
  let pingInterval: ReturnType<typeof setInterval> | null = null;
  let lastPongTime = 0;
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000; // 2 seconds base delay

  // Connect to the WebSocket server
  const connect = () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      console.log('[WebSocket] Already connected or connecting');
      return;
    }

    try {
      // Clear any existing reconnect timers
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      
      status = 'connecting';

      // Create a new WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`[WebSocket] Connecting to ${wsUrl}`);
      socket = new WebSocket(wsUrl);

      // Set up event handlers
      socket.onopen = () => {
        console.log('[WebSocket] Connection established');
        status = 'connected';
        reconnectAttempts = 0;
        lastPongTime = Date.now();
        
        // Start the ping interval
        startHeartbeat();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', data);
          
          // Handle pings and pongs for connection heartbeat
          if (data.type === 'ping') {
            send({ type: 'pong' });
            return;
          }
          
          if (data.type === 'pong') {
            lastPongTime = Date.now();
            return;
          }
          
          // Handle regular message events
          const eventType = data.type;
          const handlers = subscriptions[eventType];
          
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(data);
              } catch (error) {
                console.error(`[WebSocket] Error in handler for event ${eventType}:`, error);
              }
            });
          }
          
          // Special handling for task updates
          if (eventType === 'task_update' || eventType === 'task_created' || eventType === 'task_deleted') {
            console.log(`[WebSocket] ${eventType}:`, data);
            // You can add specific logic for task notifications here
            if (eventType === 'task_created') {
              toast({
                title: "New Task Added",
                description: `A new task has been added: ${data.payload?.title || 'Unknown task'}`,
              });
            }
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        status = 'error';
      };

      socket.onclose = (event) => {
        console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason}`);
        status = 'disconnected';
        
        // Clean up the heartbeat interval
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
        
        // Attempt reconnection if not deliberately closed
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeout = setTimeout(() => {
            reconnectAttempts++;
            connect();
          }, delay);
        } else {
          console.warn('[WebSocket] Max reconnect attempts reached');
        }
      };
    } catch (error) {
      console.error('[WebSocket] Error creating connection:', error);
      status = 'error';
    }
  };

  // Start the heartbeat ping/pong mechanism
  const startHeartbeat = () => {
    if (pingInterval) {
      clearInterval(pingInterval);
    }
    
    pingInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          // Send a ping to keep the connection alive
          send({ type: 'ping' });
          
          // Check for stale connection (no pong for > 90 seconds)
          const timeSinceLastPong = Date.now() - lastPongTime;
          if (timeSinceLastPong > 90000) {
            console.warn('[WebSocket] Connection appears stale. Reconnecting...');
            disconnect();
            connect();
          }
        } catch (error) {
          console.error('[WebSocket] Error in heartbeat:', error);
        }
      }
    }, 30000); // 30 second ping interval
  };

  // Disconnect from the WebSocket server
  const disconnect = () => {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    if (socket) {
      try {
        socket.close(1000, 'Client disconnected deliberately');
        status = 'disconnected';
      } catch (error) {
        console.error('[WebSocket] Error closing connection:', error);
      }
      socket = null;
    }
  };

  // Check if connected
  const isConnected = () => {
    return socket !== null && socket.readyState === WebSocket.OPEN;
  };
  
  // Get current status
  const getStatus = () => {
    return status;
  };

  // Subscribe to a specific event type
  const subscribe = (eventType: string, handler: MessageHandler) => {
    if (!subscriptions[eventType]) {
      subscriptions[eventType] = new Set();
    }
    subscriptions[eventType].add(handler);
    
    console.log(`[WebSocket] New subscription added: ${eventType}, handlers count:`, 
      subscriptions[eventType].size);
  };

  // Unsubscribe from a specific event type
  const unsubscribe = (eventType: string, handler: MessageHandler) => {
    if (subscriptions[eventType]) {
      subscriptions[eventType].delete(handler);
      console.log(`[WebSocket] Subscription removed: ${eventType}, handlers count:`, 
        subscriptions[eventType].size);
    }
  };

  // Send a message to the server
  const send = (message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        const messageStr = typeof message === 'string' 
          ? message 
          : JSON.stringify(message);
        
        socket.send(messageStr);
      } catch (error) {
        console.error('[WebSocket] Error sending message:', error);
      }
    } else {
      console.warn('[WebSocket] Cannot send message - socket not open');
    }
  };

  wsService = {
    connect,
    disconnect,
    isConnected,
    subscribe,
    unsubscribe,
    send,
    getStatus
  };

  return wsService;
};

// Export the singleton WebSocket service
export const getWebSocketService = (): WebSocketService => {
  if (!wsService) {
    return createWebSocketService();
  }
  return wsService;
};

// React hook for WebSocket events
export const useWebSocket = () => {
  return getWebSocketService();
};