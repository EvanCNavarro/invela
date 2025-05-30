/**
 * Open Banking Form Submission Fix
 * 
 * This module provides a dedicated endpoint for handling Open Banking form submissions
 * with the specific requirement to unlock Dashboard and Insights tabs before showing
 * the success modal to the user.
 * 
 * The main enhancement is waiting for tab unlocking to complete before sending the
 * success response back to the client.
 */

import express from 'express';
import { db } from '@db';
import { tasks, companies } from '@db/schema';
import { eq, and, or } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { UnifiedTabService } from '../services/unified-tab-service';
import { WebSocketService } from '../utils/unified-websocket';
import { Logger } from '../utils/logger';

const router = express.Router();
const logger = new Logger('OpenBankingSubmissionFix');

/**
 * POST /api/open-banking/submit-form/:taskId
 * 
 * Enhanced Open Banking form submission endpoint that ensures Dashboard and Insights tabs
 * are unlocked before returning a success response to the client.
 */
router.post('/api/open-banking/submit-form/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const { formData, fileName } = req.body;
    
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid task ID format"
      });
    }
    
    logger.info('Processing Open Banking form submission', { taskId });
    
    // First, get the task details to check if it's an Open Banking task
    const taskResult = await db.select({
      id: tasks.id,
      status: tasks.status,
      progress: tasks.progress,
      companyId: tasks.company_id,
      metadata: tasks.metadata
    })
    .from(tasks)
    .where(and(
      eq(tasks.id, taskId),
      or(
        eq(tasks.task_type, 'open_banking'),
        eq(tasks.task_type, 'open_banking_survey')
      )
    ))
    .limit(1);
    
    if (!taskResult || taskResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Open Banking task with ID ${taskId} not found`
      });
    }
    
    const task = taskResult[0];
    const companyId = task.companyId;
    
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "Task is not associated with a company"
      });
    }
    
    // Now update the task status to "submitted" and progress to 100%
    const submissionTimestamp = new Date().toISOString();
    
    // CRITICAL: Get existing metadata to preserve it
    const existingMetadata = task.metadata || {};
    
    // Merge new submission info with existing metadata
    const updatedMetadata = {
      ...existingMetadata,
      submitted: true,
      submission_date: submissionTimestamp,
      // Add any additional metadata fields needed for Open Banking
      open_banking_submitted: true
    };
    
    // Update the task with submitted status, 100% progress, and updated metadata
    await db.update(tasks)
      .set({
        status: "submitted",
        progress: 100,
        metadata: updatedMetadata,
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId));
    
    // Fetch the updated task to send in the response
    const updatedTaskResult = await db.select({
      id: tasks.id,
      status: tasks.status,
      progress: tasks.progress,
      companyId: tasks.company_id,
      metadata: tasks.metadata
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
    
    if (!updatedTaskResult || updatedTaskResult.length === 0) {
      return res.status(500).json({
        success: false,
        error: "Failed to retrieve updated task"
      });
    }
    
    const updatedTask = updatedTaskResult[0];
    
    // CRITICAL STEP: Unlock Dashboard and Insights tabs for the company
    const tabsToUnlock = ['dashboard', 'insights'];
    logger.info(`Unlocking tabs for Open Banking submission: ${tabsToUnlock.join(', ')}`, { 
      companyId, 
      taskId 
    });
    
    try {
      // Use the UnifiedTabService to handle the tab unlocking with broadcasting
      const tabUnlockResult = await UnifiedTabService.unlockTabs(companyId, tabsToUnlock);
      
      if (tabUnlockResult) {
        logger.info(`Successfully unlocked ${tabsToUnlock.join(', ')} tabs for company ${companyId}`);
      } else {
        logger.warn(`Failed to unlock tabs for company ${companyId}`);
      }
    } catch (tabError) {
      logger.error(`Error unlocking tabs for company ${companyId}:`, tabError);
      // Continue with the submission - don't fail the submission if tab unlocking fails
    }
    
    // Broadcast task update via WebSocket for real-time updates
    const wsService = WebSocketService.getInstance();
    if (wsService) {
      try {
        await wsService.broadcastTaskUpdate(taskId, {
          status: updatedTask.status,
          progress: updatedTask.progress,
          metadata: {
            ...updatedTask.metadata,
            submission_date: submissionTimestamp
          }
        });
        logger.info(`Successfully broadcasted task update for task ${taskId}`);
      } catch (wsError) {
        logger.error(`Error broadcasting task update: ${wsError}`);
      }
      
      // CRITICAL: Also broadcast a form submission event with unlocked tabs information
      try {
        await wsService.broadcastFormSubmission(taskId, 'open_banking', 'submitted', {
          companyId,
          unlockedTabs: tabsToUnlock,
          timestamp: submissionTimestamp
        });
        logger.info(`Successfully broadcasted form submission event for task ${taskId}`);
      } catch (wsError) {
        logger.error(`Error broadcasting form submission event: ${wsError}`);
      }
    } else {
      logger.warn("WebSocket server not available for broadcasting");
    }
    
    // Return success response with detailed information
    return res.status(200).json({
      success: true,
      message: "Open Banking form submitted successfully",
      task: {
        id: updatedTask.id,
        status: updatedTask.status,
        progress: updatedTask.progress,
        submitted: true,
        submission_date: submissionTimestamp,
        metadata: updatedTask.metadata
      },
      unlockedTabs: tabsToUnlock
    });
  } catch (error) {
    logger.error("Error processing Open Banking form submission:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error processing Open Banking form submission"
    });
  }
});

/**
 * GET /api/open-banking/submission-status/:taskId
 * 
 * Get the current submission status of an Open Banking task
 */
router.get("/api/open-banking/submission-status/:taskId", requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskIdNum = parseInt(taskId, 10);
    
    if (isNaN(taskIdNum)) {
      return res.status(400).json({
        success: false,
        error: "Invalid task ID format"
      });
    }
    
    // Query the task from the database
    const taskResult = await db.select({
      id: tasks.id,
      status: tasks.status,
      progress: tasks.progress,
      completionDate: tasks.completion_date,
      metadata: tasks.metadata
    })
    .from(tasks)
    .where(eq(tasks.id, taskIdNum))
    .limit(1);
    
    if (!taskResult || taskResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Task with ID ${taskIdNum} not found`
      });
    }
    
    const task = taskResult[0];
    
    // Get the company and its available tabs
    const companyResult = await db.select({
      id: companies.id,
      availableTabs: companies.available_tabs
    })
    .from(companies)
    .where(eq(companies.id, task.metadata?.company_id || 0))
    .limit(1);
    
    const availableTabs = companyResult?.[0]?.availableTabs || [];
    const hasDashboard = availableTabs.includes('dashboard');
    const hasInsights = availableTabs.includes('insights');
    
    return res.status(200).json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        progress: task.progress,
        submitted: task.status === "submitted",
        submissionDate: task.completionDate,
        metadata: task.metadata
      },
      tabs: {
        available: availableTabs,
        hasDashboard,
        hasInsights,
        dashboardAndInsightsUnlocked: hasDashboard && hasInsights
      }
    });
  } catch (error) {
    logger.error("Error checking Open Banking submission status:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error checking Open Banking submission status"
    });
  }
});

// Export as both named export and default for flexibility
export const openBankingSubmissionFixRouter = router;
export default router;