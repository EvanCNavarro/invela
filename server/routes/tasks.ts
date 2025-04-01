import { Router } from "express";
import { db } from "@db";
import { tasks, TaskStatus, companies } from "@db/schema";
import { eq, and, or, ilike } from "drizzle-orm";
import { z } from "zod";
import { broadcastMessage } from "../services/websocket"; // Use the correct import path
import { validateTaskStatusTransition, loadTaskMiddleware, TaskRequest } from "../middleware/taskValidation";

const router = Router();

// Get task by company name for CARD tasks
router.get("/api/tasks/card/:companyName", async (req, res) => {
  try {
    // IMPORTANT: Force content type to ensure it's JSON not HTML
    res.setHeader('Content-Type', 'application/json');
    
    console.log('[Tasks Routes] Fetching CARD task:', {
      companyName: req.params.companyName,
      timestamp: new Date().toISOString()
    });

    // Direct DB approach - get company first
    const company = await db.query.companies.findFirst({
      where: ilike(companies.name, req.params.companyName)
    });
    
    if (!company) {
      console.warn('[Tasks Routes] Company not found:', req.params.companyName);
      return res.status(404).json({ error: `Company not found: ${req.params.companyName}` });
    }
    
    console.log('[Tasks Routes] Company found:', {
      companyId: company.id,
      companyName: company.name
    });
    
    // Now get ALL tasks for this company and filter in JS
    const companyTasks = await db.query.tasks.findMany({
      where: eq(tasks.company_id, company.id)
    });
    
    console.log('[Tasks Routes] All tasks for company:', {
      count: companyTasks.length,
      types: companyTasks.map(t => t.task_type)
    });
    
    // Find CARD task
    const cardTask = companyTasks.find(task => 
      task.task_type === 'company_card'
    );
    
    if (!cardTask) {
      console.warn('[Tasks Routes] No CARD task found for company:', {
        companyName: req.params.companyName,
        timestamp: new Date().toISOString()
      });
      
      return res.status(404).json({ 
        error: `Could not find CARD (1033) task for company: ${req.params.companyName}` 
      });
    }
    
    console.log('[Tasks Routes] CARD task found:', {
      taskId: cardTask.id,
      taskTitle: cardTask.title,
      taskType: cardTask.task_type
    });
    
    // Return the task
    return res.status(200).json(cardTask);
  } catch (error) {
    console.error('[Tasks Routes] Error fetching CARD task:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({ error: "Failed to fetch CARD task" });
  }
});

// Get task by company name for KYB tasks
router.get("/api/tasks/kyb/:companyName", async (req, res) => {
  try {
    // IMPORTANT: Force content type to ensure it's JSON not HTML
    res.setHeader('Content-Type', 'application/json');
    
    console.log('[Tasks Routes] Fetching KYB task:', {
      companyName: req.params.companyName,
      timestamp: new Date().toISOString()
    });

    // Direct DB approach - get company first
    const company = await db.query.companies.findFirst({
      where: ilike(companies.name, req.params.companyName)
    });
    
    if (!company) {
      console.warn('[Tasks Routes] Company not found:', req.params.companyName);
      return res.status(404).json({ error: `Company not found: ${req.params.companyName}` });
    }
    
    console.log('[Tasks Routes] Company found:', {
      companyId: company.id,
      companyName: company.name
    });
    
    // Now get ALL tasks for this company and filter in JS
    const companyTasks = await db.query.tasks.findMany({
      where: eq(tasks.company_id, company.id)
    });
    
    console.log('[Tasks Routes] All tasks for company:', {
      count: companyTasks.length,
      types: companyTasks.map(t => t.task_type)
    });
    
    // Find KYB task
    const kybTask = companyTasks.find(task => 
      task.task_type === 'company_kyb' || 
      task.task_type === 'company_onboarding_KYB'
    );
    
    if (!kybTask) {
      console.warn('[Tasks Routes] No KYB task found for company:', {
        companyName: req.params.companyName,
        timestamp: new Date().toISOString()
      });
      
      return res.status(404).json({ 
        error: `Could not find KYB task for company: ${req.params.companyName}` 
      });
    }
    
    console.log('[Tasks Routes] KYB task found:', {
      taskId: kybTask.id,
      taskTitle: kybTask.title,
      taskType: kybTask.task_type
    });
    
    // Return the task
    return res.status(200).json(kybTask);
  } catch (error) {
    console.error('[Tasks Routes] Error fetching KYB task:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({ error: "Failed to fetch KYB task" });
  }
});

// Get task by company name for Security tasks
router.get("/api/tasks/security/:companyName", async (req, res) => {
  try {
    // IMPORTANT: Force content type to ensure it's JSON not HTML
    res.setHeader('Content-Type', 'application/json');
    
    console.log('[Tasks Routes] Fetching Security task:', {
      companyName: req.params.companyName,
      timestamp: new Date().toISOString()
    });

    // Direct DB approach - get company first
    const company = await db.query.companies.findFirst({
      where: ilike(companies.name, req.params.companyName)
    });
    
    if (!company) {
      console.warn('[Tasks Routes] Company not found:', req.params.companyName);
      return res.status(404).json({ error: `Company not found: ${req.params.companyName}` });
    }
    
    console.log('[Tasks Routes] Company found:', {
      companyId: company.id,
      companyName: company.name
    });
    
    // Now get ALL tasks for this company and filter in JS
    const companyTasks = await db.query.tasks.findMany({
      where: eq(tasks.company_id, company.id)
    });
    
    console.log('[Tasks Routes] All tasks for company:', {
      count: companyTasks.length,
      types: companyTasks.map(t => t.task_type)
    });
    
    // Find Security task
    const securityTask = companyTasks.find(task => 
      task.task_type === 'security_assessment'
    );
    
    if (!securityTask) {
      console.warn('[Tasks Routes] No Security task found for company:', {
        companyName: req.params.companyName,
        timestamp: new Date().toISOString()
      });
      
      return res.status(404).json({ 
        error: `Could not find Security Assessment task for company: ${req.params.companyName}` 
      });
    }
    
    console.log('[Tasks Routes] Security task found:', {
      taskId: securityTask.id,
      taskTitle: securityTask.title,
      taskType: securityTask.task_type
    });
    
    // Return the task
    return res.status(200).json(securityTask);
  } catch (error) {
    console.error('[Tasks Routes] Error fetching Security task:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({ error: "Failed to fetch Security Assessment task" });
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
router.patch("/api/tasks/:id/status", loadTaskMiddleware, validateTaskStatusTransition, async (req: TaskRequest, res) => {
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

// Get a task by ID (direct lookup endpoint for task-page.tsx)
router.get("/api/tasks/:id", async (req, res) => {
  try {
    // Explicitly set header for JSON (crucial to avoid Vite interference)
    res.setHeader('Content-Type', 'application/json');
    
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    
    console.log('[Tasks Routes] Fetching task by ID:', {
      taskId,
      timestamp: new Date().toISOString()
    });
    
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      console.warn('[Tasks Routes] Task not found:', {
        taskId,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ error: "Task not found" });
    }
    
    console.log('[Tasks Routes] Task found by ID:', {
      taskId: task.id,
      title: task.title,
      type: task.task_type,
      timestamp: new Date().toISOString()
    });
    
    return res.status(200).json(task);
  } catch (error) {
    console.error('[Tasks Routes] Error fetching task by ID:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({ error: "Failed to fetch task" });
  }
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

// SPECIAL API for fixing the task navigation issue - completely different URL structure
router.post("/__special_non_vite_route__/unique_task_lookup_system", async (req, res) => {
  try {
    // Force JSON response
    res.setHeader('Content-Type', 'application/json');
    
    // Get company name from request body
    const { companyName, taskType } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ 
        error: "Missing companyName in request body" 
      });
    }
    
    console.log('[Task Lookup API] Request received:', {
      companyName,
      taskType,
      timestamp: new Date().toISOString()
    });
    
    // Find company
    const company = await db.query.companies.findFirst({
      where: ilike(companies.name, companyName)
    });
    
    if (!company) {
      console.warn('[Task Lookup API] Company not found:', {
        companyName,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ 
        error: `Company not found: ${companyName}` 
      });
    }
    
    console.log('[Task Lookup API] Company found:', {
      id: company.id,
      name: company.name
    });
    
    // Get tasks for this company
    const companyTasks = await db.query.tasks.findMany({
      where: eq(tasks.company_id, company.id)
    });
    
    // Filter task based on type if provided
    let matchingTask = null;
    
    if (taskType) {
      if (taskType === 'kyb') {
        matchingTask = companyTasks.find(t => 
          t.task_type === 'company_kyb' || t.task_type === 'company_onboarding_KYB'
        );
      } else if (taskType === 'security') {
        matchingTask = companyTasks.find(t => 
          t.task_type === 'security_assessment'
        );
      } else if (taskType === 'card') {
        matchingTask = companyTasks.find(t => 
          t.task_type === 'company_card'
        );
      }
      
      if (!matchingTask) {
        console.warn('[Task Lookup API] No matching task found:', {
          companyName,
          taskType,
          availableTypes: companyTasks.map(t => t.task_type),
          timestamp: new Date().toISOString()
        });
        
        return res.status(404).json({
          error: `No ${taskType.toUpperCase()} task found for company: ${companyName}`
        });
      }
      
      console.log('[Task Lookup API] Matching task found:', {
        taskId: matchingTask.id,
        taskType: matchingTask.task_type,
        title: matchingTask.title
      });
      
      return res.status(200).json({
        task: matchingTask
      });
    }
    
    // Return all tasks if no specific type requested
    console.log('[Task Lookup API] Returning all company tasks:', {
      count: companyTasks.length,
      types: companyTasks.map(t => t.task_type)
    });
    
    return res.status(200).json({
      company: {
        id: company.id,
        name: company.name
      },
      tasks: companyTasks
    });
  } catch (error) {
    console.error('[Task Lookup API] Error:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({ 
      error: "Failed to process task lookup request" 
    });
  }
});

export default router;