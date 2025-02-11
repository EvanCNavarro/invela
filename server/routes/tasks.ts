import { Router } from "express";
import { db } from "@db";
import { tasks, TaskStatus } from "@db/schema";
import { eq } from "drizzle-orm";
import { validateTaskStatusTransition, loadTaskMiddleware } from "../middleware/taskValidation";
import { z } from "zod";
import { broadcastMessage } from "../index";

const router = Router();

const updateTaskStatusSchema = z.object({
  status: z.enum([TaskStatus.EMAIL_SENT, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]),
});

// Initial progress values for each status
const STATUS_PROGRESS = {
  [TaskStatus.EMAIL_SENT]: 25,
  [TaskStatus.IN_PROGRESS]: 50,
  [TaskStatus.COMPLETED]: 100,
} as const;

// Update task status with validation middleware
router.patch("/api/tasks/:id/status",
  loadTaskMiddleware,
  validateTaskStatusTransition,
  async (req, res) => {
    try {
      const taskId = req.taskId;
      const { status } = req.body;

      // First get the current task to include in metadata
      const [currentTask] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));

      if (!currentTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Get the progress value for the new status
      const progress = STATUS_PROGRESS[status];

      // Update task with new status, progress, and metadata
      const [updatedTask] = await db
        .update(tasks)
        .set({
          status,
          progress,
          updatedAt: new Date(),
          metadata: {
            ...currentTask.metadata,
            statusFlow: [...(currentTask.metadata?.statusFlow || []), status],
            statusUpdates: [
              ...(currentTask.metadata?.statusUpdates || []),
              {
                from: currentTask.status,
                to: status,
                timestamp: new Date().toISOString(),
                progress
              }
            ]
          }
        })
        .where(eq(tasks.id, taskId))
        .returning();

      // Broadcast the task update via WebSocket
      broadcastMessage('task_updated', {
        taskId: updatedTask.id,
        status: updatedTask.status,
        progress: updatedTask.progress,
        metadata: updatedTask.metadata
      });

      res.json(updatedTask);
    } catch (error) {
      console.error("[Task Routes] Error updating task status:", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  }
);

// Update existing tasks to have correct progress values
router.post("/api/tasks/fix-progress", async (req, res) => {
  try {
    // Update all EMAIL_SENT tasks to have 25% progress
    const [updatedTasks] = await db
      .update(tasks)
      .set({
        progress: STATUS_PROGRESS[TaskStatus.EMAIL_SENT],
        updatedAt: new Date()
      })
      .where(eq(tasks.status, TaskStatus.EMAIL_SENT))
      .returning();

    if (updatedTasks && Array.isArray(updatedTasks)) {
      // Broadcast updates for each modified task
      updatedTasks.forEach(task => {
        broadcastMessage('task_updated', {
          taskId: task.id,
          status: task.status,
          progress: task.progress
        });
      });
    }

    res.json({
      message: "Successfully updated task progress values",
      updatedCount: Array.isArray(updatedTasks) ? updatedTasks.length : 0
    });
  } catch (error) {
    console.error("[Task Routes] Error fixing task progress:", error);
    res.status(500).json({ message: "Failed to update task progress" });
  }
});

export default router;