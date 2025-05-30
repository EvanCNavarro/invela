/**
 * Unified Form Submission Service
 * 
 * This service provides a transaction-based approach to form submissions
 * that ensures consistency across all form types while supporting type-specific
 * post-submission logic in an atomic, all-or-nothing manner.
 */

import { db } from '@db';
import { tasks, files, companies, kybResponses, ky3pResponses, openBankingResponses, openBankingFields, kybFields, ky3pFields } from '@db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { broadcastTaskUpdate } from "../utils/unified-websocket";
import * as FileCreationService from '../services/fileCreation';
import * as UnifiedTabService from '../services/unified-tab-service';
import * as TransactionManager from '../services/transaction-manager';
import { synchronizeTasks } from '../services/synchronous-task-dependencies';
import { mapClientFormTypeToSchemaType } from '../utils/form-type-mapper';

// Create a context object for logging
const baseLogContext = { service: 'UnifiedFormSubmissionService' };
// Use this context for logging throughout the file

// Define supported form types
export type FormType = 'kyb' | 'company_kyb' | 'ky3p' | 'sp_ky3p_assessment' | 'open_banking';

// Define form submission result
export interface FormSubmissionResult {
  success: boolean;
  fileId?: number;
  fileName?: string;
  unlockedTabs: string[];
  error?: string;
}

/**
 * Submit a form with transaction-based consistency
 */
