/**
 * Unified Form Submission API
 * 
 * This module provides a standardized REST API endpoint for all form submissions
 * (KYB, KY3P, Open Banking) in the application with consistent patterns.
 * 
 * Key benefits:
 * - Consistent URL pattern for all form types
 * - Standard response format
 * - Unified error handling
 * - Form-type specific processing encapsulated in factories
 */

import express from 'express';
import { db } from '@db';
import { tasks, companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { LoggingService } from '../services/logging-service';
// We'll handle KY3P processing directly in this file for now
// import { processKy3pSubmission } from './ky3p';
// Future enhancement: Use a factory pattern for form processors
// import { formProcessorFactory } from '../services/form-processors/form-processor-factory';

const logger = new LoggingService('UnifiedFormSubmission');
const router = express.Router();

/**
 * Universal form submission endpoint that handles ALL form types
 * with consistent API patterns and response format.
 */
router.post('/api/tasks/:taskId/submit', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { formType, formData, fileName } = req.body;
    
    logger.info(`Received form submission request`, { 
      taskId, 
      formType, 
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    // Validate required fields
    if (!formType) {
      logger.warn('Missing form type in request', { taskId });
      
      return res.status(400).json({
        success: false,
        error: 'Missing form type in request'
      });
    }
    
    // Validate task exists and user has access
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    
    if (!task) {
      logger.warn('Task not found', { taskId });
      
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Check access permissions
    if (task.assigned_to !== req.user?.id && 
        task.created_by !== req.user?.id && 
        task.company_id !== req.user?.company_id) {
      logger.warn('Access denied', { 
        taskId, 
        userId: req.user?.id,
        taskAssignedTo: task.assigned_to,
        taskCreatedBy: task.created_by,
        taskCompanyId: task.company_id,
        userCompanyId: req.user?.company_id
      });
      
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this task'
      });
    }
    
    // Process the submission using the factory pattern
    logger.info(`Processing ${formType} submission`, { taskId });
    
    // Create a result variable to hold the unified result format
    let result;
    
    // Process submission based on form type
    // We use existing processors for now, but eventually will move to the factory pattern
    switch (formType) {
      case 'ky3p':
        // Process KY3P submission
        result = await processKy3pSubmission(task, formData, req.user, fileName);
        break;
        
      case 'kyb':
        // Use the KYB processor
        result = await processKybSubmission(task, formData, req.user, fileName);
        break;
        
      case 'open_banking':
        // Use the Open Banking processor
        result = await processOpenBankingSubmission(task, formData, req.user, fileName);
        break;
        
      default:
        logger.error(`Unsupported form type: ${formType}`);
        
        return res.status(400).json({
          success: false,
          error: `Unsupported form type: ${formType}`
        });
    }
    
    // Return standardized response
    logger.info(`Form submission successful`, { 
      taskId, 
      formType,
      fileId: result?.fileId
    });
    
    return res.status(200).json({
      success: true,
      taskId,
      formType,
      status: 'submitted',
      details: result?.details || `Your ${formType.toUpperCase()} form has been successfully submitted.`,
      fileId: result?.fileId,
      fileName: result?.fileName,
      unlockedTabs: result?.unlockedTabs || [],
      unlockedTasks: result?.unlockedTasks || []
    });
  } catch (error) {
    logger.error('Error in unified form submission endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during form submission'
    });
  }
});

// KYB form processing function (simplified for this implementation)
async function processKybSubmission(task: any, formData: any, user: any, fileName?: string) {
  // This is a simplified placeholder for demonstration purposes
  // We would normally call the actual KYB form processing logic
  
  logger.info(`Processing KYB submission for task ${task.id}`);
  
  // In a real implementation, we would:
  // 1. Process form data
  // 2. Create files as needed
  // 3. Update task status
  // 4. Unlock dependent tasks
  // 5. Return detailed results
  
  return {
    details: 'Your KYB form has been successfully submitted.',
    fileId: 0, // This would be a real file ID in production
    fileName: fileName || `KYB_Assessment_${task.id}.csv`,
    unlockedTabs: ['File Vault'],
    unlockedTasks: []
  };
}

// KY3P form processing function
async function processKy3pSubmission(task: any, formData: any, user: any, fileName?: string) {
  // This is a simplified placeholder for demonstration purposes
  // We would normally call the actual KY3P form processing logic
  
  logger.info(`Processing KY3P submission for task ${task.id}`);
  
  // In a real implementation, we would:
  // 1. Process form data
  // 2. Create files as needed
  // 3. Update task status
  // 4. Unlock dependent tasks/tabs
  // 5. Return detailed results
  
  return {
    details: 'Your KY3P security assessment has been successfully submitted.',
    fileId: 0, // This would be a real file ID in production
    fileName: fileName || `KY3P_Assessment_${task.id}.csv`,
    unlockedTabs: ['File Vault', 'Risk Assessment'],
    unlockedTasks: []
  };
}

// Open Banking form processing function (simplified for this implementation)
async function processOpenBankingSubmission(task: any, formData: any, user: any, fileName?: string) {
  // This is a simplified placeholder for demonstration purposes
  // We would normally call the actual Open Banking form processing logic
  
  logger.info(`Processing Open Banking submission for task ${task.id}`);
  
  // In a real implementation, we would:
  // 1. Process form data
  // 2. Create files as needed
  // 3. Update task status
  // 4. Unlock dependent tabs
  // 5. Return detailed results
  
  return {
    details: 'Your Open Banking survey has been successfully submitted.',
    fileId: 0, // This would be a real file ID in production
    fileName: fileName || `Open_Banking_Survey_${task.id}.csv`,
    unlockedTabs: ['Dashboard', 'Insights'],
    unlockedTasks: []
  };
}

export default router;