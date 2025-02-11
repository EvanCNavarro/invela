import { db } from "@db";
import { tasks, users, TaskStatus } from "@db/schema";
import { eq, and, sql, or } from "drizzle-orm";

// Task status flow configuration
const TASK_STATUS_FLOW = {
  [TaskStatus.EMAIL_SENT]: {
    next: TaskStatus.IN_PROGRESS,
    triggers: ['user_registration'],
    progress: 25,
  },
  [TaskStatus.IN_PROGRESS]: {
    next: TaskStatus.COMPLETED,
    triggers: ['onboarding_completed'],
    progress: 50,
  },
  [TaskStatus.COMPLETED]: {
    next: null,
    triggers: [],
    progress: 100,
  },
} as const;

// Validate if a status transition is allowed
function isValidStatusTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
  return TASK_STATUS_FLOW[currentStatus]?.next === newStatus;
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
          eq(tasks.taskType, 'user_onboarding'),
          sql`LOWER(${tasks.userEmail}) = LOWER(${user.email})`,
          or(
            eq(tasks.status, TaskStatus.EMAIL_SENT),
            eq(tasks.status, TaskStatus.IN_PROGRESS)
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
    const nextStatus = user.onboardingUserCompleted ? 
      TaskStatus.COMPLETED : 
      taskToUpdate.status === TaskStatus.EMAIL_SENT ? 
        TaskStatus.IN_PROGRESS : 
        taskToUpdate.status;

    // Validate status transition
    if (!isValidStatusTransition(taskToUpdate.status as TaskStatus, nextStatus as TaskStatus)) {
      console.error(`[Task Service] Invalid status transition from ${taskToUpdate.status} to ${nextStatus}`);
      return null;
    }

    // Update the task with new status
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: nextStatus,
        progress: TASK_STATUS_FLOW[nextStatus as TaskStatus].progress,
        completionDate: nextStatus === TaskStatus.COMPLETED ? new Date() : null,
        updatedAt: new Date(),
        assignedTo: userId,
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
          eq(tasks.taskType, 'user_onboarding'),
          sql`LOWER(${tasks.userEmail}) = LOWER(${email})`,
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

    // Validate status transition
    if (!isValidStatusTransition(taskToUpdate.status as TaskStatus, TaskStatus.IN_PROGRESS)) {
      console.error(`[Task Service] Invalid status transition from ${taskToUpdate.status} to IN_PROGRESS`);
      return null;
    }

    // Update the task with registration progress
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: TaskStatus.IN_PROGRESS,
        progress: TASK_STATUS_FLOW[TaskStatus.IN_PROGRESS].progress,
        assignedTo: userId,
        updatedAt: new Date(),
        metadata: {
          ...(taskToUpdate.metadata || {}),
          registrationCompleted: true,
          registrationTime: new Date().toISOString(),
          previousStatus: taskToUpdate.status,
          userId: userId,
          userEmail: email.toLowerCase(),
          statusFlow: [...(taskToUpdate.metadata?.statusFlow || []), TaskStatus.IN_PROGRESS]
        }
      })
      .where(eq(tasks.id, taskToUpdate.id))
      .returning();

    console.log(`[Task Service] Successfully updated task ${updatedTask.id} to in_progress status`);
    return updatedTask;
  } catch (error) {
    console.error('[Task Service] Error updating onboarding task:', error);
    throw error;
  }
}