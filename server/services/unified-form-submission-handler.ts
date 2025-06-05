/**
 * Unified Form Submission Handler
 * 
 * This module provides a unified approach to form submissions across all form types
 * (KYB, KY3P, Open Banking), ensuring consistent transaction handling, progress
 * calculation, and client notifications following OODA principles:
 * - Observe: Validate inputs and gather context
 * - Orient: Analyze the data and prepare for processing
 * - Decide: Determine the correct actions to take
 * - Act: Execute the actions within a transaction
 */

import { db } from '@db';
import { tasks, files, companies, TaskStatus } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger';
import * as FileCreationService from './fileCreation';
import { broadcastFormSubmission } from '../utils/unified-websocket';

// Define common form submission input interface
export interface FormSubmissionInput {
  taskId: number;
  formData: Record<string, any>;
  fileName?: string;
  userId?: number;
  transactionId: string;
  startTime: number;
  // Form type determines which specific handlers to use
  formType: 'kyb' | 'ky3p' | 'open_banking';
}

// Common form submission result interface
export interface FormSubmissionResult {
  success: boolean;
  fileId?: string | number;
  companyId?: number;
  warnings?: string[];
  error?: string;
  stack?: string;
  elapsedMs?: number;
  // Form-specific results
  securityTasksUnlocked?: number;  // KYB-specific
  riskScoreUpdated?: boolean;      // KY3P-specific
  dashboardUnlocked?: boolean;     // Open Banking-specific
}

/**
 * Process a form submission with unified transaction handling
 * This is the main entry point for form submissions across all types
 * Streamlined to perform only necessary operations for final submission
 */
