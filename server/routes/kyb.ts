import { Router } from 'express';
import { join } from 'path';
import { db } from '@db';
import { tasks, TaskStatus, kybFields, kybResponses, files, companies } from '@db/schema';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { FileCreationService } from '../services/file-creation';
import { Logger } from '../utils/logger';

const logger = new Logger('KYBRoutes');

// Add CSV conversion helper function at the top of the file
function convertResponsesToCSV(fields: any[], formData: any) {
  // CSV headers
  const headers = ['Group', 'Question', 'Answer', 'Type'];
  const rows = [headers];

  // Add data rows
  for (const field of fields) {
    rows.push([
      field.group || 'Uncategorized',
      field.display_name,
      formData[field.field_key] || '',
      field.field_type
    ]);
  }

  // Convert to CSV string
  return rows.map(row =>
    row.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(',')
  ).join('\n');
}

// Utility function to unlock security tasks after KYB is completed
const unlockSecurityTasks = async (companyId: number, kybTaskId: number, userId?: number) => {
  try {
    logger.info('Looking for dependent security assessment tasks to unlock', {
      kybTaskId,
      companyId
    });
    
    // Find security tasks for this company
    const securityTasks = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.company_id, companyId),
          eq(tasks.task_type, 'security_assessment')
        )
      );
      
    logger.info('Found potential security tasks to unlock', {
      count: securityTasks.length,
      taskIds: securityTasks.map(t => t.id)
    });
    
    // Unlock each security task that was dependent on this KYB task
    for (const securityTask of securityTasks) {
      // Check if the task is locked and if the KYB task is a prerequisite
      if (securityTask.metadata?.locked === true || 
          securityTask.metadata?.prerequisite_task_id === kybTaskId ||
          securityTask.metadata?.prerequisite_task_type === 'company_kyb') {
        
        logger.info('Unlocking security task', {
          securityTaskId: securityTask.id,
          previousMetadata: {
            locked: securityTask.metadata?.locked,
            prerequisiteTaskId: securityTask.metadata?.prerequisite_task_id
          }
        });
        
        // Update the security task to unlock it
        await db.update(tasks)
          .set({
            metadata: {
              ...securityTask.metadata,
              locked: false, // Explicitly unlock the task
              prerequisite_completed: true,
              prerequisite_completed_at: new Date().toISOString(),
              prerequisite_completed_by: userId
            },
            updated_at: new Date()
          })
          .where(eq(tasks.id, securityTask.id));
          
        logger.info('Security task unlocked successfully', {
          securityTaskId: securityTask.id
        });
      }
    }
    
    return { success: true, count: securityTasks.length };
  } catch (error) {
    logger.error('Error unlocking security tasks', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      kybTaskId,
      companyId
    });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const router = Router();

// Debug utility for logging task data
const logTaskDebug = (stage: string, task: any, extras: Record<string, any> = {}) => {
  console.log(`[KYB API Debug] ${stage}:`, {
    taskId: task?.id,
    status: task?.status,
    progress: task?.progress,
    metadata: task?.metadata ? Object.keys(task.metadata) : null,
    ...extras,
    timestamp: new Date().toISOString()
  });
};

