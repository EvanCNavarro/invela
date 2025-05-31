import { Router } from 'express';
import { join } from 'path';
import { db } from '@db';
import { tasks, TaskStatus, kybFields, kybResponses, files, companies } from '@db/schema';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
// Import using actual module name conventions
import * as FileCreationService from '../services/fileCreation';
import { logger } from '../utils/logger';
import * as WebSocketService from '../services/websocket';
import { requireAuth } from '../middleware/auth';
import { CompanyTabsService } from '../services/companyTabsService';
// Import CompanyTabsService directly, we don't need the patch function anymore
// since we're using the service directly

// Add namespace context to logs
const logContext = { service: 'KYBRoutes' };

// Add CSV parsing and conversion helper functions at the top of the file
async function loadFormDataFromCsv(fileId: number) {
  try {
    console.log(`[SERVER DEBUG] Attempting to load form data from CSV file ID: ${fileId}`);
    
    // Query the file content from the database
    const [file] = await db.select()
      .from(files)
      .where(eq(files.id, fileId));
      
    if (!file) {
      console.log(`[SERVER DEBUG] No file found for file ID: ${fileId}`);
      return null;
    }
    
    // Check if we have the file path or direct content
    let csvContent: string;
    
    if (file.path) {
      console.log(`[SERVER DEBUG] File has path: ${file.path}`);
      
      // Try to read the file directly from the path field
      try {
        // For metadata-based CSV storage
        if (file.metadata && file.metadata.csv_content) {
          console.log(`[SERVER DEBUG] Found CSV content in file metadata`);
          csvContent = file.metadata.csv_content.toString();
        } 
        // For path-based CSV storage
        else {
          // Check if the path is a base64 encoded content
          if (file.path.startsWith('data:')) {
            console.log(`[SERVER DEBUG] Path appears to be base64 encoded content`);
            // Extract the content part from the data URL
            const base64Content = file.path.split(',')[1];
            if (base64Content) {
              csvContent = Buffer.from(base64Content, 'base64').toString('utf-8');
            } else {
              throw new Error('Invalid data URL format');
            }
          } 
          // Try to use path field directly as content
          else {
            csvContent = file.path;
          }
        }
      } catch (error) {
        console.error(`[SERVER DEBUG] Error reading file content from path:`, error);
        return null;
      }
    } else {
      console.log(`[SERVER DEBUG] No file path or content found for file ID: ${fileId}`);
      return null;
    }
    const rows = csvContent.split('\n').map(row => {
      // Handle properly escaped CSV values
      const result = [];
      let inQuotes = false;
      let current = '';
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"') {
          if (inQuotes && row[i + 1] === '"') {
            // Handle escaped quotes
            current += '"';
            i++;
          } else {
            // Toggle quotes state
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // End of cell
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add the last cell
      result.push(current);
      return result;
    });
    
    // Extract headers and data
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    console.log(`[SERVER DEBUG] CSV parsed: ${dataRows.length} rows, headers: ${headers.join(', ')}`);
    
    // Find the indices of important columns
    const questionColIndex = headers.findIndex(h => h === 'Question' || h === 'Question Text');
    const answerColIndex = headers.findIndex(h => h === 'Answer');
    const fieldKeyColIndex = headers.findIndex(h => h === 'Field Key');
    
    if (answerColIndex === -1) {
      console.log(`[SERVER DEBUG] CSV missing Answer column`);
      return null;
    }
    
    // Get all KYB fields for field_key mapping
    const fields = await db.select()
      .from(kybFields);
      
    const fieldKeyToDisplayName: Record<string, string> = {};
    const displayNameToFieldKey: Record<string, string> = {};
    
    fields.forEach(field => {
      fieldKeyToDisplayName[field.field_key] = field.display_name;
      displayNameToFieldKey[field.display_name.toLowerCase()] = field.field_key;
    });
    
    // Extract form data
    const formData: Record<string, any> = {};
    
    for (const row of dataRows) {
      if (row.length <= Math.max(questionColIndex, answerColIndex, fieldKeyColIndex)) {
        // Skip incomplete rows
        continue;
      }
      
      let fieldKey: string | null = null;
      
      // First try to get the field_key directly if that column exists
      if (fieldKeyColIndex !== -1 && row[fieldKeyColIndex]) {
        fieldKey = row[fieldKeyColIndex];
      } 
      // Otherwise try to map from the question text to field_key
      else if (questionColIndex !== -1 && row[questionColIndex]) {
        const questionText = row[questionColIndex].trim();
        fieldKey = displayNameToFieldKey[questionText.toLowerCase()];
        
        // If not found, try searching partial matches
        if (!fieldKey) {
          // Find the closest match by normalizing and comparing
          const normalizedQuestion = questionText.toLowerCase();
          for (const field of fields) {
            if (normalizedQuestion.includes(field.display_name.toLowerCase()) || 
                field.display_name.toLowerCase().includes(normalizedQuestion)) {
              fieldKey = field.field_key;
              break;
            }
          }
        }
      }
      
      if (fieldKey && row[answerColIndex] !== undefined && row[answerColIndex] !== null) {
        const answerValue = row[answerColIndex].trim();
        if (answerValue && answerValue !== 'Not provided') {
          formData[fieldKey] = answerValue;
        }
      }
    }
    
    console.log(`[SERVER DEBUG] Extracted ${Object.keys(formData).length} field values from CSV`);
    
    return { 
      formData,
      success: Object.keys(formData).length > 0
    };
  } catch (error) {
    console.error('[SERVER DEBUG] Error loading form data from CSV:', error);
    return null;
  }
}

// Add CSV conversion helper function at the top of the file
function convertResponsesToCSV(fields: any[], formData: any) {
  console.log('[CSV Generation] Starting CSV conversion with', { 
    fieldsCount: fields.length, 
    formDataKeys: Object.keys(formData) 
  });
  
  // CSV headers
  const headers = ['Question Number', 'Group', 'Question', 'Answer', 'Type'];
  const rows = [headers];

  // Add data rows
  let questionNumber = 1;
  const totalQuestions = fields.length;
  
  for (const field of fields) {
    // Skip fields without a valid field_key
    if (!field.field_key) {
      console.log('[CSV Generation] Skipping field without field_key:', field);
      continue;
    }
    
    // Just use the number itself (1, 2, 3, etc.) instead of fraction format
    const formattedNumber = `${questionNumber}`;
    
    // Improved answer handling with type safety
    const rawAnswer = formData[field.field_key];
    let answer = '';
    
    // Handle different data types properly
    if (rawAnswer !== undefined && rawAnswer !== null) {
      if (typeof rawAnswer === 'object') {
        try {
          answer = JSON.stringify(rawAnswer);
        } catch (e) {
          answer = String(rawAnswer);
        }
      } else {
        answer = String(rawAnswer); // Convert numbers, booleans, etc. to strings
      }
    }
    
    // Log potentially problematic fields for debugging
    if (answer.includes('\n') || answer.includes(',') || answer.includes('"')) {
      logger.debug('[CSV Generation] Special character detection', {
        fieldKey: field.field_key,
        hasNewline: answer.includes('\n'),
        hasComma: answer.includes(','),
        hasQuote: answer.includes('"'),
        length: answer.length
      });
    }
    
    rows.push([
      formattedNumber,
      field.group || 'Uncategorized',
      field.display_name || field.label || field.question || field.field_key,
      answer, // Now safely handled
      field.field_type || 'text'
    ]);
    
    questionNumber++;
  }

  // Convert to CSV string - properly handle all special characters
  const csvContent = rows.map(row => 
    row.map(cell => {
      // Properly escape cells with special characters (commas, quotes, newlines)
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell.replace(/"/g, '""')}"`; // Double quotes to escape quotes
      }
      return String(cell); // Ensure all values are strings
    }).join(',')
  ).join('\n');
  
  console.log('[CSV Generation] CSV generation complete', {
    rowCount: rows.length,
    byteSize: Buffer.from(csvContent).length
  });
  
  return csvContent;
}

// Utility function to unlock security tasks after KYB is completed
const unlockSecurityTasks = async (companyId: number, kybTaskId: number, userId?: number) => {
  try {
    logger.info('Looking for dependent security assessment tasks to unlock', {
      kybTaskId,
      companyId
    });
    
    // Find both security_assessment and sp_ky3p_assessment tasks for this company
    const securityTasks = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.company_id, companyId),
          or(
            eq(tasks.task_type, 'security_assessment'),
            eq(tasks.task_type, 'sp_ky3p_assessment')
          )
        )
      );
      
    logger.info('Found potential security tasks to unlock', {
      count: securityTasks.length,
      taskIds: securityTasks.map(t => t.id),
      taskTypes: securityTasks.map(t => t.task_type)
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

// Dynamic task unlocking check - used when accessing the Task Center
export const checkAndUnlockSecurityTasks = async (companyId: number, userId?: number) => {
  try {
    logger.info('Performing dynamic task unlocking check for company', {
      companyId,
      userId
    });
    
    // First, check if there's a completed KYB task for this company
    const kybTasks = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.company_id, companyId),
          eq(tasks.task_type, 'company_kyb'),
          or(
            eq(tasks.status, 'submitted'),
            eq(tasks.status, 'completed')
          )
        )
      );
    
    if (kybTasks.length === 0) {
      logger.info('No completed KYB tasks found, skipping security task unlock check', {
        companyId
      });
      return { success: true, unlocked: false, message: 'No completed KYB tasks found' };
    }
    
    logger.info('Found completed KYB tasks, checking security tasks to unlock', {
      companyId,
      kybTaskCount: kybTasks.length
    });
    
    // Get the first completed KYB task (should usually be only one)
    const kybTask = kybTasks[0];
    
    // Find security tasks for this company that might need unlocking
    const securityTasks = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.company_id, companyId),
          or(
            eq(tasks.task_type, 'security_assessment'),
            eq(tasks.task_type, 'sp_ky3p_assessment')
          )
        )
      );
    
    // Exit early if no security tasks found
    if (securityTasks.length === 0) {
      logger.info('No security tasks found for company', { companyId });
      return { success: true, unlocked: false, message: 'No security tasks found' };
    }
    
    // Count how many tasks need unlocking
    const lockedTasks = securityTasks.filter(task => 
      task.metadata?.locked === true || 
      task.metadata?.prerequisite_completed !== true
    );
    
    if (lockedTasks.length === 0) {
      logger.info('All security tasks are already unlocked', { companyId });
      return { success: true, unlocked: false, message: 'All security tasks already unlocked' };
    }
    
    logger.info('Found locked security tasks that need unlocking', {
      companyId,
      lockedCount: lockedTasks.length,
      taskIds: lockedTasks.map(t => t.id),
      taskTypes: lockedTasks.map(t => t.task_type)
    });
    
    // Unlock each security task
    for (const securityTask of lockedTasks) {
      logger.info('Dynamically unlocking security task during task center access', {
        securityTaskId: securityTask.id,
        securityTaskType: securityTask.task_type,
        kybTaskId: kybTask.id
      });
      
      // Update the security task to unlock it
      await db.update(tasks)
        .set({
          metadata: {
            ...securityTask.metadata,
            locked: false,
            prerequisite_completed: true,
            prerequisite_completed_at: new Date().toISOString(),
            prerequisite_completed_by: userId,
            unlocked_by: 'dynamic_check' // Mark that this was unlocked by the dynamic check
          },
          updated_at: new Date()
        })
        .where(eq(tasks.id, securityTask.id));
        
      logger.info('Security task unlocked successfully', {
        securityTaskId: securityTask.id
      });
    }
    
    return { 
      success: true, 
      unlocked: true, 
      count: lockedTasks.length, 
      message: `Unlocked ${lockedTasks.length} security tasks`
    };
  } catch (error) {
    logger.error('Error in dynamic security task unlock check', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      companyId
    });
    return { 
      success: false, 
      unlocked: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
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
/**
 * Bulk update endpoint for KYB form fields
 * This endpoint handles bulk updating of multiple fields at once,
 * primarily used for demo auto-fill functionality
 */
router.post('/api/kyb/bulk-update/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { responses } = req.body;
    
    logger.info(`Bulk updating KYB form fields for task ${taskId}`, {
      fieldCount: Object.keys(responses).length
    });
    
    if (!taskId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Task ID is required' 
      });
    }
    
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({ 
        success: false, 
        error: 'Responses object is required' 
      });
    }
    
    // Get the task to make sure it exists
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));
      
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
    }
    
    // Get the user ID either from the authenticated user or the task creator
    const userId = req.user?.id || task.created_by;
    
    // Process each field in the responses object
    const updatePromises = Object.entries(responses).map(async ([fieldKey, value]) => {
      // Get the field definition to make sure it exists
      const [field] = await db.select()
        .from(kybFields)
        .where(eq(kybFields.field_key, fieldKey));
        
      if (!field) {
        logger.warn(`Field ${fieldKey} not found in KYB fields`);
        return null;
      }
      
      // Check if response already exists
      const [existingResponse] = await db.select()
        .from(kybResponses)
        .where(and(
          eq(kybResponses.task_id, parseInt(taskId)),
          eq(kybResponses.field_id, field.id)
        ));
        
      if (existingResponse) {
        // Update existing response
        return db.update(kybResponses)
          .set({
            response_value: String(value),
            updated_at: new Date(),
            updated_by: userId,
            version: sql`${kybResponses.version} + 1`
          })
          .where(eq(kybResponses.id, existingResponse.id));
      } else {
        // Create new response
        return db.insert(kybResponses)
          .values({
            task_id: parseInt(taskId),
            field_id: field.id,
            field_key: fieldKey,
            response_value: String(value),
            created_by: userId,
            updated_by: userId,
            version: 1
          });
      }
    });
    
    // Execute all updates in parallel
    await Promise.all(updatePromises);
    
    // STANDARDIZED PROGRESS CALCULATION
    // Get all responses for this task for detailed logging
    const [totalResponses] = await db.select({ count: sql<number>`count(*)` })
      .from(kybResponses)
      .where(eq(kybResponses.task_id, parseInt(taskId)));
    
    // Get COMPLETE status responses for this task
    const [completedResponses] = await db.select({ count: sql<number>`count(*)` })
      .from(kybResponses)
      .where(and(
        eq(kybResponses.task_id, parseInt(taskId)),
        eq(kybResponses.status, 'COMPLETE')
      ));
    
    // Get total field count
    const [fieldsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(kybFields);
    
    // Calculate progress percentage based on COMPLETE fields (not just any response)
    const completedCount = completedResponses?.count || 0;
    const totalFields = fieldsCount?.count || 1;
    const progressPercentage = Math.min(
      Math.round((completedCount / totalFields) * 100),
      99 // Cap at 99% - final submission sets to 100%
    );
    
    // Import the standardized status determination from utils/progress
    const { determineStatusFromProgress } = await import('../utils/progress');
    
    // Get current task information to update status correctly
    const [existingTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));
    
    if (!existingTask) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Determine the appropriate status based on progress
    // Always preserve SUBMITTED status if the task was previously submitted
    const newStatus = determineStatusFromProgress(
      progressPercentage, 
      existingTask.status as any, // Cast to match the expected type
      [], // No form responses needed for simple progress update
      existingTask.metadata || {} // Pass existing metadata
    );
    
    // Log progress calculation for better debugging
    logger.info('[KYB-ROUTES] Progress calculation', {
      taskId,
      completedCount,
      totalFields,
      calculatedProgress: progressPercentage,
      calculatedStatus: newStatus,
      totalResponses: totalResponses?.count || 0
    });
    
    // Check if status has changed
    const statusChanged = existingTask.status !== newStatus;
    
    // Update task progress with new status_changed_at field if status is changing
    await db.update(tasks)
      .set({
        progress: progressPercentage,
        status: newStatus,
        updated_at: new Date(),
        // Add status_changed_at timestamp if status changed
        ...(statusChanged ? { status_changed_at: new Date() } : {})
      })
      .where(eq(tasks.id, parseInt(taskId)));
    
    // Broadcast the progress update via WebSocket
    try {
      const { broadcastProgressUpdate } = await import('../utils/progress');
      broadcastProgressUpdate(parseInt(taskId), progressPercentage, newStatus as any, existingTask.metadata || {});
    } catch (broadcastError) {
      logger.error('[KYB-ROUTES] Error broadcasting progress update:', broadcastError);
      // Continue even if broadcast fails
    }
    
    return res.status(200).json({
      success: true,
      message: `Updated ${Object.keys(responses).length} fields`,
      progress: progressPercentage,
      status: newStatus
    });
    
  } catch (error) {
    logger.error('Error in bulk update endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error processing bulk update'
    });
  }
});

router.post('/api/kyb/progress', async (req, res) => {
  try {
    const { taskId, formData, fieldUpdates, status } = req.body;
    // Extract progress as a mutable variable
    let calculatedProgress = req.body.progress;

    // Even more detailed logging to debug form saving issues
    console.log('===============================================');
    console.log(`[SERVER DEBUG] KYB PROGRESS SAVE REQUEST RECEIVED at ${new Date().toISOString()}`);
    console.log('===============================================');
    console.log(`Task ID: ${taskId}`);
    console.log(`Progress: ${calculatedProgress}`);
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

    // CRITICAL DEBUG - Dump the entire form data object
    console.log('[SERVER DEBUG] COMPLETE FORM DATA DUMP:');
    Object.entries(formData).forEach(([key, val]) => {
      console.log(`[SERVER DEBUG] ${key}: "${val}" (${typeof val})`);
    });
    console.log('[SERVER DEBUG] END OF FORM DATA DUMP');
    
    // CRITICAL ISSUE CHECK: Look for any fields with value "asdf" for debugging
    const asdfFields = Object.entries(formData)
      .filter(([key, val]) => val === 'asdf')
      .map(([key]) => key);
      
    if (asdfFields.length > 0) {
      console.log(`[SERVER DEBUG] ⚠️ WARNING: Found ${asdfFields.length} fields with value "asdf":`);
      console.log(`[SERVER DEBUG] ${asdfFields.join(', ')}`);
      console.log('[SERVER DEBUG] This may indicate a data issue in the client or database');
    } else {
      console.log('[SERVER DEBUG] No fields with value "asdf" found in incoming data');
    }

    for (const [fieldKey, value] of Object.entries(formData)) {
      const fieldId = fieldMap.get(fieldKey);
      
      if (!fieldId) {
        console.error(`[SERVER DEBUG] ERROR: Field not found in database schema: "${fieldKey}"`);
        continue;
      }

      processedFields.add(fieldKey);
      
      // CRITICAL FIX: Ensure we properly handle all types of input values
      // Use more robust type conversion to ensure we process values correctly
      let originalValue = value;
      let responseValue;
      
      // Handle different value types properly
      if (value === null || value === undefined) {
        responseValue = ''; // Store empty string for null/undefined values
      } else if (typeof value === 'string') {
        responseValue = value; // Keep strings as-is
      } else {
        // Convert non-string values to strings
        responseValue = String(value);
      }
      
      const status = responseValue === '' ? 'EMPTY' : 'COMPLETE';
      
      console.log(`[SERVER DEBUG] Processing field: "${fieldKey}" (ID: ${fieldId})`);
      console.log(`[SERVER DEBUG] Original value: ${
        originalValue === '' ? '(empty string)' : 
        originalValue === null ? '(null)' : 
        originalValue === undefined ? '(undefined)' : 
        originalValue
      }`);
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
            
            // CRITICAL: Verify the field update contains the correct value before executing
            console.log(`[SERVER DEBUG] ABOUT TO UPDATE - DOUBLE CHECK VALUES:`);
            console.log(`[SERVER DEBUG] - field_key: ${fieldKey}`);
            console.log(`[SERVER DEBUG] - field_id: ${fieldId}`);
            console.log(`[SERVER DEBUG] - response_value: "${responseValue}"`);
            
            await db.update(kybResponses)
              .set({
                response_value: responseValue,
                status,
                version: existingResponse.version + 1,
                updated_at: timestamp
              })
              .where(eq(kybResponses.id, existingResponse.id));

            // Verify the update with a select query
            const [verifiedUpdate] = await db.select()
              .from(kybResponses)
              .where(eq(kybResponses.id, existingResponse.id));
              
            console.log(`[SERVER DEBUG] ✅ UPDATE VERIFICATION for field "${fieldKey}":`);
            console.log(`[SERVER DEBUG] - Expected: "${responseValue}"`);
            console.log(`[SERVER DEBUG] - Actual: "${verifiedUpdate?.response_value}"`);
            console.log(`[SERVER DEBUG] - Match: ${verifiedUpdate?.response_value === responseValue ? 'YES' : 'NO'}`);
            
            if (verifiedUpdate?.response_value !== responseValue) {
              console.error(`[SERVER DEBUG] ❌ UPDATE VERIFICATION FAILED - values don't match!`);
            } else {
              console.log(`[SERVER DEBUG] ✅ UPDATE SUCCESSFUL for field "${fieldKey}" (ID: ${existingResponse.id})`);
              
              // Special handling for legalEntityName field - broadcast via WebSocket to all clients
              // This ensures all clients have the most up-to-date business name
              if (fieldKey === 'legalEntityName') {
                console.log(`[SERVER DEBUG] Broadcasting legalEntityName update via WebSocket: "${responseValue}"`);
                try {
                  const { broadcastFieldUpdate } = await import('../utils/progress');
                  broadcastFieldUpdate(taskId, fieldKey, responseValue, fieldId);
                } catch (wsError) {
                  console.error(`[SERVER DEBUG] Error broadcasting field update:`, wsError);
                }
              }
            }
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

            // Verify the insert with a select query
            const [verifiedInsert] = await db.select()
              .from(kybResponses)
              .where(
                and(
                  eq(kybResponses.task_id, taskId),
                  eq(kybResponses.field_id, fieldId)
                )
              );
              
            console.log(`[SERVER DEBUG] ✅ INSERT VERIFICATION for field "${fieldKey}":`);
            console.log(`[SERVER DEBUG] - Expected: "${responseValue}"`);
            console.log(`[SERVER DEBUG] - Actual: "${verifiedInsert?.response_value}"`);
            console.log(`[SERVER DEBUG] - Match: ${verifiedInsert?.response_value === responseValue ? 'YES' : 'NO'}`);
            
            if (verifiedInsert?.response_value !== responseValue) {
              console.error(`[SERVER DEBUG] ❌ INSERT VERIFICATION FAILED - values don't match!`);
            } else {
              console.log(`[SERVER DEBUG] ✅ INSERT SUCCESSFUL for field "${fieldKey}"`);
              
              // Special handling for legalEntityName field - broadcast via WebSocket to all clients
              // This ensures all clients have the most up-to-date business name
              if (fieldKey === 'legalEntityName') {
                console.log(`[SERVER DEBUG] Broadcasting legalEntityName insert via WebSocket: "${responseValue}"`);
                try {
                  const { broadcastFieldUpdate } = await import('../utils/progress');
                  broadcastFieldUpdate(taskId, fieldKey, responseValue, fieldId);
                } catch (wsError) {
                  console.error(`[SERVER DEBUG] Error broadcasting field update:`, wsError);
                }
              }
            }
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
    
    // Check if the task has been submitted (has submission date in metadata)
    // This is our source of truth for submission status
    const hasSubmissionDate = existingTask.metadata?.submissionDate !== undefined;
    
    if (hasSubmissionDate) {
      // If the task has been submitted, ALWAYS use SUBMITTED status and 100% progress
      // This prevents status regressions from overwriting submission state
      console.log('[KYB API Debug] Task has submission date, enforcing SUBMITTED status and 100% progress', {
        submissionDate: existingTask.metadata?.submissionDate,
        clientProvidedStatus: req.body.status || 'none',
        originalProgress: calculatedProgress
      });
      newStatus = TaskStatus.SUBMITTED;
      calculatedProgress = 100; // Force progress to 100% for submitted tasks
    }
    // If client provided an explicit status and task is not submitted, use that
    else if (req.body.status) {
      console.log('[KYB API Debug] Using client-provided status:', req.body.status);
      newStatus = req.body.status;
      
      // Additional validation to ensure client-provided status adheres to our business rules
      // This is a safety measure to prevent inconsistent states
      if (newStatus === TaskStatus.IN_PROGRESS && calculatedProgress === 0) {
        console.log('[KYB API Debug] Overriding client-provided IN_PROGRESS status to NOT_STARTED for 0% progress');
        newStatus = TaskStatus.NOT_STARTED;
      } else if (newStatus === TaskStatus.NOT_STARTED && calculatedProgress > 0) {
        console.log('[KYB API Debug] Overriding client-provided NOT_STARTED status to IN_PROGRESS for > 0% progress');
        newStatus = TaskStatus.IN_PROGRESS;
      }
    } 
    // Otherwise calculate based on progress - Strictly following business rules:
    // 0% = Not Started
    // 1-99% = In Progress
    // 100% (not submitted) = Ready for Submission
    // 100% (submitted) = Submitted
    else {
      if (calculatedProgress === 0) {
        newStatus = TaskStatus.NOT_STARTED;
      } else if (calculatedProgress < 100) {
        newStatus = TaskStatus.IN_PROGRESS;
      } else if (calculatedProgress === 100) {
        newStatus = TaskStatus.READY_FOR_SUBMISSION;
      }
      console.log('[KYB API Debug] Calculated status from progress:', { 
        progress: calculatedProgress, 
        calculatedStatus: newStatus 
      });
    }

    // Update task progress and metadata
    const progress = Math.min(calculatedProgress, 100);
    
    await db.update(tasks)
      .set({
        progress: progress,
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
      
    // Broadcast task update via WebSocket for real-time progress updates
    console.log(`[WebSocket] Broadcasting task update for task ${taskId}: progress=${progress}, status=${newStatus}`);
    try {
      const { broadcastProgressUpdate } = await import('../utils/progress');
      broadcastProgressUpdate(
        parseInt(taskId as string), 
        progress, 
        newStatus as TaskStatus, 
        {
          ...existingTask.metadata,
          lastUpdated: timestamp.toISOString()
        }
      );
    } catch (broadcastError) {
      console.error('[KYB-ROUTES] Error broadcasting progress update:', broadcastError);
    }

    // Get updated responses
    const updatedResponses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key,
      status: kybResponses.status
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, taskId));

    console.log('===============================================');
    console.log(`[SERVER DEBUG] PREPARING RESPONSE at ${new Date().toISOString()}`);
    console.log(`[SERVER DEBUG] Found ${updatedResponses.length} fields in database after update`);
    console.log('===============================================');

    const updatedFormData: Record<string, any> = {};
    for (const response of updatedResponses) {
      if (response.response_value !== null) {
        updatedFormData[response.field_key] = response.response_value;
      }
    }
    
    // CRITICAL DEBUG - Check for important fields for verification
    const keysOfInterest = ['corporateRegistration', 'goodStanding', 'regulatoryActions', 'investigationsIncidents'];
    keysOfInterest.forEach(key => {
      console.log(`[SERVER DEBUG] Checking field ${key} in updated data: ${key in updatedFormData ? `"${updatedFormData[key]}"` : 'NOT PRESENT'}`);
    });
    
    // Check for asdf values in updated form data
    const updatedAsdfFields = Object.entries(updatedFormData)
      .filter(([_, value]) => value === 'asdf')
      .map(([key]) => key);
      
    if (updatedAsdfFields.length > 0) {
      console.log(`[SERVER DEBUG] ⚠️ WARNING: Found ${updatedAsdfFields.length} fields with value "asdf" in response:`);
      console.log(`[SERVER DEBUG] ${updatedAsdfFields.join(', ')}`);
    } else {
      console.log('[SERVER DEBUG] No fields with value "asdf" found in response data');
    }
    
    console.log(`[SERVER DEBUG] Sending response with ${Object.keys(updatedFormData).length} fields, status: ${newStatus}, progress: ${calculatedProgress}%`);
    
    // File Vault unlocking has been moved to only occur during the formal submission process
    // via the /api/kyb/submit/:taskId endpoint, not when a form just reaches ready_for_submission status
    if (newStatus === 'ready_for_submission') {
      // Log that we're not prematurely unlocking the File Vault tab
      console.log(`[KYB API] ℹ️ Form has reached ready_for_submission status but File Vault tab will only unlock after formal submission`);
    }
    
    // CRITICAL FIX: Also update the savedFormData in the task table
    // This ensures data persistence across navigation
    try {
      console.log(`[SERVER DEBUG] Updating task.savedFormData to ensure persistence across navigation`);
      
      // Cast the types to allow savedFormData to be accepted
      // since the TypeScript definition doesn't explicitly include this field
      const taskUpdate: any = {
        updated_at: new Date()
      };
      
      // Add the data to the update object
      taskUpdate.savedFormData = updatedFormData;
      
      await db.update(tasks)
        .set(taskUpdate)
        .where(eq(tasks.id, taskId));
        
      console.log(`[SERVER DEBUG] ✅ Successfully updated task.savedFormData with latest form data`);
    } catch (taskUpdateError) {
      console.error(`[SERVER DEBUG] ❌ Failed to update task.savedFormData:`, taskUpdateError);
      // Continue anyway since we've already updated the responses
    }
    
    console.log('===============================================');

    res.json({
      success: true,
      savedData: {
        progress: Math.min(calculatedProgress, 100),
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

// Get saved progress for KYB form - first instance removed to avoid duplicate endpoints

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

    const { fileName, formData, taskId, status } = req.body;
    
    // Check if this is a submission (client indicates "submitted" status)
    const isSubmission = status === 'submitted';

    logger.debug('Save request received', {
      taskId,
      formDataKeys: Object.keys(formData),
      fileName,
      userId: req.user.id,
      isSubmission,
      requestedStatus: status
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
      name: fileName || FileCreationService.generateStandardFileName("KYBForm", taskId, task.metadata?.company_name, task.metadata?.formVersion || "1.0", "csv"),
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

    // Update available tabs for the company using our dedicated service
    // NOTE: File vault unlocking has been moved to the final critical section
    // to ensure it always executes, even if other operations fail
    console.log(`[SERVER DEBUG] File vault unlocking will be performed in the dedicated section below`);
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
    
    // Define the submission status for response
    // This status will be used for both WebSocket broadcasting and response
    const newStatus = isSubmission ? TaskStatus.SUBMITTED : task.status;
    
    // For SUBMITTED status, broadcast via WebSocket
    if (task.status === TaskStatus.SUBMITTED || isSubmission) {
      // Broadcast submission status via WebSocket
      console.log(`[WebSocket] Broadcasting submission status for task ${taskId}: submitted`);
      WebSocketService.broadcast('submission_status', { taskId, status: 'submitted' });

      // Also broadcast the task update for dashboard real-time updates
      WebSocketService.broadcastTaskUpdate({
        id: taskId,
        status: TaskStatus.SUBMITTED,
        progress: 100,
        metadata: {
          lastUpdated: new Date().toISOString(),
          submissionDate: new Date().toISOString()
        }
      });
    }

    res.json({
      success: true,
      fileId: fileCreationResult.fileId,
      warnings: warnings.length ? warnings : undefined,
      progress: 100,
      status: TaskStatus.SUBMITTED
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
import { reconcileTaskProgress } from '../utils/task-reconciliation';

// Import the universal demo auto-fill service
import { universalDemoAutoFillService } from '../services/universalDemoAutoFillService';

// Endpoint to provide demo data for auto-filling KYB forms (GET version)
// This maintains backward compatibility with existing code
router.get('/api/kyb/demo-autofill/:taskId', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      logger.error('Unauthenticated user attempted to access demo auto-fill');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to use this feature'
      });
    }
    
    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    logger.info('Demo auto-fill requested for KYB task (GET)', { taskId, userId: req.user.id });
    
    // Use the universal service to generate demo data
    try {
      // Generate demo data without applying it to the database
      const demoData = await universalDemoAutoFillService.generateDemoData(
        taskId, 
        'kyb',
        req.user.id
      );
      
      logger.info('Generated demo data for KYB auto-fill using universal service', {
        fieldCount: Object.keys(demoData).length,
        taskId
      });
      
      // Return the demo data to the client
      res.json(demoData);
    } catch (serviceError) {
      // Handle specific errors from the service
      logger.error('Error from universal service when generating KYB demo data', {
        error: serviceError instanceof Error ? serviceError.message : 'Unknown error',
        stack: serviceError instanceof Error ? serviceError.stack : undefined
      });
      
      // Determine appropriate status code
      const statusCode = 
        serviceError instanceof Error && serviceError.message.includes('demo companies') ? 403 :
        serviceError instanceof Error && serviceError.message.includes('Task not found') ? 404 : 
        500;
      
      return res.status(statusCode).json({
        error: 'Failed to generate demo data',
        message: serviceError instanceof Error ? serviceError.message : 'Unknown error occurred'
      });
    }
  } catch (error) {
    logger.error('Error in KYB demo auto-fill endpoint', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      error: 'Failed to generate demo data',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Endpoint to provide demo data for auto-filling KYB forms (POST version)
// Adding POST support for consistency with other form types
router.post('/api/kyb/demo-autofill/:taskId', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      logger.error('Unauthenticated user attempted to access demo auto-fill');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to use this feature'
      });
    }
    
    const taskId = parseInt(req.params.taskId, 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    logger.info('Demo auto-fill requested for KYB task (POST)', { taskId, userId: req.user.id });
    
    // Use the universal service to apply demo data
    try {
      // Apply the demo data directly to the database
      const result = await universalDemoAutoFillService.applyDemoData(
        taskId, 
        'kyb',
        req.user.id
      );
      
      logger.info('Applied demo data for KYB auto-fill using universal service', {
        fieldCount: result.fieldCount,
        taskId
      });
      
      // Get the current progress and status
      const [updatedTask] = await db.select({ progress: tasks.progress, status: tasks.status })
        .from(tasks)
        .where(eq(tasks.id, taskId));

      // Return success result with standardized progress and status
      res.json({
        success: true,
        message: result.message,
        fieldCount: result.fieldCount,
        progress: updatedTask.progress,
        status: updatedTask.status
      });
    } catch (serviceError) {
      // Handle specific errors from the service
      logger.error('Error from universal service when applying KYB demo data', {
        error: serviceError instanceof Error ? serviceError.message : 'Unknown error',
        stack: serviceError instanceof Error ? serviceError.stack : undefined
      });
      
      // Determine appropriate status code
      const statusCode = 
        serviceError instanceof Error && serviceError.message.includes('demo companies') ? 403 :
        serviceError instanceof Error && serviceError.message.includes('Task not found') ? 404 : 
        500;
      
      return res.status(statusCode).json({
        success: false,
        error: 'Failed to apply demo data',
        message: serviceError instanceof Error ? serviceError.message : 'Unknown error occurred'
      });
    }
  } catch (error) {
    logger.error('Error in KYB demo auto-fill endpoint (POST)', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to apply demo data',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * Update a single KYB field by field key
 * 
 * POST /api/kyb-fields/:taskId/update
 * Similar to KY3P field update endpoint, this allows individual field updates
 * with proper progress calculation and status updates
 */
router.post('/api/kyb-fields/:taskId/update', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const { fieldKey, value } = req.body;

    if (!fieldKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameter: fieldKey' 
      });
    }

    logger.info(`[KYB API] Processing field update for task ${taskId}, field ${fieldKey}`);

    // Find the field ID using the string field key
    const fieldResults = await db.select()
      .from(kybFields)
      .where(eq(kybFields.field_key, fieldKey))
      .limit(1);
    
    // If field not found by key, try using the field name or question for backward compatibility
    if (fieldResults.length === 0) {
      const altFieldResults = await db.select()
        .from(kybFields)
        .where(eq(kybFields.display_name, fieldKey))
        .limit(1);
      
      if (altFieldResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Field not found with key: ${fieldKey}`
        });
      }
      
      fieldResults.push(altFieldResults[0]);
    }

    const fieldId = fieldResults[0].id;
    
    // Check if a response already exists for this task and field
    const existingResponses = await db.select()
      .from(kybResponses)
      .where(
        and(
          eq(kybResponses.task_id, taskId),
          eq(kybResponses.field_id, fieldId)
        )
      );

    const now = new Date();

    if (existingResponses.length > 0) {
      // Update existing response
      await db.update(kybResponses)
        .set({ 
          response_value: value, 
          updated_at: now,
          status: 'COMPLETE' // Always set status to COMPLETE when updating a field
        })
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            eq(kybResponses.field_id, fieldId)
          )
        );
    } else {
      // Insert new response
      await db.insert(kybResponses)
        .values({
          task_id: taskId,
          field_id: fieldId,
          response_value: value,
          status: 'COMPLETE', // Always set status to COMPLETE when inserting a field
          created_at: now,
          updated_at: now
        });
    }

    // Update task progress and status
    // Count total fields
    const [fieldCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(kybFields);
    
    // Count completed responses for this task (status = COMPLETE)
    const [completedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(kybResponses)
      .where(
        and(
          eq(kybResponses.task_id, taskId),
          eq(kybResponses.status, 'COMPLETE')
        )
      );
    
    // UNIFIED PROGRESS UPDATE APPROACH
    // Instead of manually calculating progress here, use the centralized updateTaskProgress function
    // This ensures all form types use exactly the same progress calculation and status determination logic
    const { updateTaskProgress } = await import('../utils/progress');
    
    try {
      // This will calculate progress, update the database, and broadcast the update
      await updateTaskProgress(taskId, 'company_kyb', { 
        debug: true,
        metadata: {
          lastFieldUpdate: new Date().toISOString(),
          updatedField: fieldKey,
          updateSource: 'kyb-field-update'
        }
      });
      
      // Get the updated task to return the current progress and status
      const [updatedTask] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      logger.info(`[KYB API] Updated task ${taskId} progress to ${updatedTask.progress}%, status: ${updatedTask.status}`);
      
      // We've now successfully used the unified progress calculation system

    return res.status(200).json({ 
      success: true, 
      message: `Successfully updated field: ${fieldKey}`,
      progress: updatedTask.progress,
      status: updatedTask.status
    });
    
    } catch (progressError) {
      // If progress update fails, log but still return success for the field update
      logger.error(`[KYB API] Error updating task progress (but field was updated):`, progressError);
      
      // Fall back to a basic success response
      return res.status(200).json({ 
        success: true, 
        message: `Successfully updated field: ${fieldKey}, but could not update task progress`,
        fieldUpdated: true,
        progressUpdateFailed: true
      });
    }
  } catch (error) {
    logger.error('[KYB API] Error processing field update:', error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.get('/api/kyb/progress/:taskId', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log('[KYB API Debug] Loading progress for task:', taskId);

    if (!req.user?.company_id) {
      console.error('[KYB API Debug] No company ID in user session');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // CRITICAL FIX FOR KY3P TASK DATA LOADING
    // This workaround handles a specific KY3P task ID (task 613) by fetching from ky3p_responses
    // and returning it through the KYB progress endpoint to fix the URL mismatch issue
    if (taskId === '613') {
      console.log('[KYB API Debug] SPECIAL HANDLING: Detected KY3P task 613, using ky3p_responses directly');
      
      try {
        // Get the task for status info
        const [task] = await db.select()
          .from(tasks)
          .where(eq(tasks.id, 613));
          
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }
        
        // Use direct SQL to bypass any schema/type issues
        const rawResponses = await db.execute(`
          SELECT kr.response_value, kf.field_key 
          FROM ky3p_responses kr 
          JOIN ky3p_fields kf ON kr.field_id = kf.id 
          WHERE kr.task_id = 613
        `);

        // Format the responses
        const formData = {};
        let responseCount = 0;
        
        if (rawResponses && rawResponses.rows) {
          console.log(`[KYB API Debug] Found ${rawResponses.rows.length} KY3P responses for task 613`);
          
          for (const row of rawResponses.rows) {
            if (row.field_key) {
              formData[row.field_key] = row.response_value;
              responseCount++;
            }
          }
        }
        
        // Return a synthetic KYB-style response with the KY3P data
        console.log(`[KYB API Debug] KY3P responses found: ${responseCount}`);
        
        return res.json({
          formData,
          progress: responseCount > 0 ? Math.min(Math.round((responseCount / 120) * 100), 100) : 0,
          status: responseCount > 0 ? (responseCount >= 120 ? 'submitted' : 'in_progress') : 'not_started'
        });
      } catch (ky3pError) {
        console.error('[KYB API Debug] Error in KY3P special handling:', ky3pError);
        // Fall through to normal processing if this special case fails
      }
    }

    // First, reconcile the task progress to ensure consistency
    await reconcileTaskProgress(parseInt(taskId), { debug: true });
    
    // Get task data (now with reconciled progress values) with company verification
    const [task] = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, parseInt(taskId)),
          eq(tasks.company_id, req.user.company_id) // Ensure the task belongs to user's company
        )
      );

    logTaskDebug('Retrieved task', task);

    if (!task) {
      console.log('[KYB API Debug] Task not found or access denied:', {
        taskId,
        userCompanyId: req.user.company_id,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    // Get all KYB responses for this task with their field information
    const responses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key,
      field_id: kybResponses.field_id,
      status: kybResponses.status
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, parseInt(taskId)));

    logResponseDebug('Retrieved responses', responses);

    // Transform responses into form data
    const formData: Record<string, any> = {};
    
    // First load any existing savedFormData from the task as a backup source
    // This creates a fallback mechanism in case the kybResponses data is incomplete
    // Access with type assertion since the TypeScript schema doesn't recognize this property
    const savedFormData = (task as any).savedFormData;
    
    if (savedFormData) {
      console.log('[SERVER DEBUG] Found existing savedFormData in task, using as initial data source');
      console.log(`[SERVER DEBUG] Task savedFormData has ${Object.keys(savedFormData).length} fields`);
      
      // Merge the savedFormData into our form data
      Object.entries(savedFormData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData[key] = value;
          console.log(`[SERVER DEBUG] Loaded from task.savedFormData: ${key} = "${value}"`);
        }
      });
    } else {
      console.log('[SERVER DEBUG] No savedFormData found in task table');
    }
    
    // Check if the KYB form file ID is available in the task metadata
    const kybFormFileId = task.metadata?.kybFormFile;
    if (kybFormFileId) {
      console.log(`[SERVER DEBUG] Found KYB form file ID ${kybFormFileId} in task metadata`);
      
      // First, check if the file belongs to the same company as the task to prevent cross-company data leakage
      try {
        // Look up the file
        const [file] = await db.select()
          .from(files)
          .where(eq(files.id, kybFormFileId));
        
        // CRITICAL SECURITY CHECK: Verify file belongs to same company as task
        if (!file) {
          console.log(`[SERVER DEBUG] File with ID ${kybFormFileId} not found in database`);
        } 
        else if (file.company_id !== task.company_id) {
          // This is a security issue - file belongs to different company than the task
          console.error(`[SERVER SECURITY] POTENTIAL DATA LEAK PREVENTED: File ${kybFormFileId} belongs to company ${file.company_id} but task ${taskId} belongs to company ${task.company_id}`);
          
          // Log security incident details to the console
          console.error('[SERVER SECURITY] Security incident details:', {
            event: 'cross_company_data_access_prevented',
            fileId: kybFormFileId,
            fileCompanyId: file.company_id,
            taskId: taskId,
            taskCompanyId: task.company_id,
            userId: req.user?.id || null,
            timestamp: new Date().toISOString()
          });
        }
        else if (Object.keys(formData).length < 5 && 
                (task.status === TaskStatus.SUBMITTED || task.metadata?.submissionDate)) {
          // Only proceed with file loading if security check passed
          console.log(`[SERVER DEBUG] Only ${Object.keys(formData).length} fields found in database, attempting to load from CSV file`);
          
          try {
            // Load data from CSV file
            const csvData = await loadFormDataFromCsv(kybFormFileId);
            
            if (csvData && csvData.success) {
              console.log(`[SERVER DEBUG] Successfully loaded ${Object.keys(csvData.formData).length} fields from CSV file`);
              
              // Update form data with CSV values
              Object.entries(csvData.formData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                  formData[key] = value;
                }
              });
              
              // Update database with recovered data
              if (Object.keys(csvData.formData).length > 5) {
                console.log(`[SERVER DEBUG] Updating database with recovered form data from CSV file`);
                
                // Update the task's savedFormData field
                await db.update(tasks)
                  .set({ 
                    savedFormData: csvData.formData,
                    updated_at: new Date()
                  })
                  .where(eq(tasks.id, parseInt(taskId)));
                  
                console.log(`[SERVER DEBUG] Successfully updated task.savedFormData with recovered CSV data`);
              }
            }
          } catch (csvError) {
            console.error(`[SERVER DEBUG] Error loading data from CSV file:`, csvError);
          }
        }
      } catch (fileCheckError) {
        console.error(`[SERVER DEBUG] Error checking file ownership:`, fileCheckError);
      }
    } else {
      console.log('[SERVER DEBUG] No KYB form file ID found in task metadata');
    }
    
    // Then load (and override) with the most current data from kybResponses
    // This ensures we always use the most up-to-date values
    for (const response of responses) {
      if (response.response_value !== null) {
        // If both sources have data but they differ, log the discrepancy
        if (formData[response.field_key] !== undefined && 
            formData[response.field_key] !== response.response_value) {
          console.log(`[SERVER DEBUG] Data mismatch for field ${response.field_key}:`);
          console.log(`[SERVER DEBUG] - savedFormData: "${formData[response.field_key]}"`);
          console.log(`[SERVER DEBUG] - kybResponses: "${response.response_value}"`);
          console.log(`[SERVER DEBUG] Using kybResponses value (more current)`);
        }
        
        formData[response.field_key] = response.response_value;
      }
    }

    // Force progress to 100% for submitted tasks 
    let effectiveProgress = task.progress;
    
    // If the task has a submission date, always show 100% progress
    if (task.status === TaskStatus.SUBMITTED || task.metadata?.submissionDate) {
      console.log(`[KYB API Debug] Task is submitted, enforcing 100% progress (original was ${task.progress}%)`);
      effectiveProgress = 100;
      
      // If the database value differs, update it for consistency
      if (task.progress !== 100) {
        console.log(`[KYB API Debug] Fixing progress value in database for submitted task ${taskId}`);
        await db.update(tasks)
          .set({ 
            progress: 100,
            updated_at: new Date()
          })
          .where(eq(tasks.id, parseInt(taskId)));
      }
    }
    
    console.log('[KYB API Debug] Retrieved task data:', {
      id: task.id,
      responseCount: responses.length,
      progress: effectiveProgress, // Use the effective progress
      status: task.status,
      formDataKeys: Object.keys(formData)
    });
    
    // CRITICAL DEBUG - Check for important fields for verification
    console.log('===============================================');
    console.log(`[SERVER DEBUG] PREPARING GET RESPONSE at ${new Date().toISOString()}`);
    console.log(`[SERVER DEBUG] Task ID: ${taskId}, Found ${responses.length} fields in database`);
    console.log('===============================================');
    
    const keysOfInterest = ['corporateRegistration', 'goodStanding', 'regulatoryActions', 'investigationsIncidents'];
    keysOfInterest.forEach(key => {
      console.log(`[SERVER DEBUG] Checking field ${key} in retrieved data: ${key in formData ? `"${formData[key]}"` : 'NOT PRESENT'}`);
    });
    
    // Check for asdf values in form data
    const getResponseAsdfFields = Object.entries(formData)
      .filter(([_, value]) => value === 'asdf')
      .map(([key]) => key);
      
    if (getResponseAsdfFields.length > 0) {
      console.log(`[SERVER DEBUG] ⚠️ WARNING: Found ${getResponseAsdfFields.length} fields with value "asdf" in GET response:`);
      console.log(`[SERVER DEBUG] ${getResponseAsdfFields.join(', ')}`);
    } else {
      console.log('[SERVER DEBUG] No fields with value "asdf" found in GET response data');
    }
    
    console.log(`[SERVER DEBUG] Sending GET response with ${Object.keys(formData).length} fields, status: ${task.status}, progress: ${effectiveProgress}%`);
    console.log('===============================================');

    // Return saved form data and progress with task status
    res.json({
      formData,
      progress: Math.min(effectiveProgress || 0, 100),
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
  // Generate a unique transaction ID for complete traceability
  const transactionId = `kyb-submit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const startTime = performance.now();

  logger.info('Starting KYB form submission process', {
    transactionId,
    taskId: req.params.taskId,
    endpoint: '/api/kyb/submit',
    timestamp: new Date().toISOString()
  });

  try {
    // Import the required modules with proper error handling
    const { processKybSubmission } = require('../services/transactional-kyb-handler');
    const { broadcastFormSubmission, scheduleDelayedBroadcast } = require('../services/form-submission-broadcaster');
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
    
    // STEP 0: IMMEDIATELY get the task and company info and unlock the file vault
    // This ensures the tab is visible at the earliest possible moment
    try {
      const taskId = parseInt(req.params.taskId);
      
      if (isNaN(taskId)) {
        throw new Error('Invalid task ID');
      }
      
      // Get the task to retrieve the company ID
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      const companyId = task.company_id;
      
      if (!companyId) {
        throw new Error(`No company ID found for task ${taskId}`);
      }
      
      console.log(`[KYB API] 🔑 FAST PATH: Immediately unlocking File Vault for company ${companyId}`);
      
      // 1. DIRECT DATABASE UPDATE FIRST for maximum speed
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));
      
      if (company) {
        // Get current tabs
        const currentTabs = Array.isArray(company.available_tabs) ? company.available_tabs : ['task-center'];
        
        // Only add file-vault if not already present
        if (!currentTabs.includes('file-vault')) {
          const updatedTabs = [...currentTabs, 'file-vault'];
          
          // Direct database update
          await db.update(companies)
            .set({
              available_tabs: updatedTabs,
              updated_at: new Date()
            })
            .where(eq(companies.id, companyId));
          
          console.log(`[KYB API] ✅ FAST PATH: File vault tab unlocked via direct database update`);
          
          // INSTANT BROADCAST: Immediately broadcast the tab update
          try {
            const { broadcastMessage, broadcastCompanyTabsUpdate } = require('../services/websocket');
            
            // First use direct tab update
            broadcastCompanyTabsUpdate(companyId, updatedTabs);
            
            // Then use the more comprehensive message with cache invalidation
            broadcastMessage('company_tabs_updated', {
              companyId,
              availableTabs: updatedTabs,
              cache_invalidation: true,
              timestamp: new Date().toISOString(),
              source: 'kyb_submit_fast_path'
            });
            
            console.log(`[KYB API] 📣 FAST PATH: Sent immediate WebSocket updates`);
          } catch (wsError) {
            console.error(`[KYB API] Failed to send WebSocket messages in fast path:`, wsError);
          }
        } else {
          console.log(`[KYB API] FAST PATH: File vault tab already unlocked for company ${companyId}`);
        }
      } else {
        console.error(`[KYB API] FAST PATH: Company ${companyId} not found`);
      }
    } catch (fastPathError) {
      console.error(`[KYB API] Error in fast path file vault unlocking:`, fastPathError);
      // Continue with normal processing - this is just an optimization
    }
    
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
      name: fileName || FileCreationService.generateStandardFileName("KYBForm", taskId, task.metadata?.company_name, task.metadata?.formVersion || "1.0", "csv"),
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

    // Update available tabs for the company using our dedicated service
    // NOTE: File vault unlocking has been moved to the final critical section
    // to ensure it always executes, even if other operations fail
    console.log(`[SERVER DEBUG] File vault unlocking will be performed in the dedicated section below`);
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
    
    logger.info('[KYB Submission] 🔓 Security task unlock operation completed', {
      result: unlockResult,
      success: unlockResult.success,
      count: unlockResult.count,
      companyId: task.company_id,
      kybTaskId: taskId,
      timestamp: new Date().toISOString(),
      userId: req.user?.id
    });
    
        // The file vault unlocking code has been moved to the top of the function
    // for immediate unlocking as soon as the submission request is received

    // Broadcast submission status via WebSocket with enhanced logging
    logger.info(`[KYB Submission] 📰 Broadcasting submission status for task ${taskId}: submitted`, {
      taskId,
      status: 'submitted',
      companyId: task.company_id,
      timestamp: new Date().toISOString(),
      userId: req.user?.id,
      source: 'kyb-submit-endpoint'
    });
    
    // Use the new standardized form submission broadcaster
    try {
      // Import the form submission broadcaster
      const { broadcastFormSubmission, scheduleDelayedBroadcast } = require('../services/form-submission-broadcaster');
      
      // Send immediate broadcast
      const broadcastResult = await broadcastFormSubmission({
        taskId,
        formType: 'kyb',
        status: 'submitted',
        companyId: task.company_id,
        fileId: submissionResult.fileId,
        progress: 100,
        submissionDate: new Date().toISOString(),
        source: 'kyb-submit-endpoint'
      });
      
      logger.info('[KYB Submission] Broadcast result', {
        success: broadcastResult.success,
        channels: broadcastResult.channels,
        taskId,
        transactionId
      });
      
      // Schedule delayed broadcasts to ensure clients receive the update
      // even if they reconnect after a brief disconnection
      scheduleDelayedBroadcast({
        taskId,
        formType: 'kyb',
        status: 'submitted',
        companyId: task.company_id,
        fileId: submissionResult.fileId,
        progress: 100,
        submissionDate: new Date().toISOString()
      }, 2000); // 2 second delay
    } catch (wsError) {
      logger.error('[KYB Submission] Error broadcasting through websocket service:', {
        error: wsError instanceof Error ? wsError.message : 'Unknown error',
        taskId,
        companyId: task.company_id
      });
      
      // Original broadcast as fallback
      try {
        broadcastSubmissionStatus(taskId, 'submitted');
      } catch (bssError) {
        logger.error('[KYB Submission] Error using broadcastSubmissionStatus:', {
          error: bssError instanceof Error ? bssError.message : 'Unknown error',
          taskId
        });
      }
    }
    
    // Schedule additional broadcasts with increasing delays
    // This ensures clients have multiple opportunities to receive the confirmation
    // Even if they reconnect after a network interruption
    const delayTimes = [1000, 2000, 5000]; // 1s, 2s, 5s delays
    for (const delay of delayTimes) {
      setTimeout(() => {
        logger.debug(`[KYB Submission] 🕒 Sending delayed submission status broadcast (${delay}ms) for task ${taskId}`);
        
        try {
          // Use the standardized websocket service for delayed broadcasts
          const { broadcast } = require('../services/websocket');
          broadcast('form_submission', {
            taskId,
            formType: 'kyb',
            status: 'submitted',
            companyId: task.company_id,
            timestamp: new Date().toISOString(),
            submissionDate: new Date().toISOString(),
            delay: delay,  // Include delay information for debugging
            source: 'delayed-broadcast'
          });
        } catch (wsError) {
          // Fallback to legacy broadcast method
          try {
            broadcastSubmissionStatus(taskId, 'submitted');
          } catch (bssError) {
            logger.error(`[KYB Submission] Failed delayed broadcast at ${delay}ms:`, {
              error: bssError instanceof Error ? bssError.message : 'Unknown error',
              taskId,
              delay
            });
          }
        }
      }, delay);
    }

    // Also broadcast the task update for dashboard real-time updates
    logger.info(`[KYB Submission] 💬 Broadcasting task update for dashboard real-time updates`, {
      taskId,
      status: 'submitted',
      progress: 100,
      timestamp: new Date().toISOString()
    });

    try {
      // Use the standardized WebSocket service from broadcast method instead
      const { broadcast } = require('../services/websocket');
      broadcast('task_update', {
        id: taskId,
        status: 'submitted',
        progress: 100,
        metadata: {
          lastUpdated: new Date().toISOString(),
          submissionDate: new Date().toISOString(),
          broadcastSource: 'kyb-submit-endpoint'
        }
      });
      
      logger.debug('[KYB Submission] Successfully broadcast task update through websocket service');
      
      // Also send a generic message as a fallback on a separate channel
      broadcast('form_submission_complete', {
        taskId,
        formType: 'kyb',
        status: 'submitted',
        timestamp: new Date().toISOString(),
        source: 'kyb-submit-endpoint'
      });
    } catch (btuError) {
      logger.error('[KYB Submission] Error broadcasting task update:', {
        error: btuError instanceof Error ? btuError.message : 'Unknown error',
        taskId,
        formType: 'kyb'
      });
      
      // Fallback to legacy broadcast methods if available
      try {
        if (typeof broadcastTaskUpdate === 'function') {
          broadcastTaskUpdate({
            id: taskId,
            status: TaskStatus.SUBMITTED,
            progress: 100,
            metadata: {
              lastUpdated: new Date().toISOString(),
              submissionDate: new Date().toISOString(),
              broadcastSource: 'kyb-submit-endpoint-fallback'
            }
          });
        }
        
        if (typeof broadcastMessage === 'function') {
          broadcastMessage('form_submission_complete', {
            taskId,
            status: 'submitted',
            timestamp: Date.now(),
            source: 'kyb-submit-endpoint-fallback'
          });
        }
      } catch (fallbackError) {
        logger.error('[KYB Submission] Failed to use fallback broadcast methods:', {
          error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
        });
      }
    }

    // Verify user is authenticated before proceeding
    if (!req.isAuthenticated() || !req.user) {
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
    // (reusing the ones from the try block's outer scope)
    if (isNaN(taskId)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        message: 'The task ID must be a valid number'
      });
    }
    
    // Check if formData exists and is not empty
    if (!formData || Object.keys(formData).length === 0) {
      return res.status(400).json({
        error: 'Missing form data',
        message: 'Form data is required for submission'
      });
    }
    
    // Reusing the imported modules from above

    // Use the transaction-based KYB submission handler
    const submissionInput = {
      taskId,
      formData,
      fileName,
      userId: req.user?.id,
      transactionId,
      startTime
    };
    
    // Call the transactional KYB handler
    const submissionResult = await processKybSubmission(submissionInput);
    
    // If the transaction was successful
    if (submissionResult.success) {
      logger.info('[KYB Submission] Transaction-based submission successful', {
        transactionId,
        taskId,
        fileId: submissionResult.fileId,
        elapsedMs: submissionResult.elapsedMs
      });
      
      // CRITICAL FIX: Ensure task status is explicitly set to 'submitted'
      // Direct database update to prevent any status inconsistencies
      try {
        await db.update(tasks)
          .set({
            status: 'submitted', // Use string literal to ensure exact value
            progress: 100,
            completion_date: new Date(),
            updated_at: new Date()
          })
          .where(eq(tasks.id, taskId));
          
        logger.info('[KYB Submission] Applied direct status fix to ensure proper submission', {
          taskId,
          status: 'submitted',
          progress: 100
        });
      } catch (statusFixError) {
        logger.error('[KYB Submission] Failed to apply status fix', {
          error: statusFixError instanceof Error ? statusFixError.message : 'Unknown error',
          taskId
        });
        // Continue with the response even if the fix fails
      }
      
      // Broadcast the submission to all clients
      try {
        const broadcastResult = await broadcastFormSubmission({
          taskId,
          formType: 'kyb',
          status: 'submitted',
          companyId: submissionResult.companyId as number,
          fileId: submissionResult.fileId,
          progress: 100,
          submissionDate: new Date().toISOString(),
          source: 'kyb-submit-endpoint',
          metadata: {
            transactionId,
            warnings: submissionResult.warnings?.length || 0,
            securityTasksUnlocked: submissionResult.securityTasksUnlocked || 0,
            statusFixApplied: true // Mark that we applied the status fix
          }
        });
        
        logger.info('[KYB Submission] Broadcast results', {
          success: broadcastResult.success,
          channels: broadcastResult.channels,
          taskId,
          transactionId
        });
        
        // Schedule a delayed broadcast to ensure clients receive the update
        scheduleDelayedBroadcast({
          taskId,
          formType: 'kyb',
          status: 'submitted',
          companyId: submissionResult.companyId as number,
          fileId: submissionResult.fileId,
          progress: 100,
          submissionDate: new Date().toISOString()
        }, 2000);
      } catch (error) {
        logger.error('[KYB Submission] Broadcast error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          taskId,
          transactionId
        });
        // Continue processing even if broadcast fails
      }
      
      // Return the success response
      return res.json({
        success: true,
        fileId: submissionResult.fileId,
        warnings: submissionResult.warnings,
        securityTasksUnlocked: submissionResult.securityTasksUnlocked || 0,
        elapsedMs: submissionResult.elapsedMs
      });
    } else {
      // Transaction failed, return an appropriate error response
      logger.error('[KYB Submission] Transaction failed', {
        error: submissionResult.error,
        taskId,
        transactionId
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to process KYB submission',
        details: submissionResult.error || 'Unknown error during transaction processing',
        timestamp: new Date().toISOString()
      });
    }
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

    // Get company name from file metadata or database 
    let companyName = 'Company';
    if (file.company_id) {
      try {
        const [company] = await db.select({
          name: companies.name
        })
        .from(companies)
        .where(eq(companies.id, file.company_id));
        
        if (company?.name) {
          companyName = company.name;
        }
      } catch (error) {
        logger.error('Error getting company name', {error});
      }
    }

    // Process the file content directly from the path field (which contains the actual content)
    const fileContent = file.path;

    // Set response headers based on format
    switch (format) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        
        // Use standardized filename format for download
        const taskId = (file.metadata && file.metadata.taskId) 
          ? Number(file.metadata.taskId) 
          : Number(req.query.taskId) || 0;
        
        // Extract question number from the file metadata if available
        const questionNumber = (file.metadata && file.metadata.questionNumber) 
          ? Number(file.metadata.questionNumber) 
          : undefined;
          
        // Create standardized filename
        const standardizedFilename = FileCreationService.generateStandardFileName(
          'KYB', 
          taskId, 
          companyName,
          '1.0',
          'csv',
          questionNumber
        );
        
        res.setHeader('Content-Disposition', `attachment; filename="${standardizedFilename}"`);
        
        // If file is already CSV, send its content directly
        if (file.type === 'text/csv') {
          return res.send(fileContent);
        }
        
        // If file is JSON, convert it to CSV
        try {
          const jsonData = JSON.parse(fileContent);
          // Convert JSON to CSV format
          // CSV headers with question number
          const csvRows = [['Question Number', 'Group', 'Question', 'Answer', 'Type']];
          
          // Calculate total number of questions
          let totalQuestions = 0;
          Object.values(jsonData.responses || {}).forEach((fields: any) => {
            totalQuestions += Object.keys(fields).length;
          });
          
          // Add data rows with question numbers
          let questionNumber = 1;
          Object.entries(jsonData.responses || {}).forEach(([group, fields]: [string, any]) => {
            Object.entries(fields).forEach(([key, data]: [string, any]) => {
              // Just use the number itself (1, 2, 3, etc.) instead of fraction format
              const formattedNumber = `${questionNumber}`;
              
              csvRows.push([
                formattedNumber,
                group,
                data.question,
                data.answer || '',
                data.type || 'text'
              ]);
              
              questionNumber++;
            });
          });
          return res.send(csvRows.map(row => row.join(',')).join('\n'));
        } catch (jsonError) {
          logger.error('JSON parsing error', { error: jsonError });
          return res.send(fileContent); // Fallback to sending the raw content
        }

      case 'json':
        res.setHeader('Content-Type', 'application/json');
        
        // Use standardized filename format for download
        const jsonTaskId = (file.metadata && file.metadata.taskId) 
          ? Number(file.metadata.taskId) 
          : Number(req.query.taskId) || 0;
        
        // Extract question number from the file metadata if available
        const jsonQuestionNumber = (file.metadata && file.metadata.questionNumber) 
          ? Number(file.metadata.questionNumber) 
          : undefined;
          
        // Create standardized filename with json extension
        const jsonFilename = FileCreationService.generateStandardFileName(
          'KYB', 
          jsonTaskId, 
          companyName, // Using the companyName variable defined at the top of function
          '1.0',
          'json',
          jsonQuestionNumber
        );
        
        res.setHeader('Content-Disposition', `attachment; filename="${jsonFilename}"`);
        
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
        
        // Use standardized filename format for download
        const txtTaskId = (file.metadata && file.metadata.taskId) 
          ? Number(file.metadata.taskId) 
          : Number(req.query.taskId) || 0;
        
        // Extract question number from the file metadata if available
        const txtQuestionNumber = (file.metadata && file.metadata.questionNumber) 
          ? Number(file.metadata.questionNumber) 
          : undefined;
          
        // Create standardized filename with txt extension
        const txtFilename = FileCreationService.generateStandardFileName(
          'KYB', 
          txtTaskId, 
          companyName, // Using the companyName variable defined at the top of function
          '1.0',
          'txt',
          txtQuestionNumber
        );
        
        res.setHeader('Content-Disposition', `attachment; filename="${txtFilename}"`);
        
        try {
          // Handle different data formats
          let data;
          try {
            data = file.type === 'application/json' ? JSON.parse(fileContent) : { responses: {} };
          } catch (parseError) {
            logger.warn('Text conversion parsing error, using raw content', { error: parseError });
            return res.send(fileContent);
          }
          
          // Calculate total number of questions for numbering
          let totalQuestions = 0;
          Object.values(data.responses || {}).forEach((fields: any) => {
            totalQuestions += Object.keys(fields).length;
          });
          
          // Add question numbers to text output
          let questionNumber = 1;
          const textContent = Object.entries(data.responses || {}).map(([group, fields]: [string, any]) => {
            const sectionContent = `\n${group}:\n${'='.repeat(group.length)}\n` +
              Object.entries(fields).map(([key, data]: [string, any]) => {
                // Format as "Question 1: "
                const formattedNumber = `Question ${questionNumber}: `;
                const output = `${formattedNumber}${data.question}\nAnswer: ${data.answer || 'Not provided'}\n`;
                questionNumber++;
                return output;
              }).join('\n');
            return sectionContent;
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

// Test WebSocket notification endpoint
router.post('/api/kyb/test-notification', async (req, res) => {
  try {
    const { taskId } = req.body;
    
    if (!taskId) {
      return res.status(400).json({
        error: 'Missing taskId',
        message: 'Task ID is required for sending test notifications'
      });
    }
    
    // Get task to ensure it exists
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        message: `No task found with ID: ${taskId}`
      });
    }
    
    // Send a test notification via WebSocket
    console.log(`[WebSocket] Sending test notification for task ${taskId}`);
    
    // Test the submission status broadcast
    console.log(`[WebSocket] Broadcasting submission status for task ${taskId}: submitted (TEST)`);
    broadcastSubmissionStatus(taskId, 'submitted');
    
    // Send the regular task update
    broadcastTaskUpdate({
      id: taskId,
      status: task.status as TaskStatus,
      progress: task.progress,
      metadata: {
        lastUpdated: new Date().toISOString(),
        testNotification: true
      }
    });
    
    // Also broadcast a generic message
    broadcastMessage('task_test_notification', {
      taskId,
      timestamp: new Date().toISOString(),
      message: 'This is a test notification from the server'
    });
    
    return res.json({
      success: true,
      message: `Test notification sent for task ${taskId}`,
      taskStatus: task.status,
      taskProgress: task.progress
    });
  } catch (error) {
    console.error('[WebSocket Test] Error sending test notification:', error);
    return res.status(500).json({
      error: 'Failed to send test notification',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add a new enhanced submission endpoint that uses our unified file tracking
router.post('/api/kyb/enhanced-submit/:taskId', requireAuth, async (req, res) => {
  try {
    const { formData, fileName } = req.body;
    const taskId = parseInt(req.params.taskId);
    const userId = req.user?.id;
    
    logger.info('Processing enhanced KYB form submission', {
      taskId,
      userId,
      hasFileName: !!fileName
    });
    
    // Validate user authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Get task details
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Check required fields
    if (!task.company_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing company information'
      });
    }
    
    // Get all KYB fields
    const fields = await db.select()
      .from(kybFields)
      .orderBy(kybFields.order);

    // Convert form data to CSV
    const csvData = convertResponsesToCSV(fields, formData);
    
    // Create file using FileCreationService
    const generatedFileName = fileName || `KYBForm_${taskId}_${task.metadata?.company_name || 'Company'}_v${task.metadata?.formVersion || '1.0'}.csv`;
    
    const fileCreationResult = await FileCreationService.createFile({
      name: generatedFileName,
      content: csvData,
      type: 'text/csv',
      userId: userId,
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
      logger.error('Enhanced file creation failed', {
        error: fileCreationResult.error,
        taskId,
        fileName: generatedFileName
      });
      
      return res.status(500).json({
        success: false,
        error: 'File creation failed: ' + (fileCreationResult.error || 'Unknown error')
      });
    }
    
    // Use the enhanced KYB form handler to update task and link file
    const { updateTaskWithFileInfo } = await import('../services/enhance-kyb-form-handler');
    const updateResult = await updateTaskWithFileInfo(
      taskId,
      fileCreationResult.fileId,
      generatedFileName,
      task.company_id
    );
    
    logger.info('Enhanced KYB form submission processed', {
      taskId,
      fileId: fileCreationResult.fileId,
      success: updateResult
    });
    
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
        } else {
          throw error;
        }
      }
    }
    
    // Try to unlock security tasks after KYB submission
    // Use checkAndUnlockSecurityTasks from the current file
    const unlockResult = await checkAndUnlockSecurityTasks(task.company_id, userId);
    
    return res.json({
      success: true,
      fileId: fileCreationResult.fileId,
      taskStatus: 'submitted',
      message: 'KYB form submitted successfully with enhanced tracking',
      securityTasksUnlocked: unlockResult.success ? unlockResult.count : 0
    });
  } catch (error) {
    logger.error('Error in enhanced KYB form submission', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false, 
      error: 'Enhanced KYB form submission failed: ' + 
        (error instanceof Error ? error.message : 'Unknown error')
    });
  }
});

export default router;