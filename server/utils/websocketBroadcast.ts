/**
 * WebSocket Broadcast Utility
 * 
 * This module provides robust utilities for broadcasting messages to WebSocket clients
 * with proper error handling and logging.
 */

import { WebSocket, WebSocketServer } from 'ws';

// Configure logging
function logInfo(message: string, ...args: any[]): void {
  console.log(`[WebSocket] ${message}`, ...args);
}

function logError(message: string, ...args: any[]): void {
  console.error(`[WebSocket] ${message}`, ...args);
}

/**
 * Broadcast a message to all connected WebSocket clients
 * with proper error handling and payload formatting
 * 
 * @param wss WebSocket server instance
 * @param type Message type/event name (e.g., 'task_update', 'form_submitted')
 * @param payload Message payload/data to send (will be automatically wrapped)
 * @param options Optional configuration for the broadcast
 */
export function broadcastMessage(
  wss: WebSocketServer, 
  type: string, 
  payload: any,
  options: { skipLogging?: boolean; messageId?: string } = {}
): void {
  if (!wss) {
    logError('Cannot broadcast: WebSocket server is not initialized');
    return;
  }
  
  // Check if there are any clients before attempting to broadcast
  const hasClients = Array.from(wss.clients).some(client => client.readyState === WebSocket.OPEN);
  
  if (!hasClients) {
    // Only log if not skipping logging
    if (!options.skipLogging) {
      logInfo(`No active WebSocket clients, skipping broadcast`, { messageType: type });
    }
    return;
  }
  
  // Generate a unique message ID for tracking/debugging if not provided
  const messageId = options.messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create a message format that works with all client implementations
  const timestamp = new Date().toISOString();
  const message = JSON.stringify({
    type,
    payload,  // Include the payload directly
    data: payload, // Also include as data for clients expecting that format
    timestamp,
    messageId // Include message ID for tracking
  });
  
  let clientCount = 0;
  let errorCount = 0;
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        clientCount++;
      } catch (error) {
        errorCount++;
        logError('Error sending message to client:', error);
      }
    }
  });
  
  // Only log if not skipping logging (useful for high-frequency events like heartbeats)
  if (!options.skipLogging) {
    logInfo(`Broadcast ${type} to ${clientCount} clients (${errorCount} errors)`, { messageId });
  }
}

/**
 * Check if any clients are currently connected to the WebSocket server
 */
export function hasConnectedClients(wss: WebSocketServer): boolean {
  if (!wss) return false;
  
  let connectedCount = 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      connectedCount++;
    }
  });
  
  return connectedCount > 0;
}

/**
 * Set up event handlers for the WebSocket server
 * Simple and reliable implementation with heartbeat and basic error handling
 */
export function setupWebSocketServerHandlers(wss: WebSocketServer): void {
  if (!wss) {
    logError('Cannot set up handlers: WebSocket server is not initialized');
    return;
  }
  
  // Set up server-side ping interval to detect dead connections
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      // @ts-ignore - we're adding isAlive property
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      
      // @ts-ignore - mark as not alive until we get a response
      ws.isAlive = false;
      
      // Send ping
      try {
        ws.send(JSON.stringify({ type: 'server_ping', timestamp: new Date().toISOString() }));
      } catch (e) {
        // Ignore errors on potentially dead connections
      }
    });
  }, 40000); // 40 second interval
  
  // Handle new connections
  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    logInfo(`New client connected from ${clientIp}`);
    
    // Mark as alive initially
    // @ts-ignore - adding isAlive property
    ws.isAlive = true;
    
    // Handle messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Mark as alive for any message
        // @ts-ignore - using isAlive property
        ws.isAlive = true;
        
        // Don't log ping messages to reduce noise
        if (message.type !== 'ping') {
          logInfo(`Received message of type: ${message.type}`);
        }
        
        // Handle ping messages
        if (message.type === 'ping') {
          try {
            const pongTimestamp = new Date().toISOString();
            const pongPayload = {
              timestamp: pongTimestamp,
              echo: message.timestamp
            };
            
            ws.send(JSON.stringify({
              type: 'pong',
              payload: pongPayload,
              data: pongPayload, // Include data field for client compatibility
              timestamp: pongTimestamp
            }));
          } catch (e) {
            // Ignore errors
          }
        }
        
        // Handle requests for missed events
        if (message.type === 'request_missed_events') {
          try {
            // Extract task information
            const { taskId, formType, lastMessageId } = message;
            
            if (!taskId || !formType) {
              logError('Invalid request_missed_events message: missing taskId or formType');
              return;
            }
            
            logInfo(`Received request for missed events for task ${taskId} (${formType})`);
            
            // Import necessary services to check for recent form submission events
            import('../services/form-event-cache').then(({ getRecentFormEvents }) => {
              // Get recent form events for this task
              getRecentFormEvents(taskId, formType)
                .then(events => {
                  if (!events || events.length === 0) {
                    // No events to send
                    logInfo(`No recent form events found for task ${taskId}`);
                    return;
                  }
                  
                  logInfo(`Sending ${events.length} missed form events for task ${taskId}`);
                  
                  // Send each event to the client
                  events.forEach(event => {
                    try {
                      // Skip events that may have already been processed
                      if (lastMessageId && event.messageId === lastMessageId) {
                        return;
                      }
                      
                      ws.send(JSON.stringify({
                        type: 'form_submission',
                        payload: event,
                        timestamp: new Date().toISOString(),
                        messageId: event.messageId || `resend_${Date.now()}`
                      }));
                    } catch (e) {
                      logError(`Error sending missed event: ${e}`);
                    }
                  });
                })
                .catch(err => {
                  logError(`Error retrieving missed events: ${err}`);
                });
            }).catch(err => {
              logError(`Error importing form-event-cache module: ${err}`);
            });
          } catch (e) {
            logError(`Error handling request_missed_events: ${e}`);
          }
        }
      } catch (error) {
        logError('Error parsing message:', error);
      }
    });
    
    // Handle errors
    ws.on('error', (error) => {
      logError('WebSocket error:', error);
    });
    
    // Handle disconnection
    ws.on('close', (code, reason) => {
      logInfo(`Client disconnected: Code ${code}, Reason: ${reason || 'No reason provided'}`);
    });
    
    // Send welcome message with both data and payload fields for consistency
    try {
      const welcomeTimestamp = new Date().toISOString();
      const welcomePayload = {
        message: 'Connection established',
        timestamp: welcomeTimestamp
      };
      
      ws.send(JSON.stringify({
        type: 'connection_established',
        payload: welcomePayload,
        data: welcomePayload, // Include both formats for client compatibility
        timestamp: welcomeTimestamp,
        messageId: `welcome_${Date.now()}`
      }));
    } catch (error) {
      logError('Error sending welcome message:', error);
    }
  });
  
  // Handle server errors
  wss.on('error', (error) => {
    logError('WebSocket server error:', error);
  });
  
  // Handle server shutdown
  wss.on('close', () => {
    clearInterval(pingInterval);
    logInfo('WebSocket server closed');
  });
  
  logInfo('WebSocket server handlers configured');
}
