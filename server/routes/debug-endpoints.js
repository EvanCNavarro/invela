/**
 * Debug endpoints for testing and troubleshooting
 * 
 * These endpoints are for development and testing purposes only.
 * They should NOT be enabled in production environments.
 */

const express = require('express');
const { updateTaskProgressAndBroadcast } = require('../utils/unified-task-progress');
const router = express.Router();

// Import database and schema
const { db } = require('@db');
const { tasks, ky3pResponses, kybResponses, ky3pFields, kybFields, openBankingResponses, openBankingFields } = require('@db/schema');
const { eq, and, count } = require('drizzle-orm');

/**
 * Get all KY3P tasks for testing purposes
 */
router.get('/ky3p-tasks', async (req, res) => {
  try {
    const tasksList = await db
      .select()
      .from(tasks)
      .where(eq(tasks.task_type, 'ky3p'));
      
    return res.json({
      success: true,
      count: tasksList.length,
      tasks: tasksList
    });
  } catch (error) {
    console.error(`[DebugEndpoints] Error fetching KY3P tasks:`, error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get KY3P field definitions for testing purposes
 */
router.get('/ky3p-fields', async (req, res) => {
  try {
    const fields = await db
      .select()
      .from(ky3pFields)
      .limit(100);
      
    return res.json({
      success: true,
      count: fields.length,
      fields
    });
  } catch (error) {
    console.error(`[DebugEndpoints] Error fetching KY3P fields:`, error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Direct test endpoint for the unified task progress system
 */
router.post('/test-unified-progress', async (req, res) => {
  const { taskId, taskType, forceUpdate = false, debug = true } = req.body;
  
  if (!taskId || !taskType) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: taskId and taskType'
    });
  }
  
  try {
    console.log(`[DebugEndpoints] Testing unified progress for task ${taskId} (${taskType})`);
    
    // Get initial task state for comparison
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Task ${taskId} not found`
      });
    }
    
    const initialProgress = task.progress;
    const initialStatus = task.status;
    
    // Count completed responses for this task
    let completedCount = 0;
    let totalFields = 0;
    
    if (taskType === 'ky3p') {
      const [result] = await db
        .select({ count: count() })
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            eq(ky3pResponses.status, 'COMPLETE')
          )
        );
      completedCount = result?.count || 0;
      
      // Get total field count
      const [totalResult] = await db
        .select({ count: count() })
        .from(ky3pFields);
      totalFields = totalResult?.count || 0;
    } 
    else if (taskType === 'company_kyb') {
      const [result] = await db
        .select({ count: count() })
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            eq(kybResponses.status, 'COMPLETE')
          )
        );
      completedCount = result?.count || 0;
      
      // Get total field count
      const [totalResult] = await db
        .select({ count: count() })
        .from(kybFields);
      totalFields = totalResult?.count || 0;
    }
    else if (taskType === 'open_banking') {
      const [result] = await db
        .select({ count: count() })
        .from(openBankingResponses)
        .where(
          and(
            eq(openBankingResponses.task_id, taskId),
            eq(openBankingResponses.status, 'COMPLETE')
          )
        );
      completedCount = result?.count || 0;
      
      // Get total field count
      const [totalResult] = await db
        .select({ count: count() })
        .from(openBankingFields);
      totalFields = totalResult?.count || 0;
    }
    
    // Call the unified progress update function
    const result = await updateTaskProgressAndBroadcast(taskId, taskType, {
      debug,
      forceUpdate
    });
    
    // Get updated task state
    const [updatedTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    return res.json({
      success: true,
      taskId,
      taskType,
      initialProgress,
      initialStatus,
      updatedProgress: updatedTask.progress,
      updatedStatus: updatedTask.status,
      fieldCounts: {
        completed: completedCount,
        total: totalFields,
        calculatedPercentage: totalFields > 0 ? Math.round((completedCount / totalFields) * 100) : 0
      },
      result
    });
  } catch (error) {
    console.error(`[DebugEndpoints] Error testing unified progress:`, error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Important: Only register these routes in development environments
module.exports = router;