// Get KYB fields 
router.get('/api/kyb/fields', async (req, res) => {
  try {
    logger.info('Fetching KYB fields');
    const fields = await db.select().from(kybFields).orderBy(sql`"group" ASC, "order" ASC`);
    
    logger.info('KYB fields retrieved successfully', {
      fieldCount: fields.length,
      groups: [...new Set(fields.map(f => f.group))]
    });
    
    res.json(fields);
  } catch (error) {
    logger.error('Error fetching KYB fields', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      message: "Failed to fetch KYB fields",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Endpoint to fetch KYB fields by step index
router.get('/api/form-fields/company_kyb/:stepIndex', async (req, res) => {
  try {
    const stepIndex = parseInt(req.params.stepIndex, 10);
    
    if (isNaN(stepIndex)) {
      return res.status(400).json({
        message: "Invalid step index provided",
        error: "Step index must be a valid number"
      });
    }
    
    logger.info(`Fetching KYB fields for step ${stepIndex}`);
    
    const fields = await db.select()
      .from(kybFields)
      .where(eq(kybFields.step_index, stepIndex))
      .orderBy(sql`"group" ASC, "order" ASC`);
    
    logger.info(`KYB fields for step ${stepIndex} retrieved successfully`, {
      fieldCount: fields.length,
      stepIndex,
      groups: [...new Set(fields.map(f => f.group))]
    });
    
    res.json(fields);
  } catch (error) {
    logger.error(`Error fetching KYB fields for step index`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      message: "Failed to fetch KYB fields for step",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Debug utility for logging response data
const logResponseDebug = (stage: string, responses: any[], extras: Record<string, any> = {}) => {
  console.log(`[KYB API Debug] ${stage}:`, {
    responseCount: responses.length,
    fields: responses.map(r => ({
      field: r.field_key,
      status: r.status,
      hasValue: !!r.response_value
    })),
    ...extras,
    timestamp: new Date().toISOString()
  });
};

// Debug utility for logging file operations
const logFileDebug = (stage: string, data: Record<string, any>) => {
  console.log(`[KYB File Debug] ${stage}:`, {
    ...data,
    timestamp: new Date().toISOString()
  });
};

// Get KYB task by company name
router.get('/api/tasks/kyb/:companyName?', async (req, res) => {
  try {
    const { companyName } = req.params;

    console.log('[KYB API Debug] Task lookup request:', {
      companyName,
      timestamp: new Date().toISOString()
    });

    // If no company name provided, return all KYB tasks
    if (!companyName) {
      const kybTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.task_type, 'company_kyb'));
      return res.json(kybTasks[0] || null);
    }

    // Format company name by removing the 'kyb-' prefix if present
    const formattedCompanyName = companyName
      .replace(/^kyb-/, '')  // Remove 'kyb-' prefix if present
      .replace(/-/g, ' ');   // Replace dashes with spaces

    console.log('[KYB API Debug] Searching for company:', {
      original: companyName,
      formatted: formattedCompanyName,
      timestamp: new Date().toISOString()
    });

    const [task] = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.task_type, 'company_kyb'),
          ilike(tasks.title, `%${formattedCompanyName}%`)
        )
      );

    if (!task) {
      console.log('[KYB API Debug] Task not found:', {
        companyName: formattedCompanyName,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ error: 'KYB task not found' });
    }

    logTaskDebug('Found task', task);

    // Get all KYB responses for this task
    const responses = await db.select()
      .from(kybResponses)
      .where(eq(kybResponses.task_id, task.id));

    logResponseDebug('Retrieved responses', responses, {
      taskId: task.id
    });

    // Transform responses into form data
    const formData: Record<string, any> = {};
    for (const response of responses) {
      if (response.response_value !== null) {
        formData[response.field_key] = response.response_value;
      }
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

    res.json(transformedTask);
  } catch (error) {
    console.error('[KYB API Debug] Error fetching KYB task:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Failed to fetch KYB task' });
  }
});

// Save progress for KYB form
router.post('/api/kyb/progress', async (req, res) => {
  try {
    const { taskId, progress, formData, fieldUpdates, status } = req.body;

    // Even more detailed logging to debug form saving issues
    console.log('===============================================');
    console.log(`[SERVER DEBUG] KYB PROGRESS SAVE REQUEST RECEIVED at ${new Date().toISOString()}`);
    console.log('===============================================');
    console.log(`Task ID: ${taskId}`);
    console.log(`Progress: ${progress}`);
    console.log(`Status: ${status || 'not provided'}`);
    console.log(`Field count: ${formData ? Object.keys(formData).length : 0}`);
    
    // Log a sampling of field values for verification
    if (formData) {
      console.log('Sample form data values:');
      Object.entries(formData).slice(0, 5).forEach(([key, value]) => {
        console.log(`- ${key}: "${value}" (${typeof value})`);
      });
    }
    
    console.log('Request details:');
    console.log(`- Method: ${req.method}`);
    console.log(`- Content-Type: ${req.headers['content-type']}`);
    console.log(`- Content-Length: ${req.headers['content-length']}`);
    console.log('===============================================');

    if (!taskId) {
      console.warn('[SERVER DEBUG] ERROR: Missing task ID in request');
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
    
    console.log('===============================================');
    console.log(`[SERVER DEBUG] PROCESSING FORM DATA FIELDS AT ${timestamp.toISOString()}`);
    console.log(`[SERVER DEBUG] Task ID: ${taskId}, Field count: ${Object.keys(formData).length}`);
    console.log('===============================================');

    for (const [fieldKey, value] of Object.entries(formData)) {
      const fieldId = fieldMap.get(fieldKey);
      
      if (!fieldId) {
        console.error(`[SERVER DEBUG] ERROR: Field not found in database schema: "${fieldKey}"`);
        continue;
      }

      processedFields.add(fieldKey);
      
      // Important change: Always store empty string values directly in the database
      // Never convert empty strings to null - this prevents the form from handling them correctly
      const originalValue = value;
      const responseValue = value === null ? '' : String(value);
      const status = responseValue === '' ? 'EMPTY' : 'COMPLETE';
      
      console.log(`[SERVER DEBUG] Processing field: "${fieldKey}" (ID: ${fieldId})`);
      console.log(`[SERVER DEBUG] Original value: ${originalValue === '' ? '(empty string)' : originalValue === null ? '(null)' : originalValue}`);
      console.log(`[SERVER DEBUG] Normalized value: "${responseValue}" (${typeof responseValue})`);
      console.log(`[SERVER DEBUG] Field status: ${status}`);

      try {
        // Check if response exists
        const [existingResponse] = await db.select()
          .from(kybResponses)
          .where(
            and(
              eq(kybResponses.task_id, taskId),
              eq(kybResponses.field_id, fieldId)
            )
          );
          
        console.log(`[SERVER DEBUG] Existing response found: ${existingResponse ? 'YES' : 'NO'}`);

        if (existingResponse) {
          try {
            // Update existing response
            console.log(`[SERVER DEBUG] UPDATING field "${fieldKey}" in database`);
            console.log(`[SERVER DEBUG] - Old value: "${existingResponse.response_value}" (${typeof existingResponse.response_value})`);
            console.log(`[SERVER DEBUG] - New value: "${responseValue}" (${typeof responseValue})`);
            console.log(`[SERVER DEBUG] - Old status: ${existingResponse.status}, New status: ${status}`);
            
            await db.update(kybResponses)
              .set({
                response_value: responseValue,
                status,
                version: existingResponse.version + 1,
                updated_at: timestamp
              })
              .where(eq(kybResponses.id, existingResponse.id));

            console.log(`[SERVER DEBUG] ✅ UPDATE SUCCESSFUL for field "${fieldKey}" (ID: ${existingResponse.id})`);
          } catch (error) {
            console.error(`[SERVER DEBUG] ❌ DATABASE ERROR updating response for field "${fieldKey}":`);
            console.error(error);
          }
        } else {
          try {
            // Create new response
            console.log(`[SERVER DEBUG] INSERTING new response for field "${fieldKey}"`);
            console.log(`[SERVER DEBUG] - Value: "${responseValue}" (${typeof responseValue})`);
            console.log(`[SERVER DEBUG] - Status: ${status}`);
            
            const result = await db.insert(kybResponses)
              .values({
                task_id: taskId,
                field_id: fieldId,
                response_value: responseValue,
                status,
                version: 1,
                created_at: timestamp,
                updated_at: timestamp
              });

            console.log(`[SERVER DEBUG] ✅ INSERT SUCCESSFUL for field "${fieldKey}"`);
          } catch (error) {
            console.error(`[SERVER DEBUG] ❌ DATABASE ERROR inserting response for field "${fieldKey}":`);
            console.error(error);
          }
        }
      } catch (error) {
        console.error(`[SERVER DEBUG] ❌ ERROR processing field "${fieldKey}":`);
        console.error(error);
      }
      
      console.log(`[SERVER DEBUG] --- Finished processing field "${fieldKey}" ---`);
      console.log('');
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
        // Explicitly set value to empty string instead of null
        // This resolves issues with form field deletion
        await db.update(kybResponses)
          .set({
            response_value: '',  // Use empty string instead of null
            status: 'EMPTY',
            version: 1,
            updated_at: timestamp
          })
          .where(eq(kybResponses.id, response.response_id));

        console.log('[KYB API Debug] Cleared missing field:', {
          fieldKey: response.field_key,
          oldValue: response.response_value,
          newValue: '',  // Record empty string value for debugging
          timestamp: timestamp.toISOString()
        });
      }
    }

    // Determine appropriate status based on explicit status provided or progress
    let newStatus = existingTask.status;
    
    // If client provided an explicit status, use that
    if (req.body.status) {
      console.log('[KYB API Debug] Using client-provided status:', req.body.status);
      newStatus = req.body.status;
    } 
    // Otherwise calculate based on progress
    else {
      if (progress === 0) {
        newStatus = TaskStatus.NOT_STARTED;
      } else if (progress < 100) {
        newStatus = TaskStatus.IN_PROGRESS;
      } else if (progress === 100) {
        newStatus = TaskStatus.READY_FOR_SUBMISSION;
      }
      console.log('[KYB API Debug] Calculated status from progress:', { 
        progress, 
        calculatedStatus: newStatus 
      });
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
      if (response.response_value !== null) {
        updatedFormData[response.field_key] = response.response_value;
      }
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
      if (response.response_value !== null) {
        formData[response.field_key] = response.response_value;
      }
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
      progress: Math.min(task.progress || 0, 100),
      status: task.status // Include task status in the response
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

    // Create file using FileCreationService
    const fileCreationResult = await FileCreationService.createFile({
      name: fileName || `kyb_form_${taskId}_${new Date().toISOString()}.csv`,
      content: csvData,
      type: 'text/csv',
      userId: task.created_by,
      companyId: task.company_id,
      metadata: {
        taskId,
        taskType: 'kyb',
        formVersion: '1.0',
        submissionDate: new Date().toISOString(),
        fields: fields.map(f => f.field_key)
      },
      status: 'uploaded'
    });

    if (!fileCreationResult.success) {
      logger.error('File creation failed', {
        error: fileCreationResult.error,
        taskId,
        fileName
      });
      throw new Error(fileCreationResult.error);
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
          kybFormFile: fileCreationResult.fileId,
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
            response_value: value || null,
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
              response_value: value || null,
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
      fileId: fileCreationResult.fileId,
      responseCount: fields.length,
      warningCount: warnings.length
    });

    res.json({
      success: true,
      fileId: fileCreationResult.fileId,
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
      if (response.response_value !== null) {
        formData[response.field_key] = response.response_value;
      }
    }

    console.log('[KYB API Debug] Retrieved task data:', {
      id: task.id,
      responseCount: responses.length,
      progress: task.progress,
      status: task.status,
      formDataKeys: Object.keys(formData),
      formData
    });

    // Return saved form data and progress with task status
    res.json({
      formData,
      progress: Math.min(task.progress || 0, 100),
      status: task.status // Include task status in the response
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

// Add the /api/kyb/submit/:taskId endpoint that the client is expecting to use
router.post('/api/kyb/submit/:taskId', async (req, res) => {
  try {
    console.log('[KYB API Debug] KYB submit endpoint triggered:', {
      endpoint: '/api/kyb/submit/:taskId',
      taskId: req.params.taskId,
      method: 'POST',
      url: req.url,
      headers: {
        contentType: req.headers['content-type'],
        accept: req.headers.accept,
        cookie: !!req.headers.cookie
      },
      timestamp: new Date().toISOString()
    });
    
    // Check if user is authenticated
    if (!req.isAuthenticated() || !req.user) {
      console.error('[KYB API Debug] Unauthorized access attempt', {
        path: `/api/kyb/submit/${req.params.taskId}`,
        authenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        hasSession: !!req.session,
        sessionID: req.sessionID,
        cookiePresent: !!req.headers.cookie,
        timestamp: new Date().toISOString()
      });
      
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'You must be logged in to submit KYB data',
        details: {
          authenticated: req.isAuthenticated(),
          hasUser: !!req.user,
          hasSession: !!req.session,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Extract taskId from params and data from the request body
    const taskId = parseInt(req.params.taskId);
    const { fileName, formData } = req.body;
    
    console.log('[KYB API Debug] Submit request received:', {
      taskId,
      formDataKeys: Object.keys(formData || {}),
      fileName,
      userId: req.user.id
    });

    // Get task details
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      throw new Error('Task not found');
    }

    // Check for required fields
    if (!task.created_by || !task.company_id) {
      throw new Error('Missing task user or company information');
    }

    // Get all KYB fields with their groups
    const fields = await db.select()
      .from(kybFields)
      .orderBy(kybFields.order);

    // Convert form data to CSV
    const csvData = convertResponsesToCSV(fields, formData);

    // Create file using FileCreationService
    const fileCreationResult = await FileCreationService.createFile({
      name: fileName || `kyb_form_${taskId}_${new Date().toISOString()}.csv`,
      content: csvData,
      type: 'text/csv',
      userId: task.created_by,
      companyId: task.company_id,
      metadata: {
        taskId,
        taskType: 'kyb',
        formVersion: '1.0',
        submissionDate: new Date().toISOString(),
        fields: fields.map(f => f.field_key)
      },
      status: 'uploaded'
    });

    if (!fileCreationResult.success) {
      logger.error('File creation failed', {
        error: fileCreationResult.error,
        taskId,
        fileName
      });
      throw new Error(fileCreationResult.error);
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
          kybFormFile: fileCreationResult.fileId,
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
            response_value: value || null,
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
              response_value: value || null,
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

    logger.info('Submit completed successfully', {
      taskId,
      fileId: fileCreationResult.fileId,
      responseCount: fields.length,
      warningCount: warnings.length
    });

    // After KYB is completed, unlock any security assessment tasks
    const unlockResult = await unlockSecurityTasks(task.company_id, taskId, req.user?.id);
    
    logger.info('Security task unlock operation completed', {
      result: unlockResult,
      success: unlockResult.success,
      count: unlockResult.count,
      companyId: task.company_id,
      kybTaskId: taskId
    });

    res.json({
      success: true,
      fileId: fileCreationResult.fileId,
      warnings: warnings.length ? warnings : undefined,
      securityTasksUnlocked: unlockResult.success ? unlockResult.count : 0
    });
  } catch (error) {
    // Enhanced detailed error logging
    console.error('[KYB API Debug] Error submitting KYB form', {
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
    
    logger.error('Error submitting KYB form', {
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
      error: 'Failed to submit KYB form data',
      details: error instanceof Error ? error.message : 'Unknown error',
      statusCode,
      timestamp: new Date().toISOString()
    });
  }
});

// Add download endpoint after the existing routes
router.get('/api/kyb/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const format = (req.query.format as string)?.toLowerCase() || 'csv';
    
    // Debug logging
    logger.debug('Download request received', {
      fileId,
      format,
      timestamp: new Date().toISOString()
    });

    // Get file from database
    const [file] = await db.select()
      .from(files)
      .where(eq(files.id, parseInt(fileId)));

    if (!file) {
      logger.error('File not found in database', { fileId });
      return res.status(404).json({ error: 'File not found' });
    }
    
    logger.debug('File found', {
      fileId,
      fileType: file.type,
      fileName: file.name,
      fileSize: file.size
    });

    // Process the file content directly from the path field (which contains the actual content)
    const fileContent = file.path;

    // Set response headers based on format
    switch (format) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${file.name || 'kyb_form.csv'}`);
        
        // If file is already CSV, send its content directly
        if (file.type === 'text/csv') {
          return res.send(fileContent);
        }
        
        // If file is JSON, convert it to CSV
        try {
          const jsonData = JSON.parse(fileContent);
          // Convert JSON to CSV format
          const csvRows = [['Group', 'Question', 'Answer', 'Type']];
          Object.entries(jsonData.responses || {}).forEach(([group, fields]: [string, any]) => {
            Object.entries(fields).forEach(([key, data]: [string, any]) => {
              csvRows.push([
                group,
                data.question,
                data.answer || '',
                data.type || 'text'
              ]);
            });
          });
          return res.send(csvRows.map(row => row.join(',')).join('\n'));
        } catch (jsonError) {
          logger.error('JSON parsing error', { error: jsonError });
          return res.send(fileContent); // Fallback to sending the raw content
        }

      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${file.name || 'kyb_form.json'}`);
        
        // If already JSON, send directly; otherwise format it
        try {
          const parsedContent = file.type === 'application/json' 
            ? fileContent 
            : JSON.stringify(JSON.parse(fileContent), null, 2);
          return res.send(parsedContent);
        } catch (jsonError) {
          logger.error('JSON processing error', { error: jsonError });
          return res.send(fileContent); // Fallback to sending the raw content
        }

      case 'txt':
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=${file.name || 'kyb_form.txt'}`);
        
        try {
          // Handle different data formats
          let data;
          try {
            data = file.type === 'application/json' ? JSON.parse(fileContent) : { responses: {} };
          } catch (parseError) {
            logger.warn('Text conversion parsing error, using raw content', { error: parseError });
            return res.send(fileContent);
          }
          
          const textContent = Object.entries(data.responses || {}).map(([group, fields]: [string, any]) => {
            return `\n${group}:\n${'='.repeat(group.length)}\n` +
              Object.entries(fields).map(([key, data]: [string, any]) =>
                `${data.question}\nAnswer: ${data.answer || 'Not provided'}\n`
              ).join('\n');
          }).join('\n');
          
          return res.send(textContent || fileContent);
        } catch (textError) {
          logger.error('Text conversion error', { error: textError });
          return res.send(fileContent); // Fallback to sending the raw content
        }

      default:
        return res.status(400).json({ error: 'Invalid format specified' });
    }
  } catch (error) {
    logger.error('Error processing download', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    console.error('[KYB API Debug] Error processing download:', error);
    res.status(500).json({ error: 'Failed to process download' });
  }
});

export default router;