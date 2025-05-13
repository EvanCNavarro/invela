/**
 * Transactional KYB Form Submission Handler
 * 
 * This module provides a transaction-based approach to KYB form submissions,
 * ensuring that all database operations either succeed completely or fail
 * completely (with rollback). This implements the OODA (Observe, Orient, Decide, Act)
 * principles for form submission handling.
 */

import { db } from '../db';
import { companies, files, kybFields, kybResponses, tasks } from '../../db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { FileCreationService } from './file-creation';
import { TaskStatus } from '../types/task';
import logger from '../utils/logger';

export interface KybSubmissionInput {
  taskId: number;
  formData: Record<string, any>;
  fileName?: string;
  userId?: number;
  transactionId: string;
  startTime: number;
}

export interface KybSubmissionResult {
  success: boolean;
  fileId?: string | number;
  warnings?: string[];
  securityTasksUnlocked?: number;
  error?: string;
  stack?: string;
  elapsedMs?: number;
}

/**
 * Handle KYB form submission with transaction support
 * 
 * This function wraps all database operations in a transaction to ensure
 * proper atomicity (all operations succeed or all fail together).
 */
export async function processKybSubmission(
  input: KybSubmissionInput
): Promise<KybSubmissionResult> {
  const { taskId, formData, fileName, userId, transactionId, startTime } = input;
  const warnings: string[] = [];
  
  try {
    // 1. OBSERVE: Get task and verify it exists
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Check for required data
    if (!task.created_by || !task.company_id) {
      throw new Error('Missing task user or company information');
    }
    
    // 2. ORIENT: Get field definitions and convert to CSV
    const fields = await db.select()
      .from(kybFields)
      .orderBy(kybFields.order);
    
    logger.info(`[KYB Transaction] Preparing form data for CSV generation`, {
      transactionId,
      taskId,
      fieldCount: fields.length,
      elapsedMs: performance.now() - startTime
    });
    
    // Generate CSV content
    const csvData = convertResponsesToCSV(fields, formData);
    
    // 3. DECIDE: Create file using FileCreationService
    const standardFileName = FileCreationService.generateStandardFileName(
      "KYBForm", 
      taskId, 
      task.metadata?.company_name, 
      task.metadata?.formVersion || "1.0", 
      "csv"
    );
    
    const fileCreationResult = await FileCreationService.createFile({
      name: fileName || standardFileName,
      content: csvData,
      type: 'text/csv',
      userId: task.created_by,
      companyId: task.company_id,
      metadata: {
        taskId,
        taskType: 'kyb',
        formVersion: '1.0',
        submissionDate: new Date().toISOString(),
        fields: fields.map(f => f.field_key)
      },
      status: 'uploaded'
    });
    
    if (!fileCreationResult.success) {
      throw new Error(fileCreationResult.error || 'File creation failed');
    }
    
    // 4. ACT: Execute all database operations within a transaction
    logger.info(`[KYB Transaction] Starting database transaction`, {
      transactionId,
      taskId,
      fileId: fileCreationResult.fileId,
      elapsedMs: performance.now() - startTime
    });
    
    // Begin transaction to wrap all database operations
    await db.transaction(async (tx) => {
      // 4.1 Update revenue tier if present
      if (formData.annualRecurringRevenue) {
        const [revenueTierField] = await tx.select()
          .from(kybFields)
          .where(eq(kybFields.field_key, 'annualRecurringRevenue'))
          .limit(1);

        if (revenueTierField?.validation_rules?.options) {
          // Map ARR ranges to revenue tiers
          const tierMapping = {
            'Less than $1 million': 'small',
            '$1 million - $10 million': 'medium',
            '$10 million - $50 million': 'large',
            'Greater than $50 million': 'xlarge'
          };

          const selectedTier = tierMapping[formData.annualRecurringRevenue as keyof typeof tierMapping];
          if (selectedTier) {
            await tx.update(companies)
              .set({
                revenue_tier: selectedTier,
                updated_at: new Date()
              })
              .where(eq(companies.id, task.company_id));
              
            logger.info(`[KYB Transaction] Revenue tier updated`, {
              transactionId,
              companyId: task.company_id,
              revenueTier: selectedTier,
              elapsedMs: performance.now() - startTime
            });
          }
        }
      }
      
      // 4.2 Update task status and metadata
      await tx.update(tasks)
        .set({
          status: TaskStatus.SUBMITTED, // Explicitly 'submitted', not 'ready_for_submission'
          progress: 100,
          updated_at: new Date(),
          metadata: {
            ...task.metadata,
            kybFormFile: fileCreationResult.fileId,
            submissionDate: new Date().toISOString(),
            formVersion: '1.0',
            statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.SUBMITTED]
              .filter((v, i, a) => a.indexOf(v) === i),
            explicitlySubmitted: true // Flag to indicate this was a real submission
          }
        })
        .where(eq(tasks.id, taskId));
      
      logger.info(`[KYB Transaction] Task status updated in transaction`, {
        transactionId,
        taskId,
        status: TaskStatus.SUBMITTED,
        elapsedMs: performance.now() - startTime
      });

      // 4.3 Save responses to database
      for (const field of fields) {
        if (!field.field_key) continue;
        
        const value = formData[field.field_key];
        const status = value ? 'COMPLETE' : 'EMPTY';

        try {
          // First try to insert
          await tx.insert(kybResponses)
            .values({
              task_id: taskId,
              field_id: field.id,
              response_value: value || null,
              status,
              version: 1,
              created_at: new Date(),
              updated_at: new Date()
            });
        } catch (err) {
          const error = err as Error;
          if (error.message.includes('duplicate key value violates unique constraint')) {
            // If duplicate, update instead
            await tx.update(kybResponses)
              .set({
                response_value: value || null,
                status,
                version: sql`${kybResponses.version} + 1`,
                updated_at: new Date()
              })
              .where(
                and(
                  eq(kybResponses.task_id, taskId),
                  eq(kybResponses.field_id, field.id)
                )
              );
            warnings.push(`Updated existing response for field: ${field.field_key}`);
          } else {
            // Re-throw any error to trigger transaction rollback
            throw error;
          }
        }
      }
      
      logger.info(`[KYB Transaction] Responses saved in transaction`, {
        transactionId,
        taskId,
        responseCount: fields.length,
        warningCount: warnings.length,
        elapsedMs: performance.now() - startTime
      });
    });
    
    logger.info(`[KYB Transaction] Transaction completed successfully`, {
      transactionId,
      taskId,
      fileId: fileCreationResult.fileId,
      elapsedMs: performance.now() - startTime
    });
    
    // 5. Unlock security tasks
    const unlockResult = await unlockSecurityTasks(task.company_id, taskId, userId);
    
    return {
      success: true,
      fileId: fileCreationResult.fileId,
      warnings: warnings.length > 0 ? warnings : undefined,
      securityTasksUnlocked: unlockResult.success ? unlockResult.count : 0,
      elapsedMs: performance.now() - startTime
    };
  } catch (error) {
    logger.error(`[KYB Transaction] Transaction failed`, {
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
 * CSV conversion helper function
 */
function convertResponsesToCSV(fields: any[], formData: any) {
  logger.debug('[CSV Generation] Starting CSV conversion', { 
    fieldsCount: fields.length, 
    formDataKeyCount: Object.keys(formData).length 
  });
  
  // CSV headers
  const headers = ['Question Number', 'Group', 'Question', 'Answer', 'Type'];
  const rows = [headers];

  // Add data rows
  let questionNumber = 1;
  
  for (const field of fields) {
    // Skip fields without a valid field_key
    if (!field.field_key) {
      logger.debug('[CSV Generation] Skipping field without field_key', { field });
      continue;
    }
    
    // Just use the number itself (1, 2, 3, etc.) instead of fraction format
    const formattedNumber = `${questionNumber}`;
    
    // Improved answer handling with type safety
    const rawAnswer = formData[field.field_key];
    let answer = '';
    
    // Handle different data types properly
    if (rawAnswer !== undefined && rawAnswer !== null) {
      if (typeof rawAnswer === 'object') {
        try {
          answer = JSON.stringify(rawAnswer);
        } catch (e) {
          answer = String(rawAnswer);
        }
      } else {
        answer = String(rawAnswer); // Convert numbers, booleans, etc. to strings
      }
    }
    
    // Log potentially problematic fields for debugging
    if (answer.includes('\n') || answer.includes(',') || answer.includes('"')) {
      logger.debug('[CSV Generation] Special character detection', {
        fieldKey: field.field_key,
        hasNewline: answer.includes('\n'),
        hasComma: answer.includes(','),
        hasQuote: answer.includes('"'),
        length: answer.length
      });
    }
    
    rows.push([
      formattedNumber,
      field.group || 'Uncategorized',
      field.display_name || field.label || field.question || field.field_key,
      answer,
      field.field_type || 'text'
    ]);
    
    questionNumber++;
  }

  // Convert to CSV string - properly handle all special characters
  const csvContent = rows.map(row => 
    row.map(cell => {
      // Properly escape cells with special characters (commas, quotes, newlines)
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell.replace(/"/g, '""')}"`; // Double quotes to escape quotes
      }
      return String(cell); // Ensure all values are strings
    }).join(',')
  ).join('\n');
  
  logger.debug('[CSV Generation] CSV generation complete', {
    rowCount: rows.length,
    byteSize: Buffer.from(csvContent).length
  });
  
  return csvContent;
}

/**
 * Utility function to unlock security tasks after KYB is completed
 */
async function unlockSecurityTasks(companyId: number, kybTaskId: number, userId?: number) {
  try {
    logger.info('Looking for dependent security assessment tasks to unlock', {
      kybTaskId,
      companyId
    });
    
    // Find both security_assessment and sp_ky3p_assessment tasks for this company
    const securityTasks = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.company_id, companyId),
          sql`(${tasks.task_type} = 'security_assessment' OR ${tasks.task_type} = 'sp_ky3p_assessment')`
        )
      );
      
    logger.info('Found potential security tasks to unlock', {
      count: securityTasks.length,
      taskIds: securityTasks.map(t => t.id),
      taskTypes: securityTasks.map(t => t.task_type)
    });
    
    let unlockedCount = 0;
    
    // Unlock each security task that was dependent on this KYB task
    for (const securityTask of securityTasks) {
      // Check if the task is locked and if the KYB task is a prerequisite
      if (securityTask.metadata?.locked === true || 
          securityTask.metadata?.prerequisite_task_id === kybTaskId ||
          securityTask.metadata?.prerequisite_task_type === 'company_kyb') {
        
        logger.info('Unlocking security task', {
          securityTaskId: securityTask.id,
          previousMetadata: {
            locked: securityTask.metadata?.locked,
            prerequisiteTaskId: securityTask.metadata?.prerequisite_task_id
          }
        });
        
        // Update the security task to unlock it
        await db.update(tasks)
          .set({
            metadata: {
              ...securityTask.metadata,
              locked: false, // Explicitly unlock the task
              prerequisite_completed: true,
              prerequisite_completed_at: new Date().toISOString(),
              prerequisite_completed_by: userId
            },
            updated_at: new Date()
          })
          .where(eq(tasks.id, securityTask.id));
          
        logger.info('Security task unlocked successfully', {
          securityTaskId: securityTask.id
        });
        
        unlockedCount++;
      }
    }
    
    return { success: true, count: unlockedCount };
  } catch (error) {
    logger.error('Error unlocking security tasks', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      kybTaskId,
      companyId
    });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}