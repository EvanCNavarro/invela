import { Router } from "express";
import { db } from "@db";
import { tasks, TaskStatus } from "@db/schema";
import { eq } from "drizzle-orm";
import { validateTaskStatusTransition, loadTaskMiddleware } from "../middleware/taskValidation";
import { z } from "zod";

const router = Router();

const updateTaskStatusSchema = z.object({
  status: z.enum([TaskStatus.EMAIL_SENT, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]),
});

// Update task status with validation middleware
router.patch("/api/tasks/:id/status",
  loadTaskMiddleware,
  validateTaskStatusTransition,
  async (req, res) => {
    try {
      const taskId = req.taskId;
      const { status, progress } = req.body;

      // First get the current task to include in metadata
      const [currentTask] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));

      if (!currentTask) {
        return res.status(404).json({ message: "Task not found" });
      }

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

      res.json(updatedTask);
    } catch (error) {
      console.error("[Task Routes] Error updating task status:", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  }
);

export default router;