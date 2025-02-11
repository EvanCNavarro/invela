import { Request, Response, NextFunction } from "express";
import { TaskStatus } from "@db/schema";

// Define valid status transitions
const VALID_TRANSITIONS = {
  [TaskStatus.EMAIL_SENT]: [TaskStatus.COMPLETED],
  [TaskStatus.COMPLETED]: [], // Terminal state
} as const;

// Define progress percentage for each status
const STATUS_PROGRESS = {
  [TaskStatus.EMAIL_SENT]: 25,
  [TaskStatus.COMPLETED]: 100,
} as const;

export interface TaskRequest extends Request {
  taskId?: number;
  task?: {
    status: TaskStatus;
    metadata: Record<string, any> | null;
  };
}

// Middleware to validate task status transitions
export function validateTaskStatusTransition(req: TaskRequest, res: Response, next: NextFunction) {
  const { status: newStatus } = req.body;
  const currentStatus = req.task?.status;

  // Validate the status exists
  if (!Object.values(TaskStatus).includes(newStatus)) {
    return res.status(400).json({
      message: "Invalid status value",
      allowedValues: Object.values(TaskStatus)
    });
  }

  // If no current status (new task) or same status, allow
  if (!currentStatus || currentStatus === newStatus) {
    req.body.progress = STATUS_PROGRESS[newStatus as TaskStatus];
    return next();
  }

  // Check if transition is allowed
  const allowedTransitions = VALID_TRANSITIONS[currentStatus as keyof typeof VALID_TRANSITIONS] || [];
  if (!allowedTransitions.includes(newStatus)) {
    return res.status(400).json({
      message: "Invalid status transition",
      current: currentStatus,
      attempted: newStatus,
      allowed: allowedTransitions
    });
  }

  // Set the progress based on new status
  req.body.progress = STATUS_PROGRESS[newStatus as TaskStatus];

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