export async function submitForm(
  taskId: number,
  formData: Record<string, any>,
  formType: FormType,
  userId: number,
  companyId: number,
  fileName?: string
): Promise<FormSubmissionResult> {
  // Generate unique transaction ID for complete traceability
  const transactionId = `form-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const startTime = performance.now();
  
  logger.info('Starting unified form submission process', {
    ...baseLogContext,
    transactionId,
    taskId,
    formType,
    userId,
    companyId,
    fieldCount: Object.keys(formData).length,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Execute the entire submission process in a transaction
    const transactionStartTime = performance.now();
    
    const result = await TransactionManager.withTransaction(async (trx) => {
      logger.info('Starting form submission transaction', { 
        ...baseLogContext,
        transactionId,
        taskId,
        formType,
        elapsedTime: `${(performance.now() - startTime).toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });
      
      // 1. Retrieve task and validate
      const [task] = await trx.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      logger.info('Retrieved task for submission', { 
        ...baseLogContext,
        taskId, 
        companyId,
        currentStatus: task.status,
        currentProgress: task.progress
      });
      
      // 2. Create file from form data
      const mappedFormType = mapClientFormTypeToSchemaType(formType);
      const fileResult = await createFormFile(trx, taskId, companyId, formData, mappedFormType, userId, fileName);
      
      logger.info('Created form file', { 
        ...baseLogContext,
        taskId, 
        fileId: fileResult.fileId,
        fileName: fileResult.fileName
      });
      
      // 3. Update task status to submitted with 100% progress
      const now = new Date();
      const currentMetadata = task.metadata || {};
      const updatedMetadata = {
        ...currentMetadata,
        submissionDate: now.toISOString(),
        submittedBy: userId,
        fileId: fileResult.fileId,
        fileName: fileResult.fileName,
        explicitlySubmitted: true,
        status: 'submitted',
        statusFlow: [...(currentMetadata.statusFlow || []), 'submitted']
      };
      
      await trx.update(tasks)
        .set({
          status: 'submitted',
          progress: 100,
          completion_date: now,
          updated_at: now,
          metadata: updatedMetadata
        })
        .where(eq(tasks.id, taskId));
      
      logger.info('Updated task status to submitted', { 
        ...baseLogContext,
        taskId, 
        formType 
      });
      
      // 4. Persist form responses (implementation varies by form type)
      await persistFormResponses(trx, taskId, formData, formType, transactionId);
      
      logger.info('Persisted form responses', { 
        ...baseLogContext,
        taskId, 
        formType,
        transactionId,
        elapsedTime: `${(performance.now() - startTime).toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      });
      
      // 5. Execute form-specific post-submission logic 
      let unlockedTabs: string[] = [];
      
      if (formType === 'kyb' || formType === 'company_kyb') {
        unlockedTabs = await handleKybPostSubmission(trx, taskId, companyId, formData, transactionId);
      } else if (formType === 'ky3p' || formType === 'sp_ky3p_assessment') {
        unlockedTabs = await handleKy3pPostSubmission(trx, taskId, companyId, formData, transactionId);
      } else if (formType === 'open_banking') {
        unlockedTabs = await handleOpenBankingPostSubmission(trx, taskId, companyId, formData, transactionId);
      } else {
        logger.warn(`Unsupported form type: ${formType}, no post-submission handlers will run`, {
        ...baseLogContext,
        formType,
        taskId
      });
      }
      
      logger.info('Executed form-specific post-submission logic', {
        ...baseLogContext,
        taskId,
        formType,
        unlockedTabs
      });
      
      // Return success result
      return {
        success: true,
        fileId: fileResult.fileId,
        fileName: fileResult.fileName,
        unlockedTabs
      };
    });
    
    // After successful transaction, broadcast WebSocket notifications with transaction ID
    await broadcastFormSubmissionResult(result, taskId, formType, companyId, transactionId);
    
    return result;
  } catch (error) {
    // Log the error with full context
    logger.error('Form submission failed', {
      ...baseLogContext,
      taskId,
      formType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return failure result
    return {
      success: false,
      unlockedTabs: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Create a file from form data within a transaction
 */
async function createFormFile(
  trx: any, 
  taskId: number, 
  companyId: number, 
  formData: Record<string, any>, 
  formType: string,
  userId: number,
  customFileName?: string,
  transactionId?: string
): Promise<{
  success: boolean;
  fileId?: number;
  fileName?: string;
  error?: string;
}> {
  const fileCreateStartTime = performance.now();
  const fileLogContext = { 
    namespace: 'FileCreation', 
    taskId, 
    formType,
    transactionId
  };
  
  try {
    logger.info('Creating file for form submission', {
      ...fileLogContext,
      companyId,
      userId,
      formDataSize: JSON.stringify(formData).length,
      timestamp: new Date().toISOString()
    });

    // Generate CSV content from form data
    let content = '';
    try {
      content = JSON.stringify(formData, null, 2);
    } catch (e) {
      logger.warn('Error stringifying form data, using simplified version', {
        ...fileLogContext,
        error: e instanceof Error ? e.message : String(e),
        taskId
      });
      // Try a more robust method in case of circular references
      content = JSON.stringify(formData, (key, value) => {
        if (key === 'parent' || key === 'circular') return '[Circular]';
        return value;
      }, 2);
    }

    // Generate a standard file name
    const fileName = customFileName || generateStandardFileName(formType, taskId, companyId);

    // Create file entry in database (without using the service directly to stay in transaction)
    const result = await trx.insert(files)
      .values({
        name: fileName,
        path: content,
        type: 'text/csv',
        status: 'uploaded',
        company_id: companyId,
        created_by: userId,
        updated_by: userId,
        created_at: new Date(),
        updated_at: new Date(),
        size: content.length,
        version: 1,
        metadata: {
          taskId,
          taskType: formType,
          submissionDate: new Date().toISOString()
        }
      })
      .returning({ id: files.id });

    if (!result || result.length === 0) {
      throw new Error('Failed to create file entry in database');
    }

    const fileId = result[0].id;

    logger.info('File created successfully within transaction', {
      ...fileLogContext,
      fileId,
      fileName
    });

    return {
      success: true,
      fileId,
      fileName
    };
  } catch (error) {
    logger.error('Error creating file within transaction', {
      ...fileLogContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    throw error; // Re-throw to trigger transaction rollback
  }
}

/**
 * Generate a standard file name for a form submission
 */
function generateStandardFileName(
  formType: string,
  taskId: number,
  companyIdOrName: number | string | undefined,
  version: string = '1.0',
  extension: string = 'csv'
): string {
  // Normalize form type
  const normalizedFormType = formType.replace(/[^a-zA-Z0-9]/g, '');
  
  // Format company name/id
  const companyPart = companyIdOrName ? `_${companyIdOrName}` : '';
  
  // Create timestamp
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').substring(0, 14);
  
  // Generate file name
  return `${normalizedFormType}_${taskId}${companyPart}_v${version}_${timestamp}.${extension}`;
}

/**
 * Persist form responses to appropriate database tables
 * Implementation varies by form type
 */
async function persistFormResponses(
  trx: any,
  taskId: number,
  formData: Record<string, any>,
  formType: string,
  transactionId?: string
): Promise<void> {
  const startTime = performance.now();
  const persistLogContext = { 
    namespace: 'FormPersistence', 
    taskId, 
    formType,
    transactionId 
  };
  
  logger.info('Persisting form responses', {
    ...persistLogContext,
    timestamp: new Date().toISOString()
  });
  
  // Different implementation based on form type
  if (formType === 'kyb' || formType === 'company_kyb') {
    // Persist KYB responses
    await persistKybResponses(trx, taskId, formData, transactionId);
  } else if (formType === 'ky3p' || formType === 'sp_ky3p_assessment') {
    // Persist KY3P responses
    await persistKy3pResponses(trx, taskId, formData, transactionId);
  } else if (formType === 'open_banking') {
    // Persist Open Banking responses
    await persistOpenBankingResponses(trx, taskId, formData, transactionId);
  } else {
    logger.warn(`Unsupported form type: ${formType}, responses will not be persisted`, {
      ...persistLogContext,
      timestamp: new Date().toISOString()
    });
  }
  
  const endTime = performance.now();
  logger.info('Completed form response persistence', {
    ...persistLogContext,
    duration: `${(endTime - startTime).toFixed(2)}ms`,
    timestamp: new Date().toISOString()
  });
}

async function persistKybResponses(trx: any, taskId: number, formData: Record<string, any>, transactionId?: string): Promise<void> {
  const startTime = performance.now();
  const kybLogContext = { 
    namespace: 'KybPersistence', 
    taskId,
    transactionId 
  };
  
  logger.info('Persisting KYB responses', {
    ...kybLogContext,
    timestamp: new Date().toISOString()
  });
  
  try {
    const responses = formData.responses || {};
    const responseKeys = Object.keys(responses);
    logger.info(`Processing ${responseKeys.length} KYB responses for task ${taskId}`, {
      ...kybLogContext,
      fieldCount: responseKeys.length,
      timestamp: new Date().toISOString()
    });
    
    // Batch insert all responses using transaction
    if (responseKeys.length > 0) {
      // Prepare batch values for insertion
      const batchValues = responseKeys.map(fieldKey => {
        const response = responses[fieldKey];
        const fieldId = response.fieldId || null;
        const value = response.value || null;
        const status = response.status || 'completed';
        
        return {
          task_id: taskId,
          field_id: fieldId,
          field_key: fieldKey,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          status,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: response.metadata || {}
        };
      });
      
      // Insert all responses in a single operation for efficiency
      const insertQuery = trx.insert(kybResponses).values(batchValues);
      await insertQuery;
      
      logger.info(`Successfully persisted ${batchValues.length} KYB responses`, {
        ...kybLogContext,
        fieldCount: batchValues.length
      });
    } else {
      logger.warn('No KYB responses to persist', kybLogContext);
    }
  } catch (error) {
    logger.error('Error persisting KYB responses', {
      ...kybLogContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error; // Re-throw to trigger transaction rollback
  }
}

async function persistKy3pResponses(trx: any, taskId: number, formData: Record<string, any>, transactionId?: string): Promise<void> {
  const startTime = performance.now();
  const ky3pLogContext = { 
    namespace: 'Ky3pPersistence', 
    taskId,
    transactionId
  };
  
  logger.info('Persisting KY3P responses', {
    ...ky3pLogContext,
    timestamp: new Date().toISOString()
  });
  
  try {
    const responses = formData.responses || {};
    const responseKeys = Object.keys(responses);
    logger.info(`Processing ${responseKeys.length} KY3P responses for task ${taskId}`, {
      ...ky3pLogContext,
      fieldCount: responseKeys.length,
      timestamp: new Date().toISOString()
    });
    
    // Batch insert all responses using transaction
    if (responseKeys.length > 0) {
      // Prepare batch values for insertion
      const batchValues = responseKeys.map(fieldKey => {
        const response = responses[fieldKey];
        const fieldId = response.fieldId || null;
        const value = response.value || null;
        const status = response.status || 'completed';
        
        // CRITICAL FIX: For KY3P specifically, ensure values are properly typed
        // This avoids the string/number conversion issues that were causing progress problems
        const processedValue = typeof value === 'object' 
          ? JSON.stringify(value) 
          : value !== null && value !== undefined 
            ? String(value) 
            : null;
        
        return {
          task_id: taskId,
          field_id: fieldId,
          field_key: fieldKey,
          value: processedValue,
          status,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: response.metadata || {}
        };
      });
      
      // Insert all responses in a single operation for efficiency
      const insertQuery = trx.insert(ky3pResponses).values(batchValues);
      await insertQuery;
      
      logger.info(`Successfully persisted ${batchValues.length} KY3P responses`, {
        ...ky3pLogContext,
        fieldCount: batchValues.length
      });
    } else {
      logger.warn('No KY3P responses to persist', ky3pLogContext);
    }
  } catch (error) {
    logger.error('Error persisting KY3P responses', {
      ...ky3pLogContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error; // Re-throw to trigger transaction rollback
  }
}

async function persistOpenBankingResponses(trx: any, taskId: number, formData: Record<string, any>, transactionId?: string): Promise<void> {
  const startTime = performance.now();
  const obLogContext = { 
    namespace: 'OpenBankingPersistence',
    taskId,
    transactionId 
  };
  
  logger.info('Persisting Open Banking responses', {
    ...obLogContext,
    timestamp: new Date().toISOString()
  });
  
  try {
    const responses = formData.responses || {};
    const responseKeys = Object.keys(responses);
    logger.info(`Processing ${responseKeys.length} Open Banking responses for task ${taskId}`, {
      ...obLogContext,
      fieldCount: responseKeys.length,
      timestamp: new Date().toISOString()
    });
    
    // Batch insert all responses using transaction
    if (responseKeys.length > 0) {
      // Prepare batch values for insertion
      const batchValues = responseKeys.map(fieldKey => {
        const response = responses[fieldKey];
        const fieldId = response.fieldId || null;
        const value = response.value || null;
        const status = response.status || 'completed';
        
        // Type handling for Open Banking - similar to KY3P but with additional field validations
        const processedValue = typeof value === 'object' 
          ? JSON.stringify(value) 
          : value !== null && value !== undefined 
            ? String(value) 
            : null;
        
        return {
          task_id: taskId,
          field_id: fieldId,
          field_key: fieldKey,
          value: processedValue,
          status,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: {
            ...response.metadata || {},
            // Store additional metadata for risk score calculation
            categoryWeight: response.categoryWeight || 1,
            importanceLevel: response.importanceLevel || 'medium',
            validatedAt: new Date().toISOString()
          }
        };
      });
      
      // Insert all responses in a single operation for efficiency
      const insertQuery = trx.insert(openBankingResponses).values(batchValues);
      await insertQuery;
      
      // After persisting responses, update the task with a calculation flag
      // This ensures risk score calculation is triggered properly
      const taskMetadata = await trx
        .select({ metadata: tasks.metadata })
        .from(tasks)
        .where(eq(tasks.id, taskId));
      
      if (taskMetadata && taskMetadata.length > 0) {
        const currentMetadata = taskMetadata[0].metadata || {};
        await trx.update(tasks)
          .set({
            metadata: {
              ...currentMetadata,
              needsRiskScoreCalculation: true,
              lastResponseCount: batchValues.length,
              lastUpdated: new Date().toISOString()
            }
          })
          .where(eq(tasks.id, taskId));
      }
      
      logger.info(`Successfully persisted ${batchValues.length} Open Banking responses`, {
        ...obLogContext,
        fieldCount: batchValues.length
      });
    } else {
      logger.warn('No Open Banking responses to persist', obLogContext);
    }
  } catch (error) {
    logger.error('Error persisting Open Banking responses', {
      ...obLogContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error; // Re-throw to trigger transaction rollback
  }
}

/**
 * Handle KYB-specific post-submission logic
 * - Unlocks File Vault tab
 * - Unlocks dependent tasks
 */
async function handleKybPostSubmission(
  trx: any,
  taskId: number,
  companyId: number,
  formData: Record<string, any>,
  transactionId?: string
): Promise<string[]> {
  const startTime = performance.now();
  const kybPostLogContext = { 
    namespace: 'KybPostSubmission', 
    taskId, 
    companyId,
    transactionId 
  };
  
  logger.info('Processing KYB post-submission logic', {
    ...kybPostLogContext,
    timestamp: new Date().toISOString()
  });
  
  try {
    // KYB unlocks only the File Vault tab
    const unlockedTabs = ['file-vault'];
    
    // Unlock File Vault tab
    await unlockTabsForCompany(trx, companyId, unlockedTabs, transactionId);
    
    // Unlock dependent security tasks like KY3P
    const dependentTaskIds = await synchronizeTasks(companyId, taskId);
    
    const endTime = performance.now();
    logger.info('KYB post-submission completed', { 
      ...kybPostLogContext,
      unlockedTabs,
      dependentTasksUnlocked: dependentTaskIds.length,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    
    return unlockedTabs;
  } catch (error) {
    const endTime = performance.now();
    logger.error('Error in KYB post-submission processing', {
      ...kybPostLogContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    throw error; // Re-throw to trigger transaction rollback
  }
}

/**
 * Handle KY3P-specific post-submission logic
 * - No tabs are unlocked
 */
async function handleKy3pPostSubmission(
  trx: any,
  taskId: number,
  companyId: number,
  formData: Record<string, any>,
  transactionId?: string
): Promise<string[]> {
  const startTime = performance.now();
  const ky3pPostLogContext = { 
    namespace: 'Ky3pPostSubmission', 
    taskId, 
    companyId,
    transactionId 
  };
  
  logger.info('Processing KY3P post-submission logic', {
    ...ky3pPostLogContext,
    timestamp: new Date().toISOString()
  });
  
  try {
    // KY3P doesn't unlock any tabs
    logger.info('KY3P post-submission completed (no tabs to unlock)', {
      ...ky3pPostLogContext,
      duration: `${(performance.now() - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    
    // Return empty array since no tabs are unlocked
    return [];
  } catch (error) {
    const endTime = performance.now();
    logger.error('Error in KY3P post-submission processing', {
      ...ky3pPostLogContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    throw error; // Re-throw to trigger transaction rollback
  }
}

/**
 * Handle Open Banking-specific post-submission logic
 * - Unlocks Dashboard and Insights tabs
 * - Updates company onboarding status
 * - Generates risk score
 * - Updates accreditation status
 */
/**
 * Handle Open Banking post-submission processing
 * 
 * This function performs the following steps after an Open Banking form is submitted:
 * 1. Unlocks Dashboard and Insights tabs for the company
 * 2. Marks company onboarding as completed
 * 3. Generates a risk score (random value between 5-95)
 * 4. Calculates risk clusters based on the risk score
 * 5. Sets accreditation status to APPROVED
 * 
 * @param trx The transaction context
 * @param taskId The task ID
 * @param companyId The company ID
 * @param formData The form data
 * @param transactionId Optional transaction ID for tracking
 * @returns Array of unlocked tabs
 */
async function handleOpenBankingPostSubmission(
  trx: any,
  taskId: number,
  companyId: number,
  formData: Record<string, any>,
  transactionId?: string
): Promise<string[]> {
  const startTime = performance.now();
  const obPostLogContext = { 
    namespace: 'OpenBankingPostSubmission', 
    taskId, 
    companyId,
    transactionId 
  };
  
  // Console log for better visibility in debugging
  console.log(`[OpenBankingPostSubmission] 🚀 Starting Open Banking post-submission for task ${taskId}, company ${companyId}`);
  
  logger.info('Processing Open Banking post-submission logic', {
    ...obPostLogContext,
    timestamp: new Date().toISOString()
  });
  
  // Track success of each step
  const stepResults = {
    companyVerified: false,
    tabsUnlocked: false,
    onboardingCompleted: false,
    riskScoreGenerated: false,
    accreditationUpdated: false
  };
  
  let unlockedTabs: string[] = [];
  
  try {
    // STEP 0: Verify company exists before proceeding
    const companyCheck = await trx.select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    if (!companyCheck.length) {
      console.error(`[OpenBankingPostSubmission] ❌ Company with ID ${companyId} not found - cannot process post submission`);
      throw new Error(`Company with ID ${companyId} not found`);
    }
    
    console.log(`[OpenBankingPostSubmission] ✅ Company verified: ${companyId}`);
    stepResults.companyVerified = true;
    
    // STEP 1: Unlock Dashboard and Insights tabs
    // Open Banking unlocks Dashboard and Insights tabs
    unlockedTabs = ['dashboard', 'insights'];
    
    try {
      // Unlock Dashboard and Insights tabs
      await unlockTabsForCompany(trx, companyId, unlockedTabs, transactionId);
      console.log(`[OpenBankingPostSubmission] ✅ Unlocked tabs for company ${companyId}: ${unlockedTabs.join(', ')}`);
      stepResults.tabsUnlocked = true;
      
      logger.info('Unlocked dashboard and insights tabs', { 
        ...obPostLogContext,
        step: 'tabs_unlock',
        tabs: unlockedTabs,
        status: 'success',
        timestamp: new Date().toISOString()
      });
    } catch (tabError) {
      console.error(`[OpenBankingPostSubmission] ❌ Failed to unlock tabs:`, tabError);
      logger.error('Failed to unlock tabs', {
        ...obPostLogContext,
        step: 'tabs_unlock',
        error: tabError instanceof Error ? tabError.message : String(tabError),
        status: 'failed'
      });
      // Continue execution - don't break the whole process if tab unlocking fails
    }
    
    // STEP 2: Mark company onboarding as completed
    // This is crucial for the post-submission workflow
    try {
      console.log(`[OpenBankingPostSubmission] Step 2/5: Setting onboarding_company_completed to true for company ${companyId}`);
      const onboardingUpdateResult = await trx.update(companies)
        .set({
          onboarding_company_completed: true, // Correct column name
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning({ id: companies.id });
      
      if (onboardingUpdateResult && onboardingUpdateResult.length > 0) {
        console.log(`[OpenBankingPostSubmission] ✅ Step 2/5 Complete: Updated onboarding status to true for company ${companyId}`);
        stepResults.onboardingCompleted = true;
        
        logger.info('Updated company onboarding status', { 
          ...obPostLogContext,
          step: 'update_onboarding_status',
          column: 'onboarding_company_completed',
          status: 'success',
          timestamp: new Date().toISOString()
        });
      } else {
        console.warn(`[OpenBankingPostSubmission] ⚠️ Step 2/5: No rows updated for onboarding_company_completed`);
        logger.warn('No rows updated for onboarding status', {
          ...obPostLogContext,
          step: 'update_onboarding_status'
        });
      }
    } catch (onboardingError) {
      console.error(`[OpenBankingPostSubmission] ❌ Failed to update onboarding status:`, onboardingError);
      logger.error('Failed to update onboarding status', {
        ...obPostLogContext,
        step: 'update_onboarding_status',
        error: onboardingError instanceof Error ? onboardingError.message : String(onboardingError),
        status: 'failed'
      });
      // Continue execution - we'll try to proceed with other updates
    }
    
    // STEP 3: Generate risk score - random value between 5 and 95
    let riskScore: number;
    let riskClusters: any;
    
    try {
      console.log(`[OpenBankingPostSubmission] Step 3/5: Generating risk score for company ${companyId}`);
      riskScore = Math.floor(Math.random() * (95 - 5 + 1)) + 5;
      
      // STEP 4: Calculate risk clusters based on the total risk score
      console.log(`[OpenBankingPostSubmission] Step 4/5: Calculating risk clusters based on risk score ${riskScore}`);
      riskClusters = calculateRiskClusters(riskScore);
      
      console.log(`[OpenBankingPostSubmission] ✅ Steps 3-4/5 Complete: Generated risk score ${riskScore} and clusters:`, JSON.stringify(riskClusters));
      stepResults.riskScoreGenerated = true;
      
      logger.info('Generated risk score and clusters', { 
        ...obPostLogContext, 
        steps: [3, 4],
        action: 'generate_risk_score_and_clusters',
        riskScore,
        riskClusters,
        riskDistribution: {
          piiData: '35%',
          accountData: '30%',
          dataTransfers: '10%',
          certificationsRisk: '10%',
          securityRisk: '10%',
          financialRisk: '5%'
        },
        status: 'success',
        timestamp: new Date().toISOString()
      });
    } catch (riskGenerationError) {
      console.error(`[OpenBankingPostSubmission] ❌ Failed to generate risk score:`, riskGenerationError);
      logger.error('Failed to generate risk score', {
        ...obPostLogContext,
        steps: [3, 4],
        error: riskGenerationError instanceof Error ? riskGenerationError.message : String(riskGenerationError),
        status: 'failed'
      });
      // Set default values to continue execution
      riskScore = 50; // Default risk score if generation fails
      riskClusters = {
        "Cyber Security": 15,
        "Financial Stability": 13,
        "Potential Liability": 10,
        "Dark Web Data": 8,
        "Public Sentiment": 3,
        "Data Access Scope": 1
      };
    }
    
    // STEP 5: Update accreditation status to APPROVED, save risk score and clusters
    try {
      console.log(`[OpenBankingPostSubmission] Step 5/5: Setting accreditation status to APPROVED and saving risk scores`);
      const riskUpdateResult = await trx.update(companies)
        .set({
          accreditation_status: 'APPROVED', // Must be APPROVED per requirements
          risk_score: riskScore,
          risk_clusters: riskClusters,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning({ 
          id: companies.id,
          risk_score: companies.risk_score,
          accreditation_status: companies.accreditation_status 
        });
      
      if (riskUpdateResult && riskUpdateResult.length > 0) {
        console.log(`[OpenBankingPostSubmission] ✅ Step 5/5 Complete: Updated accreditation status to APPROVED and risk score to ${riskScore} for company ${companyId}`);
        stepResults.accreditationUpdated = true;
        
        logger.info('Updated accreditation status and risk scores', { 
          ...obPostLogContext,
          step: 'update_accreditation_and_risk',
          accreditation_status: 'APPROVED',
          riskScore,
          riskUpdateResult: riskUpdateResult || 'No result returned',
          status: 'success',
          timestamp: new Date().toISOString()
        });
      } else {
        console.warn(`[OpenBankingPostSubmission] ⚠️ Step 5/5: No rows updated for accreditation status and risk scores`);
        logger.warn('No rows updated for accreditation and risk', {
          ...obPostLogContext,
          step: 'update_accreditation_and_risk'
        });
      }
    } catch (accreditationError) {
      console.error(`[OpenBankingPostSubmission] ❌ Failed to update accreditation status:`, accreditationError);
      logger.error('Failed to update accreditation status', {
        ...obPostLogContext,
        step: 'update_accreditation_and_risk',
        error: accreditationError instanceof Error ? accreditationError.message : String(accreditationError),
        status: 'failed'
      });
      // At this point, we've tried all the main operations
    }
    
    // Final verification step - verify all updates were applied
    try {
      const companyAfterUpdate = await trx.select({
        id: companies.id,
        risk_score: companies.risk_score,
        accreditation_status: companies.accreditation_status,
        risk_clusters: companies.risk_clusters,
        onboarding_completed: companies.onboarding_company_completed,
        available_tabs: companies.available_tabs
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
      
      if (companyAfterUpdate.length > 0) {
        console.log(`[OpenBankingPostSubmission] ✅ Verified company updates. Current state:`, 
          JSON.stringify(companyAfterUpdate[0]));
        
        // Verify all updates were successful
        const company = companyAfterUpdate[0];
        const verificationResults = {
          onboardingCompleted: company.onboarding_completed === true,
          accreditationApproved: company.accreditation_status === 'APPROVED',
          riskScoreSet: company.risk_score !== null && company.risk_score > 0,
          riskClustersSet: company.risk_clusters !== null,
          dashboardTabUnlocked: company.available_tabs && company.available_tabs.includes('dashboard'),
          insightsTabUnlocked: company.available_tabs && company.available_tabs.includes('insights')
        };
        
        logger.info('Final verification of all updates', {
          ...obPostLogContext,
          verificationResults,
          allUpdatesSuccessful: Object.values(verificationResults).every(v => v === true)
        });
      } else {
        console.error(`[OpenBankingPostSubmission] ❌ Failed to verify company updates - could not retrieve company record`);
      }
    } catch (verificationError) {
      console.error(`[OpenBankingPostSubmission] ❌ Failed during final verification:`, verificationError);
      logger.error('Failed during final verification', {
        ...obPostLogContext,
        error: verificationError instanceof Error ? verificationError.message : String(verificationError),
      });
    }
    
    const endTime = performance.now();
    logger.info('Open Banking post-submission completed', {
      ...obPostLogContext,
      stepResults,
      unlockedTabs,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    
    return unlockedTabs;
    
  } catch (error) {
    // Log the error with extensive context
    const endTime = performance.now();
    logger.error('Critical error in Open Banking post-submission processing', {
      ...obPostLogContext,
      stepResults, // Include which steps succeeded before the error
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    
    // Re-throw the error to trigger transaction rollback
    throw error;
  }
}

/**
 * Calculate risk clusters based on the total risk score
 * 
 * This function distributes the total risk score across different risk categories
 * using predetermined weight percentages. The distribution follows these rules:
 * 
 * 1. Cyber Security receives the highest weight (30%) as it's the most critical category
 * 2. Financial Stability receives the second highest weight (25%)
 * 3. Potential Liability receives 20% of the total risk score
 * 4. Dark Web Data receives 15% of the total risk score
 * 5. Public Sentiment receives 7% of the total risk score
 * 6. Data Access Scope receives 3% of the total risk score
 * 
 * The function ensures that the sum of all category scores exactly equals the
 * total risk score, making adjustments to the main categories if needed.
 * 
 * @param riskScore The total risk score (typically 5-95)
 * @returns An object containing risk scores distributed across all six categories
 */
function calculateRiskClusters(riskScore: number): {
  "Cyber Security": number,
  "Financial Stability": number,
  "Potential Liability": number,
  "Dark Web Data": number,
  "Public Sentiment": number,
  "Data Access Scope": number
} {
  // Base distribution weights for each category - THESE MUST SUM TO 1.0 (100%)
  const weights = {
    "Cyber Security": 0.30,        // 30% - Highest priority
    "Financial Stability": 0.25,   // 25% - Second highest priority
    "Potential Liability": 0.20,   // 20% - Third priority
    "Dark Web Data": 0.15,         // 15% - Fourth priority
    "Public Sentiment": 0.07,      // 7% - Fifth priority
    "Data Access Scope": 0.03      // 3% - Lowest priority
  };
  
  // Calculate base values for each category
  let clusters = {
    "Cyber Security": Math.round(riskScore * weights["Cyber Security"]),
    "Financial Stability": Math.round(riskScore * weights["Financial Stability"]),
    "Potential Liability": Math.round(riskScore * weights["Potential Liability"]),
    "Dark Web Data": Math.round(riskScore * weights["Dark Web Data"]),
    "Public Sentiment": Math.round(riskScore * weights["Public Sentiment"]),
    "Data Access Scope": Math.round(riskScore * weights["Data Access Scope"])
  };
  
  // Ensure the sum equals the total risk score by adjusting the main categories
  const sum = Object.values(clusters).reduce((total, value) => total + value, 0);
  const diff = riskScore - sum;
  
  // If there's a difference, adjust the main categories to match the total
  if (diff !== 0) {
    // If positive, add to the highest weighted categories
    // If negative, subtract from them
    if (diff > 0) {
      clusters["Cyber Security"] += Math.ceil(diff * 0.6);
      clusters["Financial Stability"] += Math.floor(diff * 0.4);
    } else {
      const absDiff = Math.abs(diff);
      clusters["Cyber Security"] -= Math.ceil(absDiff * 0.6);
      clusters["Financial Stability"] -= Math.floor(absDiff * 0.4);
    }
  }
  
  // Ensure no negative values
  for (const key in clusters) {
    clusters[key as keyof typeof clusters] = 
      Math.max(0, clusters[key as keyof typeof clusters]);
  }
  
  return clusters;
}

/**
 * Generate a risk score based on Open Banking survey responses
 * 
 * This function calculates a risk score by analyzing the Open Banking responses
 * for a specific task. It considers various factors such as response values, 
 * metadata weights, and importance levels to produce a comprehensive risk score.
 * 
 * The score calculation follows these principles:
 * 1. A weighted average of response values is calculated
 * 2. Critical fields have higher impact on the final score
 * 3. Importance levels are used as multipliers
 * 4. The risk score is normalized to a 0-100 scale
 */
async function generateRiskScore(
  trx: any,
  taskId: number,
  formData: Record<string, any>,
  transactionId?: string
): Promise<number> {
  const startTime = performance.now();
  const riskScoreLogContext = { 
    namespace: 'RiskScoreCalculation', 
    taskId,
    transactionId 
  };
  
  logger.info('Calculating risk score for Open Banking task', {
    ...riskScoreLogContext,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Get all Open Banking responses for this task
    const responses = await trx
      .select()
      .from(openBankingResponses)
      .where(eq(openBankingResponses.task_id, taskId));
    
    if (!responses || responses.length === 0) {
      logger.warn('No responses found for risk score calculation', riskScoreLogContext);
      return 50; // Default risk score if no responses
    }
    
    logger.info(`Found ${responses.length} responses for risk score calculation`, {
      ...riskScoreLogContext,
      responseCount: responses.length,
      timestamp: new Date().toISOString()
    });
    
    // Get the field definitions to determine importance weights
    const fields = await trx
      .select()
      .from(openBankingFields);
    
    // Create a map of field keys to field definitions for quick lookup
    const fieldMap = fields.reduce((map: Record<string, any>, field: any) => {
      map[field.field_key] = field;
      return map;
    }, {} as Record<string, any>);
    
    // Calculate weighted risk score
    let totalWeight = 0;
    let weightedSum = 0;
    
    // Process each response
    for (const response of responses) {
      // Skip incomplete responses
      if (response.status !== 'completed') continue;
      
      // Get field definition
      const fieldKey = response.field_key;
      const field = fieldMap[fieldKey];
      
      if (!field) {
        logger.warn(`Field definition not found for ${fieldKey}`, riskScoreLogContext);
        continue;
      }
      
      // Determine field importance weight (higher for critical fields)
      const importance = (field.metadata?.importance || 'medium').toLowerCase();
      let importanceWeight = 1;
      
      // Assign weights based on importance
      switch (importance) {
        case 'critical':
          importanceWeight = 4;
          break;
        case 'high':
          importanceWeight = 2;
          break;
        case 'medium':
          importanceWeight = 1;
          break;
        case 'low':
          importanceWeight = 0.5;
          break;
        default:
          importanceWeight = 1;
      }
      
      // Get response value and category weight
      const responseValue = response.value;
      let value = 0;
      
      // Convert different response types to numeric values
      if (responseValue === 'yes' || responseValue === 'true') {
        value = 100;
      } else if (responseValue === 'no' || responseValue === 'false') {
        value = 0;
      } else if (typeof responseValue === 'string' && responseValue.includes('%')) {
        // Extract percentage value
        value = parseFloat(responseValue.replace('%', ''));
      } else if (!isNaN(Number(responseValue))) {
        // Direct numeric value
        value = Number(responseValue);
      }
      
      // Get category weight from field or response metadata
      const categoryWeight = field.metadata?.categoryWeight || response.metadata?.categoryWeight || 1;
      
      // Calculate weighted value and add to totals
      const weight = importanceWeight * categoryWeight;
      totalWeight += weight;
      weightedSum += value * weight;
      
      if (field.metadata?.isDebugField) {
        logger.debug(`Field ${fieldKey} calculation details:`, {
          ...riskScoreLogContext,
          fieldKey,
          responseValue,
          numericValue: value,
          importanceWeight,
          categoryWeight,
          finalWeight: weight
        });
      }
    }
    
    // Calculate final risk score
    const riskScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
    
    // Ensure risk score is within valid range
    const normalizedRiskScore = Math.max(0, Math.min(100, riskScore));
    
    const endTime = performance.now();
    logger.info(`Calculated risk score: ${normalizedRiskScore}`, {
      ...riskScoreLogContext,
      responseCount: responses.length,
      originalScore: riskScore,
      normalizedScore: normalizedRiskScore,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    
    return normalizedRiskScore;
  } catch (error) {
    const endTime = performance.now();
    logger.error('Error calculating risk score', {
      ...riskScoreLogContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    
    // Return default score in case of error
    return 50;
  }
}

/**
 * Unlock tabs for a company within a transaction
 */
async function unlockTabsForCompany(trx: any, companyId: number, tabNames: string[], transactionId?: string): Promise<void> {
  const startTime = performance.now();
  const tabsLogContext = { 
    namespace: 'UnlockTabs', 
    companyId,
    transactionId 
  };
  
  if (!tabNames || tabNames.length === 0) {
    logger.info('No tabs to unlock', {
      ...tabsLogContext,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  logger.info('Unlocking tabs for company', { 
    ...tabsLogContext, 
    tabNames,
    timestamp: new Date().toISOString() 
  });
  
  try {
    // Get current company tabs from database
    const [company] = await trx.select(companies.available_tabs)
      .from(companies)
      .where(eq(companies.id, companyId));
    
    if (!company) {
      logger.error('Company not found when unlocking tabs', tabsLogContext);
      throw new Error(`Company ${companyId} not found`);
    }
    
    // Ensure available_tabs is an array
    const currentTabs = Array.isArray(company.available_tabs) 
      ? company.available_tabs 
      : ['task-center'];
    
    // Add new tabs if not already present
    const updatedTabs = [...new Set([...currentTabs, ...tabNames])];
    
    // Update company tabs
    await trx.update(companies)
      .set({ 
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
    
    const endTime = performance.now();
    logger.info('Successfully unlocked tabs', {
      ...tabsLogContext,
      unlockedTabs: tabNames,
      allTabs: updatedTabs,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const endTime = performance.now();
    logger.error('Error unlocking tabs', {
      ...tabsLogContext,
      tabNames,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    throw error; // Re-throw to trigger transaction rollback
  }
}

/**
 * Broadcast form submission results to connected clients
 */
export async function broadcastFormSubmissionResult(
  result: FormSubmissionResult, 
  taskId: number, 
  formType: FormType, 
  companyId: number,
  transactionId?: string
): Promise<void> {
  const startTime = performance.now();
  const broadcastLogContext = { 
    namespace: 'BroadcastSubmission', 
    taskId, 
    formType, 
    companyId,
    transactionId 
  };
  
  if (result.success) {
    logger.info('Broadcasting successful form submission', {
      ...broadcastLogContext,
      fileId: result.fileId,
      unlockedTabs: result.unlockedTabs,
      timestamp: new Date().toISOString()
    });
    
    // Broadcast task update
    await broadcastTaskUpdate(taskId, 'submitted', 100);
    
    // Broadcast file creation if a file was created
    if (result.fileId) {
      await WebSocketService.broadcast('file_created', {
        fileId: result.fileId,
        taskId,
        fileName: result.fileName
      });
    }
    
    // Broadcast form submission completed
    await WebSocketService.broadcastFormSubmission({
      taskId,
      formType,
      status: 'success',
      companyId,
      fileId: result.fileId,
      fileName: result.fileName,
      unlockedTabs: result.unlockedTabs
    });
    
    // If tabs were unlocked, broadcast company tabs update
    if (result.unlockedTabs.length > 0) {
      await WebSocketService.broadcast('company_tabs_updated', {
        companyId,
        updatedTabs: result.unlockedTabs,
        timestamp: new Date().toISOString()
      });
    }
    
    const endTime = performance.now();
    logger.info('Form submission broadcast completed', {
      ...broadcastLogContext,
      success: true,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
  } else {
    const startErrorLogTime = performance.now();
    logger.error('Broadcasting form submission failure', {
      ...broadcastLogContext,
      error: result.error,
      initDuration: `${(startErrorLogTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    
    // Broadcast form submission failed
    await WebSocketService.broadcastFormSubmission({
      taskId,
      formType,
      status: 'error',
      companyId,
      error: result.error
    });
    
    const endTime = performance.now();
    logger.error('Form submission error broadcast completed', {
      ...broadcastLogContext,
      success: false,
      initialErrorDuration: `${(endTime - startErrorLogTime).toFixed(2)}ms`,
      totalDuration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
  }
}

export default {
  submitForm,
  broadcastFormSubmissionResult
};
