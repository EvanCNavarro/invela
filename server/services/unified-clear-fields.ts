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
 * High-level API for clearing form fields - this is used by routes and controllers
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
    const serviceLogger = logger.child({ 
      module: 'ClearFormFields', 
      userId, 
      companyId,
      taskId,
      formType
    });
    
    // Get the current task to check permissions and status
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      serviceLogger.warn(`Task ${taskId} not found`);
      return {
        success: false,
        message: `Task ${taskId} not found`,
        error: 'NOT_FOUND'
      };
    }
    
    // Call the core service
    const result = await clearFieldsService(
      taskId,
      formType,
      preserveProgress,
      { 
        // No special options needed for the standard API
      }
    );
    
    return {
      success: true,
      message: result.message || `Successfully cleared fields for task ${taskId}`,
      status: task.status,
      progress: preserveProgress ? task.progress : 0
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error in clearFormFields:`, { taskId, formType, error: errorMessage });
    
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
    
    // Begin a database transaction to ensure atomicity
    return db.transaction(async (tx) => {
      try {
        // 1. Get the current task to ensure it exists and get its current status
        const task = await tx.query.tasks.findFirst({
          where: eq(tasks.id, taskId)
        });
        
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }
        
        // 2. Clear responses from the appropriate table based on form type
        let deletedCount = 0;
        
        // Handle different form types - each has its own table
        if (formType === 'kyb' || formType === 'company_kyb') {
          // Handle both 'kyb' and 'company_kyb' form types using kybResponses table
          const result = await tx.delete(kybResponses).where(eq(kybResponses.task_id, taskId));
          deletedCount = result.count;
        } else if (formType === 'ky3p') {
          const result = await tx.delete(ky3pResponses).where(eq(ky3pResponses.task_id, taskId));
          deletedCount = result.count;
        } else if (formType === 'open_banking') {
          const result = await tx.delete(openBankingResponses).where(eq(openBankingResponses.task_id, taskId));
          deletedCount = result.count;
        } else if (formType === 'card') {
          const result = await tx.delete(cardResponses).where(eq(cardResponses.task_id, taskId));
          deletedCount = result.count;
        }
        
        // 3. Clear the savedFormData field if specified
        // CRITICAL: This prevents the form from being rehydrated from cache
        if (opts.clearSavedFormData) {
          await tx.update(tasks)
            .set({ savedFormData: null })
            .where(eq(tasks.id, taskId));
          
          serviceLogger.info(`Cleared savedFormData for task ${taskId}`);
        }
        
        // 4. Update progress if not preserving
        if (!preserveProgress) {
          await tx.update(tasks)
            .set({ progress: 0 })
            .where(eq(tasks.id, taskId));
          
          serviceLogger.info(`Reset progress for task ${taskId} to 0%`);
        }
        
        // 5. Record operation metadata for tracking
        // In the future, this could be stored in a dedicated operations table
        const operationMetadata = {
          operationId: `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          taskId,
          formType,
          operation: 'clear_fields',
          preserveProgress,
          deletedCount,
          timestamp: new Date().toISOString()
        };
        
        // 6. Send a bulk WebSocket notification if not skipping broadcasts
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
              await broadcastTaskUpdate(taskId, task.status, preserveProgress ? task.progress : 0, {
                operation: 'fields_cleared',
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
        serviceLogger.error(`Error clearing fields for task ${taskId}:`, error);
        // End the operation on error
        WebSocketContext.endOperation();
        throw error;
      }
    });
  });
};