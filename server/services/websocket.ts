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

export function setupWebSocket(server: Server) {
  wss = new WebSocket.Server({ 
    server,
    path: '/ws',
    // Increase timeout values
    clientTracking: true,
    perMessageDeflate: false
  });

  wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');

    // Send initial connection acknowledgment
    ws.send(JSON.stringify({
      type: 'connection_established',
      data: { timestamp: new Date().toISOString() }
    }));

    // Set up ping/pong with longer intervals
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 45000); // Match client's interval

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle ping messages immediately
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        console.log('Received WebSocket message:', data);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      console.log('WebSocket client disconnected');
    });
  });
}

export function broadcastTaskUpdate(task: TaskUpdate) {
  if (!wss) {
    console.warn('WebSocket server not initialized');
    return;
  }

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'task_update',
          payload: task
        }));
      } catch (error) {
        console.error('Error broadcasting task update:', error);
      }
    }
  });
}