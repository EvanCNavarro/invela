import { db } from "@db";
import { tasks, users } from "@db/schema";
import { eq, and, sql, or } from "drizzle-orm";

export async function updateOnboardingTaskStatus(userId: number) {
  try {
    console.log(`[Task Service] Attempting to update onboarding task for user ID: ${userId}`);

    // First try to find task by user ID
    let pendingTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.taskType, 'user_onboarding'),
          eq(tasks.assignedTo, userId),
          or(
            eq(tasks.status, 'pending'),
            eq(tasks.status, 'in_progress'),
            sql`${tasks.status} IS NULL`
          )
        )
      );

    // If no task found by user ID, we need to get the user's email and try by that
    if (pendingTasks.length === 0) {
      console.log(`[Task Service] No task found by user ID ${userId}, trying by email`);

      // Get user's email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (user) {
        pendingTasks = await db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.taskType, 'user_onboarding'),
              eq(tasks.userEmail, user.email.toLowerCase()),
              or(
                eq(tasks.status, 'pending'),
                eq(tasks.status, 'in_progress'),
                sql`${tasks.status} IS NULL`
              )
            )
          );
      }
    }

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
        assignedTo: userId, // Ensure the task is linked to the user
      })
      .where(eq(tasks.id, taskToUpdate.id))
      .returning();

    console.log('[Task Service] Update result:', updatedTask);

    return updatedTask;
  } catch (error) {
    console.error('[Task Service] Error updating onboarding task status:', error);
    throw error;
  }
}