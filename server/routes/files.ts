import { Router } from 'express';
import { db } from "@db";
import { files, companies } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import path from 'path';
import fs from 'fs';
import { documentUpload } from '../middleware/upload';
import multer from 'multer';
import { createDocumentChunks, processChunk } from '../services/documentChunking';
import { broadcastDocumentCountUpdate } from '../services/websocket';
import { aggregateAnswers } from '../services/answerAggregation';
import { FileCreationService } from '../services/file-creation';

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

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Process chunks in background
async function processDocument(
  fileId: number,
  chunks: any[],
  fields: Field[],
  metadata: any
) {
  let allAnswers: any[] = [];
  let aggregatedAnswers: any[] = [];

  try {
    console.log('[Document Processing] Starting document processing:', {
      fileId,
      totalChunks: chunks.length,
      timestamp: new Date().toISOString()
    });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log('[Document Processing] Processing chunk:', {
        fileId,
        chunkIndex: i,
        totalChunks: chunks.length,
        timestamp: new Date().toISOString()
      });

      try {
        const result = await processChunk(chunk, fields);

        if (result.answers?.length) {
          // Add new answers to collection
          allAnswers.push(...result.answers);

          // Update progress in database
          const updatedMetadata = {
            status: 'processing',
            fields,
            chunks: {
              total: chunks.length,
              processed: i + 1
            },
            answers: allAnswers,
            aggregatedAnswers,
            answersFound: aggregatedAnswers.length,
            timestamps: {
              started: metadata.timestamps.started,
              lastUpdate: new Date().toISOString()
            }
          };

          await db.update(files)
            .set({
              metadata: updatedMetadata
            })
            .where(eq(files.id, fileId));

          console.log('[Document Processing] Progress update:', {
            fileId,
            chunkIndex: i,
            answersFound: allAnswers.length,
            timestamp: new Date().toISOString()
          });

          // Every 5 chunks or on last chunk, aggregate answers
          if (i % 5 === 4 || i === chunks.length - 1) {
            aggregatedAnswers = await aggregateAnswers(allAnswers);

            const batchMetadata = {
              ...updatedMetadata,
              aggregatedAnswers,
              answersFound: aggregatedAnswers.length
            };

            await db.update(files)
              .set({
                metadata: batchMetadata
              })
              .where(eq(files.id, fileId));

            console.log('[Document Processing] Batch aggregation:', {
              fileId,
              chunkIndex: i,
              aggregatedAnswers: aggregatedAnswers.length,
              timestamp: new Date().toISOString()
            });
          }
        }

        // Short delay between chunks
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (chunkError) {
        console.error('[Document Processing] Individual chunk processing error:', {
          fileId,
          chunkIndex: i,
          error: chunkError instanceof Error ? chunkError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
        // Continue processing other chunks even if one fails
        continue;
      }
    }

    // Final aggregation and status update
    const finalAnswers = await aggregateAnswers(allAnswers);
    const finalMetadata = {
      status: 'completed',
      fields,
      chunks: {
        total: chunks.length,
        processed: chunks.length
      },
      answers: allAnswers,
      aggregatedAnswers: finalAnswers,
      answersFound: finalAnswers.length,
      timestamps: {
        started: metadata.timestamps.started,
        completed: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      }
    };

    await db.update(files)
      .set({
        status: 'processed',
        metadata: finalMetadata
      })
      .where(eq(files.id, fileId));

    console.log('[Document Processing] Processing completed:', {
      fileId,
      totalAnswers: allAnswers.length,
      aggregatedAnswers: finalAnswers.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Document Processing] Processing error:', {
      fileId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    // Update file status to error
    try {
      await db.update(files)
        .set({
          status: 'error',
          metadata: {
            ...metadata,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamps: {
              ...metadata.timestamps,
              error: new Date().toISOString()
            }
          }
        })
        .where(eq(files.id, fileId));
    } catch (updateError) {
      console.error('[Document Processing] Failed to update error status:', {
        fileId,
        error: updateError instanceof Error ? updateError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
    throw error;
  }
}

// Document category enum
// Import DocumentCategory from schema, but also define a local enum for internal use
import { DocumentCategory as DBDocumentCategory } from '@db/schema';

enum DocumentCategory {
  SOC2_AUDIT = 'soc2_audit',
  ISO27001_CERT = 'iso27001_cert',
  PENTEST_REPORT = 'pentest_report',
  BUSINESS_CONTINUITY = 'business_continuity',
  OTHER = 'other'
}

// Function to convert local enum to DB type
function toDBDocumentCategory(category: DocumentCategory): keyof typeof DBDocumentCategory {
  // Safer conversion by value matching
  switch(category) {
    case DocumentCategory.SOC2_AUDIT:
      return 'SOC2_AUDIT';
    case DocumentCategory.ISO27001_CERT:
      return 'ISO27001_CERT';  
    case DocumentCategory.PENTEST_REPORT:
      return 'PENTEST_REPORT';
    case DocumentCategory.BUSINESS_CONTINUITY:
      return 'BUSINESS_CONTINUITY';
    case DocumentCategory.OTHER:
    default:
      return 'OTHER';
  }
}

function detectDocumentCategory(filename: string): DocumentCategory {
  const lowerFilename = filename.toLowerCase();
  let category: DocumentCategory;

  // Improved detection patterns with comprehensive checks
  if (lowerFilename.includes('soc2') || lowerFilename.includes('soc 2') ||
      lowerFilename.includes('soc-2')) {
    category = DocumentCategory.SOC2_AUDIT;
  } else if (lowerFilename.includes('iso27001') || lowerFilename.includes('iso 27001') ||
            lowerFilename.includes('iso-27001')) {
    category = DocumentCategory.ISO27001_CERT;
  } else if (lowerFilename.includes('pentest') || lowerFilename.includes('pen test') ||
            lowerFilename.includes('pen-test') ||
            lowerFilename.includes('penetration test') ||
            lowerFilename.includes('security test') ||
            lowerFilename.includes('penetration-test') ||
            lowerFilename.includes('penetration_test')) {
    category = DocumentCategory.PENTEST_REPORT;
  } else if (lowerFilename.includes('spg-business-continuity-plan') ||
            lowerFilename.includes('business continuity') ||
            lowerFilename.includes('continuity plan') ||
            lowerFilename.includes('business-continuity') ||
            lowerFilename.includes('disaster recovery') ||
            lowerFilename.includes('business_continuity') ||
            lowerFilename.includes('bcp') ||
            (lowerFilename.includes('business') && lowerFilename.includes('continuity'))) {
    category = DocumentCategory.BUSINESS_CONTINUITY;
  } else {
    category = DocumentCategory.OTHER;
  }

  console.log('[Files] Document category detection:', {
    filename: filename,
    lowerFilename: lowerFilename,
    detectedCategory: category,
    timestamp: new Date().toISOString(),
    matches: {
      isSoc2: lowerFilename.includes('soc2') || lowerFilename.includes('soc 2'),
      isIso27001: lowerFilename.includes('iso27001') || lowerFilename.includes('iso 27001'),
      isPentest: lowerFilename.includes('pentest') || lowerFilename.includes('pen test'),
      isBusinessContinuity: lowerFilename.includes('business continuity') || lowerFilename.includes('continuity plan'),
      exactMatch: lowerFilename
    }
  });

  return category;
}

// Route handlers
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
        document_category: toDBDocumentCategory(documentCategory),
        created_at: new Date(),
        updated_at: new Date(),
        upload_time: new Date(),
        download_count: 0,
        version: 1,
        metadata: {
          answers: [],
          aggregatedAnswers: [],
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

// Update the process endpoint to use the new processing function
router.post("/api/documents/:id/process", async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const { fields } = req.body;

    // Validate fields structure
    if (!fields?.length) {
      console.log('[Document Processing] No fields provided');
      return res.status(400).json({ 
        error: "No fields provided for processing"
      });
    }

    // Validate field structure
    const invalidFields = fields.filter((field: Field) => 
      !field.field_key || 
      !field.question ||
      typeof field.field_key !== 'string' ||
      typeof field.question !== 'string'
    );

    if (invalidFields.length > 0) {
      console.log('[Document Processing] Invalid field structure:', {
        invalidFields,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        error: "Invalid field structure",
        detail: "Each field must have a field_key and question"
      });
    }

    console.log('[Document Processing] Processing request:', {
      fileId,
      fieldKeys: fields.map((f: Field) => f.field_key),
      timestamp: new Date().toISOString()
    });

    const fileRecord = await db.query.files.findFirst({
      where: eq(files.id, fileId)
    });

    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
    }

    const filePath = path.join(uploadDir, fileRecord.path);
    const chunks = await createDocumentChunks(filePath, fileRecord.type);

    // Initialize metadata with field information
    const initialMetadata = {
      status: 'processing',
      fields: fields.map((f: Field) => ({
        field_key: f.field_key,
        question: f.question
      })),
      chunks: {
        total: chunks.length,
        processed: 0
      },
      answers: [],
      aggregatedAnswers: [],
      answersFound: 0,
      timestamps: {
        started: new Date().toISOString(),
        lastUpdate: new Date().toISOString()
      }
    };

    await db.update(files)
      .set({
        status: 'processing',
        metadata: initialMetadata
      })
      .where(eq(files.id, fileId));

    // Send initial response
    res.json({
      status: 'processing',
      totalChunks: chunks.length,
      fields: fields.map((f: Field) => f.field_key)
    });

    // Start background processing
    processDocument(fileId, chunks, fields, initialMetadata).catch(error => {
      console.error('[Document Processing] Background processing error:', {
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    });

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

    const currentMetadata = fileRecord.metadata || {};
    const chunksTotal = currentMetadata.chunks?.total || 1;
    const chunksProcessed = currentMetadata.chunks?.processed || 0;
    const answersFound = currentMetadata.answersFound || 0;

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
    const aggregatedAnswers = metadata.aggregatedAnswers || [];

    res.json({
      status: fileRecord.status,
      answers: aggregatedAnswers,
      answersFound: aggregatedAnswers.length
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

    // Get pagination parameters with defaults
    const page = parseInt(req.query.page?.toString() || '1', 10) || 1;
    const pageSize = parseInt(req.query.pageSize?.toString() || '10', 10) || 10;
    const offset = (page - 1) * pageSize;
    
    // Get total count first (optimized query)
    const countResult = await db.select({ count: sql`count(*)` })
      .from(files)
      .where(eq(files.company_id, parsedCompanyId));
    
    const totalFiles = Number(countResult[0]?.count || 0);
    
    // Query files for the company with pagination
    const fileRecords = await db.query.files.findMany({
      where: eq(files.company_id, parsedCompanyId),
      orderBy: (files, { desc }) => [desc(files.created_at)],
      limit: pageSize,
      offset: offset
    });

    console.log('[Files] Query results:', {
      recordCount: fileRecords.length,
      totalFiles,
      page,
      pageSize,
      firstRecord: fileRecords[0],
      lastRecord: fileRecords[fileRecords.length - 1]
    });

    res.json({
      data: fileRecords,
      pagination: {
        page,
        pageSize,
        totalItems: totalFiles,
        totalPages: Math.ceil(totalFiles / pageSize)
      }
    });
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

    console.log('[Files] File found:', {
      id: fileRecord.id,
      name: fileRecord.name,
      type: fileRecord.type,
      size: fileRecord.size
    });

    // Update download count
    await db.update(files)
      .set({ download_count: (fileRecord.download_count || 0) + 1 })
      .where(eq(files.id, fileId));

    // Check if this is a KYB or KY3P form CSV file
    const isKybCsvFile = (fileRecord.name.toLowerCase().includes('kyb_form') || 
                          fileRecord.name.toLowerCase().includes('ky3p_security_assessment')) && 
                          fileRecord.type === 'text/csv';
    
    if (isKybCsvFile) {
      console.log('[Files] Handling KYB CSV file download');
      
      // For inline content (stored in the path field directly), use that as content
      if (fileRecord.path && fileRecord.path.includes(',')) {
        console.log('[Files] KYB CSV file content found in database path field');
        
        // For CSV files, set more specific headers for better browser handling
        res.setHeader('Content-Type', 'text/csv');
        
        // Use standardized filename format for download
        const taskType = fileRecord.name.toLowerCase().includes('kyb') ? 'KYB' : 'FORM';
        
        // Get task ID from query params, metadata, or default to 0
        const taskId = Number(req.query.taskId) || 
                      (fileRecord.metadata && fileRecord.metadata.taskId ? Number(fileRecord.metadata.taskId) : 0);
        
        // Get company name from file metadata or use a default
        const companyName = fileRecord.company_id ? await getCompanyName(fileRecord.company_id) : 'Company';
        
        // Create standardized filename
        const standardizedFilename = FileCreationService.generateStandardFileName(
          taskType, 
          taskId, 
          companyName,
          '1.0',
          'csv'
        );
        
        res.setHeader('Content-Disposition', `attachment; filename="${standardizedFilename}"`);
        
        // Parse and format the CSV content to include question numbers
        console.log('[Files] Processing CSV content from database');
        try {
          // Get original CSV content from database field
          let fileContent = fileRecord.path.replace('database:', '');
          
          console.log('[Files] CSV file content length:', fileContent.length);
          console.log('[Files] CSV first 50 chars:', fileContent.substring(0, 50));
          
          // Parse the existing CSV content - handles quotes and commas properly
          const parseCsvRow = (row) => {
            const result = [];
            let inQuotes = false;
            let currentValue = '';
            
            for (let i = 0; i < row.length; i++) {
              const char = row[i];
              
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(currentValue);
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            
            // Add the last value
            result.push(currentValue);
            return result;
          };
          
          const rows = fileContent.split('\n');
          const headers = parseCsvRow(rows[0]);
          const dataRows = rows.slice(1).map(row => parseCsvRow(row)).filter(row => row.length > 1);
          
          console.log('[Files] Found headers:', headers);
          console.log('[Files] Found data rows:', dataRows.length);
          
          // Check if Question Number column already exists
          const hasQuestionNumberColumn = headers.includes('Question Number');
          
          if (!hasQuestionNumberColumn) {
            console.log('[Files] Adding Question Number column to CSV');
            
            // Add Question Number to headers
            headers.unshift('Question Number');
            
            // Add question numbers to each data row
            dataRows.forEach((row, index) => {
              row.unshift(`${index + 1}`);
            });
            
            // Rebuild the CSV content with proper CSV escaping
            const escapeCell = (cell) => {
              if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                return `"${cell.replace(/"/g, '""')}"`;
              }
              return cell;
            };
            
            fileContent = [
              headers.map(h => escapeCell(h)).join(','),
              ...dataRows.map(row => row.map(cell => escapeCell(cell)).join(','))
            ].join('\n');
          }
          
          console.log('[Files] Successfully processed CSV with question numbers');
          return res.send(fileContent);
        } catch (processError) {
          console.error('[Files] Error processing CSV file:', processError);
          console.error(processError.stack);
          // If there's an error in processing, send the original content
          return res.send(fileRecord.path.replace('database:', ''));
        }
      }
      
      // Fall back to file lookup if path doesn't look like CSV content
      const kybFileName = path.basename(fileRecord.path);
      const filePath = path.join('./uploads', kybFileName);
      
      if (!fs.existsSync(filePath)) {
        console.error('[Files] KYB CSV file missing from disk:', filePath);
        console.log('[Files] Trying to use content from path field directly...');
        
        // For CSV files, set more specific headers for better browser handling
        res.setHeader('Content-Type', 'text/csv');
        
        // Use standardized filename format for download
        const taskType = fileRecord.name.toLowerCase().includes('kyb') ? 'KYB' : 'FORM';
        
        // Get task ID from query params, metadata, or default to 0
        const taskId = Number(req.query.taskId) || 
                      (fileRecord.metadata && fileRecord.metadata.taskId ? Number(fileRecord.metadata.taskId) : 0);
        
        // Get company name from file metadata or use a default
        const companyName = fileRecord.company_id ? await getCompanyName(fileRecord.company_id) : 'Company';
        
        // Create standardized filename
        const standardizedFilename = FileCreationService.generateStandardFileName(
          taskType, 
          taskId, 
          companyName,
          '1.0',
          'csv'
        );
        
        res.setHeader('Content-Disposition', `attachment; filename="${standardizedFilename}"`);
        
        // Send database content as fallback
        return res.send(fileRecord.path);
      }
      
      // For CSV files, set more specific headers for better browser handling
      res.setHeader('Content-Type', 'text/csv');
      
      // Use standardized filename format for download
      const taskType = fileRecord.name.toLowerCase().includes('kyb') ? 'KYB' : 'FORM';
      
      // Get task ID from query params, metadata, or default to 0
      const taskId = Number(req.query.taskId) || 
                    (fileRecord.metadata && fileRecord.metadata.taskId ? Number(fileRecord.metadata.taskId) : 0);
      
      // Get company name from file metadata or use a default
      const companyName = fileRecord.company_id ? await getCompanyName(fileRecord.company_id) : 'Company';
      
      // Extract question number from file metadata if available
      const questionNumber = (fileRecord.metadata && fileRecord.metadata.questionNumber) 
        ? Number(fileRecord.metadata.questionNumber) 
        : undefined;
        
      // Create standardized filename
      const standardizedFilename = FileCreationService.generateStandardFileName(
        taskType, 
        taskId, 
        companyName,
        '1.0',
        'csv',
        questionNumber
      );
      
      res.setHeader('Content-Disposition', `attachment; filename="${standardizedFilename}"`);
      
      // Read and send the file content
      try {
        const csvContent = fs.readFileSync(filePath, 'utf8');
        console.log('[Files] Successfully read CSV file of size:', csvContent.length);
        return res.send(csvContent);
      } catch (readError) {
        console.error('[Files] Error reading CSV file:', readError);
        return res.status(500).json({ error: "Error reading CSV file" });
      }
    } else {
      // Regular files are stored on disk
      const filePath = path.join(uploadDir, fileRecord.path);
      console.log('[Files] Physical file path:', filePath);

      if (!fs.existsSync(filePath)) {
        console.error('[Files] File missing from disk:', filePath);
        return res.status(404).json({ error: "File not found on disk" });
      }

      // Use standardized filename format for download
      const taskType = fileRecord.name.toLowerCase().includes('kyb') ? 'KYB' : 'DOC';
      
      // Get task ID from query params, metadata, or default to 0
      const taskId = Number(req.query.taskId) || 
                    (fileRecord.metadata && fileRecord.metadata.taskId ? Number(fileRecord.metadata.taskId) : 0);
      
      // Get company name from file metadata or use a default
      const companyName = fileRecord.company_id ? await getCompanyName(fileRecord.company_id) : 'Company';
      
      // Get file extension
      const fileExt = path.extname(fileRecord.name).replace('.', '') || 'pdf';
      
      // Extract question number from file metadata if available
      const docQuestionNumber = (fileRecord.metadata && fileRecord.metadata.questionNumber) 
        ? Number(fileRecord.metadata.questionNumber) 
        : undefined;
      
      // Create standardized filename
      const standardizedFilename = FileCreationService.generateStandardFileName(
        taskType, 
        taskId, 
        companyName,
        '1.0',
        fileExt,
        docQuestionNumber
      );
      
      console.log('[Files] Using standardized filename for download:', standardizedFilename);
      
      // Use res.download for regular files
      res.download(filePath, standardizedFilename, (err) => {
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
    }
  } catch (error) {
    console.error("[Files] Error in download endpoint:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

export default router;