export async function processFormSubmission(
  input: FormSubmissionInput
): Promise<FormSubmissionResult> {
  const { taskId, formData, fileName, userId, transactionId, startTime, formType } = input;
  const warnings: string[] = [];
  
  try {
    logger.info(`[${formType.toUpperCase()} Transaction] Processing form submission`, {
      transactionId,
      taskId,
      formType,
      formDataSize: formData ? Object.keys(formData).length : 0,
      timestamp: new Date().toISOString()
    });
    
    // 1. OBSERVE: Get task information and validate inputs
    const task = await getTaskInformation(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Check if task is already submitted
    if (task.status === 'submitted') {
      logger.info(`[${formType.toUpperCase()} Transaction] Task ${taskId} already submitted, returning success`, {
        transactionId,
        taskId
      });
      
      return {
        success: true,
        companyId: task.company_id,
        elapsedMs: performance.now() - startTime
      };
    }
    
    // Ensure the form type matches the task type
    validateFormTypeMatchesTaskType(formType, task.task_type);
    
    // 2. ORIENT: Prepare for processing based on form type
    // Get field definitions for CSV generation
    const fieldsResult = await getFieldDefinitions(formType, taskId);
    
    // 3. DECIDE: Determine if field definitions are valid
    if (!fieldsResult.success) {
      return {
        success: false,
        error: fieldsResult.error || `Failed to get ${formType} field definitions`,
        elapsedMs: performance.now() - startTime
      };
    }
    
    // 4. ACT: Process the form submission within a transaction - STREAMLINED VERSION
    const result = await db.transaction(async (tx) => {
      // Load existing responses for file creation
      const existingResponses = await loadExistingFormResponses(tx, taskId, formType);
      
      // Generate CSV file from existing responses
      const fileCreationResult = await createFormFile(
        formType, 
        taskId, 
        task.company_id || 0,
        existingResponses, 
        fieldsResult.fields,
        fileName
      );
      
      if (!fileCreationResult.success) {
        warnings.push(`Warning: ${fileCreationResult.error || 'Failed to create file'}`);
      }
      
      // Mark task as submitted
      await tx.update(tasks)
        .set({
          status: 'submitted' as TaskStatus,
          progress: 100,
          submitted_at: new Date(),
          submitted_by: userId,
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
      
      // Execute form-specific post-submission actions (unlock tabs, calculate risk, etc.)
      const postSubmissionResult = await executePostSubmissionActions(
        formType,
        task,
        tx,
        userId
      );
      
      // Return combined results
      return {
        success: true,
        fileId: fileCreationResult.fileId,
        companyId: task.company_id,
        ...postSubmissionResult
      };
    });
    
    // Log success
    logger.info(`[${formType.toUpperCase()} Transaction] Transaction completed successfully`, {
      transactionId,
      taskId,
      elapsedMs: performance.now() - startTime
    });
    
    // Broadcast form submission event via WebSocket
    const metadata = {
      formType,
      fileName: result.fileId ? `${formType.toUpperCase()}-${taskId}.csv` : undefined,
      securityTasksUnlocked: result.securityTasksUnlocked,
      riskScoreUpdated: result.riskScoreUpdated,
      dashboardUnlocked: result.dashboardUnlocked,
    };
    
    broadcastFormSubmission(formType, taskId, result.companyId || 0, metadata);
    
    return {
      ...result,
      warnings: warnings.length > 0 ? warnings : undefined,
      elapsedMs: performance.now() - startTime
    };
    
  } catch (error) {
    // Log detailed error information
    logger.error(`[${formType.toUpperCase()} Transaction] Transaction failed`, {
      transactionId,
      taskId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs: performance.now() - startTime
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      elapsedMs: performance.now() - startTime
    };
  }
}

/**
 * Get task information from database
 */
async function getTaskInformation(taskId: number) {
  const [task] = await db.select()
    .from(tasks)
    .where(eq(tasks.id, taskId));
  
  return task;
}

/**
 * Validate that the form type matches the task type
 */
function validateFormTypeMatchesTaskType(formType: string, taskType: string) {
  // Create mappings between form types and task types
  const formToTaskTypeMap: Record<string, string[]> = {
    'kyb': ['company_kyb'],
    'ky3p': ['ky3p', 'sp_ky3p_assessment'],
    'open_banking': ['open_banking_assessment']
  };
  
  if (!formToTaskTypeMap[formType]?.includes(taskType)) {
    throw new Error(`Form type ${formType} does not match task type ${taskType}`);
  }
}

/**
 * Get field definitions based on form type
 */
async function getFieldDefinitions(formType: string, taskId: number) {
  try {
    // This would be a dynamic import or switch based on form type
    let fields: any[] = [];
    
    switch (formType) {
      case 'kyb':
        fields = await db.select()
          .from(db.table('kyb_fields'));
        break;
      case 'ky3p':
        fields = await db.select()
          .from(db.table('ky3p_fields'));
        break;
      case 'open_banking':
        fields = await db.select()
          .from(db.table('open_banking_fields'));
        break;
      default:
        throw new Error(`Unsupported form type: ${formType}`);
    }
    
    return { success: true, fields };
  } catch (error) {
    logger.error(`Failed to get field definitions for ${formType}`, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return { success: false, error: `Failed to get field definitions: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Validate form data against field definitions
 */
function validateFormData(formData: Record<string, any>, fields: any[], formType: string) {
  // Validation logic would depend on form type and fields
  // For now, we'll do a basic check that all required fields are present
  const requiredFields = fields.filter(f => 
    f.validation_rules && 
    typeof f.validation_rules === 'object' && 
    f.validation_rules.required === true
  );
  
  const missingFields = requiredFields.filter(f => 
    !formData[f.field_key] && 
    formData[f.field_key] !== false && 
    formData[f.field_key] !== 0
  );
  
  if (missingFields.length > 0) {
    const fieldNames = missingFields.map(f => f.display_name || f.field_key).join(', ');
    return {
      valid: false,
      message: `Missing required fields: ${fieldNames}`
    };
  }
  
  return { valid: true };
}

/**
 * Save form responses to the appropriate database table
 */
async function saveFormResponses(
  tx: any,
  taskId: number,
  formData: Record<string, any>,
  formType: string,
  userId?: number
) {
  try {
    // Determine which table to use based on form type
    const responseTable = getResponseTableName(formType);
    
    // Delete existing responses for this task if any
    await tx.delete(tx.table(responseTable))
      .where(eq(tx.table(responseTable).task_id, taskId));
    
    // Prepare records for insertion
    const responses = Object.entries(formData).map(([fieldKey, value]) => ({
      task_id: taskId,
      field_id: fieldKey,
      response_value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      created_at: new Date(),
      updated_at: new Date(),
      updated_by: userId
    }));
    
    // Insert new responses
    if (responses.length > 0) {
      await tx.insert(tx.table(responseTable)).values(responses);
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save ${formType} responses: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get the appropriate response table name based on form type
 */
function getResponseTableName(formType: string): string {
  switch (formType) {
    case 'kyb': return 'kyb_responses';
    case 'ky3p': return 'ky3p_responses';
    case 'open_banking': return 'open_banking_responses';
    default: throw new Error(`Unsupported form type: ${formType}`);
  }
}

/**
 * Load existing form responses from the database for a given task
 * This is used when a form is submitted with no data (optimization for final submit)
 * or to check if the responses have changed to avoid unnecessary database operations
 */
async function loadExistingFormResponses(
  tx: any,
  taskId: number,
  formType: string
): Promise<Record<string, any>> {
  try {
    // Determine which table to use based on form type
    const responseTable = getResponseTableName(formType);
    
    // Query existing responses for this task
    const responses = await tx.select()
      .from(tx.table(responseTable))
      .where(eq(tx.table(responseTable).task_id, taskId));
    
    // Convert array of responses to a field key -> value map
    const formDataMap: Record<string, any> = {};
    
    for (const response of responses) {
      let value: any = response.response_value;
      
      // Try to parse JSON values
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      
      formDataMap[response.field_id] = value;
    }
    
    // Log for debugging purposes
    const fieldCount = Object.keys(formDataMap).length;
    logger.debug(`Loaded ${fieldCount} existing responses for task ${taskId} (${formType})`);
    
    return formDataMap;
  } catch (error) {
    logger.error(`Failed to load existing ${formType} responses for task ${taskId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return empty object as fallback
    return {};
  }
}

/**
 * Create a file containing the form data
 */
async function createFormFile(
  formType: string,
  taskId: number,
  companyId: number, 
  formData: Record<string, any>,
  fields: any[],
  fileName?: string
) {
  try {
    // Convert form data to CSV format
    const csvContent = convertResponsesToCSV(fields, formData, formType);
    
    // Get company name for the file name
    const [company] = await db.select({
      name: companies.name
    })
    .from(companies)
    .where(eq(companies.id, companyId));
    
    const companyName = company?.name || 'Company';
    
    // Generate standardized file name
    const generatedFileName = fileName || `${formType.toUpperCase()}-${taskId}-${companyName}-v1.0.csv`;
    
    // Create file record in database
    const fileResult = await FileCreationService.createFile({
      name: generatedFileName,
      content: csvContent,  // Use 'content' instead of 'path'
      type: 'text/csv',
      userId: 1, // Use a default system user ID when no specific user is provided
      companyId: companyId,
      metadata: {
        formType,
        taskId,
        createdAt: new Date().toISOString(),
      }
    });
    
    return {
      success: true,
      fileId: fileResult.fileId
    };
  } catch (error) {
    logger.error(`Failed to create ${formType} file`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId
    });
    
    return {
      success: false,
      error: `Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Convert responses to CSV format
 */
function convertResponsesToCSV(fields: any[], formData: Record<string, any>, formType: string) {
  // CSV headers
  const headers = ['Question Number', 'Group', 'Question', 'Answer', 'Type'];
  const rows = [headers];
  
  // Add data rows
  let questionNumber = 1;
  
  for (const field of fields) {
    // Skip fields without a valid field_key
    if (!field.field_key) {
      continue;
    }
    
    // Format question number
    const formattedNumber = `${questionNumber}`;
    
    // Get answer value
    const rawAnswer = formData[field.field_key];
    let answer = '';
    
    // Handle different data types
    if (rawAnswer !== undefined && rawAnswer !== null) {
      if (typeof rawAnswer === 'object') {
        try {
          answer = JSON.stringify(rawAnswer);
        } catch (e) {
          answer = String(rawAnswer);
        }
      } else {
        answer = String(rawAnswer); 
      }
    }
    
    // Add row
    rows.push([
      formattedNumber,
      field.group || 'Uncategorized',
      field.display_name || field.label || field.question || field.field_key,
      answer,
      field.field_type || 'text'
    ]);
    
    questionNumber++;
  }
  
  // Convert to CSV string with proper escaping
  const csvContent = rows.map(row => 
    row.map(cell => {
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell.replace(/"/g, '""')}"`; 
      }
      return String(cell);
    }).join(',')
  ).join('\n');
  
  return csvContent;
}

/**
 * Execute form-specific post-submission actions
 */
async function executePostSubmissionActions(
  formType: string,
  task: any,
  tx: any,
  userId?: number
): Promise<Partial<FormSubmissionResult>> {
  try {
    // Form-type specific actions
    switch (formType) {
      case 'kyb':
        return await handleKybPostSubmission(task, tx, userId);
      case 'ky3p':
        return await handleKy3pPostSubmission(task, tx, userId);
      case 'open_banking':
        return await handleOpenBankingPostSubmission(task, tx, userId);
      default:
        return {};
    }
  } catch (error) {
    logger.error(`Error in post-submission actions for ${formType}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId: task.id
    });
    
    return {}; // Return empty object - we don't want to fail the whole transaction
  }
}

/**
 * Handle KYB-specific post-submission actions
 */
async function handleKybPostSubmission(
  task: any,
  tx: any,
  userId?: number
): Promise<Partial<FormSubmissionResult>> {
  try {
    // Find security tasks to unlock
    const securityTasks = await tx.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.company_id, task.company_id),
          tx.sql`(${tasks.task_type} = 'security_assessment' OR ${tasks.task_type} = 'sp_ky3p_assessment')`
        )
      );
      
    let unlockedCount = 0;
    
    // Unlock each security task that was dependent on this KYB task
    for (const securityTask of securityTasks) {
      if (securityTask.metadata?.locked === true || 
          securityTask.metadata?.prerequisite_task_id === task.id ||
          securityTask.metadata?.prerequisite_task_type === 'company_kyb') {
        
        // Update the security task to unlock it
        await tx.update(tasks)
          .set({
            metadata: {
              ...securityTask.metadata,
              locked: false,
              prerequisite_completed: true,
              prerequisite_completed_at: new Date().toISOString(),
              prerequisite_completed_by: userId
            },
            updated_at: new Date()
          })
          .where(eq(tasks.id, securityTask.id));
          
        unlockedCount++;
      }
    }
    
    return { securityTasksUnlocked: unlockedCount };
  } catch (error) {
    logger.error('Error unlocking security tasks', {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId: task.id,
      companyId: task.company_id
    });
    return { securityTasksUnlocked: 0 };
  }
}

/**
 * Handle KY3P-specific post-submission actions
 */
async function handleKy3pPostSubmission(
  task: any,
  tx: any,
  userId?: number
): Promise<Partial<FormSubmissionResult>> {
  try {
    // Ensure the task progress is set to 100%
    await tx.update(tasks)
      .set({
        progress: 100,
        status: 'submitted' as TaskStatus,
        metadata: {
          ...task.metadata,
          completed: true,
          submission_date: new Date().toISOString()
        }
      })
      .where(eq(tasks.id, task.id));
      
    logger.info(`[KY3P Submission] Explicitly set task ${task.id} progress to 100% and status to submitted`, {
      taskId: task.id,
      timestamp: new Date().toISOString()
    });
    
    // Update vendor risk score if applicable
    if (task.metadata?.vendor_id) {
      // Vendor risk score calculation logic would go here
      await tx.update(tx.table('vendors'))
        .set({
          last_assessment_date: new Date(),
          last_assessment_by: userId,
          updated_at: new Date()
        })
        .where(eq(tx.table('vendors').id, task.metadata.vendor_id));
      
      return { riskScoreUpdated: true };
    }
    
    return { riskScoreUpdated: false };
  } catch (error) {
    logger.error('Error updating vendor risk score or setting task progress', {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId: task.id,
      vendorId: task.metadata?.vendor_id
    });
    return { riskScoreUpdated: false };
  }
}

/**
 * Handle Open Banking-specific post-submission actions
 */
/**
 * Handles post-submission actions for Open Banking submissions
 * 
 * This function ensures the task is properly marked as completed and
 * unlocks the dashboard and insights tabs for the company. It uses the
 * UnifiedTabService for a consistent approach to tab management.
 * 
 * @param task Task object containing the submission details
 * @param tx Transaction object for database operations
 * @param userId Optional user ID of the submitting user
 * @returns Promise resolving to a partial form submission result
 */
async function handleOpenBankingPostSubmission(
  task: any,
  tx: any,
  userId?: number
): Promise<Partial<FormSubmissionResult>> {
  // Create a context object for consistent logging
  const context = {
    taskId: task.id,
    companyId: task.company_id,
    formType: 'open_banking',
    userId: userId,
    timestamp: new Date().toISOString()
  };
  
  logger.info(`[OpenBankingHandler] Starting post-submission process`, context);
  
  try {
    // Step 1: Update the task to ensure progress is set to 100% and status is submitted
    const submissionTimestamp = new Date().toISOString();
    
    await tx.update(tasks)
      .set({
        progress: 100,
        status: 'submitted' as TaskStatus,
        metadata: {
          ...task.metadata,
          completed: true,
          submission_date: submissionTimestamp
        }
      })
      .where(eq(tasks.id, task.id));
      
    logger.info(`[OpenBankingHandler] Updated task status and progress`, {
      ...context,
      progress: 100,
      status: 'submitted',
      submissionTimestamp
    });
    
    // Step 2: Update the company record to unlock dashboard and insights features
    if (task.company_id) {
      const companyId = task.company_id;
      
      // Get current company data to update metadata properly
      const [company] = await tx.select()
        .from(companies)
        .where(eq(companies.id, companyId));
      
      if (!company) {
        logger.warn(`[OpenBankingHandler] Company not found`, {
          ...context,
          companyId
        });
        return { dashboardUnlocked: false };
      }
      
      // Update company metadata to track unlocked features
      const currentMetadata = company?.metadata || {};
      
      await tx.update(companies)
        .set({
          metadata: {
            ...currentMetadata,
            dashboard_unlocked: true,
            insights_unlocked: true,
            dashboard_unlocked_at: submissionTimestamp,
            insights_unlocked_at: submissionTimestamp,
            dashboard_unlocked_by: userId || currentMetadata.created_by_id
          },
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId));
      
      // Step 3: Use the UnifiedTabService within the transaction to unlock tabs
      // This is imported from the tab-service.ts module which handles all tab operations
      // We're importing it directly here to use it within the transaction
      // Alternatively we could create a method to accept a transaction object 
      const currentTabs = Array.isArray(company.available_tabs) 
        ? company.available_tabs 
        : ['task-center'];
        
      const tabsToAdd = ['dashboard', 'insights'];
      const updatedTabs = [...new Set([...currentTabs, ...tabsToAdd])];
      
      // Only update if there are actual changes
      if (updatedTabs.length !== currentTabs.length || 
          !updatedTabs.every(tab => currentTabs.includes(tab))) {
        
        // Update available_tabs within the transaction
        await tx.update(companies)
          .set({ 
            available_tabs: updatedTabs,
            updated_at: new Date()
          })
          .where(eq(companies.id, companyId));
          
        logger.info(`[OpenBankingHandler] Updated company tabs`, {
          ...context,
          addedTabs: tabsToAdd,
          updatedTabs,
          tabUpdateSuccessful: true
        });
        
        // Note: We will broadcast the tab update after the transaction commits
        // We'll set a flag to ensure this happens in the broadcastFormSubmissionEvent function
      }
      
      logger.info(`[OpenBankingHandler] Post-submission process completed successfully`, {
        ...context,
        dashboardUnlocked: true,
        insightsUnlocked: true,
        availableTabs: updatedTabs
      });
      
      return { 
        dashboardUnlocked: true,
        availableTabs: updatedTabs
      };
    }
    
    logger.warn(`[OpenBankingHandler] No company_id found in task, skipping tab unlock`, context);
    return { dashboardUnlocked: false };
  } catch (error) {
    logger.error('[OpenBankingHandler] Error in post-submission process', {
      ...context,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return { dashboardUnlocked: false };
  }
}

/**
 * Broadcast form submission event
 */
export async function broadcastFormSubmissionEvent(
  taskId: number,
  formType: 'kyb' | 'ky3p' | 'open_banking',
  companyId: number,
  fileId?: string | number,
  metadata: Record<string, any> = {}
) {
  try {
    const broadcastResult = await broadcastFormSubmission({
      taskId,
      formType,
      status: 'submitted',
      companyId,
      fileId,
      progress: 100,
      submissionDate: new Date().toISOString(),
      source: `${formType}-submission-handler`,
      metadata
    });
    
    // Schedule a delayed broadcast to ensure clients receive the update
    scheduleDelayedBroadcast({
      taskId,
      formType,
      status: 'submitted',
      companyId,
      fileId,
      progress: 100,
      submissionDate: new Date().toISOString()
    }, 2000);
    
    return broadcastResult;
  } catch (error) {
    logger.error(`Error broadcasting ${formType} submission`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId
    });
    
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
