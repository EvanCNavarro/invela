/**
 * Fixed Field Progress Module
 * 
 * This module provides a fixed version of the field progress calculation that works around
 * the Drizzle ORM type errors by using raw SQL queries for status comparisons.
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
import { FieldStatus, isValidFieldStatus } from './field-status';
import { logger } from './logger';
import { TaskStatus } from '../types';

// Import the status determination utility
import { determineTaskStatus } from './task-status-determiner';

// We'll use dynamic imports for WebSocketServer to avoid circular dependencies

/**
 * Calculate progress for any task type using raw SQL for status comparison
 * 
 * This function avoids the Drizzle ORM type errors by using raw SQL queries for status comparisons.
 * It provides a consistent approach across all form types.
 * 
 * @param taskId Task ID
 * @param taskType Task type ('kyb', 'ky3p', 'open_banking')
 * @param options Additional options
 * @returns Progress percentage (0-100)
 */
export async function calculateTaskProgressFixed(
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
  const logPrefix = `[Fixed Progress ${diagnosticId}]`;
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
      // Count total Open Banking fields
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(openBankingFields);
      totalFields = totalFieldsResult[0].count;
      
      // Count completed Open Banking responses using raw SQL for status comparison
      const completedResultQuery = await dbContext
        .select({ count: useFieldKey ? sql<number>`count(DISTINCT field_key)` : sql<number>`count(*)` })
        .from(openBankingResponses)
        .where(
          and(
            eq(openBankingResponses.task_id, taskId),
            sql`${openBankingResponses.status} = ${FieldStatus.COMPLETE}`
          )
        );
      completedFields = completedResultQuery[0].count;
    } 
    else if (normalizedTaskType === 'ky3p') {
      // Count total KY3P fields
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(ky3pFields);
      totalFields = totalFieldsResult[0].count;
      
      // Count completed KY3P responses using raw SQL for status comparison
      const completedResultQuery = await dbContext
        .select({ count: useFieldKey ? sql<number>`count(DISTINCT field_key)` : sql<number>`count(*)` })
        .from(ky3pResponses)
        .where(
          and(
            eq(ky3pResponses.task_id, taskId),
            sql`${ky3pResponses.status} = ${FieldStatus.COMPLETE}`
          )
        );
      completedFields = completedResultQuery[0].count;
      
      // Detailed logging for KY3P progress calculation
      if (debug) {
        const responseDetails = await dbContext
          .select()
          .from(ky3pResponses)
          .where(eq(ky3pResponses.task_id, taskId));
          
        logger.debug(`${logPrefix} KY3P responses details:`, {
          totalCount: responseDetails.length,
          completeCount: responseDetails.filter((r: {status: string}) => r.status === FieldStatus.COMPLETE).length,
          byStatus: {
            [FieldStatus.COMPLETE]: responseDetails.filter((r: {status: string}) => r.status === FieldStatus.COMPLETE).length,
            [FieldStatus.INCOMPLETE]: responseDetails.filter((r: {status: string}) => r.status === FieldStatus.INCOMPLETE).length,
            [FieldStatus.EMPTY]: responseDetails.filter((r: {status: string}) => r.status === FieldStatus.EMPTY).length,
            [FieldStatus.INVALID]: responseDetails.filter((r: {status: string}) => r.status === FieldStatus.INVALID).length,
            other: responseDetails.filter((r: {status: string}) => !isValidFieldStatus(r.status)).length
          },
          useFieldKey,
          byFieldKey: useFieldKey
            ? (() => {
                // Create a simpler field key counter to avoid type issues
                const fieldKeyCounter = new Map<string, number>();
                // Use a properly typed iteration
                const typedResponses = responseDetails as Array<{field_key?: string}>;
                for (const r of typedResponses) {
                  const key = r.field_key || 'unknown';
                  fieldKeyCounter.set(key, (fieldKeyCounter.get(key) || 0) + 1);
                }
                // Convert the Map to an array of entries and then to an object
                return Object.fromEntries([...fieldKeyCounter.entries()]);
              })()
            : 'Field key analysis disabled'
        });
      }
    }
    else { 
      // Assume KYB by default
      // Count total KYB fields
      const totalFieldsResult = await dbContext
        .select({ count: sql<number>`count(*)` })
        .from(kybFields);
      totalFields = totalFieldsResult[0].count;
      
      // Count completed KYB responses using raw SQL for status comparison
      const completedResultQuery = await dbContext
        .select({ count: useFieldKey ? sql<number>`count(DISTINCT field_key)` : sql<number>`count(*)` })
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            sql`${kybResponses.status} = ${FieldStatus.COMPLETE}`
          )
        );
      completedFields = completedResultQuery[0].count;
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
      totalFields: String(totalFields),
      completedFields: String(completedFields),
      progress: progressPercentage,
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
 * Update task progress and status in the database using the fixed progress calculator
 * 
 * This function updates the task progress and status in the database, ensuring type safety
 * and consistent status determination across all task types.
 * 
 * @param taskId Task ID
 * @param taskType Task type ('kyb', 'ky3p', 'open_banking')
 * @param options Additional options
 */
export async function updateTaskProgressAndStatusFixed(
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
  const logPrefix = '[Fixed Progress Update]';
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
    
    // Step 2: Calculate the current progress using the fixed calculator
    const calculatedProgress = await calculateTaskProgressFixed(taskId, taskType, { 
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
      metadata: task.metadata || {},
      timestamp: new Date().toISOString()
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
        const { broadcastTaskUpdate } = await import('../services/websocket-enhanced.service');
        
        logger.debug(`Broadcasting task update with object format`, { taskId, status: newStatus });
        
        // Get the WebSocket server instance - this reuses the singleton
        // Use dynamic import with proper error handling to avoid circular dependencies
        let wss = null;
        try {
          // Try the unified websocket module first
          const unifiedWebsocket = await import('../utils/unified-websocket');
          wss = await unifiedWebsocket.getWebSocketServer();
        } catch (importError) {
          // Fall back to the standard websocket service
          try {
            const websocketService = await import('../services/websocket');
            wss = websocketService.getWebSocketServer();
          } catch (fallbackError) {
            logger.warn(`Could not import websocket modules: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
          }
        }
        
        if (wss) {
          logger.info(`Successfully retrieved unified WebSocket server for broadcast`);
          
          // Broadcast the update with the WebSocket service
          broadcastTaskUpdate({
            id: taskId,
            status: newStatus,
            progress: calculatedProgress,
            metadata: {
              ...metadata,
              updatedVia: 'fixed-progress-update',
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
