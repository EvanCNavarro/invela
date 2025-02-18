import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import type { TaskStatus } from '@db/schema';
import { log } from '../vite';

let wss: WebSocketServer;

interface TaskUpdate {
  id: number;
  status: TaskStatus;
  progress: number;
  metadata?: Record<string, any>;
}

interface WebSocketClient extends WebSocket {
  isAlive: boolean;
  clientId?: string;
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 10000;  // 10 seconds timeout for pong response
const CONNECTION_TIMEOUT = 10000;  // 10 seconds connection timeout

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ 
    server,
    path: '/ws',
    clientTracking: true,
    perMessageDeflate: false,
    maxPayload: 1024 * 1024, // 1MB
    verifyClient: (info, cb) => {
      // Skip verification for vite-hmr
      if (info.req.headers['sec-websocket-protocol'] === 'vite-hmr') {
        cb(false);
        return;
      }
      cb(true);
    }
  });

  log('[WebSocket] Server initialized on path: /ws');

  wss.on('connection', (ws: WebSocketClient, req) => {
    const clientId = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || 'unknown';
    ws.clientId = clientId;
    ws.isAlive = true;

    log(`[WebSocket] New client connected - ID: ${clientId}, Origin: ${req.headers.origin || 'unknown'}`);

    let heartbeatInterval: NodeJS.Timeout;
    let pongTimeout: NodeJS.Timeout;
    let connectionTimeout: NodeJS.Timeout;

    // Set initial connection timeout
    connectionTimeout = setTimeout(() => {
      if (ws.readyState === ws.OPEN) {
        log(`[WebSocket] Connection timeout for client ${clientId}, terminating`);
        ws.terminate();
      }
    }, CONNECTION_TIMEOUT);

    const heartbeat = () => {
      ws.isAlive = true;
      if (pongTimeout) clearTimeout(pongTimeout);

      pongTimeout = setTimeout(() => {
        if (!ws.isAlive && ws.readyState === ws.OPEN) {
          log(`[WebSocket] Client ${clientId} failed to respond to ping, terminating connection`);
          ws.terminate();
        }
      }, HEARTBEAT_TIMEOUT);
    };

    // Send initial connection acknowledgment
    try {
      ws.send(JSON.stringify({
        type: 'connection_established',
        data: { 
          timestamp: new Date().toISOString(),
          clientId
        }
      }));
      clearTimeout(connectionTimeout);
    } catch (error) {
      log(`[WebSocket] Error sending connection acknowledgment to ${clientId}:`, 'error');
      ws.terminate();
      return;
    }

    // Set up heartbeat interval
    heartbeatInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.isAlive = false;
        try {
          ws.ping();
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (error) {
          log(`[WebSocket] Error sending ping to ${clientId}:`, 'error');
          ws.terminate();
        }
      }
    }, HEARTBEAT_INTERVAL);

    ws.on('ping', () => {
      try {
        ws.pong();
        heartbeat();
      } catch (error) {
        log(`[WebSocket] Error sending pong to ${clientId}:`, 'error');
      }
    });

    ws.on('pong', () => {
      heartbeat();
      log(`[WebSocket] Received pong from client ${clientId}`, 'debug');
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle ping messages immediately
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          return;
        }

        log(`[WebSocket] Received message from ${clientId}:`, 'debug');
      } catch (error) {
        log(`[WebSocket] Error processing message from ${clientId}:`, 'error');
      }
    });

    ws.on('error', (error) => {
      log(`[WebSocket] Client ${clientId} error:`, 'error');
    });

    ws.on('close', (code, reason) => {
      clearInterval(heartbeatInterval);
      clearTimeout(pongTimeout);
      log(`[WebSocket] Client ${clientId} disconnected with code ${code}${reason ? ` and reason: ${reason}` : ''}`);
    });
  });

  wss.on('error', (error) => {
    log('[WebSocket] Server error:', 'error');
  });

  // Monitor total connections periodically
  setInterval(() => {
    const totalClients = wss.clients.size;
    log(`[WebSocket] Active connections: ${totalClients}`, 'debug');
  }, 60000);
}

export function broadcastTaskUpdate(task: TaskUpdate) {
  if (!wss) {
    log('[WebSocket] Server not initialized', 'warn');
    return;
  }

  const message = JSON.stringify({
    type: 'task_update',
    data: task,
    timestamp: Date.now()
  });

  let successCount = 0;
  let failureCount = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      try {
        client.send(message);
        successCount++;
      } catch (error) {
        failureCount++;
        log('[WebSocket] Error broadcasting task update:', 'error');
      }
    }
  });

  log(`[WebSocket] Broadcast complete - Success: ${successCount}, Failed: ${failureCount}`, 'debug');
}