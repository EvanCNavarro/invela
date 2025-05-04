/**
 * KY3P Field Key Router
 * 
 * This module provides API endpoints for working with KY3P forms using the field_key approach,
 * which is consistent with how the KYB and Open Banking forms work.
 */

import { Router, Application } from 'express';
import { logger } from '../utils/logger';
import { updateKy3pFieldByKey, getKy3pResponsesByFieldKey } from '../utils/unified-ky3p-handler';
import { populateKy3pResponseFieldKeys } from '../utils/ky3p-field-key-migration';

const router = Router();

/**
 * Get all responses for a KY3P task keyed by field_key
 */
router.get('/responses-by-key/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid task ID: ${req.params.taskId}`,
      });
    }
    
    const result = await getKy3pResponsesByFieldKey(taskId);
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error('[KY3P-FIELD-KEY-ROUTER] Error getting responses by field key:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error getting responses by field key',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Trigger migration to populate field_key for KY3P responses
 */
router.post('/migrate-to-field-key', async (req, res) => {
  try {
    const result = await populateKy3pResponseFieldKeys();
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error('[KY3P-FIELD-KEY-ROUTER] Error migrating to field key:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error migrating to field key',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Set a field value by field_key for a KY3P task
 */
router.post('/set-field/:taskId/:fieldKey', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const fieldKey = req.params.fieldKey;
    const { value, status } = req.body;
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid task ID: ${req.params.taskId}`,
      });
    }
    
    if (!fieldKey) {
      return res.status(400).json({
        success: false,
        message: 'Field key is required',
      });
    }
    
    if (value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Value is required',
      });
    }
    
    const result = await updateKy3pFieldByKey(taskId, fieldKey, value, status);
    
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error('[KY3P-FIELD-KEY-ROUTER] Error setting field value:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error setting field value',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

export function registerKY3PFieldKeyRouter(app: Application) {
  // Use the router with the application
  app.use('/api/ky3p', router);
  console.log('[KY3P-FIELD-KEY] Successfully registered KY3P field key router');
}