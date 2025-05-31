/**
 * WebSocket Router
 * 
 * This file integrates the unified task-update utilities with the WebSocket server,
 * ensuring consistent real-time updates for tasks and progress tracking.
 */

import { Router } from 'express';
import { WebSocketServer } from 'ws';
import * as WebSocketService from '../services/websocket';
import { registerWebSocketServer, broadcastWebSocketMessage } from '../utils/task-update';
import { logger } from '../utils/logger';

// Define interface for risk dimension to match client-side
interface RiskDimension {
  id: string;
  name: string;
  description: string;
  weight: number;
  value: number;
  color?: string;
}

// Define interface for risk priorities to match client-side
interface RiskPriorities {
  dimensions: RiskDimension[];
  riskAcceptanceLevel: number;
  lastUpdated: string;
}

// Map to store active clients
export const clients = new Map();

// WebSocket server instance
let wss: WebSocketServer | null = null;

// Router for WebSocket-related HTTP endpoints
const websocketRouter = Router();

/**
 * Initialize WebSocket server with proper path and handler registration
 * 
 * @param server HTTP server to attach the WebSocket server to
 * @returns WebSocket server instance
 */
export function initializeWebSocketServer(server: any): WebSocketServer {
  // Use the service to create the WebSocket server
  wss = WebSocketService.initializeWebSocketServer(server);
  
  // Register the WebSocket server with our task-update utility
  registerWebSocketServer(wss);
  
  logger.info('WebSocket server initialized and registered with task-update utility');
  
  return wss;
}

// HTTP endpoints for WebSocket management and testing

// GET endpoint to check WebSocket server status
websocketRouter.get('/api/websocket/status', (req, res) => {
  res.json({
    status: wss ? 'active' : 'inactive',
    clientCount: WebSocketService.getWebSocketServer()?.clients.size || 0,
    timestamp: new Date().toISOString()
  });
});

// POST endpoint to broadcast a test message
websocketRouter.post('/api/websocket/broadcast', (req, res) => {
  const { type, data } = req.body;
  
  if (!type) {
    return res.status(400).json({ error: 'Message type is required' });
  }
  
  try {
    // Use our improved broadcasting function
    broadcastWebSocketMessage(type, data || {});
    res.json({ 
      success: true, 
      clientCount: WebSocketService.getWebSocketServer()?.clients.size || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// POST endpoint to broadcast a task update
websocketRouter.post('/api/websocket/task-update', (req, res) => {
  const { taskId, status, progress } = req.body;
  
  if (!taskId) {
    return res.status(400).json({ error: 'Task ID is required' });
  }
  
  try {
    // Use our task-update utility to broadcast the update
    broadcastWebSocketMessage('task_update', { 
      taskId, 
      status, 
      progress,
      timestamp: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      taskId,
      status,
      progress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

/**
 * Broadcast risk priorities update to all connected clients
 * 
 * @param priorities The updated risk priorities
 */
export function broadcastRiskPrioritiesUpdate(priorities: RiskPriorities): void {
  logger.info('[RiskPriorities] Broadcasting updated priorities to clients');
  
  try {
    // Use our improved broadcasting function
    broadcastWebSocketMessage('risk_priorities_update', { 
      priorities,
      timestamp: new Date().toISOString()
    });
    
    logger.info('[RiskPriorities] Successfully broadcast to connected clients', {
      dimensionCount: priorities.dimensions.length,
      riskAcceptanceLevel: priorities.riskAcceptanceLevel,
      timestamp: priorities.lastUpdated
    });
  } catch (error) {
    logger.error('[RiskPriorities] Failed to broadcast priorities update', {
      error: String(error)
    });
  }
}

/**
 * Broadcast risk score update to all connected clients
 * 
 * @param newScore The updated risk score value
 * @param riskLevel The risk level string (e.g., 'low', 'medium', 'high')
 */
export function broadcastRiskScoreUpdate(newScore: number, riskLevel: string): void {
  logger.info('[RiskScore] Broadcasting updated score to clients');
  
  try {
    // Use our improved broadcasting function
    broadcastWebSocketMessage('risk_score_update', { 
      newScore,
      riskLevel,
      timestamp: new Date().toISOString()
    });
    
    logger.info('[RiskScore] Successfully broadcast to connected clients', {
      score: newScore,
      riskLevel
    });
  } catch (error) {
    logger.error('[RiskScore] Failed to broadcast score update', {
      error: String(error)
    });
  }
}

export default websocketRouter;
