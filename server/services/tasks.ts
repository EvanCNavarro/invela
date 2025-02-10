import { db } from "@db";
import { tasks } from "@db/schema";
import { eq, and, sql, or } from "drizzle-orm";

function normalizeEmail(email: string): string {
  // Remove all dots before @ and convert to lowercase
  const [localPart, domain] = email.split('@');
  const normalizedLocal = localPart.replace(/\./g, '').toLowerCase();
  return `${normalizedLocal}@${domain.toLowerCase()}`;
}

export async function updateOnboardingTaskStatus(userEmail: string) {
  try {
    // Log the task update attempt
    console.log(`[Task Service] Attempting to update onboarding task for email: ${userEmail}`);

    // Normalize the input email
    const normalizedInputEmail = normalizeEmail(userEmail);
    console.log(`[Task Service] Normalized input email: ${normalizedInputEmail}`);

    // Find all pending tasks
    const pendingTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.taskType, 'user_onboarding'),
          or(
            eq(tasks.status, 'pending'),
            sql`${tasks.status} IS NULL`
          )
        )
      );

    console.log(`[Task Service] Found ${pendingTasks.length} pending onboarding tasks`);

    // Find matching task by normalizing and comparing emails
    const matchingTask = pendingTasks.find(task => {
      if (!task.userEmail) return false;
      const normalizedTaskEmail = normalizeEmail(task.userEmail);
      const matches = normalizedTaskEmail === normalizedInputEmail;
      console.log(`[Task Service] Comparing normalized emails: ${normalizedTaskEmail} with ${normalizedInputEmail}: ${matches}`);
      return matches;
    });

    if (!matchingTask) {
      console.log(`[Task Service] No matching task found for email: ${userEmail}`);
      return null;
    }

    console.log(`[Task Service] Found matching task ID: ${matchingTask.id}`);

    // Update the matching task
    const result = await db
      .update(tasks)
      .set({
        status: 'completed',
        progress: 100,
        completionDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, matchingTask.id))
      .returning();

    console.log('[Task Service] Update result:', result);

    return result[0];
  } catch (error) {
    console.error('[Task Service] Error updating onboarding task status:', error);
    throw error;
  }
}