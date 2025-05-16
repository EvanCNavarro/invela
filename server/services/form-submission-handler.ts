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
import { synchronizeTasks, unlockFileVaultAccess } from './synchronous-task-dependencies';
import { broadcastTaskUpdate as legacyBroadcastTaskUpdate } from './websocket';
import { broadcastCompanyTabsUpdate, unlockDashboardAndInsightsTabs } from './company-tabs';
import { logger } from '../utils/logger';
import * as WebSocketService from './websocket-service';
import { broadcast, broadcastTaskUpdate } from '../utils/unified-websocket';
import { mapClientFormTypeToSchemaType } from '../utils/form-type-mapper';
import * as fileCreationService from './fileCreation.fixed';

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
      submissionDate: now.toISOString(),
      submittedBy: userId,
      submitted: true,           // Critical flag for all form types
      status: 'submitted',       // Explicit status flag in metadata
      explicitlySubmitted: explicitSubmission,   // Flag to prevent status reconciliation from changing it back
      statusFlow: [...(currentMetadata.statusFlow || []), 'submitted'],
      locked: true               // Lock the form upon submission
    };
    
    logger.info('Current task state before submission update', {
      taskId,
      status: currentTask?.status,
      progress: currentTask?.progress,
      formType
    });
    
    // ATOMIC UPDATE: Always ensure status and progress are updated together
    // This is the critical fix to prevent inconsistencies between status and progress
    logger.info('[AtomicUpdate] Performing synchronized status/progress update', {
      taskId,
      status: 'submitted',
      progress: 100,
      timestamp: now.toISOString()
    });
    
    // The key is that both status and progress are set in a single database operation
    // so they can never get out of sync with each other
    await db.update(tasks)
      .set({
        status: 'submitted',     // Always submitted when a form is completed
        progress: 100,           // Always 100% when submitted for consistency
        metadata: updatedMetadata,
        completion_date: now,    // Set completion date for submitted tasks
        updated_at: now
      })
      .where(eq(tasks.id, taskId));
    
    logger.info('Task status updated atomically - ensuring status and progress consistency', { 
      taskId, 
      status: 'submitted',
      progress: 100,
      formType,
      metadataKeys: Object.keys(updatedMetadata)
    });
    
    // Verification step - check if status and progress are both correctly set
    const [verifiedTask] = await db.select({
      id: tasks.id,
      status: tasks.status,
      progress: tasks.progress,
      metadata: tasks.metadata,
      task_type: tasks.task_type
    })
    .from(tasks)
    .where(eq(tasks.id, taskId));
    
    // Double-check if the update was successful and apply fix if needed
    if (verifiedTask.status !== 'submitted' || verifiedTask.progress !== 100) {
      logger.warn('[AtomicUpdate] Task not properly updated after submission, applying direct fix', {
        taskId,
        formType,
        currentStatus: verifiedTask.status,
        currentProgress: verifiedTask.progress,
        expected: {
          status: 'submitted',
          progress: 100
        }
      });
      
      // Apply direct fix if needed - in a single atomic operation to prevent inconsistencies
      await db.update(tasks)
        .set({
          status: 'submitted',
          progress: 100,
          completion_date: now,
          updated_at: now
        })
        .where(eq(tasks.id, taskId));
      
      logger.info('[AtomicUpdate] Applied direct fix for task status/progress consistency', { 
        taskId, 
        formType, 
        timestamp: new Date().toISOString() 
      });
      
      // Perform a final verification
      const [finalVerification] = await db.select({
        id: tasks.id,
        status: tasks.status,
        progress: tasks.progress
      })
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
      if (finalVerification.status !== 'submitted' || finalVerification.progress !== 100) {
        // This should never happen, but log it if it does
        logger.error('[AtomicUpdate] Critical error: Task still inconsistent after fixes', {
          taskId,
          status: finalVerification.status,
          progress: finalVerification.progress,
          formType
        });
      } else {
        logger.info('[AtomicUpdate] Task consistency verification passed', {
          taskId,
          status: finalVerification.status,
          progress: finalVerification.progress
        });
      }
    } else {
      logger.info('[AtomicUpdate] Task initial consistency verification passed', {
        taskId,
        status: verifiedTask.status,
        progress: verifiedTask.progress
      });
    }
    
    // 3. Broadcast the task update via WebSocket with enhanced submission metadata
    try {
      logger.info('Sending WebSocket notification for task submission', { taskId });
      
      // Broadcast task update with consistent status and progress
      // This is critical for real-time UI updates to show correct task state
      await broadcastTaskUpdate({
        taskId,
        status: 'submitted',  // Always submitted when completed
        progress: 100,        // Always 100% when submitted 
        metadata: {
          lastUpdated: now.toISOString(),
          submittedAt: now.toISOString(),
          submitted: true,
          submittedBy: userId,
          status: 'submitted',
          explicitlySubmitted: explicitSubmission,
          locked: true,
          // Include additional metadata to track atomic updates
          atomicUpdateApplied: true,
          atomicUpdateTimestamp: now.toISOString()
        }
      });
      
      logger.info('WebSocket notification sent successfully', { taskId });
    } catch (wsError) {
      logger.error('Error broadcasting WebSocket notification', {
        error: wsError instanceof Error ? wsError.message : 'Unknown error',
        taskId
      });
      // Continue execution even if WebSocket notification fails
    }
    
    logger.info('WebSocket notification sent for task update', { taskId });
    
    // 4. Apply form-specific dependency rules
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
      const unlockedTaskIds = await synchronizeTasks(companyId, taskId);
      unlockedCount = unlockedTaskIds.length;
      logger.info('KYB dependent tasks unlocked immediately', { 
        taskId, 
        companyId, 
        unlockedCount,
        unlockedTaskIds
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
    
    // 5. Create form data file if needed
    let fileId: number | undefined;
    
    // Get the company name for file creation
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    const companyName = company?.name || 'Unknown Company';
    
    try {
      // Map the client form type to schema-compatible task type
      const schemaTaskType = mapClientFormTypeToSchemaType(formType);
      
      logger.info('Mapped form type for file creation', {
        originalType: formType,
        schemaType: schemaTaskType,
        taskId
      });
      
      // Check if this form type should create a file
      if (formType === 'kyb' || formType === 'ky3p' || formType === 'open_banking') {
        logger.info('Creating form submission file', {
          taskId,
          formType,
          schemaTaskType,
          companyName,
          dataKeysCount: Object.keys(formData).length,
          dataFirstKeys: Object.keys(formData).slice(0, 3),
          formDataEmpty: Object.keys(formData).length === 0
        });
        
        // Verify form data is not empty before proceeding
        if (Object.keys(formData).length === 0) {
          logger.error('Form data is empty - cannot create file', { taskId, formType });
          throw new Error('Form data is empty, cannot create file');
        }
        
        // Enhanced logging for form submission file creation
        console.log(`[FormSubmissionHandler] Creating file for ${formType} form`, {
          taskId, 
          schemaTaskType,
          userId,
          companyId,
          companyName,
          timestamp: new Date().toISOString()
        });
        
        const fileResult = await fileCreationService.createTaskFile(
          taskId,
          schemaTaskType, // Use mapped type to match zod validation schema
          formData,
          companyId,
          userId
        );
        
        if (fileResult.success) {
          fileId = fileResult.fileId;
          logger.info('File created successfully', {
            fileId,
            fileName: fileResult.fileName
          });
          
          // Update task metadata with file reference
          // Get current metadata first to ensure we're not losing data
          const [currentTaskData] = await db.select()
            .from(tasks)
            .where(eq(tasks.id, taskId));
            
          if (currentTaskData) {
            // Create a new metadata object with the fileId added
            const updatedMetadata = {
              ...currentTaskData.metadata,
              fileId: fileId,
              fileGenerated: true,
              fileGeneratedAt: new Date().toISOString(),
              fileName: fileResult.fileName
            };
            
            // Update the task with the new metadata object
            await db.update(tasks)
              .set({
                metadata: updatedMetadata
              })
              .where(eq(tasks.id, taskId));
              
            logger.info('Updated task metadata with file information', {
              taskId,
              fileId,
              fileName: fileResult.fileName
            });
          }
        } else {
          logger.error('Failed to create file', {
            taskId,
            formType,
            error: fileResult.error
          });
        }
      }
    } catch (fileError) {
      logger.error('Error creating form submission file', {
        taskId,
        formType,
        error: fileError instanceof Error ? fileError.message : 'Unknown error'
      });
      // Continue with submission process even if file creation fails
    }
    
    // 6. Return success response with appropriate message
    let message = `Form submitted successfully.`;
    if (formType === 'kyb') {
      message += ` File vault ${fileVaultUnlocked ? 'unlocked' : 'unchanged'}.`;
      message += ` ${unlockedCount} dependent tasks unlocked.`;
    } else if (formType === 'open_banking') {
      message += ` Dashboard and Insights tabs are now accessible.`;
    }
    
    // Include file ID in response if available
    return {
      success: true,
      message,
      fileId
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
