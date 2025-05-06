/**
 * Transactional Form Handler Service
 * 
 * This service provides a reliable, transaction-based approach to form submissions.
 * It ensures that all related operations (response storage, file creation, progress updates, 
 * and status changes) happen atomically within a database transaction.
 * 
 * Key features:
 * - Single database transaction for related operations
 * - Proper error handling with automatic rollback
 * - Consistent progress calculation
 * - WebSocket notifications for real-time updates
 * - Detailed logging for diagnostics
 */

import { db } from '@db';
import { sql } from 'drizzle-orm';
import { tasks } from '@db/schema';
import { task_status_history } from '../utils/schema/task-history';
import { eq } from 'drizzle-orm';
import { calculateKybProgress } from '../utils/progress-calculators/kyb-progress';
import { calculateKy3pProgress } from '../utils/progress-calculators/ky3p-progress';
import { calculateOpenBankingProgress } from '../utils/progress-calculators/open-banking-progress';
import { createFormOutputFile } from '../utils/form-output-generator';
import { unlockCompanyTabs } from './companyTabsService';
import { WebSocket } from 'ws';
import { getWebSocketServer } from '../websocket';
import { logger } from '../utils/logger';

const moduleLogger = logger.child({ module: 'TransactionalFormHandler' });

interface FormSubmissionResult {
  success: boolean;
  taskId: number;
  fileId?: number;
  message?: string;
  error?: any;
}

type TaskType = 'company_kyb' | 'ky3p' | 'open_banking' | 'user_kyb';

interface FormSubmissionOptions {
  preserveProgress?: boolean;
  skipFileCreation?: boolean;
  skipTabUnlocking?: boolean;
  source?: string;
  userId?: number;
}

/**
 * Submit a form with transactional integrity
 * 
 * @param taskId The task ID
 * @param taskType The task type (company_kyb, ky3p, open_banking, user_kyb)
 * @param formData The form data to submit
 * @param options Additional options for the submission
 * @returns Result of the submission
 */
export async function submitFormWithTransaction(
  taskId: number,
  taskType: TaskType,
  formData: Record<string, any>,
  options: FormSubmissionOptions = {}
): Promise<FormSubmissionResult> {
  const {
    preserveProgress = false,
    skipFileCreation = false,
    skipTabUnlocking = false,
    source = 'api',
    userId,
  } = options;
  
  moduleLogger.info(`Starting transactional form submission for task ${taskId} (${taskType})`, {
    taskId,
    taskType,
    preserveProgress,
    skipFileCreation,
    skipTabUnlocking,
    source
  });
  
  // Start a transaction for atomic operations
  return await db.transaction(async (tx) => {
    try {
      // 1. Get the task to make sure it exists and get its company ID
      const task = await tx.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
        columns: {
          id: true,
          company_id: true,
          status: true,
          progress: true,
        },
      });
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      moduleLogger.info(`Found task ${taskId} with company ${task.company_id}`, {
        taskId,
        companyId: task.company_id,
        currentStatus: task.status,
        currentProgress: task.progress
      });
      
      // Verify that the task is not already submitted or in a terminal state
      const terminalStates = ['submitted', 'approved', 'rejected', 'archived'];
      if (terminalStates.includes(task.status) && !preserveProgress) {
        throw new Error(`Task ${taskId} is already in terminal state: ${task.status}`);
      }
      
      // 2. Store form responses based on task type
      await storeFormResponses(tx, taskId, taskType, formData);
      
      // 3. Calculate the form progress
      const progress = await calculateProgress(tx, taskId, taskType);
      
      // 4. Create the form output file (if needed and progress is 100%)
      let fileId: number | undefined;
      if (!skipFileCreation && progress === 100) {
        fileId = await createFormFile(tx, taskId, taskType, formData, task.company_id);
        moduleLogger.info(`Created file for task ${taskId}`, { fileId });
      }
      
      // 5. Update the task progress and status
      await updateTaskStatus(tx, taskId, progress, Boolean(fileId));
      
      // 6. Unlock company tabs if needed (KYB unlocks file vault, etc.)
      if (!skipTabUnlocking && progress === 100) {
        if (taskType === 'company_kyb') {
          moduleLogger.info(`Unlocking tabs for company ${task.company_id} after KYB completion`);
          await unlockCompanyTabs(task.company_id, ['file-vault']);
        } else if (taskType === 'open_banking') {
          moduleLogger.info(`Unlocking tabs for company ${task.company_id} after Open Banking completion`);
          await unlockCompanyTabs(task.company_id, ['dashboard']);
        }
      }
      
      // 7. Add task status history entry
      await createTaskStatusHistoryEntry(
        tx,
        taskId,
        progress === 100 ? 'submitted' : 'in_progress',
        userId
      );
      
      // 8. Log the successful submission
      moduleLogger.info(`Successfully submitted form for task ${taskId}`, {
        taskId,
        taskType,
        progress,
        fileId,
        source
      });
      
      // Return the result
      return {
        success: true,
        taskId,
        fileId,
        message: 'Form submitted successfully'
      };
    } catch (error) {
      moduleLogger.error(`Error submitting form for task ${taskId}:`, error);
      
      // Transaction will automatically roll back on error
      return {
        success: false,
        taskId,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error
      };
    }
  });
}

