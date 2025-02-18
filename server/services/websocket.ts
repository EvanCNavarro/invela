import WebSocket from 'ws';
import { Server } from 'http';
import type { TaskStatus } from '@db/schema';

let wss: WebSocket.Server;

interface TaskUpdate {
  id: number;
  status: TaskStatus;
  progress: number;
  metadata?: Record<string, any>;
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 10000;  // 10 seconds timeout for pong response

export function setupWebSocket(server: Server) {
  wss = new WebSocket.Server({ 
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

  console.log('[WebSocket] Server initialized on path: /ws');

  wss.on('connection', (ws, req) => {
    console.log('[WebSocket] New client connected from:', req.headers.origin);
    let isAlive = true;
    let heartbeatInterval: NodeJS.Timeout;
    let pongTimeout: NodeJS.Timeout;

    const heartbeat = () => {
      isAlive = true;
      if (pongTimeout) clearTimeout(pongTimeout);

      // Set timeout for pong response
      pongTimeout = setTimeout(() => {
        if (!isAlive && ws.readyState === WebSocket.OPEN) {
          console.log('[WebSocket] Client failed to respond to ping, terminating connection');
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
          clientId: req.headers['x-forwarded-for'] || req.socket.remoteAddress
        }
      }));
    } catch (error) {
      console.error('[WebSocket] Error sending connection acknowledgment:', error);
    }

    // Set up heartbeat interval
    heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        isAlive = false;
        try {
          ws.ping();
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (error) {
          console.error('[WebSocket] Error sending ping:', error);
          ws.terminate();
        }
      }
    }, HEARTBEAT_INTERVAL);

    ws.on('ping', () => {
      try {
        ws.pong();
        heartbeat();
      } catch (error) {
        console.error('[WebSocket] Error sending pong:', error);
      }
    });

    ws.on('pong', () => {
      heartbeat();
      console.log('[WebSocket] Received pong from client');
    });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle ping messages immediately
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          return;
        }

        console.log('[WebSocket] Received message:', data);
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Client error:', error);
    });

    ws.on('close', (code, reason) => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (pongTimeout) clearTimeout(pongTimeout);
      console.log(`[WebSocket] Client disconnected with code ${code}${reason ? ` and reason: ${reason}` : ''}`);
    });
  });

  wss.on('error', (error) => {
    console.error('[WebSocket] Server error:', error);
  });
}

export function broadcastTaskUpdate(task: TaskUpdate) {
  if (!wss) {
    console.warn('[WebSocket] Server not initialized');
    return;
  }

  const message = JSON.stringify({
    type: 'task_update',
    payload: task,
    timestamp: Date.now()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('[WebSocket] Error broadcasting task update:', error);
      }
    }
  });
}