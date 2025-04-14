// server/routes/kyb.ts
import express from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@db';
import { tasks, TaskStatus, companies, files, kybFields, kybResponses } from '@db/schema';

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
  const csvRows = [];
  const headers = ['Field', 'Label', 'Question', 'Response'];
  csvRows.push(headers.join(','));

  for (const field of fields) {
    const value = formData[field.field_key] || '';
    const row = [
      field.field_key,
      field.display_name,
      (field.question || '').replace(/,/g, ''),
      (value || '').replace(/,/g, '')
    ];
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
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
    const fieldCount = parseInt(countResult.rows[0]?.count || '0', 10);
    
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
    if (!req.isAuthenticated() || !req.user) {
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
      const status = responseValue === '' ? 'EMPTY' : 'COMPLETE';

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
router.post('/api/kyb/save', async (req, res) => {
  try {
    // Enhanced detailed DEBUG entry point logging
    console.log('[KYB API Debug] KYB save endpoint triggered:', {
      endpoint: '/api/kyb/save',
      method: 'POST',
      url: req.url,
      headers: {
        contentType: req.headers['content-type'],
        accept: req.headers.accept,
        cookie: !!req.headers.cookie // Just log if cookie is present without exposing its value
      },
      timestamp: new Date().toISOString()
    });
    
    // Check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      console.error('[KYB API Debug] Unauthorized access attempt', {
        path: '/api/kyb/save',
        authenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        hasSession: !!req.session,
        sessionID: req.sessionID,
        cookiePresent: !!req.headers.cookie,
        timestamp: new Date().toISOString()
      });
      
      // Send a more detailed 401 response
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'You must be logged in to save KYB data',
        details: {
          authenticated: req.isAuthenticated(),
          hasUser: !!req.user,
          hasSession: !!req.session,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // If authenticated, log user details
    console.log('[KYB API Debug] User authenticated:', {
      userId: req.user.id,
      userEmail: req.user.email,
      companyId: req.user.company_id,
      timestamp: new Date().toISOString()
    });

    const { fileName, formData, taskId } = req.body;

    logger.debug('Save request received', {
      taskId,
      formDataKeys: Object.keys(formData),
      fileName,
      userId: req.user.id
    });

    // Get task details with full task data
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      throw new Error('Task not found');
    }

    // If created_by is missing, use the current user's ID
    if (!task.created_by && req.user?.id) {
      await db.update(tasks)
        .set({ 
          created_by: req.user.id,
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));

      task.created_by = req.user.id;
    }

    // Still check for required fields after potential update
    if (!task.created_by || !task.company_id) {
      throw new Error('Missing task user or company information');
    }

    // Get all KYB fields with their groups
    const fields = await db.select()
      .from(kybFields)
      .orderBy(kybFields.order);

    // Convert form data to CSV
    const csvData = convertResponsesToCSV(fields, formData);

    // Create file using direct DB insert instead of FileCreationService
    const timestamp = new Date();
    // Insert the file and get the ID
    const [fileId] = await db.insert(files)
      .values({
        name: fileName || `kyb_form_${taskId}_${timestamp.toISOString()}.csv`,
        content: csvData,
        type: 'text/csv',
        status: 'active',
        path: `/uploads/kyb_${taskId}_${timestamp.getTime()}.csv`,
        size: Buffer.from(csvData).length,
        version: 1,
        company_id: task.company_id,
        created_by: task.created_by,
        created_at: timestamp,
        updated_at: timestamp,
        metadata: {
          taskId,
          taskType: 'kyb',
          formVersion: '1.0',
          submissionDate: new Date().toISOString(),
          fields: fields.map(f => f.field_key)
        }
      })
      .returning({ id: files.id });
      
    if (!fileId) {
      logger.error('File creation failed', {
        taskId,
        fileName
      });
      throw new Error('Failed to create file record');
    }

    // Get company record to update available tabs
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, task.company_id));

    if (company) {
      // Add file-vault to available tabs if not already present
      const currentTabs = company.available_tabs || ['task-center'];
      if (!currentTabs.includes('file-vault')) {
        await db.update(companies)
          .set({
            available_tabs: [...currentTabs, 'file-vault'],
            updated_at: new Date()
          })
          .where(eq(companies.id, task.company_id));
      }
    }

    // Handle revenue tier update if present
    if (formData.annualRecurringRevenue) {
      const [revenueTierField] = await db.select()
        .from(kybFields)
        .where(eq(kybFields.field_key, 'annualRecurringRevenue'))
        .limit(1);

      if (revenueTierField?.validation_rules?.options) {
        // Map ARR ranges to revenue tiers
        const tierMapping = {
          'Less than $1 million': 'small',
          '$1 million - $10 million': 'medium',
          '$10 million - $50 million': 'large',
          'Greater than $50 million': 'xlarge'
        };

        const selectedTier = tierMapping[formData.annualRecurringRevenue as keyof typeof tierMapping];
        if (selectedTier && company) {
          await db.update(companies)
            .set({
              revenue_tier: selectedTier,
              updated_at: new Date()
            })
            .where(eq(companies.id, task.company_id));
        }
      }
    }

    // Update task status and metadata
    await db.update(tasks)
      .set({
        status: TaskStatus.SUBMITTED,
        progress: 100,
        updated_at: new Date(),
        metadata: {
          ...task.metadata,
          kybFormFile: fileId.id,
          submissionDate: new Date().toISOString(),
          formVersion: '1.0',
          statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.SUBMITTED]
            .filter((v, i, a) => a.indexOf(v) === i)
        }
      })
      .where(eq(tasks.id, taskId));

    let warnings = [];
    // Save responses to database
    for (const field of fields) {
      const value = formData[field.field_key];
      const status = value ? 'COMPLETE' : 'EMPTY';

      try {
        // First try to insert
        await db.insert(kybResponses)
          .values({
            task_id: taskId,
            field_id: field.id,
            response_value: value || '', // Changed from null to empty string
            status,
            version: 1,
            created_at: new Date(),
            updated_at: new Date()
          });
      } catch (err) {
        const error = err as Error;
        if (error.message.includes('duplicate key value violates unique constraint')) {
          // If duplicate, update instead
          await db.update(kybResponses)
            .set({
              response_value: value || '', // Changed from null to empty string
              status,
              version: sql`${kybResponses.version} + 1`,
              updated_at: new Date()
            })
            .where(
              and(
                eq(kybResponses.task_id, taskId),
                eq(kybResponses.field_id, field.id)
              )
            );
          warnings.push(`Updated existing response for field: ${field.field_key}`);
        } else {
          throw error;
        }
      }
    }

    logger.info('Save completed successfully', {
      taskId,
      fileId: fileId.id,
      responseCount: fields.length,
      warningCount: warnings.length
    });

    res.json({
      success: true,
      fileId: fileId.id,
      warnings: warnings.length ? warnings : undefined
    });
  } catch (error) {
    // Enhanced detailed error logging
    console.error('[KYB API Debug] Error saving KYB form', {
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      requestHeaders: {
        contentType: req.headers['content-type'],
        accept: req.headers.accept,
        cookiePresent: !!req.headers.cookie
      },
      sessionID: req.sessionID,
      authenticatedStatus: req.isAuthenticated(),
      userPresent: !!req.user,
      timestamp: new Date().toISOString()
    });
    
    logger.error('Error saving KYB form', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Set appropriate status code based on error type
    const statusCode = 
      error instanceof Error && error.message.includes('Unauthorized') ? 401 :
      error instanceof Error && error.message.includes('not found') ? 404 : 
      error instanceof Error && error.message.includes('duplicate key') ? 409 : 500;
    
    // Send more detailed error response
    res.status(statusCode).json({
      error: 'Failed to save KYB form data',
      details: error instanceof Error ? error.message : 'Unknown error',
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
    if (!req.isAuthenticated() || !req.user) {
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
