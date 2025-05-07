/**
 * Fix Missing File API
 * 
 * This API provides endpoints for checking and repairing missing form files.
 * It integrates with the standardized file reference service to detect issues
 * and regenerate files when needed.
 * 
 * Features:
 * - Comprehensive error handling with consistent response formats
 * - Detailed logging for all operations
 * - Transaction-based file repair operations
 * - Integration with WebSocket notifications
 */

import { Router, Request, Response } from 'express';
import * as standardizedFileService from '../services/standardized-file-reference';
import * as fileGenerator from '../services/file-generator';
import * as transactionManager from '../services/transaction-manager';
import { broadcast } from '../utils/unified-websocket';
import { handleErrorResponse, handleNotFoundError } from '../utils/error-handlers';
import { logger } from '../utils/logger';

const router = Router();
const routeLogger = logger.child({ module: 'FixMissingFileApi' });

/**
 * Check if a task has a missing file and provide repair options
 * GET /api/fix-missing-file/:taskId/check
 */
router.get('/fix-missing-file/:taskId/check', async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.taskId, 10);
  
  if (isNaN(taskId)) {
    return handleErrorResponse(res, "Invalid task ID", new Error("Task ID must be a number"));
  }

  routeLogger.info(`Checking file status for task ${taskId}`);
  
  try {
    // Use the standardized file reference service to check file status
    const checkResult = await standardizedFileService.checkAndPrepareFileRepair(taskId);
    
    // Log detailed results for debugging
    routeLogger.debug(`File check results for task ${taskId}`, {
      taskId,
      hasReference: checkResult.hasReference,
      fileExists: checkResult.fileExists,
      fileId: checkResult.fileId,
      needsRepair: checkResult.needsRepair,
      timestamp: new Date().toISOString()
    });
    
    // Return the check results to the client
    return res.json({
      success: true,
      taskId,
      fileStatus: {
        hasReference: checkResult.hasReference,
        fileExists: checkResult.fileExists,
        fileId: checkResult.fileId,
        needsRepair: checkResult.needsRepair,
        details: checkResult.details
      }
    });
  } catch (error) {
    routeLogger.error(`Error checking file status for task ${taskId}`, { 
      error: error instanceof Error ? error.message : String(error),
      taskId,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return handleErrorResponse(
      res, 
      "Failed to check file status", 
      error instanceof Error ? error : new Error(String(error))
    );
  }
});

/**
 * Fix a missing file by regenerating it
 * POST /api/fix-missing-file/:taskId
 */
router.post('/fix-missing-file/:taskId', async (req: Request, res: Response) => {
  const taskId = parseInt(req.params.taskId, 10);
  
  if (isNaN(taskId)) {
    return handleErrorResponse(res, "Invalid task ID", new Error("Task ID must be a number"));
  }

  routeLogger.info(`Repairing file for task ${taskId}`);
  
  // Start a database transaction to ensure atomic file repair operation
  const transaction = await transactionManager.startTransaction();
  
  try {
    // Check file status first
    const checkResult = await standardizedFileService.checkAndPrepareFileRepair(taskId);
    
    if (!checkResult.needsRepair) {
      routeLogger.info(`Task ${taskId} does not need file repair`, {
        taskId,
        fileId: checkResult.fileId,
        hasReference: checkResult.hasReference,
        fileExists: checkResult.fileExists
      });
      
      // If there's no repair needed, just return the current file info
      await transactionManager.rollbackTransaction(transaction);
      
      return res.json({
        success: true,
        message: "File is already available, no repair needed",
        taskId,
        fileId: checkResult.fileId,
        needsRepair: false,
        details: checkResult.details
      });
    }
    
    // Retrieve task type to determine which file generator to use
    const taskInfo = await fileGenerator.getTaskInfo(taskId, transaction);
    
    if (!taskInfo) {
      await transactionManager.rollbackTransaction(transaction);
      return handleNotFoundError(res, "Task", taskId);
    }
    
    // Generate a new file based on task type
    routeLogger.info(`Generating new file for task ${taskId} (${taskInfo.taskType})`);
    
    const generationResult = await fileGenerator.generateFileForTask(
      taskId,
      taskInfo.taskType,
      transaction
    );
    
    if (!generationResult.success) {
      throw new Error(`File generation failed: ${generationResult.error}`);
    }
    
    // Store the file reference using the standardized service
    const storeResult = await standardizedFileService.repairFileReference(
      taskId,
      generationResult.fileId!,
      generationResult.fileName || `task_${taskId}_file.json`,
      taskInfo.taskType,
      transaction
    );
    
    // Commit the transaction
    await transactionManager.commitTransaction(transaction);
    
    // Log the successful repair
    routeLogger.info(`File repair successful for task ${taskId}`, {
      taskId,
      newFileId: generationResult.fileId,
      taskType: taskInfo.taskType,
      timestamp: new Date().toISOString()
    });
    
    // Notify clients about the file update via WebSocket
    try {
      broadcast('task_updated', {
        taskId,
        message: `File regenerated (ID: ${generationResult.fileId})`,
        metadata: {
          fileId: generationResult.fileId,
          fileRepaired: true,
          timestamp: new Date().toISOString()
        }
      });
      
      routeLogger.debug(`WebSocket notification sent for task ${taskId} file repair`);
    } catch (wsError) {
      // Just log WebSocket errors, don't fail the whole request
      routeLogger.warn(`Failed to send WebSocket notification for file repair`, {
        taskId,
        error: wsError instanceof Error ? wsError.message : String(wsError)
      });
    }
    
    // Return success response with file details
    return res.json({
      success: true,
      message: "File successfully regenerated",
      taskId,
      fileId: generationResult.fileId,
      fileName: generationResult.fileName,
      taskType: taskInfo.taskType,
      details: "The missing file has been regenerated. You can now download it."
    });
    
  } catch (error) {
    // Rollback the transaction if anything fails
    await transactionManager.rollbackTransaction(transaction);
    
    routeLogger.error(`Error repairing file for task ${taskId}`, { 
      error: error instanceof Error ? error.message : String(error),
      taskId,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return handleErrorResponse(
      res, 
      "Failed to repair file", 
      error instanceof Error ? error : new Error(String(error))
    );
  }
});

export default router;