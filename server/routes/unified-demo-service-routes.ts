/**
 * Unified Demo Service Routes
 * 
 * This module provides API endpoints for applying demo data with atomic progress
 * updates using a transactional approach to ensure data consistency.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { applyDemoDataTransactional } from '../services/unifiedDemoService';

const router = Router();

/**
 * Apply demo data to any form type with atomic progress update
 * 
 * @route POST /api/forms/demo-autofill/:taskId
 */
router.post('/api/forms/demo-autofill/:taskId', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  const { formType } = req.body;
  
  if (isNaN(taskId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid task ID format'
    });
  }
  
  logger.info('[Unified Demo Routes] Applying demo data with atomic progress update', {
    taskId,
    formType,
    userId: req.user?.id
  });
  
  try {
    // Use the transaction-based service that handles both demo data and progress atomically
    const result = await applyDemoDataTransactional(
      taskId,
      formType,
      req.user?.id
    );
    
    // Return success response
    return res.json({
      ...result,
      taskId
    });
  } catch (error) {
    logger.error('[Unified Demo Routes] Error applying demo data', {
      taskId,
      formType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Determine appropriate status code
    const statusCode = 
      error instanceof Error && error.message.includes('not found') ? 404 : 
      error instanceof Error && error.message.includes('demo companies') ? 403 : 
      400;
    
    return res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      taskId
    });
  }
});

/**
 * Apply demo data to KY3P form with atomic progress update
 * For backward compatibility
 * 
 * @route POST /api/ky3p/demo-autofill/:taskId
 */
router.post('/api/ky3p/demo-autofill/:taskId', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  
  // Set form type explicitly for KY3P endpoint
  req.body.formType = 'ky3p';
  
  logger.info('[Unified Demo Routes] KY3P demo autofill redirecting to unified endpoint', {
    taskId,
    userId: req.user?.id
  });
  
  try {
    // Use the transaction-based service that handles both demo data and progress atomically
    const result = await applyDemoDataTransactional(
      taskId,
      'ky3p',
      req.user?.id
    );
    
    // Return success response
    return res.json({
      ...result,
      taskId
    });
  } catch (error) {
    logger.error('[Unified Demo Routes] Error applying KY3P demo data', {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Determine appropriate status code
    const statusCode = 
      error instanceof Error && error.message.includes('not found') ? 404 : 
      error instanceof Error && error.message.includes('demo companies') ? 403 : 
      400;
    
    return res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      taskId
    });
  }
});

/**
 * Apply demo data to Open Banking form with atomic progress update
 * For backward compatibility
 * 
 * @route POST /api/open-banking/demo-autofill/:taskId
 */
router.post('/api/open-banking/demo-autofill/:taskId', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  
  // Set form type explicitly for Open Banking endpoint
  req.body.formType = 'open_banking';
  
  logger.info('[Unified Demo Routes] Open Banking demo autofill redirecting to unified endpoint', {
    taskId,
    userId: req.user?.id
  });
  
  try {
    // Use the transaction-based service
    const result = await applyDemoDataTransactional(
      taskId,
      'open_banking',
      req.user?.id
    );
    
    // Return success response
    return res.json({
      ...result,
      taskId
    });
  } catch (error) {
    logger.error('[Unified Demo Routes] Error applying Open Banking demo data', {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Determine appropriate status code
    const statusCode = 
      error instanceof Error && error.message.includes('not found') ? 404 : 
      400;
    
    return res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      taskId
    });
  }
});

/**
 * Apply demo data to KYB form with atomic progress update
 * For backward compatibility
 * 
 * @route POST /api/kyb/demo-autofill/:taskId
 */
router.post('/api/kyb/demo-autofill/:taskId', requireAuth, async (req, res) => {
  const taskId = parseInt(req.params.taskId, 10);
  
  // Set form type explicitly for KYB endpoint
  req.body.formType = 'company_kyb';
  
  logger.info('[Unified Demo Routes] KYB demo autofill redirecting to unified endpoint', {
    taskId,
    userId: req.user?.id
  });
  
  try {
    // Use the transaction-based service
    const result = await applyDemoDataTransactional(
      taskId,
      'company_kyb',
      req.user?.id
    );
    
    // Return success response
    return res.json({
      ...result,
      taskId
    });
  } catch (error) {
    logger.error('[Unified Demo Routes] Error applying KYB demo data', {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Determine appropriate status code
    const statusCode = 
      error instanceof Error && error.message.includes('not found') ? 404 : 
      400;
    
    return res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      taskId
    });
  }
});

export default router;
