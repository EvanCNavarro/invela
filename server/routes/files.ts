import { db } from "@db";
import { files } from "@db/schema";
import { eq } from "drizzle-orm";
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileUpload } from '../middleware/upload';

const router = Router();
const uploadDir = path.join(process.cwd(), 'uploads');

// File upload endpoint
router.post('/api/files', (req, res) => {
  console.log('[Files] Starting PDF upload request:', {
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length']
  });

  fileUpload.single('file')(req, res, async (err) => {
    try {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        console.error('[Files] Multer error:', err);
        return res.status(400).json({
          error: 'PDF upload error',
          detail: err.code === 'LIMIT_FILE_SIZE' 
            ? 'File size exceeds 50MB limit. Please compress your PDF or split it into smaller files.'
            : err.code === 'LIMIT_UNEXPECTED_FILE'
            ? 'Please ensure you are uploading a file with the field name "file"'
            : err.message,
          code: err.code,
          field: err.field,
          suggestions: [
            'Try compressing your PDF file',
            'Check if the file is not corrupted',
            'Ensure you\'re using the correct form field name (file)',
            'Clear your browser cache and try again'
          ]
        });
      }

      // Handle other errors from multer
      if (err) {
        console.error('[Files] Upload middleware error:', err);
        console.log('[Files] Error details:', err.stack);
        return res.status(400).json({
          error: 'Upload failed',
          detail: err.message,
          suggestions: [
            'Check if the file is a valid PDF',
            'Ensure the file has a .pdf extension',
            'Try uploading a different PDF file',
            'Make sure you have a stable internet connection'
          ]
        });
      }

      // Check if file was provided
      if (!req.file) {
        console.error('[Files] No file received');
        return res.status(400).json({
          error: 'No file uploaded',
          detail: 'Request must include a PDF file',
          suggestions: [
            'Select a PDF file before submitting',
            'Ensure your browser supports file uploads',
            'Try using a different browser'
          ]
        });
      }

      console.log('[Files] PDF file received:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      // Verify authentication
      if (!req.user?.id || !req.user?.company_id) {
        console.error('[Files] Authentication required');
        return res.status(401).json({
          error: 'Authentication required',
          detail: 'User must be logged in to upload files',
          suggestions: [
            'Please log in again',
            'Check if your session has expired',
            'Clear your browser cookies and try logging in again'
          ]
        });
      }

      // Verify file exists on disk
      const uploadedFilePath = path.join(uploadDir, req.file.filename);
      if (!fs.existsSync(uploadedFilePath)) {
        console.error('[Files] File not saved to disk:', uploadedFilePath);
        return res.status(500).json({
          error: 'File processing error',
          detail: 'Failed to save PDF file to server',
          suggestions: [
            'Try uploading the file again',
            'Check if the file is not locked or in use',
            'Ensure the PDF is not password protected'
          ]
        });
      }

      try {
        // Create database record - using only existing columns from schema
        console.log('[Files] Creating database record for:', req.file.originalname);
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
            version: 1,
            upload_time: new Date()
          })
          .returning();

        console.log('[Files] Created database record:', {
          id: fileRecord.id,
          name: fileRecord.name,
          type: fileRecord.type
        });

        res.status(201).json(fileRecord);
      } catch (dbError) {
        console.error('[Files] Database error:', dbError);
        console.log('[Files] Database error details:', dbError.stack);

        // Clean up uploaded file if database operation fails
        try {
          fs.unlinkSync(uploadedFilePath);
          console.log('[Files] Cleaned up file after database error:', uploadedFilePath);
        } catch (cleanupError) {
          console.error('[Files] Error cleaning up file:', cleanupError);
        }

        throw dbError;
      }
    } catch (error) {
      console.error('[Files] Server error:', error);
      console.log('[Files] Server error details:', error.stack);

      // Clean up uploaded file if request fails
      if (req.file) {
        const filePath = path.join(uploadDir, req.file.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log('[Files] Cleaned up file after error:', filePath);
          } catch (cleanupError) {
            console.error('[Files] Error cleaning up file:', cleanupError);
          }
        }
      }

      res.status(500).json({
        error: 'Server error',
        detail: error instanceof Error ? error.message : 'Unknown error occurred',
        suggestions: [
          'Please try uploading again in a few minutes',
          'Check your internet connection',
          'If the problem persists, contact support'
        ]
      });
    }
  });
});

// Get all files for a company
router.get('/api/files', async (req, res) => {
  try {
    console.log('[Files] Starting file fetch request');

    const companyId = req.query.company_id;
    const userId = req.user?.id;

    if (!companyId) {
      return res.status(400).json({ 
        error: 'Company ID is required'
      });
    }

    const parsedCompanyId = parseInt(companyId.toString(), 10);
    if (isNaN(parsedCompanyId)) {
      return res.status(400).json({ 
        error: 'Invalid company ID format'
      });
    }

    // Verify user has access to this company
    if (req.user?.company_id !== parsedCompanyId) {
      return res.status(403).json({ 
        error: 'Access denied'
      });
    }

    const fileRecords = await db.query.files.findMany({
      where: eq(files.company_id, parsedCompanyId)
    });

    res.json(fileRecords);
  } catch (error) {
    console.error('[Files] Error in file fetch endpoint:', error);
    console.log('[Files] Error details:', error.stack); 
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
        console.log('[Files] Error details:', err.stack); 
        if (!res.headersSent) {
          res.status(500).json({ error: "Error downloading file" });
        }
      }
    });
  } catch (error) {
    console.error("[Files] Error in download endpoint:", error);
    console.log('[Files] Error details:', error.stack); 
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;