/**
 * Broadcast routes for WebSocket message broadcasting
 * 
 * This file contains routes for sending broadcast messages via WebSockets
 * to all connected clients, specifically for form updates and task notifications.
 */

import { Router } from 'express';
import { broadcastMessage, getWebSocketServer } from '../websocket';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';

const logger = new Logger('BroadcastRoutes');

const router = Router();

/**
 * Broadcast a task update via WebSocket
 * This is used by the KY3P demo autofill functionality to update all clients
 * when a task's fields have been populated with demo data
 */
router.post('/api/broadcast/task-update', requireAuth, (req, res) => {
  try {
    const { taskId, type, timestamp } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Missing taskId parameter' });
    }
    
    const messageType = type || 'task_updated';
    const messageTimestamp = timestamp || new Date().toISOString();
    
    logger.info(`Broadcasting task update for task ${taskId}`, {
      taskId,
      type: messageType,
      timestamp: messageTimestamp
    });
    
    // Broadcast the message to all clients
    const messageSent = broadcastMessage(messageType, {
      taskId,
      timestamp: messageTimestamp,
      source: 'api'
    });
    
    if (messageSent) {
      logger.info(`Successfully broadcasted update for task ${taskId}`);
      return res.json({
        success: true,
        message: 'Task update broadcasted successfully',
        taskId,
        timestamp: messageTimestamp
      });
    } else {
      logger.warn(`Failed to broadcast task update - no WebSocket server available`);
      return res.status(503).json({
        success: false,
        message: 'WebSocket server not available'
      });
    }
  } catch (error) {
    logger.error('Error broadcasting task update:', error);
    res.status(500).json({
      success: false,
      message: 'Error broadcasting message'
    });
  }
});

/**
 * Check WebSocket server status
 * This endpoint allows clients to check if the WebSocket server is running
 */
router.get('/api/broadcast/status', (req, res) => {
  try {
    const wss = getWebSocketServer();
    
    if (wss) {
      const clientCount = wss.clients ? wss.clients.size : 0;
      
      return res.json({
        running: true,
        clients: clientCount,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.json({
        running: false,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('Error checking WebSocket server status:', error);
    res.status(500).json({
      error: 'Error checking WebSocket server status'
    });
  }
});

export default router;