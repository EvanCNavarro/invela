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
  if (lowerFilename.includes('soc2') || lowerFilename.includes('soc 2')) {
    return DocumentCategory.SOC2_AUDIT;
  }
  if (lowerFilename.includes('iso27001') || lowerFilename.includes('iso 27001')) {
    return DocumentCategory.ISO27001_CERT;
  }
  if (lowerFilename.includes('pentest') || lowerFilename.includes('pen test')) {
    return DocumentCategory.PENTEST_REPORT;
  }
  if (lowerFilename.includes('business continuity') || lowerFilename.includes('continuity plan')) {
    return DocumentCategory.BUSINESS_CONTINUITY;
  }
  return DocumentCategory.OTHER;
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
              const [currentFile] = await db.select()
                .from(files)
                .where(eq(files.id, fileId));

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
        const [finalFile] = await db.select()
          .from(files)
          .where(eq(files.id, fileId));

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

    const [fileRecord] = await db.select()
      .from(files)
      .where(eq(files.id, fileId));

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

    const [fileRecord] = await db.select()
      .from(files)
      .where(eq(files.id, fileId));

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

export default router;