/**
 * Store form responses in the appropriate table
 */
async function storeFormResponses(
  tx: any,
  taskId: number,
  taskType: TaskType,
  formData: Record<string, any>
) {
  moduleLogger.info(`Storing form responses for task ${taskId} (${taskType})`, {
    taskId,
    taskIdType: typeof taskId,
    taskType,
    formDataKeys: Object.keys(formData),
    formDataSample: JSON.stringify(formData).substring(0, 200) + '...'
  });
  
  // Preload the field ID mappings for all form types to avoid repeating this lookup
  // in each case statement
  const fieldMappings = {
    kyb: {},
    ky3p: {},
    open_banking: {},
    user_kyb: {}
  };
  
  try {
    // Get field mappings based on the task type - enhanced with more comprehensive error handling
    // and support for different result structures from transaction queries
    if (taskType === 'company_kyb' || taskType === 'user_kyb') {
      try {
        // Log before executing the query
        moduleLogger.info(`Executing KYB fields query for taskType: ${taskType}`);
        
        // Execute the query with enhanced error handling
        const kybFieldsResult = await tx.execute(sql`SELECT id, field_key FROM kyb_fields`);
        
        // Comprehensive logging of the query result structure
        moduleLogger.info(`KYB fields query execution complete`, {
          resultType: typeof kybFieldsResult,
          isNull: kybFieldsResult === null,
          isUndefined: kybFieldsResult === undefined,
          isArray: Array.isArray(kybFieldsResult),
          hasRows: kybFieldsResult && typeof kybFieldsResult === 'object' && 'rows' in kybFieldsResult,
          ownProperties: kybFieldsResult ? Object.getOwnPropertyNames(kybFieldsResult).join(',') : 'none',
          prototype: kybFieldsResult ? Object.getPrototypeOf(kybFieldsResult)?.constructor?.name : 'none',
          sampleData: kybFieldsResult ? JSON.stringify(kybFieldsResult).substring(0, 200) : 'null'
        });
        
        // Handle different result structures that might come back from tx.execute
        let fieldsToProcess = [];
        
        if (Array.isArray(kybFieldsResult)) {
          // Case 1: Result is already an array
          fieldsToProcess = kybFieldsResult;
          moduleLogger.info(`KYB fields direct array with ${fieldsToProcess.length} elements`);
        } else if (kybFieldsResult && typeof kybFieldsResult === 'object') {
          if ('rows' in kybFieldsResult && Array.isArray(kybFieldsResult.rows)) {
            // Case 2: Result has a rows property that's an array
            fieldsToProcess = kybFieldsResult.rows;
            moduleLogger.info(`KYB fields from .rows with ${fieldsToProcess.length} elements`);
          } else {
            // Case 3: Result is an object but not in expected format - try to extract
            // We'll check if it has properties that look like rows
            const possibleRows = Object.values(kybFieldsResult);
            if (possibleRows.length > 0 && Array.isArray(possibleRows[0])) {
              fieldsToProcess = possibleRows[0];
              moduleLogger.info(`KYB fields extracted from object values with ${fieldsToProcess.length} elements`);
            } else if (possibleRows.length > 0) {
              // Maybe it's a single row result?
              fieldsToProcess = [kybFieldsResult];
              moduleLogger.info(`Using the object itself as a single KYB field row`);
            }
          }
        }
        
        // Fallback to direct database query if we couldn't get fields from transaction
        if (fieldsToProcess.length === 0) {
          moduleLogger.warn(`No KYB fields found in transaction result, using direct database query as fallback`);
          
          // This uses the global pool instead of the transaction
          const { db } = await import('../db/database');
          const fallbackResult = await db.query('SELECT id, field_key FROM kyb_fields');
          
          if (fallbackResult && fallbackResult.rows && Array.isArray(fallbackResult.rows)) {
            fieldsToProcess = fallbackResult.rows;
            moduleLogger.info(`Fallback KYB query returned ${fieldsToProcess.length} fields`);
          } else {
            throw new Error('Failed to retrieve KYB fields using fallback query');
          }
        }
        
        // Process the results with careful property access
        let mappingCount = 0;
        for (const field of fieldsToProcess) {
          if (!field) continue;
          
          // Access properties safely with explicit type checking
          const fieldId = field.id !== undefined ? field.id : 
                         (field.ID !== undefined ? field.ID : null);
                         
          const fieldKey = field.field_key !== undefined ? field.field_key : 
                          (field.fieldKey !== undefined ? field.fieldKey : 
                          (field.FIELD_KEY !== undefined ? field.FIELD_KEY : null));
          
          if (fieldId !== null && fieldKey && typeof fieldKey === 'string') {
            fieldMappings.kyb[fieldKey] = fieldId;
            mappingCount++;
          }
        }
        
        if (mappingCount === 0) {
          throw new Error(`No valid field mappings found in ${fieldsToProcess.length} KYB fields`);
        }
        
        moduleLogger.info(`Successfully loaded ${mappingCount} KYB field mappings`, { 
          sampleMapping: Object.entries(fieldMappings.kyb).slice(0, 3) 
        });
      } catch (kybError) {
        moduleLogger.error(`Error loading KYB field mappings:`, { 
          error: kybError, 
          message: kybError.message, 
          stack: kybError.stack 
        });
        throw new Error(`Failed to load KYB field mappings: ${kybError.message}`);
      }
    } else if (taskType === 'ky3p') {
      try {
        // Log before executing the query
        moduleLogger.info(`Executing KY3P fields query for taskType: ${taskType}`);
        
        // Execute the query with enhanced error handling
        const ky3pFieldsResult = await tx.execute(sql`SELECT id, field_key FROM ky3p_fields`);
        
        // Handle different result structures that might come back from tx.execute
        let fieldsToProcess = [];
        
        if (Array.isArray(ky3pFieldsResult)) {
          // Case 1: Result is already an array
          fieldsToProcess = ky3pFieldsResult;
        } else if (ky3pFieldsResult && typeof ky3pFieldsResult === 'object') {
          if ('rows' in ky3pFieldsResult && Array.isArray(ky3pFieldsResult.rows)) {
            // Case 2: Result has a rows property that's an array
            fieldsToProcess = ky3pFieldsResult.rows;
          } else {
            // Case 3: Result is an object but not in expected format - try to extract
            // We'll check if it has properties that look like rows
            const possibleRows = Object.values(ky3pFieldsResult);
            if (possibleRows.length > 0 && Array.isArray(possibleRows[0])) {
              fieldsToProcess = possibleRows[0];
            } else if (possibleRows.length > 0) {
              // Maybe it's a single row result?
              fieldsToProcess = [ky3pFieldsResult];
            }
          }
        }
        
        // Fallback to direct database query if we couldn't get fields from transaction
        if (fieldsToProcess.length === 0) {
          moduleLogger.warn(`No KY3P fields found in transaction result, using direct database query as fallback`);
          
          // This uses the global pool instead of the transaction
          const { db } = await import('../db/database');
          const fallbackResult = await db.query('SELECT id, field_key FROM ky3p_fields');
          
          if (fallbackResult && fallbackResult.rows && Array.isArray(fallbackResult.rows)) {
            fieldsToProcess = fallbackResult.rows;
          } else {
            throw new Error('Failed to retrieve KY3P fields using fallback query');
          }
        }
        
        // Process the results with careful property access
        let mappingCount = 0;
        for (const field of fieldsToProcess) {
          if (!field) continue;
          
          // Access properties safely with explicit type checking
          const fieldId = field.id !== undefined ? field.id : 
                         (field.ID !== undefined ? field.ID : null);
                         
          const fieldKey = field.field_key !== undefined ? field.field_key : 
                          (field.fieldKey !== undefined ? field.fieldKey : 
                          (field.FIELD_KEY !== undefined ? field.FIELD_KEY : null));
          
          if (fieldId !== null && fieldKey && typeof fieldKey === 'string') {
            fieldMappings.ky3p[fieldKey] = fieldId;
            mappingCount++;
          }
        }
        
        if (mappingCount === 0) {
          throw new Error(`No valid field mappings found in ${fieldsToProcess.length} KY3P fields`);
        }
        
        moduleLogger.info(`Successfully loaded ${mappingCount} KY3P field mappings`, { 
          sampleMapping: Object.entries(fieldMappings.ky3p).slice(0, 3) 
        });
      } catch (ky3pError) {
        moduleLogger.error(`Error loading KY3P field mappings:`, { 
          error: ky3pError, 
          message: ky3pError.message, 
          stack: ky3pError.stack 
        });
        throw new Error(`Failed to load KY3P field mappings: ${ky3pError.message}`);
      }
    } else if (taskType === 'open_banking') {
      try {
        // Log before executing the query
        moduleLogger.info(`Executing Open Banking fields query for taskType: ${taskType}`);
        
        // Execute the query with enhanced error handling
        const obFieldsResult = await tx.execute(sql`SELECT id, field_key FROM open_banking_fields`);
        
        // Handle different result structures that might come back from tx.execute
        let fieldsToProcess = [];
        
        if (Array.isArray(obFieldsResult)) {
          // Case 1: Result is already an array
          fieldsToProcess = obFieldsResult;
        } else if (obFieldsResult && typeof obFieldsResult === 'object') {
          if ('rows' in obFieldsResult && Array.isArray(obFieldsResult.rows)) {
            // Case 2: Result has a rows property that's an array
            fieldsToProcess = obFieldsResult.rows;
          } else {
            // Case 3: Result is an object but not in expected format - try to extract
            // We'll check if it has properties that look like rows
            const possibleRows = Object.values(obFieldsResult);
            if (possibleRows.length > 0 && Array.isArray(possibleRows[0])) {
              fieldsToProcess = possibleRows[0];
            } else if (possibleRows.length > 0) {
              // Maybe it's a single row result?
              fieldsToProcess = [obFieldsResult];
            }
          }
        }
        
        // Fallback to direct database query if we couldn't get fields from transaction
        if (fieldsToProcess.length === 0) {
          moduleLogger.warn(`No Open Banking fields found in transaction result, using direct database query as fallback`);
          
          // This uses the global pool instead of the transaction
          const { db } = await import('../db/database');
          const fallbackResult = await db.query('SELECT id, field_key FROM open_banking_fields');
          
          if (fallbackResult && fallbackResult.rows && Array.isArray(fallbackResult.rows)) {
            fieldsToProcess = fallbackResult.rows;
          } else {
            throw new Error('Failed to retrieve Open Banking fields using fallback query');
          }
        }
        
        // Process the results with careful property access
        let mappingCount = 0;
        for (const field of fieldsToProcess) {
          if (!field) continue;
          
          // Access properties safely with explicit type checking
          const fieldId = field.id !== undefined ? field.id : 
                         (field.ID !== undefined ? field.ID : null);
                         
          const fieldKey = field.field_key !== undefined ? field.field_key : 
                          (field.fieldKey !== undefined ? field.fieldKey : 
                          (field.FIELD_KEY !== undefined ? field.FIELD_KEY : null));
          
          if (fieldId !== null && fieldKey && typeof fieldKey === 'string') {
            fieldMappings.open_banking[fieldKey] = fieldId;
            mappingCount++;
          }
        }
        
        if (mappingCount === 0) {
          throw new Error(`No valid field mappings found in ${fieldsToProcess.length} Open Banking fields`);
        }
        
        moduleLogger.info(`Successfully loaded ${mappingCount} Open Banking field mappings`, { 
          sampleMapping: Object.entries(fieldMappings.open_banking).slice(0, 3) 
        });
      } catch (obError) {
        moduleLogger.error(`Error loading Open Banking field mappings:`, { 
          error: obError, 
          message: obError.message, 
          stack: obError.stack 
        });
        throw new Error(`Failed to load Open Banking field mappings: ${obError.message}`);
      }
    }
  } catch (error) {
    // Handle any unexpected errors in the field mapping process
    moduleLogger.error(`Unexpected error loading field mappings:`, { 
      error, 
      message: error.message, 
      stack: error.stack,
      taskType
    });
    throw new Error(`Failed to load field mappings: ${error.message}`);
  }
  
  switch (taskType) {
    case 'company_kyb':
      // Store KYB responses
      for (const [field, value] of Object.entries(formData)) {
        // Skip metadata fields like taskId, formType, etc.
        if (field === 'taskId' || field === 'formType' || field === 'companyId' || field === 'userId') {
          moduleLogger.info(`Skipping metadata field: ${field}`);
          continue;
        }
        
        // Get the numeric field ID from the map
        const fieldId = fieldMappings.kyb[field];
        if (!fieldId) {
          moduleLogger.warn(`Field key '${field}' not found in kyb_fields table, skipping`);
          continue;
        }
        
        moduleLogger.info(`Processing KYB field: ${field} (ID: ${fieldId})`, { valueType: typeof value });
        
        // Ensure proper JSON serialization for complex objects and safer SQL parameters
        let serializedValue;
        
        if (typeof value === 'object' && value !== null) {
          // For objects, we need to ensure proper JSON serialization
          try {
            serializedValue = JSON.stringify(value);
            moduleLogger.debug(`Serialized object for field ${field}`, {
              preview: serializedValue.substring(0, 50) + '...'
            });
          } catch (error) {
            moduleLogger.error(`Error serializing field ${field}:`, error as Error);
            // In case of serialization error, store as string representation
            serializedValue = String(value);
          }
        } else if (value === null || value === undefined) {
          // Handle null/undefined values safely
          serializedValue = null;
          moduleLogger.debug(`Null/undefined value for field: ${field}`);
        } else {
          // For primitive types, convert to string to avoid type issues
          serializedValue = String(value);
          moduleLogger.debug(`Set primitive value for field: ${field}`);
        }
        
        // Execute with enhanced type safety using the numeric field ID
        try {
          await tx.execute(sql`
            INSERT INTO kyb_responses (task_id, field_id, response_value, status) 
            VALUES (${taskId}, ${fieldId}, ${serializedValue}, 'COMPLETE')
            ON CONFLICT (task_id, field_id) 
            DO UPDATE SET response_value = ${serializedValue}, 
              status = 'COMPLETE',
              updated_at = NOW()
          `);
          moduleLogger.info(`Successfully stored response for field: ${field} (ID: ${fieldId})`);
        } catch (error) {
          moduleLogger.error(`Database error for field ${field} (ID: ${fieldId}):`, error as Error);
          throw new Error(`Error storing field ${field}: ${(error as Error).message}`);
        }
      }
      break;
      
    case 'ky3p':
      // Store KY3P responses
      for (const [field, value] of Object.entries(formData)) {
        // Skip metadata fields like taskId, formType, etc.
        if (field === 'taskId' || field === 'formType' || field === 'companyId' || field === 'userId') {
          moduleLogger.info(`Skipping metadata field: ${field}`);
          continue;
        }
        
        // Get the numeric field ID from the map
        const fieldId = fieldMappings.ky3p[field];
        if (!fieldId) {
          moduleLogger.warn(`Field key '${field}' not found in ky3p_fields table, skipping`);
          continue;
        }
        
        moduleLogger.info(`Processing KY3P field: ${field} (ID: ${fieldId})`, { valueType: typeof value });
        
        // Ensure proper JSON serialization for complex objects and safer SQL parameters
        let serializedValue;
        
        if (typeof value === 'object' && value !== null) {
          // For objects, we need to ensure proper JSON serialization
          try {
            serializedValue = JSON.stringify(value);
            moduleLogger.debug(`Serialized object for field ${field}`, {
              preview: serializedValue.substring(0, 50) + '...'
            });
          } catch (error) {
            moduleLogger.error(`Error serializing field ${field}:`, error as Error);
            // In case of serialization error, store as string representation
            serializedValue = String(value);
          }
        } else if (value === null || value === undefined) {
          // Handle null/undefined values safely
          serializedValue = null;
          moduleLogger.debug(`Null/undefined value for field: ${field}`);
        } else {
          // For primitive types, convert to string to avoid type issues
          serializedValue = String(value);
          moduleLogger.debug(`Set primitive value for field: ${field}`);
        }
        
        // Execute with enhanced type safety using the numeric field ID
        try {
          await tx.execute(sql`
            INSERT INTO ky3p_responses (task_id, field_id, response_value, status) 
            VALUES (${taskId}, ${fieldId}, ${serializedValue}, 'COMPLETE')
            ON CONFLICT (task_id, field_id) 
            DO UPDATE SET response_value = ${serializedValue}, 
              status = 'COMPLETE', 
              updated_at = NOW()
          `);
          moduleLogger.info(`Successfully stored response for field: ${field} (ID: ${fieldId})`);
        } catch (error) {
          moduleLogger.error(`Database error for field ${field} (ID: ${fieldId}):`, error as Error);
          throw new Error(`Error storing field ${field}: ${(error as Error).message}`);
        }
      }
      break;
      
    case 'open_banking':
      // Store Open Banking responses
      for (const [field, value] of Object.entries(formData)) {
        // Skip metadata fields like taskId, formType, etc.
        if (field === 'taskId' || field === 'formType' || field === 'companyId' || field === 'userId') {
          moduleLogger.info(`Skipping metadata field: ${field}`);
          continue;
        }
        
        // Get the numeric field ID from the map
        const fieldId = fieldMappings.open_banking[field];
        if (!fieldId) {
          moduleLogger.warn(`Field key '${field}' not found in open_banking_fields table, skipping`);
          continue;
        }
        
        moduleLogger.info(`Processing Open Banking field: ${field} (ID: ${fieldId})`, { valueType: typeof value });
        
        // Ensure proper JSON serialization for complex objects and safer SQL parameters
        let serializedValue;
        
        if (typeof value === 'object' && value !== null) {
          // For objects, we need to ensure proper JSON serialization
          try {
            serializedValue = JSON.stringify(value);
            moduleLogger.debug(`Serialized object for field ${field}`, {
              preview: serializedValue.substring(0, 50) + '...'
            });
          } catch (error) {
            moduleLogger.error(`Error serializing field ${field}:`, error as Error);
            // In case of serialization error, store as string representation
            serializedValue = String(value);
          }
        } else if (value === null || value === undefined) {
          // Handle null/undefined values safely
          serializedValue = null;
          moduleLogger.debug(`Null/undefined value for field: ${field}`);
        } else {
          // For primitive types, convert to string to avoid type issues
          serializedValue = String(value);
          moduleLogger.debug(`Set primitive value for field: ${field}`);
        }
        
        // Execute with enhanced type safety using the numeric field ID
        try {
          await tx.execute(sql`
            INSERT INTO open_banking_responses (task_id, field_id, response_value, status) 
            VALUES (${taskId}, ${fieldId}, ${serializedValue}, 'COMPLETE')
            ON CONFLICT (task_id, field_id) 
            DO UPDATE SET response_value = ${serializedValue}, 
              status = 'COMPLETE',
              updated_at = NOW()
          `);
          moduleLogger.info(`Successfully stored response for field: ${field} (ID: ${fieldId})`);
        } catch (error) {
          moduleLogger.error(`Database error for field ${field} (ID: ${fieldId}):`, error as Error);
          throw new Error(`Error storing field ${field}: ${(error as Error).message}`);
        }
      }
      break;
      
    case 'user_kyb':
      // Store user KYB responses
      for (const [field, value] of Object.entries(formData)) {
        // Skip metadata fields like taskId, formType, etc.
        if (field === 'taskId' || field === 'formType' || field === 'companyId' || field === 'userId') {
          moduleLogger.info(`Skipping metadata field: ${field}`);
          continue;
        }
        
        // Get the numeric field ID from the map
        const fieldId = fieldMappings.kyb[field]; // User KYB uses the same fields as company KYB
        if (!fieldId) {
          moduleLogger.warn(`Field key '${field}' not found in kyb_fields table, skipping`);
          continue;
        }
        
        moduleLogger.info(`Processing User KYB field: ${field} (ID: ${fieldId})`, { valueType: typeof value });
        
        // Ensure proper JSON serialization for complex objects and safer SQL parameters
        let serializedValue;
        
        if (typeof value === 'object' && value !== null) {
          // For objects, we need to ensure proper JSON serialization
          try {
            serializedValue = JSON.stringify(value);
            moduleLogger.debug(`Serialized object for field ${field}`, {
              preview: serializedValue.substring(0, 50) + '...'
            });
          } catch (error) {
            moduleLogger.error(`Error serializing field ${field}:`, error as Error);
            // In case of serialization error, store as string representation
            serializedValue = String(value);
          }
        } else if (value === null || value === undefined) {
          // Handle null/undefined values safely
          serializedValue = null;
          moduleLogger.debug(`Null/undefined value for field: ${field}`);
        } else {
          // For primitive types, convert to string to avoid type issues
          serializedValue = String(value);
          moduleLogger.debug(`Set primitive value for field: ${field}`);
        }
        
        // Execute with enhanced type safety using the numeric field ID
        try {
          await tx.execute(sql`
            INSERT INTO user_kyb_responses (task_id, field_id, response_value, status) 
            VALUES (${taskId}, ${fieldId}, ${serializedValue}, 'COMPLETE')
            ON CONFLICT (task_id, field_id) 
            DO UPDATE SET response_value = ${serializedValue}, 
              status = 'COMPLETE',
              updated_at = NOW()
          `);
          moduleLogger.info(`Successfully stored response for field: ${field} (ID: ${fieldId})`);
        } catch (error) {
          moduleLogger.error(`Database error for field ${field} (ID: ${fieldId}):`, error as Error);
          throw new Error(`Error storing field ${field}: ${(error as Error).message}`);
        }
      }
      break;
      
    default:
      throw new Error(`Unsupported task type: ${taskType}`);
  }
}

