/**
 * Unified Clear Fields Service
 * 
 * This service provides a unified, transaction-based approach for clearing form fields
 * across all form types (KYB, KY3P, Open Banking). It ensures reliable atomic operations
 * and consistent behavior with proper WebSocket broadcasting.
 */

import { pool } from '@db';
import { TaskStatus } from '@db/schema';
import { logger } from '../utils/logger';
import { broadcastTaskUpdate } from '../utils/unified-websocket';

// Form type definitions for type safety
export type FormType = 'company_kyb' | 'ky3p' | 'open_banking';

// Map form types to their respective database tables
const responseTableMap: Record<FormType, string> = {
  'company_kyb': 'kyb_responses',
  'ky3p': 'ky3p_responses',
  'open_banking': 'open_banking_responses'
};

// Map form types to their timestamp tables (if applicable)
const timestampTableMap: Partial<Record<FormType, string>> = {
  'company_kyb': 'kyb_field_timestamps',
  // Other form types may not have timestamp tables
};

/**
 * Clear form fields using a transactional approach for data consistency
 * 
 * @param taskId The ID of the task to clear fields for
 * @param formType The type of form (KYB, KY3P, Open Banking)
 * @param userId The ID of the user performing the operation
 * @param companyId The ID of the company the task belongs to
 * @param preserveProgress Whether to preserve the current progress (optional, default false)
 * @returns Result of the operation with status information
 */
export async function clearFormFields(
  taskId: number,
  formType: FormType,
  userId: number,
  companyId: number,
  preserveProgress: boolean = false
): Promise<{
  success: boolean;
  taskId: number;
  message: string;
  status?: string;
  progress?: number;
  error?: any;
}> {
  // Get a dedicated client from the pool to use transactions
  const client = await pool.connect();
  
  try {
    const responseTable = responseTableMap[formType];
    
    if (!responseTable) {
      throw new Error(`Invalid form type: ${formType}`);
    }
    
    logger.info(`[UnifiedClear] Clearing fields for ${formType} task`, {
      taskId,
      userId,
      companyId,
      formType,
      preserveProgress,
      responseTable
    });

    // Begin transaction
    await client.query('BEGIN');
    
    // First, verify the task exists and belongs to the user's company
    const taskResult = await client.query(
      'SELECT * FROM tasks WHERE id = $1 AND company_id = $2 AND task_type = $3 LIMIT 1',
      [taskId, companyId, formType]
    );

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn(`[UnifiedClear] Task not found or not authorized`, {
        taskId,
        companyId,
        formType
      });
      return {
        success: false,
        taskId,
        message: 'Task not found or not authorized'
      };
    }

    const task = taskResult.rows[0];
    
    // Save the current progress and status if needed for preserveProgress option
    const currentProgress = task.progress || 0;
    const currentStatus = task.status || 'not_started';
    
    // Delete all responses for this task
    const deleteResult = await client.query(
      `DELETE FROM ${responseTable} WHERE task_id = $1`,
      [taskId]
    );

    logger.info(`[UnifiedClear] Deleted responses`, {
      taskId,
      formType,
      responseTable,
      count: deleteResult.rowCount
    });
    
    // Also clear the timestamp table if it exists for this form type
    const timestampTable = timestampTableMap[formType];
    if (timestampTable) {
      try {
        const timestampDeleteResult = await client.query(
          `DELETE FROM ${timestampTable} WHERE task_id = $1`,
          [taskId]
        );
        
        logger.info(`[UnifiedClear] Deleted field timestamps`, {
          taskId,
          formType,
          timestampTable,
          count: timestampDeleteResult.rowCount
        });
      } catch (timestampError) {
        // Log but continue with the operation - timestamp table errors shouldn't block the main operation
        logger.warn(`[UnifiedClear] Error clearing timestamp table`, {
          taskId,
          formType,
          timestampTable,
          error: timestampError instanceof Error ? timestampError.message : String(timestampError)
        });
      }
    }
    
    // Prepare status update based on preserveProgress flag
    const newStatus = preserveProgress ? currentStatus : 'not_started';
    const newProgress = preserveProgress ? currentProgress : 0;
    
    // Create metadata for the update with timestamp for better diagnostics
    const timestamp = new Date().toISOString();
    let metadataUpdate;
    
    if (preserveProgress) {
      metadataUpdate = `jsonb_build_object(
        'clearOperation', true,
        'preservedProgress', ${currentProgress},
        'preservedStatus', '${currentStatus}',
        'lastClearTimestamp', '${timestamp}',
        'preserveProgress', true,
        'previousMetadata', COALESCE(metadata, '{}'::jsonb),
        'clearSource', 'unified-clear-service',
        'formType', '${formType}',
        'preserveProgressEnabled', true
      )`;
    } else {
      metadataUpdate = `jsonb_build_object(
        'clearOperation', true,
        'previousProgress', ${currentProgress},
        'previousStatus', '${currentStatus}',
        'lastClearTimestamp', '${timestamp}',
        'previousMetadata', COALESCE(metadata, '{}'::jsonb),
        'clearSource', 'unified-clear-service',
        'formType', '${formType}',
        'preserveProgressEnabled', false
      )`;
    }
    
    // Log detailed operation info
    logger.info(`[UnifiedClear] Updating task status`, {
      taskId,
      formType,
      newStatus,
      newProgress,
      currentStatus,
      currentProgress,
      preserveProgress,
      timestamp
    });
    
    // Update task status and progress
    const updateResult = await client.query(
      `UPDATE tasks SET 
         status = $1, 
         progress = $2, 
         updated_at = NOW(),
         metadata = ${metadataUpdate}
       WHERE id = $3
       RETURNING id, status, progress, metadata`,
      [newStatus, newProgress, taskId]
    );
    
    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.error(`[UnifiedClear] Failed to update task status`, {
        taskId,
        formType
      });
      return {
        success: false,
        taskId,
        message: 'Failed to update task after clearing fields'
      };
    }

    // Commit the transaction
    await client.query('COMMIT');
    
    const updatedTask = updateResult.rows[0];
    
    logger.info(`[UnifiedClear] Successfully cleared ${formType} task fields`, {
      taskId,
      formType,
      status: updatedTask.status,
      progress: updatedTask.progress,
      preserveProgress
    });

    // Broadcast the task update to all clients
    try {
      // Use the unified WebSocket broadcasting method
      broadcastTaskUpdate({
        taskId,
        status: updatedTask.status,
        progress: updatedTask.progress,
        metadata: {
          ...updatedTask.metadata,
          clearOperation: true,
          timestamp: new Date().toISOString()
        }
      });
      
      logger.info(`[UnifiedClear] Successfully broadcast task update`, {
        taskId,
        formType,
        status: updatedTask.status,
        progress: updatedTask.progress
      });
    } catch (broadcastError) {
      // Log but don't fail the operation if broadcast fails
      logger.warn(`[UnifiedClear] Failed to broadcast task update`, {
        taskId,
        formType,
        error: broadcastError instanceof Error ? broadcastError.message : String(broadcastError)
      });
    }
    
    // Return success response
    return {
      success: true,
      taskId,
      message: `${formType} fields cleared successfully`,
      status: updatedTask.status,
      progress: updatedTask.progress
    };
  } catch (error) {
    // Rollback in case of error
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      logger.error(`[UnifiedClear] Error during rollback`, {
        taskId,
        formType,
        error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
      });
    }
    
    logger.error(`[UnifiedClear] Error clearing fields`, {
      taskId,
      formType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      taskId,
      message: 'Error clearing fields',
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}