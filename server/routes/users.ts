import { Router } from "express";
import { db } from "@db";
import { users, tasks, TaskStatus, invitations, companies } from "@db/schema"; 
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { emailService } from "../services/email/service";

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

router.post("/api/users/invite", async (req, res) => {
  try {
    console.log('\n[Step 1] Starting User Invitation Process');
    console.log('[Step 1] Request body:', JSON.stringify(req.body, null, 2));

    // Step 1: Validate request data
    const validationResult = inviteUserSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.error('[Step 1] Validation failed:', JSON.stringify(validationResult.error.format(), null, 2));
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
    console.log('[Step 1] Validation successful. Validated data:', JSON.stringify(data, null, 2));

    // Get sender's company info first
    const [senderCompany] = await db.select()
      .from(companies)
      .where(eq(companies.id, req.user?.companyId));

    if (!senderCompany) {
      throw new Error("Sender's company not found");
    }

    // Start transaction
    let newUser;
    let task;
    let invitation;

    try {
      await db.transaction(async (tx) => {
        // Check if user exists
        console.log('[Step 2] Checking for existing user...');
        const existingUser = await tx.query.users.findFirst({
          where: eq(users.email, data.email.toLowerCase()),
        });

        if (existingUser) {
          console.error('[Step 2] User already exists:', existingUser.email);
          throw new Error("User with this email already exists");
        }
        console.log('[Step 2] User check completed - no existing user found');

        // Step 3: Create the user first
        console.log('[Step 3] Creating new user...');
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
        console.log('[Step 3] Created new user:', { id: newUser.id, email: newUser.email });

        // Step 4: Generate invitation code and URL
        const invitationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Construct the invitation URL with proper parameters
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers.host;
        const inviteUrl = `${protocol}://${host}/register?code=${invitationCode}&email=${encodeURIComponent(data.email)}&name=${encodeURIComponent(data.full_name)}`;

        console.log('[Step 4] Generated invitation details:', {
          code: invitationCode,
          url: inviteUrl
        });

        // Step 5: Create invitation record
        console.log('[Step 5] Creating invitation record...');
        const [invitationResult] = await tx.insert(invitations)
          .values({
            email: data.email.toLowerCase(),
            code: invitationCode,
            status: 'pending',
            companyId: data.company_id,
            inviteeName: data.full_name,
            inviteeCompany: data.company_name,
            expiresAt,
            metadata: {
              inviteUrl,
              senderName: data.sender_name,
              senderCompany: senderCompany.name,
              userId: newUser.id
            },
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        invitation = invitationResult;

        // Step 6: Create task with proper assignedTo field
        console.log('[Step 6] Creating onboarding task...');
        const [taskResult] = await tx.insert(tasks)
          .values({
            title: `Complete onboarding for ${data.full_name}`,
            description: `New user invitation from ${data.sender_name} at ${senderCompany.name}`,
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
              invitedByName: data.sender_name,
              senderCompany: senderCompany.name,
              invitationId: invitation.id,
              statusFlow: [TaskStatus.EMAIL_SENT],
              emailSentAt: new Date().toISOString(),
            },
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        task = taskResult;

        // Update invitation with task ID
        await tx.update(invitations)
          .set({ taskId: task.id })
          .where(eq(invitations.id, invitation.id));

        // Send invitation email with correct template and data structure
        await emailService.sendTemplateEmail({
          to: data.email,
          from: process.env.GMAIL_USER!,
          template: 'user_invite',
          templateData: {
            recipientName: data.full_name,
            senderName: data.sender_name,
            senderCompany: senderCompany.name,
            inviteUrl,
            code: invitationCode
          }
        });

        console.log('\n[Success] Transaction completed successfully');
        console.log('[Success] Task and Invitation created:', {
          taskId: task.id,
          invitationId: invitation.id,
          inviteUrl,
          code: invitationCode
        });
      });

      // Send success response
      res.status(201).json({
        message: "Invitation sent successfully",
        invitation: {
          id: invitation!.id,
          email: invitation!.email,
          code: invitation!.code,
          status: invitation!.status,
          companyId: invitation!.companyId,
          taskId: task!.id,
          inviteeName: invitation!.inviteeName,
          inviteeCompany: invitation!.inviteeCompany,
          inviteUrl: invitation!.metadata?.inviteUrl,
          senderCompany: senderCompany.name,
          expiresAt: invitation!.expiresAt,
          createdAt: invitation!.createdAt,
          updatedAt: invitation!.updatedAt
        }
      });

    } catch (txError) {
      console.error('[Error] Transaction error:', txError);
      throw txError;
    }

  } catch (error) {
    console.error('[Error] Error processing invitation:', error);

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
      message: error instanceof Error ? error.message : "Failed to send invitation",
      details: error instanceof Error ? error.message : undefined
    });
  }
});

export default router;