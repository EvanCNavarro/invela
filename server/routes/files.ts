import { Router } from 'express';
import { db } from "@db";
import { files, DocumentCategory } from "@db/schema";
import { eq } from "drizzle-orm";
import path from 'path';
import fs from 'fs';
import { documentUpload } from '../middleware/upload';
import multer from 'multer';
import { createDocumentChunks, processChunk } from '../services/documentChunking';
import { broadcastDocumentCountUpdate, broadcastUploadProgress, broadcastTaskUpdate } from '../services/websocket';

// Ensure upload directory exists
const router = Router();
const uploadDir = path.join(process.cwd(), 'uploads', 'documents');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function detectDocumentCategory(filename: string): DocumentCategory {
  const lowerFilename = filename.toLowerCase();
  let category: DocumentCategory;

  // Improved detection patterns with comprehensive checks
  if (lowerFilename.includes('soc2') || lowerFilename.includes('soc 2') || lowerFilename.includes('soc-2')) {
    category = DocumentCategory.SOC2_AUDIT;
  } else if (lowerFilename.includes('iso27001') || lowerFilename.includes('iso 27001') || lowerFilename.includes('iso-27001')) {
    category = DocumentCategory.ISO27001_CERT;
  } else if (lowerFilename.includes('pentest') || lowerFilename.includes('pen test') || lowerFilename.includes('pen-test') ||
             lowerFilename.includes('penetration test') || lowerFilename.includes('security test')) {
    category = DocumentCategory.PENTEST_REPORT;
  } else if (lowerFilename.includes('business continuity') || lowerFilename.includes('continuity plan') || 
             lowerFilename.includes('business-continuity') || lowerFilename.includes('disaster recovery') ||
             lowerFilename.includes('bcp ')) {
    category = DocumentCategory.BUSINESS_CONTINUITY;
  } else {
    category = DocumentCategory.OTHER;
  }

  // Add detailed logging
  console.log('[Files] Document category detection:', {
    filename: filename,
    lowerFilename: lowerFilename,
    detectedCategory: category,
    timestamp: new Date().toISOString()
  });

  return category;
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

    // Broadcast upload start immediately
    broadcastUploadProgress({
      type: 'UPLOAD_PROGRESS',
      fileId: null,
      fileName: req.file.originalname,
      status: 'uploading',
      progress: 0
    });

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

    // Detect document category
    const documentCategory = detectDocumentCategory(req.file.originalname);
    console.log('[Files] Detected category:', documentCategory);

    // Create file record in database with initial metadata
    const [fileRecord] = await db.insert(files)
      .values({
        name: req.file.originalname,
        path: req.file.filename,
        type: req.file.mimetype,
        size: req.file.size,
        user_id: req.user.id,
        company_id: req.user.company_id,
        status: 'uploaded',
        document_category: documentCategory,
        created_at: new Date(),
        updated_at: new Date(),
        upload_time: new Date(),
        download_count: 0,
        version: 1,
        metadata: {
          answers: [],
          chunks_processed: 0,
          chunks_total: 0,
          processing_fields: []
        }
      })
      .returning();

    console.log('[Files] Created file record:', {
      id: fileRecord.id,
      name: fileRecord.name,
      status: fileRecord.status,
      category: documentCategory
    });

    // Broadcast upload complete
    broadcastUploadProgress({
      type: 'UPLOAD_PROGRESS',
      fileId: fileRecord.id,
      fileName: fileRecord.name,
      status: 'uploaded',
      progress: 100
    });

    // Broadcast document count update
    broadcastDocumentCountUpdate({
      type: 'COUNT_UPDATE',
      category: documentCategory,
      count: 1,
      companyId: req.user.company_id.toString()
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

    // Broadcast upload error
    if (req.file) {
      broadcastUploadProgress({
        type: 'UPLOAD_PROGRESS',
        fileId: null,
        fileName: req.file.originalname,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

// Process document endpoint
router.post("/api/documents/:id/process", async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const { fields } = req.body;

    if (!fields?.length) {
      return res.status(400).json({ 
        error: "No fields provided for processing",
        detail: "Field list is required"
      });
    }

    // Get file record
    const fileRecord = await db.query.files.findFirst({
      where: eq(files.id, fileId)
    });

    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
    }

    // Get file content and create chunks
    const filePath = path.join(uploadDir, fileRecord.path);

    console.log('[Document Processing] Creating chunks for file:', {
      fileId,
      fileName: fileRecord.name,
      mimeType: fileRecord.type,
      timestamp: new Date().toISOString()
    });

    try {
      const chunks = await createDocumentChunks(filePath, fileRecord.type);

      // Initialize processing metadata
      const processingMetadata = {
        processing_fields: fields,
        chunks_total: chunks.length,
        chunks_processed: 0,
        answers: [],
        processing_started: new Date().toISOString()
      };

      // Update file status and metadata
      await db.update(files)
        .set({ 
          status: 'processing',
          metadata: processingMetadata
        })
        .where(eq(files.id, fileId));

      res.json({ 
        status: 'processing',
        totalChunks: chunks.length
      });

      // Start processing chunks in background
      (async () => {
        let answersFound = 0;
        let processedChunks = 0;

        for (const chunk of chunks) {
          try {
            console.log('[Document Processing] Processing chunk:', {
              fileId,
              chunkIndex: chunk.index,
              progress: `${processedChunks + 1}/${chunks.length}`,
              timestamp: new Date().toISOString()
            });

            const result = await processChunk(chunk, fields);
            processedChunks++;

            // Broadcast progress update
            broadcastTaskUpdate({
              id: fileId,
              status: 'processing',
              progress: (processedChunks / chunks.length) * 100,
              metadata: {
                chunksProcessed: processedChunks,
                totalChunks: chunks.length,
                answersFound
              }
            });

            if (result.answers?.length) {
              answersFound += result.answers.length;

              // Get current metadata
              const currentFile = await db.query.files.findFirst({
                where: eq(files.id, fileId)
              });

              if (!currentFile) {
                throw new Error('File record not found');
              }

              const currentMetadata = currentFile.metadata || {};
              const updatedMetadata = {
                ...currentMetadata,
                chunks_processed: processedChunks,
                answers: [...(currentMetadata.answers || []), ...result.answers],
                answers_found: answersFound
              };

              // Update metadata
              await db.update(files)
                .set({ metadata: updatedMetadata })
                .where(eq(files.id, fileId));
            }

            // Short delay between chunks to prevent overloading
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            console.error('[Document Processing] Chunk processing error:', {
              fileId,
              chunkIndex: chunk.index,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            });
          }
        }

        // Get final metadata state
        const finalFile = await db.query.files.findFirst({
          where: eq(files.id, fileId)
        });

        if (!finalFile) {
          throw new Error('File record not found');
        }

        const finalMetadata = {
          ...(finalFile.metadata || {}),
          processing_completed: new Date().toISOString(),
          chunks_processed: chunks.length,
          answers_found: answersFound
        };

        // Mark processing as complete
        await db.update(files)
          .set({ 
            status: 'processed',
            metadata: finalMetadata
          })
          .where(eq(files.id, fileId));

        // Broadcast completion
        broadcastTaskUpdate({
          id: fileId,
          status: 'completed',
          progress: 100,
          metadata: {
            chunksProcessed: chunks.length,
            totalChunks: chunks.length,
            answersFound,
            completedAt: new Date().toISOString()
          }
        });

      })().catch(error => {
        console.error('[Document Processing] Background processing error:', {
          fileId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });

        // Broadcast error
        broadcastTaskUpdate({
          id: fileId,
          status: 'error',
          progress: 0,
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      });

    } catch (error) {
      console.error('[Document Processing] Chunk creation error:', {
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }

  } catch (error) {
    console.error('[Document Processing] Process initiation error:', error);
    res.status(500).json({ error: "Failed to start processing" });
  }
});

// Progress check endpoint
router.get("/api/documents/:id/progress", async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    const fileRecord = await db.query.files.findFirst({
      where: eq(files.id, fileId)
    });

    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
    }

    const metadata = fileRecord.metadata || {};
    const chunksTotal = metadata.chunks_total || 1;
    const chunksProcessed = metadata.chunks_processed || 0;
    const answersFound = metadata.answers_found || 0;

    res.json({
      status: fileRecord.status,
      progress: {
        chunksProcessed,
        totalChunks: chunksTotal
      },
      answersFound
    });
  } catch (error) {
    console.error('[Document Processing] Progress check error:', error);
    res.status(500).json({ error: "Failed to check progress" });
  }
});

// Results endpoint
router.get("/api/documents/:id/results", async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    const fileRecord = await db.query.files.findFirst({
      where: eq(files.id, fileId)
    });

    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
    }

    const metadata = fileRecord.metadata || {};
    const answers = metadata.answers || [];

    res.json({
      status: fileRecord.status,
      answers,
      answersFound: answers.length
    });

  } catch (error) {
    console.error('[Document Processing] Results fetch error:', error);
    res.status(500).json({ error: "Failed to get results" });
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

    // Query files for the company
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

    const fileRecord = await db.query.files.findFirst({
      where: eq(files.id, fileId)
    });

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