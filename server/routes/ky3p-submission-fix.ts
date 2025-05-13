/**
 * KY3P Submission Fix Router
 * 
 * This module adds endpoints to handle KY3P form submissions correctly,
 * ensuring they get marked as "submitted" with 100% progress.
 */
import { Router } from "express";
import { db } from "@db";
import { tasks } from "@db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { getWebSocketServer } from "../services/websocket";

// Create router instance
const router = Router();

/**
 * POST /api/ky3p/submit-form/:taskId
 * 
 * Handles KY3P form submissions properly and sets task status to "submitted"
 * with 100% progress.
 */
router.post("/api/ky3p/submit-form/:taskId", requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const taskIdNum = parseInt(taskId, 10);

    if (isNaN(taskIdNum)) {
      return res.status(400).json({
        success: false,
        error: "Invalid task ID format"
      });
    }

    console.log(`[KY3P Submission Fix] Processing submission for task ${taskIdNum}`);

    // First, fetch the current task to get existing metadata
    const existingTask = await db.select({
      id: tasks.id,
      metadata: tasks.metadata,
      status: tasks.status,
      progress: tasks.progress
    })
    .from(tasks)
    .where(eq(tasks.id, taskIdNum))
    .limit(1);

    if (!existingTask || existingTask.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Task with ID ${taskIdNum} not found`
      });
    }

    // Log current task state for debugging
    console.log(`[KY3P Submission Fix] Current task state:`, {
      id: existingTask[0].id,
      status: existingTask[0].status,
      progress: existingTask[0].progress
    });

    // Get the existing metadata (or initialize if null)
    const existingMetadata = existingTask[0].metadata || {};
    
    // Create submission timestamp (use consistently)
    const submissionDate = new Date();
    const submissionTimestamp = submissionDate.toISOString();
    
    // Create merged metadata with submission info
    const updatedMetadata = {
      ...existingMetadata,
      submitted: true,
      submission_date: submissionTimestamp,
      submission_info: {
        submitted: true,
        submitted_at: submissionTimestamp,
        submission_status: 'completed'
      }
    };

    // Update the task status and progress in the database
    const result = await db.update(tasks)
      .set({
        status: "submitted",
        progress: 100, // Force progress to 100%
        completion_date: submissionDate,
        metadata: updatedMetadata
      })
      .where(eq(tasks.id, taskIdNum))
      .returning({ 
        id: tasks.id, 
        status: tasks.status, 
        progress: tasks.progress,
        metadata: tasks.metadata
      });

    if (!result || result.length === 0) {
      console.error(`[KY3P Submission Fix] Failed to update task ${taskIdNum}`);
      return res.status(404).json({
        success: false,
        error: `Task with ID ${taskIdNum} not found`
      });
    }

    const updatedTask = result[0];
    console.log(`[KY3P Submission Fix] Successfully updated task ${taskIdNum} to submitted with 100% progress`, {
      status: updatedTask.status,
      progress: updatedTask.progress,
      metadataKeys: Object.keys(updatedTask.metadata || {})
    });

    // Broadcast the update to WebSocket clients
    const wsServer = getWebSocketServer();
    if (wsServer) {
      try {
        // Import the broadcast function from our websocket service
        const { broadcast } = require('../services/websocket');
        
        // Use the broadcast function from the module
        const broadcastResult = broadcast("task_update", {
          taskId: taskIdNum,
          status: "submitted",
          progress: 100,
          metadata: {
            submitted: true,
            submission_date: submissionTimestamp
          },
          timestamp: submissionTimestamp
        });

        console.log(`[KY3P Submission Fix] WebSocket broadcast result:`, {
          success: broadcastResult.success,
          clientCount: broadcastResult.clientCount,
          taskId: taskIdNum,
          status: "submitted", 
          progress: 100
        });
      } catch (error) {
        console.error(`[KY3P Submission Fix] Error broadcasting update:`, error);
      }
    } else {
      console.warn("[KY3P Submission Fix] WebSocket server not available for broadcasting");
    }

    // Return success response with more detailed information
    return res.status(200).json({
      success: true,
      message: "KY3P form submitted successfully",
      task: {
        id: updatedTask.id,
        status: updatedTask.status,
        progress: updatedTask.progress,
        submitted: true,
        submission_date: submissionTimestamp,
        metadata: updatedTask.metadata
      }
    });
  } catch (error) {
    console.error("[KY3P Submission Fix] Error processing KY3P form submission:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error processing KY3P form submission"
    });
  }
});

/**
 * GET /api/ky3p/submission-status/:taskId
 * 
 * Get the current submission status of a KY3P task
 */
router.get("/api/ky3p/submission-status/:taskId", requireAuth, async (req, res) => {
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
    
    return res.status(200).json({
      success: true,
      task: {
        id: task.id,
        status: task.status,
        progress: task.progress,
        submitted: task.status === "submitted",
        submissionDate: task.completionDate,
        metadata: task.metadata
      }
    });
  } catch (error) {
    console.error("[KY3P Submission Fix] Error checking KY3P submission status:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error checking KY3P submission status"
    });
  }
});

// Export as both named export and default for flexibility
export const ky3pSubmissionFixRouter = router;
export default router;