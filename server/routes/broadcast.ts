/**
 * Broadcast routes for WebSocket message broadcasting
 * 
 * This file contains routes for sending broadcast messages via WebSockets
 * to all connected clients, specifically for form updates and task notifications.
 */

import { Router } from 'express';
import { broadcastTaskUpdate } from "../utils/unified-websocket";
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';

// Logger is already initialized in the imported module

const router = Router();

/**
 * Broadcast a task update via WebSocket
 * This is used by the KY3P demo autofill functionality to update all clients
 * when a task's fields have been populated with demo data
 */
router.post('/api/broadcast/task-update', requireAuth, async (req, res) => {
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
    
    // Broadcast the message to all clients using the WebSocketService
    await WebSocketService.broadcast(messageType, {
      taskId,
      timestamp: messageTimestamp,
      source: 'api'
    });
    
    logger.info(`Successfully broadcasted update for task ${taskId}`);
    return res.json({
      success: true,
      message: 'Task update broadcasted successfully',
      taskId,
      timestamp: messageTimestamp
    });
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
    const wss = WebSocketService.getWebSocketServer();
    
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

/**
 * Broadcast a field update via WebSocket
 * This is used by the individual field update functionality to notify 
 * all clients when a specific field has been updated
 */
router.post('/api/broadcast/field-update', requireAuth, async (req, res) => {
  try {
    const { taskId, fieldId, fieldKey, value, timestamp } = req.body;
    
    if (!taskId || !fieldId) {
      return res.status(400).json({ error: 'Missing required parameters (taskId and fieldId)' });
    }
    
    const messageTimestamp = timestamp || new Date().toISOString();
    
    logger.info(`Broadcasting field update for task ${taskId}, field ${fieldId} (${fieldKey})`, {
      taskId,
      fieldId,
      fieldKey,
      valueType: typeof value,
      timestamp: messageTimestamp
    });
    
    // Broadcast the message to all clients using the WebSocketService
    await WebSocketService.broadcast('field_updated', {
      taskId,
      fieldId,
      fieldKey,
      value,
      timestamp: messageTimestamp,
      source: 'api'
    });
    
    logger.info(`Successfully broadcasted field update for task ${taskId}, field ${fieldId}`);
    return res.json({
      success: true,
      message: 'Field update broadcasted successfully',
      taskId,
      fieldId,
      timestamp: messageTimestamp
    });
  } catch (error) {
    logger.error('Error broadcasting field update:', error);
    res.status(500).json({
      success: false,
      message: 'Error broadcasting field update message'
    });
  }
});

export default router;