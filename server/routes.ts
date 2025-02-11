import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import {
  companies,
  tasks,
  relationships,
  files,
  insertCompanySchema,
  insertTaskSchema,
  insertFileSchema,
  companyLogos,
  users,
  invitations
} from "@db/schema";
import { eq, and, inArray, or, gt, sql, ilike } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { emailService } from "./services/email/service.ts";
import type { SendEmailParams } from "./services/email/service.ts";
import bcrypt from 'bcrypt';
import { findAndUpdateOnboardingTask } from "./services/tasks";
import { WebSocketServer, WebSocket } from 'ws';

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve('/home/runner/workspace/uploads');
    console.log('Debug - Upload directory:', uploadDir);

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      console.log('Debug - Creating upload directory');
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename that includes original name for better tracking
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `file-${uniqueSuffix}${path.extname(file.originalname)}`;
    console.log('Debug - Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'application/pdf',
      'application/rtf',
      'text/plain',
      'application/wordperfect',
      'application/x-wpwin'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Update the logo storage configuration to handle blue suffix
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve('/home/runner/workspace/uploads/logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const companyId = parseInt(req.params.id);
    db.select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .then(([company]) => {
        if (company) {
          const companySlug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const colorMatch = file.originalname.match(/_([a-z]+)\.svg$/i);
          const colorSuffix = colorMatch ? `-${colorMatch[1].toLowerCase()}` : '';
          // Special handling for Invela's primary blue logo
          const filename = company.name === 'Invela' && !colorSuffix ?
            'logo_invela_blue.svg' :
            `logo_${companySlug}${colorSuffix}.svg`;
          cb(null, filename);
        } else {
          cb(new Error('Company not found'));
        }
      })
      .catch(err => {
        console.error('Error getting company name:', err);
        cb(err);
      });
  }
});

const logoUpload = multer({
  storage: logoStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/svg+xml') {
      cb(null, true);
    } else {
      cb(new Error('Only SVG files are allowed'));
    }
  }
});

