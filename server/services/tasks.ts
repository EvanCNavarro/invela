import { db } from "@db";
import { tasks } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function updateOnboardingTaskStatus(userEmail: string) {
  try {
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
          eq(tasks.status, 'pending'),
          sql`LOWER(${tasks.userEmail}) = LOWER(${userEmail})`
        )
      )
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error updating onboarding task status:', error);
    throw error;
  }
}