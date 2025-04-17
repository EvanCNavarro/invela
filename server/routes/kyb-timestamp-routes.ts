/**
 * KYB Timestamp Routes
 * 
 * API routes for handling field-level timestamps for KYB forms
 */

import express from 'express';
import { saveFieldTimestamps, getFieldTimestamps } from './kyb-timestamp-handler';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all timestamp routes
router.use(requireAuth);

/**
 * Save field-level timestamps for a KYB task
 * POST /api/kyb/timestamps/:taskId
 */
router.post('/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { timestamps } = req.body;
    
    if (!timestamps || typeof timestamps !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid timestamps format'
      });
    }
    
    await saveFieldTimestamps(taskId, timestamps);
    
    return res.json({
      success: true
    });
  } catch (error) {
    console.error('Error saving timestamps:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save timestamps'
    });
  }
});

/**
 * Get field-level timestamps for a KYB task
 * GET /api/kyb/timestamps/:taskId
 */
router.get('/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const timestamps = await getFieldTimestamps(taskId);
    
    return res.json({
      success: true,
      timestamps
    });
  } catch (error) {
    console.error('Error getting timestamps:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve timestamps'
    });
  }
});

export default router;