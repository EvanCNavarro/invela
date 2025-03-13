import { db } from "@db";
import { files } from "@db/schema";
import { eq } from "drizzle-orm";
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

const router = Router();
const uploadDir = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists with proper permissions
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
    console.log('[Files] Created upload directory:', uploadDir);
  } catch (error) {
    console.error('[Files] Error creating upload directory:', error);
    throw error;
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('[Files] Processing file upload:', {
      directory: uploadDir,
      filename: file.originalname,
      mimetype: file.mimetype
    });

    if (!fs.existsSync(uploadDir)) {
      const error = new Error(`Upload directory ${uploadDir} does not exist`);
      console.error('[Files] Upload directory error:', error);
      return cb(error, uploadDir);
    }

    try {
      fs.accessSync(uploadDir, fs.constants.W_OK);
      cb(null, uploadDir);
    } catch (error) {
      console.error('[Files] Directory access error:', error);
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const ext = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;
    console.log('[Files] Generated filename:', filename);
    cb(null, filename);
  }
});

// File filter configuration
const fileFilter = (req: any, file: any, cb: any) => {
  console.log('[Files] Checking file:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  // Accept PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
    return;
  } 
  // Accept common document formats
  else if (
    ['application/msword', 
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'application/vnd.oasis.opendocument.text',
     'text/plain'].includes(file.mimetype)
  ) {
    cb(null, true);
    return;
  }
  // Accept image formats
  else if (file.mimetype.startsWith('image/')) {
    cb(null, true);
    return;
  }

  cb(new Error(`File type ${file.mimetype} not supported`));
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// File upload endpoint
router.post('/api/files', upload.single('file'), async (req, res) => {
  try {
    console.log('[Files] Processing file upload request');

    if (!req.file) {
      console.log('[Files] No file received in request');
      return res.status(400).json({ 
        error: 'No file uploaded',
        detail: 'Request must include a file'
      });
    }

    console.log('[Files] File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename
    });

    if (!req.user?.id || !req.user?.company_id) {
      console.log('[Files] Authentication required');
      return res.status(401).json({ 
        error: 'Authentication required',
        detail: 'User must be logged in to upload files'
      });
    }

    // Create file record in database
    const [fileRecord] = await db.insert(files)
      .values({
        name: req.file.originalname,
        path: req.file.filename,
        type: req.file.mimetype,
        size: req.file.size,
        user_id: req.user.id,
        company_id: req.user.company_id,
        status: 'uploaded',
        download_count: 0,
        version: 1
      })
      .returning();

    console.log('[Files] Created file record:', {
      id: fileRecord.id,
      name: fileRecord.name,
      size: fileRecord.size
    });

    res.status(201).json(fileRecord);
  } catch (error) {
    console.error('[Files] Error processing upload:', error);

    // Clean up uploaded file if database operation fails
    if (req.file) {
      const filePath = path.join(uploadDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Send appropriate error response
    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        error: 'File upload error',
        detail: error.message
      });
    }

    res.status(500).json({ 
      error: 'Upload failed',
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Get all files for a company
router.get('/api/files', async (req, res) => {
  try {
    console.log('[Files] Starting file fetch request');
    console.log('[Files] Authentication state:', {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      sessionID: req.sessionID
    });

    const companyId = req.query.company_id;
    const userId = req.user?.id;

    console.log('[Files] Request parameters:', {
      companyId,
      userId,
      query: req.query,
      user: req.user,
      headers: req.headers
    });

    if (!companyId) {
      console.log('[Files] Missing company_id parameter');
      return res.status(400).json({ 
        error: 'Company ID is required',
        detail: 'The company_id query parameter must be provided'
      });
    }

    if (typeof companyId !== 'string' && typeof companyId !== 'number') {
      console.log('[Files] Invalid company_id type:', typeof companyId);
      return res.status(400).json({ 
        error: 'Invalid company ID format',
        detail: `Expected string or number, got ${typeof companyId}`
      });
    }

    const parsedCompanyId = parseInt(companyId.toString(), 10);
    if (isNaN(parsedCompanyId)) {
      console.log('[Files] Failed to parse company_id:', companyId);
      return res.status(400).json({ 
        error: 'Invalid company ID format',
        detail: 'Company ID must be a valid number'
      });
    }

    // Verify user has access to this company
    if (req.user?.company_id !== parsedCompanyId) {
      console.log('[Files] Company ID mismatch:', {
        requestedCompanyId: parsedCompanyId,
        userCompanyId: req.user?.company_id
      });
      return res.status(403).json({ 
        error: 'Access denied',
        detail: 'User does not have access to this company\'s files'
      });
    }

    console.log('[Files] Executing database query for company:', parsedCompanyId);
    const fileRecords = await db.query.files.findMany({
      where: eq(files.company_id, parsedCompanyId)
    });

    console.log('[Files] Query results:', {
      recordCount: fileRecords.length,
      firstRecord: fileRecords[0],
      lastRecord: fileRecords[fileRecords.length - 1]
    });

    res.json(fileRecords);
  } catch (error) {
    console.error('[Files] Error in file fetch endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Download endpoint
router.get("/api/files/:id/download", async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    console.log('[Files] Download request for file:', fileId);

    const [fileRecord] = await db.select()
      .from(files)
      .where(eq(files.id, fileId));

    if (!fileRecord) {
      console.log('[Files] File not found:', fileId);
      return res.status(404).json({ error: "File not found" });
    }

    const filePath = path.join(uploadDir, fileRecord.path);
    console.log('[Files] Physical file path:', filePath);

    if (!fs.existsSync(filePath)) {
      console.error('[Files] File missing from disk:', filePath);
      return res.status(404).json({ error: "File not found on disk" });
    }

    // Update download count
    await db.update(files)
      .set({ download_count: (fileRecord.download_count || 0) + 1 })
      .where(eq(files.id, fileId));

    res.download(filePath, fileRecord.name, (err) => {
      if (err) {
        console.error("[Files] Error downloading file:", {
          error: err,
          fileId,
          filePath
        });
        if (!res.headersSent) {
          res.status(500).json({ error: "Error downloading file" });
        }
      }
    });
  } catch (error) {
    console.error("[Files] Error in download endpoint:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;