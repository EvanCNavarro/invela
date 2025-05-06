/**
 * Form Submission Rollback Manager
 * 
 * This utility manages rolling back form submissions that fail,
 * providing a consistent way to handle failed submissions
 * and recover from transient errors.
 */

import getLogger from './logger';
import submissionTracker from './submission-tracker';
import { notify } from '@/providers/notification-provider';

const logger = getLogger('RollbackManager');

type RollbackOperation = {
  id: string;
  timestamp: string;
  type: 'database' | 'file' | 'tab' | 'state' | 'other';
  taskId: number;
  description: string;
  rollbackFn: () => Promise<boolean>;
  metadata?: Record<string, any>;
  priority: number; // Higher number = higher priority
};

class RollbackManager {
  private pendingOperations: Map<string, RollbackOperation> = new Map();
  private inProgress: boolean = false;
  private maxRetries: number = 3;
  
  /**
   * Register a new rollback operation for a task
   */
  registerRollback({
    taskId,
    type,
    description,
    rollbackFn,
    metadata = {},
    priority = 1
  }: {
    taskId: number;
    type: 'database' | 'file' | 'tab' | 'state' | 'other';
    description: string;
    rollbackFn: () => Promise<boolean>;
    metadata?: Record<string, any>;
    priority?: number;
  }): string {
    // Generate a unique ID
    const id = `rollback-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create the operation
    const operation: RollbackOperation = {
      id,
      timestamp: new Date().toISOString(),
      type,
      taskId,
      description,
      rollbackFn,
      metadata,
      priority
    };
    
    // Add to pending operations
    this.pendingOperations.set(id, operation);
    
    logger.info(`Registered rollback operation: ${description}`, {
      taskId,
      type,
      id,
      priority
    });
    
    return id;
  }
  
  /**
   * Remove a pending rollback operation
   */
  cancelRollback(id: string): boolean {
    if (!this.pendingOperations.has(id)) {
      return false;
    }
    
    // Get the operation for logging
    const operation = this.pendingOperations.get(id);
    
    // Delete the operation
    this.pendingOperations.delete(id);
    
    logger.info(`Cancelled rollback operation: ${operation?.description}`, {
      taskId: operation?.taskId,
      type: operation?.type,
      id
    });
    
    return true;
  }
  
  /**
   * Cancel all pending rollback operations for a task
   */
  cancelAllForTask(taskId: number): number {
    // Find all operations for this task
    const operations = Array.from(this.pendingOperations.values())
      .filter(op => op.taskId === taskId);
    
    // Cancel each operation
    for (const op of operations) {
      this.cancelRollback(op.id);
    }
    
    logger.info(`Cancelled ${operations.length} rollback operations for task ${taskId}`);
    
    return operations.length;
  }
  
  /**
   * Execute all pending rollback operations for a task
   */
  async executeRollbackForTask(taskId: number): Promise<boolean> {
    if (this.inProgress) {
      logger.warn(`Rollback already in progress, cannot start another for task ${taskId}`);
      return false;
    }
    
    // Track as being in progress
    this.inProgress = true;
    
    try {
      // Find all operations for this task
      const operations = Array.from(this.pendingOperations.values())
        .filter(op => op.taskId === taskId)
        // Sort by priority (highest first)
        .sort((a, b) => b.priority - a.priority);
      
      // If no operations found, return early
      if (operations.length === 0) {
        logger.info(`No rollback operations found for task ${taskId}`);
        return true;
      }
      
      logger.info(`Executing ${operations.length} rollback operations for task ${taskId}`);
      
      // Track submission for diagnostics
      submissionTracker.startTracking(taskId, 'rollback');
      submissionTracker.trackEvent(`Starting rollback with ${operations.length} operations`, {
        operations: operations.map(op => ({ id: op.id, type: op.type, description: op.description }))
      });
      
      // Track success state
      let allSucceeded = true;
      const failedOperations: RollbackOperation[] = [];
      
      // Execute each operation in order of priority
      for (const operation of operations) {
        // Try the operation with retries
        let success = false;
        let error = null;
        
        for (let attempt = 1; attempt <= this.maxRetries && !success; attempt++) {
          try {
            submissionTracker.trackEvent(
              `Executing rollback: ${operation.description}`,
              { attempt, of: this.maxRetries }
            );
            
            // Execute the operation
            success = await operation.rollbackFn();
            
            // If successful, log and break
            if (success) {
              logger.info(`Rollback operation succeeded: ${operation.description}`, {
                taskId,
                type: operation.type,
                id: operation.id,
                attempt
              });
              
              submissionTracker.trackEvent(
                `Rollback succeeded: ${operation.description}`,
                { attempt }
              );
              
              // Remove the operation since it's completed
              this.pendingOperations.delete(operation.id);
              break;
            } else {
              // Log the failure but keep trying
              logger.warn(`Rollback operation failed (attempt ${attempt}): ${operation.description}`);
              
              submissionTracker.trackEvent(
                `Rollback attempt failed: ${operation.description}`,
                { attempt },
                true
              );
            }
          } catch (err) {
            error = err;
            logger.error(
              `Error executing rollback (attempt ${attempt}): ${operation.description}`,
              err
            );
            
            submissionTracker.trackEvent(
              `Rollback error: ${operation.description}`,
              {
                attempt,
                error: err instanceof Error ? err.message : String(err)
              },
              true
            );
          }
          
          // If this wasn't the last attempt, wait before retrying
          if (attempt < this.maxRetries && !success) {
            // Exponential backoff
            const delay = Math.pow(2, attempt - 1) * 500;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        // If the operation failed after all retries, track it
        if (!success) {
          allSucceeded = false;
          failedOperations.push(operation);
          
          // Keep the operation in the list for potential manual retry
        }
      }
      
      // Final result logging
      if (allSucceeded) {
        logger.info(`All rollback operations for task ${taskId} completed successfully`);
        submissionTracker.trackEvent('Rollback completed successfully');
        notify.success('Rollback Completed', 'All changes were successfully rolled back');
      } else {
        const message = `${failedOperations.length} of ${operations.length} rollback operations failed`;
        logger.error(message, {
          taskId,
          failedOperations: failedOperations.map(op => ({
            id: op.id,
            type: op.type,
            description: op.description
          }))
        });
        
        submissionTracker.trackEvent(
          'Rollback partially failed',
          {
            failed: failedOperations.length,
            total: operations.length,
            operations: failedOperations.map(op => op.description)
          },
          true
        );
        
        notify.error(
          'Rollback Incomplete',
          `Some changes could not be rolled back. Please contact support.`
        );
      }
      
      // Always stop tracking
      submissionTracker.stopTracking(allSucceeded ? 0 : 1);
      
      return allSucceeded;
    } finally {
      // Always clear the in-progress flag
      this.inProgress = false;
    }
  }
  
  /**
   * Check if there are pending rollback operations for a task
   */
  hasPendingRollbacks(taskId: number): boolean {
    return Array.from(this.pendingOperations.values())
      .some(op => op.taskId === taskId);
  }
  
  /**
   * Get count of pending rollback operations for a task
   */
  getPendingRollbackCount(taskId: number): number {
    return Array.from(this.pendingOperations.values())
      .filter(op => op.taskId === taskId)
      .length;
  }
  
  /**
   * Get all pending rollback operations for a task
   */
  getPendingRollbacks(taskId: number): RollbackOperation[] {
    return Array.from(this.pendingOperations.values())
      .filter(op => op.taskId === taskId)
      .sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Check if rollback is currently in progress
   */
  isRollbackInProgress(): boolean {
    return this.inProgress;
  }
}

// Create a singleton instance
const rollbackManager = new RollbackManager();

// Export the singleton
export default rollbackManager;
