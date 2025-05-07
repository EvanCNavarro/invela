/**
 * API Endpoint to Fix Missing Files
 * 
 * This module provides an API endpoint that allows the frontend to request
 * regeneration of missing files for tasks that have been submitted but
 * don't show the file in the UI.
 */

import { Router } from 'express';
import { generateMissingFileForTask, FileFixResult } from './fix-missing-file';
import { logger } from '../utils/logger';

const router = Router();

// Endpoint to fix missing file for a task
router.post('/api/fix-missing-file/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID'
      });
    }
    
    logger.info(`Received request to fix missing file for task ${taskId}`);
    
    // Generate the missing file
    const result = await generateMissingFileForTask(taskId);
    
    if (result.success) {
      logger.info(`Successfully fixed missing file for task ${taskId}`, {
        fileId: result.fileId,
        fileName: result.fileName
      });
      
      return res.status(200).json({
        success: true,
        fileId: result.fileId,
        fileName: result.fileName,
        message: `Successfully generated file for task ${taskId}`
      });
    } else {
      logger.error(`Failed to fix missing file for task ${taskId}`, {
        error: result.error
      });
      
      return res.status(500).json({
        success: false,
        error: result.error || 'Unknown error occurred'
      });
    }
  } catch (error) {
    logger.error('Error in fix-missing-file endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;