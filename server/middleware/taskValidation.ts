import { Request, Response, NextFunction } from "express";
import { TaskStatus } from "@db/schema";

const VALID_TRANSITIONS = {
  [TaskStatus.EMAIL_SENT]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED],
  [TaskStatus.COMPLETED]: [], // Terminal state
} as const;

const STATUS_PROGRESS = {
  [TaskStatus.EMAIL_SENT]: 25,
  [TaskStatus.IN_PROGRESS]: 50,
  [TaskStatus.COMPLETED]: 100,
} as const;

export function validateTaskStatusTransition(req: Request, res: Response, next: NextFunction) {
  const { status: newStatus } = req.body;
  const currentStatus = req.task?.status; // Will be set by previous middleware

  // Validate the status exists
  if (!Object.values(TaskStatus).includes(newStatus)) {
    return res.status(400).json({
      message: "Invalid status value",
      allowedValues: Object.values(TaskStatus)
    });
  }

  // If no current status (new task) or same status, allow
  if (!currentStatus || currentStatus === newStatus) {
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
  req.body.progress = STATUS_PROGRESS[newStatus];
  
  next();
}

export function loadTaskMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.params.id) {
    return next();
  }

  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  // Task will be loaded by the database query in the route handler
  req.taskId = taskId;
  next();
}
