/**
 * Universal Clear Fields Router
 * 
 * Provides a uniform endpoint to clear fields for any form type
 */

import { Router } from "express";
import universalClearFieldsService from "../services/universalClearFieldsService";
import { db } from "@db";
import { tasks } from "@db/schema";
import { eq } from "drizzle-orm";

const logger = {
  info: (message: string, data?: any) => console.log(message, data),
  error: (message: string, data?: any) => console.error(message, data)
};

const router = Router();

/**
 * POST /api/universal-clear-fields/:taskId
 * 
 * Clears all field values for a specified task, regardless of form type
 */
router.post("/:taskId", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID provided",
      });
    }
    
    // Get task type from database
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task with ID ${taskId} not found`,
      });
    }
    
    // Extract task type
    const taskType = task.task_type;
    
    logger.info(`[UniversalClearFieldsRouter] Processing clear fields request for task ${taskId} (${taskType})`, {
      taskId,
      taskType,
      userId: req.user?.id,
      timestamp: new Date(),
    });
    
    // Clear all fields for this task
    const clearResult = await universalClearFieldsService.clearAllFields(taskId, taskType);
    
    if (!clearResult.success) {
      return res.status(500).json({
        success: false,
        message: clearResult.message,
      });
    }
    
    // Reset task progress
    const resetResult = await universalClearFieldsService.resetTaskProgress(taskId);
    
    if (!resetResult.success) {
      return res.status(500).json({
        success: false,
        message: resetResult.message,
      });
    }
    
    return res.status(200).json({
      success: true,
      clearedCount: clearResult.clearedCount,
      message: `Successfully cleared ${clearResult.clearedCount} fields and reset progress for task ${taskId}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[UniversalClearFieldsRouter] Error processing clear fields request: ${errorMessage}`);
    
    return res.status(500).json({
      success: false,
      message: `Server error: ${errorMessage}`,
    });
  }
});

export default router;