/**
 * KY3P Field Key Router
 * 
 * This module provides API endpoints for KY3P form fields using
 * the new string-based field_key approach instead of numeric field_id.
 */

import { Router } from 'express';
import { logger } from '../utils/logger';
import { populateKy3pResponseFieldKeys } from '../utils/ky3p-field-key-migration';
import { updateKy3pFieldByKey, getKy3pResponsesByFieldKey } from '../utils/unified-ky3p-handler';

/**
 * Register KY3P field key routes
 * 
 * @returns Router with KY3P field key routes
 */
export function registerKY3PFieldKeyRouter() {
  logger.info('[KY3P-FIELD-KEY] Registering KY3P field key routes');
  
  const router = Router();

  /**
   * Trigger the migration of KY3P responses to use field_key
   */
  router.post('/api/ky3p/migrate-to-field-key', async (req, res) => {
    logger.info('[KY3P-FIELD-KEY] Received request to migrate KY3P responses to use field_key');
    
    try {
      const result = await populateKy3pResponseFieldKeys();
      
      return res.status(200).json({
        success: result.success,
        message: result.message,
        count: result.count || 0
      });
    } catch (error) {
      logger.error('[KY3P-FIELD-KEY] Error migrating KY3P responses:', error);
      return res.status(500).json({
        success: false,
        message: 'Error migrating KY3P responses',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Set a single KY3P field by field_key
   */
  router.post('/api/ky3p/set-field/:taskId/:fieldKey', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const fieldKey = req.params.fieldKey;
    const { value, status } = req.body;
    
    logger.info(`[KY3P-FIELD-KEY] Received request to set field ${fieldKey} for task ${taskId}`);
    
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    if (!fieldKey) {
      return res.status(400).json({ error: 'Field key is required' });
    }
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }
    
    try {
      const result = await updateKy3pFieldByKey(taskId, fieldKey, String(value), status);
      
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      logger.error(`[KY3P-FIELD-KEY] Error setting field ${fieldKey}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error setting field',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get all KY3P responses for a task, keyed by field_key
   */
  router.get('/api/ky3p/responses-by-key/:taskId', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    
    logger.info(`[KY3P-FIELD-KEY] Received request to get responses by key for task ${taskId}`);
    
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    try {
      const result = await getKy3pResponsesByFieldKey(taskId);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message || 'Error getting responses'
        });
      }
      
      return res.status(200).json({
        success: true,
        responses: result.responses
      });
    } catch (error) {
      logger.error(`[KY3P-FIELD-KEY] Error getting responses:`, error);
      return res.status(500).json({
        success: false,
        message: 'Error getting responses',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  return router;
}
