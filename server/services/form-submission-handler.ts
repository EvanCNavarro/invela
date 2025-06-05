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
import * as fileCreationService from './fileCreation';

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
    
    // Log current task state before update for debugging
    logger.info('Current task state before submission update', {
      taskId,
      status: currentTask?.status,
      progress: currentTask?.progress,
      formType
    });
    
    // Update task with submitted status and enhanced metadata
    // CRITICAL FIX: Always ensure progress is set to 100 regardless of form type
    await db.update(tasks)
      .set({
        status: 'submitted',
        progress: 100,           // Ensure progress is explicitly set to 100
        metadata: updatedMetadata,
        updated_at: now
      })
      .where(eq(tasks.id, taskId));
    
    logger.info('Enhanced task status update with submission protection', { 
      taskId, 
      status: 'submitted',
      progress: 100,             // Log the explicit progress value
      formType,
      metadataKeys: Object.keys(updatedMetadata)
    });
    
    logger.info('Task status updated to submitted', { taskId, formType });
    
    // 2. Double-verify the task was updated correctly (preventing KY3P/Open Banking issues)
    const [verifiedTask] = await db.select({
      id: tasks.id,
      status: tasks.status,
      progress: tasks.progress,
      metadata: tasks.metadata,
      task_type: tasks.task_type
    })
    .from(tasks)
    .where(eq(tasks.id, taskId));
    
    // Check if task was properly updated - extra vigilant for KY3P forms
    const isKy3pForm = formType === 'ky3p' || 
                      verifiedTask.task_type === 'ky3p' || 
                      verifiedTask.task_type === 'sp_ky3p_assessment';
                      
    if (verifiedTask.status !== 'submitted' || verifiedTask.progress !== 100) {
      logger.warn('Task not properly updated after submission, applying direct fix', {
        taskId,
        formType,
        isKy3pForm,
        currentStatus: verifiedTask.status,
        currentProgress: verifiedTask.progress,
        expected: {
          status: 'submitted',
          progress: 100
        }
      });
      
      // Direct SQL fix for the task to ensure proper status and progress
      await db.update(tasks)
        .set({
          status: 'submitted',
          progress: 100,
          completion_date: now, // Ensure completion date is set
          updated_at: now
        })
        .where(eq(tasks.id, taskId));
        
      logger.info('Applied direct fix for task status/progress', { taskId, formType });
    } else if (isKy3pForm) {
      // For KY3P forms, double-check completion_date is set
      if (!verifiedTask.metadata?.submission_date && !verifiedTask.metadata?.submissionDate) {
        logger.info('KY3P form missing submission date, updating metadata', { taskId });
        
        // Update metadata with submission date
        await db.update(tasks)
          .set({
            metadata: {
              ...verifiedTask.metadata,
              submission_date: now.toISOString(),
              submissionDate: now.toISOString(),
              submitted: true,
              completed: true
            }
          })
          .where(eq(tasks.id, taskId));
          
        logger.info('Updated KY3P metadata with submission date', { taskId });
      }
    }
    
    // 3. Broadcast the task update via WebSocket with enhanced submission metadata
    try {
      logger.info('Sending WebSocket notification for task submission', { taskId });
      
      await broadcastTaskUpdate({
        id: taskId,
        status: 'submitted',
        progress: 100,
        metadata: {
          lastUpdated: now.toISOString(),
          submittedAt: now.toISOString(),
          submitted: true,
          submittedBy: userId,
          status: 'submitted',
          explicitlySubmitted: explicitSubmission,
          locked: true
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
    
    // 4. Create form data file if needed
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
    
    // 5. Return success response with appropriate message
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
