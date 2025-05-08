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

    // Update the task status and progress in the database
    const result = await db.update(tasks)
      .set({
        status: "submitted",
        progress: 100,
        // Use completion_date for submission date as that's the proper column in our schema
        completion_date: new Date(),
        // Update metadata to include submission info
        metadata: {
          submission_info: {
            submitted: true,
            submitted_at: new Date().toISOString(),
            submission_status: 'completed'
          }
        }
      })
      .where(eq(tasks.id, taskIdNum))
      .returning({ id: tasks.id, status: tasks.status, progress: tasks.progress });

    if (!result || result.length === 0) {
      console.error(`[KY3P Submission Fix] Failed to update task ${taskIdNum}`);
      return res.status(404).json({
        success: false,
        error: `Task with ID ${taskIdNum} not found`
      });
    }

    const updatedTask = result[0];
    console.log(`[KY3P Submission Fix] Successfully updated task ${taskIdNum} to submitted with 100% progress`, updatedTask);

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
          timestamp: new Date().toISOString(),
        });

        console.log(`[KY3P Submission Fix] WebSocket broadcast result:`, {
          success: broadcastResult.success,
          clientCount: broadcastResult.clientCount
        });
      } catch (error) {
        console.error(`[KY3P Submission Fix] Error broadcasting update:`, error);
      }
    } else {
      console.warn("[KY3P Submission Fix] WebSocket server not available for broadcasting");
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: "KY3P form submitted successfully",
      task: updatedTask
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