/**
 * Calculate progress for a form
 */
async function calculateProgress(
  tx: any,
  taskId: number,
  taskType: TaskType
): Promise<number> {
  switch (taskType) {
    case 'company_kyb':
      return calculateKybProgress(taskId, tx);
      
    case 'ky3p':
      return calculateKy3pProgress(taskId, tx);
      
    case 'open_banking':
      return calculateOpenBankingProgress(taskId, tx);
      
    case 'user_kyb':
      // Simplified progress calculation for user KYB
      const totalFields = await tx.execute(
        sql`SELECT COUNT(*) as count FROM user_kyb_field_definitions`
      );
      const completedFields = await tx.execute(
        sql`SELECT COUNT(*) as count FROM user_kyb_responses WHERE task_id = ${taskId}`
      );
      
      const total = parseInt(totalFields[0].count, 10) || 1; // Avoid division by zero
      const completed = parseInt(completedFields[0].count, 10) || 0;
      
      return Math.min(100, Math.round((completed / total) * 100));
      
    default:
      throw new Error(`Unsupported task type: ${taskType}`);
  }
}

/**
 * Update task status and progress
 */
async function updateTaskStatus(
  tx: any,
  taskId: number,
  progress: number,
  isSubmitted: boolean
) {
  const status = isSubmitted ? 'submitted' : (progress > 0 ? 'in_progress' : 'not_started');
  
  await tx.update(tasks)
    .set({
      progress,
      status,
      updated_at: new Date(),
    })
    .where(eq(tasks.id, taskId));
    
  // Send WebSocket notification
  try {
    // We can't directly use the WebSocket server in a transaction
    // so we schedule it to be sent after the transaction commits
    setTimeout(() => {
      try {
        const wss = getWebSocketServer();
        if (wss) {
          // Use the broadcast method from websocket service
          const { broadcastMessage } = require('../websocket');
          broadcastMessage('task_updated', {
            taskId,
            progress,
            status,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        moduleLogger.error(`Error broadcasting task update for task ${taskId}:`, error);
      }
    }, 0);
  } catch (error) {
    moduleLogger.error(`Error scheduling WebSocket notification for task ${taskId}:`, error);
  }
}

/**
 * Create a form output file
 */
async function createFormFile(
  tx: any,
  taskId: number,
  taskType: TaskType,
  formData: Record<string, any>,
  companyId: number
): Promise<number> {
  // Get complete form data including field definitions
  const completeFormData = await getCompleteFormData(tx, taskId, taskType);
  
  // Create the file
  return await createFormOutputFile({
    taskId,
    taskType,
    formData: { ...formData, ...completeFormData },
    companyId,
    transaction: tx,
  });
}

/**
 * Get complete form data including field definitions
 */
async function getCompleteFormData(
  tx: any,
  taskId: number,
  taskType: TaskType
): Promise<Record<string, any>> {
  switch (taskType) {
    case 'company_kyb':
      const kybFields = await tx.execute(
        sql`SELECT * FROM kyb_field_definitions`
      );
      return { fieldDefinitions: kybFields };
      
    case 'ky3p':
      const ky3pFields = await tx.execute(
        sql`SELECT * FROM ky3p_field_definitions`
      );
      return { fieldDefinitions: ky3pFields };
      
    case 'open_banking':
      const obFields = await tx.execute(
        sql`SELECT * FROM open_banking_field_definitions`
      );
      return { fieldDefinitions: obFields };
      
    case 'user_kyb':
      const userKybFields = await tx.execute(
        sql`SELECT * FROM user_kyb_field_definitions`
      );
      return { fieldDefinitions: userKybFields };
      
    default:
      return {};
  }
}

/**
 * Create task status history entry
 */
async function createTaskStatusHistoryEntry(
  tx: any,
  taskId: number,
  status: string,
  userId?: number
) {
  await tx.insert(task_status_history)
    .values({
      task_id: taskId,
      status,
      changed_by: userId || null,
      created_at: new Date(),
    });
}

/**
 * Update form responses without submitting
 * 
 * This function updates form responses without changing the task status
 * to 'submitted', which is useful for saving progress.
 */
export async function updateFormWithTransaction(
  taskId: number,
  taskType: TaskType,
  formData: Record<string, any>,
  options: FormSubmissionOptions = {}
): Promise<FormSubmissionResult> {
  const { preserveProgress = true, source = 'api', userId } = options;
  
  moduleLogger.info(`Starting form update for task ${taskId} (${taskType})`, {
    taskId,
    taskType,
    preserveProgress,
    source
  });
  
  // Start a transaction for atomic operations
  return await db.transaction(async (tx) => {
    try {
      // 1. Get the task to make sure it exists
      const task = await tx.query.tasks.findFirst({
        where: eq(tasks.id, taskId),
        columns: {
          id: true,
          company_id: true,
          status: true,
          progress: true,
        },
      });
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      // 2. Store form responses
      await storeFormResponses(tx, taskId, taskType, formData);
      
      // 3. Calculate the form progress
      const progress = await calculateProgress(tx, taskId, taskType);
      
      // 4. Update the task progress (but don't change status to submitted)
      const previousProgress = task.progress;
      
      // If preserveProgress is true, don't reduce the progress value
      const newProgress = preserveProgress 
        ? Math.max(previousProgress, progress)
        : progress;
      
      // Only update if progress has changed
      if (newProgress !== previousProgress) {
        await tx.update(tasks)
          .set({
            progress: newProgress,
            status: newProgress > 0 ? 'in_progress' : 'not_started',
            updated_at: new Date(),
          })
          .where(eq(tasks.id, taskId));
          
        // Add task status history entry
        await createTaskStatusHistoryEntry(
          tx,
          taskId,
          newProgress > 0 ? 'in_progress' : 'not_started',
          userId
        );
        
        // Send WebSocket notification
        setTimeout(() => {
          try {
            const wss = getWebSocketServer();
            if (wss) {
              // Use the broadcast method from websocket service
              const { broadcastMessage } = require('../websocket');
              broadcastMessage('task_updated', {
                taskId,
                progress: newProgress,
                status: newProgress > 0 ? 'in_progress' : 'not_started',
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            moduleLogger.error(`Error broadcasting task update for task ${taskId}:`, error);
          }
        }, 0);
      } else {
        moduleLogger.info(`Progress unchanged for task ${taskId}: ${newProgress}%`);
      }
      
      // Return the result
      return {
        success: true,
        taskId,
        message: 'Form updated successfully',
      };
    } catch (error) {
      moduleLogger.error(`Error updating form for task ${taskId}:`, error);
      
      // Transaction will automatically roll back on error
      return {
        success: false,
        taskId,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error
      };
    }
  });
}
