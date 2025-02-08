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
  users
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
    // Get company name from the request
    const companyId = parseInt(req.params.id);
    // Default to original file naming convention if company not found
    let filename = `logo_${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Async operation to get company name
    db.select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .then(([company]) => {
        if (company) {
          // Convert company name to snake case and create filename
          const companySlug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          // Check if filename contains color variant
          const colorMatch = file.originalname.match(/_([a-z]+)\.svg$/i);
          const colorSuffix = colorMatch ? `_${colorMatch[1].toLowerCase()}` : '';
          filename = `logo_${companySlug}${colorSuffix}.svg`;
        }
        cb(null, filename);
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
    try {
      // If the user is from Invela (System Creator), they can see all companies
      const [userCompany] = await db.select()
        .from(companies)
        .where(eq(companies.id, req.user!.companyId));

      if (!userCompany) {
        return res.status(404).json({ message: "User's company not found" });
      }

      console.log('User company:', userCompany);

      if (userCompany.type === 'SYSTEM_CREATOR') {
        // Invela users can see all companies
        const results = await db.select().from(companies);
        console.log('All companies returned:', results);
        return res.json(results);
      }

      // For other companies, get companies from their network
      const networkCompanies = await db.select()
        .from(companies)
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

      console.log('Network companies:', networkCompanies);

      // Fix: Return only the companies data, not the join result
      const companyResults = networkCompanies.map(({ companies: company }) => company).filter(Boolean);
      console.log('Filtered company results:', companyResults);

      res.json(companyResults);
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
        .where(eq(companies.type, 'SYSTEM_CREATOR'));

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

  // Task creation logic update
  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const { taskType, userEmail, companyId } = req.body;

      // First validate only the required fields from the modal
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

      // Create minimal task data with sensible defaults
      const taskData = {
        title: taskType === 'user_onboarding'
          ? `New User Invitation: ${userEmail}`
          : `File Request for ${userEmail}`,
        description: taskType === 'user_onboarding'
          ? `Invitation sent to ${userEmail} to join ${company.name} on the platform.`
          : `Document request task for ${userEmail}`,
        taskType,
        taskScope: 'user',
        status: 'pending',
        priority: 'medium',
        progress: 0,
        createdBy: req.user!.id,
        userEmail,
        companyId,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        assignedTo: taskType === 'user_onboarding' ? null : req.user!.id,
        filesRequested: [],
        filesUploaded: [],
        metadata: {}
      };

      console.log('Creating task with data:', JSON.stringify(taskData, null, 2));

      // Create the task
      const [task] = await db.insert(tasks)
        .values(taskData)
        .returning();

      // Handle email sending for onboarding tasks
      if (taskType === 'user_onboarding') {
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
          await db.update(tasks)
            .set({ status: 'failed' })
            .where(eq(tasks.id, task.id));

          return res.status(500).json({
            message: "Failed to send invite email",
            error: emailResult.error
          });
        }

        await db.update(tasks)
          .set({ status: 'email_sent' })
          .where(eq(tasks.id, task.id));
      }

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
        return res.status(400).json({ message: "No logo uploaded" });
      }

      const companyId = parseInt(req.params.id);
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // If company already has a logo, delete the old file
      if (company.logoId) {
        const [oldLogo] = await db.select()
          .from(companyLogos)
          .where(eq(companyLogos.id, company.logoId));

        if (oldLogo) {
          const oldFilePath = path.resolve('/home/runner/workspace/uploads/logos', oldLogo.filePath);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
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

      // Convert company name to snake case for filename
      const companySlug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const filename = `logo_${companySlug}.svg`;
      const filePath = path.resolve('/home/runner/workspace/uploads/logos', filename);

      console.log('Attempting to serve logo from:', filePath);

      if (!fs.existsSync(filePath)) {
        console.error(`Logo file not found at path: ${filePath}`);
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
      const { email, companyName } = req.body;

      if (!email || !companyName) {
        return res.status(400).json({ message: "Email and company name are required" });
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

      // Create a task for the invitation
      const taskData = {
        title: `New FinTech Invitation: ${companyName}`,
        description: `Invitation sent to ${email} from ${companyName} to join the platform.`,
        taskType: 'fintech_onboarding',
        taskScope: 'company',
        status: 'email_sent',
        priority: 'medium',
        progress: 0,
        createdBy: req.user!.id,
        userEmail: email,
        companyId: req.user!.companyId,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        assignedTo: null,
        filesRequested: [],
        filesUploaded: [],
        metadata: { invitedCompanyName: companyName }
      };

      await db.insert(tasks).values(taskData);

      res.json({ message: "Invite sent successfully" });
    } catch (error) {
      console.error("Error sending fintech invite:", error);
      res.status(500).json({ message: "Error sending invite" });
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