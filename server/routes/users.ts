import { Router } from "express";
import { db } from "@db";
import { users, tasks, TaskStatus, invitations } from "@db/schema"; // Added invitations import
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";

const router = Router();

// Schema for user invitation with explicit error messages
const inviteUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  full_name: z.string().min(1, "Full name is required"), //Corrected field name
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
    console.log('\n[Step 3A] Starting Initial Steps');
    console.log('[Step 3A] Request body:', JSON.stringify(req.body, null, 2));

    // Step 3A: Validate request data
    const validationResult = inviteUserSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.error('[Step 3A] Validation failed:', JSON.stringify(validationResult.error.format(), null, 2));
      const errorDetails = {};
      validationResult.error.errors.forEach(err => {
        errorDetails[err.path.join('.')] = err.message;
      });
      return res.status(400).json({
        message: "Missing required fields",
        details: errorDetails
      });
    }

    const data = validationResult.data;
    console.log('[Step 3A] Validation successful. Validated data:', JSON.stringify(data, null, 2));

    // Start transaction
    let newUser;
    let task;
    let invitation;

    try {
      await db.transaction(async (tx) => {
        // Check if user exists
        console.log('[Step 3A] Checking for existing user...');
        const existingUser = await tx.query.users.findFirst({
          where: eq(users.email, data.email.toLowerCase()),
        });

        if (existingUser) {
          console.error('[Step 3A] User already exists:', existingUser.email);
          throw new Error("User with this email already exists");
        }
        console.log('[Step 3A] User check completed - no existing user found');

        // Step 3B: Create new user account
        console.log('\n[Step 3B] Starting User Account Creation');
        const tempPassword = generateTempPassword();
        const hashedPassword = await hashPassword(tempPassword);

        const userInsertResult = await tx
          .insert(users)
          .values({
            email: data.email.toLowerCase(),
            fullName: data.full_name,
            password: hashedPassword,
            companyId: data.company_id,
            onboardingUserCompleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        newUser = userInsertResult[0];
        if (!newUser?.id) {
          console.error('[Step 3B] Failed to create user account');
          throw new Error("Failed to create user account");
        }
        console.log('[Step 3B] User account created successfully:', {
          id: newUser.id,
          email: newUser.email,
          companyId: newUser.companyId
        });

        // Step 3C: Create onboarding task
        console.log('\n[Step 3C] Starting Onboarding Task Creation');
        const taskInsertResult = await tx
          .insert(tasks)
          .values({
            title: `Complete onboarding for ${data.full_name}`,
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

        task = taskInsertResult[0];
        if (!task?.id) {
          console.error('[Step 3C] Failed to create onboarding task');
          throw new Error("Failed to create onboarding task");
        }
        console.log('[Step 3C] Onboarding task created successfully:', {
          id: task.id,
          title: task.title,
          assignedTo: task.assignedTo
        });

        // Step 3D: Create invitation record
        console.log('\n[Step 3D] Starting Invitation Creation');
        const invitationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitationInsertResult = await tx
          .insert(invitations)
          .values({
            email: data.email.toLowerCase(),
            code: invitationCode,
            status: 'pending',
            companyId: data.company_id,
            taskId: task.id,
            inviteeName: data.full_name,
            inviteeCompany: data.company_name,
            expiresAt,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        invitation = invitationInsertResult[0];
        if (!invitation?.id) {
          console.error('[Step 3D] Failed to create invitation');
          throw new Error("Failed to create invitation");
        }
        console.log('[Step 3D] Invitation created successfully:', {
          id: invitation.id,
          code: invitation.code,
          email: invitation.email
        });
      });

      console.log('\n[Step 3] Transaction completed successfully');

      // Send success response
      res.status(201).json({
        message: "Invitation sent successfully",
        invitation: {
          id: invitation!.id,
          email: invitation!.email,
          code: invitation!.code,
          status: invitation!.status,
          companyId: invitation!.companyId,
          taskId: invitation!.taskId,
          inviteeName: invitation!.inviteeName,
          inviteeCompany: invitation!.inviteeCompany,
          expiresAt: invitation!.expiresAt,
          usedAt: invitation!.usedAt,
          createdAt: invitation!.createdAt,
          updatedAt: invitation!.updatedAt
        }
      });

    } catch (txError) {
      console.error('[Step 3] Transaction error:', txError);
      throw txError;
    }

  } catch (error) {
    console.error('[Step 3] Error processing invitation:', error);

    if (error instanceof z.ZodError) {
      const formattedErrors = {};
      error.errors.forEach(err => {
        formattedErrors[err.path.join('.')] = err.message;
      });

      return res.status(400).json({
        message: "Invalid invitation data",
        details: formattedErrors
      });
    }

    if (error instanceof Error && error.message === "User with this email already exists") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to send invitation" 
    });
  }
});

export default router;