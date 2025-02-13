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

router.post("/api/users/invite", async (req, res) => {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log('[Invite] Starting invitation process');
      console.log('[Invite] Request body:', req.body);

      // Validate input data
      const validationResult = inviteUserSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error('[Invite] Validation failed:', validationResult.error.format());
        return res.status(400).json({
          message: "Missing required fields",
          details: validationResult.error.errors
        });
      }

      const data = validationResult.data;
      console.log('[Invite] Validated invite data:', data);

      // Get company info
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, data.company_id));

      if (!company) {
        throw new Error("Company not found");
      }

      // Generate invitation code
      const invitationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const inviteUrl = `${protocol}://${host}/register?code=${invitationCode}&email=${encodeURIComponent(data.email)}`;

      // Database transaction to create user, invitation and task
      const { newUser, invitation, task } = await db.transaction(async (tx) => {
        // Check if user exists
        const existingUser = await tx.query.users.findFirst({
          where: eq(users.email, data.email.toLowerCase()),
        });

        if (existingUser) {
          throw new Error("User with this email already exists");
        }

        // Create new user
        const [userResult] = await tx.insert(users)
          .values({
            email: data.email.toLowerCase(),
            password: await hashPassword(generateTempPassword()),
            fullName: data.full_name,
            companyId: data.company_id,
            onboardingUserCompleted: false,
          })
          .returning();

        // Create invitation
        const [invitationResult] = await tx.insert(invitations)
          .values({
            email: data.email.toLowerCase(),
            code: invitationCode,
            status: 'pending',
            companyId: data.company_id,
            inviteeName: data.full_name,
            inviteeCompany: company.name,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          })
          .returning();

        // Create task
        const [taskResult] = await tx.insert(tasks)
          .values({
            title: `New User Invitation: ${data.email}`,
            description: `Invitation sent to ${data.full_name} to join ${company.name}`,
            taskType: 'user_onboarding',
            taskScope: 'user',
            status: TaskStatus.EMAIL_SENT,
            priority: 'medium',
            progress: 25,
            createdBy: req.user?.id,
            assignedTo: userResult.id,
            companyId: data.company_id,
            userEmail: data.email.toLowerCase(),
            metadata: {
              userId: userResult.id,
              senderName: data.sender_name,
              statusFlow: [TaskStatus.EMAIL_SENT],
              emailSentAt: new Date().toISOString(),
              invitationId: invitationResult.id,
              invitationCode: invitationCode
            }
          })
          .returning();

        return { newUser: userResult, invitation: invitationResult, task: taskResult };
      });

      // Send invitation email - match exactly the schema required by email template
      const emailTemplateData = {
        recipientName: data.full_name,
        recipientEmail: data.email.toLowerCase(),
        senderName: data.sender_name,
        senderCompany: company.name,
        targetCompany: company.name,
        inviteUrl,
        code: invitationCode
      };

      console.log('[User Invite] Email template data:', JSON.stringify(emailTemplateData, null, 2));

      const emailResult = await emailService.sendTemplateEmail({
        to: data.email.toLowerCase(),
        from: process.env.GMAIL_USER!,
        template: 'user_invite',
        templateData: emailTemplateData
      });

      if (!emailResult.success) {
        console.error('[Invite] Failed to send email:', emailResult.error);
        throw new Error(emailResult.error || 'Failed to send invitation email');
      }

      return res.status(201).json({
        message: "Invitation sent successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          code: invitation.code,
          expiresAt: invitation.expiresAt,
          userId: newUser.id
        }
      });

    } catch (error) {
      console.error('[Invite] Error processing invitation (attempt ${retryCount + 1}):', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid invitation data",
          details: error.errors
        });
      }

      if (error instanceof Error && error.message === "User with this email already exists") {
        return res.status(400).json({ message: error.message });
      }

      // If it's a connection error, retry
      if (error instanceof Error && 
          error.message?.includes('Console request failed') && 
          retryCount < maxRetries - 1) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }

      return res.status(500).json({ 
        message: "Failed to process invitation",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
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


    res.status(200).json({
      message: "Account created successfully",
      user: userResult,
    });
  } catch (error) {
    console.error('[Register] Error:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to create account"
    });
  }
});

export default router;