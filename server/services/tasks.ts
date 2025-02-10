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

    // Search for task using either assigned user ID or email (case insensitive)
    const pendingTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.taskType, 'user_onboarding'),
          or(
            eq(tasks.assignedTo, userId),
            sql`LOWER(${tasks.userEmail}) = LOWER(${user.email})`
          ),
          or(
            eq(tasks.status, 'pending'),
            eq(tasks.status, 'in_progress'),
            eq(tasks.status, 'email_sent'),
            sql`${tasks.status} IS NULL`
          )
        )
      )
      .orderBy(sql`created_at DESC`);

    console.log(`[Task Service] Found ${pendingTasks.length} pending onboarding tasks for user ${userId}`);

    if (pendingTasks.length === 0) {
      console.log(`[Task Service] No pending onboarding task found for user ID: ${userId}`);
      return null;
    }

    // Get the most recent pending task
    const taskToUpdate = pendingTasks[0];
    console.log(`[Task Service] Updating task ID: ${taskToUpdate.id}`);

    // Update the task
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: 'completed',
        progress: 100,
        completionDate: new Date(),
        updatedAt: new Date(),
        assignedTo: userId // Ensure the task is linked to the user
      })
      .where(eq(tasks.id, taskToUpdate.id))
      .returning();

    console.log('[Task Service] Updated task:', updatedTask);

    return updatedTask;
  } catch (error) {
    console.error('[Task Service] Error updating onboarding task status:', error);
    throw error;
  }
}