import { Router } from 'express';
import { join } from 'path';
import { db } from '@db';
import { tasks, TaskStatus, kybFields, kybResponses, files, companies } from '@db/schema';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { FileCreationService } from '../services/file-creation';
import { Logger } from '../utils/logger';
import { broadcastTaskUpdate, broadcastMessage, broadcastSubmissionStatus } from '../services/websocket';
import { requireAuth } from '../middleware/auth';
import { CompanyTabsService } from '../services/companyTabsService';
import { unlockFileVault } from '../patches/updateCompanyTabs';

const logger = new Logger('KYBRoutes');

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
  // CSV headers
  const headers = ['Question Number', 'Group', 'Question', 'Answer', 'Type'];
  const rows = [headers];

  // Add data rows
  let questionNumber = 1;
  const totalQuestions = fields.length;
  
  for (const field of fields) {
    // Just use the number itself (1, 2, 3, etc.) instead of fraction format
    const formattedNumber = `${questionNumber}`;
    
    rows.push([
      formattedNumber,
      field.group || 'Uncategorized',
      field.display_name,
      formData[field.field_key] || '',
      field.field_type
    ]);
    
    questionNumber++;
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
                  const { broadcastFieldUpdate } = await import('../services/websocket');
                  broadcastFieldUpdate(taskId, fieldKey, responseValue);
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
                  const { broadcastFieldUpdate } = await import('../services/websocket');
                  broadcastFieldUpdate(taskId, fieldKey, responseValue);
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
    } 
    // Otherwise calculate based on progress
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
    broadcastTaskUpdate({
      id: taskId,
      status: newStatus as TaskStatus,
      progress: progress,
      metadata: {
        lastUpdated: timestamp.toISOString()
      }
    });

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
    
    // Define the submission status for response
    // This status will be used for both WebSocket broadcasting and response
    const newStatus = isSubmission ? TaskStatus.SUBMITTED : task.status;
    
    // For SUBMITTED status, broadcast via WebSocket
    if (task.status === TaskStatus.SUBMITTED || isSubmission) {
      // Broadcast submission status via WebSocket
      console.log(`[WebSocket] Broadcasting submission status for task ${taskId}: submitted`);
      broadcastSubmissionStatus(taskId, 'submitted');

      // Also broadcast the task update for dashboard real-time updates
      broadcastTaskUpdate({
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
import { reconcileTaskProgress } from '../utils/task-reconciliation';

// Endpoint to provide demo data for auto-filling KYB forms
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
    
    const { taskId } = req.params;
    logger.info('Demo auto-fill requested for task', { taskId, userId: req.user.id });
    
    // Get the task to retrieve company information
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId, 10)));
      
    if (!task) {
      logger.error('Task not found for demo auto-fill', { taskId });
      return res.status(404).json({ 
        error: 'Task not found',
        message: 'Could not find the specified task for auto-filling'
      });
    }
    
    // CRITICAL SECURITY CHECK: Verify user belongs to company that owns the task
    if (req.user.company_id !== task.company_id) {
      logger.error('Security violation: User attempted to access task from another company', {
        userId: req.user.id,
        userCompanyId: req.user.company_id,
        taskId: task.id,
        taskCompanyId: task.company_id
      });
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this task'
      });
    }
    
    // Check if the company associated with this task is a demo company
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, task.company_id));
      
    // Ensure we're explicitly checking for true, not just truthy values 
    if (!company || company.is_demo !== true) {
      logger.error('Company is not a demo company', { 
        taskId, 
        companyId: task.company_id,
        isDemo: company?.is_demo,
        isDemoType: typeof company?.is_demo
      });
      // Log the actual company object to debug
      console.log('[KYB Demo Auto-Fill] Company object:', JSON.stringify(company));
      
      return res.status(403).json({
        error: 'Not a demo company',
        message: 'Auto-fill is only available for demo companies'
      });
    }
    
    // Get all KYB fields with explicit selection of the demo_autofill column
    const fields = await db.select({
      id: kybFields.id,
      field_key: kybFields.field_key,
      display_name: kybFields.display_name,
      field_type: kybFields.field_type,
      question: kybFields.question,
      group: kybFields.group,
      required: kybFields.required,
      order: kybFields.order,
      step_index: kybFields.step_index,
      validation_rules: kybFields.validation_rules,
      help_text: kybFields.help_text,
      demo_autofill: kybFields.demo_autofill, // Explicitly select demo_autofill
      created_at: kybFields.created_at,
      updated_at: kybFields.updated_at
    })
      .from(kybFields)
      .orderBy(sql`"group" ASC, "order" ASC`);
    
    logger.info('Fetched fields for demo auto-fill', {
      fieldCount: fields.length,
      taskId
    });
    
    // Create demo data for each field using predefined demo_autofill values from the database
    const demoData: Record<string, any> = {};
    
    // Get current user information for personalized values
    let userEmail = '';
    if (req.user) {
      userEmail = req.user.email;
    }
    
    // Log the first few fields to debug with explicit column check
    console.log('[KYB Demo Auto-Fill] First 5 fields from database:');
    
    // Inspect the raw database results to verify the structure
    const rawFields = fields.slice(0, 5);
    console.log('[KYB Demo Auto-Fill] Raw field objects:', rawFields);
    
    // Check if demo_autofill is directly accessible
    rawFields.forEach(field => {
      // Get all columns for debugging
      const keys = Object.keys(field);
      console.log(`[KYB Demo Auto-Fill] Field ${field.field_key} has these properties:`, keys);
      
      // Check the demo value specifically
      const demoValue = field.demo_autofill;
      console.log(`[KYB Demo Auto-Fill] Field ${field.field_key} demo_autofill = "${demoValue}"`);
    });
    
    for (const field of fields) {
      const fieldKey = field.field_key;
      
      // Special cases that should always use current user/company data regardless of database values
      if (fieldKey === 'legalEntityName') {
        // Always use the actual company name
        demoData[fieldKey] = company.name;
        console.log(`[KYB Demo Auto-Fill] Using company name for legalEntityName: ${company.name}`);
      }
      else if (fieldKey === 'contactEmail') {
        // Always use the current user's email
        demoData[fieldKey] = userEmail;
        console.log(`[KYB Demo Auto-Fill] Using current user email for contactEmail: ${userEmail}`);
      }
      // Use the demo_autofill value directly from the database for all other fields
      else if (field.demo_autofill !== null && field.demo_autofill !== undefined) {
        // For fields that might contain company name references
        if (typeof field.demo_autofill === 'string' && field.demo_autofill.includes('{{COMPANY_NAME}}')) {
          demoData[fieldKey] = field.demo_autofill.replace('{{COMPANY_NAME}}', company.name);
          console.log(`[KYB Demo Auto-Fill] Replaced template in ${fieldKey}: ${demoData[fieldKey]}`);
        } else {
          // Use the predefined value from the database
          demoData[fieldKey] = field.demo_autofill;
          console.log(`[KYB Demo Auto-Fill] Used database value for ${fieldKey}: ${demoData[fieldKey]}`);
        }
      } 
      // Fallback for any fields without defined demo values
      else {
        // Generate a basic fallback value based on field type
        console.log(`[KYB Demo Auto-Fill] No demo_autofill value found for ${fieldKey}`);
        
        switch (field.field_type) {
          case 'TEXT':
          case 'TEXTAREA':
            demoData[fieldKey] = `Demo ${field.display_name}`;
            break;
            
          case 'DATE':
            const date = new Date();
            date.setFullYear(date.getFullYear() - 2);
            demoData[fieldKey] = date.toISOString().split('T')[0];
            break;
            
          case 'NUMBER':
            demoData[fieldKey] = '10000';
            break;
            
          case 'BOOLEAN':
            demoData[fieldKey] = 'true';
            break;
            
          case 'SELECT':
          case 'MULTI_SELECT':
          case 'MULTIPLE_CHOICE':
            demoData[fieldKey] = 'Option A';
            break;
            
          case 'EMAIL':
            demoData[fieldKey] = `demo@${field.display_name.toLowerCase().replace(/\s/g, '')}.com`;
            break;
            
          default:
            demoData[fieldKey] = `Demo value for ${field.display_name}`;
        }
        console.log(`[KYB Demo Auto-Fill] Generated fallback value for ${fieldKey}: ${demoData[fieldKey]}`);
      }
    }
    
    logger.info('Generated demo data for auto-fill', {
      fieldCount: Object.keys(demoData).length,
      taskId
    });
    
    res.json(demoData);
  } catch (error) {
    logger.error('Error generating demo auto-fill data', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      error: 'Failed to generate demo data',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
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

    // Broadcast submission status via WebSocket with enhanced logging
    console.log(`[WebSocket] Broadcasting submission status for task ${taskId}: submitted (KYB submit endpoint)`);
    
    // First broadcast attempt
    broadcastSubmissionStatus(taskId, 'submitted');
    
    // Schedule additional broadcasts with increasing delays
    // This ensures clients have multiple opportunities to receive the confirmation
    // Even if they reconnect after a network interruption
    const delayTimes = [1000, 2000, 5000]; // 1s, 2s, 5s delays
    for (const delay of delayTimes) {
      setTimeout(() => {
        console.log(`[WebSocket] Sending delayed submission status broadcast (${delay}ms) for task ${taskId}`);
        broadcastSubmissionStatus(taskId, 'submitted');
      }, delay);
    }

    // Also broadcast the task update for dashboard real-time updates
    broadcastTaskUpdate({
      id: taskId,
      status: TaskStatus.SUBMITTED,
      progress: 100,
      metadata: {
        lastUpdated: new Date().toISOString(),
        submissionDate: new Date().toISOString(),
        broadcastSource: 'kyb-submit-endpoint'
      }
    });
    
    // Also send a generic message as a fallback on a separate channel
    broadcastMessage('form_submission_complete', {
      taskId,
      status: 'submitted',
      timestamp: Date.now(),
      source: 'kyb-submit-endpoint'
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

export default router;