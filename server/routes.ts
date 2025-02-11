import { Express } from 'express';
import { eq, and, gt, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import { db } from '@db';
import { users, companies, files, companyLogos, relationships, tasks, invitations } from '@db/schema';
import { emailService } from './services/email';
import { requireAuth } from './middleware/auth';
import { logoUpload } from './middleware/upload';
import { broadcastTaskUpdate } from './services/websocket';
import crypto from 'crypto';

// Task status enum
export enum TaskStatus {
  PENDING = 'pending',
  EMAIL_SENT = 'email_sent',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Progress mapping for task statuses
const taskStatusToProgress: Record<TaskStatus, number> = {
  [TaskStatus.PENDING]: 0,
  [TaskStatus.EMAIL_SENT]: 25,
  [TaskStatus.COMPLETED]: 100,
  [TaskStatus.FAILED]: 100,
};

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File
    }
  }
}

export function registerRoutes(app: Express): Express {
  // Companies endpoints
  app.get("/api/companies", requireAuth, async (req, res) => {
    try {
      const allCompanies = await db.select().from(companies);
      res.json(allCompanies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Error fetching companies" });
    }
  });

  app.get("/api/companies/current", requireAuth, async (req, res) => {
    try {
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, req.user!.companyId));

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      res.json(company);
    } catch (error) {
      console.error("Error fetching current company:", error);
      res.status(500).json({ message: "Error fetching company details" });
    }
  });

  // Tasks endpoints
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const userTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.companyId, req.user!.companyId));
      res.json(userTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Error fetching tasks" });
    }
  });

  // Files endpoints
  app.get("/api/files", requireAuth, async (req, res) => {
    try {
      const userFiles = await db.select()
        .from(files)
        .where(eq(files.userId, req.user!.id));
      res.json(userFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ message: "Error fetching files" });
    }
  });

  // Relationships endpoints
  app.get("/api/relationships", requireAuth, async (req, res) => {
    try {
      const companyRelationships = await db.select()
        .from(relationships)
        .where(eq(relationships.companyId, req.user!.companyId));
      res.json(companyRelationships);
    } catch (error) {
      console.error("Error fetching relationships:", error);
      res.status(500).json({ message: "Error fetching relationships" });
    }
  });

  // Account setup endpoint
  app.post("/api/account/setup", async (req, res) => {
    try {
      const { email, password, fullName, firstName, lastName, invitationCode } = req.body;

      console.log('[Account Setup] Processing setup request for:', email);

      // Validate invitation code
      const [invitation] = await db.select()
        .from(invitations)
        .where(and(
          eq(invitations.code, invitationCode),
          eq(invitations.status, 'pending'),
          sql`LOWER(${invitations.email}) = LOWER(${email})`,
          gt(invitations.expiresAt, new Date())
        ));

      if (!invitation) {
        console.log('[Account Setup] Invalid invitation:', invitationCode);
        return res.status(400).json({
          message: "Invalid invitation code or email mismatch"
        });
      }

      // Find existing user with case-insensitive email match
      const [existingUser] = await db.select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`);

      if (!existingUser) {
        console.log('[Account Setup] User not found for email:', email);
        return res.status(400).json({ message: "User account not found" });
      }

      // Update the existing user with new information
      const [updatedUser] = await db.update(users)
        .set({
          firstName,
          lastName,
          fullName,
          password: await bcrypt.hash(password, 10),
          onboardingUserCompleted: true,
        })
        .where(eq(users.id, existingUser.id))
        .returning();

      console.log('[Account Setup] Updated user:', updatedUser.id);

      // Update the related task
      const [task] = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.userEmail, email.toLowerCase()),
          eq(tasks.status, TaskStatus.EMAIL_SENT)
        ));

      if (task) {
        const [updatedTask] = await db.update(tasks)
          .set({
            status: TaskStatus.COMPLETED,
            progress: taskStatusToProgress[TaskStatus.COMPLETED],
            assignedTo: updatedUser.id,
            metadata: {
              ...task.metadata,
              registeredAt: new Date().toISOString(),
              statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.COMPLETED]
            }
          })
          .where(eq(tasks.id, task.id))
          .returning();

        broadcastTaskUpdate(updatedTask);
      }

      // Update invitation status
      await db.update(invitations)
        .set({
          status: 'used',
          usedAt: new Date(),
        })
        .where(eq(invitations.id, invitation.id));

      // Log the user in
      req.login(updatedUser, (err) => {
        if (err) {
          console.error("[Account Setup] Login error:", err);
          return res.status(500).json({ message: "Error logging in" });
        }
        res.json(updatedUser);
      });

    } catch (error) {
      console.error("[Account Setup] Account setup error:", error);
      res.status(500).json({ message: "Error updating user information" });
    }
  });

  // File upload endpoint
  app.post("/api/files/upload", requireAuth, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const storedPath = req.file.filename;

      // Check if file already exists
      const existingFile = await db.select()
        .from(files)
        .where(and(
          eq(files.name, req.file.originalname),
          eq(files.userId, req.user!.id)
        ));

      if (existingFile.length > 0) {
        try {
          // Update existing file record
          const [updatedFile] = await db.update(files)
            .set({
              size: req.file.size,
              type: req.file.mimetype,
              path: storedPath,
              version: existingFile[0].version + 1
            })
            .where(eq(files.id, existingFile[0].id))
            .returning();

          console.log('Debug - Updated existing file record:', updatedFile);
          return res.status(200).json(updatedFile);
        } catch (error) {
          console.error('Error updating existing file:', error);
          // Clean up uploaded file on error
          const newFilePath = path.resolve('/home/runner/workspace/uploads', req.file.filename);
          if (fs.existsSync(newFilePath)) {
            fs.unlinkSync(newFilePath);
          }
          throw error;
        }
      }

      // Create new file record
      const fileData = {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        path: storedPath,
        status: 'uploaded',
        userId: req.user!.id,
        companyId: req.user!.companyId,
        downloadCount: 0,
        version: 1.0,
      };

      const [file] = await db.insert(files)
        .values(fileData)
        .returning();

      console.log('Debug - Created new file record:', file);
      res.status(201).json(file);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Error uploading file" });

      // Clean up uploaded file on error
      if (req.file) {
        const filePath = path.resolve('/home/runner/workspace/uploads', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
  });


  app.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const [file] = await db.select()
        .from(files)
        .where(and(
          eq(files.id, parseInt(req.params.id)),
          eq(files.userId, req.user!.id)
        ));

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Remove the file from storage
      const filePath = path.resolve('/home/runner/workspace/uploads', file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Update file status to deleted
      await db.update(files)
        .set({ status: 'deleted' })
        .where(eq(files.id, file.id));

      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Error deleting file" });
    }
  });

  // Add file restore endpoint
  app.post("/api/files/:id/restore", requireAuth, async (req, res) => {
    try {
      // Find the file
      const [file] = await db.select()
        .from(files)
        .where(and(
          eq(files.id, parseInt(req.params.id)),
          eq(files.userId, req.user!.id)
        ));

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      if (file.status !== 'deleted') {
        return res.status(400).json({ message: "File is not in deleted state" });
      }

      // Update file status to restored
      const [updatedFile] = await db.update(files)
        .set({ status: 'restored' })
        .where(eq(files.id, file.id))
        .returning();

      res.json(updatedFile);
    } catch (error) {
      console.error("Error restoring file:", error);
      res.status(500).json({ message: "Error restoring file" });
    }
  });

  // Update company logo upload endpoint
  app.post("/api/companies/:id/logo", requireAuth, logoUpload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        console.log('Debug - No logo filein request');
        return res.status(400).json({ message: "No logo uploaded" });
      }

      console.log('Debug - Received logo upload:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const companyId = parseInt(req.params.id);
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));

      if (!company) {
        console.log('Debug - Company not found:', companyId);
        return res.status(404).json({ message: "Company not found" });
      }

      // If company already has a logo, delete the old file
      if (company.logoId) {
        const [oldLogo] = await db.select()
          .from(companyLogos)
          .where(eq(companyLogos.id, company.logoId));

        if (oldLogo) {
          const oldFilePath = path.resolve('/home/runner/workspace/uploads/logos', oldLogo.filePath);
          console.log('Debug - Attempting to delete old logo:', oldFilePath);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            console.log('Debug - Successfully deleted old logo');
          } else {
            console.log('Debug - Old logo file not found on disk');
          }
        }
      }

      // Create logo record
      const [logo] = await db.insert(companyLogos)
        .values({
          companyId,
          fileName: req.file.originalname,
          filePath: req.file.filename,
          fileType: req.file.mimetype,
        })
        .returning();

      console.log('Debug - Created new logo record:', logo);

      // Update company with logo reference
      await db.update(companies)
        .set({ logoId: logo.id })
        .where(eq(companies.id, companyId));

      // Verify file exists in the correct location
      const uploadedFilePath = path.resolve('/home/runner/workspace/uploads/logos', req.file.filename);
      console.log('Debug - Verifying uploaded file exists:', uploadedFilePath);
      if (!fs.existsSync(uploadedFilePath)) {
        console.error('Debug - Logo file not found after upload!');
        throw new Error('Logo file not found after upload');
      }

      res.json(logo);
    } catch (error) {
      console.error("Error uploading company logo:", error);
      res.status(500).json({ message: "Error uploading company logo" });
    }
  });

  // Update the company logo endpoint to properly handle missing logos
  app.get("/api/companies/:id/logo", requireAuth, async (req, res) => {
    try {
      console.log(`Debug - Logo request for company ID: ${req.params.id}`);

      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, parseInt(req.params.id)));

      if (!company) {
        console.log(`Debug - Company not found: ${req.params.id}`);
        return res.status(404).json({
          message: "Company not found",
          code: "COMPANY_NOT_FOUND"
        });
      }

      if (!company.logoId) {
        console.log(`Debug - No logo assigned for company: ${company.name} (${company.id})`);
        return res.status(404).json({
          message: "No logo assigned to company",
          code: "LOGO_NOT_ASSIGNED"
        });
      }

      const [logo] = await db.select()
        .from(companyLogos)
        .where(eq(companyLogos.id, company.logoId));

      if (!logo) {
        console.log(`Debug - Logo record not found for company ${company.name} (${company.id}), logoId: ${company.logoId}`);
        return res.status(404).json({
          message: "Logo record not found",
          code: "LOGO_RECORD_NOT_FOUND"
        });
      }

      // Fix path resolution - remove extra 'uploads/logos' from the path
      const filePath = path.resolve('/home/runner/workspace/uploads/logos', logo.filePath.replace('uploads/logos/', ''));
      console.log(`Debug - Attempting to serve logo from: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.error(`Logo file missing for company ${company.name} (${company.id}): ${filePath}`);
        // Log directory contents to help debug
        const dir = path.resolve('/home/runner/workspace/uploads/logos');
        const dirContents = fs.readdirSync(dir);
        console.log('Debug - Logo directory contents:', dirContents);

        return res.status(404).json({
          message: "Logo file not found on disk",
          code: "LOGO_FILE_MISSING"
        });
      }

      try {
        // Try to read and validate SVG content
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('<?xml') && !content.includes('<svg')) {
          console.error(`Debug - Invalid SVG content for company ${company.name}:`, content.slice(0, 100));
          return res.status(400).json({
            message: "Invalid SVG file",
            code: "INVALID_SVG_CONTENT"
          });
        }

        // Add Content-Type and security headers
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Stream the file with proper error handling
        const fileStream = fs.createReadStream(filePath);

        fileStream.on('error', (error) => {
          console.error(`Error streaming logo file for company ${company.name}:`, error);
          if (!res.headersSent) {
            res.status(500).json({
              message: "Error serving logo file",
              code: "LOGO_STREAM_ERROR"
            });
          }
        });

        fileStream.pipe(res);

      } catch (readError) {
        console.error(`Debug - Error reading SVG file for company ${company.name}:`, readError);
        return res.status(500).json({
          message: "Error reading logo file",
          code: "LOGO_READ_ERROR"
        });
      }

    } catch (error) {
      console.error(`Error serving company logo for ID ${req.params.id}:`, error);
      if (!res.headersSent) {
        res.status(500).json({
          message: "Error serving company logo",
          code: "LOGO_SERVER_ERROR"
        });
      }
    }
  });

  // Add fintech invite endpoint
  app.post("/api/fintech/invite", requireAuth, async (req, res) => {
    try {
      const { email, companyName } = req.body;

      // Input validation
      if (!email || !companyName) {
        return res.status(400).json({
          message: "Email and company name are required"
        });
      }

      // Get user's company details
      const [userCompany] = await db.select()
        .from(companies)
        .where(eq(companies.id, req.user!.companyId));

      if (!userCompany) {
        return res.status(404).json({
          message: "Your company information not found"
        });
      }

      // Generate invitation code
      const code = uuidv4();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7); // 7 days expiration

      // Create task for invitation
      const [task] = await db.insert(tasks)
        .values({
          title: `New User Invitation: ${email}`,
          description: `Invitation sent to ${email} to join ${companyName} on the platform.`,
          taskType: 'user_onboarding',
          taskScope: 'user',
          status: 'pending',
          priority: 'medium',
          progress: 0,
          createdBy: req.user!.id,
          userEmail: email,
          companyId: req.user!.companyId,
          dueDate: expirationDate,
        })
        .returning();

      // Create invitation record
      const [invitation] = await db.insert(invitations)
        .values({
          email,
          code,
          status: 'pending',
          companyId: req.user!.companyId,
          taskId: task.id,
          expiresAt: expirationDate,
        })
        .returning();

      // Send invitation email
      const inviteUrl = `${req.protocol}://${req.get('host')}/register?code=${code}&work_email=${encodeURIComponent(email)}`;

      const emailParams = {
        to: email,
        from: process.env.GMAIL_USER!,
        template: 'fintech_invite',
        templateData: {
          recipientEmail: email,
          senderName: req.user!.fullName,
          senderCompany: userCompany.name, // Add sender's company name
          targetCompany: companyName,      // Company being invited
          inviteUrl: inviteUrl
        }
      };

      const emailResult = await emailService.sendTemplateEmail(emailParams);

      if (!emailResult.success) {
        // Rollback the invitation and task if email fails
        await db.update(invitations)
          .set({ status: 'failed' })
          .where(eq(invitations.id, invitation.id));

        await db.update(tasks)
          .set({ status: 'failed' })
          .where(eq(tasks.id, task.id));

        return res.status(500).json({
          message: "Failed to send invitation email. Please try again."
        });
      }

      // Update task status after successful email
      await db.update(tasks)
        .set({ status: 'email_sent' })
        .where(eq(tasks.id, task.id));

      res.json({
        message: "Invitation sent successfully",
        invitation
      });

    } catch (error: any) {
      console.error("Error sending invitation:", error);
      res.status(500).json({
        message: "Failed to send invitation. Please try again."
      });
    }
  });

  // Add endpoint for companies to add other companies to their network
  app.post("/api/companies/:id/network", requireAuth, async (req, res) => {
    try {
      const targetCompanyId = parseInt(req.params.id);

      // Verify the target company exists
      const [targetCompany] = await db.select()
        .from(companies)
        .where(eq(companies.id, targetCompanyId));

      if (!targetCompany) {
        return res.status(404).json({ message: "Target company not found" });
      }

      // Check if relationship already exists
      const [existingRelationship] = await db.select()
        .from(relationships)
        .where(and(
          eq(relationships.companyId, req.user!.companyId),
          eq(relationships.relatedCompanyId, targetCompanyId)
        ));

      if (existingRelationship) {
        return res.status(400).json({ message: "Company is already in your network" });
      }

      // Create the relationship
      const [relationship] = await db.insert(relationships)
        .values({
          companyId: req.user!.companyId,
          relatedCompanyId: targetCompanyId,
          relationshipType: 'network_member',
          status: 'active',
          metadata: {
            addedAt: new Date().toISOString(),
            addedBy: req.user!.id
          }
        })
        .returning();

      res.status(201).json(relationship);
    } catch (error) {
      console.error("Error adding company to network:", error);
      res.status(500).json({ message: "Error adding company to network" });
    }
  });

  // Update the user invite endpoint after the existing registration endpoint
  app.post("/api/users/invite", requireAuth, async (req, res) => {
    console.log('[Invite] Starting invitation process');
    console.log('[Invite] Request body:', req.body);

    try {
      // Validate and normalize invite data
      const inviteData = {
        email: req.body.email.toLowerCase(),
        fullName: req.body.full_name,
        companyId: req.body.company_id,
        companyName: req.body.company_name,
        senderName: req.body.sender_name,
        senderCompany: req.body.senderCompany || (req.user?.companyId === 0 ? 'Invela' : undefined)
      };

      console.log('[Invite] Validated invite data:', inviteData);

      // Create the transaction for atomic operations
      const result = await db.transaction(async (tx) => {
        console.log('[Invite] Creating user account');

        // Generate a temporary password
        const tempPassword = crypto.randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create user account with temporary password
        const [newUser] = await tx.insert(users)
          .values({
            email: inviteData.email,
            password: hashedPassword,
            companyId: inviteData.companyId,
            fullName: inviteData.fullName,
            onboardingUserCompleted: false
          })
          .returning();

        console.log('[Invite] Created user account:', { id: newUser.id, email: newUser.email });

        // Generate invitation code
        const code = generateInviteCode();
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);

        console.log('[Invite] Creating invitation record with code:', code);

        // Create invitation
        const [invitation] = await tx.insert(invitations)
          .values({
            email: inviteData.email,
            code,
            status: 'pending',
            companyId: inviteData.companyId,
            inviteeName: inviteData.fullName,
            inviteeCompany: inviteData.companyName,
            expiresAt: expiryDate
          })
          .returning();

        console.log('[Invite] Created invitation:', invitation);
        console.log('[Invite] Creating associated task');

        // Create associated task
        const [task] = await tx.insert(tasks)
          .values({
            title: `New User Invitation: ${inviteData.email}`,
            description: `Invitation sent to ${inviteData.fullName} to join ${inviteData.companyName}`,
            taskType: 'user_onboarding',
            taskScope: 'user',
            status: TaskStatus.EMAIL_SENT,
            priority: 'medium',
            progress: 25,
            createdBy: req.user!.id,
            companyId: inviteData.companyId,
            userEmail: inviteData.email,
            dueDate: expiryDate,
            metadata: {
              userId: newUser.id,
              senderName: inviteData.senderName,
              statusFlow: [TaskStatus.EMAIL_SENT],
              emailSentAt: new Date().toISOString(),
              invitationId: invitation.id,
              invitationCode: code
            }
          })
          .returning();

        console.log('[Invite] Created task:', task);
        console.log('[Invite] Sending invitation email');

        try {
          // Send invitation email with correctly named template fields and static Invela branding
          await emailService.sendTemplateEmail({
            to: inviteData.email,
            from: process.env.GMAIL_USER!,
            template: 'user_invite',
            templateData: {
              recipientName: inviteData.fullName,
              company: "Invela", // Always use Invela as the company name in emails
              code: invitation.code,
              inviteUrl: `${process.env.APP_URL}/register?code=${invitation.code}`,
              senderName: inviteData.senderName
            }
          });

          console.log('[Invite] Successfully sent invitation email');
        } catch (emailError) {
          console.error('[Invite] Failed to send email:', emailError);
          throw new Error('Failed to send invitation email');
        }

        console.log('[Invite] Successfully completed invitation process');

        return { invitation, task, newUser };
      });

      // Send success response
      res.status(201).json({
        message: "Invitation sent successfully",
        invitation: {
          id: result.invitation.id,
          email: result.invitation.email,
          taskId: result.task.id
        }
      });

    } catch (error: any) {
      console.error('[Invite] Error processing invitation:', error);
      res.status(500).json({
        message: "Failed to process invitation",
        error: error.message
      });
    }
  });

  // Mark user onboarding as completed
  app.post("/api/users/complete-onboarding", requireAuth, async (req, res) => {
    try {
      // Update user's onboarding status
      const [updatedUser] = await db.update(users)
        .set({ onboardingUserCompleted: true })
        .where(eq(users.id, req.user!.id))
        .returning();

      // Find and update associated onboarding task
      const [task] = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.userEmail, updatedUser.email),
          eq(tasks.taskType, 'user_onboarding'),
          eq(tasks.status, 'email_sent')
        ));

      if (task) {
        await db.update(tasks)
          .set({
            status: 'completed',
            progress: 100,
            metadata: {
              ...task.metadata,
              completedAt: new Date().toISOString()
            }
          })
          .where(eq(tasks.id, task.id));
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Error completing onboarding" });
    }
  });

  // Get users by company ID
  app.get("/api/users/by-company/:companyId", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId);
      if (isNaN(companyId)) {
        return res.status(400).json({ message: "Invalid company ID" });
      }

      // Get the user's company to check permissions
      const [userCompany] = await db.select()
        .from(companies)
        .where(eq(companies.id, req.user!.companyId));

      if (!userCompany) {
        return res.status(404).json({ message: "User's company not found" });
      }

      // If user is from Invela, they can see all users
      // Otherwise, they can only see users from their own company or companies in their network
      let companyUsers;
      if (userCompany.category === 'Invela') {
        companyUsers = await db.select()
          .from(users)
          .where(eq(users.companyId, companyId));
      } else {
        // First check if the requested company is in the user's network
        const [relationship] = await db.select()
          .from(relationships)
          .where(and(
            eq(relationships.companyId, req.user!.companyId),
            eq(relationships.relatedCompanyId, companyId),
            eq(relationships.status, 'active')
          ));

        // Only allow access if it's the user's own company or a company in their network
        if (companyId === req.user!.companyId || relationship) {
          companyUsers = await db.select()
            .from(users)
            .where(eq(users.companyId, companyId));
        } else {
          return res.status(403).json({ message: "Not authorized to view users for this company" });
        }
      }

      res.json(companyUsers || []);
    } catch (error) {
      console.error("Error fetching company users:", error);
      res.status(500).json({ message: "Error fetching company users" });
    }
  });

  // Update the user invitation endpoint to include sender details
  app.post("/api/invitations", requireAuth, async (req, res) => {
    try {
      const { email, name: recipientName } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Format the recipient's name
      const formattedName = recipientName
        ?.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ') || email.split('@')[0];

      // Get sender's full name and company
      const [sender] = await db.select()
        .from(users)
        .leftJoin(companies, eq(users.companyId, companies.id))
        .where(eq(users.id, req.user!.id));

      if (!sender || !sender.companies) {
        return res.status(400).json({ message: "Sender company information not found" });
      }

const senderName = sender.users.fullName;
      const senderCompany = sender.companies.name;

      // Generate invitation code
      const code = uuidv4();

      console.log('Debug - Creating invitation with details:', {
        senderName,
        senderCompany,
        recipientName: formattedName,
        email
      });

      // Create invitation record
      const [invitation] = await db.insert(invitations)
        .values({
          email,
          code,
          status: 'pending',
          companyId: req.user!.companyId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdBy: req.user!.id
        })
        .returning();

      const inviteUrl = `${req.protocol}://${req.get('host')}`;

      console.log('Debug - Preparing to send invitation email');
      // Send invitation email with formatted name and company details
      const emailParams = {
        to: email,
        from: process.env.GMAIL_USER!,
        template: 'user_invite',
        templateData: {
          recipientEmail: email,
          recipientName: formattedName,
          senderName,
          senderCompany,
          code,
          inviteUrl,
        }
      };

      console.log('Debug - Sending invitation email with params:', {
        to: email,
        template: 'user_invite',
        senderName,
        senderCompany,
        code
      });

      const emailResult = await emailService.sendTemplateEmail(emailParams);
      console.log('Debug - Email service response:', emailResult);

      if (!emailResult.success) {
        throw new Error(`Failed to send email: ${emailResult.error}`);
      }

      // Update task status
      await db.update(tasks)
        .set({ status: 'email_sent' })
        .where(eq(tasks.id, invitation.taskId));

      res.json({ success: true, message: 'Invitation sent successfully' });
    } catch (error) {
      console.error("Error sending invitation:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Error sending invitation: ${errorMessage}` });
    }
  });

  // Add invitation validation endpoint
  app.get("/api/invitations/:code/validate", async (req, res) => {
    try {
      const code = req.params.code;
      console.log('[Invite] Validating invitation code:', code);

      // Find the invitation with company, task, and user details
      const [result] = await db
        .select({
          invitation: invitations,
          task: tasks,
          company: companies,
          user: users
        })
        .from(invitations)
        .leftJoin(tasks, eq(invitations.taskId, tasks.id))
        .leftJoin(companies, eq(tasks.companyId, companies.id))
        .leftJoin(users, eq(tasks.userEmail, users.email))
        .where(and(
          eq(invitations.code, code),
          eq(invitations.status, 'pending'),
          gt(invitations.expiresAt, new Date())
        ));

      if (!result?.invitation) {
        console.log('[Invite] Invalid or expired invitation code:', code);
        return res.status(404).json({
          valid: false,
          message: "Invalid or expired invitation code"
        });
      }

      console.log('[Invite] Invitation found:', {
        id: result.invitation.id,
        email: result.invitation.email,
        company: result.company?.name,
        status: result.invitation.status,
        user: result.user
      });

      // Return complete user information for pre-filling the form
      res.json({
        valid: true,
        invitation: {
          email: result.invitation.email,
          company: result.company?.name || result.task?.metadata?.company || null,
          companyId: result.company?.id || null,
          firstName: result.user?.firstName || result.invitation.inviteeName?.split(' ')[0] || '',
          lastName: result.user?.lastName || result.invitation.inviteeName?.split(' ').slice(1).join(' ') || '',
          fullName: result.user?.fullName || result.invitation.inviteeName || ''
        }
      });

    } catch (error) {
      console.error('[Invite] Error validating invitation:', error);
      res.status(500).json({
        valid: false,
        message: "Error validating invitation code"
      });
    }
  });

  // Utility functions
  function generateInviteCode(): string {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  function formatTimestampForFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  function toTitleCase(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  console.log('[Routes] Routes setup completed');
  return app;
}

// Export both the named and default function for backward compatibility
export default registerRoutes;