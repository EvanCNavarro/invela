import { Router } from "express";
import { db } from "@db";
import { users, tasks, invitations, companies } from "@db/schema"; 
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { emailService } from "../services/email/service";
import { TaskStatus } from "@db/schema";

const router = Router();

// Schema for user invitation with explicit error messages
const inviteUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  full_name: z.string().min(1, "Full name is required"), 
  company_id: z.number({
    required_error: "Company ID is required",
    invalid_type_error: "Company ID must be a number"
  }),
  company_name: z.string().min(1, "Company name is required"),
  sender_name: z.string().min(1, "Sender name is required")
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

// Function to update invitation task status
async function updateInvitationTaskStatus(email: string, userId: number) {
  try {
    console.log('[Task Update] Finding task for email:', email);

    // Find the most recent task for this email
    const [task] = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.taskType, 'user_onboarding'),
          eq(tasks.userEmail, email.toLowerCase()),
          eq(tasks.status, TaskStatus.EMAIL_SENT)
        )
      )
      .orderBy(sql`created_at DESC`)
      .limit(1);

    if (!task) {
      console.log('[Task Update] No task found for email:', email);
      return null;
    }

    console.log('[Task Update] Found task:', task.id);

    // Update the task status to completed
    const [updatedTask] = await db
      .update(tasks)
      .set({
        status: TaskStatus.COMPLETED,
        progress: 100,
        completionDate: new Date(),
        assignedTo: userId,
        metadata: {
          ...task.metadata,
          completedAt: new Date().toISOString(),
          statusUpdateTime: new Date().toISOString(),
          previousStatus: task.status,
          userId: userId,
          userEmail: email.toLowerCase(),
          statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.COMPLETED]
        }
      })
      .where(eq(tasks.id, task.id))
      .returning();

    console.log('[Task Update] Updated task status to completed:', updatedTask.id);
    return updatedTask;
  } catch (error) {
    console.error('[Task Update] Error updating task status:', error);
    throw error;
  }
}

router.post("/api/users/invite", async (req, res) => {
  try {
    console.log('[Invite] Starting invitation process');
    const validationResult = inviteUserSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.error('[Invite] Validation failed:', validationResult.error.format());
      return res.status(400).json({
        message: "Missing required fields",
        details: validationResult.error.errors.reduce((acc, err) => {
          acc[err.path.join('.')] = err.message;
          return acc;
        }, {})
      });
    }

    const data = validationResult.data;
    console.log('[Invite] Validation successful. Data:', data);

    // Get company info
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, data.company_id));

    if (!company) {
      console.error('[Invite] Company not found for ID:', data.company_id);
      throw new Error("Company not found");
    }

    // Start transaction
    let newUser;
    let invitation;
    let task;

    try {
      await db.transaction(async (tx) => {
        // Check if user exists
        const existingUser = await tx.query.users.findFirst({
          where: eq(users.email, data.email.toLowerCase()),
        });

        if (existingUser) {
          throw new Error("User with this email already exists");
        }

        // Create new user with initial onboarding state
        const [userResult] = await tx.insert(users)
          .values({
            email: data.email.toLowerCase(),
            password: await hashPassword(generateTempPassword()),
            fullName: data.full_name,
            companyId: data.company_id,
            onboardingUserCompleted: false,
          })
          .returning();

        newUser = userResult;

        // Generate invitation code and URL
        const invitationCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers.host;
        const inviteUrl = `${protocol}://${host}/register?code=${invitationCode}&email=${encodeURIComponent(data.email)}`;

        // Create invitation record
        const [invitationResult] = await tx.insert(invitations)
          .values({
            email: data.email.toLowerCase(),
            code: invitationCode,
            status: 'pending',
            companyId: data.company_id,
            inviteeName: data.full_name,
            inviteeCompany: company.name,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            metadata: {
              inviteUrl,
              userId: newUser.id,
              senderName: data.sender_name,
              senderCompany: company.name
            }
          })
          .returning();

        invitation = invitationResult;

        // Create onboarding task
        const [taskResult] = await tx.insert(tasks)
          .values({
            title: `Complete onboarding for ${data.full_name}`,
            description: `New user invitation from ${data.sender_name} at ${company.name}`,
            taskType: 'user_onboarding',
            taskScope: 'user',
            status: TaskStatus.EMAIL_SENT,
            priority: 'medium',
            progress: 25,
            createdBy: req.user?.id,
            assignedTo: newUser.id,
            companyId: data.company_id,
            userEmail: data.email.toLowerCase(),
            metadata: {
              invitedBy: req.user?.id,
              invitationId: invitation.id,
              statusFlow: [TaskStatus.EMAIL_SENT],
              emailSentAt: new Date().toISOString()
            }
          })
          .returning();

        task = taskResult;

        // Update invitation with task ID
        await tx.update(invitations)
          .set({ taskId: task.id })
          .where(eq(invitations.id, invitation.id));

        // Send invitation email
        const emailTemplateData = {
          recipientName: data.full_name,
          senderName: data.sender_name,
          company: company.name,
          code: invitationCode,
          inviteUrl: inviteUrl
        };

        console.log('[Invite] Sending invitation email');

        const emailResult = await emailService.sendTemplateEmail({
          to: data.email,
          from: process.env.GMAIL_USER!,
          template: 'user_invite',
          templateData: emailTemplateData
        });

        if (!emailResult.success) {
          console.error('[Invite] Failed to send email:', emailResult.error);
          throw new Error(emailResult.error || 'Failed to send invitation email');
        }

        console.log('[Invite] Email sent successfully');
      });

      // Send success response
      res.status(201).json({
        message: "Invitation sent successfully",
        invitation: {
          id: invitation!.id,
          email: invitation!.email,
          code: invitation!.code,
          expiresAt: invitation!.expiresAt,
          userId: newUser!.id
        }
      });

    } catch (txError) {
      console.error('[Invite] Transaction error:', txError);
      throw txError;
    }

  } catch (error) {
    console.error('[Invite] Error processing invitation:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid invitation data",
        details: error.errors.reduce((acc, err) => {
          acc[err.path.join('.')] = err.message;
          return acc;
        }, {})
      });
    }

    if (error instanceof Error && error.message === "User with this email already exists") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to send invitation",
      details: error instanceof Error ? error.message : undefined
    });
  }
});

// Registration endpoint
router.post("/api/register", async (req, res) => {
  try {
    const { email, password, fullName, invitationCode, companyId } = req.body;

    // Create or update user account
    const [userResult] = await db.insert(users)
      .values({
        email: email.toLowerCase(),
        password: await hashPassword(password),
        fullName,
        companyId,
        onboardingUserCompleted: true // Set to true as registration is complete
      })
      .returning();

    // Update the associated invitation task
    const updatedTask = await updateInvitationTaskStatus(email, userResult.id);

    // Return success response with task info
    res.status(200).json({
      message: "Account created successfully",
      user: userResult,
      task: updatedTask
    });
  } catch (error) {
    console.error('[Register] Error:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to create account"
    });
  }
});

export default router;