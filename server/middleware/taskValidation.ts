import { Request, Response, NextFunction } from "express";
import { TaskStatus } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { tasks } from "@db/schema";

// Define task type specific status transitions with progress thresholds
const TASK_TYPE_TRANSITIONS = {
  user_onboarding: {
    [TaskStatus.EMAIL_SENT]: {
      next: [TaskStatus.COMPLETED],
      progress: { min: 25, max: 25 }
    },
    [TaskStatus.COMPLETED]: {
      next: [], // Terminal state
      progress: { min: 100, max: 100 }
    }
  },
  company_kyb: {
    [TaskStatus.NOT_STARTED]: {
      next: [TaskStatus.IN_PROGRESS],
      progress: { min: 0, max: 0 }
    },
    [TaskStatus.IN_PROGRESS]: {
      next: [TaskStatus.READY_FOR_SUBMISSION],
      progress: { min: 1, max: 99 }
    },
    [TaskStatus.READY_FOR_SUBMISSION]: {
      next: [TaskStatus.SUBMITTED],
      progress: { min: 100, max: 100 }
    },
    [TaskStatus.SUBMITTED]: {
      next: [TaskStatus.APPROVED],
      progress: { min: 100, max: 100 }
    },
    [TaskStatus.APPROVED]: {
      next: [], // Terminal state
      progress: { min: 100, max: 100 }
    },
    [TaskStatus.COMPLETED]: {
      next: [TaskStatus.NOT_STARTED], // Allow reset
      progress: { min: 0, max: 100 }
    }
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

interface ProgressValidationResult {
  isValid: boolean;
  message?: string;
  details?: {
    currentStatus: TaskStatus;
    newStatus: TaskStatus;
    currentProgress: number;
    newProgress: number;
    allowedTransitions: TaskStatus[];
    progressThreshold: { min: number; max: number };
  };
}

// Helper function to validate progress against status
function validateProgressForStatus(
  taskType: keyof typeof TASK_TYPE_TRANSITIONS,
  status: TaskStatus,
  progress: number
): ProgressValidationResult {
  const statusConfig = TASK_TYPE_TRANSITIONS[taskType]?.[status];

  if (!statusConfig) {
    return {
      isValid: false,
      message: `Invalid status ${status} for task type ${taskType}`
    };
  }

  const { min, max } = statusConfig.progress;
  if (progress < min || progress > max) {
    return {
      isValid: false,
      message: `Invalid progress value for status ${status}. Expected between ${min} and ${max}, got ${progress}`,
      details: {
        currentStatus: status,
        newStatus: status,
        currentProgress: progress,
        newProgress: progress,
        progressThreshold: { min, max }
      }
    };
  }

  return { isValid: true };
}

// Enhanced middleware to validate task status transitions
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

  const taskType = currentTask.task_type as keyof typeof TASK_TYPE_TRANSITIONS;
  const currentStatus = currentTask.status;

  // Validate task type configuration exists
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
    const progressValidation = validateProgressForStatus(taskType, newStatus, progress);
    if (!progressValidation.isValid) {
      return res.status(400).json({
        message: progressValidation.message,
        details: progressValidation.details
      });
    }
    next();
    return;
  }

  // Get allowed transitions and validate
  const currentStateConfig = TASK_TYPE_TRANSITIONS[taskType][currentStatus];
  const allowedTransitions = currentStateConfig?.next || [];

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
  const progressValidation = validateProgressForStatus(taskType, newStatus, progress);
  if (!progressValidation.isValid) {
    return res.status(400).json({
      message: progressValidation.message,
      details: progressValidation.details
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