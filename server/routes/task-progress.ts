/**
 * Task Progress Routes
 * 
 * Defines API endpoints for calculating and updating task progress
 * using the new unified progress calculation approach.
 */

import express from 'express';
import { calculateAndUpdateTaskProgress } from '../utils/unified-progress-fixed';

const router = express.Router();

/**
 * Calculate task progress
 * 
 * GET /api/task-progress/:taskId
 * 
 * Calculates the current progress for a task without updating the database
 */
router.get('/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const taskType = req.query.taskType as string;
    
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    if (!taskType) {
      return res.status(400).json({ error: 'Task type is required' });
    }
    
    const result = await calculateAndUpdateTaskProgress(taskId, taskType, {
      updateDatabase: false,  // Don't update the database
      broadcastUpdate: false, // Don't broadcast the update
      source: 'api_get'
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[TaskProgressRoutes] Error calculating task progress:', error);
    return res.status(500).json({ 
      error: 'Failed to calculate task progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update task progress
 * 
 * POST /api/task-progress/:taskId
 * 
 * Calculates the current progress for a task and updates the database
 */
router.post('/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { taskType, source } = req.body;
    
    if (!taskId || isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    if (!taskType) {
      return res.status(400).json({ error: 'Task type is required in request body' });
    }
    
    const result = await calculateAndUpdateTaskProgress(taskId, taskType, {
      updateDatabase: true,  // Update the database
      broadcastUpdate: true, // Broadcast the update
      source: source || 'api_post'
    });
    
    return res.json(result);
  } catch (error) {
    console.error('[TaskProgressRoutes] Error updating task progress:', error);
    return res.status(500).json({ 
      error: 'Failed to update task progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
