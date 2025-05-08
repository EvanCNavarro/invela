/**
 * Enhanced Unified Clear Fields Service
 * 
 * This service handles clearing form fields for different form types:
 * - KYB (Know Your Business)
 * - KY3P (Know Your Third Party Provider)
 * - Open Banking
 * - Card
 * 
 * It uses database transactions to ensure atomicity and provides
 * WebSocket broadcast control to prevent race conditions.
 */
import { eq } from 'drizzle-orm';
import { db } from '@db';
import { 
  tasks, 
  kybResponses, 
  ky3pResponses, 
  openBankingResponses,
  cardResponses
} from '@db/schema';
import { broadcast, broadcastTaskUpdate } from '../utils/websocket';
import { WebSocketContext } from '../utils/websocket-context';
import { logger } from '../utils/logger';
import { Pool } from 'pg';

// Create a PostgreSQL connection pool for direct SQL operations
// This avoids the ORM syntax issues we were encountering
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Import FormType and re-export for consumers
import type { FormType } from '../utils/websocket-context';
export type { FormType };

// CRITICAL: To ensure proper type safety, explicitly define form types
const SUPPORTED_FORM_TYPES = ['kyb', 'company_kyb', 'ky3p', 'open_banking', 'card'];

// Configure service options
interface ClearFieldsOptions {
  skipBroadcast?: boolean;      // Whether to skip WebSocket broadcasts for individual fields
  clearSavedFormData?: boolean; // Whether to clear the cached savedFormData in tasks table
  broadcastDelay?: number;      // Delay before sending final broadcast (allows DB to settle)
  suppressDuration?: number;    // Duration to suppress individual broadcasts
}

/**
 * Simple, reliable API for clearing form fields - this is used by routes and controllers
 * This implementation follows the KISS principle for maximum reliability.
 * 
 * @param taskId - The ID of the task to clear fields for
 * @param formType - The type of form (kyb, ky3p, open_banking, card)
 * @param userId - The ID of the user performing the operation
 * @param companyId - The ID of the company the task belongs to
 * @param preserveProgress - Whether to preserve the task's progress value
 * @returns Object with operation result and status information
 */
