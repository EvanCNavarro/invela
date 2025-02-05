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