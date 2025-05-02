/**
 * Unified Progress Calculation Module
 * 
 * This file provides a centralized progress calculation system that works
 * consistently across all form types (KYB, KY3P, Open Banking).
 * 
 * It follows the KISS principle by using simple, deterministic calculations
 * and avoids special case handling wherever possible.
 */

import { db } from '@db';
import { eq, and, sql } from 'drizzle-orm';
import {
  tasks,
  kybResponses,
  ky3pResponses,
  openBankingResponses,
  kybFields,
  ky3pFields,
  openBankingFields
} from '@db/schema';
import { ResponseStatus, TaskStatus, normalizeResponseStatus, getStatusFromProgress } from './status-constants';
import { logger } from './logger';

// Type for task configuration
interface TaskTypeConfig {
  responsesTable: any;
  fieldsTable: any;
  taskTypes: string[];
}

// Configuration for each task type
const taskTypeConfigs: Record<string, TaskTypeConfig> = {
  kyb: {
    responsesTable: kybResponses,
    fieldsTable: kybFields,
    taskTypes: ['kyb', 'company_kyb']
  },
  ky3p: {
    responsesTable: ky3pResponses,
    fieldsTable: ky3pFields,
    taskTypes: ['ky3p', 'sp_ky3p_assessment', 'security_assessment']
  },
  open_banking: {
    responsesTable: openBankingResponses,
    fieldsTable: openBankingFields,
    taskTypes: ['open_banking', 'open_banking_assessment']
  }
};

/**
 * Get the canonical form type from a task type
 * 
 * @param taskType Task type from the database
 * @returns Canonical form type (kyb, ky3p, open_banking) or null if unknown
 */
export function getFormTypeFromTaskType(taskType: string): string | null {
  // Normalize task type for comparison
  const normalizedType = taskType.toLowerCase().trim();
  
  // Find matching form type
  for (const [formType, config] of Object.entries(taskTypeConfigs)) {
    if (config.taskTypes.some(type => normalizedType.includes(type.toLowerCase()))) {
      return formType;
    }
  }
  
  return null;
}

/**
 * Get the configuration for a task type
 * 
 * @param taskType Task type from the database
 * @returns Configuration for the task type or null if unknown
 */
function getConfigForTaskType(taskType: string): TaskTypeConfig | null {
  const formType = getFormTypeFromTaskType(taskType);
  return formType ? taskTypeConfigs[formType] : null;
}

/**
 * Helper function to normalize response status for case-insensitive comparisons
 */
function normalizeStatus(status: string | null | undefined): string {
  if (!status) return '';
  
  // Handle various status formats used across the application
  const normalized = status.toLowerCase().trim();
  
  // Map common variations to standardized values
  if (normalized === 'complete' || normalized === 'completed') {
    return ResponseStatus.COMPLETE.toLowerCase();
  } else if (normalized === 'incomplete' || normalized === 'in_progress' || normalized === 'in progress') {
    return ResponseStatus.INCOMPLETE.toLowerCase();
  } else if (normalized === 'empty' || normalized === 'not_started' || normalized === 'not started') {
    return ResponseStatus.EMPTY.toLowerCase();
  } else if (normalized === 'invalid' || normalized === 'error') {
    return ResponseStatus.INVALID.toLowerCase();
  }
  
  return normalized;
}

/**
 * Calculate progress for a task
 * 
 * @param taskId Task ID
 * @param taskType Task type
 * @param options Options for progress calculation
 * @returns Progress calculation result
 */
export async function calculateTaskProgress(
  taskId: number,
  taskType: string,
  options: { debug?: boolean; transactionId?: string } = {}
): Promise<{ progress: number; status: TaskStatus; calculationDetails: any }> {
  const { debug = false, transactionId = `txid-${Date.now()}` } = options;
  
  // Set up logging context
  const logContext = {
    taskId,
    taskType,
    transactionId,
    timestamp: new Date().toISOString()
  };
  
  logger.info(`[UnifiedProgress] Starting progress calculation for task ${taskId}`, logContext);
  
  try {
    // Step 1: Get task information
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Step 2: Get config for task type
    const config = getConfigForTaskType(taskType);
    if (!config) {
      throw new Error(`Unsupported task type: ${taskType}`);
    }
    
    // Step 3: Count total fields
    const totalFieldsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(config.fieldsTable);
    
    const totalFields = totalFieldsResult[0].count;
    
    if (debug) {
      logger.debug(`[UnifiedProgress] Found ${totalFields} total fields for ${taskType}`, logContext);
    }
    
    // Step 4: Count completed responses (case-insensitive)
    // We explicitly compare with both upper and lower case to handle existing data
    const completedFieldsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(config.responsesTable)
      .where(
        and(
          eq(config.responsesTable.task_id, taskId),
          sql`LOWER(${config.responsesTable.status}) = LOWER(${ResponseStatus.COMPLETE})`
        )
      );
    
    const completedFields = completedFieldsResult[0].count;
    
    if (debug) {
      logger.debug(`[UnifiedProgress] Found ${completedFields} completed fields for task ${taskId}`, 
        { ...logContext, completedFields, totalFields }
      );
      
      // Log sample responses for debugging
      const sampleResponses = await db
        .select()
        .from(config.responsesTable)
        .where(eq(config.responsesTable.task_id, taskId))
        .limit(5);
      
      logger.debug(`[UnifiedProgress] Sample responses for task ${taskId}`, {
        ...logContext,
        sampleCount: sampleResponses.length,
        samples: sampleResponses.map(r => ({
          field_id: r.field_id,
          status: r.status,
          normalized_status: normalizeResponseStatus(r.status),
          is_complete: normalizeResponseStatus(r.status) === normalizeResponseStatus(ResponseStatus.COMPLETE)
        }))
      });
    }
    
    // Step 5: Calculate progress percentage
    const rawProgress = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
    
    // FIXED: Ensure small percentages are not lost through rounding
    // For tasks with a large number of fields (like KY3P with 120 fields),
    // if there are completed fields but the raw percentage is less than 1%,
    // we use a minimum of 1% to indicate progress
    let progress;
    if (completedFields > 0 && rawProgress < 1) {
      progress = 1; // Minimum 1% if any fields are completed
    } else {
      progress = Math.min(100, Math.round(rawProgress));
    }
    
    // Added comprehensive logging for debugging progress calculation issues
    logger.info(`[UnifiedProgress] Calculated progress details for task ${taskId}:`, {
      ...logContext,
      taskType,
      totalFields,
      completedFields,
      rawProgress,
      roundedProgress: progress,
      usedMinimumProgress: (completedFields > 0 && rawProgress < 1),
      timestamp: new Date().toISOString()
    });
    
    // Step 6: Determine appropriate status
    // Check for submission-related fields in the task metadata
    const metadata = task.metadata || {};
    const hasSubmissionData = 
      (task as any).submission_date !== undefined || 
      (task as any).submitted !== undefined || 
      metadata.submission_date !== undefined || 
      metadata.submitted !== undefined || 
      task.status === 'submitted';
    
    const status = getStatusFromProgress(progress, hasSubmissionData);
    
    // Return detailed calculation result
    return {
      progress,
      status,
      calculationDetails: {
        taskId,
        taskType,
        totalFields,
        completedFields,
        hasSubmissionData,
        timestamp: new Date().toISOString(),
        transactionId
      }
    };
  } catch (error) {
    logger.error(`[UnifiedProgress] Error calculating progress for task ${taskId}`, {
      ...logContext,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw error;
  }
}
