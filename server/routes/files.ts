import { db } from "@db";
import { files } from "@db/schema";
import { eq } from "drizzle-orm";
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { documentUpload } from '../middleware/upload';
import multer from 'multer';
import { classifyDocument } from '../services/openai';
import { broadcastDocumentCountUpdate, broadcastClassificationUpdate } from '../services/websocket';
import { extractTextFromFirstPages } from '../services/pdf';

const router = Router();
const uploadDir = path.join(process.cwd(), 'uploads', 'documents');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File upload endpoint
router.post('/api/files', documentUpload.single('file'), async (req, res) => {
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

    // Read only first few pages for classification
    const filePath = path.join(uploadDir, req.file.filename);
    let fileContent: string;

    try {
      if (req.file.mimetype === 'application/pdf') {
        console.log('[Files] Processing PDF file, extracting first pages');
        fileContent = await extractTextFromFirstPages(filePath, 3);
      } else {
        console.log('[Files] Processing non-PDF file');
        fileContent = fs.readFileSync(filePath, 'utf8');
      }
    } catch (error) {
      console.error('[Files] Error reading file:', error);
      throw new Error('Failed to read uploaded file');
    }

    console.log('[Files] Starting document classification');
    const classification = await classifyDocument(fileContent);
    console.log('[Files] Classification result:', {
      category: classification.category,
      confidence: classification.confidence,
      reasoning: classification.reasoning
    });

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
        created_at: new Date(),
        updated_at: new Date(),
        upload_time: new Date(),
        download_count: 0,
        version: 1
      })
      .returning();

    console.log('[Files] Created file record:', {
      id: fileRecord.id,
      name: fileRecord.name,
      status: fileRecord.status
    });

    // Broadcast document count update
    if (classification.confidence >= 0.9) {
      broadcastDocumentCountUpdate({
        type: 'COUNT_UPDATE',
        category: classification.category,
        count: 1,
        companyId: req.user.company_id.toString()
      });
    }

    // Broadcast classification update
    broadcastClassificationUpdate({
      type: 'CLASSIFICATION_UPDATE',
      fileId: fileRecord.id.toString(),
      category: classification.category,
      confidence: classification.confidence
    });

    res.status(201).json(fileRecord);
  } catch (error) {
    console.error('[Files] Error processing upload:', error);

    // Clean up uploaded file if operation fails
    if (req.file) {
      const filePath = path.join(uploadDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Enhanced error handling
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File too large',
          detail: 'Maximum file size is 50MB'
        });
      }
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

    const companyId = req.query.company_id;
    const userId = req.user?.id;

    console.log('[Files] Request parameters:', {
      companyId,
      userId,
      query: req.query,
      user: req.user
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

    // Remove any status filter to show all files including those created by KYB
    const fileRecords = await db.query.files.findMany({
      where: eq(files.company_id, parsedCompanyId),
      orderBy: (files, { desc }) => [desc(files.created_at)]
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