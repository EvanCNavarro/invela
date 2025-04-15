import { Router } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@db';
import { kybFields, kybResponses, tasks, companies, files } from '@db/schema';
import { requireAuth } from '../middleware/auth';
import { Logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

const router = Router();
const logger = new Logger('KYB');

// Define task status enum for clarity
enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  READY_FOR_SUBMISSION = 'ready_for_submission',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

// Define response statuses to match schema KYBFieldStatus values (lowercase)
enum ResponseStatus {
  EMPTY = 'empty',
  COMPLETE = 'complete',
  INVALID = 'invalid'
}

enum SuggestionStatus {
  PENDING = 'pending',
  GENERATED = 'generated',
  FAILED = 'failed'
}

// Helper function to convert responses to CSV format
function convertResponsesToCSV(fields: any[], formData: any) {
  let csvLines = ['Field,Label,Question,Response'];
  
  for (const field of fields) {
    // Get response data, with fallback to empty string
    const response = formData[field.field_key] || '';
    
    // Convert any objects/arrays to string format
    const safeResponse = typeof response === 'object' 
      ? JSON.stringify(response) 
      : String(response);
    
    // Escape CSV special characters
    const escapedResponse = safeResponse.replace(/"/g, '""');
    
    // Create CSV line with quotes around each field to handle commas, newlines, etc.
    csvLines.push(`${field.field_key},"${field.display_name}","${field.question || ''}","${escapedResponse}"`);
  }
  
  return csvLines.join('\n');
}

// Debug logging helper functions
function logTaskDebug(message: string, task: any) {
  console.log(`[KYB Debug] ${message}:`, {
    id: task.id,
    status: task.status,
    progress: task.progress,
    metadata: Object.keys(task.metadata || {}),
    timestamp: new Date().toISOString()
  });
}

function logResponseDebug(message: string, responses: any[]) {
  console.log(`[KYB Debug] ${message}:`, {
    responseCount: responses.length,
    fields: responses.slice(0, 5).map(r => ({ 
      field: r.field_key || r.field_id, 
      status: r.status,
      hasValue: !!r.response_value
    })),
    timestamp: new Date().toISOString()
  });
}

// Get KYB fields for form rendering
router.get('/api/kyb/fields', async (req, res) => {
  try {
    // First sanity check: Verify that kyb_fields table exists
    try {
      const fieldCheck = await db.select({ count: sql`count(*)` }).from(kybFields);
      console.log('[KYB API DIAGNOSTIC] Schema check passed: kyb_fields table exists');
    } catch (schemaError) {
      console.error('[KYB API DIAGNOSTIC] Schema check failed:', {
        error: schemaError instanceof Error ? schemaError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({ error: 'Database schema error', details: 'KYB fields table may not exist' });
    }
    
    // Get all field definitions
    const fields = await db.select().from(kybFields).orderBy(kybFields.order);
    
    console.log('[KYB API DIAGNOSTIC] Field count:', fields.length);
    
    // Provide detailed logging
    if (fields.length > 0) {
      console.log('[KYB API DIAGNOSTIC] Fields fetched successfully:', {
        count: fields.length,
        fieldKeys: fields.map(f => f.field_key),
        groups: [...new Set(fields.map(f => f.group))],
        sampleField: fields[0]
      });
    } else {
      console.error('[KYB API DIAGNOSTIC] No KYB fields found in database');
    }

    return res.json({ fields });
  } catch (error) {
    console.error('Error fetching KYB fields:', error);
    return res.status(500).json({ error: 'Failed to fetch KYB fields' });
  }
});

// Get form progress for a specific task
router.get('/api/kyb/progress/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Get task info including status and any saved progress
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    console.log('[KYB API Debug] Loading progress for task:', taskId);
    logTaskDebug('Retrieved task', task);
    
    // Get all responses for this task
    const responses = await db.select({
      field_key: kybFields.field_key,
      response_value: kybResponses.response_value,
      status: kybResponses.status
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, parseInt(taskId)));
    
    logResponseDebug('Retrieved responses', responses);
      
    // Convert responses to a form data object
    const formData: Record<string, any> = {};
    for (const response of responses) {
      // Add this response to the form data
      formData[response.field_key] = response.response_value;
    }
    
    console.log('[KYB API Debug] Retrieved task data:', {
      id: task.id,
      responseCount: responses.length,
      progress: task.progress,
      status: task.status,
      formDataKeys: Object.keys(formData),
      formData
    });

    // Return saved form data and progress
    res.json({
      formData,
      progress: Math.min(task.progress || 0, 100)
    });
  } catch (error) {
    console.error('[KYB API Debug] Error loading progress:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

// Save KYB form data
router.post('/api/kyb/save', requireAuth, async (req, res) => {
  // Transaction step tracking - define at top level for error logging
  let transactionStep = 'initialization';

  try {
    const { taskId, formData, fileName } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    if (!formData) {
      return res.status(400).json({ error: 'Form data is required' });
    }
    
    // Get user ID from session
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get all fields and their definitions
    const fields = await db.select().from(kybFields).orderBy(kybFields.order);
    
    if (fields.length === 0) {
      return res.status(500).json({ error: 'No KYB fields defined' });
    }
    
    // Check if all required fields are completed
    const requiredFields = fields.filter(field => field.required);
    
    for (const field of requiredFields) {
      if (!formData[field.field_key] && formData[field.field_key] !== false) {
        return res.status(400).json({ 
          error: 'Missing required field',
          field: field.field_key,
          display_name: field.display_name 
        });
      }
    }
    
    // Get task to verify ownership and get company ID
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Verify user has access to this task (task owner, assigned to user, or same company)
    if (task.created_by !== userId && task.assigned_to !== userId && task.company_id !== req.user?.company_id) {
      return res.status(403).json({ error: 'You do not have permission to modify this task' });
    }
    
    // Convert form data to CSV for storage
    logger.info('Converting KYB fields to CSV', {
      fieldCount: fields.length,
      formDataKeys: Object.keys(formData).length,
      sampleKeys: fields.slice(0, 5).map(f => f.field_key)
    });
    
    const csvData = convertResponsesToCSV(fields, formData);
    
    // Setup timestamp for all operations
    const timestamp = new Date();
    
    // Track warnings during the process
    const warnings: string[] = [];
    
    // Save CSV file to disk first
    const timestampStr = timestamp.getTime();
    const csvFileName = `kyb_${taskId}_${timestampStr}.csv`;
    const uploadsDir = './uploads';
    
    // Make sure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Write CSV to file
    fs.writeFileSync(`${uploadsDir}/${csvFileName}`, csvData);
    logger.info(`Saved CSV file to ${uploadsDir}/${csvFileName}`);
    
    // Variable to store the created file ID
    let fileId: number | null = null;
    
    try {
      // Use a single atomic transaction for all database operations
      fileId = await db.transaction(async (tx) => {
        logger.info('Starting transaction for KYB submission', { taskId, userId: req.user?.id });
        
        try {
          transactionStep = 'creating file record';
          // 1. Create file record in database
          const fileValues = {
            name: fileName || `kyb_form_${taskId}_${timestamp.toISOString()}.csv`,
            size: Buffer.from(csvData).length,
            type: 'text/csv',
            path: `/uploads/${csvFileName}`,
            status: 'active',
            user_id: task.created_by,
            company_id: task.company_id,
            document_category: 'other',
            classification_status: 'processed',
            classification_confidence: 1.0,
            created_at: timestamp,
            updated_at: timestamp,
            upload_time: timestamp,
            download_count: 0,
            version: 1.0,
            metadata: {
              taskId,
              taskType: 'kyb',
              formVersion: '1.0',
              submissionDate: timestamp.toISOString(),
              fields: fields.map(f => f.field_key)
            }
          };
          
          // Explicitly specify which columns we're inserting with proper type casting
          // Convert the fileValues object to a proper files table insert with type casting
          const insertValues = {
            name: fileValues.name,
            size: fileValues.size,
            type: fileValues.type,
            path: fileValues.path,
            status: fileValues.status,
            user_id: fileValues.user_id,
            company_id: fileValues.company_id,
            document_category: fileValues.document_category as any, // Cast to fix type error
            classification_status: fileValues.classification_status,
            classification_confidence: fileValues.classification_confidence,
            created_at: fileValues.created_at,
            updated_at: fileValues.updated_at,
            upload_time: fileValues.upload_time,
            download_count: fileValues.download_count,
            version: fileValues.version,
            metadata: fileValues.metadata
          };
          
          logger.info('Inserting file record with data', { 
            fileName: insertValues.name,
            taskId
          });
          
          // Use the "as any" type assertion to bypass TypeScript type checking
          const [fileRecord] = await tx.insert(files)
            .values(insertValues as any)
            .returning();
            
          logger.info('File record created in transaction', { 
            fileId: fileRecord.id,
            taskId 
          });
          
          // 2. Update company available tabs if needed
          transactionStep = 'updating company tabs';
          try {
            const [company] = await tx.select()
              .from(companies)
              .where(eq(companies.id, task.company_id));
              
            logger.info('Company data retrieved in transaction', { 
              companyId: task.company_id,
              availableTabs: company?.available_tabs
            });
            
            if (company) {
              // Add file-vault to available tabs if not already present
              const currentTabs = company.available_tabs || ['task-center'];
              if (!currentTabs.includes('file-vault')) {
                await tx.update(companies)
                  .set({
                    available_tabs: [...currentTabs, 'file-vault'],
                    updated_at: timestamp
                  })
                  .where(eq(companies.id, task.company_id));
                  
                logger.info('Company tabs updated in transaction', { 
                  companyId: task.company_id, 
                  updatedTabs: [...currentTabs, 'file-vault']
                });
              }
            }
          } catch (companyError) {
            logger.error('Error updating company tabs', {
              error: companyError instanceof Error ? companyError.message : 'Unknown error',
              stack: companyError instanceof Error ? companyError.stack : undefined,
              companyId: task.company_id
            });
            throw companyError;
          }
          
          // 3. Update task metadata and status
          transactionStep = 'updating task metadata';
          try {
            // Convert task.metadata to object if it's null
            const currentMetadata = task.metadata || {};
            
            await tx.update(tasks)
              .set({
                status: TaskStatus.SUBMITTED,
                progress: 100,
                updated_at: timestamp,
                metadata: {
                  ...currentMetadata,
                  kybFormFile: fileRecord.id,
                  submissionDate: timestamp.toISOString(),
                  formVersion: '1.0'
                }
              })
              .where(eq(tasks.id, taskId));
              
            logger.info('Task updated in transaction', { 
              taskId,
              status: TaskStatus.SUBMITTED
            });
          } catch (taskError) {
            logger.error('Error updating task', {
              error: taskError instanceof Error ? taskError.message : 'Unknown error',
              stack: taskError instanceof Error ? taskError.stack : undefined,
              taskId
            });
            throw taskError;
          }
          
          // 4. Save all form responses
          transactionStep = 'saving form responses';
          try {
            // Fetch existing responses to determine which ones to update or delete
            const existingResponses = await tx.select()
              .from(kybResponses)
              .where(eq(kybResponses.task_id, Number(taskId)));
            
            logger.info('Found existing responses', {
              taskId, 
              count: existingResponses.length,
              timestamp: new Date().toISOString()
            });
            
            // First, handle any problematic responses that might be duplicated
            if (existingResponses.length > fields.length) {
              logger.warn('Found more responses than fields - may have duplicates', {
                responseCount: existingResponses.length,
                fieldCount: fields.length
              });
              
              // Get counts by field_id to detect duplicates
              const responseCountsByField: Record<number, number> = {};
              
              for (const response of existingResponses) {
                responseCountsByField[response.field_id] = (responseCountsByField[response.field_id] || 0) + 1;
              }
              
              // Find duplicate field_ids (more than one response for a field)
              const duplicateFieldIds = Object.entries(responseCountsByField)
                .filter(([_, count]) => count > 1)
                .map(([fieldId]) => Number(fieldId));
              
              if (duplicateFieldIds.length > 0) {
                logger.warn('Found duplicate responses for fields', { 
                  duplicateFieldIds,
                  counts: duplicateFieldIds.map(id => ({
                    fieldId: id,
                    count: responseCountsByField[id]
                  }))
                });
                
                // Delete all duplicate responses to start fresh
                for (const fieldId of duplicateFieldIds) {
                  await tx.delete(kybResponses)
                    .where(
                      and(
                        eq(kybResponses.task_id, Number(taskId)),
                        eq(kybResponses.field_id, fieldId)
                      )
                    );
                  
                  warnings.push(`Cleaned up duplicated responses for field ID: ${fieldId}`);
                }
              }
            }
            
            // Now process each field
            for (const field of fields) {
              const value = formData[field.field_key];
              const status = value ? ResponseStatus.COMPLETE : ResponseStatus.EMPTY;
              
              // Check if response already exists for this field
              const existingResponse = existingResponses.find(r => r.field_id === field.id);
              
              if (existingResponse) {
                // Update existing response
                await tx.update(kybResponses)
                  .set({
                    response_value: value || '',
                    status: status as any, // Cast to bypass type checking
                    version: sql`${kybResponses.version} + 1`,
                    updated_at: timestamp
                  })
                  .where(
                    and(
                      eq(kybResponses.task_id, Number(taskId)),
                      eq(kybResponses.field_id, field.id)
                    )
                  );
                
                logger.info(`Updated existing response for field: ${field.field_key}`, {
                  fieldId: field.id,
                  responseId: existingResponse.id
                });
              } else {
                // Insert new response
                try {
                  await tx.insert(kybResponses)
                    .values({
                      task_id: Number(taskId),
                      field_id: field.id,
                      response_value: value || '',
                      status: status as any, // Cast to bypass type checking
                      version: 1,
                      created_at: timestamp,
                      updated_at: timestamp
                    });
                    
                  logger.info(`Created new response for field: ${field.field_key}`, {
                    fieldId: field.id
                  });
                } catch (insertError) {
                  const error = insertError as Error;
                  logger.error(`Error inserting response for field: ${field.field_key}`, {
                    error: error.message,
                    fieldId: field.id
                  });
                  throw error;
                }
              }
            }
            
            logger.info('All responses saved in transaction', { 
              taskId,
              responseCount: fields.length
            });
          } catch (responseError) {
            logger.error('Error saving responses', {
              error: responseError instanceof Error ? responseError.message : 'Unknown error',
              stack: responseError instanceof Error ? responseError.stack : undefined,
              taskId
            });
            throw responseError;
          }
          
          // Transaction successful, return the file ID
          return fileRecord.id;
        } catch (transactionError) {
          logger.error('Transaction step failed', {
            step: transactionStep,
            error: transactionError instanceof Error ? transactionError.message : 'Unknown error',
            stack: transactionError instanceof Error ? transactionError.stack : undefined,
            taskId
          });
          throw transactionError;
        }
      });
      
      // Success - transaction completed
      logger.info('KYB form complete and responses saved successfully', {
        taskId,
        fileId,
        responseCount: fields.length,
        warningCount: warnings.length
      });
      
      // Return success response with file ID and any warnings
      return res.json({
        success: true,
        fileId,
        warnings: warnings.length > 0 ? warnings : undefined
      });
      
    } catch (txError) {
      // Transaction error handling
      logger.error('Transaction failed during KYB submission', {
        step: transactionStep,
        error: txError instanceof Error ? txError.message : 'Unknown error',
        stack: txError instanceof Error ? txError.stack : undefined,
        taskId
      });
      
      return res.status(500).json({
        error: 'Transaction failed',
        details: txError instanceof Error ? txError.message : 'Failed to complete the submission process'
      });
    }
    
  } catch (error) {
    // Overall request error handling
    console.error('[KYB API Debug] Error in KYB form submission', {
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      requestHeaders: {
        contentType: req.headers['content-type'],
        accept: req.headers.accept,
        cookiePresent: !!req.headers.cookie
      },
      sessionID: req.sessionID,
      authenticatedStatus: req.isAuthenticated?.() || false,
      userPresent: !!req.user,
      timestamp: new Date().toISOString()
    });
    
    logger.error('Failed during KYB form submission', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      taskId: req.body?.taskId
    });
    
    // Provide more user-friendly error messages
    let errorMessage = 'There was a problem submitting your form.';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (error instanceof Error) {
      if (error.message.includes('user_id') || error.message.includes('created_by')) {
        errorMessage = 'Authentication issue detected.';
        errorDetails = 'Please try signing out and back in, then submit again.';
      } else if (error.message.includes('database') || error.message.includes('connection')) {
        errorMessage = 'Database connection issue.';
        errorDetails = 'Our systems are experiencing temporary difficulties. Please try again in a few moments.';
      } else if (error.message.includes('constraint') || error.message.includes('duplicate')) {
        errorMessage = 'Data validation error.';
        errorDetails = 'Some of your information could not be processed. Please review and try again.';
      }
    }
    
    // Set appropriate status code based on error type
    const statusCode = 
      error instanceof Error && error.message.includes('Unauthorized') ? 401 :
      error instanceof Error && error.message.includes('not found') ? 404 : 
      error instanceof Error && error.message.includes('duplicate key') ? 409 : 500;
    
    // Send more detailed error response
    return res.status(statusCode).json({
      error: errorMessage,
      details: errorDetails,
      statusCode,
      timestamp: new Date().toISOString()
    });
  }
});

// Diagnostic endpoint for KYB responses
router.get('/api/kyb/diagnostics/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Get task info
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Fetch all fields with their definitions
    const fields = await db.select().from(kybFields).orderBy(kybFields.order);
    
    // Get all existing responses for this task
    const responses = await db.select()
      .from(kybResponses)
      .where(eq(kybResponses.task_id, parseInt(taskId)));
    
    // Get response count by field
    const responseCountByField = await db.select({
      field_id: kybResponses.field_id,
      count: sql`count(${kybResponses.id})`
    })
      .from(kybResponses)
      .where(eq(kybResponses.task_id, parseInt(taskId)))
      .groupBy(kybResponses.field_id);
      
    // Join fields with their response counts
    const fieldResponseCounts = fields.map(field => {
      const responseCount = responseCountByField.find(r => r.field_id === field.id);
      return {
        field_id: field.id,
        field_key: field.field_key,
        display_name: field.display_name,
        response_count: responseCount ? Number(responseCount.count) : 0
      };
    });
    
    // Calculate overall stats
    const duplicateFields = fieldResponseCounts.filter(f => Number(f.response_count) > 1);
    const missingFields = fieldResponseCounts.filter(f => f.response_count === 0);
    
    // Return diagnostic info
    return res.json({
      task_id: task.id,
      task_status: task.status,
      task_progress: task.progress,
      field_count: fields.length,
      response_count: responses.length,
      duplicate_fields: duplicateFields,
      missing_fields: missingFields,
      fields_with_responses: fieldResponseCounts,
      field_status: responseCountByField
    });
  } catch (error) {
    console.error('Error generating KYB diagnostics:', error);
    res.status(500).json({
      error: 'Failed to generate KYB diagnostics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export KYB data to CSV
router.get('/api/kyb/export/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Get task data
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get all KYB fields with their group information
    const fields = await db.select().from(kybFields).orderBy(kybFields.order);

    // Get all KYB responses for this task
    const responses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, parseInt(taskId)));

    // Transform responses into form data
    const formData: Record<string, any> = {};
    for (const response of responses) {
      // Always include the field in formData with empty string if null
      formData[response.field_key] = response.response_value || '';
    }

    // Convert form data to CSV
    const csvData = convertResponsesToCSV(fields, formData);

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="kyb_form_${taskId}.csv"`);
    
    // Send CSV data
    res.send(csvData);
    
  } catch (error) {
    console.error('Error exporting KYB data:', error);
    res.status(500).json({
      error: 'Failed to export KYB data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get the summary of all KYB progress in the system
router.get('/api/kyb/summary', async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get count of KYB tasks by status
    const taskStatusSummary = await db.select({
      status: tasks.status,
      count: sql`count(${tasks.id})`
    })
      .from(tasks)
      .where(eq(tasks.task_type, 'KYB'))
      .groupBy(tasks.status);

    // Get count of KYB responses by status
    const responseStatusSummary = await db.select({
      status: kybResponses.status,
      count: sql`count(${kybResponses.id})`
    })
      .from(kybResponses)
      .groupBy(kybResponses.status);

    // Get average progress of all KYB tasks
    const [progressSummary] = await db.select({
      avgProgress: sql`avg(${tasks.progress})`,
      minProgress: sql`min(${tasks.progress})`,
      maxProgress: sql`max(${tasks.progress})`
    })
      .from(tasks)
      .where(eq(tasks.task_type, 'KYB'));

    res.json({
      taskStatusSummary,
      responseStatusSummary,
      progressSummary
    });
  } catch (error) {
    console.error('Error getting KYB summary:', error);
    res.status(500).json({
      error: 'Failed to get KYB summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;