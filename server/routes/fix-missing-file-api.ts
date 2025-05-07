/**
 * Fix Missing File API
 * 
 * This API provides endpoints for checking and repairing missing form files.
 * It integrates with the standardized file reference service to detect issues
 * and regenerate files when needed.
 */

import express, { Request, Response } from 'express';
import { logger } from '../utils/logger';
import * as StandardizedFileReference from '../services/standardized-file-reference';
import * as fileCreationService from '../services/fileCreation';
import * as WebSocketService from '../utils/unified-websocket';
import { handleErrorResponse } from '../utils/error-handlers';

// Create router
const router = express.Router();

// Add namespace context to logs
const LOG_CONTEXT = { service: 'FixMissingFileAPI' };

/**
 * Check if a task has a missing file and provide repair options
 * GET /api/fix-missing-file/:taskId/check
 */
router.get('/fix-missing-file/:taskId/check', async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.taskId, 10);
  const operationId = `check-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  logger.info(`[${operationId}] Checking file status for task ${taskId}`, LOG_CONTEXT);
  
  try {
    // Check file status using the standardized service
    const fileCheck = await StandardizedFileReference.checkAndPrepareFileRepair(taskId);
    
    // Return the check results
    return res.json({
      success: true,
      taskId,
      ...fileCheck,
      operationId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error(`[${operationId}] Error checking file status for task ${taskId}`, {
      ...LOG_CONTEXT,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return handleErrorResponse(res, 'Error checking file status', error);
  }
});

/**
 * Fix a missing file by regenerating it
 * POST /api/fix-missing-file/:taskId
 */
router.post('/fix-missing-file/:taskId', async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.taskId, 10);
  const operationId = `fix-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Get user ID from session (if available)
  const userId = req.user?.id || 0;
  
  logger.info(`[${operationId}] Attempting to fix missing file for task ${taskId}`, {
    ...LOG_CONTEXT,
    taskId,
    userId,
    hasSession: !!req.user
  });
  
  try {
    // Check file status first
    const fileCheck = await StandardizedFileReference.checkAndPrepareFileRepair(taskId);
    
    if (!fileCheck.needsRepair) {
      logger.info(`[${operationId}] Task ${taskId} doesn't need file repair`, {
        ...LOG_CONTEXT,
        verificationResult: fileCheck.verificationResult
      });
      
      return res.json({
        success: true,
        taskId,
        message: "File check passed, no repair needed",
        wasRepaired: false,
        alreadyValid: true,
        fileId: fileCheck.verificationResult.fileId
      });
    }
    
    // If no task type was determined, we can't proceed
    if (!fileCheck.taskType) {
      return res.status(400).json({
        success: false,
        taskId,
        error: "Unable to determine task type for regeneration"
      });
    }
    
    logger.info(`[${operationId}] Regenerating file for task ${taskId}`, {
      ...LOG_CONTEXT,
      taskId,
      taskType: fileCheck.taskType,
      companyId: fileCheck.companyId
    });
    
    // Generate the file using the file creation service
    const fileResult = await fileCreationService.createTaskFile(
      taskId,
      fileCheck.taskType,
      {}, // Empty form data - the service will fetch the existing responses
      fileCheck.companyId || 0,
      userId
    );
    
    if (!fileResult.success) {
      logger.error(`[${operationId}] Failed to regenerate file for task ${taskId}`, {
        ...LOG_CONTEXT,
        taskId,
        error: fileResult.error
      });
      
      return res.status(500).json({
        success: false,
        taskId,
        error: fileResult.error || "Failed to regenerate file"
      });
    }
    
    // Update file reference using standardized service
    await StandardizedFileReference.repairFileReference(
      taskId,
      fileResult.fileId as number,
      fileResult.fileName || `task-${taskId}-form.pdf`,
      fileCheck.taskType
    );
    
    // Send WebSocket notification about file regeneration
    try {
      WebSocketService.broadcastFileVaultUpdate({
        companyId: fileCheck.companyId || 0,
        fileId: fileResult.fileId as number,
        fileName: fileResult.fileName || `task-${taskId}-form.pdf`,
        action: 'regenerated',
        source: 'fix_missing_file_api'
      });
      
      // Also broadcast task update to refresh UI
      WebSocketService.broadcastTaskUpdate({
        taskId,
        message: 'File regenerated and task updated',
        metadata: {
          fileId: fileResult.fileId,
          fileRegenerated: true,
          regenerationTime: new Date().toISOString()
        }
      });
    } catch (wsError) {
      // Log WebSocket error but don't fail the request
      logger.warn(`[${operationId}] Error sending WebSocket notification`, {
        ...LOG_CONTEXT,
        error: wsError instanceof Error ? wsError.message : 'Unknown WebSocket error'
      });
    }
    
    logger.info(`[${operationId}] Successfully regenerated file for task ${taskId}`, {
      ...LOG_CONTEXT,
      taskId,
      fileId: fileResult.fileId,
      fileName: fileResult.fileName
    });
    
    return res.json({
      success: true,
      taskId,
      message: "File successfully regenerated",
      wasRepaired: true,
      fileId: fileResult.fileId,
      fileName: fileResult.fileName
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error(`[${operationId}] Error fixing missing file for task ${taskId}`, {
      ...LOG_CONTEXT,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return handleErrorResponse(res, 'Error fixing missing file', error);
  }
});

export default router;