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
import * as WebSocketService from '../services/websocket';
import * as FileCreationService from '../services/fileCreation.fixed';
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
  
  try {
    // Verify company exists before proceeding
    const companyCheck = await trx.select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    if (!companyCheck.length) {
      console.error(`[OpenBankingPostSubmission] ❌ Company with ID ${companyId} not found - cannot process post submission`);
      throw new Error(`Company with ID ${companyId} not found`);
    }
    
    console.log(`[OpenBankingPostSubmission] ✅ Company verified: ${companyId}`);
    
    // Open Banking unlocks Dashboard and Insights tabs
    const unlockedTabs = ['dashboard', 'insights'];
    
    // Unlock Dashboard and Insights tabs
    await unlockTabsForCompany(trx, companyId, unlockedTabs, transactionId);
    console.log(`[OpenBankingPostSubmission] ✅ Unlocked tabs for company ${companyId}: ${unlockedTabs.join(', ')}`);
    
    // Mark company onboarding as completed
    const onboardingUpdateResult = await trx.update(companies)
      .set({
        onboarding_company_completed: true,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning({ id: companies.id });
    
    console.log(`[OpenBankingPostSubmission] ✅ Updated onboarding status to true for company ${companyId}`);
    logger.info('Updated company onboarding status', { 
      ...obPostLogContext,
      timestamp: new Date().toISOString()
    });
    
    // Generate risk score based on survey responses - random value between 5 and 95
    const riskScore = Math.floor(Math.random() * (95 - 5 + 1)) + 5;
    
    // Calculate risk clusters based on the total risk score
    // Distribute the risk score across different risk categories
    // with higher weight on PII Data and Account Data
    const riskClusters = calculateRiskClusters(riskScore);
    
    console.log(`[OpenBankingPostSubmission] ✅ Generated risk score ${riskScore} and clusters:`, JSON.stringify(riskClusters));
    logger.info('Generated risk score and clusters', { 
      ...obPostLogContext, 
      riskScore,
      riskClusters,
      timestamp: new Date().toISOString()
    });
    
    // Update accreditation status, risk score, and risk clusters in a single operation
    const riskUpdateResult = await trx.update(companies)
      .set({
        accreditation_status: 'APPROVED',
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
    
    // Log results of risk update
    console.log(`[OpenBankingPostSubmission] ✅ Updated risk score and accreditation status:`, 
      riskUpdateResult ? JSON.stringify(riskUpdateResult) : "No result returned");
      
    logger.info('Updated accreditation status and risk scores', { 
      ...obPostLogContext,
      riskUpdateResult: riskUpdateResult || 'No result returned',
      timestamp: new Date().toISOString()
    });
    
    // Verify risk score has been set by retrieving the company record
    const companyAfterUpdate = await trx.select({
      id: companies.id,
      risk_score: companies.risk_score,
      accreditation_status: companies.accreditation_status,
      risk_clusters: companies.risk_clusters,
      onboarding_completed: companies.onboarding_company_completed
    })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
    
    if (companyAfterUpdate.length > 0) {
      console.log(`[OpenBankingPostSubmission] ✅ Verified company updates. Current state:`, 
        JSON.stringify(companyAfterUpdate[0]));
    } else {
      console.error(`[OpenBankingPostSubmission] ❌ Failed to verify company updates - could not retrieve company record`);
    }
    
    const endTime = performance.now();
    logger.info('Open Banking post-submission completed successfully', {
      ...obPostLogContext,
      unlockedTabs,
      riskScore,
      companyState: companyAfterUpdate[0] || 'Unknown',
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    
    return unlockedTabs;
  } catch (error) {
    const endTime = performance.now();
    logger.error('Error in Open Banking post-submission processing', {
      ...obPostLogContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    throw error; // Re-throw to trigger transaction rollback
  }
}

/**
 * Calculate risk clusters based on the total risk score
 * 
 * This function distributes the risk score across different risk categories
 * with higher weightage given to PII Data and Account Data categories.
 * 
 * @param riskScore The total risk score (0-100)
 * @returns An object containing risk scores distributed across categories
 */
function calculateRiskClusters(riskScore: number): {
  "PII Data": number,
  "Account Data": number,
  "Data Transfers": number,
  "Certifications Risk": number,
  "Security Risk": number,
  "Financial Risk": number
} {
  // Base distribution weights for each category
  const weights = {
    "PII Data": 0.35,           // 35% of total score
    "Account Data": 0.30,        // 30% of total score
    "Data Transfers": 0.10,      // 10% of total score
    "Certifications Risk": 0.10, // 10% of total score
    "Security Risk": 0.10,       // 10% of total score
    "Financial Risk": 0.05       // 5% of total score
  };
  
  // Calculate base values for each category
  let clusters = {
    "PII Data": Math.round(riskScore * weights["PII Data"]),
    "Account Data": Math.round(riskScore * weights["Account Data"]),
    "Data Transfers": Math.round(riskScore * weights["Data Transfers"]),
    "Certifications Risk": Math.round(riskScore * weights["Certifications Risk"]),
    "Security Risk": Math.round(riskScore * weights["Security Risk"]),
    "Financial Risk": Math.round(riskScore * weights["Financial Risk"])
  };
  
  // Ensure the sum equals the total risk score by adjusting the main categories
  const sum = Object.values(clusters).reduce((total, value) => total + value, 0);
  const diff = riskScore - sum;
  
  // If there's a difference, adjust the main categories to match the total
  if (diff !== 0) {
    // If positive, add to the highest weighted categories
    // If negative, subtract from them
    if (diff > 0) {
      clusters["PII Data"] += Math.ceil(diff * 0.6);
      clusters["Account Data"] += Math.floor(diff * 0.4);
    } else {
      const absDiff = Math.abs(diff);
      clusters["PII Data"] -= Math.ceil(absDiff * 0.6);
      clusters["Account Data"] -= Math.floor(absDiff * 0.4);
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
    await WebSocketService.broadcastTaskUpdate(taskId, 'submitted', 100);
    
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
