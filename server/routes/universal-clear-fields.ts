/**
 * Universal clear fields router
 * 
 * This router creates a unified endpoint for clearing form fields
 * across all form types, with improved error handling and more
 * detailed response messages.
 */

import express from 'express';
import { db } from '@db';
import { requireAuth } from '../middleware/auth';
import { eq } from 'drizzle-orm';
import { tasks, kybResponses, ky3pResponses, openBankingResponses } from '@db/schema';
// Create a router
const router = express.Router();

// Apply auth middleware
router.use(requireAuth);

// Universal clear fields route for all form types
router.post('/:taskId', async (req, res) => {
  const taskId = parseInt(req.params.taskId);
  const { taskType } = req.body;

  // Validate inputs
  if (!taskId || isNaN(taskId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid task ID provided'
    });
  }

  try {
    // First, check that the task exists and get its type
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: `Task ID ${taskId} not found`
      });
    }

    // Use the provided task type or fall back to the task's task_type
    const effectiveTaskType = taskType || task.task_type;
    console.log(`[Universal Clear Fields] Clearing fields for task ${taskId} (${effectiveTaskType})`);

    // Determine which table to clear based on task type
    let clearedCount = 0;
    
    if (effectiveTaskType === 'kyb' || effectiveTaskType === 'company_kyb') {
      // Clear KYB responses
      const result = await db.delete(kybResponses)
        .where(eq(kybResponses.task_id, taskId))
        .returning();
      
      clearedCount = result.length;
      console.log(`[Universal Clear Fields] Cleared ${clearedCount} KYB responses for task ${taskId}`);
    } 
    else if (effectiveTaskType === 'ky3p' || effectiveTaskType === 'security' || 
             effectiveTaskType === 'security_assessment' || effectiveTaskType === 'sp_ky3p_assessment') {
      // Clear KY3P responses
      const result = await db.delete(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId))
        .returning();
      
      clearedCount = result.length;
      console.log(`[Universal Clear Fields] Cleared ${clearedCount} KY3P responses for task ${taskId}`);
    } 
    else if (effectiveTaskType === 'open_banking' || effectiveTaskType === 'open_banking_survey') {
      // Clear Open Banking responses
      const result = await db.delete(openBankingResponses)
        .where(eq(openBankingResponses.task_id, taskId))
        .returning();
      
      clearedCount = result.length;
      console.log(`[Universal Clear Fields] Cleared ${clearedCount} Open Banking responses for task ${taskId}`);
    } 
    else {
      return res.status(400).json({
        success: false,
        message: `Unsupported task type: ${effectiveTaskType}`
      });
    }

    // Also clear any saved form data in the tasks table
    let updateResult;
    try {
      updateResult = await db.update(tasks)
        .set({ 
          savedFormData: null,
          progress: 0,
          status: 'in_progress' 
        })
        .where(eq(tasks.id, taskId))
        .returning();
    } catch (updateError) {
      console.error(`[Universal Clear Fields] Error updating task status: ${updateError}`);
    }

    // Return success response
    return res.status(200).json({
      success: true,
      clearedCount,
      message: `Successfully cleared ${clearedCount} fields for ${effectiveTaskType} task`,
      taskStatus: updateResult?.[0]?.status || 'unknown'
    });
  } catch (error) {
    console.error(`[Universal Clear Fields] Error clearing fields: ${error}`);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'An internal server error occurred'
    });
  }
});

export default router;