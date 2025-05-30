// Re-export from the unified websocket implementation to maintain compatibility
export { 
  broadcast as broadcastMessage, 
  broadcastTaskUpdate, 
  getWebSocketServer
} from './utils/unified-websocket';

// Legacy compatibility functions that aren't needed anymore
export function broadcastDocumentCountUpdate() {
  console.warn('broadcastDocumentCountUpdate is deprecated - use unified broadcast instead');
}

export function broadcastFieldUpdate() {
  console.warn('broadcastFieldUpdate is deprecated - use unified broadcast instead');
}

export function setupWebSocket() {
  console.warn('setupWebSocket is deprecated - WebSocket server is auto-initialized');
}