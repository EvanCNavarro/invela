import { Request, Response, NextFunction } from "express";
import { TaskStatus } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { tasks } from "@db/schema";

// Define task type specific status transitions
const TASK_TYPE_TRANSITIONS = {
  user_onboarding: {
    [TaskStatus.EMAIL_SENT]: [TaskStatus.COMPLETED],
    [TaskStatus.COMPLETED]: [], // Terminal state
  },
  company_kyb: {
    [TaskStatus.NOT_STARTED]: [TaskStatus.IN_PROGRESS],
    [TaskStatus.IN_PROGRESS]: [TaskStatus.READY_FOR_SUBMISSION],
    [TaskStatus.READY_FOR_SUBMISSION]: [TaskStatus.SUBMITTED],
    [TaskStatus.SUBMITTED]: [TaskStatus.APPROVED],
    [TaskStatus.APPROVED]: [], // Terminal state
    [TaskStatus.COMPLETED]: [TaskStatus.NOT_STARTED], // Allow transitioning back from completed
  }
} as const;

// Define progress thresholds for status transitions
const PROGRESS_THRESHOLDS = {
  company_kyb: {
    [TaskStatus.NOT_STARTED]: { min: 0, max: 0 },
    [TaskStatus.IN_PROGRESS]: { min: 1, max: 99 },
    [TaskStatus.READY_FOR_SUBMISSION]: { min: 100, max: 100 },
    [TaskStatus.SUBMITTED]: { min: 100, max: 100 },
    [TaskStatus.APPROVED]: { min: 100, max: 100 },
    [TaskStatus.COMPLETED]: { min: 0, max: 100 }, // Allow any progress for completed state
  },
  user_onboarding: {
    [TaskStatus.EMAIL_SENT]: { min: 25, max: 25 },
    [TaskStatus.COMPLETED]: { min: 100, max: 100 },
  }
} as const;

export interface TaskRequest extends Request {
  taskId?: number;
  task?: {
    id: number;
    status: TaskStatus;
    task_type: string;
    metadata: Record<string, any> | null;
    progress: number;
  };
}

// Middleware to validate task status transitions
export function validateTaskStatusTransition(req: TaskRequest, res: Response, next: NextFunction) {
  const { status: newStatus, progress } = req.body;
  const currentTask = req.task;

  console.log('[TaskValidation] Validating status transition:', {
    taskId: req.taskId,
    currentTask: currentTask ? {
      id: currentTask.id,
      type: currentTask.task_type,
      status: currentTask.status,
      progress: currentTask.progress
    } : null,
    requestedStatus: newStatus,
    requestedProgress: progress
  });

  if (!currentTask) {
    console.error('[TaskValidation] No current task found in request');
    return res.status(400).json({ message: "Task not found" });
  }

  const taskType = currentTask.task_type;
  const currentStatus = currentTask.status;

  // Validate task type has defined transitions
  if (!TASK_TYPE_TRANSITIONS[taskType]) {
    console.error('[TaskValidation] Invalid task type:', taskType);
    return res.status(400).json({
      message: `Invalid task type: ${taskType}`,
      allowedTypes: Object.keys(TASK_TYPE_TRANSITIONS)
    });
  }

  // Special case: Allow resetting KYB tasks back to NOT_STARTED
  if (taskType === 'company_kyb' && newStatus === TaskStatus.NOT_STARTED) {
    console.log('[TaskValidation] Allowing reset to NOT_STARTED for KYB task');
    next();
    return;
  }

  // Check if transition is allowed for this task type
  const allowedTransitions = TASK_TYPE_TRANSITIONS[taskType][currentStatus] || [];
  console.log('[TaskValidation] Checking allowed transitions:', {
    currentStatus,
    newStatus,
    allowedTransitions
  });

  if (!allowedTransitions.includes(newStatus)) {
    return res.status(400).json({
      message: "Invalid status transition",
      current: currentStatus,
      attempted: newStatus,
      allowed: allowedTransitions
    });
  }

  // Validate progress matches the new status
  const threshold = PROGRESS_THRESHOLDS[taskType][newStatus];
  console.log('[TaskValidation] Checking progress threshold for transition:', {
    status: newStatus,
    progress,
    threshold
  });

  if (progress < threshold.min || progress > threshold.max) {
    return res.status(400).json({
      message: `Invalid progress value for status ${newStatus}`,
      required: threshold
    });
  }

  console.log('[TaskValidation] Status transition validated successfully');
  next();
}

// Middleware to load task before validation
export async function loadTaskMiddleware(req: TaskRequest, res: Response, next: NextFunction) {
  if (!req.params.id) {
    return next();
  }

  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  try {
    console.log('[TaskValidation] Loading task:', taskId);

    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      console.error('[TaskValidation] Task not found:', taskId);
      return res.status(404).json({ message: "Task not found" });
    }

    console.log('[TaskValidation] Loaded task:', {
      id: task.id,
      type: task.task_type,
      status: task.status,
      progress: task.progress
    });

    req.taskId = taskId;
    req.task = task;
    next();
  } catch (error) {
    console.error('[TaskValidation] Error loading task:', error);
    res.status(500).json({ message: "Error loading task" });
  }
}