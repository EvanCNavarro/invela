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
import { analyzeDocument } from '../services/openai';
import { createDocumentChunks, processChunk } from '../services/documentChunking';

// Ensure upload directory exists
const router = Router();
const uploadDir = path.join(process.cwd(), 'uploads', 'documents');

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


// New endpoints for document processing
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

    const [fileRecord] = await db.select()
      .from(files)
      .where(eq(files.id, fileId));

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

      // Store fields and chunk info in metadata
      await db.update(files)
        .set({ 
          metadata: { 
            ...fileRecord.metadata,
            processing_fields: fields,
            chunks_total: chunks.length,
            chunks_processed: 0,
            answers: []
          },
          status: 'processing'
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

            if (result.answers?.length) {
              answersFound += result.answers.length;

              // Update metadata with new answers and progress
              await db.update(files)
                .set({ 
                  metadata: {
                    ...fileRecord.metadata,
                    chunks_processed: processedChunks,
                    answers: [...(fileRecord.metadata?.answers || []), ...result.answers],
                    answers_found: answersFound
                  }
                })
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

        // Mark processing as complete
        await db.update(files)
          .set({ 
            status: 'processed',
            metadata: {
              ...fileRecord.metadata,
              processing_completed: new Date().toISOString(),
              chunks_processed: chunks.length,
              answers_found: answersFound
            }
          })
          .where(eq(files.id, fileId));

      })().catch(error => {
        console.error('[Document Processing] Background processing error:', {
          fileId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
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

router.get("/api/documents/:id/progress", async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    const [fileRecord] = await db.select()
      .from(files)
      .where(eq(files.id, fileId));

    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
    }

    // For now, simulate progress
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

router.get("/api/documents/:id/results", async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    const [fileRecord] = await db.select()
      .from(files)
      .where(eq(files.id, fileId));

    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
    }

    // For now, return simulated results
    const metadata = fileRecord.metadata || {};
    const answers = metadata.answers || [];

    res.json({
      status: 'completed',
      answers,
      answersFound: answers.length
    });

    // Update file status to processed
    await db.update(files)
      .set({ 
        status: 'processed',
        metadata: {
          ...metadata,
          processing_completed: new Date().toISOString()
        }
      })
      .where(eq(files.id, fileId));

  } catch (error) {
    console.error('[Document Processing] Results fetch error:', error);
    res.status(500).json({ error: "Failed to get results" });
  }
});

export default router;