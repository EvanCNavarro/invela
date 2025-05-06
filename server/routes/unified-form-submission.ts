/**
 * Unified Form Submission Router
 * 
 * This router provides a consistent API endpoint for submitting all form types.
 * It uses the transactional form handler to ensure atomic operations and
 * proper error handling.
 */

import { Router } from 'express';
import { submitFormWithTransaction, updateFormWithTransaction } from '../services/transactional-form-handler';
import { calculateAndUpdateProgress } from '../utils/unified-progress-calculator';
import { logger } from '../utils/logger';

const log = logger.child({ module: 'UnifiedFormSubmission' });
const router = Router();

/**
 * Submit a form with transactional integrity
 * 
 * POST /api/forms/submit
 */
router.post('/api/forms/submit', async (req, res) => {
  const { taskId, taskType, formData, options = {} } = req.body;
  
  // Validate required fields
  if (!taskId || !taskType || !formData) {
    return res.status(400).json({
      success: false,
      message: 'taskId, taskType, and formData are required',
    });
  }
  
  try {
    log.info(`Unified form submission endpoint called for task ${taskId} (${taskType})`, {
      taskId,
      taskType,
      hasUserId: !!req.user?.id,
      fieldsCount: Object.keys(formData).length,
      options: Object.keys(options),
    });
    
    // Add the user ID to options if available
    const submissionOptions = {
      ...options,
      userId: req.user?.id,
      source: 'api-unified',
    };
    
    // Use the transactional form handler
    const result = await submitFormWithTransaction(
      taskId,
      taskType,
      formData,
      submissionOptions
    );
    
    log.info(`Form submission result for task ${taskId}:`, {
      taskId,
      success: result.success,
      fileId: result.fileId,
      message: result.message,
    });
    
    return res.json(result);
  } catch (error) {
    log.error(`Error in unified form submission for task ${taskId}:`, error);
    return res.status(500).json({
      success: false,
      taskId,
      message: error instanceof Error ? error.message : 'Unknown error during form submission',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Update a form without submitting
 * 
 * PATCH /api/forms/update
 */
router.patch('/api/forms/update', async (req, res) => {
  const { taskId, taskType, formData, options = {} } = req.body;
  
  // Validate required fields
  if (!taskId || !taskType || !formData) {
    return res.status(400).json({
      success: false,
      message: 'taskId, taskType, and formData are required',
    });
  }
  
  try {
    log.info(`Unified form update endpoint called for task ${taskId} (${taskType})`, {
      taskId,
      taskType,
      hasUserId: !!req.user?.id,
      fieldsCount: Object.keys(formData).length,
      options: Object.keys(options),
    });
    
    // Add the user ID to options if available
    const updateOptions = {
      ...options,
      userId: req.user?.id,
      source: 'api-unified-update',
      preserveProgress: options.preserveProgress !== false, // Default to true
    };
    
    // Use the transactional form handler
    const result = await updateFormWithTransaction(
      taskId,
      taskType,
      formData,
      updateOptions
    );
    
    log.info(`Form update result for task ${taskId}:`, {
      taskId,
      success: result.success,
      message: result.message,
    });
    
    return res.json(result);
  } catch (error) {
    log.error(`Error in unified form update for task ${taskId}:`, error);
    return res.status(500).json({
      success: false,
      taskId,
      message: error instanceof Error ? error.message : 'Unknown error during form update',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Calculate form progress
 * 
 * GET /api/forms/:taskId/progress
 */
router.get('/api/forms/:taskId/progress', async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  const { taskType } = req.query;
  
  if (isNaN(taskId) || !taskType) {
    return res.status(400).json({
      success: false,
      message: 'taskId and taskType are required',
    });
  }
  
  try {
    log.info(`Calculating progress for task ${taskId} (${taskType})`);
    
    // Calculate progress without updating the database
    const result = await calculateAndUpdateProgress(
      taskId,
      taskType as any,
      {
        updateDatabase: false,
        sendWebSocketUpdate: false,
        source: 'api-progress-check',
      }
    );
    
    return res.json(result);
  } catch (error) {
    log.error(`Error calculating progress for task ${taskId}:`, error);
    return res.status(500).json({
      success: false,
      taskId,
      message: error instanceof Error ? error.message : 'Unknown error calculating progress',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Recalculate and update form progress
 * 
 * POST /api/forms/:taskId/recalculate-progress
 */
router.post('/api/forms/:taskId/recalculate-progress', async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  const { taskType, preserveProgress = true } = req.body;
  
  if (isNaN(taskId) || !taskType) {
    return res.status(400).json({
      success: false,
      message: 'taskId and taskType are required',
    });
  }
  
  try {
    log.info(`Recalculating progress for task ${taskId} (${taskType})`, {
      preserveProgress,
    });
    
    // Calculate and update progress
    const result = await calculateAndUpdateProgress(
      taskId,
      taskType,
      {
        updateDatabase: true,
        sendWebSocketUpdate: true,
        preserveProgress,
        source: 'api-progress-recalculate',
        metadata: {
          requestedBy: req.user?.id,
          userTriggered: true,
        },
      }
    );
    
    return res.json(result);
  } catch (error) {
    log.error(`Error recalculating progress for task ${taskId}:`, error);
    return res.status(500).json({
      success: false,
      taskId,
      message: error instanceof Error ? error.message : 'Unknown error recalculating progress',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
