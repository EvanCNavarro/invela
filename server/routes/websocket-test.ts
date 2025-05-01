import { Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import * as WebSocketService from '../services/websocket';
import { TaskStatus } from '@db/schema';

/**
 * This file contains test endpoints for WebSocket functionality
 * Useful for development and debugging
 */

export const router = Router();

// Test endpoint to broadcast a submission status update
router.get('/test-submission-status/:taskId', async (req, res) => {
  try {
    const taskId = Number(req.params.taskId || 0);
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Task ID is required'
      });
    }
    
    console.log(`[WebSocket] Sending test notification for task ${taskId}`);
    
    // Count WebSocket clients
    let clientCount = 0;
    let openClientCount = 0;
    
    const ws = WebSocketService.getWebSocketServer();
    if (ws) {
      ws.clients.forEach(client => {
        clientCount++;
        if (client.readyState === WebSocket.OPEN) {
          openClientCount++;
        }
      });
    }
    
    console.log(`[WebSocket] Client count: ${clientCount} total, ${openClientCount} open`);
    
    // Test the submission status broadcast with enhanced logging
    console.log(`[WebSocket] Broadcasting submission status for task ${taskId}: submitted (TEST)`);
    WebSocketService.broadcast('submission_status', { taskId, status: 'submitted' });
    
    // Send the regular task update
    console.log(`[WebSocket] Broadcasting task update for task ${taskId}`);
    WebSocketService.broadcastTaskUpdate({
      id: taskId,
      status: TaskStatus.SUBMITTED,
      progress: 100,
      metadata: {
        testMessage: 'This is a test broadcast',
        timestamp: new Date().toISOString()
      }
    });
    
    return res.json({
      success: true,
      message: 'Test notification sent',
      details: {
        taskId,
        clientCount,
        openClientCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

// Test endpoint to trigger client-side error handling
router.get('/test-form-error/:taskId', async (req, res) => {
  try {
    const taskId = Number(req.params.taskId || 0);
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Task ID is required'
      });
    }
    
    console.log(`[WebSocket] Sending test error for task ${taskId}`);
    
    // Count WebSocket clients
    let clientCount = 0;
    let openClientCount = 0;
    
    const ws = WebSocketService.getWebSocketServer();
    if (ws) {
      ws.clients.forEach(client => {
        clientCount++;
        if (client.readyState === WebSocket.OPEN) {
          openClientCount++;
        }
      });
    }
    
    console.log(`[WebSocket] Client count: ${clientCount} total, ${openClientCount} open`);
    
    // Send a simulated error status
    WebSocketService.broadcast('submission_status', { taskId, status: 'error' });
    
    // Also send via task update
    WebSocketService.broadcastTaskUpdate({
      id: taskId,
      status: 'failed' as TaskStatus, // Using 'failed' instead of ERROR
      progress: 0,
      metadata: {
        error: 'This is a test error message',
        timestamp: new Date().toISOString()
      }
    });
    
    return res.json({
      success: true,
      message: 'Test error sent',
      details: {
        taskId,
        clientCount,
        openClientCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error sending test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send test error'
    });
  }
});