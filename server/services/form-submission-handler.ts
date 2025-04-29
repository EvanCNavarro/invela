/**
 * Enhanced Form Submission Handler
 * 
 * This service provides a standardized approach to handling form submissions
 * with immediate dependent task unlocking.
 */

import { db } from '@db';
import { tasks, companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';
import { unlockDependentTasksImmediately, unlockFileVaultAccess } from './synchronous-task-dependencies';
import { broadcastTaskUpdate } from './websocket';
import { broadcastCompanyTabsUpdate } from './company-tabs';
import { Logger } from '../utils/logger';

const logger = new Logger('FormSubmissionHandler');

interface SubmitFormOptions {
  taskId: number;
  userId: number;
  companyId: number;
  formData: Record<string, any>;
  formType: string;
  fileName?: string;
  explicitSubmission?: boolean; // Flag to indicate an explicit form submission
}

/**
 * Submit a form with immediate task dependency processing
 * 
 * This function provides a standardized way to handle form submissions
 * and ensures that dependent tasks are unlocked immediately according to the
 * specific dependency rules, without waiting for the 30-second periodic task check.
 * 
 * Dependency rules:
 * - KYB form: Unlocks file vault access, KY3P task, and Open Banking task
 * - KY3P form: Doesn't unlock any tasks by itself
 * - Open Banking form: Unlocks Dashboard and Insights tabs
 * 
 * @param options The form submission options
 * @returns Promise<{success: boolean, message?: string, error?: string, fileId?: number}>
 */
export async function submitFormWithImmediateUnlock(options: SubmitFormOptions): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  fileId?: number;
}> {
  const { taskId, userId, companyId, formData, formType, fileName, explicitSubmission = true } = options;
  
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
    
    // Get current task metadata to preserve existing fields
    const [currentTask] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    const currentMetadata = currentTask?.metadata || {};
    
    // Prepare updated metadata with explicit submission flags
    const updatedMetadata = {
      ...currentMetadata,
      lastUpdated: now.toISOString(),
      submittedAt: now.toISOString(),
      submittedBy: userId,
      status: 'submitted',         // Explicit status flag in metadata
      explicitlySubmitted: explicitSubmission,   // Flag to prevent status reconciliation from changing it back
      statusFlow: [...(currentMetadata.statusFlow || []), 'submitted']
    };
    
    // Update task with submitted status and enhanced metadata
    await db.update(tasks)
      .set({
        status: 'submitted',
        progress: 100,
        metadata: updatedMetadata,
        updated_at: now
      })
      .where(eq(tasks.id, taskId));
    
    logger.info('Enhanced task status update with submission protection', { 
      taskId, 
      status: 'submitted',
      metadataKeys: Object.keys(updatedMetadata)
    });
    
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
    
    // 3. Apply form-specific dependency rules
    let unlockedCount = 0;
    let fileVaultUnlocked = false;
    
    // Different unlocking behavior based on form type
    if (formType === 'kyb') {
      // KYB unlocks file vault, KY3P tasks, and Open Banking tasks
      logger.info('Processing KYB-specific dependencies', { companyId });
      
      // Unlock file vault access
      fileVaultUnlocked = await unlockFileVaultAccess(companyId);
      logger.info('File vault access processed', { 
        companyId, 
        taskId,
        fileVaultUnlocked 
      });
      
      // Unlock KY3P and Open Banking tasks
      unlockedCount = await unlockDependentTasksImmediately(companyId, taskId, 'kyb');
      logger.info('KYB dependent tasks unlocked immediately', { 
        taskId, 
        companyId, 
        unlockedCount 
      });
    } 
    else if (formType === 'open_banking') {
      // Open Banking unlocks Dashboard and Insights tabs
      logger.info('Processing Open Banking-specific dependencies', { companyId });
      
      // Unlock Dashboard and Insights tabs
      const tabsUnlocked = await unlockDashboardAndInsightsTabs(companyId);
      
      logger.info('Dashboard and Insights tabs access processed', {
        companyId,
        taskId,
        tabsUnlocked
      });
    }
    // KY3P doesn't unlock anything by itself
    
    // 4. Return success response with appropriate message
    let message = `Form submitted successfully.`;
    if (formType === 'kyb') {
      message += ` File vault ${fileVaultUnlocked ? 'unlocked' : 'unchanged'}.`;
      message += ` ${unlockedCount} dependent tasks unlocked.`;
    } else if (formType === 'open_banking') {
      message += ` Dashboard and Insights tabs are now accessible.`;
    }
    
    return {
      success: true,
      message
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
