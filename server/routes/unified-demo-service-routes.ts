/**
 * Unified Demo Service Routes
 * 
 * This module provides route handlers for the unified demo service functionality.
 * It allows applying demo data to different form types in a consistent way.
 */

import { Router } from 'express';
import { logger } from '../utils/logger';
import { fillFormWithDemoData } from '../services/unifiedDemoService';

const router = Router();

// Demo auto-fill endpoint for all form types
router.post('/api/demo-autofill/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const { formType } = req.body;
    
    // Validate input
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, error: 'Invalid task ID format' });
    }
    
    if (!formType) {
      return res.status(400).json({ success: false, error: 'Form type is required' });
    }
    
    logger.info(`[UnifiedDemoService] Received demo auto-fill request for task ${taskId}, type ${formType}`);
    
    // Apply demo data with the unified service
    const result = await fillFormWithDemoData(taskId, formType, {
      broadcast: true,
      debug: true,
      markAsTransactional: true
    });
    
    logger.info(`[UnifiedDemoService] Demo auto-fill result for task ${taskId}:`, result);
    
    return res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[UnifiedDemoService] Error processing demo auto-fill request:', error);
    return res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

export default router;
