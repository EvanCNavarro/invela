/**
 * Unified Demo Service
 * 
 * Provides a consistent interface for auto-filling form data across all form types.
 * This service ensures all form types are handled consistently with correct status
 * strings and proper progress calculation and persistence.
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { kybResponses, ky3pResponses, openBankingResponses } from '@db/schema';
import { logger } from '../utils/logger';
import { broadcast } from '../utils/unified-websocket';

// Import all demo data generators with consistent naming
import { getKy3pDemoData } from '../services/ky3pDemoData';
import { getOpenBankingDemoData } from '../services/openBankingDemoData';
import { getKybDemoData } from '../services/kybDemoData';

// Common types for progress calculations
type TaskStatus = 'not_started' | 'in_progress' | 'ready_for_submission' | 'submitted' | 'pending';
type TaskType = 'kyb' | 'ky3p' | 'open_banking';

// Result types for the service operations
type DemoDataResult = {
  fields: Array<{ id: number; value: string; status: string }>;
  metadata: Record<string, any>;
};

type ApplyDemoDataResult = {
  taskId: number;
  taskType: TaskType;
  recordsUpdated: number;
  progress: number;
};

type ClearResponsesResult = {
  taskId: number;
  taskType: TaskType;
  recordsDeleted: number;
  progress: number;
};

/**
 * Unified Demo Service for handling demo data consistently across all form types
 */
