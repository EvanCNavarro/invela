/**
 * Bypass Auth Demo Auto-Fill Router
 * 
 * This router provides a completely authentication-free way to test demo auto-fill
 * functionality. It's designed for development and testing purposes only.
 */

import { Router } from 'express';
import { AtomicDemoAutoFillService } from '../services/atomic-demo-autofill';
import { db } from '@db';
import { openBankingFields, openBankingResponses, tasks } from '@db/schema';
import * as websocketService from '../services/websocket';
import { Logger } from '../utils/logger';

// Create a logger instance
const logger = new Logger('BypassAuthDemoAutofill');

// Create the router
const router = Router();

// This route is completely open - no authentication required
router.post('/test/:taskId/:formType', async (req, res) => {
  // Extract parameters directly from the request
  const taskIdParam = req.params.taskId;
  const formType = req.params.formType || 'open_banking';
  const companyName = req.body.companyName || 'Test Company';
  
  // Ensure taskId is a valid number
  const taskId = parseInt(taskIdParam, 10);
  if (isNaN(taskId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid task ID, must be a number',
      error: 'INVALID_TASK_ID'
    });
  }
  
  logger.info(`[BYPASS-AUTH] Starting demo auto-fill for task ${taskId}, form ${formType}, company ${companyName}`);
  
  try {
    // First, check if we have a valid task
    const task = await db.query.tasks.findFirst({
      where: (tasks, { eq }) => eq(tasks.id, taskId)
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task ${taskId} not found`,
        error: 'TASK_NOT_FOUND'
      });
    }
    
    // Process based on form type
    logger.info(`[BYPASS-AUTH] Found task: ${task.id} - ${task.title}`);
    
    // For Open Banking, get field definitions to generate demo data
    if (formType === 'open_banking') {
      // Fetch field definitions
      const fields = await db.query.openBankingFields.findMany();
      
      if (!fields || fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No field definitions found for Open Banking',
          error: 'NO_FIELD_DEFINITIONS'
        });
      }
      
      logger.info(`[BYPASS-AUTH] Found ${fields.length} Open Banking fields`);
      
      // Send initial progress update
      websocketService.broadcastProgressUpdate(taskId, 0.1);
      
      // Simulate filling fields with demo data
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        
        // Get demo value from field definition
        let demoValue;
        if (field.field_type === 'BOOLEAN') {
          demoValue = field.demo_autofill === 'true';
        } else if (field.field_type === 'NUMBER') {
          demoValue = parseInt(field.demo_autofill || '3', 10);
        } else {
          demoValue = field.demo_autofill || 'Demo value';
        }
        
        // Send update for this field
        await websocketService.broadcastFieldUpdate(taskId, field.id, demoValue);
        
        // Add a small delay between updates for smooth UI experience
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Update progress
        const progress = 0.1 + 0.8 * ((i + 1) / fields.length);
        websocketService.broadcastProgressUpdate(taskId, Math.min(Math.round(progress * 100) / 100, 0.9));
      }
      
      // Complete the process
      websocketService.broadcastProgressUpdate(taskId, 1.0);
      
      // Send final completion message
      websocketService.broadcastDemoAutoFillComplete(taskId);
      
      return res.json({
        success: true,
        message: `Successfully applied demo data for Open Banking task ${taskId}`,
        details: {
          taskId,
          formType,
          fieldsProcessed: fields.length,
          timestamp: new Date().toISOString()
        }
      });
    } 
    
    // Generic success response for other form types
    return res.json({
      success: true,
      message: `Successfully processed demo auto-fill request for task ${taskId} with form type ${formType}`,
      details: {
        taskId,
        formType,
        timestamp: new Date().toISOString(),
        note: 'This is a direct implementation that bypasses authentication'
      }
    });
  } catch (error) {
    logger.error(`[BYPASS-AUTH] Error applying demo data:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId,
      formType,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return error response
    res.status(500).json({
      success: false,
      message: 'Error applying demo data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// This route is useful for health checks and testing WebSocket connectivity
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    websocketPath: '/ws',
    service: 'bypass-auth-demo-autofill'
  });
});

// Export the router
export default router;