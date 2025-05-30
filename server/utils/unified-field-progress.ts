/**
 * Unified Field Progress Module
 * 
 * This module provides a standardized approach to calculating progress across all form types
 * (KYB, KY3P, Open Banking) using field_key for consistent reference and standard status values.
 */

import { db } from '@db';
import { eq, and, sql } from 'drizzle-orm';
import { 
  tasks, 
  kybResponses, 
  kybFields, 
  ky3pResponses, 
  ky3pFields, 
  openBankingResponses, 
  openBankingFields
} from '@db/schema';
import { FieldStatus } from './field-status';
import { logger } from './logger';
import { TaskStatus } from '../types';

// Import the status determination utility
import { determineTaskStatus } from './task-status-determiner';

/**
 * Calculate progress for any task type using a standardized approach
 * 
 * This function handles all task types consistently by:
 * 1. Using field_key as the primary reference for fields (with fallback to field_id)
 * 2. Using standardized status values from FieldStatus enum
 * 3. Using consistent math (completed fields / total fields) with Math.round
 * 
 * @param taskId Task ID
 * @param taskType Task type ('kyb', 'ky3p', 'open_banking')
 * @param options Additional options
 * @returns Progress percentage (0-100)
 */
export async function calculateTaskProgress(
  taskId: number,
  taskType: string,
  options: { 
    tx?: any; 
    debug?: boolean; 
    diagnosticId?: string;
    useFieldKey?: boolean; // Whether to use field_key for counting (true for new approach)
  } = {}
): Promise<number> {
  // Generate a unique diagnostic ID for this calculation
  const diagnosticId = options.diagnosticId || `prog-calc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const logPrefix = `[Unified Progress ${diagnosticId}]`;
  const debug = options.debug || false;
  const useFieldKey = options.useFieldKey !== false; // Default to using field_key unless explicitly disabled
  
  // Use the passed transaction context or the global db instance
  const dbContext = options.tx || db;
  
  // Normalize task type to handle various formats
  const normalizedTaskType = normalizeTaskType(taskType);
  
  // Log calculation start with all key parameters
  logger.info(`${logPrefix} Starting progress calculation for task ${taskId} (${normalizedTaskType})`, {
    taskId,
    normalizedTaskType,
    originalTaskType: taskType,
    useFieldKey,
    debug,
    usingTransaction: !!options.tx,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Variables to track field counts
    let totalFields = 0;
    let completedFields = 0;
    
    // Use different calculation logic based on task type
    if (normalizedTaskType === 'open_banking') {
      if (useFieldKey) {
        // Count total Open Banking fields
        const totalFieldsResult = await dbContext
          .select({ count: sql<number>`count(*)` })
          .from(openBankingFields);
        totalFields = totalFieldsResult[0].count;
        
        // Count completed Open Banking responses using field_key
        const completedResultQuery = await dbContext
          .select({ count: sql<number>`count(DISTINCT field_key)` })
          .from(openBankingResponses)
          .where(
            and(
              eq(openBankingResponses.task_id, taskId),
              eq(openBankingResponses.status, FieldStatus.COMPLETE)
            )
          );
        completedFields = completedResultQuery[0].count;
      } else {
        // Legacy approach using field_id
        const totalFieldsResult = await dbContext
          .select({ count: sql<number>`count(*)` })
          .from(openBankingFields);
        totalFields = totalFieldsResult[0].count;
        
        // Count completed responses with legacy approach
        const completedResultQuery = await dbContext
          .select({ count: sql<number>`count(*)` })
          .from(openBankingResponses)
          .where(
            and(
              eq(openBankingResponses.task_id, taskId),
              eq(openBankingResponses.status, FieldStatus.COMPLETE)
            )
          );
        completedFields = completedResultQuery[0].count;
      }
    } 
    else if (normalizedTaskType === 'ky3p') {
      if (useFieldKey) {
        // Count total KY3P fields
        const totalFieldsResult = await dbContext
          .select({ count: sql<number>`count(*)` })
          .from(ky3pFields);
        totalFields = totalFieldsResult[0].count;
        
        // Count completed KY3P responses using field_key for accurate counting
        const completedResultQuery = await dbContext
          .select({ count: sql<number>`count(DISTINCT field_key)` })
          .from(ky3pResponses)
          .where(
            and(
              eq(ky3pResponses.task_id, taskId),
              eq(ky3pResponses.status, FieldStatus.COMPLETE)
            )
          );
        completedFields = completedResultQuery[0].count;
      } else {
        // Legacy approach using field_id
        const totalFieldsResult = await dbContext
          .select({ count: sql<number>`count(*)` })
          .from(ky3pFields);
        totalFields = totalFieldsResult[0].count;
        
        // Count completed responses with legacy approach
        const completedResultQuery = await dbContext
          .select({ count: sql<number>`count(*)` })
          .from(ky3pResponses)
          .where(
            and(
              eq(ky3pResponses.task_id, taskId),
              eq(ky3pResponses.status, FieldStatus.COMPLETE)
            )
          );
        completedFields = completedResultQuery[0].count;
      }
      
      // Detailed logging for KY3P progress calculation
      if (debug) {
        const responseDetails = await dbContext
          .select()
          .from(ky3pResponses)
          .where(eq(ky3pResponses.task_id, taskId));
          
        logger.debug(`${logPrefix} KY3P responses details:`, {
          totalCount: responseDetails.length,
          completeCount: responseDetails.filter(r => r.status === FieldStatus.COMPLETE).length,
          byStatus: {
            [FieldStatus.COMPLETE]: responseDetails.filter(r => r.status === FieldStatus.COMPLETE).length,
            [FieldStatus.INCOMPLETE]: responseDetails.filter(r => r.status === FieldStatus.INCOMPLETE).length,
            [FieldStatus.EMPTY]: responseDetails.filter(r => r.status === FieldStatus.EMPTY).length,
            [FieldStatus.INVALID]: responseDetails.filter(r => r.status === FieldStatus.INVALID).length,
            other: responseDetails.filter(r => !Object.values(FieldStatus).includes(r.status as any)).length
          },
          useFieldKey,
          byFieldKey: useFieldKey
            ? Object.fromEntries(
                Array.from(
                  responseDetails.reduce((acc, r) => {
                    const key = r.field_key || 'unknown';
                    acc.set(key, (acc.get(key) || 0) + 1);
                    return acc;
                  }, new Map<string, number>())
                )
              )
            : 'Field key analysis disabled'
        });
      }
    }
    else { 
      // Assume KYB by default
      if (useFieldKey) {
        // Count total KYB fields
        const totalFieldsResult = await dbContext
          .select({ count: sql<number>`count(*)` })
          .from(kybFields);
        totalFields = totalFieldsResult[0].count;
        
        // Count completed KYB responses using field_key
        const completedResultQuery = await dbContext
          .select({ count: sql<number>`count(DISTINCT field_key)` })
          .from(kybResponses)
          .where(
            and(
              eq(kybResponses.task_id, taskId),
              eq(kybResponses.status, FieldStatus.COMPLETE)
            )
          );
        completedFields = completedResultQuery[0].count;
      } else {
        // Legacy approach using field_id
        const totalFieldsResult = await dbContext
          .select({ count: sql<number>`count(*)` })
          .from(kybFields);
        totalFields = totalFieldsResult[0].count;
        
        // Count completed responses with legacy approach
        const completedResultQuery = await dbContext
          .select({ count: sql<number>`count(*)` })
          .from(kybResponses)
          .where(
            and(
              eq(kybResponses.task_id, taskId),
              eq(kybResponses.status, FieldStatus.COMPLETE)
            )
          );
        completedFields = completedResultQuery[0].count;
      }
    }
    
    // Calculate progress percentage using the same formula for all task types
    // Handle division by zero case
    const progressPercentage = totalFields > 0 
      ? Math.min(100, Math.round((completedFields / totalFields) * 100))
      : 0;
    
    // Log calculation result with all key metrics
    logger.info(`${logPrefix} Calculated progress for task ${taskId} (${normalizedTaskType}): ${completedFields}/${totalFields} = ${progressPercentage}%`, {
      taskId,
      normalizedTaskType,
      originalTaskType: taskType,
      totalFields,
      completedFields,
      progressPercentage,
      useFieldKey,
      timestamp: new Date().toISOString()
    });
    
    return progressPercentage;
  } catch (error) {
    // Comprehensive error logging
    logger.error(`${logPrefix} Error calculating progress:`, {
      taskId,
      normalizedTaskType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Update task progress and status in the database
 * 
 * This function updates the task progress and status in the database, ensuring type safety
 * and consistent status determination across all task types.
 * 
 * @param taskId Task ID
 * @param taskType Task type ('kyb', 'ky3p', 'open_banking')
 * @param options Additional options
 */
export async function updateTaskProgressAndStatus(
  taskId: number,
  taskType: string,
  options: { 
    forceUpdate?: boolean; 
    skipBroadcast?: boolean; 
    debug?: boolean;
    metadata?: Record<string, any>;
    useFieldKey?: boolean; // Whether to use field_key for progress calculation
  } = {}
): Promise<any> {
  const { forceUpdate = false, skipBroadcast = false, debug = false, metadata = {} } = options;
  const logPrefix = '[Unified Progress Update]';
  const useFieldKey = options.useFieldKey !== false;
  
  try {
    // Step 1: Get the current task
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Step 2: Calculate the current progress
    const calculatedProgress = await calculateTaskProgress(taskId, taskType, { 
      debug, 
      useFieldKey
    });
    
    // Step 3: Determine the appropriate status based on progress and task state
    const newStatus = determineTaskStatus({
      progress: calculatedProgress,
      currentStatus: task.status as TaskStatus,
      hasSubmissionDate: !!task.completion_date,
      hasSubmittedFlag: task.metadata?.status === 'submitted' || task.metadata?.explicitlySubmitted === true,
      hasResponses: true, // Assume has responses if we're calculating progress
      metadata: task.metadata || {}
    });
    
    // Only update if there are changes or we're forcing an update
    if (forceUpdate || task.progress !== calculatedProgress || task.status !== newStatus) {
      logger.info(`${logPrefix} Updating task ${taskId} progress to ${calculatedProgress}% and status to ${newStatus}`, {
        taskId,
        taskType: normalizeTaskType(taskType),
        progress: calculatedProgress,
        status: newStatus,
        previousStatus: task.status
      });
      
      // Step 4: Update the task in the database with proper type handling
      await db.update(tasks)
        .set({
          // Use explicit CAST to ensure proper type handling
          progress: sql`CAST(${calculatedProgress} AS REAL)`,
          status: newStatus,
          updated_at: new Date(),
          // Update metadata with last progress update timestamp
          metadata: sql`jsonb_set(
            COALESCE(${tasks.metadata}, '{}'::jsonb),
            '{lastProgressUpdate}',
            to_jsonb(now()::text)
          )`
        })
        .where(eq(tasks.id, taskId));
      
      // Step 5: Broadcast the update if not skipped
      if (!skipBroadcast) {
        // Import broadcast function to avoid circular dependencies
        const { broadcastTaskUpdate } = await import('./unified-websocket');
        
        logger.debug(`Broadcasting task update with object format`, { taskId, status: newStatus });
        
        // Get the WebSocket server instance - this reuses the singleton
        const { getWebSocketServer } = await import('../services/websocket-manager');
        const wss = await getWebSocketServer();
        
        if (wss) {
          logger.info(`Successfully retrieved unified WebSocket server for broadcast`);
          
          // Broadcast the update with the WebSocket service
          broadcastTaskUpdate({
            id: taskId,
            status: newStatus,
            progress: calculatedProgress,
            metadata: {
              ...metadata,
              updatedVia: 'unified-progress-update',
              timestamp: new Date().toISOString(),
              previousProgress: task.progress,
              previousStatus: task.status,
              lastProgressUpdate: new Date().toISOString()
            }
          });
          
          logger.info(`Successfully broadcasted task_update message`);
        } else {
          logger.warn(`Could not get WebSocket server for broadcasting task update`);
        }
        
        logger.info(`${logPrefix} Broadcasted progress update for task ${taskId}`, {
          taskId,
          progress: calculatedProgress,
          status: newStatus
        });
      }
      
      // Return updated values
      return {
        taskId,
        progress: calculatedProgress,
        status: newStatus,
        previousProgress: task.progress,
        wasUpdated: true
      };
    } else {
      // No changes needed
      return {
        taskId,
        progress: task.progress,
        status: task.status,
        wasUpdated: false
      };
    }
  } catch (error) {
    // Comprehensive error logging
    logger.error(`${logPrefix} Error updating task progress:`, {
      taskId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}

/**
 * Normalize task type to one of the standard types
 * 
 * @param taskType Original task type string
 * @returns Normalized task type ('kyb', 'ky3p', 'open_banking')
 */
function normalizeTaskType(taskType: string): 'kyb' | 'ky3p' | 'open_banking' {
  const normalizedType = taskType.toLowerCase();
  
  if (normalizedType === 'open_banking') {
    return 'open_banking';
  }
  
  if (
    normalizedType === 'ky3p' ||
    normalizedType.includes('ky3p') ||
    normalizedType.includes('security') ||
    normalizedType === 'security_assessment' ||
    normalizedType === 'sp_ky3p_assessment'
  ) {
    return 'ky3p';
  }
  
  // Default to KYB for all other types
  return 'kyb';
}
