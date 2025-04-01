import { Router } from "express";
import { db } from "@db";
import { tasks, TaskStatus } from "@db/schema";
import { eq, and, or, ilike } from "drizzle-orm";
import { z } from "zod";
import { broadcastMessage } from "../websocket";
import { validateTaskStatusTransition, loadTaskMiddleware } from "../middleware/taskValidation";

const router = Router();

// Get task by company name for CARD tasks
router.get("/api/tasks/card/:companyName", async (req, res) => {
  try {
    console.log('[Tasks Routes] Fetching CARD task:', {
      companyName: req.params.companyName,
    });

    // First try a more flexible pattern match
    let task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.task_type, 'company_card'),
        ilike(tasks.title, `%${req.params.companyName}%`)
      )
    });
    
    // Try to find with the new numbered format, then fall back to the old format
    if (!task) {
      task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.task_type, 'company_card'),
          ilike(tasks.title, `3. Open Banking (1033) Survey: ${req.params.companyName}`)
        )
      });
    }
    
    // If not found, try the old format
    if (!task) {
      task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.task_type, 'company_card'),
          ilike(tasks.title, `Company CARD: ${req.params.companyName}`)
        )
      });
    }

    console.log('[Tasks Routes] CARD task found:', task);

    if (!task) {
      return res.status(404).json({ 
        message: `Could not find CARD task for company: ${req.params.companyName}` 
      });
    }

    res.json(task);
  } catch (error) {
    console.error('[Tasks Routes] Error fetching CARD task:', error);
    res.status(500).json({ message: "Failed to fetch CARD task" });
  }
});

// Get task by company name for KYB tasks
router.get("/api/tasks/kyb/:companyName", async (req, res) => {
  try {
    console.log('[Tasks Routes] Fetching KYB task:', {
      companyName: req.params.companyName,
    });

    // Try to find with the new numbered format first, then fall back to the old format
    let task = await db.query.tasks.findFirst({
      where: and(
        or(
          eq(tasks.task_type, 'company_kyb'),
          eq(tasks.task_type, 'company_onboarding_KYB')
        ),
        ilike(tasks.title, `%KYB%${req.params.companyName}%`)
      )
    });
    
    // If not found, try a more specific search with exact format
    if (!task) {
      task = await db.query.tasks.findFirst({
        where: and(
          or(
            eq(tasks.task_type, 'company_kyb'),
            eq(tasks.task_type, 'company_onboarding_KYB')
          ),
          ilike(tasks.title, `1. KYB Form: ${req.params.companyName}`)
        )
      });
    }
    
    // If still not found, try the old format
    if (!task) {
      task = await db.query.tasks.findFirst({
        where: and(
          or(
            eq(tasks.task_type, 'company_kyb'),
            eq(tasks.task_type, 'company_onboarding_KYB')
          ),
          ilike(tasks.title, `Company KYB: ${req.params.companyName}`)
        )
      });
    }

    console.log('[Tasks Routes] KYB task found:', task);

    if (!task) {
      return res.status(404).json({ 
        message: `Could not find KYB task for company: ${req.params.companyName}` 
      });
    }

    res.json(task);
  } catch (error) {
    console.error('[Tasks Routes] Error fetching KYB task:', error);
    res.status(500).json({ message: "Failed to fetch KYB task" });
  }
});

// Get task by company name for Security tasks
router.get("/api/tasks/security/:companyName", async (req, res) => {
  try {
    console.log('[Tasks Routes] Fetching Security task:', {
      companyName: req.params.companyName,
    });

    // First try a more flexible pattern match
    let task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.task_type, 'security_assessment'),
        ilike(tasks.title, `%${req.params.companyName}%`)
      )
    });
    
    // Try to find with the new numbered format
    if (!task) {
      task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.task_type, 'security_assessment'),
          ilike(tasks.title, `2. Security Assessment: ${req.params.companyName}`)
        )
      });
    }
    
    // If not found, try the old format
    if (!task) {
      task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.task_type, 'security_assessment'),
          ilike(tasks.title, `Security Assessment: ${req.params.companyName}`)
        )
      });
    }

    console.log('[Tasks Routes] Security task found:', task);

    if (!task) {
      return res.status(404).json({ 
        message: `Could not find Security Assessment task for company: ${req.params.companyName}` 
      });
    }

    res.json(task);
  } catch (error) {
    console.error('[Tasks Routes] Error fetching Security task:', error);
    res.status(500).json({ message: "Failed to fetch Security Assessment task" });
  }
});

// Create new task - add progress to response
router.post("/api/tasks", async (req, res) => {
  try {
    const [newTask] = await db
      .insert(tasks)
      .values({
        ...req.body,
        status: TaskStatus.EMAIL_SENT,
        progress: 0,
        created_at: new Date(),
        updated_at: new Date(),
        metadata: {
          ...req.body.metadata,
          statusFlow: [TaskStatus.EMAIL_SENT],
          progressHistory: [{
            value: 0,
            timestamp: new Date().toISOString()
          }]
        }
      })
      .returning();

    // Get updated counts and broadcast task creation with progress
    const taskCount = await getTaskCount();
    broadcastMessage('task_created', {
      task: {
        ...newTask,
        progress: newTask.progress || 0
      },
      count: taskCount,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({ 
      task: {
        ...newTask,
        progress: newTask.progress || 0
      }, 
      count: taskCount 
    });
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
router.patch("/api/tasks/:id/status", loadTaskMiddleware, validateTaskStatusTransition, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { status, progress } = updateTaskStatusSchema.parse(req.body);

    console.log('[Task Routes] Processing status update request:', {
      taskId,
      requestedStatus: status,
      requestedProgress: progress,
      currentTask: req.task
    });

    // Update task with new status and progress
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status,
        progress,
        updated_at: new Date(),
        metadata: {
          ...req.task?.metadata,
          statusFlow: [...(req.task?.metadata?.statusFlow || []), status],
          progressHistory: [
            ...(req.task?.metadata?.progressHistory || []),
            {
              value: progress,
              timestamp: new Date().toISOString()
            }
          ]
        }
      })
      .where(eq(tasks.id, taskId))
      .returning();

    console.log('[Task Routes] Task updated successfully:', {
      id: updatedTask.id,
      newStatus: updatedTask.status,
      newProgress: updatedTask.progress,
      metadata: updatedTask.metadata
    });

    // Get updated counts and broadcast task update with progress
    const taskCount = await getTaskCount();
    broadcastMessage('task_updated', {
      taskId: updatedTask.id,
      status: updatedTask.status,
      progress: updatedTask.progress || 0,
      metadata: updatedTask.metadata,
      count: taskCount,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      task: {
        ...updatedTask,
        progress: updatedTask.progress || 0
      }, 
      count: taskCount 
    });
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

export default router;