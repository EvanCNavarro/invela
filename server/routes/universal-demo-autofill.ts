/**
 * Universal Demo Auto-Fill API Route
 * 
 * This file provides a unified API endpoint for automatically filling all form types
 * (KYB, KY3P, Open Banking) with demo data using the UniversalDemoAutoFillService.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { universalDemoAutoFillService, getFormTypeFromTaskType } from '../services/universalDemoAutoFillService';
import { db } from '../../db';
import { tasks } from '../../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();
// Logger is already initialized in the imported module

/**
 * Unified endpoint for demo auto-fill across all form types
 * This endpoint automatically detects the form type from the task
 * and uses the appropriate service to fill the form with demo data.
 */
/**
 * GET endpoint for universal demo auto-fill
 * This provides a standardized way to get demo data for any form type
 * via a single, consistent endpoint
 */
router.get('/api/universal/demo-autofill', requireAuth, async (req, res) => {
  logger.info('Universal GET demo-autofill endpoint called', { 
    taskId: req.query.taskId,
    formType: req.query.formType || 'auto-detect'
  });
  
  try {
    // Check user authentication
    if (!req.user || !req.user.id) {
      logger.error('Unauthenticated user attempted to access demo auto-fill');
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }
    
    // Parse taskId from query parameters
    const taskId = req.query.taskId ? parseInt(req.query.taskId as string, 10) : undefined;
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or missing task ID' 
      });
    }
    
    // Get the formType from query parameters
    const formType = req.query.formType as string;
    if (!formType) {
      return res.status(400).json({
        success: false,
        error: 'Missing form type',
        message: 'The formType query parameter is required'
      });
    }
    
    // Get the task to verify access
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
    
    // Generate demo data using the universal service
    try {
      const result = await universalDemoAutoFillService.getDemoData(
        taskId, 
        formType,
        req.user.id
      );
      
      logger.info('Successfully generated demo data', {
        taskId,
        formType,
        fieldCount: Object.keys(result.formData || {}).length
      });
      
      // Return the demo data in a consistent format
      res.json({
        success: true,
        message: 'Demo data generated successfully',
        formData: result.formData || {},
        progress: result.progress || 0,
        status: result.status || 'demo',
        taskId,
        formType
      });
    } catch (serviceError) {
      logger.error('Error from universal service when getting demo data', {
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
        error: 'Failed to generate demo data',
        message: serviceError instanceof Error ? serviceError.message : 'Unknown error'
      });
    }
  } catch (error) {
    logger.error('Error in universal GET demo auto-fill endpoint', {
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

/**
 * POST endpoint for universal demo auto-fill
 * This allows automatic application of demo data to a task
 */
router.post('/api/demo-autofill/:taskId', requireAuth, async (req, res) => {
  logger.info('Universal demo-autofill endpoint called directly', { 
    taskId: req.params.taskId,
    formType: req.body.formType || req.query.formType || 'auto-detect'
  });
  try {
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
    
    // Allow request to specify form type directly
    let formType = req.query.formType || req.body.formType;
    
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
    
    // If form type wasn't explicitly provided, detect it from the task type
    if (!formType) {
      formType = getFormTypeFromTaskType(task.task_type);
      
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
    }
    
    // Use the universal service to apply the demo data
    try {
      const result = await universalDemoAutoFillService.applyDemoData(
        taskId, 
        formType,
        req.user.id
      );
      
      logger.info('Successfully applied demo data', {
        taskId,
        formType,
        fieldCount: result.fieldCount
      });
      
      // Return success information
      res.json({
        success: true,
        message: result.message,
        fieldCount: result.fieldCount,
        taskId,
        formType
      });
    } catch (serviceError) {
      // Handle specific errors from the service
      logger.error('Error from universal service', {
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
    logger.error('Error in universal demo auto-fill endpoint', {
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

// For backward compatibility, add type-specific endpoints
router.post('/api/kyb/demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    // Set explicit form type
    req.body.formType = 'kyb';
    const taskId = req.params.taskId;
    logger.info('KYB demo-autofill endpoint called, redirecting to universal service', { taskId });

    // Instead of router.handle, call the service directly
    const result = await universalDemoAutoFillService.applyDemoData(
      parseInt(taskId, 10),
      'kyb',
      req.user?.id
    );
    
    logger.info('Successfully applied demo data via KYB endpoint', {
      taskId,
      formType: 'kyb',
      fieldCount: result.fieldCount
    });
    
    res.json({
      success: true,
      message: result.message,
      fieldCount: result.fieldCount,
      taskId,
      formType: 'kyb'
    });
  } catch (error) {
    logger.error('Error in KYB demo auto-fill endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Determine appropriate status code
    const statusCode = 
      error instanceof Error && error.message.includes('demo companies') ? 403 :
      error instanceof Error && error.message.includes('Task not found') ? 404 : 
      500;
    
    return res.status(statusCode).json({
      success: false,
      error: 'Failed to apply demo data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/api/ky3p/demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    // Set explicit form type
    req.body.formType = 'ky3p';
    const taskId = req.params.taskId;
    logger.info('KY3P demo-autofill endpoint called, redirecting to universal service', { taskId });

    // Instead of router.handle, call the service directly
    const result = await universalDemoAutoFillService.applyDemoData(
      parseInt(taskId, 10),
      'ky3p',
      req.user?.id
    );
    
    logger.info('Successfully applied demo data via KY3P endpoint', {
      taskId,
      formType: 'ky3p',
      fieldCount: result.fieldCount
    });
    
    res.json({
      success: true,
      message: result.message,
      fieldCount: result.fieldCount,
      taskId,
      formType: 'ky3p'
    });
  } catch (error) {
    logger.error('Error in KY3P demo auto-fill endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Determine appropriate status code
    const statusCode = 
      error instanceof Error && error.message.includes('demo companies') ? 403 :
      error instanceof Error && error.message.includes('Task not found') ? 404 : 
      500;
    
    return res.status(statusCode).json({
      success: false,
      error: 'Failed to apply demo data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/api/open-banking/demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    // Set explicit form type
    req.body.formType = 'open_banking';
    const taskId = req.params.taskId;
    logger.info('Open Banking demo-autofill endpoint called, redirecting to universal service', { taskId });

    // Instead of router.handle, call the service directly
    const result = await universalDemoAutoFillService.applyDemoData(
      parseInt(taskId, 10),
      'open_banking',
      req.user?.id
    );
    
    logger.info('Successfully applied demo data via Open Banking endpoint', {
      taskId,
      formType: 'open_banking',
      fieldCount: result.fieldCount
    });
    
    res.json({
      success: true,
      message: result.message,
      fieldCount: result.fieldCount,
      taskId,
      formType: 'open_banking'
    });
  } catch (error) {
    logger.error('Error in Open Banking demo auto-fill endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Determine appropriate status code
    const statusCode = 
      error instanceof Error && error.message.includes('demo companies') ? 403 :
      error instanceof Error && error.message.includes('Task not found') ? 404 : 
      500;
    
    return res.status(statusCode).json({
      success: false,
      error: 'Failed to apply demo data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export as both named and default export for flexibility
export { router };
export default router;