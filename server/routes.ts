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
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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
        return res.status(404).json({ message: "File not found" });
      }

      const file = result[0];

      // Check if user has access to this file
      if (file.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!fs.existsSync(file.path)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      // Update download count
      try {
        await db
          .update(files)
          .set({ downloadCount: (file.downloadCount ?? 0) + 1 })
          .where(eq(files.id, fileId))
          .execute();
      } catch (updateError) {
        console.error(`Error updating download count for file ${fileId}:`, updateError);
      }

      // Set headers for file download
      res.setHeader('Content-Type', file.type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);

      // Stream the file
      const fileStream = fs.createReadStream(file.path);
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

      const validFiles = selectedFiles.filter(file => fs.existsSync(file.path));

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
        archive.file(file.path, { name: file.name });
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

      const content = fs.readFileSync(file.path, 'utf8');
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

  // Modified file upload endpoint to include new metrics
  app.post("/api/files", requireAuth, upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const fileData = {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        path: req.file.path,
        status: 'uploaded',
        userId: req.user!.id,
        companyId: req.user!.companyId,
        downloadCount: 0,
        uniqueViewers: 0,
        accessLevel: 'private',
        classificationType: 'internal',
        retentionPeriod: 365, // Default 1 year retention
        storageLocation: 'hot-storage',
        encryptionStatus: false,
        version: 1,
      };

      const [file] = await db.insert(files)
        .values(fileData)
        .returning();

      res.status(201).json(file);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Error uploading file" });
    }
  });

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
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
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