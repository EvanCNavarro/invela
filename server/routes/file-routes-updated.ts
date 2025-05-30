import { Router } from 'express';
import { db } from "@db";
import { files, companies } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import path from 'path';
import fs from 'fs';
import { documentUpload } from '../middleware/upload';
import multer from 'multer';
import { createDocumentChunks, processChunk } from '../services/documentChunking';
import { broadcastDocumentCountUpdate } from '../utils/unified-websocket';
import { aggregateAnswers } from '../services/answerAggregation';
import { FileCreationService } from '../services/file-creation';
import { FileDetectionService } from '../services/file-detection';

// Helper function to get company name from ID
async function getCompanyName(companyId: number): Promise<string> {
  try {
    const [company] = await db.select({
      name: companies.name
    })
    .from(companies)
    .where(eq(companies.id, companyId));
    
    return company?.name || 'Company';
  } catch (error) {
    console.error('[Files] Error getting company name:', error);
    return 'Company';
  }
}

// Define interfaces for type safety
interface Field {
  field_key: string;
  question: string;
  [key: string]: any; // For any additional properties
}

interface ProcessingField {
  field_key: string;
  question: string;
}

// Create router instance first
const router = Router();

// ... existing processDocument function and other utility functions ...

// Add routes for file handling
router.get('/api/files/:id/download', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const format = req.query.format as string || 'csv'; // Default to CSV
    
    console.log(`[Files] Processing download request for file ${fileId} in ${format} format`);
    
    // Lookup file in database
    const fileRecord = await db.query.files.findFirst({
      where: eq(files.id, fileId)
    });
    
    if (!fileRecord) {
      console.log(`[Files] File with ID ${fileId} not found`);
      return res.status(404).json({ error: "File not found" });
    }
    
    // Map requested format to content type
    const contentTypes = {
      'csv': 'text/csv',
      'txt': 'text/plain',
      'json': 'application/json',
      'pdf': 'application/pdf',
    };
    
    res.setHeader('Content-Type', contentTypes[format] || 'text/csv');
    
    // Use the FileDetectionService to determine assessment type
    const detection = FileDetectionService.detectAssessmentType(
      fileRecord.name,
      fileRecord.path
    );
    
    // Set appropriate task type using the detection result
    let taskType;
    if (detection.isKyb) {
      taskType = 'kyb';
    } else if (detection.isKy3p) {
      taskType = 'ky3p';
    } else if (detection.isOpenBanking) {
      taskType = 'open_banking';
    } else if (detection.isCard) {
      taskType = 'card';
    } else {
      taskType = 'form';
    }
    
    // Get task ID from query params, metadata, or default to 0
    const taskId = Number(req.query.taskId) || 
                  (fileRecord.metadata && fileRecord.metadata.taskId ? Number(fileRecord.metadata.taskId) : 0);
    
    // Get company name from file metadata or use a default
    const companyName = fileRecord.company_id ? await getCompanyName(fileRecord.company_id) : 'Company';
    
    // Generate standardized filename for download
    const filename = FileCreationService.generateStandardFileName({
      assessmentType: taskType,
      companyName,
      taskId,
      originalName: fileRecord.name,
      format
    });
    
    // Set Content-Disposition header with the filename
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Increment download count
    await db.update(files)
      .set({
        download_count: sql`${files.download_count} + 1`,
        last_downloaded: new Date()
      })
      .where(eq(files.id, fileId));
    
    // Check if file exists on disk
    if (fileRecord.path) {
      const filePath = path.join(process.cwd(), 'uploads', 'documents', fileRecord.path);
      
      if (fs.existsSync(filePath)) {
        // Stream file to response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        return;
      }
    }
    
    // If file not found on disk, send content directly if available
    if (fileRecord.content) {
      return res.send(fileRecord.content);
    }
    
    // Neither file path nor content available
    res.status(404).json({ error: "File content not available" });
    
  } catch (error) {
    console.error('[Files] Download error:', error);
    res.status(500).json({ 
      error: "Download failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ... Add other routes as needed ...

export default router;