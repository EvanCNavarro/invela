import { Router } from "express";
import { db } from "@db";
import { tasks, TaskStatus } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { broadcastMessage } from "../websocket";

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
  if (progress === 0) return TaskStatus.NOT_STARTED;
  if (progress >= 1 && progress < 100) return TaskStatus.IN_PROGRESS;
  if (progress === 100) return TaskStatus.READY_FOR_SUBMISSION;
  return TaskStatus.IN_PROGRESS; // Default fallback
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
        progress: 50, //Using the old progress value here.  No clear indication in edited code how to handle initial progress for new tasks.
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
router.patch("/api/tasks/:id/status", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { status, progress } = updateTaskStatusSchema.parse(req.body);

    // Get current task
    const [currentTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!currentTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // For KYB tasks, validate status matches progress
    if (currentTask.task_type === 'company_kyb') {
      const expectedStatus = getKybStatusFromProgress(progress);

      // Only allow explicit status changes for submission and approval
      if (status !== TaskStatus.SUBMITTED && status !== TaskStatus.APPROVED) {
        if (status !== expectedStatus) {
          return res.status(400).json({
            message: `Invalid status ${status} for progress ${progress}. Expected status: ${expectedStatus}`,
            expectedStatus,
            progress
          });
        }
      }

      // Validate progress threshold for the requested status
      const threshold = KYB_STATUS_THRESHOLDS[status];
      if (!threshold || progress < threshold.min || progress > threshold.max) {
        return res.status(400).json({
          message: `Invalid progress value ${progress} for status ${status}`,
          required: threshold
        });
      }
    }

    // For user onboarding tasks, only allow EMAIL_SENT -> COMPLETED transition
    if (currentTask.task_type === 'user_onboarding') {
      if (currentTask.status === TaskStatus.EMAIL_SENT && status !== TaskStatus.COMPLETED) {
        return res.status(400).json({ 
          message: "Invalid status transition. User onboarding tasks can only move from EMAIL_SENT to COMPLETED" 
        });
      }
    }

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
      return res.status(400).json({ 
        message: "Invalid status value", 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: "Failed to update task status" });
  }
});

export default router;