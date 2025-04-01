// Re-export from the websocket service to maintain compatibility
import { broadcastTaskUpdate } from './services/websocket';

// Generic broadcast function that can be used in the tasks routes
export function broadcastMessage(type: string, payload: any) {
  console.log(`[WebSocket] Broadcasting message: ${type}`, payload);
  
  // Handle specific message types
  if (type === 'task_created' || type === 'task_updated') {
    broadcastTaskUpdate({
      id: payload.task?.id || payload.taskId,
      status: payload.task?.status || payload.status,
      progress: payload.task?.progress || payload.progress || 0,
      metadata: payload.task?.metadata || payload.metadata
    });
  }
  // Other message types can be added here if needed
}