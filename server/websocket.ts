// Re-export from the websocket service to maintain compatibility
export { 
  broadcastMessage, 
  broadcastTaskUpdate, 
  broadcastDocumentCountUpdate, 
  broadcastFieldUpdate,
  getWebSocketServer,
  initWebSocketServer as setupWebSocket
} from './services/websocket';