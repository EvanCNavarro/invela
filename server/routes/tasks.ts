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

// Helper function to get task counts
async function getTaskCount() {
  const allTasks = await db.select().from(tasks);
  return {
    total: allTasks.length,
    emailSent: allTasks.filter(t => t.status === TaskStatus.EMAIL_SENT).length,
    inProgress: allTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    completed: allTasks.filter(t => t.status === TaskStatus.COMPLETED).length
  };
}

// Create new task
router.post("/api/tasks", async (req, res) => {
  try {
    const [newTask] = await db
      .insert(tasks)
      .values({
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Get updated counts and broadcast task creation
    const taskCount = await getTaskCount();
    broadcastMessage('task_created', {
      task: newTask,
      count: taskCount,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({ task: newTask, count: taskCount });
  } catch (error) {
    console.error("[Task Routes] Error creating task:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
});

// Delete task
router.delete("/api/tasks/:id", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);

    const [deletedTask] = await db
      .delete(tasks)
      .where(eq(tasks.id, taskId))
      .returning();

    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Get updated counts and broadcast task deletion
    const taskCount = await getTaskCount();
    broadcastMessage('task_deleted', {
      taskId: deletedTask.id,
      count: taskCount,
      timestamp: new Date().toISOString()
    });

    res.json({ message: "Task deleted successfully", count: taskCount });
  } catch (error) {
    console.error("[Task Routes] Error deleting task:", error);
    res.status(500).json({ message: "Failed to delete task" });
  }
});

// Update task status with validation middleware
router.patch("/api/tasks/:id/status",
  loadTaskMiddleware,
  validateTaskStatusTransition,
  async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { status } = updateTaskStatusSchema.parse(req.body);

      const [currentTask] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));

      if (!currentTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      const progress = STATUS_PROGRESS[status];

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

      // Get updated counts and broadcast task update
      const taskCount = await getTaskCount();
      broadcastMessage('task_updated', {
        taskId: updatedTask.id,
        status: updatedTask.status,
        progress: updatedTask.progress,
        metadata: updatedTask.metadata,
        count: taskCount,
        timestamp: new Date().toISOString()
      });

      res.json({ task: updatedTask, count: taskCount });
    } catch (error) {
      console.error("[Task Routes] Error updating task status:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid status value", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update task status" });
    }
  }
);

export default router;
