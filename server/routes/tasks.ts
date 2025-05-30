import { Router } from "express";
import { db } from "@db";
import { tasks, TaskStatus as DbTaskStatus, companies, kybFields, kybResponses, ky3pFields, ky3pResponses, openBankingFields, openBankingResponses } from "@db/schema";
import { eq, and, or, ilike } from "drizzle-orm";
import { z } from "zod";
import { broadcastTaskUpdate } from "../utils/unified-websocket";
import { validateTaskStatusTransition, loadTaskMiddleware, TaskRequest } from "../middleware/taskValidation";
import { requireAuth } from '../middleware/auth';
import { determineStatusFromProgress, broadcastProgressUpdate } from '../utils/progress';
import { logger } from '../utils/logger';
import { standardFormSubmission, TaskStatus } from '../utils/form-standardization';
import { FileCreationService } from '../services/file-creation';
import { CompanyTabsService } from '../services/company-tabs';
import { isCompanyDemo } from '../utils/demo-helpers';
import { processDependencies, unlockOpenBankingTasks } from './task-dependencies';
import { submitFormWithImmediateUnlock } from '../services/form-submission-handler';
import { unlockDependentTasksImmediately } from '../services/synchronous-task-dependencies';

// Logger is already initialized in the imported module

const router = Router();

// Utility function to get a company by name
const getCompanyByName = async (companyName: string) => {
  return await db.query.companies.findFirst({
    where: ilike(companies.name, companyName)
  });
};

// Utility function to find a task by company ID and task type
const getTaskByCompanyAndType = async (companyId: number, taskType: string) => {
  return await db.query.tasks.findFirst({
    where: and(
      eq(tasks.company_id, companyId),
      eq(tasks.task_type, taskType)
    )
  });
};

