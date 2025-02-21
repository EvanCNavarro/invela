import { Request, Response, NextFunction } from "express";
import { TaskStatus } from "@db/schema";

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
  },
  user_onboarding: {
    [TaskStatus.EMAIL_SENT]: { min: 25, max: 25 },
    [TaskStatus.COMPLETED]: { min: 100, max: 100 },
  }
} as const;

export interface TaskRequest extends Request {
  taskId?: number;
  task?: {
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

  if (!currentTask) {
    return next();
  }

  const taskType = currentTask.task_type;
  const currentStatus = currentTask.status;

  // Validate task type has defined transitions
  if (!TASK_TYPE_TRANSITIONS[taskType]) {
    return res.status(400).json({
      message: `Invalid task type: ${taskType}`,
      allowedTypes: Object.keys(TASK_TYPE_TRANSITIONS)
    });
  }

  // Validate the status exists for this task type
  const validStatuses = Object.keys(TASK_TYPE_TRANSITIONS[taskType]);
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({
      message: `Invalid status for task type ${taskType}`,
      allowedStatuses: validStatuses
    });
  }

  // If no current status (new task) or same status, check progress thresholds
  if (!currentStatus || currentStatus === newStatus) {
    const threshold = PROGRESS_THRESHOLDS[taskType][newStatus];
    if (progress < threshold.min || progress > threshold.max) {
      return res.status(400).json({
        message: `Invalid progress value for status ${newStatus}`,
        required: threshold
      });
    }
    return next();
  }

  // Check if transition is allowed for this task type
  const allowedTransitions = TASK_TYPE_TRANSITIONS[taskType][currentStatus] || [];
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
  if (progress < threshold.min || progress > threshold.max) {
    return res.status(400).json({
      message: `Invalid progress value for status ${newStatus}`,
      required: threshold
    });
  }

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

  req.taskId = taskId;
  next();
}