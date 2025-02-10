import { db } from "@db";
import { tasks, users } from "@db/schema";
import { eq, and, sql, or } from "drizzle-orm";

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
            eq(tasks.status, 'email_sent'),
            eq(tasks.status, 'in_progress')
          )
        )
      )
      .orderBy(sql`created_at DESC`)
      .limit(1);

    if (!taskToUpdate) {
      console.log(`[Task Service] No active onboarding task found for user ID: ${userId} with email ${user.email}`);
      return null;
    }

    console.log(`[Task Service] Found task ${taskToUpdate.id} with status ${taskToUpdate.status}`);

    // Update the task with completion status
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: 'completed',
        progress: 100,
        completionDate: new Date(),
        updatedAt: new Date(),
        assignedTo: userId,
        metadata: {
          ...(taskToUpdate.metadata || {}),
          onboardingCompleted: true,
          completionTime: new Date().toISOString(),
          previousStatus: taskToUpdate.status,
          userId: userId,
          userEmail: user.email.toLowerCase(),
          statusFlow: [...(taskToUpdate.metadata?.statusFlow || []), 'completed']
        }
      })
      .where(eq(tasks.id, taskToUpdate.id))
      .returning();

    console.log(`[Task Service] Successfully updated task ${updatedTask.id} from ${taskToUpdate.status} to completed`);
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
          eq(tasks.status, 'email_sent')
        )
      )
      .orderBy(sql`created_at DESC`)
      .limit(1);

    if (!taskToUpdate) {
      console.warn(`[Task Service] No email_sent onboarding task found for email: ${email}`);
      return null;
    }

    console.log(`[Task Service] Found task ${taskToUpdate.id} with status ${taskToUpdate.status}`);

    // Update the task with registration progress
    const [updatedTask] = await db
      .update(tasks)
      .set({
        assignedTo: userId,
        status: 'in_progress',
        progress: 50,
        updatedAt: new Date(),
        metadata: {
          ...(taskToUpdate.metadata || {}),
          registrationCompleted: true,
          registrationTime: new Date().toISOString(),
          previousStatus: taskToUpdate.status,
          userId: userId,
          userEmail: email.toLowerCase(),
          statusFlow: [...(taskToUpdate.metadata?.statusFlow || []), 'in_progress']
        }
      })
      .where(eq(tasks.id, taskToUpdate.id))
      .returning();

    console.log(`[Task Service] Successfully updated task ${updatedTask.id} from ${taskToUpdate.status} to in_progress`);
    return updatedTask;
  } catch (error) {
    console.error('[Task Service] Error updating onboarding task:', error);
    throw error;
  }
}