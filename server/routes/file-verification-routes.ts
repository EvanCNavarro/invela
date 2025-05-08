/**
 * File Verification Routes
 * 
 * This module provides API endpoints to verify that file references
 * are correctly set up and working as expected.
 */

import { Router } from "express";
import { db } from "../../db";
import { tasks, files } from "../../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { getFileReference, verifyFileReference } from "../services/standardized-file-reference";
import { logger } from "../utils/logger";

const router = Router();
const moduleLogger = logger.child({ module: 'FileVerificationRoutes' });

/**
 * GET /api/file-verification/:taskId
 * 
 * Verifies if a task has a valid file reference and returns details
 * useful for debugging and testing the file reference system.
 * 
 * This is a diagnostic endpoint used to validate file reference repairs.
 */
router.get('/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        details: 'Task ID must be a valid number'
      });
    }
    
    // Get task data for context
    const taskData = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!taskData) {
      return res.status(404).json({
        error: 'Task not found',
        taskId
      });
    }
    
    // Get file reference using our standardized service
    const fileReference = await getFileReference(taskId);
    
    // Verify file reference for additional details
    const verificationResult = await verifyFileReference(taskId);
    
    let fileData = null;
    if (fileReference && fileReference.fileId) {
      // Get actual file data if available
      fileData = await db.query.files.findFirst({
        where: eq(files.id, fileReference.fileId)
      });
    }
    
    // Return comprehensive verification data
    res.json({
      taskId,
      task: {
        id: taskData.id,
        title: taskData.title,
        task_type: taskData.task_type,
        status: taskData.status,
        metadata: taskData.metadata
      },
      fileReference,
      verification: verificationResult,
      fileData: fileData ? {
        id: fileData.id,
        name: fileData.name,
        type: fileData.type,
        size: fileData.size,
        fileMetadata: fileData.metadata
      } : null
    });
  } catch (error) {
    moduleLogger.error('Error in file verification endpoint', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;