export class UnifiedDemoService {
  /**
   * Get demo data for a specific task type without applying it
   * 
   * @param taskType The type of task (kyb, ky3p, open_banking)
   * @returns Demo data object with fields and metadata
   */
  async getDemoDataForTaskType(taskType: TaskType): Promise<DemoDataResult> {
    try {
      switch (taskType) {
        case 'kyb':
          return await getKybDemoData();
        case 'ky3p':
          return await getKy3pDemoData();
        case 'open_banking':
          return await getOpenBankingDemoData();
        default:
          throw new Error(`Unsupported task type: ${taskType}`);
      }
    } catch (error) {
      logger.error(`[UnifiedDemoService] Error getting demo data for ${taskType}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Apply demo data to a specific task
   * 
   * @param taskId The ID of the task
   * @returns Result object with details of the operation
   */
  async applyDemoDataToTask(taskId: number): Promise<ApplyDemoDataResult> {
    try {
      // Get task information first
      const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      
      if (!task) {
        throw new Error(`Task with ID ${taskId} not found`);
      }
      
      // Normalize task type
      const taskType = this.normalizeTaskType(task.task_type);
      
      // Get the appropriate demo data
      const demoData = await this.getDemoDataForTaskType(taskType);
      
      // Apply demo data to the task
      let recordsUpdated = 0;
      
      // Start a database transaction to ensure atomic operations
      await db.transaction(async (tx) => {
        // First, clear existing responses to avoid duplicates
        await this.clearResponsesInTransaction(tx, taskId, taskType, false);
        
        // Now apply the demo data using the appropriate table
        const responseTable = this.getResponseTableForTaskType(taskType);
        switch (taskType) {
          case 'kyb': {
            const insertData = demoData.fields.map(field => ({
              task_id: taskId, 
              field_id: field.id,
              status: field.status,
              response_value: field.value,
              created_at: new Date(),
              updated_at: new Date()
            }));
            
            await tx.insert(responseTable).values(insertData);
            recordsUpdated = insertData.length;
            break;
          }
          case 'ky3p': {
            const insertData = demoData.fields.map(field => ({
              task_id: taskId, 
              field_id: field.id,
              status: field.status,
              value: field.value,
              created_at: new Date(),
              updated_at: new Date()
            }));
            
            await tx.insert(responseTable).values(insertData);
            recordsUpdated = insertData.length;
            break;
          }
          case 'open_banking': {
            const insertData = demoData.fields.map(field => ({
              task_id: taskId, 
              field_id: field.id,
              status: field.status,
              value: field.value,
              created_at: new Date(),
              updated_at: new Date()
            }));
            
            await tx.insert(responseTable).values(insertData);
            recordsUpdated = insertData.length;
            break;
          }
        }
        
        // Calculate and update progress
        const progress = 100; // Demo data always sets 100% progress, all fields are COMPLETE
        
        // Update task progress and status
        await tx.update(tasks)
          .set({
            progress, 
            status: 'ready_for_submission' as TaskStatus, // When 100% but not submitted
            updated_at: new Date()
          })
          .where(eq(tasks.id, taskId));
        
        logger.info(`[UnifiedDemoService] Updated task progress to ${progress}% and status to ready_for_submission`);
      });
      
      // After transaction completes successfully, broadcast the update via WebSocket
      broadcast('task_update', {
        taskId,
        status: 'ready_for_submission',
        progress: 100
      });
      
      logger.info(`[UnifiedDemoService] Applied demo data to ${taskType} task ${taskId}, updated ${recordsUpdated} fields`);
      
      return {
        taskId,
        taskType,
        recordsUpdated,
        progress: 100
      };
    } catch (error) {
      logger.error(`[UnifiedDemoService] Error applying demo data to task ${taskId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Clear all responses for a specific task
   * 
   * @param taskId The ID of the task
   * @param resetProgress Whether to reset progress to 0 (default: true)
   * @returns Result object with details of the operation
   */
  async clearTaskResponses(taskId: number, resetProgress = true): Promise<ClearResponsesResult> {
    try {
      // Get task information first
      const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
      
      if (!task) {
        throw new Error(`Task with ID ${taskId} not found`);
      }
      
      // Normalize task type
      const taskType = this.normalizeTaskType(task.task_type);
      
      let recordsDeleted = 0;
      
      // Use a transaction to ensure atomic operations
      await db.transaction(async (tx) => {
        // Clear the responses
        recordsDeleted = await this.clearResponsesInTransaction(tx, taskId, taskType, resetProgress);
        
        // Update task progress and status if requested
        if (resetProgress) {
          await tx.update(tasks)
            .set({
              progress: 0,
              status: 'not_started' as TaskStatus,
              updated_at: new Date()
            })
            .where(eq(tasks.id, taskId));
          
          logger.info(`[UnifiedDemoService] Reset task progress to 0% and status to not_started`);
        }
      });
      
      // After transaction completes successfully, broadcast the update via WebSocket
      broadcast('task_update', {
        taskId,
        status: resetProgress ? 'not_started' : task.status,
        progress: resetProgress ? 0 : task.progress
      });
      
      logger.info(`[UnifiedDemoService] Cleared ${recordsDeleted} responses for ${taskType} task ${taskId}`);
      
      return {
        taskId,
        taskType,
        recordsDeleted,
        progress: resetProgress ? 0 : (task.progress || 0)
      };
    } catch (error) {
      logger.error(`[UnifiedDemoService] Error clearing responses for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Helper method to clear responses within a transaction
   * 
   * @param tx Database transaction object
   * @param taskId The ID of the task
   * @param taskType The normalized task type
   * @param resetProgress Whether this is a progress reset operation
   * @returns Number of records deleted
   */
  private async clearResponsesInTransaction(tx: any, taskId: number, taskType: TaskType, resetProgress: boolean): Promise<number> {
    const responseTable = this.getResponseTableForTaskType(taskType);
    const result = await tx.delete(responseTable).where(eq(responseTable.task_id, taskId)).returning();
    
    logger.info(`[UnifiedDemoService] Deleted ${result.length} ${taskType} responses for task ${taskId} (resetProgress=${resetProgress})`);
    
    return result.length;
  }
  
  /**
   * Helper to normalize task type strings
   */
  private normalizeTaskType(taskType: string): TaskType {
    switch (taskType) {
      case 'company_kyb':
        return 'kyb';
      case 'ky3p':
      case 'security_assessment':
        return 'ky3p';
      case 'open_banking':
        return 'open_banking';
      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
  }
  
  /**
   * Helper to get the appropriate response table for a task type
   */
  private getResponseTableForTaskType(taskType: TaskType): any {
    switch (taskType) {
      case 'kyb':
        return kybResponses;
      case 'ky3p':
        return ky3pResponses;
      case 'open_banking':
        return openBankingResponses;
      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
  }
}
