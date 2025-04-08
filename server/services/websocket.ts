import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';

// Define the WebSocket service
export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: Server) {
    // Initialize WebSocket Server on a specific path to avoid conflict with Vite HMR
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      // Don't use verifyClient as it's causing issues
      // Simply handle the connection event and check protocol there
    });

    console.log('[WebSocket] Server initialized on path: /ws');
    
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket client connected');
      
      // Add the client to our set
      this.clients.add(ws);

      // Send initial connection message with timestamp
      ws.send(JSON.stringify({
        type: 'connection_established',
        timestamp: new Date().toISOString()
      }));

      // Set up ping to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }, 30000);

      // Handle messages from clients
      ws.on('message', (message: string) => {
        try {
          const parsedMessage = JSON.parse(message.toString());
          console.log(`[WebSocket] Received message: ${message}`);
          
          // Process message based on type
          if (parsedMessage.type === 'ping') {
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
          } else if (parsedMessage.type === 'chat_message') {
            // Broadcast chat messages to all other clients
            this.clients.forEach(client => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(parsedMessage));
              }
            });
            console.log(`[WebSocket] Broadcasting chat message: ${parsedMessage.text}`);
          }
          
          // You can handle other message types here
        } catch (error) {
          console.error('[WebSocket] Error processing message:', error);
        }
      });

      // Handle pong responses from clients
      ws.on('pong', () => {
        console.log('[WebSocket] Received pong');
      });

      // Handle client disconnection
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
        clearInterval(pingInterval);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('[WebSocket] Client error:', error);
        this.clients.delete(ws);
        clearInterval(pingInterval);
      });
    });
  }

  // Method to broadcast a message to all connected clients
  public broadcast(message: any) {
    const messageString = typeof message === 'string' 
      ? message 
      : JSON.stringify(message);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageString);
      }
    });
  }

  // Method to send a message to a specific client
  public sendToClient(client: WebSocket, message: any) {
    if (client.readyState === WebSocket.OPEN) {
      const messageString = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);
      
      client.send(messageString);
    }
  }

  // Get the number of connected clients
  public getClientCount(): number {
    return this.clients.size;
  }
}

// Create a singleton instance
let websocketService: WebSocketService | null = null;

// Initialize the WebSocket service with the HTTP server
export function initWebSocketService(server: Server): WebSocketService {
  if (!websocketService) {
    websocketService = new WebSocketService(server);
  }
  return websocketService;
}

// Get the WebSocket service instance
export function getWebSocketService(): WebSocketService | null {
  return websocketService;
}

// Function to broadcast task updates to all connected clients
export function broadcastTaskUpdate(taskData: any) {
  const service = getWebSocketService();
  if (service) {
    service.broadcast({
      type: 'task_update',
      data: taskData,
      timestamp: new Date().toISOString()
    });
  }
}

// Function to broadcast document count updates to all connected clients
export function broadcastDocumentCountUpdate(counts: any) {
  const service = getWebSocketService();
  if (service) {
    service.broadcast({
      type: 'document_count_update',
      data: counts,
      timestamp: new Date().toISOString()
    });
  }
}

// Function to broadcast generic messages to all connected clients
export function broadcastMessage(type: string, data: any) {
  const service = getWebSocketService();
  if (service) {
    service.broadcast({
      type,
      data,
      timestamp: new Date().toISOString()
    });
  }
}