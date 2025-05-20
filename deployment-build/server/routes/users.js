"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _db_1 = require("@db");
const schema_1 = require("@db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const service_1 = require("../services/email/service");
const schema_2 = require("@db/schema");
const router = (0, express_1.Router)();
/**
 * @swagger
 * components:
 *   schemas:
 *     UserInvite:
 *       type: object
 *       required:
 *         - email
 *         - full_name
 *         - company_id
 *         - company_name
 *         - sender_name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Email address of the user to invite
 *         full_name:
 *           type: string
 *           description: Full name of the user to invite
 *         company_id:
 *           type: integer
 *           description: ID of the company the user belongs to
 *         company_name:
 *           type: string
 *           description: Name of the company for the invitation email
 *         sender_name:
 *           type: string
 *           description: Name of the person sending the invitation
 */
// Schema for user invitation with explicit error messages
const inviteUserSchema = zod_1.z.object({
    email: zod_1.z.string().email("Valid email is required"),
    full_name: zod_1.z.string().min(1, "Full name is required"),
    company_id: zod_1.z.number({
        required_error: "Company ID is required",
        invalid_type_error: "Company ID must be a number"
    }),
    company_name: zod_1.z.string().min(1, "Company name is required"),
    sender_name: zod_1.z.string().min(1, "Sender name is required")
});
// Generate a temporary password
function generateTempPassword() {
    return crypto_1.default.randomBytes(16).toString('hex');
}
// Hash password using bcrypt
async function hashPassword(password) {
    const salt = await bcrypt_1.default.genSalt(10);
    return bcrypt_1.default.hash(password, salt);
}
/**
 * @swagger
 * /users/invite:
 *   post:
 *     summary: Invite a new user to the platform
 *     description: Sends an invitation email to a new user with a temporary password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInvite'
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User invited successfully
 *                 invitationId:
 *                   type: integer
 *                   description: ID of the created invitation
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *       409:
 *         description: User with this email already exists
 *       500:
 *         description: Server error
 */
router.post("/api/users/invite", async (req, res) => {
    const maxRetries = 3;
    let retryCount = 0;
    while (retryCount < maxRetries) {
        try {
            console.log('[Invite] Starting invitation process');
            console.log('[Invite] Request body:', req.body);
            // Type check for authenticated user
            if (!req.user || !req.user.id) {
                console.error('[Invite] No authenticated user found');
                return res.status(401).json({
                    message: "Authentication required",
                    code: "AUTH_REQUIRED"
                });
            }
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
            const [company] = await _db_1.db.select()
                .from(schema_1.companies)
                .where((0, drizzle_orm_1.eq)(schema_1.companies.id, data.company_id));
            if (!company) {
                throw new Error("Company not found");
            }
            // Generate invitation code
            const invitationCode = crypto_1.default.randomBytes(3).toString('hex').toUpperCase();
            const protocol = req.headers['x-forwarded-proto'] || req.protocol;
            const host = req.headers.host;
            const inviteUrl = `${protocol}://${host}/register?code=${invitationCode}&email=${encodeURIComponent(data.email)}`;
            // Database transaction to create user, invitation and task
            const { newUser, invitation, task } = await _db_1.db.transaction(async (tx) => {
                // Check if user exists
                const existingUser = await tx.query.users.findFirst({
                    where: (0, drizzle_orm_1.eq)(schema_1.users.email, data.email.toLowerCase()),
                });
                if (existingUser) {
                    throw new Error("User with this email already exists");
                }
                // Create new user
                const [userResult] = await tx.insert(schema_1.users)
                    .values({
                    email: data.email.toLowerCase(),
                    password: await hashPassword(generateTempPassword()),
                    full_name: data.full_name,
                    company_id: data.company_id,
                    onboarding_user_completed: false, // Ensure this is false for new users
                })
                    .returning();
                // Create invitation
                const [invitationResult] = await tx.insert(schema_1.invitations)
                    .values({
                    email: data.email.toLowerCase(),
                    code: invitationCode,
                    status: 'pending',
                    company_id: data.company_id,
                    invitee_name: data.full_name,
                    invitee_company: company.name,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                })
                    .returning();
                // Create task with proper created_by field
                const [taskResult] = await tx.insert(schema_1.tasks)
                    .values({
                    title: `New User Invitation: ${data.email}`,
                    description: `Invitation sent to ${data.full_name} to join ${company.name}`,
                    task_type: 'user_onboarding',
                    task_scope: 'user',
                    status: schema_2.TaskStatus.EMAIL_SENT,
                    priority: 'medium',
                    progress: 25,
                    created_by: req.user.id, // Now explicitly using req.user.id after validation
                    assigned_to: userResult.id,
                    company_id: data.company_id,
                    user_email: data.email.toLowerCase(),
                    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    metadata: {
                        user_id: userResult.id,
                        sender_name: data.sender_name,
                        status_flow: [schema_2.TaskStatus.EMAIL_SENT],
                        email_sent_at: new Date().toISOString(),
                        invitation_id: invitationResult.id,
                        invitation_code: invitationCode
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
            const emailResult = await service_1.emailService.sendTemplateEmail({
                to: data.email.toLowerCase(),
                from: process.env.GMAIL_USER,
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
                    expires_at: invitation.expires_at,
                    user_id: newUser.id
                }
            });
        }
        catch (error) {
            console.error('[Invite] Error processing invitation (attempt ${retryCount + 1}):', error);
            if (error instanceof zod_1.z.ZodError) {
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
        const [userResult] = await _db_1.db.insert(schema_1.users)
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
    }
    catch (error) {
        console.error('[Register] Error:', error);
        res.status(500).json({
            message: error instanceof Error ? error.message : "Failed to create account"
        });
    }
});
exports.default = router;
