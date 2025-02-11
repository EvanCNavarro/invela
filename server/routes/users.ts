import { Router } from "express";
import { db } from "@db";
import { users, tasks, TaskStatus } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";

const router = Router();

// Schema for user invitation
const inviteUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  company_id: z.number(),
  company_name: z.string(),
  sender_name: z.string(),
  sender_company: z.string(),
});

// Generate a temporary password
function generateTempPassword() {
  return crypto.randomBytes(16).toString('hex');
}

// Hash password using bcrypt
async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

router.post("/api/users/invite", async (req, res) => {
  try {
    const data = inviteUserSchema.parse(req.body);
    console.log('[User Routes] Processing invitation for:', data.email);

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, data.email.toLowerCase()),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists",
        userId: existingUser.id
      });
    }

    // Generate temporary password and hash it
    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);

    console.log('[User Routes] Creating new user account');

    // Create new user account
    const [newUser] = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        fullName: data.fullName,
        password: hashedPassword,
        companyId: data.company_id,
        onboardingUserCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log('[User Routes] Created new user:', newUser.id);

    // Create onboarding task for the new user
    const [task] = await db
      .insert(tasks)
      .values({
        title: `Complete onboarding for ${data.fullName}`,
        description: `New user invitation from ${data.sender_name} at ${data.sender_company}`,
        taskType: 'user_onboarding',
        taskScope: 'user',
        status: TaskStatus.EMAIL_SENT,
        priority: 'medium',
        progress: 25,
        assignedTo: newUser.id,
        createdBy: req.user?.id || null,
        companyId: data.company_id,
        userEmail: data.email.toLowerCase(),
        metadata: {
          invitedBy: req.user?.id,
          invitedByName: data.sender_name,
          companyName: data.company_name,
          statusFlow: [TaskStatus.EMAIL_SENT]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log('[User Routes] Created onboarding task:', task.id);

    // TODO: Send invitation email with registration link and temporary password
    // This would typically be handled by your email service

    res.status(201).json({
      message: "Invitation sent successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName
      },
      task: {
        id: task.id,
        status: task.status
      }
    });
  } catch (error) {
    console.error('[User Routes] Error sending invitation:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid invitation data",
        details: error.errors
      });
    }
    res.status(500).json({ message: "Failed to send invitation" });
  }
});

router.post("/api/users/complete-onboarding", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log(`[User Routes] Starting onboarding completion for user ID: ${req.user.id}, email: ${req.user.email}`);

    // Update user onboarding status first
    const [updatedUser] = await db
      .update(users)
      .set({ 
        onboardingUserCompleted: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, req.user.id))
      .returning();

    console.log(`[User Routes] Updated user onboarding status for ID ${req.user.id}`);

    // Find the corresponding onboarding task using case-insensitive email comparison
    const [task] = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.taskType, 'user_onboarding'),
          sql`LOWER(${tasks.userEmail}) = LOWER(${req.user.email})`,
          eq(tasks.status, TaskStatus.EMAIL_SENT)  // Only look for EMAIL_SENT tasks
        )
      )
      .orderBy(sql`created_at DESC`)
      .limit(1);

    console.log(`[User Routes] Found task:`, task);

    if (!task) {
      console.warn(`[User Routes] No active onboarding task found for user ID ${req.user.id}`);
      return res.json({ 
        user: updatedUser,
        task: null,
        message: "User onboarding completed, but no active task was found to update"
      });
    }

    console.log(`[User Routes] Found task ${task.id} with status ${task.status}`);

    // Update the task status with proper metadata and status flow
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: TaskStatus.COMPLETED,
        progress: 100,
        completionDate: new Date(),
        updatedAt: new Date(),
        assignedTo: req.user.id,
        metadata: {
          ...task.metadata,
          onboardingCompleted: true,
          completionTime: new Date().toISOString(),
          previousStatus: task.status,
          userId: req.user.id,
          userEmail: req.user.email.toLowerCase(),
          statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.COMPLETED]
        }
      })
      .where(eq(tasks.id, task.id))
      .returning();

    console.log(`[User Routes] Successfully updated task ${updatedTask.id} to completed`);
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