import { Router } from "express";
import { db } from "@db";
import { users, tasks } from "@db/schema";
import { eq, and, or, sql } from "drizzle-orm";

const router = Router();

router.post("/api/users/complete-onboarding", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log(`[User Routes] Starting onboarding completion for user ID: ${req.user.id}, email: ${req.user.email}`);

    // Update user onboarding status
    const [updatedUser] = await db
      .update(users)
      .set({ onboardingUserCompleted: true })
      .where(eq(users.id, req.user.id))
      .returning();

    console.log(`[User Routes] Updated user onboarding status for ID ${req.user.id}`);

    // Find and update the corresponding onboarding task using user's email
    const [task] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.taskType, 'user_onboarding'),
          sql`LOWER(${tasks.userEmail}) = LOWER(${req.user.email})`,
          or(
            eq(tasks.status, 'pending'),
            eq(tasks.status, 'in_progress'),
            eq(tasks.status, 'email_sent')
          )
        )
      )
      .orderBy(sql`created_at DESC`)
      .limit(1);

    if (!task) {
      console.warn(`[User Routes] No pending onboarding task found for user ID ${req.user.id}`);
      return res.json({ 
        user: updatedUser,
        task: null,
        message: "User onboarding completed, but no pending task was found to update"
      });
    }

    // Update the task status with proper metadata
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: 'completed',
        progress: 100,
        completionDate: new Date(),
        updatedAt: new Date(),
        assignedTo: req.user.id,
        metadata: {
          ...(task.metadata || {}),
          onboardingCompleted: true,
          completionTime: new Date().toISOString()
        }
      })
      .where(eq(tasks.id, task.id))
      .returning();

    console.log(`[User Routes] Successfully updated task ${updatedTask.id} for user ${req.user.id}`);
    res.json({ 
      user: updatedUser, 
      task: updatedTask,
      message: "Onboarding completed successfully"
    });
  } catch (error) {
    console.error("[User Routes] Error completing onboarding:", error);
    res.status(500).json({ message: "Failed to complete onboarding" });
  }
});

export default router;