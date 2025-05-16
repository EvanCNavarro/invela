/**
 * Task Consistency Fix Routes
 * 
 * This module provides API endpoints for checking and fixing task status/progress inconsistencies.
 */

const express = require('express');
const { logger } = require('../utils/logger');
const { 
  checkTaskConsistency, 
  fixTaskConsistency,
  updateTaskStatusAndProgress 
} = require('../utils/atomic-task-update');
const { requireAuth } = require('../middleware/auth');
const { db } = require('@db');
const { tasks } = require('@db/schema');
const { eq, or, and } = require('drizzle-orm');

/**
 * Register task consistency routes
 * 
 * @returns {express.Router} Express router with task consistency endpoints
 */
function registerTaskConsistencyRoutes() {
  const router = express.Router();
  
  /**
   * GET /api/tasks/:taskId/check-consistency
   * 
   * Check if a task's status and progress are consistent
   */
  router.get('/api/tasks/:taskId/check-consistency', requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      
      if (isNaN(taskId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid task ID format'
        });
      }
      
      logger.info('[TaskConsistency] Checking consistency for task', { taskId });
      
      const result = await checkTaskConsistency(taskId);
      
      return res.json({
        success: true,
        consistent: result.consistent,
        task: {
          id: result.task?.id,
          status: result.task?.status,
          progress: result.task?.progress,
          task_type: result.task?.task_type
        },
        issues: result.issues
      });
    } catch (error) {
      logger.error('[TaskConsistency] Error checking task consistency', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to check task consistency'
      });
    }
  });
  
  /**
   * POST /api/tasks/:taskId/fix-consistency
   * 
   * Fix inconsistencies in a task's status and progress
   */
  router.post('/api/tasks/:taskId/fix-consistency', requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      
      if (isNaN(taskId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid task ID format'
        });
      }
      
      logger.info('[TaskConsistency] Fixing consistency for task', { taskId });
      
      const result = await fixTaskConsistency(taskId);
      
      return res.json({
        success: result.success,
        message: result.message,
        fixed: result.fixed
      });
    } catch (error) {
      logger.error('[TaskConsistency] Error fixing task consistency', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to fix task consistency'
      });
    }
  });
  
  /**
   * GET /api/tasks/find-inconsistent
   * 
   * Find tasks with inconsistent status and progress
   */
  router.get('/api/tasks/find-inconsistent', requireAuth, async (req, res) => {
    try {
      logger.info('[TaskConsistency] Finding inconsistent tasks');
      
      // Find tasks with inconsistent status and progress
      const inconsistentTasks = await db.select({
        id: tasks.id,
        status: tasks.status,
        progress: tasks.progress,
        task_type: tasks.task_type
      })
      .from(tasks)
      .where(
        or(
          and(
            eq(tasks.status, 'submitted'),
            sql`${tasks.progress} < 100`
          ),
          and(
            eq(tasks.progress, 100),
            sql`${tasks.status} != 'submitted'`
          )
        )
      )
      .limit(100); // Limit to 100 results for performance
      
      logger.info('[TaskConsistency] Found inconsistent tasks', { 
        count: inconsistentTasks.length
      });
      
      return res.json({
        success: true,
        count: inconsistentTasks.length,
        tasks: inconsistentTasks
      });
    } catch (error) {
      logger.error('[TaskConsistency] Error finding inconsistent tasks', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to find inconsistent tasks'
      });
    }
  });
  
  /**
   * POST /api/tasks/fix-all-inconsistent
   * 
   * Fix all inconsistent tasks (limit 100 at a time)
   */
  router.post('/api/tasks/fix-all-inconsistent', requireAuth, async (req, res) => {
    try {
      logger.info('[TaskConsistency] Fixing all inconsistent tasks');
      
      // Find tasks with inconsistent status and progress
      const inconsistentTasks = await db.select({
        id: tasks.id,
        status: tasks.status,
        progress: tasks.progress,
        task_type: tasks.task_type
      })
      .from(tasks)
      .where(
        or(
          and(
            eq(tasks.status, 'submitted'),
            sql`${tasks.progress} < 100`
          ),
          and(
            eq(tasks.progress, 100),
            sql`${tasks.status} != 'submitted'`
          )
        )
      )
      .limit(100); // Limit to 100 results for performance
      
      if (inconsistentTasks.length === 0) {
        return res.json({
          success: true,
          message: 'No inconsistent tasks found',
          fixed: 0
        });
      }
      
      logger.info('[TaskConsistency] Found inconsistent tasks to fix', { 
        count: inconsistentTasks.length
      });
      
      // Fix each task
      const results = [];
      
      for (const task of inconsistentTasks) {
        try {
          const result = await fixTaskConsistency(task.id);
          results.push({
            taskId: task.id,
            success: result.success,
            message: result.message,
            fixed: result.fixed
          });
        } catch (error) {
          results.push({
            taskId: task.id,
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
            fixed: false
          });
        }
      }
      
      const successCount = results.filter(r => r.success && r.fixed).length;
      const alreadyConsistentCount = results.filter(r => r.success && !r.fixed).length;
      const failedCount = results.filter(r => !r.success).length;
      
      logger.info('[TaskConsistency] Finished fixing inconsistent tasks', {
        total: results.length,
        fixed: successCount,
        alreadyConsistent: alreadyConsistentCount,
        failed: failedCount
      });
      
      return res.json({
        success: true,
        message: `Fixed ${successCount} tasks, ${alreadyConsistentCount} were already consistent, ${failedCount} failed`,
        fixed: successCount,
        alreadyConsistent: alreadyConsistentCount,
        failed: failedCount,
        details: results
      });
    } catch (error) {
      logger.error('[TaskConsistency] Error fixing all inconsistent tasks', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to fix inconsistent tasks'
      });
    }
  });
  
  return router;
}

module.exports = { registerTaskConsistencyRoutes };