// Get task by company name for CARD tasks
router.get("/api/tasks/card/:companyName", requireAuth, async (req, res) => {
  try {
    // IMPORTANT: Force content type to ensure it's JSON not HTML
    res.setHeader('Content-Type', 'application/json');
    
    // If "Unknown Company" is passed, use the current user's company if available
    let companyNameToUse = req.params.companyName;
    
    if (companyNameToUse === 'Unknown Company' && req.user?.company_id) {
      // Get current user's company
      const currentCompany = await db.query.companies.findFirst({
        where: eq(companies.id, req.user.company_id)
      });
      
      if (currentCompany) {
        companyNameToUse = currentCompany.name;
        console.log('[Tasks Routes] Using current user company instead of "Unknown Company":', {
          userId: req.user.id,
          companyId: req.user.company_id,
          companyName: companyNameToUse,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    console.log('[Tasks Routes] Fetching CARD task:', {
      originalCompanyName: req.params.companyName,
      companyNameToUse,
      timestamp: new Date().toISOString()
    });

    // Direct DB approach - get company first
    const company = await db.query.companies.findFirst({
      where: ilike(companies.name, companyNameToUse)
    });
    
    if (!company) {
      console.warn('[Tasks Routes] Company not found:', companyNameToUse);
      return res.status(404).json({ error: `Company not found: ${companyNameToUse}` });
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
    
    // Find CARD task (Open Banking 1033 Survey)
    const cardTask = companyTasks.find(task => 
      task.task_type === 'company_card'
    );
    
    if (!cardTask) {
      console.warn('[Tasks Routes] No Open Banking (1033) Survey task found for company:', {
        companyName: companyNameToUse,
        timestamp: new Date().toISOString()
      });
      
      return res.status(404).json({ 
        error: `Could not find Open Banking (1033) Survey task for company: ${companyNameToUse}` 
      });
    }
    
    console.log('[Tasks Routes] Open Banking (1033) Survey task found:', {
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
router.get("/api/tasks/kyb/:companyName", requireAuth, async (req, res) => {
  try {
    // IMPORTANT: Force content type to ensure it's JSON not HTML
    res.setHeader('Content-Type', 'application/json');
    
    // If "Unknown Company" is passed, use the current user's company if available
    let companyNameToUse = req.params.companyName;
    
    if (companyNameToUse === 'Unknown Company' && req.user?.company_id) {
      // Get current user's company
      const currentCompany = await db.query.companies.findFirst({
        where: eq(companies.id, req.user.company_id)
      });
      
      if (currentCompany) {
        companyNameToUse = currentCompany.name;
        console.log('[Tasks Routes] Using current user company instead of "Unknown Company":', {
          userId: req.user.id,
          companyId: req.user.company_id,
          companyName: companyNameToUse,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    console.log('[Tasks Routes] Fetching KYB task:', {
      originalCompanyName: req.params.companyName,
      companyNameToUse,
      timestamp: new Date().toISOString()
    });

    // Direct DB approach - get company first
    const company = await db.query.companies.findFirst({
      where: ilike(companies.name, companyNameToUse)
    });
    
    if (!company) {
      console.warn('[Tasks Routes] Company not found:', companyNameToUse);
      return res.status(404).json({ error: `Company not found: ${companyNameToUse}` });
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
        companyName: companyNameToUse,
        timestamp: new Date().toISOString()
      });
      
      return res.status(404).json({ 
        error: `Could not find KYB task for company: ${companyNameToUse}` 
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
router.get("/api/tasks/security/:companyName", requireAuth, async (req, res) => {
  try {
    // IMPORTANT: Force content type to ensure it's JSON not HTML
    res.setHeader('Content-Type', 'application/json');
    
    // If "Unknown Company" is passed, use the current user's company if available
    let companyNameToUse = req.params.companyName;
    
    if (companyNameToUse === 'Unknown Company' && req.user?.company_id) {
      // Get current user's company
      const currentCompany = await db.query.companies.findFirst({
        where: eq(companies.id, req.user.company_id)
      });
      
      if (currentCompany) {
        companyNameToUse = currentCompany.name;
        console.log('[Tasks Routes] Using current user company instead of "Unknown Company":', {
          userId: req.user.id,
          companyId: req.user.company_id,
          companyName: companyNameToUse,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    console.log('[Tasks Routes] Fetching Security task:', {
      originalCompanyName: req.params.companyName,
      companyNameToUse,
      timestamp: new Date().toISOString()
    });

    // Direct DB approach - get company first
    const company = await db.query.companies.findFirst({
      where: ilike(companies.name, companyNameToUse)
    });
    
    if (!company) {
      console.warn('[Tasks Routes] Company not found:', companyNameToUse);
      return res.status(404).json({ error: `Company not found: ${companyNameToUse}` });
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
        companyName: companyNameToUse,
        timestamp: new Date().toISOString()
      });
      
      return res.status(404).json({ 
        error: `Could not find Security Assessment task for company: ${companyNameToUse}` 
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
router.post("/api/tasks", requireAuth, async (req, res) => {
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
    broadcastTaskUpdate({
      id: newTask.id,
      status: newTask.status as TaskStatus,
      progress: newTask.progress || 0,
      metadata: newTask.metadata || {}
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
router.delete("/api/tasks/:id", requireAuth, async (req, res) => {
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
    // Use standardized WebSocketService for broadcasting task deletion
    WebSocketService.broadcast('task_delete', {
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
    broadcastTaskUpdate({
      id: updatedTask.id,
      status: updatedTask.status as TaskStatus,
      progress: updatedTask.progress || 0,
      metadata: updatedTask.metadata || {}
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
router.get("/api/tasks/:id", requireAuth, async (req, res) => {
  try {
    // Explicitly set header for JSON (crucial to avoid Vite interference)
    res.setHeader('Content-Type', 'application/json');
    
    // SECURITY: Check if user is authenticated and has a company ID
    if (!req.user?.company_id) {
      console.error('[Tasks Routes] Access denied - user has no company ID:', {
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    
    console.log('[Tasks Routes] Fetching task by ID:', {
      taskId,
      userCompanyId: req.user.company_id,
      timestamp: new Date().toISOString()
    });
    
    // Get the task data WITH COMPANY VERIFICATION
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.company_id, req.user.company_id) // CRITICAL: Verify task belongs to user's company
      )
    });
    
    if (!task) {
      console.warn('[Tasks Routes] Task not found:', {
        taskId,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Now fetch the latest saved form data for KYB tasks
    let savedFormData: Record<string, any> = {};
    
    if (task.task_type === 'kyb' || task.task_type === 'company_kyb') {
      try {
        // This is critical - fetch the most up-to-date form data from the database
        console.log('[Tasks Routes] Fetching latest KYB form data for task:', taskId);
        
        // Get all KYB fields to ensure we have the field keys
        const fields = await db.select().from(kybFields);
        const fieldMap = new Map(fields.map(f => [f.id, f.field_key]));
        
        // Fetch the latest responses
        const responses = await db.select({
          field_id: kybResponses.field_id,
          response_value: kybResponses.response_value
        })
        .from(kybResponses)
        .where(eq(kybResponses.task_id, taskId));
        
        // Convert responses to form data format
        if (responses.length > 0) {
          console.log(`[Tasks Routes] Found ${responses.length} KYB responses for task ${taskId}`);
          
          for (const response of responses) {
            const fieldKey = fieldMap.get(response.field_id);
            if (fieldKey && response.response_value !== null) {
              savedFormData[fieldKey] = response.response_value;
            }
          }
          
          console.log(`[Tasks Routes] Constructed form data with ${Object.keys(savedFormData).length} fields`);
        } else {
          console.log(`[Tasks Routes] No KYB responses found for task ${taskId}`);
        }
      } catch (error) {
        console.error('[Tasks Routes] Error fetching KYB form data:', error);
        // Don't fail the whole request if we can't get form data
      }
    }
    
    console.log('[Tasks Routes] Task found by ID:', {
      taskId: task.id,
      title: task.title,
      type: task.task_type,
      formDataFields: Object.keys(savedFormData).length,
      timestamp: new Date().toISOString()
    });
    
    // Send task with the freshly loaded form data
    return res.status(200).json({
      ...task,
      savedFormData
    });
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

// Import the demo helpers
import { generateDemoData } from '../utils/demo-helpers';

// Helper to check if the company is a demo company
async function isCompanyDemo(companyId: number): Promise<boolean> {
  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });
    
    if (!company) {
      return false;
    }
    
    // Check if it's a demo company based on name (case insensitive)
    const namePattern = /(DevTest|DevelopmentTesting|demo)/i;
    return namePattern.test(company.name);
  } catch (error) {
    logger.error('Error checking company demo status', {
      error,
      message: error instanceof Error ? error.message : String(error),
      companyId
    });
    return false;
  }
}

// Unified demo data endpoint for all form types
router.get("/api/tasks/:taskId/:taskType-demo", requireAuth, async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      logger.warn('Unauthenticated user attempted to access demo data');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to use this feature'
      });
    }
    
    const { taskId, taskType } = req.params;
    const parsedTaskId = parseInt(taskId);
    
    if (isNaN(parsedTaskId)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    
    logger.info('Demo data requested', { taskId: parsedTaskId, taskType, userId: req.user.id });
    
    // Get the task to retrieve company information
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, parsedTaskId)
    });
    
    if (!task) {
      logger.error('Task not found for demo data', { taskId: parsedTaskId, taskType });
      return res.status(404).json({ 
        error: 'Task not found',
        message: 'Could not find the specified task'
      });
    }
    
    // Security check: Verify user belongs to company that owns the task
    if (req.user.company_id !== task.company_id) {
      logger.error('Security violation: User attempted to access task from another company', {
        userId: req.user.id,
        userCompanyId: req.user.company_id,
        taskId: task.id,
        taskCompanyId: task.company_id
      });
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this task'
      });
    }
    
    // Check if this is a demo company
    const isDemo = await isCompanyDemo(task.company_id);
    
    if (!isDemo) {
      logger.warn('Non-demo company attempted to use demo features', { 
        taskId: parsedTaskId, 
        companyId: task.company_id
      });
      
      return res.status(403).json({
        error: 'Not a demo company',
        message: 'Auto-fill is only available for demo companies'
      });
    }
    
    // Get company data for personalization
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, task.company_id)
    });
    
    // Map the task type from client-provided value to internal task_type
    let internalTaskType = task.task_type;
    
    // Normalize task types for consistent demo data generation
    if (taskType === 'kyb' && (task.task_type === 'company_kyb' || task.task_type === 'company_onboarding_KYB')) {
      internalTaskType = 'company_kyb';
    } else if (taskType === 'ky3p' && (task.task_type === 'sp_ky3p_assessment' || task.task_type === 'security_assessment')) {
      internalTaskType = 'ky3p';
    } else if (taskType === 'open_banking' && task.task_type === 'open_banking') {
      internalTaskType = 'open_banking';
    }
    
    // Generate demo data based on the task type and company name
    const demoData = generateDemoData(
      internalTaskType, 
      company?.name || 'Demo Company'
    );
    
    logger.info('Generated demo data for task', { 
      taskId: parsedTaskId, 
      originalTaskType: taskType,
      internalTaskType,
      dataFields: Object.keys(demoData).length
    });
    
    // Return the demo data as JSON
    return res.status(200).json(demoData);
  } catch (error) {
    logger.error('Error generating demo data', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({ 
      error: 'Server error',
      message: 'An unexpected error occurred while generating demo data'
    });
  }
});

// Special JSON endpoint with .json extension to prevent Vite conflicts 
router.get("/api/tasks.json/:id", requireAuth, async (req, res) => {
  try {
    // Force JSON response
    res.setHeader('Content-Type', 'application/json');
    
    // SECURITY: Check if user is authenticated and has a company ID
    if (!req.user?.company_id) {
      console.error('[Tasks Routes] Access denied - user has no company ID (special .json endpoint):', {
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    
    console.log('[Tasks Routes] Fetching task by ID (special .json endpoint):', {
      taskId,
      userCompanyId: req.user.company_id,
      timestamp: new Date().toISOString()
    });
    
    // Get the task data WITH COMPANY VERIFICATION
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.company_id, req.user.company_id) // CRITICAL: Verify task belongs to user's company
      )
    });
    
    if (!task) {
      console.warn('[Tasks Routes] Task not found (special .json endpoint):', {
        taskId,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Now fetch the latest saved form data for KYB tasks
    let savedFormData: Record<string, any> = {};
    
    if (task.task_type === 'kyb' || task.task_type === 'company_kyb') {
      try {
        // This is critical - fetch the most up-to-date form data from the database
        console.log('[Tasks Routes] Fetching latest KYB form data for task (special .json endpoint):', taskId);
        
        // Get all KYB fields to ensure we have the field keys
        const fields = await db.select().from(kybFields);
        const fieldMap = new Map(fields.map(f => [f.id, f.field_key]));
        
        // Fetch the latest responses
        const responses = await db.select({
          field_id: kybResponses.field_id,
          response_value: kybResponses.response_value
        })
        .from(kybResponses)
        .where(eq(kybResponses.task_id, taskId));
        
        // Convert responses to form data format
        if (responses.length > 0) {
          console.log(`[Tasks Routes] Found ${responses.length} KYB responses for task ${taskId} (special .json endpoint)`);
          
          for (const response of responses) {
            const fieldKey = fieldMap.get(response.field_id);
            if (fieldKey && response.response_value !== null) {
              savedFormData[fieldKey] = response.response_value;
            }
          }
          
          console.log(`[Tasks Routes] Constructed form data with ${Object.keys(savedFormData).length} fields (special .json endpoint)`);
        }
      } catch (error) {
        console.error('[Tasks Routes] Error fetching KYB form data (special .json endpoint):', error);
        // Don't fail the whole request if we can't get form data
      }
    }
    
    console.log('[Tasks Routes] Task found by ID (special .json endpoint):', {
      taskId: task.id,
      title: task.title,
      type: task.task_type,
      formDataFields: Object.keys(savedFormData).length,
      timestamp: new Date().toISOString()
    });
    
    // Send task with the freshly loaded form data
    return res.status(200).json({
      ...task,
      savedFormData
    });
  } catch (error) {
    console.error('[Tasks Routes] Error fetching task by ID (special .json endpoint):', {
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
router.post("/__special_non_vite_route__/unique_task_lookup_system", requireAuth, async (req, res) => {
  try {
    // Force JSON response
    res.setHeader('Content-Type', 'application/json');
    
    // Get company name from request body
    let { companyName, taskType } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ 
        error: "Missing companyName in request body" 
      });
    }
    
    // If "Unknown Company" is passed, use the current user's company if available
    if (companyName === 'Unknown Company' && req.user?.company_id) {
      // Get current user's company
      const currentCompany = await db.query.companies.findFirst({
        where: eq(companies.id, req.user.company_id)
      });
      
      if (currentCompany) {
        companyName = currentCompany.name;
        console.log('[Task Lookup API] Using current user company instead of "Unknown Company":', {
          userId: req.user.id,
          companyId: req.user.company_id,
          companyName,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    console.log('[Task Lookup API] Request received:', {
      originalCompanyName: req.body.companyName,
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
        // Look for either company_card (old CARD task) or open_banking (new Open Banking Survey task)
        matchingTask = companyTasks.find(t => 
          t.task_type === 'company_card' || t.task_type === 'open_banking'
        );
      } else if (taskType === 'open_banking') {
        // Direct lookup for Open Banking Survey task
        matchingTask = companyTasks.find(t => 
          t.task_type === 'open_banking'
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

// API endpoint to update task progress on form unmount (added for task center consistency)
import { reconcileTaskProgress } from '../utils/task-reconciliation';

// Endpoint to completely clear form data for a task
router.post('/api/tasks/:taskId/clear-form-data', requireAuth, async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    // Log the clear request
    logger.info('Clearing form data for task', {
      taskId,
      timestamp: new Date().toISOString(),
      userId: req.user?.id
    });
    
    // Get the current task data
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Determine task type to clear form data from the right tables
    const taskType = task.task_type;
    
    // Delete all related form responses based on task type
    try {
      // 1. Clear savedFormData in task
      await db.update(tasks)
        .set({
          savedFormData: null,
          progress: 0,
          status: 'not_started'
        })
        .where(eq(tasks.id, taskId));
      
      logger.info('Successfully cleared task savedFormData', { taskId });
      
      // 2. Based on task type, clear responses from appropriate tables
      if (taskType === 'company_kyb') {
        // Clear KYB responses
        const deleteResult = await db.delete(kybResponses)
          .where(eq(kybResponses.task_id, taskId));
        
        logger.info('Cleared KYB responses', { 
          taskId, 
          count: deleteResult?.rowsAffected || 'unknown'
        });
      } 
      else if (taskType === 'sp_ky3p_assessment') {
        // Clear KY3P responses - assuming there's a similar table structure
        // Implementation would go here
        logger.info('KY3P response clearing not implemented yet');
      }
      else if (taskType === 'open_banking_survey' || taskType === 'open_banking') {
        // Clear Open Banking responses - assuming there's a similar table structure
        // Implementation would go here
        logger.info('Open Banking response clearing not implemented yet');
      }
      
      // 3. Force rebuild the form structure by clearing caches
      // Log that we've completed the operation
      logger.info('Task form data successfully cleared', { 
        taskId,
        taskType
      });
      
      // 4. Force recalculate progress
      await reconcileTaskProgress(taskId, { forceUpdate: true, debug: true });
      
      // 5. Broadcast the update to connected clients
      broadcastTaskUpdate(taskId, 0, 'not_started');
      
      // Return success
      return res.status(200).json({
        success: true,
        message: 'Form data successfully cleared',
        taskId,
        timestamp: new Date().toISOString()
      });
    } catch (clearError) {
      logger.error('Error clearing form data', { 
        taskId, 
        error: clearError instanceof Error ? clearError.message : String(clearError)
      });
      
      return res.status(500).json({ 
        error: 'Failed to clear form data',
        message: clearError instanceof Error ? clearError.message : 'Unknown error'
      });
    }
  } catch (error) {
    logger.error('Error in clear-form-data endpoint', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/api/tasks/:taskId/update-progress', requireAuth, async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    // Log the update request
    console.log('[Tasks Routes] Updating task progress:', {
      taskId,
      timestamp: new Date().toISOString()
    });
    
    // Instead of accepting client progress at face value,
    // use our reconciliation function to calculate the actual progress
    // This ensures consistency between form view and task center
    await reconcileTaskProgress(taskId, { forceUpdate: true, debug: true });
    
    // Get the now-reconciled task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    console.log('[Tasks Routes] Task progress reconciled:', {
      taskId,
      progress: task.progress,
      status: task.status,
      timestamp: new Date().toISOString()
    });
    
    return res.json({
      success: true,
      progress: task.progress,
      status: task.status,
      taskId
    });
  } catch (error) {
    console.error('[Tasks Routes] Error updating task progress:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Synchronize Task Form Data
 * 
 * This endpoint handles synchronizing data between task.savedFormData 
 * and the individual field responses in the database to prevent
 * data inconsistency when navigating between forms
 */
router.post('/api/tasks/:taskId/sync-form-data', requireAuth, async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    console.log('[Tasks Routes] Synchronizing form data for task:', {
      taskId,
      timestamp: new Date().toISOString()
    });
    
    // Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
      
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Handle data synchronization based on task type
    const taskType = task.task_type;
    let formData: Record<string, any> = {};
    let fieldResponses: Array<any> = [];
    
    if (taskType === 'company_kyb') {
      // Get all KYB responses for this task with their field information
      const responses = await db.select({
        id: kybResponses.id,
        field_id: kybResponses.field_id,
        field_key: kybFields.field_key,
        response_value: kybResponses.response_value,
        status: kybResponses.status,
        version: kybResponses.version
      })
        .from(kybResponses)
        .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
        .where(eq(kybResponses.task_id, taskId));
      
      fieldResponses = responses;
      
      // Convert responses to form data
      for (const response of responses) {
        if (response.response_value !== null) {
          formData[response.field_key] = response.response_value;
        }
      }
    } 
    else if (taskType === 'sp_ky3p_assessment') {
      // Get all KY3P responses for this task
      const responses = await db.select({
        id: ky3pResponses.id,
        field_id: ky3pResponses.field_id,
        field_key: ky3pFields.field_key,
        response_value: ky3pResponses.response_value,
        status: ky3pResponses.status,
        version: ky3pResponses.version
      })
        .from(ky3pResponses)
        .innerJoin(ky3pFields, eq(ky3pResponses.field_id, ky3pFields.id))
        .where(eq(ky3pResponses.task_id, taskId));
      
      fieldResponses = responses;
      
      // Convert responses to form data
      for (const response of responses) {
        if (response.response_value !== null) {
          formData[response.field_key] = response.response_value;
        }
      }
    }
    else if (taskType === 'open_banking_survey' || taskType === 'open_banking') {
      // Get all Open Banking responses for this task
      const responses = await db.select({
        id: openBankingResponses.id,
        field_id: openBankingResponses.field_id,
        field_key: openBankingFields.field_key,
        response_value: openBankingResponses.response_value,
        status: openBankingResponses.status,
        version: openBankingResponses.version
      })
        .from(openBankingResponses)
        .innerJoin(openBankingFields, eq(openBankingResponses.field_id, openBankingFields.id))
        .where(eq(openBankingResponses.task_id, taskId));
      
      fieldResponses = responses;
      
      // Convert responses to form data
      for (const response of responses) {
        if (response.response_value !== null) {
          formData[response.field_key] = response.response_value;
        }
      }
    }
    
    // Determine which data source to use as the source of truth
    let selectedFormData: Record<string, any> = {};
    let syncDirection = 'none'; // 'none', 'to_task', or 'to_fields'
    
    if (Object.keys(formData).length > 0 && (!task.savedFormData || Object.keys(task.savedFormData).length === 0)) {
      // If we have field responses but no savedFormData, update the task
      selectedFormData = formData;
      syncDirection = 'to_task';
      
      console.log('[Tasks Routes] Field responses exist but no savedFormData, syncing TO task', {
        responseCount: Object.keys(formData).length
      });
    } 
    else if (task.savedFormData && Object.keys(task.savedFormData).length > 0 && Object.keys(formData).length === 0) {
      // If we have savedFormData but no field responses, use savedFormData and update fields
      selectedFormData = task.savedFormData;
      syncDirection = 'to_fields';
      
      console.log('[Tasks Routes] savedFormData exists but no field responses, syncing TO fields', {
        savedFormDataCount: Object.keys(task.savedFormData).length
      });
    } 
    else if (task.savedFormData && Object.keys(task.savedFormData).length > 0 && Object.keys(formData).length > 0) {
      // If we have both, compare and use the one with more fields
      if (Object.keys(task.savedFormData).length > Object.keys(formData).length) {
        selectedFormData = task.savedFormData;
        syncDirection = 'to_fields';
        
        console.log('[Tasks Routes] Both exist, but savedFormData has more fields, syncing TO fields', {
          savedFormDataCount: Object.keys(task.savedFormData).length,
          responseCount: Object.keys(formData).length
        });
      } 
      else if (Object.keys(formData).length > Object.keys(task.savedFormData).length) {
        selectedFormData = formData;
        syncDirection = 'to_task';
        
        console.log('[Tasks Routes] Both exist, but field responses have more fields, syncing TO task', {
          savedFormDataCount: Object.keys(task.savedFormData).length,
          responseCount: Object.keys(formData).length
        });
      } 
      else {
        // If they have the same number of fields, check for differences
        let hasDifference = false;
        
        for (const [key, value] of Object.entries(formData)) {
          if (task.savedFormData[key] !== value) {
            hasDifference = true;
            break;
          }
        }
        
        if (hasDifference) {
          // Use the most recently updated data source
          // For simplicity, we'll prefer field responses as they are usually more granular
          selectedFormData = formData;
          syncDirection = 'to_task';
          
          console.log('[Tasks Routes] Both exist with same number of fields but with differences, syncing TO task');
        } else {
          console.log('[Tasks Routes] Both exist with identical content, no sync needed');
        }
      }
    }
    
    // Perform synchronization
    if (syncDirection === 'to_task') {
      // Update task.savedFormData from field responses
      await db.update(tasks)
        .set({
          savedFormData: selectedFormData,
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
        
      console.log('[Tasks Routes] Updated task.savedFormData with field response data');
    } 
    else if (syncDirection === 'to_fields') {
      // Update field responses from task.savedFormData
      if (taskType === 'company_kyb') {
        // Get all field definitions for mapping
        const fields = await db.select()
          .from(kybFields);
        
        // Create field key to ID mapping
        const fieldMap = new Map();
        fields.forEach(field => {
          fieldMap.set(field.field_key, field.id);
        });
        
        // Process each field in savedFormData
        for (const [fieldKey, value] of Object.entries(selectedFormData)) {
          const fieldId = fieldMap.get(fieldKey);
          
          if (!fieldId) {
            console.warn(`[Tasks Routes] Field ${fieldKey} not found in KYB fields`);
            continue;
          }
          
          const responseValue = value === null || value === undefined ? '' : String(value);
          const status = responseValue === '' ? 'EMPTY' : 'COMPLETE';
          
          // Check if response exists
          const existingResponse = fieldResponses.find(r => r.field_key === fieldKey);
          
          if (existingResponse) {
            // Update existing response
            await db.update(kybResponses)
              .set({
                response_value: responseValue,
                status,
                version: existingResponse.version + 1,
                updated_at: new Date()
              })
              .where(eq(kybResponses.id, existingResponse.id));
          } else {
            // Create new response
            await db.insert(kybResponses)
              .values({
                task_id: taskId,
                field_id: fieldId,
                field_key: fieldKey,
                response_value: responseValue,
                status,
                created_by: req.user?.id || task.created_by,
                updated_by: req.user?.id || task.created_by,
                version: 1
              });
          }
        }
        
        console.log('[Tasks Routes] Updated KYB field responses with task.savedFormData');
      }
      // Similar handling for other task types would go here
      // (KY3P and Open Banking)
    }
    
    // Recalculate task progress
    await reconcileTaskProgress(taskId, { forceUpdate: true });
    
    // Get the latest task data
    const updatedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    console.log('[Tasks Routes] Form data synchronization completed for task:', {
      taskId,
      syncDirection,
      progress: updatedTask?.progress || 0,
      status: updatedTask?.status,
      timestamp: new Date().toISOString()
    });
    
    // Return success with the synchronized form data
    return res.json({
      success: true,
      formData: selectedFormData,
      progress: updatedTask?.progress || 0,
      status: updatedTask?.status,
      taskId,
      syncDirection
    });
  } catch (error) {
    console.error('[Tasks Routes] Error synchronizing form data:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({ error: 'Failed to synchronize form data' });
  }
});


// STANDARDIZED FORM SUBMISSION ENDPOINTS FOR ALL FORM TYPES
// =====================================================================

/**
 * Convert KYB form data to CSV
 */
const convertKybToCSV = (fields: any[], formData: Record<string, any>): string => {
  // Header row: field key, display name, response
  const headerRow = ['Field Key', 'Display Name', 'Response'];
  const rows = [headerRow];
  
  // Add data rows
  for (const field of fields) {
    const value = formData[field.field_key] ?? '';
    rows.push([
      field.field_key,
      field.display_name || field.field_key,
      // Ensure proper CSV escaping for values with commas
      typeof value === 'string' && value.includes(',') ? `"${value}"` : value
    ]);
  }
  
  // Join all rows with newlines
  return rows.map(row => row.join(',')).join('\n');
};

/**
 * Convert KY3P form data to CSV
 */
const convertKy3pToCSV = (fields: any[], formData: Record<string, any>): string => {
  // Header row: field key, display name, group, response
  const headerRow = ['Field Key', 'Display Name', 'Group', 'Response'];
  const rows = [headerRow];
  
  // Add data rows
  for (const field of fields) {
    const value = formData[field.field_key] ?? '';
    rows.push([
      field.field_key,
      field.display_name || field.field_key,
      field.group || '',
      // Ensure proper CSV escaping for values with commas
      typeof value === 'string' && value.includes(',') ? `"${value}"` : value
    ]);
  }
  
  // Join all rows with newlines
  return rows.map(row => row.join(',')).join('\n');
};

/**
 * Convert Open Banking form data to CSV
 */
const convertOpenBankingToCSV = (fields: any[], formData: Record<string, any>): string => {
  // Header row: field key, display name, section, response
  const headerRow = ['Field Key', 'Display Name', 'Section', 'Response'];
  const rows = [headerRow];
  
  // Add data rows
  for (const field of fields) {
    const fieldKey = field.field_key || field.key || field.name;
    const value = formData[fieldKey] ?? '';
    rows.push([
      fieldKey,
      field.display_name || field.name || fieldKey,
      field.section || '',
      // Ensure proper CSV escaping for values with commas
      typeof value === 'string' && value.includes(',') ? `"${value}"` : value
    ]);
  }
  
  // Join all rows with newlines
  return rows.map(row => row.join(',')).join('\n');
};

// Universal KYB form submission endpoint
router.post('/api/tasks/:taskId/kyb-submit', requireAuth, async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const { formData, fileName } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get task details
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    logger.info('Processing KYB form submission with synchronous task dependencies', {
      taskId,
      companyId: task.company_id
    });
    
    // Get all KYB fields
    const fields = await db.select()
      .from(kybFields)
      .orderBy(kybFields.order);
    
    // Save responses to database
    for (const field of fields) {
      const value = formData[field.field_key];
      const status = value ? 'COMPLETE' : 'EMPTY';
      
      try {
        // First try to insert
        await db.insert(kybResponses)
          .values({
            task_id: taskId,
            field_id: field.id,
            response_value: value || null,
            status,
            version: 1,
            created_at: new Date(),
            updated_at: new Date()
          });
      } catch (err) {
        const error = err as Error;
        if (error.message.includes('duplicate key value violates unique constraint')) {
          // If duplicate, update instead
          await db.update(kybResponses)
            .set({
              response_value: value || null,
              status,
              version: sql`${kybResponses.version} + 1`,
              updated_at: new Date()
            })
            .where(
              and(
                eq(kybResponses.task_id, taskId),
                eq(kybResponses.field_id, field.id)
              )
            );
        } else {
          throw error;
        }
      }
    }
    
    // Use our enhanced form submission handler with immediate task unlocking
    const result = await submitFormWithImmediateUnlock({
      taskId,
      userId: req.user.id,
      companyId: task.company_id,
      formData,
      formType: 'kyb',
      fileName
    });
    
    logger.info('KYB form submission completed with synchronous task unlocking', {
      taskId,
      companyId: task.company_id,
      success: result.success
    });
    
    // Return the standardized response
    res.json({
      ...result,
      fileId: result.fileId || null, // Ensure fileId is included if available
      success: true,
      message: 'Form submitted successfully'
    });
  } catch (error) {
    logger.error('Error submitting KYB form', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({ 
      error: 'Failed to submit form',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Universal KY3P form submission endpoint with standardized file creation
router.post('/api/tasks/:taskId/ky3p-submit-standard', requireAuth, async (req, res) => {
  logger.info('[Tasks Routes] Using standardized KY3P submit endpoint with synchronous task unlocking');
  try {
    const taskId = Number(req.params.taskId);
    const { formData, fileName } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get task details
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    logger.info('Processing KY3P form submission with synchronous task dependencies', {
      taskId,
      companyId: task.company_id
    });
    
    // Get all KY3P fields
    const fields = await db.select()
      .from(ky3pFields)
      .orderBy(ky3pFields.order);
    
    // Save responses to database
    for (const field of fields) {
      const fieldKey = field.field_key;
      const value = formData[fieldKey];
      const status = value ? 'COMPLETE' : 'EMPTY';
      
      try {
        // First try to insert
        await db.insert(ky3pResponses)
          .values({
            task_id: taskId,
            field_id: field.id,
            response_value: value || null,
            status,
            version: 1,
            created_at: new Date(),
            updated_at: new Date()
          });
      } catch (err) {
        const error = err as Error;
        if (error.message.includes('duplicate key value violates unique constraint')) {
          // If duplicate, update instead
          await db.update(ky3pResponses)
            .set({
              response_value: value || null,
              status,
              version: sql`${ky3pResponses.version} + 1`,
              updated_at: new Date()
            })
            .where(
              and(
                eq(ky3pResponses.task_id, taskId),
                eq(ky3pResponses.field_id, field.id)
              )
            );
        } else {
          throw error;
        }
      }
    }
    
    // Import form type mapper to ensure consistent task type usage
    const { mapClientFormTypeToSchemaType } = await import('../utils/form-type-mapper');
    const schemaTaskType = mapClientFormTypeToSchemaType('ky3p');
    
    console.log(`[Tasks Routes] Mapped KY3P form type from 'ky3p' to '${schemaTaskType}' for submission`);
    
    // Use our enhanced form submission handler with immediate task unlocking
    // Pass the schema-compatible task type to ensure consistent handling
    const result = await submitFormWithImmediateUnlock({
      taskId,
      userId: req.user.id,
      companyId: task.company_id,
      formData,
      formType: schemaTaskType, // Use the schema-compatible task type
      fileName
    });
    
    // CRITICAL FIX: Ensure KY3P task status is set to 'submitted' with 100% progress
    try {
      await db.update(tasks)
        .set({
          status: 'submitted', // Use string literal to ensure exact value
          progress: 100,
          completion_date: new Date(),
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
        
      logger.info('[KY3P Submission] Applied direct status fix to ensure proper submission', {
        taskId,
        status: 'submitted',
        progress: 100
      });
    } catch (statusFixError) {
      logger.error('[KY3P Submission] Failed to apply status fix', {
        error: statusFixError instanceof Error ? statusFixError.message : 'Unknown error',
        taskId
      });
      // Continue with the response even if the fix fails
    }
    
    logger.info('KY3P form submission completed with synchronous task unlocking', {
      taskId,
      companyId: task.company_id,
      success: result.success
    });
    
    // Return the standardized response
    res.json({
      ...result,
      fileId: result.fileId || null,
      success: true,
      message: 'Form submitted successfully'
    });
  } catch (error) {
    logger.error('Error submitting KY3P form', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({ 
      error: 'Failed to submit form',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Universal Open Banking form submission endpoint
router.post('/api/tasks/:taskId/open-banking-submit', requireAuth, async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const { formData, fileName } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get task details
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    logger.info('Processing Open Banking form submission with synchronous task dependencies', {
      taskId,
      companyId: task.company_id
    });
    
    // Get all Open Banking fields
    const fields = await db.select()
      .from(openBankingFields)
      .orderBy(openBankingFields.order);
    
    // Save responses to database
    for (const field of fields) {
      const fieldKey = field.field_key;
      const value = formData[fieldKey];
      const status = value ? 'COMPLETE' : 'EMPTY';
      
      try {
        // First try to insert
        await db.insert(openBankingResponses)
          .values({
            task_id: taskId,
            field_id: field.id,
            response_value: value || null,
            status,
            version: 1,
            created_at: new Date(),
            updated_at: new Date()
          });
      } catch (err) {
        const error = err as Error;
        if (error.message.includes('duplicate key value violates unique constraint')) {
          // If duplicate, update instead
          await db.update(openBankingResponses)
            .set({
              response_value: value || null,
              status,
              version: sql`${openBankingResponses.version} + 1`,
              updated_at: new Date()
            })
            .where(
              and(
                eq(openBankingResponses.task_id, taskId),
                eq(openBankingResponses.field_id, field.id)
              )
            );
        } else {
          throw error;
        }
      }
    }
    
    // Use our enhanced form submission handler with immediate task unlocking
    const result = await submitFormWithImmediateUnlock({
      taskId,
      userId: req.user.id,
      companyId: task.company_id,
      formData,
      formType: 'open_banking',
      fileName
    });
    
    logger.info('Open Banking form submission completed with synchronous task unlocking', {
      taskId,
      companyId: task.company_id,
      success: result.success
    });
    
    // Return the standardized response
    res.json({
      ...result,
      fileId: result.fileId || null,
      success: true,
      message: 'Form submitted successfully'
    });
  } catch (error) {
    logger.error('Error submitting Open Banking form', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    res.status(500).json({ 
      error: 'Failed to submit form',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Compatibility endpoint for KY3P form submission
// This endpoint matches the client-side endpoint used in standardized-ky3p-form-service.ts
router.post('/api/ky3p-task/:taskId/submit', requireAuth, async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    
    // Simply forward the request to the standardized endpoint
    logger.info('[Tasks Routes] Compatibility route: forwarding to standardized KY3P submit endpoint', {
      originalUrl: req.originalUrl,
      targetEndpoint: `/api/tasks/${taskId}/ky3p-submit-standard`
    });
    
    // Use the same request body
    const { formData, fileName } = req.body;
    
    // Make internal request to the standardized endpoint
    const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/tasks/${taskId}/ky3p-submit-standard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '' // Forward authentication cookies
      },
      body: JSON.stringify({ formData, fileName })
    });
    
    // Get the response from the standardized endpoint
    const result = await response.json();
    
    // Return the response to the client
    res.status(response.status).json(result);
  } catch (error) {
    logger.error('Error in KY3P compatibility endpoint:', error);
    res.status(500).json({
      error: 'Failed to submit form',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Emergency endpoint to directly unlock a specific Open Banking task
// This is a temporary endpoint to fix an issue with task 614
router.post('/api/tasks/unlock-open-banking/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    
    // Only allow admin users or specific users to access this endpoint
    if (!req.user || req.user.id !== 276) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    // Get the task to verify it exists and get company ID
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    logger.info('[Tasks] Emergency unlock requested for Open Banking task', { 
      taskId, 
      companyId: task.company_id 
    });
    
    // Use the central task dependency processor instead of direct updates
    if (task.company_id) {
      // Process all dependencies for this company
      await processDependencies(task.company_id);
      
      // For extra reliability, also directly unlock Open Banking tasks
      await unlockOpenBankingTasks(task.company_id);
      
      // Verify the task was actually unlocked
      const [verifyTask] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (verifyTask && verifyTask.status === 'not_started') {
        logger.info('[Tasks] Task successfully unlocked via dependency processor', { taskId });
        
        return res.json({
          success: true,
          task: verifyTask,
          method: 'dependency_processor'
        });
      }
    }
    
    // Fallback to direct unlock if the dependency processor didn't handle it
    logger.info('[Tasks] Falling back to direct task unlock', { taskId });
    
    // Update the task status directly
    const updatedTask = await db.update(tasks)
      .set({
        status: 'not_started',
        metadata: sql`jsonb_set(
          jsonb_set(
            jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{locked}', 'false'
            ),
            '{prerequisite_completed}', 'true'
          ),
          '{prerequisite_completed_at}', to_jsonb(now())
        )`,
        updated_at: new Date()
      })
      .where(eq(tasks.id, taskId))
      .returning();
      
    if (updatedTask.length === 0) {
      return res.status(500).json({ error: 'Failed to update task' });
    }
    
    logger.info('[Tasks] Task unlocked successfully via direct update', { taskId });
    
    // Broadcast the update via WebSocket
    broadcastTaskUpdate({
      id: taskId,
      status: 'not_started',
      metadata: {
        locked: false,
        prerequisite_completed: true,
        prerequisite_completed_at: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      task: updatedTask[0]
    });
  } catch (error) {
    console.error('[Tasks] Error unlocking Open Banking task:', error);
    res.status(500).json({
      error: 'Failed to unlock task',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;