function requireAuth(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server with a different path to avoid conflicts with Vite
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws'
  });

  // Store active connections
  const clients = new Set<WebSocket>();

  // WebSocket connection handler
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    clients.add(ws);

    // Handle client disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });

    // Handle incoming messages
    ws.on('message', (message) => {
      console.log('Received WebSocket message:', message.toString());
    });

    // Send initial ping to verify connection
    ws.send(JSON.stringify({ type: 'connected' }));
  });

  // Broadcast task updates to all connected clients
  function broadcastTaskUpdate(task: any) {
    const message = JSON.stringify({
      type: 'task_update',
      task
    });

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Check invitation validity
  app.get("/api/invitations/:code/validate", async (req, res) => {
    try {
      const code = req.params.code;
      const [invitation] = await db.select()
        .from(invitations)
        .where(and(
          eq(invitations.code, code),
          eq(invitations.status, 'pending'),
          gt(invitations.expiresAt, new Date())
        ));

      if (!invitation) {
        return res.status(404).json({
          message: "Invalid or expired invitation code",
          valid: false
        });
      }

      // Get company information
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, invitation.companyId));

      if (!company) {
        return res.status(404).json({
          message: "Company not found",
          valid: false
        });
      }

      res.json({
        valid: true,
        email: invitation.email,
        companyId: invitation.companyId,
        company: company.name,
        fullName: invitation.inviteeName,
        inviteeCompany: invitation.inviteeCompany
      });
    } catch (error) {
      console.error("Error validating invitation:", error);
      res.status(500).json({ message: "Error validating invitation" });
    }
  });

  // Update the registration endpoint to handle task update correctly
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, fullName, firstName, lastName, invitationCode } = req.body;

      // Validate invitation with case-insensitive email check
      const [invitation] = await db.select()
        .from(invitations)
        .where(and(
          eq(invitations.code, invitationCode),
          eq(invitations.status, 'pending'),
          sql`LOWER(${invitations.email}) = LOWER(${email})`,
          gt(invitations.expiresAt, new Date())
        ));

      if (!invitation) {
        return res.status(400).json({
          message: "Invalid invitation code or email mismatch"
        });
      }

      // Check if user already exists with case-insensitive check
      const existingUser = await db.select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Create the user
      const [user] = await db.insert(users)
        .values({
          email: email.toLowerCase(), // Store email in lowercase
          password: await bcrypt.hash(password, 10),
          fullName,
          firstName,
          lastName,
          companyId: invitation.companyId,
          onboardingUserCompleted: false,
        })
        .returning();

      console.log(`[Register] Created new user with ID: ${user.id}`);

      // Find and update the related task (now looking for EMAIL_SENT status)
      const [task] = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.userEmail, email.toLowerCase()),
          eq(tasks.status, 'EMAIL_SENT')
        ));

      if (task) {
        // Update task with new user information and progress
        const [updatedTask] = await db.update(tasks)
          .set({
            status: TaskStatus.COMPLETED,
            progress: 100,
            assignedTo: user.id,
            metadata: {
              ...task.metadata,
              registeredAt: new Date().toISOString(),
              statusFlow: [...(task.metadata.statusFlow || []), TaskStatus.COMPLETED]
            }
          })
          .where(eq(tasks.id, task.id))
          .returning();

        console.log(`[Register] Updated task ${updatedTask.id} with registration progress`);

        // Broadcast the task update to all connected clients
        broadcastTaskUpdate(updatedTask);
      } else {
        console.warn(`[Register] No task found to update for user ${user.id}`);
      }

      // Update invitation status
      await db.update(invitations)
        .set({
          status: 'used',
          usedAt: new Date(),
        })
        .where(eq(invitations.id, invitation.id));

      console.log(`[Register] Updated invitation ${invitation.id} to used status`);

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Error logging in" });
        }
        res.json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Error registering user" });
    }
  });

  // Update the current company endpoint
  app.get("/api/companies/current", requireAuth, async (req, res) => {
    try {
      console.log('Debug - Current user:', req.user);
      console.log('Debug - User company ID:', req.user?.companyId);

      // Handle companyId including 0 for Invela
      if (typeof req.user?.companyId !== 'number') {
        console.log('Debug - No company ID associated with user');
        return res.status(404).json({ message: "No company associated with user" });
      }

      // Find the company and join with its logo
      const [company] = await db.select()
        .from(companies)
        .leftJoin(companyLogos, eq(companies.logoId, companyLogos.id))
        .where(eq(companies.id, req.user.companyId));

      console.log('Debug - Found company:', company);

      if (!company) {
        console.log('Debug - Company not found for ID:', req.user.companyId);
        return res.status(404).json({ message: "Company not found" });
      }

      // Transform the joined result to include logo information
      const companyData = {
        ...company.companies,
        logo: company.company_logos ? {
          id: company.company_logos.id,
          filePath: company.company_logos.filePath
        } : null
      };

      console.log('Debug - Sending company data:', companyData);
      res.json(companyData);
    } catch (error) {
      console.error("Error fetching current company:", error);
      res.status(500).json({ message: "Error fetching company data" });
    }
  });

  // Single file download endpoint
  app.get("/api/files/:id/download", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      if (isNaN(fileId)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }

      console.log('Debug - Attempting to download file:', fileId);

      // Get the file from database
      const [file] = await db.select()
        .from(files)
        .where(and(
          eq(files.id, fileId),
          eq(files.userId, req.user!.id),
          eq(files.status, 'uploaded')
        ));

      if (!file) {
        console.log('Debug - File not found in database');
        return res.status(404).json({ message: "File not found or not accessible" });
      }

      console.log('Debug - Found file in database:', file);

      // Check if the file exists on disk
      const filePath = path.resolve('/home/runner/workspace/uploads', file.path);
      console.log('Debug - Looking for file at path:', filePath);

      if (!fs.existsSync(filePath)) {
        console.log('Debug - File not found on disk');
        // Update file status to deleted if file is missing
        await db.update(files)
          .set({ status: 'deleted' })
          .where(eq(files.id, file.id));
        return res.status(404).json({ message: "File not found on disk" });
      }

      // Update download count
      await db.update(files)
        .set({ downloadCount: (file.downloadCount || 0) + 1 })
        .where(eq(files.id, file.id));

      // Set headers for file download
      res.setHeader('Content-Type', file.type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      // Handle streaming errors
      fileStream.on('error', (error) => {
        console.error("Error streaming file:", error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Error streaming file" });
        }
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error downloading file" });
      }
    }
  });

  // Bulk download endpoint with fixed query syntax
  app.post("/api/files/download-bulk", requireAuth, async (req, res) => {
    try {
      const { fileIds } = req.body;
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ message: "No files selected for download" });
      }

      const selectedFiles = await db.select()
        .from(files)
        .where(and(
          eq(files.userId, req.user!.id),
          eq(files.status, 'uploaded'),
          inArray(files.id, fileIds.map(id => parseInt(id)))
        ));

      // Verify files exist on disk
      const validFiles = selectedFiles.filter(file => {
        const filePath = path.resolve('/home/runner/workspace/uploads', file.path);
        return fs.existsSync(filePath);
      });

      if (validFiles.length === 0) {
        return res.status(404).json({ message: "No valid files found for download" });
      }

      // Set headers for zip download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=invela_download_${formatTimestampForFilename()}.zip`);

      // Create zip archive
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      // Handle archive errors
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: "Error creating zip file" });
        }
      });

      // Pipe archive data to response
      archive.pipe(res);

      // Add files to archive and update download counts
      for (const file of validFiles) {
        const filePath = path.resolve('/home/runner/workspace/uploads', file.path);
        archive.file(filePath, { name: file.name });

        try {
          await db.update(files)
            .set({ downloadCount: (file.downloadCount || 0) + 1 })
            .where(eq(files.id, file.id));
        } catch (updateError) {
          console.error(`Error updating download count for file ${file.id}:`, updateError);
        }
      }

      // Finalize the archive
      await archive.finalize();
    } catch (error) {
      console.error("Error creating bulk download:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error creating bulk download" });
      }
    }
  });

  // New endpoint for getting file content preview
  app.get("/api/files/:id/preview", requireAuth, async (req, res) => {
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

      if (file.type !== 'text/plain') {
        return res.status(400).json({ message: "File preview is only available for text files" });
      }

      const content = fs.readFileSync(path.resolve('/home/runner/workspace/uploads', file.path), 'utf8');
      // Return first 1000 characters as preview
      res.json({ preview: content.slice(0, 1000) });
    } catch (error) {
      console.error("Error getting file preview:", error);
      res.status(500).json({ message: "Error getting file preview" });
    }
  });

  // Companies
  app.get("/api/companies", requireAuth, async (req, res) => {
    try {
      // If the user is from Invela, they can see all companies
      const [userCompany] = await db.select()
        .from(companies)
        .where(eq(companies.id, req.user!.companyId));

      if (!userCompany) {
        return res.status(404).json({ message: "User's company not found" });
      }

      console.log('User company:', userCompany);

      // Invela users can see all companies
      if (userCompany.category === 'Invela') {
        const results = await db.select()
          .from(companies)
          .leftJoin(companyLogos, eq(companies.logoId, companyLogos.id))
          .orderBy(companies.name);

        // Transform results to include logo information
        const companiesWithLogos = results.map(result => ({
          ...result.companies,
          logo: result.company_logos ? {
            id: result.company_logos.id,
            filePath: result.company_logos.filePath
          } : null
        }));

        return res.json(companiesWithLogos);
      }

      // For other companies, get companies from their network
      const networkCompanies = await db.select()
        .from(companies)
        .leftJoin(companyLogos, eq(companies.logoId, companyLogos.id))
        .leftJoin(relationships, and(
          eq(relationships.companyId, req.user!.companyId),
          eq(relationships.status, 'active')
        ))
        .where(or(
          // Include their own company
          eq(companies.id, req.user!.companyId),
          // Include related companies
          eq(relationships.relatedCompanyId, companies.id)
        ));

      // Transform results to include logo information
      const companiesWithLogos = networkCompanies.map(result => ({
        ...result.companies,
        logo: result.company_logos ? {
          id: result.company_logos.id,
          filePath: result.company_logos.filePath
        } : null
      }));

      res.json(companiesWithLogos);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Error fetching companies" });
    }
  });

  app.post("/api/companies", requireAuth, async (req, res) => {
    try {
      const result = insertCompanySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid company data" });
      }

      // Create the company
      const [company] = await db.insert(companies)
        .values(result.data)
        .returning();

      // Find the Invela company (System Creator)
      const [invela] = await db.select()
        .from(companies)
        .where(eq(companies.category, 'Invela'));

      if (invela) {
        // Add the new company to Invela's network
        await db.insert(relationships)
          .values({
            companyId: invela.id,
            relatedCompanyId: company.id,
            relationshipType: 'network_member',
            status: 'active',
            metadata: {
              addedAt: new Date().toISOString(),
              addedBy: 'system'
            }
          });
      }

      res.status(201).json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Error creating company" });
    }
  });

  // Tasks
  app.get("/api/tasks", requireAuth, async (req, res) => {
    const results = await db.select().from(tasks).where(
      or(
        eq(tasks.createdBy, req.user!.id),
        eq(tasks.assignedTo, req.user!.id)
      )
    );
    res.json(results);
  });

  // Update task status with validation
  app.patch("/api/tasks/:id/status", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { status } = req.body;

      // Validate status value
      if (!Object.values(TaskStatus).includes(status)) {
        return res.status(400).json({
          message: "Invalid status value",
          allowedValues: Object.values(TaskStatus)
        });
      }

      const [updatedTask] = await db
        .update(tasks)
        .set({
          status,
          updatedAt: new Date(),
          metadata: sql`
            jsonb_set(
              COALESCE(metadata, '{}'),
              '{statusFlow}',
              COALESCE(metadata->'statusFlow', '[]'::jsonb) || $1::jsonb
            )
          `,
        })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(updatedTask);
    } catch (error) {
      console.error("[Task Routes] Error updating task status:", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  // Task creation with proper status handling
  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const { taskType, userEmail, companyId } = req.body;

      if (!taskType || !userEmail || !companyId) {
        return res.status(400).json({
          message: "Missing required fields",
          detail: "Please provide task type, user email, and company"
        });
      }

      // Get company details
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));

      if (!company) {
        return res.status(400).json({ message: "Company not found" });
      }

      // Set initial status and progress for new invitation tasks
      const initialStatus = TaskStatus.EMAIL_SENT;
      const initialProgress = STATUS_PROGRESS[initialStatus]; // Get progress from constant mapping

      const taskData = {
        title: `New User Invitation: ${userEmail}`,
        description: `Invitation sent to ${userEmail} to join ${company.name} on the platform.`,
        taskType,
        taskScope: 'user',
        status: initialStatus,
        priority: 'medium',
        progress: initialProgress,
        createdBy: req.user!.id,
        userEmail: userEmail.toLowerCase(),
        companyId,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        assignedTo: null,
        filesRequested: [],
        filesUploaded: [],
        metadata: {
          emailSentAt: new Date().toISOString(),
          senderName: req.user!.fullName,
          senderCompany: company.name,
          statusFlow: [initialStatus]
        }
      };

      const [task] = await db.insert(tasks)
        .values(taskData)
        .returning();

      res.status(201).json(task);
    } catch (error: any) {
      console.error("Error creating task:", error);
      res.status(500).json({
        message: "Error creating task",
        error: error.message,
        detail: error.detail || 'No additional details available'
      });
    }
  });

  // Migration helper endpoint (Invela admin only)
  app.post("/api/tasks/migrate-pending", requireAuth, async (req, res) => {
    try {
      // Only allow Invela admin (companyId 0)
      if (req.user?.companyId !== 0) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const [updatedTasks] = await db
        .update(tasks)
        .set({
          status: TaskStatus.EMAIL_SENT,
          updatedAt: new Date(),
          metadata: sql`
            jsonb_set(
              COALESCE(metadata, '{}'),
              '{statusFlow}',
              COALESCE(metadata->'statusFlow', '[]'::jsonb) || jsonb_build_array($1::text)
            )
          `
        })
        .where(eq(tasks.status, 'pending'))
        .returning();

      const updatedCount = Array.isArray(updatedTasks) ? updatedTasks.length : 0;

      res.json({
        message: "Successfully migrated pending tasks",
        updatedCount
      });
    } catch (error) {
      console.error("[Task Routes] Error migrating pending tasks:", error);
      res.status(500).json({ message: "Failed to migrate pending tasks" });
    }
  });

  // Add task deletion endpoint after the existing task routes
  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // Find the task and verify ownership
      const [task] = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.id, taskId),
          eq(tasks.createdBy, req.user!.id)
        ));

      if (!task) {
        return res.status(404).json({ message: "Task not found or unauthorized" });
      }

      // Delete the task
      await db.delete(tasks)
        .where(eq(tasks.id, taskId));

      res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Error deleting task" });
    }
  });

  // Relationships
  app.get("/api/relationships", requireAuth, async (req, res) => {
    const results = await db.select().from(relationships);
    res.json(results);
  });

  // Updated file upload endpoint with improved error handling and path tracking
  app.post("/api/files", requireAuth, upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      // Check if a file with the same name exists for this user
      const existingFile = await db.select()
        .from(files)
        .where(and(
          eq(files.name, req.file.originalname),
          eq(files.userId, req.user!.id),
          eq(files.status, 'uploaded')
        ))
        .limit(1);

      // Store just the filename as the path
      const storedPath = req.file.filename;
      console.log('Debug - Storing file with path:', storedPath);

      // If file exists and override is true, update the existing record
      if (existingFile.length > 0 && req.body.override === 'true') {
        try {
          // Remove the old file from storage
          const oldFilePath = path.resolve('/home/runner/workspace/uploads', existingFile[0].path);
          console.log('Debug - Removing old file:', oldFilePath);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }

          // Calculate new version number - increment by 1.0
          const newVersion = (existingFile[0].version || 1.0) + 1.0;

          // Update the existing record with new file information
          const [updatedFile] = await db.update(files)
            .set({
              size: req.file.size,
              type: req.file.mimetype,
              path: storedPath,
              status: 'uploaded',
              updatedAt: new Date(),
              version: newVersion,
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

  // Update file list endpoint to include all necessary fields
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
        .where(eq(tasks.id, task.id));

      res.json({ success: true, message: 'Invitation sent successfully' });
    } catch (error) {
      console.error("Error sending invitation:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Error sending invitation: ${errorMessage}` });
    }
  });

  // Add users by company endpoint
  app.get("/api/users/by-company/:companyId", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId);
      console.log('Debug - Fetching users for company:', companyId);
      console.log('Debug - Company ID type:', typeof companyId);

      if (isNaN(companyId)) {
        return res.status(400).json({ message: "Invalid company ID" });
      }

      // Debug: Log the query we're about to execute
      console.log('Debug - Executing query with companyId:', companyId);

      const companyUsers = await db.select()
        .from(users)
        .where(eq(users.companyId, companyId));

      console.log('Debug - SQL Query result:', companyUsers);
      console.log('Debug - Number of users found:', companyUsers.length);

      res.json(companyUsers);
    } catch (error) {
      console.error("Error fetching company users:", error);
      res.status(500).json({ message: "Error fetching company users" });
    }
  });

  // Update the users by company endpoint
  app.get("/api/users/by-company/:id", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      if (isNaN(companyId)) {
        return res.status(400).json({ message: "Invalid company ID" });
      }

      // Get all users for the company, including pending invitations
      const companyUsers = await db.select()
        .from(users)
        .where(eq(users.companyId, companyId));

      console.log('Debug - Fetched users for company:', {
        companyId,
        userCount: companyUsers.length,
        users: companyUsers.map(u => ({ id: u.id, email: u.email }))
      });

      res.json(companyUsers);
    } catch (error) {
      console.error("Error fetching company users:", error);
      res.status(500).json({ message: "Error fetching company users" });
    }
  });
  // Update the user invite endpoint after the existing registration endpoint
  app.post("/api/users/invite", requireAuth, async (req, res) => {
    console.log('[Invite] Starting invitation process');
    console.log('[Invite] Request body:', req.body);

    try {
      // Validate request data
      const inviteData = {
        email: req.body.email,
        fullName: req.body.full_name,
        companyId: req.body.company_id,
        companyName: req.body.company_name,
        senderName: req.body.sender_name,
        senderCompany: req.body.sender_company
      };

      console.log('[Invite] Validated invite data:', inviteData);

      // Generate invitation code
      const inviteCode = uuidv4().substring(0, 8).toUpperCase();
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // 7 days expiry

      // Create invitation record
      console.log('[Invite] Creating invitation record');
      const [invitation] = await db.insert(invitations)
        .values({
          email: inviteData.email.toLowerCase(),
          code: inviteCode,
          status: 'pending',
          companyId: inviteData.companyId,
          inviteeName: inviteData.fullName,
          inviteeCompany: inviteData.companyName,
          senderName: inviteData.senderName,
          senderCompany: inviteData.senderCompany,
          expiresAt: expiryDate
        })
        .returning();

      if (!invitation) {
        console.error('[Invite] Failed to create invitation record');
        return res.status(500).json({ message: "Failed to create invitation" });
      }

      console.log('[Invite] Created invitation:', invitation);

      // Create task for tracking the invitation
      console.log('[Invite] Creating associated task');
      const [task] = await db.insert(tasks)
        .values({
          title: `New User Invitation: ${inviteData.email}`,
          description: `Invitation sent to ${inviteData.email} to join ${inviteData.companyName}`,
          taskType: 'user_invitation',
          taskScope: 'user',
          status: 'EMAIL_SENT',
          priority: 'medium',
          progress: 25,
          createdBy: req.user!.id,
          userEmail: inviteData.email.toLowerCase(),
          companyId: inviteData.companyId,
          metadata: {
            invitationId: invitation.id,
            invitationCode: inviteCode,
            senderName: inviteData.senderName,
            senderCompany: inviteData.senderCompany,
            statusFlow: ['EMAIL_SENT']
          }
        })
        .returning();

      if (!task) {
        console.error('[Invite] Failed to create task record');
        // Rollback invitation
        await db.delete(invitations).where(eq(invitations.id, invitation.id));
        return res.status(500).json({ message: "Failed to create tracking task" });
      }

      console.log('[Invite] Created task:', task);

      // Send invitation email
      console.log('[Invite] Sending invitation email');
      const emailResult = await emailService.sendTemplateEmail({
        to: inviteData.email,
        from: process.env.GMAIL_USER!,
        template: 'fintech_invite',
        templateData: {
          recipientName: inviteData.fullName,
          invitationCode: inviteCode,
          companyName: inviteData.companyName,
          senderName: inviteData.senderName
        }
      });

      if (!emailResult.success) {
        console.error('[Invite] Failed to send email:', emailResult.error);
        // Rollback both records
        await db.delete(tasks).where(eq(tasks.id, task.id));
        await db.delete(invitations).where(eq(invitations.id, invitation.id));
        return res.status(500).json({
          message: "Failed to send invitation email",
          error: emailResult.error
        });
      }

      console.log('[Invite] Successfully completed invitation process');
      res.status(201).json({
        message: "Invitation sent successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          code: invitation.code,
          expiresAt: invitation.expiresAt
        }
      });

    } catch (error) {
      console.error('[Invite] Error processing invitation:', error);
      res.status(500).json({
        message: "Failed to process invitation",
        error: error instanceof Error ? error.message : "Unknown error"
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

  return httpServer;
}

function formatTimestampForFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function toTitleCase(str: string) {
  return str.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
enum TaskStatus {
  PENDING = 'pending',
  EMAIL_SENT = 'email_sent',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

const STATUS_PROGRESS = {
  [TaskStatus.PENDING]: 0,
  [TaskStatus.EMAIL_SENT]: 25,
  [TaskStatus.IN_PROGRESS]: 50,
  [TaskStatus.COMPLETED]: 100,
  [TaskStatus.FAILED]: 100,
};