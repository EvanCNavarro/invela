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
  wss = new WebSocket.Server({ server });
  
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
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
          type: 'TASK_UPDATE',
          payload: task
        }));
      } catch (error) {
        console.error('Error broadcasting task update:', error);
      }
    }
  });
}
