/**
 * Unified Demo Service
 * 
 * This service provides a unified transactional approach to populating forms
 * with demo data and properly updating task progress in a single atomic operation.
 * It ensures that progress values are consistent and prevents the periodic reconciliation
 * system from overriding updates by temporarily blacklisting tasks after updates.
 */

import { db } from '@db';
import { eq, sql } from 'drizzle-orm';
import { tasks, TaskStatus, ky3pResponses, kybResponses, openBankingResponses } from '@db/schema';
import { logger } from '../utils/logger';
import { calculateTaskProgressFromDB } from '../utils/task-reconciliation';
import { broadcastProgressUpdate } from '../utils/progress';
import { getKy3pDemoData } from '../services/ky3pDemoData';
import { getOpenBankingDemoData } from '../services/openBankingDemoData';
import { getKybDemoData } from '../services/kybDemoData';
import { markTaskAsTransactionallyUpdated } from '../utils/periodic-task-reconciliation';

interface UnifiedDemoServiceOptions {
  broadcast?: boolean;
  debug?: boolean;
  markAsTransactional?: boolean;
  [key: string]: any;
}

/**
 * Apply demo data to a form and update progress with progress reconciliation
 * protection in a single atomic operation
 */
export async function fillFormWithDemoData(
  taskId: number,
  formType: string,
  options: UnifiedDemoServiceOptions = {}
): Promise<{
  success: boolean;
  fieldCount: number;
  progress: number;
  status: string;
  error?: string;
}> {
  const { broadcast = true, debug = true, markAsTransactional = true } = options;
  const log = debug ? logger.info.bind(logger) : () => {};
  
  log(`[UnifiedDemoService] Starting demo auto-fill for ${formType} task ${taskId}`);
  
  try {
    // 1. Verify task exists and get current details
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // 2. Get the appropriate demo data based on form type
    let demoData;
    let fieldsPopulated = 0;
    
    // Normalize form type for internal processing
    const normalizedFormType = normalizeFormType(formType);
    log(`[UnifiedDemoService] Using normalized form type: ${normalizedFormType}`);
    
    // Define transaction function to ensure atomic update
    await db.transaction(async (tx) => {
      // Get demo data based on form type
      switch (normalizedFormType) {
        case 'ky3p':
          demoData = await getKy3pDemoData();
          // Apply KY3P demo data
          for (const field of demoData.fields) {
            await tx.insert(ky3p_responses).values({
              task_id: taskId,
              field_id: field.id,
              response_value: field.value,
              status: field.status || 'COMPLETE'
            }).onConflictDoUpdate({
              target: [ky3p_responses.task_id, ky3p_responses.field_id],
              set: {
                response_value: field.value,
                status: field.status || 'COMPLETE',
                updated_at: new Date()
              }
            });
          }
          fieldsPopulated = demoData.fields.length;
          break;
          
        case 'company_kyb':
          demoData = await getKybDemoData();
          // Apply KYB demo data
          for (const field of demoData.fields) {
            await tx.insert(kyb_responses).values({
              task_id: taskId,
              field_id: field.id,
              value: field.value,
              status: field.status || 'COMPLETE',
              reasoning: '',
              completed_at: new Date()
            }).onConflictDoUpdate({
              target: [kyb_responses.task_id, kyb_responses.field_id],
              set: {
                value: field.value,
                status: field.status || 'COMPLETE',
                updated_at: new Date()
              }
            });
          }
          fieldsPopulated = demoData.fields.length;
          break;
          
        case 'open_banking':
          demoData = await getOpenBankingDemoData();
          // Apply Open Banking demo data
          for (const field of demoData.fields) {
            await tx.insert(open_banking_responses).values({
              task_id: taskId,
              field_id: field.id,
              response_value: field.value,
              status: field.status || 'COMPLETE'
            }).onConflictDoUpdate({
              target: [open_banking_responses.task_id, open_banking_responses.field_id],
              set: {
                response_value: field.value,
                status: field.status || 'COMPLETE',
                updated_at: new Date()
              }
            });
          }
          fieldsPopulated = demoData.fields.length;
          break;
          
        default:
          throw new Error(`Unsupported form type: ${normalizedFormType}`);
      }
      
      // Calculate new progress directly from database in the same transaction
      const calculatedProgress = await calculateTaskProgressFromDB(taskId, task.task_type);
      
      // Determine correct status based on progress
      let newStatus = task.status;
      if (calculatedProgress === 0) {
        newStatus = TaskStatus.NOT_STARTED;
      } else if (calculatedProgress === 100) {
        newStatus = task.completion_date ? TaskStatus.SUBMITTED : TaskStatus.READY_FOR_SUBMISSION;
      } else if (calculatedProgress > 0 && calculatedProgress < 100) {
        newStatus = TaskStatus.IN_PROGRESS;
      }
      
      // Update task progress and status atomically
      await tx.update(tasks).set({
        progress: calculatedProgress,
        status: newStatus,
        updated_at: new Date(),
        metadata: {
          ...task.metadata,
          lastProgressReconciliation: new Date().toISOString(),
          lastAutomaticFill: new Date().toISOString(),
          progressHistory: [
            ...(task.metadata?.progressHistory || []),
            {
              value: calculatedProgress,
              timestamp: new Date().toISOString()
            }
          ]
        }
      }).where(eq(tasks.id, taskId));
      
      log(`[UnifiedDemoService] Successfully updated ${normalizedFormType} form with demo data and progress ${calculatedProgress}%`);
      
      // Broadcast progress update if requested
      if (broadcast) {
        broadcastProgressUpdate(taskId, calculatedProgress, newStatus as TaskStatus);
      }
      
      // Mark the task as transactionally updated to prevent periodic reconciliation
      // system from overriding our update
      if (markAsTransactional) {
        markTaskAsTransactionallyUpdated(taskId);
      }
    });
    
    // Get the final task state after transaction completion
    const updatedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!updatedTask) {
      throw new Error(`Task ${taskId} not found after update`);
    }
    
    return {
      success: true,
      fieldCount: fieldsPopulated,
      progress: updatedTask.progress || 0,
      status: updatedTask.status
    };
    
  } catch (error) {
    logger.error(`[UnifiedDemoService] Error filling form with demo data: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      fieldCount: 0,
      progress: 0,
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Normalize form type to ensure consistent internal form type identifiers
 */
function normalizeFormType(formType: string): string {
  const type = formType.toLowerCase();
  
  // KY3P variants
  if (['security', 'security_assessment', 'sp_ky3p_assessment'].includes(type)) {
    return 'ky3p';
  }
  
  // KYB variants
  if (type === 'kyb') {
    return 'company_kyb';
  }
  
  // Open Banking variants
  if (type === 'ob' || type === 'openbanking') {
    return 'open_banking';
  }
  
  return type;
}
