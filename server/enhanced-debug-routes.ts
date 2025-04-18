/**
 * Enhanced Debug Routes
 * 
 * This file contains additional debug routes for advanced system diagnostics
 * and troubleshooting, particularly for development and admin purposes.
 */

import { Router } from 'express';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

/**
 * Get tasks with status/progress inconsistencies
 */
router.get('/tasks/status-inconsistencies', async (req, res) => {
  try {
    console.log('[EnhancedDebug] Checking for tasks with status inconsistencies');
    
    // Get all tasks
    const allTasks = await db.query.tasks.findMany({
      orderBy: [desc(tasks.updated_at)]
    });
    
    // Filter tasks with potential inconsistencies
    const inconsistentTasks = allTasks.filter(task => {
      // Case 1: Task has submission date but is not in submitted status
      const hasSubmissionDate = task.metadata && 
        task.metadata.submissionDate && 
        task.metadata.submissionDate !== null;
      
      const isSubmitted = task.status === 'submitted';
      
      return hasSubmissionDate && !isSubmitted;
    });
    
    return res.json({
      success: true,
      count: inconsistentTasks.length,
      tasks: inconsistentTasks.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        progress: task.progress,
        submissionDate: task.metadata?.submissionDate,
        updated_at: task.updated_at
      }))
    });
  } catch (error) {
    console.error('[EnhancedDebug] Error checking task inconsistencies:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking task inconsistencies',
      error: String(error)
    });
  }
});

/**
 * Get overall system statistics
 */
router.get('/system-stats', async (req, res) => {
  try {
    console.log('[EnhancedDebug] Collecting system statistics');
    
    // Task statistics
    const taskStats = await db
      .select({
        total: sql`COUNT(*)`,
        submitted: sql`SUM(CASE WHEN ${tasks.status} = 'submitted' THEN 1 ELSE 0 END)`,
        completed: sql`SUM(CASE WHEN ${tasks.status} = 'completed' THEN 1 ELSE 0 END)`,
        in_progress: sql`SUM(CASE WHEN ${tasks.status} IN ('in_progress', 'ready_for_submission') THEN 1 ELSE 0 END)`,
        other: sql`SUM(CASE WHEN ${tasks.status} NOT IN ('submitted', 'completed', 'in_progress', 'ready_for_submission') THEN 1 ELSE 0 END)`
      })
      .from(tasks);
    
    return res.json({
      success: true,
      stats: {
        tasks: taskStats[0]
      }
    });
  } catch (error) {
    console.error('[EnhancedDebug] Error getting system stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting system statistics',
      error: String(error)
    });
  }
});

export default router;