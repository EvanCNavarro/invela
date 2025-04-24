/**
 * Universal Clear Fields Service
 * 
 * This service provides a centralized way to clear all form fields for any task type.
 * It handles KYB, KY3P, and Open Banking forms consistently.
 */

import { db } from "@db";
import { kybResponses, ky3pResponses, openBankingResponses, tasks } from "@db/schema";
import { eq } from "drizzle-orm";
const logger = {
  info: (message: string) => console.log(message),
  error: (message: string) => console.error(message)
};

/**
 * Universal Clear Fields Service
 * 
 * Provides uniform field clearing functionality across all form types
 */
export class UniversalClearFieldsService {
  /**
   * Clear all field values for a task
   * 
   * @param taskId The ID of the task to clear fields for
   * @param taskType The type of the task (e.g., 'kyb', 'ky3p', 'open_banking')
   * @returns Object with success status and count of cleared fields
   */
  async clearAllFields(taskId: number, taskType: string): Promise<{ 
    success: boolean;
    clearedCount: number;
    message: string;
  }> {
    try {
      logger.info(`[UniversalClearFieldsService] Clearing all fields for task ID ${taskId} (type: ${taskType})`);
      
      let clearedCount = 0;
      
      // Clear fields based on task type
      if (taskType === 'company_kyb' || taskType === 'kyb') {
        // Delete all KYB responses for this task
        const result = await db.delete(kybResponses)
          .where(eq(kybResponses.task_id, taskId))
          .returning();
        
        clearedCount = result.length;
        logger.info(`[UniversalClearFieldsService] Cleared ${clearedCount} KYB responses for task ${taskId}`);
      } 
      else if (taskType === 'ky3p' || taskType === 'security_assessment') {
        // Delete all KY3P responses for this task
        const result = await db.delete(ky3pResponses)
          .where(eq(ky3pResponses.task_id, taskId))
          .returning();
        
        clearedCount = result.length;
        logger.info(`[UniversalClearFieldsService] Cleared ${clearedCount} KY3P responses for task ${taskId}`);
      } 
      else if (taskType === 'open_banking' || taskType === 'open_banking_survey') {
        // Delete all Open Banking responses for this task
        const result = await db.delete(openBankingResponses)
          .where(eq(openBankingResponses.task_id, taskId))
          .returning();
        
        clearedCount = result.length;
        logger.info(`[UniversalClearFieldsService] Cleared ${clearedCount} Open Banking responses for task ${taskId}`);
      } 
      else {
        throw new Error(`Unsupported task type: ${taskType}`);
      }
      
      return {
        success: true,
        clearedCount,
        message: `Successfully cleared ${clearedCount} fields for task ${taskId} (${taskType})`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[UniversalClearFieldsService] Error clearing fields for task ${taskId} (${taskType}): ${errorMessage}`);
      
      return {
        success: false,
        clearedCount: 0,
        message: `Error clearing fields: ${errorMessage}`,
      };
    }
  }
  
  /**
   * Reset task progress after clearing fields
   * 
   * @param taskId The ID of the task to reset progress for
   * @returns Object with success status
   */
  async resetTaskProgress(taskId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      logger.info(`[UniversalClearFieldsService] Resetting progress for task ID ${taskId}`);
      
      // Update the task progress to 0 and status to "not_started"
      await db.execute(
        `UPDATE tasks 
        SET progress = 0, status = 'not_started', 
            updated_at = NOW(), 
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb), 
              '{lastProgressReconciliation}', 
              to_jsonb(NOW())
            )
        WHERE id = $1`,
        [taskId]
      );
      
      return {
        success: true,
        message: `Successfully reset progress for task ${taskId}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[UniversalClearFieldsService] Error resetting progress for task ${taskId}: ${errorMessage}`);
      
      return {
        success: false,
        message: `Error resetting progress: ${errorMessage}`,
      };
    }
  }
}

export default new UniversalClearFieldsService();