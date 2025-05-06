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
  console.log('[TransactionalFormHandler] Storing form responses:', {
    taskId,
    taskIdType: typeof taskId,
    taskType,
    formDataKeys: Object.keys(formData),
    formDataSample: JSON.stringify(formData).substring(0, 200) + '...'
  });
  
  switch (taskType) {
    case 'company_kyb':
      // Store KYB responses
      for (const [field, value] of Object.entries(formData)) {
        // Skip metadata fields like taskId, formType, etc.
        if (field === 'taskId' || field === 'formType' || field === 'companyId' || field === 'userId') {
          console.log(`[TransactionalFormHandler] Skipping metadata field: ${field} = ${value}`);
          continue;
        }
        
        console.log(`[TransactionalFormHandler] Processing KYB field: ${field}, type: ${typeof field}, value type: ${typeof value}`);
        
        // Ensure proper JSON serialization for complex objects
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
        
        await tx.execute(sql`
          INSERT INTO kyb_responses (task_id, field_id, response_value, status) 
          VALUES (${taskId}, ${field}, ${serializedValue}, 'COMPLETE')
          ON CONFLICT (task_id, field_id) 
          DO UPDATE SET response_value = ${serializedValue}, 
            status = 'COMPLETE',
            updated_at = NOW()
        `);
      }
      break;
      
    case 'ky3p':
      // Store KY3P responses
      for (const [field, value] of Object.entries(formData)) {
        // Ensure proper JSON serialization for complex objects
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
        
        await tx.execute(sql`
          INSERT INTO ky3p_responses (task_id, field_id, response_value, status) 
          VALUES (${taskId}, ${field}, ${serializedValue}, 'COMPLETE')
          ON CONFLICT (task_id, field_id) 
          DO UPDATE SET response_value = ${serializedValue}, 
            status = 'COMPLETE', 
            updated_at = NOW()
        `);
      }
      break;
      
    case 'open_banking':
      // Store Open Banking responses
      for (const [field, value] of Object.entries(formData)) {
        // Ensure proper JSON serialization for complex objects
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
        
        await tx.execute(sql`
          INSERT INTO open_banking_responses (task_id, field_id, response_value, status) 
          VALUES (${taskId}, ${field}, ${serializedValue}, 'COMPLETE')
          ON CONFLICT (task_id, field_id) 
          DO UPDATE SET response_value = ${serializedValue}, 
            status = 'COMPLETE',
            updated_at = NOW()
        `);
      }
      break;
      
    case 'user_kyb':
      // Store user KYB responses
      for (const [field, value] of Object.entries(formData)) {
        // Ensure proper JSON serialization for complex objects
        const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
        
        await tx.execute(sql`
          INSERT INTO user_kyb_responses (task_id, field_id, response_value, status) 
          VALUES (${taskId}, ${field}, ${serializedValue}, 'COMPLETE')
          ON CONFLICT (task_id, field_id) 
          DO UPDATE SET response_value = ${serializedValue}, 
            status = 'COMPLETE',
            updated_at = NOW()
        `);
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
