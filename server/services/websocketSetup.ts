import { Server } from 'http';
import { initWebSocketService } from './websocket';

export function setupWebSocket(server: Server) {
  try {
    const websocketService = initWebSocketService(server);
    console.log(`WebSocket service initialized with ${websocketService.getClientCount()} clients`);
  } catch (error) {
    console.error('Failed to initialize WebSocket service:', error);
  }
}