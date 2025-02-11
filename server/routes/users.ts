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
    console.log('[Debug] Request body:', JSON.stringify(req.body, null, 2));

    // Step 1: Validate request data
    const validationResult = inviteUserSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.error('[Step 1] Validation failed:', JSON.stringify(validationResult.error.format(), null, 2));
      return res.status(400).json({
        message: "Missing required fields",
        details: validationResult.error.errors.reduce((acc, err) => {
          acc[err.path.join('.')] = err.message;
          return acc;
        }, {})
      });
    }

    const data = validationResult.data;
    console.log('[Step 1] Validation successful. Validated data:', JSON.stringify(data, null, 2));

    // Get company info
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, data.company_id));

    if (!company) {
      console.error('[Error] Company not found for ID:', data.company_id);
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

        newUser = userResult;

        // Generate invitation code and URL
        const invitationCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers.host;
        const inviteUrl = `${protocol}://${host}/register?code=${invitationCode}&email=${encodeURIComponent(data.email)}`;

        // Prepare invitation metadata
        const invitationMetadata = {
          inviteUrl,
          userId: newUser.id,
          senderName: data.sender_name,
          senderCompany: company.name
        };

        // Create invitation record
        const [invitationResult] = await tx.insert(invitations)
          .values({
            email: data.email.toLowerCase(),
            code: invitationCode,
            status: 'pending',
            companyId: data.company_id,
            inviteeName: data.full_name,
            inviteeCompany: company.name,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            metadata: invitationMetadata,
            createdAt: new Date(),
            updatedAt: new Date()
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

        // Step 3.5: Validate and log all email template data
        console.log('\n[Email Data Validation] Starting email data validation...');

        // Validate recipient name
        console.log('[Email Data Validation] Recipient Name:', {
          value: data.full_name,
          isValid: !!data.full_name,
          length: data.full_name.length
        });

        // Validate sender name
        console.log('[Email Data Validation] Sender Name:', {
          value: data.sender_name,
          isValid: !!data.sender_name,
          length: data.sender_name.length
        });

        // Validate company name
        console.log('[Email Data Validation] Company Name:', {
          value: company.name,
          isValid: !!company.name,
          length: company.name.length
        });

        // Validate invitation code
        console.log('[Email Data Validation] Invitation Code:', {
          value: invitationCode,
          isValid: !!invitationCode,
          length: invitationCode.length
        });

        // Validate invite URL
        console.log('[Email Data Validation] Invite URL:', {
          value: inviteUrl,
          isValid: !!inviteUrl,
          isValidUrl: inviteUrl.startsWith('http'),
          length: inviteUrl.length
        });

        // Prepare email template data according to the strict schema
        const emailTemplateData = {
          recipientName: data.full_name,
          senderName: data.sender_name,
          company: company.name,
          code: invitationCode,
          inviteUrl: inviteUrl
        };

        // Log complete email preview
        console.log('\n[Email Preview] Complete email template data:');
        console.log(JSON.stringify(emailTemplateData, null, 2));
        console.log('\n[Email Preview] Email will be sent to:', data.email);
        console.log('[Email Preview] Email will be sent from:', process.env.GMAIL_USER);
        console.log('[Email Preview] Using template:', 'user_invite');

        // Send invitation email
        const emailResult = await emailService.sendTemplateEmail({
          to: data.email,
          from: process.env.GMAIL_USER!,
          template: 'user_invite', 
          templateData: emailTemplateData
        });

        if (!emailResult.success) {
          console.error('[Error] Failed to send email:', emailResult.error);
          throw new Error(emailResult.error || 'Failed to send invitation email');
        }

        console.log('[Success] Email sent successfully');
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
      console.error('[Error] Transaction error:', txError);
      throw txError;
    }

  } catch (error) {
    console.error('[Error] Error processing invitation:', error);

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

export default router;