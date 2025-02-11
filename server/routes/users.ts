import { Router } from "express";
import { db } from "@db";
import { users, tasks, TaskStatus } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";

const router = Router();

// Schema for user invitation with explicit error messages
const inviteUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  fullName: z.string().min(1, "Full name is required"),
  company_id: z.number({
    required_error: "Company ID is required",
    invalid_type_error: "Company ID must be a number"
  }),
  company_name: z.string().min(1, "Company name is required"),
  sender_name: z.string().min(1, "Sender name is required"),
  sender_company: z.string().min(1, "Sender company name is required"),
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
    console.log('[User Routes] Invitation request body:', req.body);

    // Validate request data
    const validationResult = inviteUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('[User Routes] Validation failed:', validationResult.error.format());
      return res.status(400).json({
        message: "Invalid invitation data",
        details: validationResult.error.format()
      });
    }

    const data = validationResult.data;
    console.log('[User Routes] Processing invitation for:', data.email);

    // Start transaction to ensure data consistency
    let newUser;
    let task;

    await db.transaction(async (tx) => {
      // Check if user already exists
      const existingUser = await tx.query.users.findFirst({
        where: eq(users.email, data.email.toLowerCase()),
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Generate temporary password and hash it
      const tempPassword = generateTempPassword();
      const hashedPassword = await hashPassword(tempPassword);

      // Create new user account
      [newUser] = await tx
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

      if (!newUser?.id) {
        throw new Error("Failed to create user account");
      }

      // Create onboarding task for the new user
      [task] = await tx
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
          createdBy: req.user?.id || newUser.id,
          companyId: data.company_id,
          userEmail: data.email.toLowerCase(),
          metadata: {
            invitedBy: req.user?.id || null,
            invitedByName: data.sender_name,
            companyName: data.company_name,
            statusFlow: [TaskStatus.EMAIL_SENT]
          },
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!task?.id) {
        throw new Error("Failed to create onboarding task");
      }
    });

    // Send success response
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

    // Handle specific error cases
    if (error instanceof Error && error.message === "User with this email already exists") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to send invitation" 
    });
  }
});

export default router;