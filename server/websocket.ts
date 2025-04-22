// Re-export from the websocket service to maintain compatibility
export { 
  broadcastMessage, 
  broadcastTaskUpdate, 
  broadcastDocumentCountUpdate, 
  broadcastFieldUpdate,
  getWebSocketServer,
  setupWebSocket
} from './services/websocket';