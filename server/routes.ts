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
  insertFileSchema
} from "@db/schema";
import { eq, and, inArray } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import archiver from "archiver";

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure upload directory exists and is absolute
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use a more secure filename generation
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${path.parse(safeFilename).name}-${uniqueSuffix}${path.extname(file.originalname)}`);
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

function requireAuth(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Single file download endpoint
  app.get("/api/files/:id/download", requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      if (isNaN(fileId)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }

      // First try to get the file from database
      const result = await db.select().from(files).where(eq(files.id, fileId));

      if (!result || result.length === 0) {
        return res.status(404).json({ message: "File not found in database" });
      }

      const file = result[0];

      // Check if user has access to this file
      if (file.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Ensure file path is absolute and normalized
      const filePath = path.resolve(process.cwd(), file.path);

      // Add debug logging
      console.log('Debug - File path:', filePath);
      console.log('Debug - File exists:', fs.existsSync(filePath));

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      // Update download count
      await db
        .update(files)
        .set({ downloadCount: (file.downloadCount || 0) + 1 })
        .where(eq(files.id, fileId));

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
          inArray(files.id, fileIds.map(id => parseInt(id)))
        ));

      const validFiles = selectedFiles.filter(file => fs.existsSync(path.resolve(process.cwd(), file.path)));

      if (validFiles.length === 0) {
        return res.status(404).json({ message: "No valid files found for download" });
      }

      // Set headers for zip download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=download.zip');

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
        archive.file(path.resolve(process.cwd(), file.path), { name: file.name });
        try {
          await db
            .update(files)
            .set({ downloadCount: (file.downloadCount ?? 0) + 1 })
            .where(eq(files.id, file.id))
            .execute();
        } catch (updateError) {
          console.error(`Error updating download count for file ${file.id}:`, updateError);
        }
      }

      // Finalize archive
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

      const content = fs.readFileSync(path.resolve(process.cwd(), file.path), 'utf8');
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
      eq(tasks.assignedTo, req.user!.id)
    );
    res.json(results);
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    const result = insertTaskSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid task data" });
    }

    const task = await db.insert(tasks)
      .values({
        ...result.data,
        createdBy: req.user!.id
      })
      .returning();
    res.status(201).json(task[0]);
  });

  // Relationships
  app.get("/api/relationships", requireAuth, async (req, res) => {
    const results = await db.select().from(relationships);
    res.json(results);
  });

  // Modified file upload endpoint to handle file overrides and version increments correctly
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
          eq(files.userId, req.user!.id)
        ))
        .limit(1);

      // If file exists and override is true, update the existing record
      if (existingFile.length > 0 && req.body.override === 'true') {
        try {
          // Remove the old file from storage
          if (fs.existsSync(path.resolve(process.cwd(), existingFile[0].path))) {
            fs.unlinkSync(path.resolve(process.cwd(), existingFile[0].path));
          }

          // Calculate new version number - increment by 1.0
          const newVersion = Math.ceil(existingFile[0].version || 1.0) + 1.0;

          // Update the existing record with new file information
          const [updatedFile] = await db.update(files)
            .set({
              size: req.file.size,
              type: req.file.mimetype,
              path: req.file.path,
              status: 'uploaded',
              updatedAt: new Date(),
              version: newVersion,
            })
            .where(eq(files.id, existingFile[0].id))
            .returning();

          return res.status(200).json(updatedFile);
        } catch (error) {
          console.error('Error updating existing file:', error);
          // Clean up uploaded file on error
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          throw error;
        }
      }

      // If no existing file or override is false, create new record
      const fileData = {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        path: req.file.path,
        status: 'uploaded',
        userId: req.user!.id,
        companyId: req.user!.companyId,
        downloadCount: 0,
        version: 1.0,
        uniqueViewers: 0,
        accessLevel: 'private',
        classificationType: 'internal',
        retentionPeriod: 365,
        storageLocation: 'hot-storage',
        encryptionStatus: false,
      };

      const [file] = await db.insert(files)
        .values(fileData)
        .returning();

      res.status(201).json(file);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Error uploading file" });

      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
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
      if (fs.existsSync(path.resolve(process.cwd(), file.path))) {
        fs.unlinkSync(path.resolve(process.cwd(), file.path));
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

  const httpServer = createServer(app);
  return httpServer;
}