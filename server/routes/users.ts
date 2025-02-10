import { Router } from "express";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { updateOnboardingTaskStatus } from "../services/tasks";

const router = Router();

router.post("/api/users/complete-onboarding", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log(`[User Routes] Starting onboarding completion for user ID: ${req.user.id}`);

    // Update user onboarding status
    const [updatedUser] = await db
      .update(users)
      .set({ onboardingUserCompleted: true })
      .where(eq(users.id, req.user.id))
      .returning();

    console.log(`[User Routes] Updated user onboarding status for ID ${req.user.id}`);

    // Update the corresponding onboarding task using user ID
    const updatedTask = await updateOnboardingTaskStatus(req.user.id);

    if (!updatedTask) {
      console.warn(`[User Routes] No pending onboarding task found for user ID ${req.user.id}`);
      return res.json({ 
        user: updatedUser,
        task: null,
        message: "User onboarding completed, but no pending task was found to update"
      });
    }

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