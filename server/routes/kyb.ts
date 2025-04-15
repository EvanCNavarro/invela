// server/routes/kyb.ts
import express from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@db';
import { tasks, TaskStatus, companies, files, kybFields, kybResponses } from '@db/schema';
import { requireAuth } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

// Create a simple logger replacement
const logger = {
  debug: (...args: any[]) => console.log('[Debug]', ...args),
  error: (...args: any[]) => console.error('[Error]', ...args),
  info: (...args: any[]) => console.log('[Info]', ...args),
  warn: (...args: any[]) => console.warn('[Warning]', ...args)
};

const router = express.Router();

enum SuggestionStatus {
  PENDING = 'pending',
  GENERATED = 'generated',
  FAILED = 'failed'
}

// Helper function to convert KYB form responses to CSV
function convertResponsesToCSV(fields: any[], formData: any) {
  try {
    const csvRows = [];
    const headers = ['Field', 'Label', 'Question', 'Response'];
    csvRows.push(headers.join(','));

    logger.info('Converting KYB fields to CSV', { 
      fieldCount: fields.length, 
      formDataKeys: Object.keys(formData).length,
      sampleKeys: Object.keys(formData).slice(0, 5)
    });

    for (const field of fields) {
      // Get value from formData, safely handle nulls/undefined
      const fieldKey = field.field_key;
      const value = formData[fieldKey] !== undefined ? formData[fieldKey] : '';
      
      // Escape commas in text fields to preserve CSV structure
      const safeFieldKey = fieldKey.replace(/,/g, ' ');
      const safeDisplayName = (field.display_name || '').replace(/,/g, ' ');
      const safeQuestion = (field.question || '').replace(/,/g, ' ');
      
      // Convert all values to strings and escape commas
      let safeValue = '';
      if (typeof value === 'object' && value !== null) {
        // If value is an array or object, stringify it
        safeValue = JSON.stringify(value).replace(/,/g, ';');
      } else {
        // For primitive values, just convert to string
        safeValue = String(value).replace(/,/g, ' ');
      }
      
      const row = [
        safeFieldKey,
        safeDisplayName,
        safeQuestion,
        safeValue
      ];
      
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    
    // Log first few lines for debugging
    logger.info('CSV generation complete', { 
      rows: csvRows.length,
      previewLines: csvContent.split('\n').slice(0, 3),
      totalLength: csvContent.length
    });
    
    return csvContent;
  } catch (error) {
    logger.error('Error generating CSV', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    // Return at least headers in case of error
    return 'Field,Label,Question,Response\nError generating CSV data';
  }
}

// Helper for logging task data (standardized format)
function logTaskDebug(message: string, task: any) {
  console.log('[KYB API Debug] ' + message + ':', {
    id: task?.id,
    status: task?.status,
    progress: task?.progress,
    metadata: task?.metadata ? Object.keys(task.metadata) : null,
    timestamp: new Date().toISOString()
  });
}

// Helper for logging responses data (standardized format)
function logResponseDebug(message: string, responses: any[]) {
  if (!responses || responses.length === 0) {
    console.log('[KYB API Debug] ' + message + ': None found');
    return;
  }

  console.log('[KYB API Debug] ' + message + ':', {
    responseCount: responses.length,
    fields: responses.map(r => ({
      field: r.field_key,
      status: r.status,
      hasValue: r.response_value !== null && r.response_value !== ''
    })),
    timestamp: new Date().toISOString()
  });
}

// Get all KYB fields with their group information
router.get('/api/kyb/fields', async (req, res) => {
  try {
    console.log('[KYB API DIAGNOSTIC] Starting field fetch');
    
    // Check if table exists in schema first
    try {
      await db.execute(sql`SELECT 1 FROM kyb_fields LIMIT 1`);
      console.log('[KYB API DIAGNOSTIC] Schema check passed: kyb_fields table exists');
    } catch (schemaError) {
      console.error('[KYB API DIAGNOSTIC] Schema check failed:', {
        error: schemaError instanceof Error ? schemaError.message : 'Unknown error',
        detail: 'kyb_fields table may not exist'
      });
      return res.status(500).json({ 
        error: 'Database schema issue',
        detail: 'The KYB fields table does not exist or is not accessible'
      });
    }
    
    // Count fields first
    const countResult = await db.execute(sql`SELECT COUNT(*) FROM kyb_fields`);
    const fieldCount = parseInt(countResult.rows[0]?.count?.toString() || '0', 10);
    
    console.log(`[KYB API DIAGNOSTIC] Field count: ${fieldCount}`);
    
    // Then get the actual fields
    const fields = await db.select().from(kybFields).orderBy(kybFields.order);
    
    console.log('[KYB API DIAGNOSTIC] Fields fetched successfully:', {
      count: fields.length,
      fieldKeys: fields.map(f => f.field_key),
      groups: [...new Set(fields.map(f => f.group))],
      sampleField: fields.length > 0 ? {
        id: fields[0].id,
        key: fields[0].field_key,
        type: fields[0].field_type,
        group: fields[0].group
      } : null
    });
    
    const result = {
      fields,
      success: true
    };
    
    res.json(result);
  } catch (error) {
    console.error('[KYB API DIAGNOSTIC] Error fetching fields:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Failed to load KYB fields' });
  }
});

// Submit KYB field suggestion for AI processing
router.post('/api/kyb/suggest', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated || !req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { taskId, fields } = req.body;

    if (!taskId || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ 
        error: 'Invalid request body',
        details: 'taskId and fields array are required'
      });
    }

    // Log the request parameters
    logger.debug('Suggestion request received', {
      taskId,
      fieldCount: fields.length,
      userId: req.user.id
    });

    // Get task data
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Validate that all requested fields exist
    const fieldKeys = fields.map(f => f.key);
    const existingFields = await db.select({ field_key: kybFields.field_key })
      .from(kybFields)
      .where(sql`${kybFields.field_key} IN (${fieldKeys.join(',')})`);

    const existingFieldKeys = new Set(existingFields.map(f => f.field_key));
    const invalidFields = fieldKeys.filter(key => !existingFieldKeys.has(key));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        error: 'Invalid fields',
        invalidFields
      });
    }

    // Get existing responses
    const existingResponses = await db.select({
      field_key: kybFields.field_key,
      response_value: kybResponses.response_value
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, taskId));

    // Transform responses into form data
    const formData: Record<string, any> = {};
    for (const response of existingResponses) {
      // Always include the field key in formData, even if value is null or empty
      formData[response.field_key] = response.response_value || '';
    }

    // Transform the task data to include saved form data
    const transformedTask = {
      ...task,
      savedFormData: formData,
      progress: task.progress || 0
    };

    console.log('[KYB API Debug] Transformed task data:', {
      id: transformedTask.id,
      status: transformedTask.status,
      progress: transformedTask.progress,
      formDataFields: Object.keys(formData),
      metadataFields: Object.keys(transformedTask.metadata || {}),
      timestamp: new Date().toISOString()
    });

    // Respond with status and acknowledgement
    res.json({
      success: true,
      status: SuggestionStatus.PENDING,
      message: 'Suggestions will be processed and available shortly',
      requestedFields: fieldKeys
    });

    // Process suggestions asynchronously...
    // (this would typically invoke OpenAI or similar)
    
  } catch (error) {
    console.error('[KYB API Debug] Error processing suggestions:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to process suggestions',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

// Update progress for KYB form
router.post('/api/kyb/progress', async (req, res) => {
  try {
    const { taskId, progress, formData, fieldUpdates } = req.body;

    console.log('[KYB API Debug] Progress update initiated:', {
      taskId,
      requestedProgress: progress,
      formDataKeys: Object.keys(formData || {}),
      fieldUpdates: fieldUpdates ? Object.keys(fieldUpdates) : [],
      timestamp: new Date().toISOString()
    });

    if (!taskId) {
      console.warn('[KYB API Debug] Missing task ID in request');
      return res.status(400).json({
        error: 'Task ID is required',
        code: 'MISSING_TASK_ID'
      });
    }

    // Get existing task data
    const [existingTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!existingTask) {
      console.log('[KYB API Debug] Task not found:', taskId);
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Get all KYB fields
    const fields = await db.select().from(kybFields);
    const fieldMap = new Map(fields.map(f => [f.field_key, f.id]));

    // Update KYB responses for each field
    const timestamp = new Date();
    const processedFields = new Set();

    for (const [fieldKey, value] of Object.entries(formData)) {
      const fieldId = fieldMap.get(fieldKey);
      if (!fieldId) continue;

      processedFields.add(fieldKey);
      // Important change: Always store empty string values directly in the database
      // Never convert empty strings to null - this prevents the form from handling them correctly
      const responseValue = value === null ? '' : String(value);
      // Set status to COMPLETE when there's a value (even empty spaces), and EMPTY only when truly empty
      // Using COMPLETE instead of FILLED to match the enum values expected by the database
      const status = responseValue.trim() === '' ? 'EMPTY' : 'COMPLETE';

      // Check if response exists
      const [existingResponse] = await db.select()
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            eq(kybResponses.field_id, fieldId)
          )
        );

      if (existingResponse) {
        // Update existing response
        await db.update(kybResponses)
          .set({
            response_value: responseValue,
            status,
            version: existingResponse.version + 1,
            updated_at: timestamp
          })
          .where(eq(kybResponses.id, existingResponse.id));

        console.log('[KYB API Debug] Updated field response:', {
          fieldKey,
          oldValue: existingResponse.response_value,
          newValue: responseValue,
          oldStatus: existingResponse.status,
          newStatus: status,
          timestamp: timestamp.toISOString()
        });
      } else {
        // Create new response
        await db.insert(kybResponses)
          .values({
            task_id: taskId,
            field_id: fieldId,
            response_value: responseValue,
            status,
            version: 1,
            created_at: timestamp,
            updated_at: timestamp
          });

        console.log('[KYB API Debug] Created new field response:', {
          fieldKey,
          value: responseValue,
          status,
          timestamp: timestamp.toISOString()
        });
      }
    }

    // Handle fields that were in the database but not in the current formData
    // These should be marked as EMPTY
    const existingResponses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key,
      field_id: kybFields.id,
      response_id: kybResponses.id
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, taskId));

    for (const response of existingResponses) {
      if (!processedFields.has(response.field_key)) {
        await db.update(kybResponses)
          .set({
            response_value: '', // Changed from null to empty string
            status: 'EMPTY',
            version: 1,
            updated_at: timestamp
          })
          .where(eq(kybResponses.id, response.response_id));

        console.log('[KYB API Debug] Cleared missing field:', {
          fieldKey: response.field_key,
          oldValue: response.response_value,
          timestamp: timestamp.toISOString()
        });
      }
    }

    // Determine appropriate status based on progress
    let newStatus = existingTask.status;
    if (progress === 0) {
      newStatus = TaskStatus.NOT_STARTED;
    } else if (progress < 100) {
      newStatus = TaskStatus.IN_PROGRESS;
    } else if (progress === 100) {
      newStatus = TaskStatus.READY_FOR_SUBMISSION;
    }

    // Update task progress and metadata
    await db.update(tasks)
      .set({
        progress: Math.min(progress, 100),
        status: newStatus,
        metadata: {
          ...existingTask.metadata,
          lastUpdated: timestamp.toISOString(),
          statusFlow: [...(existingTask.metadata?.statusFlow || []), newStatus]
            .filter((v, i, a) => a.indexOf(v) === i)
        },
        updated_at: timestamp
      })
      .where(eq(tasks.id, taskId));

    // Get updated responses
    const updatedResponses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key,
      status: kybResponses.status
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, taskId));

    const updatedFormData: Record<string, any> = {};
    for (const response of updatedResponses) {
      // Always include the field in formData with empty string if null
      updatedFormData[response.field_key] = response.response_value || '';
    }

    res.json({
      success: true,
      savedData: {
        progress: Math.min(progress, 100),
        status: newStatus,
        formData: updatedFormData
      }
    });
  } catch (error) {
    console.error('[KYB API Debug] Error processing progress update:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      error: 'Failed to save progress',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get saved progress for KYB form
router.get('/api/kyb/progress/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log('[KYB API Debug] Loading progress for task:', taskId);

    // Get task data
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));

    logTaskDebug('Retrieved task', task);

    if (!task) {
      console.log('[KYB API Debug] Task not found:', taskId);
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get all KYB responses for this task with their field information
    const responses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key,
      status: kybResponses.status
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, parseInt(taskId)));

    logResponseDebug('Retrieved responses', responses);

    // Transform responses into form data
    const formData: Record<string, any> = {};
    for (const response of responses) {
      // Always include the field in formData with empty string if null
      formData[response.field_key] = response.response_value || '';
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
  try {
    const { taskId, formData, fileName } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' });
    }
    
    if (!formData) {
      return res.status(400).json({ error: 'Form data is required' });
    }
    
    logger.info('Saving KYB form data', { taskId });
    
    // Get task data
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });

    if (!task) {
      logger.error('Task not found', { taskId });
      return res.status(404).json({ error: 'Task not found' });
    }

    // Validate that this is a KYB task
    if (!['KYB', 'company_kyb'].includes(task.task_type)) {
      logger.error('Invalid task type for KYB form', { taskId, taskType: task.task_type });
      return res.status(400).json({ error: 'Invalid task type for KYB form' });
    }

    // Get all KYB fields with their groups
    const fields = await db.select()
      .from(kybFields)
      .orderBy(kybFields.order);

    // Convert form data to CSV
    const csvData = convertResponsesToCSV(fields, formData);

    // Validate user ID
    const userId = req.user?.id || task.created_by;
    if (!userId) {
      logger.error('Unable to determine user ID for file creation', {
        taskId,
        userIdFromRequest: req.user?.id,
        userIdFromTask: task.created_by,
      });
      return res.status(400).json({
        error: 'User identification failed',
        details: 'Could not determine a valid user ID for file creation'
      });
    }
    
    let fileId; 
    const timestamp = new Date();
    const warnings: string[] = [];

    try {
      // Catch validation errors before starting transaction
      if (!userId) {
        throw new Error('User ID is required');
      }
      if (!task.company_id) {
        throw new Error('Company ID is required');
      }
      
      // Use a SINGLE transaction for ALL operations (file creation, task update, AND responses)
      fileId = await db.transaction(async (tx) => {
        // 1. Create file record in the database first
        // Ensure all required fields are properly set to valid values
        // FIXED: Create file values object matching the actual schema 
        // (content is not a field in the files table)
        const filePath = `/uploads/kyb_${taskId}_${timestamp.getTime()}.csv`;
        const fileValues = {
            name: fileName || `kyb_form_${taskId}_${timestamp.toISOString()}.csv`,
            type: 'text/csv',
            status: 'active',
            path: filePath,
            size: Buffer.from(csvData).length,
            version: 1,
            company_id: task.company_id, // Already validated above
            user_id: userId, // Already validated above
            created_at: timestamp,
            updated_at: timestamp,
            upload_time: timestamp,
            download_count: 0,
            metadata: {
              taskId,
              taskType: 'kyb',
              formVersion: '1.0',
              submissionDate: timestamp.toISOString(),
              fields: fields.map(f => f.field_key)
            }
          };
            
        // Save CSV data to file system (for archival)
        try {
          const uploadsDir = './uploads';
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          // Extract filename from path
          const fileName = filePath.split('/').pop();
          fs.writeFileSync(`${uploadsDir}/${fileName}`, csvData);
          logger.info(`Saved CSV file to ${uploadsDir}/${fileName}`);
        } catch (fsError) {
          logger.warn('Could not save CSV file to filesystem', {
            error: fsError instanceof Error ? fsError.message : 'Unknown error',
            path: filePath
          });
          // Continue with transaction - don't abort if file saving fails
        }
            
        // Log the file values for debugging
        logger.info('Creating file record with values:', {
          fileName: fileValues.name,
          fileSize: fileValues.size,
          companyId: fileValues.company_id,
          userId: fileValues.user_id
        });
        
        // FIXED: Add explicit type definition for the insert query and validate all required fields
        const fileInsertData = {
          name: fileValues.name,
          size: fileValues.size,
          type: fileValues.type,
          path: fileValues.path,
          status: fileValues.status,
          user_id: fileValues.user_id,
          company_id: fileValues.company_id,
          document_category: 'other', // Set a default document category
          classification_status: 'processed',
          classification_confidence: 1.0,
          created_at: fileValues.created_at,
          updated_at: fileValues.updated_at,
          upload_time: fileValues.upload_time,
          download_count: fileValues.download_count || 0,
          version: fileValues.version || 1.0,
          metadata: fileValues.metadata || {}
        };
        
        // Ensure all required fields are definitely populated
        if (!fileInsertData.user_id || !fileInsertData.company_id) {
          throw new Error('Required fields missing for file creation: user_id or company_id');
        }
        
        const [fileRecord] = await tx.insert(files)
          .values(fileInsertData)
          .returning({ id: files.id });
          
        if (!fileRecord) {
          throw new Error('Failed to create file record');
        }
        
        // 2. Get company record to update available tabs (KYB task specific functionality)
        // Only do this for KYB-type tasks
        if (['KYB', 'company_kyb'].includes(task.task_type)) {
          const [company] = await tx.select()
            .from(companies)
            .where(eq(companies.id, task.company_id));
      
          if (company) {
            // Add file-vault to available tabs if not already present - this is a KYB-specific function
            const currentTabs = company.available_tabs || ['task-center'];
            if (!currentTabs.includes('file-vault')) {
              await tx.update(companies)
                .set({
                  available_tabs: [...currentTabs, 'file-vault'],
                  updated_at: timestamp
                })
                .where(eq(companies.id, task.company_id));
            }
          }
          
          // Handle revenue tier update if present
          if (formData.annualRecurringRevenue) {
            const [revenueTierField] = await tx.select()
              .from(kybFields)
              .where(eq(kybFields.field_key, 'annualRecurringRevenue'))
              .limit(1);
    
            if (revenueTierField?.validation_rules && revenueTierField.validation_rules !== null && typeof revenueTierField.validation_rules === 'object' && 'options' in revenueTierField.validation_rules) {
              // Map ARR ranges to revenue tiers
              const tierMapping = {
                'Less than $1 million': 'small',
                '$1 million - $10 million': 'medium',
                '$10 million - $50 million': 'large',
                'Greater than $50 million': 'xlarge'
              };
    
              const selectedTier = tierMapping[formData.annualRecurringRevenue as keyof typeof tierMapping];
              if (selectedTier) {
                await tx.update(companies)
                  .set({
                    revenue_tier: selectedTier,
                    updated_at: timestamp
                  })
                  .where(eq(companies.id, task.company_id));
              }
            }
          }
        }
    
        // 3. Update task status and metadata
        await tx.update(tasks)
          .set({
            status: TaskStatus.SUBMITTED,
            progress: 100,
            updated_at: timestamp,
            metadata: {
              ...task.metadata,
              kybFormFile: fileRecord.id,
              submissionDate: timestamp.toISOString(),
              formVersion: '1.0',
              statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.SUBMITTED]
                .filter((v, i, a) => a.indexOf(v) === i)
            }
          })
          .where(eq(tasks.id, taskId));
          
        // 4. Save all form responses within the SAME transaction
        for (const field of fields) {
          const value = formData[field.field_key];
          const status = value ? 'COMPLETE' : 'EMPTY';
  
          try {
            // First try to insert
            await tx.insert(kybResponses)
              .values({
                task_id: taskId,
                field_id: field.id,
                response_value: value || '',
                status,
                version: 1,
                created_at: timestamp,
                updated_at: timestamp
              });
          } catch (err) {
            const error = err as Error;
            if (error.message.includes('duplicate key value violates unique constraint')) {
              // If duplicate, update instead
              await tx.update(kybResponses)
                .set({
                  response_value: value || '',
                  status,
                  version: sql`${kybResponses.version} + 1`,
                  updated_at: timestamp
                })
                .where(
                  and(
                    eq(kybResponses.task_id, taskId),
                    eq(kybResponses.field_id, field.id)
                  )
                );
              warnings.push(`Updated existing response for field: ${field.field_key}`);
            } else {
              // For non-duplicate errors, we need to stop the entire transaction
              throw error;
            }
          }
        }

        // Return the file ID from the transaction
        return fileRecord.id;
      });
      
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
      // If the transaction fails, return detailed error
      logger.error('Transaction failed during KYB submission', {
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
    // Enhanced detailed error logging for overall request failures
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