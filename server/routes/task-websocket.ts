/**
 * Task WebSocket Routes - MIGRATED TO UNIFIED SERVICE
 * 
 * This module provides WebSocket routes for task-related updates
 * including progress calculations, status changes, and reconciliation.
 * 
 * MIGRATION NOTE: Converted from direct WebSocket server to unified service
 * to eliminate parallel connections and improve architecture consistency.
 * 
 * @version 2.0.0 - Unified WebSocket Migration
 * @since 2025-05-31
 */

import { Router } from 'express';
import { db } from '@db';
import { tasks, companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import { reconcileTaskProgress } from '../utils/task-reconciliation';
import { updateTaskProgress } from '../utils/progress';
import { broadcastTaskUpdate } from '../utils/unified-websocket';

const router = Router();

/**
 * Task Progress Reconciliation Endpoint
 * 
 * Triggers manual reconciliation of task progress and broadcasts updates
 * via the unified WebSocket service.
 */
router.post('/reconcile/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (!taskId) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    console.log(`[TaskWebSocket] Manual reconciliation requested for task ${taskId}`, {
      timestamp: new Date().toISOString()
    });

    await handleTaskReconciliation(taskId);
    
    res.json({
      success: true,
      message: `Task ${taskId} reconciliation completed`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[TaskWebSocket] Error reconciling task:`, error);
    res.status(500).json({ 
      error: 'Failed to reconcile task progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Company Task Reconciliation Endpoint
 * 
 * Triggers reconciliation for all tasks in a company and broadcasts updates
 * via the unified WebSocket service.
 */
router.post('/reconcile/company/:companyId', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    if (!companyId) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }

    console.log(`[TaskWebSocket] Company reconciliation requested for company ${companyId}`, {
      timestamp: new Date().toISOString()
    });

    await handleCompanyTaskReconciliation(companyId);
    
    res.json({
      success: true,
      message: `Company ${companyId} task reconciliation completed`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[TaskWebSocket] Error reconciling company tasks:`, error);
    res.status(500).json({ 
      error: 'Failed to reconcile company tasks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Manual Task Progress Update Endpoint
 * 
 * Updates task progress manually and broadcasts via unified WebSocket service.
 */
router.post('/update-progress/:taskId', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { progress, status } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    console.log(`[TaskWebSocket] Manual progress update for task ${taskId}`, {
      progress,
      status,
      timestamp: new Date().toISOString()
    });

    await handleUpdateTaskProgress({ taskId, progress, status });
    
    res.json({
      success: true,
      message: `Task ${taskId} progress updated`,
      taskId,
      progress,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(`[TaskWebSocket] Error updating task progress:`, error);
    res.status(500).json({ 
      error: 'Failed to update task progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Handle task progress reconciliation requests
 * 
 * @param taskId Task ID to reconcile
 */
async function handleTaskReconciliation(taskId: number) {
  try {
    console.log(`[TaskWebSocket] Starting reconciliation for task ${taskId}`);
    
    // Get task details
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        company: true
      }
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Perform reconciliation
    const reconciliationResult = await reconcileTaskProgress(taskId);
    
    console.log(`[TaskWebSocket] Reconciliation completed for task ${taskId}:`, reconciliationResult);

    // Broadcast the update via unified WebSocket service
    if (reconciliationResult && task.company_id) {
      await broadcastTaskUpdate({
        taskId: taskId,
        companyId: task.company_id,
        progress: reconciliationResult.progress || task.progress,
        status: reconciliationResult.status || task.status,
        metadata: {
          reconciled: true,
          timestamp: new Date().toISOString()
        }
      });
    }

    return reconciliationResult;
  } catch (error) {
    console.error(`[TaskWebSocket] Error in task reconciliation:`, error);
    throw error;
  }
}

/**
 * Handle company-wide task reconciliation requests
 * 
 * @param companyId Company ID to reconcile tasks for
 */
async function handleCompanyTaskReconciliation(companyId: number) {
  try {
    console.log(`[TaskWebSocket] Starting company-wide reconciliation for company ${companyId}`);
    
    // Get all tasks for the company
    const companyTasks = await db.query.tasks.findMany({
      where: eq(tasks.company_id, companyId)
    });

    console.log(`[TaskWebSocket] Found ${companyTasks.length} tasks for company ${companyId}`);

    const reconciliationResults = [];
    
    // Reconcile each task
    for (const task of companyTasks) {
      try {
        const result = await reconcileTaskProgress(task.id);
        reconciliationResults.push({
          taskId: task.id,
          result
        });

        // Broadcast individual task updates
        if (result) {
          await broadcastTaskUpdate({
            taskId: task.id,
            companyId: companyId,
            progress: result.progress || task.progress,
            status: result.status || task.status,
            metadata: {
              reconciled: true,
              companyWideReconciliation: true,
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (taskError) {
        console.error(`[TaskWebSocket] Error reconciling task ${task.id}:`, taskError);
        reconciliationResults.push({
          taskId: task.id,
          error: taskError instanceof Error ? taskError.message : 'Unknown error'
        });
      }
    }

    console.log(`[TaskWebSocket] Company reconciliation completed for ${companyId}`, {
      totalTasks: companyTasks.length,
      results: reconciliationResults.length
    });

    return reconciliationResults;
  } catch (error) {
    console.error(`[TaskWebSocket] Error in company reconciliation:`, error);
    throw error;
  }
}

/**
 * Handle manual task progress update requests
 * 
 * @param data Update data
 */
async function handleUpdateTaskProgress(data: any) {
  try {
    const { taskId, progress, status } = data;
    
    console.log(`[TaskWebSocket] Updating task ${taskId} progress:`, { progress, status });
    
    // Update task progress
    const updateResult = await updateTaskProgress(taskId, progress, status);
    
    // Get task details for broadcasting
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        company: true
      }
    });

    if (task && task.company_id) {
      // Broadcast the update via unified WebSocket service
      await broadcastTaskUpdate({
        taskId: taskId,
        companyId: task.company_id,
        progress: progress || task.progress,
        status: status || task.status,
        metadata: {
          manualUpdate: true,
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log(`[TaskWebSocket] Task ${taskId} progress update completed`);
    
    return updateResult;
  } catch (error) {
    console.error(`[TaskWebSocket] Error updating task progress:`, error);
    throw error;
  }
}

export default router;