/**
 * WebSocket Service
 * 
 * This service provides functions for sending messages to WebSocket clients,
 * including broadcasting form submission events.
 */

// We'll implement a singleton pattern so the service can be used throughout the app
let webSocketServer: any = null;

interface FormSubmissionPayload {
  taskId: number;
  formType: string;
  status: string;
  companyId: number;
  unlockedTabs?: string[];
  unlockedTasks?: number[];
  fileId?: number;
  fileName?: string;
  error?: string;
  timestamp: string;
}

export class WebSocketService {
  /**
   * Set the WebSocket server instance
   * 
   * @param wss WebSocket server instance
   */
  static setServer(wss: any) {
    webSocketServer = wss;
    console.log('[WebSocketService] WebSocket server registered');
  }
  
  /**
   * Send a message to all connected clients
   * 
   * @param type Message type
   * @param payload Message payload
   */
  static broadcast(type: string, payload: any) {
    if (!webSocketServer) {
      console.error('[WebSocketService] WebSocket server not initialized');
      return;
    }
    
    const message = JSON.stringify({ type, payload });
    let clientCount = 0;
    
    webSocketServer.clients.forEach((client: any) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
        clientCount++;
      }
    });
    
    console.log(`[WebSocketService] Broadcast "${type}" sent to ${clientCount} client(s)`);
  }
  
  /**
   * Send a form submission event to all connected clients
   * 
   * @param payload Form submission event data
   */
  static broadcastFormSubmission(payload: FormSubmissionPayload) {
    this.broadcast('form_submitted', payload);
    console.log(`[WebSocketService] Form submission event broadcast for task ${payload.taskId}`);
  }
  
  /**
   * Send a task update event to all connected clients
   * 
   * @param payload Task update event data
   */
  static broadcastTaskUpdate(payload: any) {
    this.broadcast('task_update', payload);
    console.log(`[WebSocketService] Task update event broadcast for task ${payload.id}`);
  }
}

export default WebSocketService;