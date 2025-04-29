/**
 * Enhanced Form Submission Handler
 * 
 * This service provides a standardized approach to handling form submissions
 * with immediate dependent task unlocking.
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { unlockDependentTasksImmediately, unlockFileVaultAccess } from './synchronous-task-dependencies';
import { broadcastTaskUpdate } from './websocket';
import { Logger } from '../utils/logger';

const logger = new Logger('FormSubmissionHandler');

interface SubmitFormOptions {
  taskId: number;
  userId: number;
  companyId: number;
  formData: Record<string, any>;
  formType: string;
  fileName?: string;
}

/**
 * Submit a form with immediate task dependency processing
 * 
 * This function provides a standardized way to handle form submissions
 * and ensures that dependent tasks are unlocked immediately without
 * waiting for the 30-second periodic task check.
 * 
 * @param options The form submission options
 * @returns Promise<{success: boolean, message?: string, error?: string}>
 */
export async function submitFormWithImmediateUnlock(options: SubmitFormOptions): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const { taskId, userId, companyId, formData, formType, fileName } = options;
  
  logger.info('Starting enhanced form submission with immediate unlocking', {
    taskId,
    userId,
    companyId,
    formType,
    fieldsCount: Object.keys(formData).length
  });
  
  try {
    // 1. Update task status to submitted
    const now = new Date();
    await db.update(tasks)
      .set({
        status: 'submitted',
        progress: 100,
        metadata: {
          lastUpdated: now.toISOString(),
          submittedAt: now.toISOString(),
          submittedBy: userId
        },
        updated_at: now
      })
      .where(eq(tasks.id, taskId));
    
    logger.info('Task status updated to submitted', { taskId, formType });
    
    // 2. Broadcast the task update via WebSocket
    await broadcastTaskUpdate({
      id: taskId,
      status: 'submitted',
      progress: 100,
      metadata: {
        lastUpdated: now.toISOString()
      }
    });
    
    logger.info('WebSocket notification sent for task update', { taskId });
    
    // 3. Process dependent tasks immediately instead of waiting for periodic check
    const unlockedCount = await unlockDependentTasksImmediately(companyId, taskId, formType);
    logger.info('Dependent tasks unlocked immediately', { 
      taskId, 
      companyId, 
      unlockedCount 
    });
    
    // 4. If this is a KYB form, also unlock file vault access
    if (formType === 'kyb') {
      const fileVaultUnlocked = await unlockFileVaultAccess(companyId);
      logger.info('File vault access processed', { 
        companyId, 
        taskId,
        fileVaultUnlocked 
      });
    }
    
    // 5. Return success response
    return {
      success: true,
      message: `Form submitted successfully. ${unlockedCount} dependent tasks unlocked.`
    };
  } catch (error) {
    logger.error('Error in enhanced form submission', {
      taskId,
      formType,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
