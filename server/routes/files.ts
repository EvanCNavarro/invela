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
    const companyId = req.query.company_id;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const fileRecords = await db.query.files.findMany({
      where: eq(files.company_id, parseInt(companyId.toString()))
    });

    // Transform file records to handle both physical files and JSON content
    const transformedFiles = fileRecords.map(file => {
      let fileSize = file.size;

      // For JSON content stored directly in path, calculate size from content
      if (file.type === 'application/json' && file.path && file.path.startsWith('{')) {
        fileSize = Buffer.from(file.path).length;
      }

      return {
        ...file,
        size: fileSize,
        // Ensure consistent status
        status: file.status || 'uploaded'
      };
    });

    res.json(transformedFiles);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download endpoint
router.get("/files/:id/download", async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const fileRecord = await db.query.files.findFirst({
      where: eq(files.id, fileId)
    });

    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
    }

    // Handle JSON content stored directly in path
    if (fileRecord.type === 'application/json' && fileRecord.path && fileRecord.path.startsWith('{')) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${fileRecord.name}`);
      return res.send(fileRecord.path);
    }

    // Update download count before sending file
    await db
      .update(files)
      .set({
        downloadCount: (fileRecord.downloadCount || 0) + 1,
        lastAccessed: new Date().toISOString()
      })
      .where(eq(files.id, fileId));

    // Send physical file
    res.download(
      path.join(uploadDir, fileRecord.path),
      fileRecord.name,
      (err) => {
        if (err) {
          console.error("Error downloading file:", err);
          res.status(500).json({ error: "Error downloading file" });
        }
      }
    );
  } catch (error) {
    console.error("Error in download endpoint:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;