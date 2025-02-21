import { Router } from "express";
import { db } from "@db";
import { tasks, TaskStatus } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { broadcastMessage } from "../websocket";
import { validateTaskStatusTransition } from "../middleware/taskValidation";

const router = Router();

// Define progress thresholds for KYB tasks
const KYB_STATUS_THRESHOLDS = {
  [TaskStatus.NOT_STARTED]: { min: 0, max: 0 },
  [TaskStatus.IN_PROGRESS]: { min: 1, max: 99 },
  [TaskStatus.READY_FOR_SUBMISSION]: { min: 100, max: 100 },
  [TaskStatus.SUBMITTED]: { min: 100, max: 100 },
  [TaskStatus.APPROVED]: { min: 100, max: 100 },
} as const;

// Helper function to determine KYB task status based on progress
function getKybStatusFromProgress(progress: number): TaskStatus {
  console.log('[Task Routes] Calculating status for progress:', progress);
  const status = progress === 0 ? TaskStatus.NOT_STARTED :
    progress >= 1 && progress < 100 ? TaskStatus.IN_PROGRESS :
      TaskStatus.READY_FOR_SUBMISSION;
  console.log('[Task Routes] Determined status:', status);
  return status;
}

const updateTaskStatusSchema = z.object({
  status: z.enum([
    TaskStatus.NOT_STARTED,
    TaskStatus.IN_PROGRESS,
    TaskStatus.READY_FOR_SUBMISSION,
    TaskStatus.SUBMITTED,
    TaskStatus.APPROVED,
    TaskStatus.EMAIL_SENT,
    TaskStatus.COMPLETED
  ]),
  progress: z.number().min(0).max(100)
});

// Helper function to get task counts
async function getTaskCount() {
  const allTasks = await db.select().from(tasks);
  return {
    total: allTasks.length,
    emailSent: allTasks.filter(t => t.status === TaskStatus.EMAIL_SENT).length,
    completed: allTasks.filter(t => t.status === TaskStatus.COMPLETED).length,
    inProgress: allTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    readyForSubmission: allTasks.filter(t => t.status === TaskStatus.READY_FOR_SUBMISSION).length,
    submitted: allTasks.filter(t => t.status === TaskStatus.SUBMITTED).length,
    approved: allTasks.filter(t => t.status === TaskStatus.APPROVED).length
  };
}

// Create new task
router.post("/api/tasks", async (req, res) => {
  try {
    const [newTask] = await db
      .insert(tasks)
      .values({
        ...req.body,
        status: TaskStatus.EMAIL_SENT,
        progress: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          ...req.body.metadata,
          statusFlow: [TaskStatus.EMAIL_SENT]
        }
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

// Update task status and progress
router.patch("/api/tasks/:id/status", validateTaskStatusTransition, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { status, progress } = req.body;

    console.log('[Task Routes] Processing status update request:', {
      taskId,
      requestedStatus: status,
      requestedProgress: progress
    });

    // Get current task
    const [currentTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!currentTask) {
      console.log('[Task Routes] Task not found:', taskId);
      return res.status(404).json({ message: "Task not found" });
    }

    console.log('[Task Routes] Current task state:', {
      id: currentTask.id,
      type: currentTask.task_type,
      currentStatus: currentTask.status,
      currentProgress: currentTask.progress,
      requestedStatus: status,
      requestedProgress: progress
    });

    // Update task with new status and progress
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

    console.log('[Task Routes] Task updated successfully:', {
      id: updatedTask.id,
      newStatus: updatedTask.status,
      newProgress: updatedTask.progress
    });

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
      return res.status(400).json({
        message: "Invalid status value",
        errors: error.errors
      });
    }
    res.status(500).json({ message: "Failed to update task status" });
  }
});

export default router;