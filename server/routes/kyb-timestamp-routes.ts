/**
 * KYB Timestamp API Routes
 * 
 * These routes handle field-level timestamps for reliable conflict resolution
 */

import express from 'express';
import { 
  getKybTimestamps, 
  saveKybTimestamps, 
  deleteKybTimestamps,
  getFieldTimestamp
} from './kyb-timestamp-handler';

const timestampRouter = express.Router();

/**
 * GET /api/kyb/timestamps/:taskId
 * Get all timestamps for a specific task
 */
timestampRouter.get('/timestamps/:taskId', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, error: 'Invalid task ID' });
    }

    const timestamps = await getKybTimestamps(taskId, req.user.id);
    return res.json({ success: true, timestamps });
  } catch (error) {
    console.error('[Timestamp API] Error getting timestamps:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve timestamps',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/kyb/timestamps/:taskId
 * Save timestamps for a specific task
 */
timestampRouter.post('/timestamps/:taskId', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, error: 'Invalid task ID' });
    }

    const { timestamps } = req.body;
    if (!timestamps || typeof timestamps !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid timestamps object' });
    }

    const savedTimestamps = await saveKybTimestamps(taskId, req.user.id, timestamps);
    return res.json({ success: true, timestamps: savedTimestamps });
  } catch (error) {
    console.error('[Timestamp API] Error saving timestamps:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to save timestamps',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/kyb/timestamps/:taskId
 * Delete all timestamps for a specific task
 */
timestampRouter.delete('/timestamps/:taskId', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, error: 'Invalid task ID' });
    }

    const success = await deleteKybTimestamps(taskId, req.user.id);
    return res.json({ success });
  } catch (error) {
    console.error('[Timestamp API] Error deleting timestamps:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete timestamps',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/kyb/timestamps/:taskId/:fieldKey
 * Get a specific field's timestamp
 */
timestampRouter.get('/timestamps/:taskId/:fieldKey', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ success: false, error: 'Invalid task ID' });
    }

    const fieldKey = req.params.fieldKey;
    if (!fieldKey) {
      return res.status(400).json({ success: false, error: 'Field key is required' });
    }

    const timestamp = await getFieldTimestamp(taskId, fieldKey);
    return res.json({ 
      success: true, 
      fieldKey,
      timestamp,
      hasTimestamp: timestamp !== null
    });
  } catch (error) {
    console.error('[Timestamp API] Error getting field timestamp:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve field timestamp',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default timestampRouter;