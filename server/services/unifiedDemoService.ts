/**
 * Unified Demo Service
 * 
 * This service handles demo auto-fill and progress calculation in a single
 * atomic transaction to ensure data consistency and prevent race conditions.
 * 
 * It replaces the current approach where demo auto-fill and progress updates are
 * separate operations, which can lead to inconsistent state and UI flashing.
 */

import { db } from '@db';
import { tasks, ky3pResponses, openBankingResponses, kybResponses } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { broadcast } from '../utils/unified-websocket';
import { getKy3pDemoData } from '../services/ky3pDemoData';
import { getOpenBankingDemoData } from '../services/openBankingDemoData';
import { getKybDemoData } from '../services/kybDemoData';
import { determineStatusFromProgress } from '../utils/progress';

/**
 * Apply demo data to a form and update progress in a single transaction
 * 
 * This method ensures that form data population and progress updates happen
 * atomically, preventing race conditions and inconsistent UI state.
 * 
 * @param taskId - The task ID
 * @param formType - The form type (ky3p, open_banking, company_kyb)
 * @param userId - Optional user ID for tracking purposes
 * @returns Result object with success status and details
 */
export async function applyDemoDataTransactional(
  taskId: number,
  formType: string,
  userId?: number
): Promise<{
  success: boolean;
  message: string;
  fieldCount: number;
  progress: number;
  status: string;
}> {
  logger.info('[UnifiedDemoService] Starting transactional demo data application', {
    taskId,
    formType,
    userId
  });
  
  try {
    // 1. Get the current task to verify it exists and get metadata
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId));
      
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // 2. Normalize form type (handle aliases like security_assessment → ky3p)
    const normalizedFormType = normalizeFormType(formType || task.task_type);
    
    // 3. Get demo data for the appropriate form type
    const demoData = await getDemoData(normalizedFormType, taskId);
    
    if (!demoData || !demoData.fields || demoData.fields.length === 0) {
      throw new Error(`No demo data available for ${normalizedFormType} form type`);
    }
    
    // 4. Perform all database operations in a transaction
    return await db.transaction(async (tx) => {
      let insertCount = 0;
      
      // Apply demo data based on form type
      if (normalizedFormType === 'ky3p') {
        // Clear existing responses first
        await tx
          .delete(ky3pResponses)
          .where(eq(ky3pResponses.task_id, taskId));
        
        // Insert new responses
        const insertOperations = demoData.fields.map(field => {
          return tx
            .insert(ky3pResponses)
            .values({
              task_id: taskId,
              field_id: field.id,
              value: String(field.value || ''),
              status: 'COMPLETE',
              timestamp: new Date().toISOString()
            });
        });
        
        await Promise.all(insertOperations);
        insertCount = demoData.fields.length;
      } 
      else if (normalizedFormType === 'open_banking') {
        // Clear existing responses first
        await tx
          .delete(openBankingResponses)
          .where(eq(openBankingResponses.task_id, taskId));
        
        // Insert new responses
        const insertOperations = demoData.fields.map(field => {
          return tx
            .insert(openBankingResponses)
            .values({
              task_id: taskId,
              field_id: field.id,
              value: String(field.value || ''),
              status: 'COMPLETE',
              timestamp: new Date().toISOString()
            });
        });
        
        await Promise.all(insertOperations);
        insertCount = demoData.fields.length;
      }
      else if (normalizedFormType === 'company_kyb') {
        // Clear existing responses first
        await tx
          .delete(kybResponses)
          .where(eq(kybResponses.task_id, taskId));
        
        // Insert new responses
        const insertOperations = demoData.fields.map(field => {
          return tx
            .insert(kybResponses)
            .values({
              task_id: taskId,
              field_id: field.id,
              value: String(field.value || ''),
              status: 'COMPLETE',
              timestamp: new Date().toISOString()
            });
        });
        
        await Promise.all(insertOperations);
        insertCount = demoData.fields.length;
      }
      
      // Calculate progress (always 100% for demo auto-fill)
      const progress = 100;
      const status = determineStatusFromProgress(progress, false);
      
      // Update task progress and status in the same transaction
      await tx
        .update(tasks)
        .set({
          progress,
          status,
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
      
      // Broadcast update via WebSocket (still in the transaction boundary)
      broadcast('task_update', {
        taskId,
        progress,
        status,
        timestamp: new Date().toISOString(),
        source: 'demo_autofill_tx'
      });
      
      logger.info('[UnifiedDemoService] Successfully applied demo data and updated progress', {
        taskId,
        formType: normalizedFormType,
        fieldCount: insertCount,
        progress,
        status
      });
      
      // Return result
      return {
        success: true,
        message: 'Demo data applied successfully with progress update',
        fieldCount: insertCount,
        progress,
        status
      };
    });
  } catch (error) {
    logger.error('[UnifiedDemoService] Error applying demo data', {
      taskId,
      formType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    throw error;
  }
}

/**
 * Get appropriate demo data for the form type
 * 
 * @param formType Normalized form type
 * @param taskId Task ID
 * @returns Promise with demo data
 */
async function getDemoData(formType: string, taskId: number) {
  switch (formType) {
    case 'ky3p':
      return getKy3pDemoData();
    case 'open_banking':
      return getOpenBankingDemoData();
    case 'company_kyb':
      return getKybDemoData();
    default:
      throw new Error(`Unsupported form type: ${formType}`);
  }
}

/**
 * Normalize form type to handle aliases
 * 
 * @param formType Form type to normalize
 * @returns Normalized form type
 */
function normalizeFormType(formType: string): string {
  formType = formType.toLowerCase();
  
  // Map security assessment forms to ky3p
  if (formType === 'security_assessment' || formType === 'security' || formType === 'sp_ky3p_assessment') {
    return 'ky3p';
  }
  
  // Handle other form types
  if (formType === 'kyb') {
    return 'company_kyb';
  }
  
  return formType;
}
