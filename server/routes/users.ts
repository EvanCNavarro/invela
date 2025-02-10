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

    // Update user onboarding status
    const [updatedUser] = await db
      .update(users)
      .set({ onboardingUserCompleted: true })
      .where(eq(users.id, req.user.id))
      .returning();

    // Update the corresponding onboarding task
    const updatedTask = await updateOnboardingTaskStatus(req.user.email);

    if (!updatedTask) {
      console.warn(`No pending onboarding task found for user ${req.user.email}`);
    }

    res.json({ user: updatedUser, task: updatedTask });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    res.status(500).json({ message: "Failed to complete onboarding" });
  }
});

export default router;