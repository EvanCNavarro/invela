import { db } from "@db";
import { tasks, users, TaskStatus } from "@db/schema";
import { eq, and, sql, or } from "drizzle-orm";

type ValidStatus = typeof TaskStatus[keyof typeof TaskStatus];

interface TaskStatusUpdate {
  status: ValidStatus;
  progress: number;
  metadata?: Record<string, any>;
}

// Validate if a status transition is allowed based on task type
function isValidStatusTransition(
  taskType: string,
  currentStatus: ValidStatus,
  newStatus: ValidStatus,
  progress: number
): boolean {
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
      }
    }
  };

  // Check if task type has defined transitions
  if (!TASK_TYPE_TRANSITIONS[taskType]) {
    console.error(`[Task Service] Invalid task type: ${taskType}`);
    return false;
  }

  // Check if transition is allowed
  const currentState = TASK_TYPE_TRANSITIONS[taskType][currentStatus];
  if (!currentState || !currentState.next.includes(newStatus)) {
    console.error(`[Task Service] Invalid transition from ${currentStatus} to ${newStatus}`);
    return false;
  }

  // Check if progress matches the new status
  const newState = TASK_TYPE_TRANSITIONS[taskType][newStatus];
  const { min, max } = newState.progress;
  if (progress < min || progress > max) {
    console.error(`[Task Service] Invalid progress ${progress} for status ${newStatus}`);
    return false;
  }

  return true;
}

export async function updateOnboardingTaskStatus(userId: number) {
  try {
    console.log(`[Task Service] Attempting to update onboarding task for user ID: ${userId}`);

    // Get user email first to ensure we have it for searching
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      console.error(`[Task Service] User ${userId} not found`);
      return null;
    }

    console.log(`[Task Service] Found user ${userId} with email ${user.email}`);

    // Search for task using email (case insensitive)
    const [taskToUpdate] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.task_type, 'user_onboarding'),
          sql`LOWER(${tasks.user_email}) = LOWER(${user.email})`,
          or(
            eq(tasks.status, TaskStatus.EMAIL_SENT),
            eq(tasks.status, TaskStatus.COMPLETED)
          )
        )
      )
      .orderBy(sql`created_at DESC`)
      .limit(1);

    if (!taskToUpdate) {
      console.log(`[Task Service] No active onboarding task found for user ID: ${userId} with email ${user.email}`);
      return null;
    }

    console.log(`[Task Service] Found task ${taskToUpdate.id} with current status ${taskToUpdate.status}`);

    // Determine next status based on user's onboarding completion
    const nextStatus = user.onboarding_user_completed ? TaskStatus.COMPLETED : taskToUpdate.status;
    const progress = nextStatus === TaskStatus.COMPLETED ? 100 : 25;

    // Validate status transition
    if (!isValidStatusTransition('user_onboarding', taskToUpdate.status, nextStatus, progress)) {
      console.error(`[Task Service] Invalid status transition from ${taskToUpdate.status} to ${nextStatus}`);
      return null;
    }

    // Update the task with new status
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: nextStatus,
        progress,
        completion_date: nextStatus === TaskStatus.COMPLETED ? new Date() : null,
        updated_at: new Date(),
        assigned_to: userId,
        metadata: {
          ...(taskToUpdate.metadata || {}),
          onboardingCompleted: nextStatus === TaskStatus.COMPLETED,
          statusUpdateTime: new Date().toISOString(),
          previousStatus: taskToUpdate.status,
          userId: userId,
          userEmail: user.email.toLowerCase(),
          statusFlow: [...(taskToUpdate.metadata?.statusFlow || []), nextStatus]
        }
      })
      .where(eq(tasks.id, taskToUpdate.id))
      .returning();

    console.log(`[Task Service] Successfully updated task ${updatedTask.id} to ${nextStatus} status`);
    return updatedTask;
  } catch (error) {
    console.error('[Task Service] Error updating onboarding task status:', error);
    throw error;
  }
}

export async function findAndUpdateOnboardingTask(email: string, userId: number) {
  try {
    console.log(`[Task Service] Finding and updating onboarding task for email: ${email}, userId: ${userId}`);

    // Find the most recent active onboarding task for this email
    const [taskToUpdate] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.task_type, 'user_onboarding'),
          sql`LOWER(${tasks.user_email}) = LOWER(${email})`,
          eq(tasks.status, TaskStatus.EMAIL_SENT)
        )
      )
      .orderBy(sql`created_at DESC`)
      .limit(1);

    if (!taskToUpdate) {
      console.warn(`[Task Service] No email_sent onboarding task found for email: ${email}`);
      return null;
    }

    console.log(`[Task Service] Found task ${taskToUpdate.id} with status ${taskToUpdate.status}`);

    // Only allow transition from EMAIL_SENT to COMPLETED
    if (!isValidStatusTransition('user_onboarding', taskToUpdate.status, TaskStatus.COMPLETED, 100)) {
      console.error(`[Task Service] Invalid status transition from ${taskToUpdate.status} to COMPLETED`);
      return null;
    }

    // Update the task with registration progress
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: TaskStatus.COMPLETED,
        progress: 100,
        assigned_to: userId,
        updated_at: new Date(),
        metadata: {
          ...(taskToUpdate.metadata || {}),
          registrationCompleted: true,
          registrationTime: new Date().toISOString(),
          previousStatus: taskToUpdate.status,
          userId: userId,
          userEmail: email.toLowerCase(),
          statusFlow: [...(taskToUpdate.metadata?.statusFlow || []), TaskStatus.COMPLETED]
        }
      })
      .where(eq(tasks.id, taskToUpdate.id))
      .returning();

    console.log(`[Task Service] Successfully updated task ${updatedTask.id} to completed status`);
    return updatedTask;
  } catch (error) {
    console.error('[Task Service] Error updating onboarding task:', error);
    throw error;
  }
}