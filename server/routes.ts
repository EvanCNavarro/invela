import type { Express, Request, Response, NextFunction } from "express";
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
import { eq, and } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";

// Add back the requireAuth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

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

// Function to generate text preview
async function generateTextPreview(filePath: string, maxLength: number = 1000): Promise<string> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content.slice(0, maxLength);
  } catch (error) {
    console.error('Error generating text preview:', error);
    return '';
  }
}

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

export function registerRoutes(app: Express): Server {
  setupAuth(app);

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

  // File routes
  app.post("/api/files", requireAuth, upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      let preview = '';
      // Generate preview for text files
      if (req.file.mimetype === 'text/plain' || req.file.mimetype === 'text/csv') {
        preview = await generateTextPreview(req.file.path);
      }

      const fileData = {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        path: req.file.path,
        status: 'uploaded',
        userId: req.user!.id,
        companyId: req.user!.companyId,
        preview: preview || undefined,
        accessLevel: 'private',
        classificationType: 'internal',
        encryptionStatus: false,
        retentionPeriod: 365, // Default 1 year retention
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

  // Add preview endpoint
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

      if (!file.preview && (file.type === 'text/plain' || file.type === 'text/csv')) {
        const preview = await generateTextPreview(file.path);
        // Update the file with the preview
        await db.update(files)
          .set({ preview })
          .where(eq(files.id, file.id));

        return res.json({ preview });
      }

      res.json({ preview: file.preview || '' });
    } catch (error) {
      console.error("Error fetching file preview:", error);
      res.status(500).json({ message: "Error fetching file preview" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}