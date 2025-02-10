import { db } from "@db";
import { tasks } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function updateOnboardingTaskStatus(userEmail: string) {
  try {
    // Log the task update attempt
    console.log(`Attempting to update onboarding task for email: ${userEmail}`);

    // Find and update the onboarding task for this user using case-insensitive comparison
    const result = await db
      .update(tasks)
      .set({
        status: 'completed',
        progress: 100,
        completionDate: new Date(),
      })
      .where(
        and(
          eq(tasks.taskType, 'user_onboarding'),
          sql`LOWER(${tasks.userEmail}) = LOWER(${userEmail})`
        )
      )
      .returning();

    // Log the result for debugging
    console.log('Task update result:', result);

    return result[0];
  } catch (error) {
    console.error('Error updating onboarding task status:', error);
    throw error;
  }
}