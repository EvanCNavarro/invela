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
  companyLogos
} from "@db/schema";
import { eq, and, inArray, or } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { emailService } from "./services/email/service.ts";
import type { SendEmailParams } from "./services/email/service.ts";

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

// Update storage configuration for logos
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve('/home/runner/workspace/uploads/logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeFilename}`);
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

  // Add the current company endpoint
  app.get("/api/companies/current", requireAuth, async (req, res) => {
    try {
      if (!req.user?.companyId) {
        return res.status(404).json({ message: "No company associated with user" });
      }

      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, req.user.companyId));

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      res.json(company);
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
    const results = await db.select().from(companies);
    res.json(results);
  });

  app.post("/api/companies", requireAuth, async (req, res) => {
    const result = insertCompanySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid company data" });
    }

    const company = await db.insert(companies).values(result.data).returning();
    res.status(201).json(company[0]);
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

  // Task creation logic update
  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const { taskType, taskScope, userEmail, companyId, dueDate } = req.body;

      // Generate task data based on type
      let taskData;
      if (taskType === 'user_onboarding') {
        const [company] = await db.select()
          .from(companies)
          .where(eq(companies.id, companyId));
        const companyName = company ? company.name : 'the company';

        // Set due date to 2 weeks from now for invitation tasks
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

        taskData = {
          taskType,
          title: `New User Invitation: ${userEmail}`,
          description: `Invitation sent to ${userEmail} to join ${companyName} on the platform.`,
          userEmail,
          companyId,
          dueDate: twoWeeksFromNow,
          assignedTo: null,
          progress: 0,
          status: 'pending',
          taskScope: 'user', // Always user scope for onboarding
          priority: 'medium'
        };
      } else {
        // File request task logic
        let assignee = '';
        if (taskScope === 'company') {
          const [company] = await db.select()
            .from(companies)
            .where(eq(companies.id, companyId));
          assignee = company ? company.name : 'the company';
        } else {
          assignee = userEmail || '';
        }
        taskData = {
          taskType,
          taskScope,
          title: `File Request for ${assignee}`,
          description: `Document request task for ${assignee}`,
          userEmail: taskScope === 'user' ? userEmail : undefined,
          companyId: taskScope === 'company' ? companyId : undefined,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          assignedTo: req.user!.id,
          progress: 0,
          status: 'pending',
          priority: 'medium'
        };
      }

      const result = insertTaskSchema.safeParse(taskData);
      if (!result.success) {
        console.error("Task validation failed:", result.error);
        return res.status(400).json({ message: "Invalid task data", errors: result.error.format() });
      }

      // Create the task
      const [task] = await db.insert(tasks)
        .values({
          ...result.data,
          createdBy: req.user!.id,
        })
        .returning();

      // If it's a user onboarding task, send the invite email
      if (taskType === 'user_onboarding' && userEmail) {
        // Get company details for the sender
        const [company] = await db.select()
          .from(companies)
          .where(eq(companies.id, companyId));

        if (!company) {
          return res.status(400).json({ message: "Company information not found" });
        }

        // Generate invite URL
        const inviteUrl = `${req.protocol}://${req.get('host')}`;

        const emailParams: SendEmailParams = {
          to: userEmail,
          from: process.env.GMAIL_USER!,
          template: 'fintech_invite',
          templateData: {
            recipientEmail: userEmail,
            senderName: req.user!.fullName,
            companyName: company.name,
            inviteUrl: inviteUrl
          }
        };

        const emailResult = await emailService.sendTemplateEmail(emailParams);

        if (!emailResult.success) {
          // If email fails, update task status
          await db.update(tasks)
            .set({ status: 'failed' })
            .where(eq(tasks.id, task.id));

          return res.status(500).json({
            message: "Failed to send invite email",
            error: emailResult.error
          });
        }

        // Update task status to reflect email sent
        await db.update(tasks)
          .set({ status: 'email_sent' })
          .where(eq(tasks.id, task.id));
      }

      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Error creating task" });
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

  // Add company logo upload endpoint
  app.post("/api/companies/:id/logo", requireAuth, logoUpload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No logo uploaded" });
      }

      const companyId = parseInt(req.params.id);
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
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

      // Update company with logo reference
      await db.update(companies)
        .set({ logoId: logo.id })
        .where(eq(companies.id, companyId));

      res.json(logo);
    } catch (error) {
      console.error("Error uploading company logo:", error);
      res.status(500).json({ message: "Error uploading company logo" });
    }
  });

  // Update the company logo endpoint to properly serve SVG files
  app.get("/api/companies/:id/logo", requireAuth, async (req, res) => {
    try {
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, parseInt(req.params.id)));

      if (!company || !company.logoId) {
        return res.status(404).json({ message: "Logo not found" });
      }

      const [logo] = await db.select()
        .from(companyLogos)
        .where(eq(companyLogos.id, company.logoId));

      if (!logo) {
        return res.status(404).json({ message: "Logo not found" });
      }

      const filePath = path.resolve('/home/runner/workspace/uploads/logos', logo.filePath);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Logo file not found" });
      }

      // Set proper content type for SVG
      res.setHeader('Content-Type', 'image/svg+xml');
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error("Error serving company logo:", error);
      res.status(500).json({ message: "Error serving company logo" });
    }
  });

  // Add fintech invite endpoint
  app.post("/api/fintech/invite", requireAuth, async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Get company details for the sender
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, req.user!.companyId));

      if (!company) {
        return res.status(400).json({ message: "Company information not found" });
      }

      // Generate invite URL
      const inviteUrl = `${req.protocol}://${req.get('host')}`;

      const emailParams: SendEmailParams = {
        to: email,
        from: process.env.GMAIL_USER!,
        template: 'fintech_invite',
        templateData: {
          recipientEmail: email,
          senderName: req.user!.fullName,
          companyName: company.name,
          inviteUrl: inviteUrl
        }
      };

      const result = await emailService.sendTemplateEmail(emailParams);

      if (!result.success) {
        return res.status(500).json({
          message: "Failed to send invite email",
          error: result.error
        });
      }

      res.json({ message: "Invite sent successfully" });
    } catch (error) {
      console.error("Error sending fintech invite:", error);
      res.status(500).json({ message: "Error sending invite" });
    }
  });

  const httpServer = createServer(app);
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