export const clearFormFields = async (
  taskId: number,
  formType: FormType,
  userId: number,
  companyId: number,
  preserveProgress = false
): Promise<{
  success: boolean;
  message: string;
  status?: string;
  progress?: number;
  error?: string;
}> => {
  try {
    logger.info(`[ClearFields] Starting clear operation for task ${taskId} (${formType})`, {
      taskId,
      formType,
      userId,
      companyId,
      preserveProgress
    });
    
    // Simple direct implementation - just delete from the appropriate table and update progress
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Get current task
      const taskResult = await client.query(
        'SELECT * FROM tasks WHERE id = $1',
        [taskId]
      );
      
      if (taskResult.rows.length === 0) {
        await client.query('ROLLBACK');
        logger.warn(`[ClearFields] Task ${taskId} not found`);
        return {
          success: false,
          message: `Task ${taskId} not found`,
          error: 'NOT_FOUND'
        };
      }
      
      const task = taskResult.rows[0];
      
      // Map form types for consistency
      const normalizedFormType = 
        formType === 'company_kyb' ? 'kyb' : 
        formType === 'open-banking' ? 'open_banking' : 
        formType;
      
      // Determine table name
      let tableName;
      switch (normalizedFormType) {
        case 'kyb':
          tableName = 'kyb_responses';
          break;
        case 'ky3p':
          tableName = 'ky3p_responses';
          break;
        case 'open_banking':
          tableName = 'open_banking_responses';
          break;
        case 'card':
          tableName = 'card_responses';
          break;
        default:
          await client.query('ROLLBACK');
          logger.warn(`[ClearFields] Unsupported form type: ${formType}`);
          return {
            success: false,
            message: `Unsupported form type: ${formType}`,
            error: 'INVALID_FORM_TYPE'
          };
      }
      
      // Delete from appropriate table - use a direct, simple query
      logger.info(`[ClearFields] Deleting all responses for task ${taskId} from ${tableName}`);
      const deleteResult = await client.query(
        `DELETE FROM ${tableName} WHERE task_id = $1`,
        [taskId]
      );
      
      logger.info(`[ClearFields] Deleted ${deleteResult.rowCount} responses from ${tableName}`);
      
      // Update progress if needed
      if (!preserveProgress) {
        logger.info(`[ClearFields] Resetting progress to 0 for task ${taskId}`);
        await client.query(
          'UPDATE tasks SET progress = 0 WHERE id = $1',
          [taskId]
        );
      } else {
        logger.info(`[ClearFields] Preserving progress (${task.progress}%) for task ${taskId}`);
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      // Enhanced: Broadcast task update with full fields_cleared operation metadata
      // This includes a clear signal that all form sections should be reset
      try {
        logger.info(`[ClearFields] Broadcasting enhanced task update for task ${taskId}`);
        await broadcastTaskUpdate(taskId, task.status, preserveProgress ? task.progress : 0, {
          operation: 'fields_cleared',
          clearSections: true,  // Signal to client to reset all section statuses
          formType: normalizedFormType,
          resetUI: true,        // Signal to client to fully reset UI state
          clearedAt: new Date().toISOString(),
          timestamp: new Date().toISOString()
        });
        
        // Additional logging for diagnostics
        logger.info(`[ClearFields] Enhanced broadcast for task ${taskId} completed`, {
          taskId,
          formType: normalizedFormType,
          operation: 'fields_cleared',
          resetUI: true
        });
      } catch (broadcastError) {
        // Log but don't fail if broadcast fails
        logger.warn('[ClearFields] Failed to broadcast task update, continuing', { 
          broadcastError,
          taskId
        });
      }
      
      return {
        success: true,
        message: `Successfully cleared ${deleteResult.rowCount} fields for task ${taskId}`,
        status: task.status,
        progress: preserveProgress ? task.progress : 0
      };
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      logger.error(`[ClearFields] Database error in clearFormFields:`, { 
        taskId, 
        formType, 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      // Always release client
      client.release();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[ClearFields] Error in clearFormFields:`, { 
      taskId, 
      formType, 
      error: errorMessage 
    });
    
    return {
      success: false,
      message: `Failed to clear fields: ${errorMessage}`,
      error: errorMessage
    };
  }
};

/**
 * Core service for clearing fields - this handles the actual database operations
 */
export const clearFieldsService = async (
  taskId: number,
  formType: FormType,
  preserveProgress = false,
  options: ClearFieldsOptions = {}
) => {
  // Set default options
  const opts = {
    skipBroadcast: false,
    clearSavedFormData: true,
    broadcastDelay: 500,
    suppressDuration: 5000,
    ...options
  };
  
  const serviceLogger = logger.child({ module: 'ClearFieldsService' });
  
  // Validate form type
  if (!SUPPORTED_FORM_TYPES.includes(formType)) {
    serviceLogger.error(`Unsupported form type: ${formType}`);
    throw new Error(`Unsupported form type: ${formType}. Must be one of: ${SUPPORTED_FORM_TYPES.join(', ')}`);
  }
  
  serviceLogger.info(`Clearing fields for task ${taskId} (${formType}), preserveProgress=${preserveProgress}`);
  
  // Begin a WebSocket context for this operation
  return WebSocketContext.run(async () => {
    // Start a bulk operation in the WebSocket context
    WebSocketContext.startOperation('clear_fields', taskId, formType, opts.suppressDuration);
    
    // Use a native PostgreSQL client to avoid ORM syntax issues
    const client = await pool.connect();
    
    try {
      // Begin a transaction
      await client.query('BEGIN');
      
      // 1. Get the current task to ensure it exists and get its current status
      const taskResult = await client.query(
        'SELECT * FROM tasks WHERE id = $1 LIMIT 1',
        [taskId]
      );
      
      if (taskResult.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error(`Task ${taskId} not found`);
      }
      
      const task = taskResult.rows[0];
      
      // 2. Clear responses from the appropriate table based on form type
      let deletedCount = 0;
      let deleteResult;
      
      // Handle different form types - each has its own table
      if (formType === 'kyb' || formType === 'company_kyb') {
        // Handle both 'kyb' and 'company_kyb' form types using kyb_responses table
        deleteResult = await client.query(
          'DELETE FROM kyb_responses WHERE task_id = $1',
          [taskId]
        );
        deletedCount = deleteResult.rowCount || 0;
      } else if (formType === 'ky3p') {
        deleteResult = await client.query(
          'DELETE FROM ky3p_responses WHERE task_id = $1',
          [taskId]
        );
        deletedCount = deleteResult.rowCount || 0;
      } else if (formType === 'open_banking') {
        deleteResult = await client.query(
          'DELETE FROM open_banking_responses WHERE task_id = $1',
          [taskId]
        );
        deletedCount = deleteResult.rowCount || 0;
      } else if (formType === 'card') {
        deleteResult = await client.query(
          'DELETE FROM card_responses WHERE task_id = $1',
          [taskId]
        );
        deletedCount = deleteResult.rowCount || 0;
      }
        
      // FIXED: Don't try to clear savedFormData since the column doesn't exist
      // Just log the action for tracking
      if (opts.clearSavedFormData) {
        serviceLogger.info(`Skipping savedFormData clearing for task ${taskId} (column doesn't exist)`);
      }
        
      // 4. Update progress if not preserving
      if (!preserveProgress) {
        await client.query(
          'UPDATE tasks SET progress = 0 WHERE id = $1',
          [taskId]
        );
        serviceLogger.info(`Reset progress for task ${taskId} to 0%`);
      }
        
      // 5. Commit the transaction
      await client.query('COMMIT');
        
      // 6. Record operation metadata for tracking
      const operationMetadata = {
        operationId: `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        taskId,
        formType,
        operation: 'clear_fields',
        preserveProgress,
        deletedCount,
        timestamp: new Date().toISOString()
      };
        
      // 7. Send a bulk WebSocket notification if not skipping broadcasts
      if (!opts.skipBroadcast) {
        // Small delay to ensure DB operations are complete
        setTimeout(async () => {
          try {
            // Broadcast a specialized clear_fields event that clients can use
            // to synchronize their state
            await broadcast('clear_fields', {
              ...operationMetadata,
              preservedProgress: preserveProgress
            });
              
            // Also broadcast a task update with the new progress
            // Enhanced with clearSections and resetUI flags for consistent client handling
            await broadcastTaskUpdate(taskId, task.status, preserveProgress ? task.progress : 0, {
              operation: 'fields_cleared',
              clearSections: true,         // Signal to client to reset all section statuses
              formType,                    // Include form type for client-side filtering
              resetUI: true,               // Signal to client to fully reset UI state
              clearedAt: new Date().toISOString(),
              timestamp: new Date().toISOString()
            });
              
            serviceLogger.info(`Sent clear_fields broadcast for task ${taskId}`);
          } catch (broadcastError) {
            serviceLogger.error(`Error broadcasting clear_fields event:`, broadcastError);
          } finally {
            // End the operation after broadcasting
            WebSocketContext.endOperation();
          }
        }, opts.broadcastDelay);
      } else {
        // If skipping broadcasts, still end the operation
        WebSocketContext.endOperation();
      }
        
      serviceLogger.info(`Successfully cleared ${deletedCount} fields for task ${taskId}`);
        
      return {
        success: true,
        deletedCount,
        message: `Successfully cleared ${deletedCount} fields for task ${taskId}`,
        preserveProgress
      };
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      serviceLogger.error(`Error clearing fields for task ${taskId}:`, error);
      // End the operation on error
      WebSocketContext.endOperation();
      throw error;
    } finally {
      // Always release the client back to the pool
      client.release();
    }
  });
}