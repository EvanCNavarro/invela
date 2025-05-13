/**
 * Unified Clear Fields Router
 * 
 * This router provides a unified endpoint for clearing form fields across all form types
 * (KYB, KY3P, Open Banking, etc.) with proper transaction handling and WebSocket updates.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { clearFormFields, FormType } from '../services/unified-clear-fields';

const router = Router();

/**
 * Unified endpoint for clearing form fields across all form types
 * 
 * This endpoint accepts the form type as a parameter, ensuring consistent
 * handling across all form types with proper error handling and WebSocket broadcasting.
 */
router.post('/api/:formType/clear/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const formTypeParam = req.params.formType;
    const userId = req.user!.id;
    const companyId = req.user!.company_id;
    
    // Get preserveProgress parameter from query or body
    const preserveProgress = req.query.preserveProgress === 'true' || 
                           req.body.preserveProgress === true;
    
    // Use form type directly - our new implementation handles the mapping internally
    let formType = formTypeParam as FormType;
    
    // Input validation
    if (isNaN(taskId)) {
      logger.warn(`[UnifiedClear] Invalid task ID: ${req.params.taskId}`, {
        userId,
        companyId,
        formType
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    logger.info(`[UnifiedClear] Processing clear request`, {
      taskId,
      userId,
      companyId,
      formType,
      preserveProgress
    });
    
    // Call the unified service
    const result = await clearFormFields(
      taskId,
      formType,
      userId,
      companyId,
      preserveProgress
    );
    
    if (!result.success) {
      logger.warn(`[UnifiedClear] Failed to clear fields`, {
        taskId,
        formType,
        error: result.error || 'Unknown error'
      });
      return res.status(result.error ? 500 : 404).json(result);
    }
    
    // Return success response with consistent format
    return res.status(200).json({
      success: true,
      message: result.message,
      taskId,
      status: result.status,
      progress: result.progress
    });
  } catch (error) {
    const errorDetails = {
      taskId: parseInt(req.params.taskId, 10),
      formType: req.params.formType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
    
    logger.error(`[UnifiedClear] Unhandled error clearing fields`, errorDetails);
    
    return res.status(500).json({
      success: false,
      message: 'Error clearing fields',
      error: errorDetails.error
    });
  }
});

/**
 * Special route handler for backward compatibility with existing routes
 * 
 * These routes match the pattern used by the ClearFieldsButton component:
 * - /api/kyb/clear/:taskId
 * - /api/ky3p/clear/:taskId
 * - /api/open-banking/clear/:taskId
 */

// KYB Clear fields endpoint
router.post('/api/kyb/clear/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const userId = req.user!.id;
    const companyId = req.user!.company_id;
    const preserveProgress = req.query.preserveProgress === 'true' || 
                           req.body.preserveProgress === true;
    
    logger.info(`[KYB Clear] Redirecting to unified clear endpoint`, {
      taskId,
      userId,
      preserveProgress
    });
    
    const result = await clearFormFields(
      taskId,
      'company_kyb',
      userId,
      companyId,
      preserveProgress
    );
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error(`[KYB Clear] Error clearing fields:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      taskId: parseInt(req.params.taskId, 10)
    });
    return res.status(500).send('Error clearing fields');
  }
});

// KY3P Clear fields endpoint
router.post('/api/ky3p/clear/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const userId = req.user!.id;
    const companyId = req.user!.company_id;
    const preserveProgress = req.query.preserveProgress === 'true' || 
                           req.body.preserveProgress === true;
    
    logger.info(`[KY3P Clear] Redirecting to unified clear endpoint`, {
      taskId,
      userId,
      preserveProgress
    });
    
    const result = await clearFormFields(
      taskId,
      'ky3p',
      userId,
      companyId,
      preserveProgress
    );
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error(`[KY3P Clear] Error clearing fields:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      taskId: parseInt(req.params.taskId, 10)
    });
    return res.status(500).send('Error clearing fields');
  }
});

// Open Banking Clear fields endpoint
router.post('/api/open-banking/clear/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const userId = req.user!.id;
    const companyId = req.user!.company_id;
    const preserveProgress = req.query.preserveProgress === 'true' || 
                           req.body.preserveProgress === true;
    
    logger.info(`[Open Banking Clear] Redirecting to unified clear endpoint`, {
      taskId,
      userId,
      preserveProgress
    });
    
    const result = await clearFormFields(
      taskId,
      'open_banking',
      userId,
      companyId,
      preserveProgress
    );
    
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error(`[Open Banking Clear] Error clearing fields:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      taskId: parseInt(req.params.taskId, 10)
    });
    return res.status(500).send('Error clearing fields');
  }
});

export default router;