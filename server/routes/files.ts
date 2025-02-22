import { db } from "@db";
import { files } from "@db/schema";
import { eq } from "drizzle-orm";
import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();
const uploadDir = path.join(process.cwd(), 'uploads');

// Get all files for a company
router.get('/api/files', async (req, res) => {
  try {
    console.log('[Files] Starting file fetch request');
    const companyId = req.query.company_id;
    const userId = req.user?.id;

    console.log('[Files] Request parameters:', {
      companyId,
      userId,
      query: req.query
    });

    if (!companyId) {
      console.log('[Files] Missing company_id parameter');
      return res.status(400).json({ error: 'Company ID is required' });
    }

    console.log('[Files] Executing database query for company:', companyId);
    const fileRecords = await db.query.files.findMany({
      where: eq(files.company_id, parseInt(companyId.toString()))
    });

    console.log('[Files] Raw file records from database:', fileRecords);

    // Transform file records to handle both physical files and JSON content
    const transformedFiles = fileRecords.map(file => {
      console.log('[Files] Processing file record:', {
        id: file.id,
        name: file.name,
        type: file.type,
        path: file.path?.substring(0, 50) + '...' // Truncate long paths
      });

      let fileSize = file.size;

      // For JSON content stored directly in path, calculate size from content
      if (file.type === 'application/json' && file.path && file.path.startsWith('{')) {
        fileSize = Buffer.from(file.path).length;
        console.log('[Files] Calculated JSON content size:', {
          fileId: file.id,
          fileName: file.name,
          calculatedSize: fileSize
        });
      } else {
        // For physical files, verify they exist
        const filePath = path.join(uploadDir, file.path);
        const fileExists = fs.existsSync(filePath);
        console.log('[Files] Physical file check:', {
          fileId: file.id,
          fileName: file.name,
          path: filePath,
          exists: fileExists
        });
      }

      return {
        ...file,
        size: fileSize,
        // Ensure consistent status
        status: file.status || 'uploaded'
      };
    });

    console.log('[Files] Transformed files:', transformedFiles.map(f => ({
      id: f.id,
      name: f.name,
      size: f.size,
      status: f.status
    })));

    res.json(transformedFiles);
  } catch (error) {
    console.error('[Files] Error fetching files:', {
      error,
      stack: error.stack,
      message: error.message
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download endpoint
router.get("/files/:id/download", async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    console.log('[Files] Download request for file:', fileId);

    const fileRecord = await db.query.files.findFirst({
      where: eq(files.id, fileId)
    });

    console.log('[Files] Found file record:', fileRecord);

    if (!fileRecord) {
      console.log('[Files] File not found:', fileId);
      return res.status(404).json({ error: "File not found" });
    }

    // Handle JSON content stored directly in path
    if (fileRecord.type === 'application/json' && fileRecord.path && fileRecord.path.startsWith('{')) {
      console.log('[Files] Serving JSON content file:', {
        fileId,
        fileName: fileRecord.name,
        contentLength: fileRecord.path.length
      });

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${fileRecord.name}`);
      return res.send(fileRecord.path);
    }

    const filePath = path.join(uploadDir, fileRecord.path);
    console.log('[Files] Physical file path:', {
      fileId,
      filePath,
      exists: fs.existsSync(filePath)
    });

    // Update download count before sending file
    await db
      .update(files)
      .set({
        download_count: (fileRecord.download_count || 0) + 1,
        last_accessed: new Date().toISOString()
      })
      .where(eq(files.id, fileId));

    // Send physical file
    res.download(
      filePath,
      fileRecord.name,
      (err) => {
        if (err) {
          console.error("[Files] Error downloading file:", {
            error: err,
            stack: err.stack,
            fileId,
            filePath
          });
          res.status(500).json({ error: "Error downloading file" });
        } else {
          console.log('[Files] File downloaded successfully:', {
            fileId,
            fileName: fileRecord.name
          });
        }
      }
    );
  } catch (error) {
    console.error("[Files] Error in download endpoint:", {
      error,
      stack: error.stack,
      message: error.message
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;