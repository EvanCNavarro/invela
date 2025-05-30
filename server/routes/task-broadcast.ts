/**
 * Task Broadcast Router
 * 
 * This module provides API endpoints for sending task-specific broadcasts
 * to all connected WebSocket clients.
 */

import express, { Request, Response } from 'express';
import { getWebSocketServer } from '../utils/unified-websocket';
import { logger } from '../utils/logger';
import { WebSocket } from 'ws';

const router = express.Router();
const taskLogger = logger.child({ module: 'TaskBroadcast' });

// Define the supported message types for type safety
export type MessageType = 
  | 'clear_fields'
  | 'field_updated'
  | 'batch_update'
  | 'task_status_updated'
  | 'task_progress_updated'
  | 'form_submission_completed';

interface BroadcastMessage {
  type: MessageType;
  payload: {
    taskId: number;
    formType?: string;
    status?: string;
    progress?: number;
    metadata?: Record<string, any>;
    timestamp?: string;
    preserveProgress?: boolean;
    resetUI?: boolean;
    clearSections?: boolean;
  };
  timestamp?: string;
}

/**
 * POST /api/tasks/:taskId/broadcast
 * 
 * Broadcast a message to all connected clients about a specific task.
 * This is used for operations like form clearing, submission status updates, etc.
 */
router.post('/:taskId/broadcast', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      taskLogger.error(`Invalid task ID: ${req.params.taskId}`);
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }
    
    const { type, payload } = req.body;
    
    if (!type || !payload) {
      taskLogger.error('Missing required fields: type or payload');
      return res.status(400).json({ success: false, message: 'Missing required fields: type or payload' });
    }
    
    // Ensure the task ID in the payload matches the URL parameter
    if (payload.taskId !== taskId) {
      taskLogger.error(`Task ID mismatch: URL param ${taskId} vs payload ${payload.taskId}`);
      return res.status(400).json({ success: false, message: 'Task ID mismatch' });
    }
    
    // Add any type-specific required fields
    const typeSpecificFields = getTypeSpecificFields(type, payload, taskId);
    
    // Create the broadcast message
    const message: BroadcastMessage = {
      type,
      payload: {
        ...payload,
        ...typeSpecificFields,
        taskId,
        timestamp: payload.timestamp || new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };
    
    // Get the WebSocket server instance
    const wss = getWebSocketServer();
    
    if (!wss) {
      taskLogger.error('WebSocket server not available');
      return res.status(500).json({ success: false, message: 'WebSocket server not available' });
    }
    
    // Broadcast to all connected clients
    let clientCount = 0;
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
        clientCount++;
      }
    });
    
    taskLogger.info(`Broadcast ${type} message for task ${taskId} to ${clientCount} clients`);
    
    return res.json({ 
      success: true, 
      message: `Broadcast ${type} message to ${clientCount} clients`,
      clientCount
    });
  } catch (error) {
    taskLogger.error(`Error broadcasting task message:`, error);
    return res.status(500).json({ success: false, message: 'Error broadcasting task message' });
  }
});

/**
 * Helper function to ensure type-specific fields are present in the payload
 * 
 * @param type The message type
 * @param payload The original payload
 * @param taskId The task ID
 * @returns Additional fields needed for this message type
 */
function getTypeSpecificFields(
  type: MessageType,
  payload: any,
  taskId: number
): Record<string, any> {
  switch (type) {
    case 'clear_fields':
      // For clear_fields, ensure formType is present
      if (!payload.formType) {
        taskLogger.warn(`Missing formType for clear_fields message on task ${taskId}`);
      }
      return {
        formType: payload.formType || 'unknown',
        preserveProgress: !!payload.preserveProgress,
        resetUI: payload.resetUI !== false,
        clearSections: payload.clearSections !== false
      };
      
    case 'task_status_updated':
      // For task_status_updated, ensure status is present
      if (!payload.status) {
        taskLogger.warn(`Missing status for task_status_updated message on task ${taskId}`);
      }
      return {
        status: payload.status || 'unknown'
      };
      
    case 'task_progress_updated':
      // For task_progress_updated, ensure progress is present
      if (payload.progress === undefined) {
        taskLogger.warn(`Missing progress for task_progress_updated message on task ${taskId}`);
      }
      return {
        progress: payload.progress !== undefined ? payload.progress : -1
      };
      
    default:
      // For other message types, no specific requirements
      return {};
  }
}

export default router;