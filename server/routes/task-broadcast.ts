/**
 * Task Broadcast Router
 * 
 * This module provides API endpoints for sending task-specific broadcasts
 * to all connected WebSocket clients.
 */

import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '@db';
import { tasks } from '@db/schema';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { broadcast } from '../utils/unified-websocket';

const router = Router();

/**
 * POST /api/tasks/:taskId/broadcast
 * 
 * Broadcast a message to all connected clients about a specific task.
 * This is used for operations like form clearing, submission status updates, etc.
 */
router.post('/api/tasks/:taskId/broadcast', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { type, payload } = req.body;
    
    if (isNaN(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false, 
        message: 'Invalid task ID'
      });
    }
    
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Message type is required'
      });
    }
    
    // Verify the task exists
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task with ID ${taskId} not found`
      });
    }
    
    // Verify user has access to this task
    // Note: This check can be skipped if we're sure the requireAuth middleware
    // is sufficient, but it's good practice to explicitly check task access
    if (req.user?.company_id !== task.company_id) {
      logger.warn(`User ${req.user?.id} from company ${req.user?.company_id} attempted to broadcast for task ${taskId} belonging to company ${task.company_id}`);
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to broadcast updates for this task'
      });
    }
    
    // Normalize the payload format
    const normalizedPayload = {
      ...payload,
      taskId: taskId,
      timestamp: payload?.timestamp || new Date().toISOString(),
      source: payload?.source || 'api',
      // Ensure type-specific fields are present
      ...getTypeSpecificFields(type, payload, taskId)
    };
    
    // Log the broadcast attempt
    logger.info(`Broadcasting ${type} message for task ${taskId}`, {
      type,
      taskId,
      payloadKeys: Object.keys(normalizedPayload),
      userId: req.user?.id,
      companyId: req.user?.company_id
    });
    
    // Broadcast the message via WebSocket
    await broadcast(type, normalizedPayload);
    
    // Return success response
    return res.json({
      success: true,
      message: `Successfully broadcast ${type} message for task ${taskId}`,
      type,
      taskId,
      timestamp: normalizedPayload.timestamp
    });
  } catch (error) {
    logger.error('Error broadcasting task message:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error broadcasting message',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
  type: string,
  payload: any,
  taskId: number
): Record<string, any> {
  switch (type) {
    case 'clear_fields':
      return {
        formType: payload.formType || 'unknown',
        preserveProgress: !!payload.preserveProgress,
        resetUI: payload.resetUI !== false,
        clearSections: payload.clearSections !== false,
        metadata: {
          ...(payload.metadata || {}),
          operationId: payload.metadata?.operationId || `server_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        }
      };
      
    case 'task_update':
      return {
        status: payload.status || 'unknown',
        progress: typeof payload.progress === 'number' ? payload.progress : null
      };
      
    case 'form_submission_complete':
      return {
        formType: payload.formType || 'unknown',
        status: payload.status || 'submitted'
      };
      
    default:
      return {};
  }
}

export default router;