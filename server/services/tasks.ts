import { db } from "@db";
import { tasks } from "@db/schema";
import { eq, and, sql, or } from "drizzle-orm";

export async function updateOnboardingTaskStatus(userId: number) {
  try {
    console.log(`[Task Service] Attempting to update onboarding task for user ID: ${userId}`);

    // Find pending onboarding task for this user
    const pendingTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.taskType, 'user_onboarding'),
          eq(tasks.assignedTo, userId),
          or(
            eq(tasks.status, 'pending'),
            sql`${tasks.status} IS NULL`
          )
        )
      );

    console.log(`[Task Service] Found ${pendingTasks.length} pending onboarding tasks for user ${userId}`);

    if (pendingTasks.length === 0) {
      console.log(`[Task Service] No pending onboarding task found for user ID: ${userId}`);
      return null;
    }

    // Get the most recent pending task
    const taskToUpdate = pendingTasks[0];
    console.log(`[Task Service] Updating task ID: ${taskToUpdate.id}`);

    // Update the task
    const result = await db
      .update(tasks)
      .set({
        status: 'completed',
        progress: 100,
        completionDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskToUpdate.id))
      .returning();

    console.log('[Task Service] Update result:', result);

    return result[0];
  } catch (error) {
    console.error('[Task Service] Error updating onboarding task status:', error);
    throw error;
  }
}