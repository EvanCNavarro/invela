/**
 * KYB Timestamp API Routes
 * 
 * These routes handle field-level timestamps for reliable conflict resolution
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { 
  getTaskTimestamps, 
  saveTaskTimestamps, 
  deleteTaskTimestamps,
  getFieldTimestamp
} from './kyb-timestamp-handler';

const router = Router();

/**
 * GET /api/kyb/timestamps/:taskId
 * Get all timestamps for a specific task
 */
router.get('/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        message: 'Invalid task ID',
        code: 'INVALID_TASK_ID'
      });
    }
    
    const timestamps = await getTaskTimestamps(taskId);
    
    // Convert timestamp objects to a more client-friendly format
    const result: Record<string, number> = {};
    timestamps.forEach(entry => {
      result[entry.fieldKey] = entry.timestamp.getTime();
    });
    
    console.log(`[TimestampAPI] Returning ${timestamps.length} timestamps for task ${taskId}`);
    
    res.json(result);
  } catch (error) {
    console.error('[TimestampRoutes] Error fetching timestamps:', error);
    res.status(500).json({
      message: 'Failed to fetch timestamps',
      code: 'TIMESTAMP_FETCH_ERROR',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/kyb/timestamps/:taskId
 * Save timestamps for a specific task
 */
router.post('/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        message: 'Invalid task ID',
        code: 'INVALID_TASK_ID'
      });
    }
    
    const timestamps = req.body;
    
    if (!timestamps || typeof timestamps !== 'object' || Object.keys(timestamps).length === 0) {
      return res.status(400).json({
        message: 'Invalid timestamp data',
        code: 'INVALID_TIMESTAMP_DATA'
      });
    }
    
    await saveTaskTimestamps(taskId, timestamps);
    
    console.log(`[TimestampAPI] Saved ${Object.keys(timestamps).length} timestamps for task ${taskId}`);
    
    res.json({
      message: 'Timestamps saved successfully',
      count: Object.keys(timestamps).length
    });
  } catch (error) {
    console.error('[TimestampRoutes] Error saving timestamps:', error);
    res.status(500).json({
      message: 'Failed to save timestamps',
      code: 'TIMESTAMP_SAVE_ERROR',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * DELETE /api/kyb/timestamps/:taskId
 * Delete all timestamps for a specific task
 */
router.delete('/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        message: 'Invalid task ID',
        code: 'INVALID_TASK_ID'
      });
    }
    
    await deleteTaskTimestamps(taskId);
    
    res.json({
      message: 'Timestamps deleted successfully'
    });
  } catch (error) {
    console.error('[TimestampRoutes] Error deleting timestamps:', error);
    res.status(500).json({
      message: 'Failed to delete timestamps',
      code: 'TIMESTAMP_DELETE_ERROR',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/kyb/timestamps/:taskId/:fieldKey
 * Get a specific field's timestamp
 */
router.get('/:taskId/:fieldKey', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const fieldKey = req.params.fieldKey;
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        message: 'Invalid task ID',
        code: 'INVALID_TASK_ID'
      });
    }
    
    if (!fieldKey) {
      return res.status(400).json({
        message: 'Missing field key',
        code: 'MISSING_FIELD_KEY'
      });
    }
    
    const timestamp = await getFieldTimestamp(taskId, fieldKey);
    
    if (!timestamp) {
      return res.status(404).json({
        message: 'Timestamp not found',
        code: 'TIMESTAMP_NOT_FOUND'
      });
    }
    
    res.json({
      fieldKey: timestamp.fieldKey,
      timestamp: timestamp.timestamp.getTime()
    });
  } catch (error) {
    console.error('[TimestampRoutes] Error fetching field timestamp:', error);
    res.status(500).json({
      message: 'Failed to fetch field timestamp',
      code: 'TIMESTAMP_FETCH_ERROR',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;