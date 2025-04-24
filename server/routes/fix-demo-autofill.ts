/**
 * Demo Auto-Fill Fix API Route
 * 
 * This provides an improved API endpoint for fixing the demo auto-fill functionality
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';
import { enhancedDemoAutoFill, getFormTypeFromTaskType } from '../services/fix-demo-autofill';
import { db } from '../../db';
import { tasks } from '../../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();
const logger = new Logger('FixDemoAutoFillRouter');

/**
 * Fixed endpoint for improved demo auto-fill across all form types
 */
router.post('/api/fix-demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    console.log('Fix demo auto-fill endpoint called:', {
      taskId: req.params.taskId,
      user: req.user ? { id: req.user.id, email: req.user.email } : 'No user'
    });
    
    // Check user authentication
    if (!req.user || !req.user.id) {
      logger.error('Unauthenticated user attempted to access demo auto-fill');
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }
    
    // Parse taskId from request parameters
    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid task ID' 
      });
    }
    
    // Get the task to determine its form type
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      logger.error('Task not found for demo auto-fill', { taskId });
      return res.status(404).json({ 
        success: false,
        error: 'Task not found' 
      });
    }
    
    // SECURITY: Verify user belongs to the task's company
    if (req.user.company_id !== task.company_id) {
      logger.error('Security violation: User attempted to access task from another company', {
        userId: req.user.id,
        userCompanyId: req.user.company_id,
        taskId: task.id,
        taskCompanyId: task.company_id
      });
      
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to access this task'
      });
    }
    
    // Determine form type from task type
    const formType = getFormTypeFromTaskType(task.task_type);
    
    if (!formType) {
      logger.error('Failed to determine form type for task', { 
        taskId, 
        taskType: task.task_type 
      });
      
      return res.status(400).json({
        success: false,
        error: 'Unknown form type',
        message: `Could not determine form type for task type: ${task.task_type}`
      });
    }
    
    logger.info('Auto-detected form type from task', { 
      taskId, 
      taskType: task.task_type, 
      formType 
    });
    
    // Use the enhanced service to apply demo data
    try {
      const result = await enhancedDemoAutoFill(
        taskId, 
        formType,
        req.user.id
      );
      
      logger.info('Successfully applied demo data', {
        taskId,
        formType,
        fieldCount: result.fieldCount
      });
      
      // Return success with the form data
      res.json({
        success: true,
        message: result.message,
        fieldCount: result.fieldCount,
        taskId,
        formType,
        formData: result.formData || null
      });
    } catch (serviceError) {
      // Handle specific errors from the service
      logger.error('Error from enhanced service', {
        error: serviceError instanceof Error ? serviceError.message : 'Unknown error',
        stack: serviceError instanceof Error ? serviceError.stack : undefined
      });
      
      // Determine appropriate status code
      const statusCode = 
        serviceError instanceof Error && serviceError.message.includes('demo companies') ? 403 :
        serviceError instanceof Error && serviceError.message.includes('Task not found') ? 404 : 
        500;
      
      return res.status(statusCode).json({
        success: false,
        error: 'Failed to apply demo data',
        message: serviceError instanceof Error ? serviceError.message : 'Unknown error'
      });
    }
  } catch (error) {
    logger.error('Error in fix demo auto-fill endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

export default router;