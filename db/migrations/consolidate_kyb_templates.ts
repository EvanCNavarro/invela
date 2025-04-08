import { db } from "@db";
import { tasks } from "@db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Consolidate KYB tasks to use a consistent task_type
 */
export async function up() {
  console.log('[Migration] Starting KYB task type consolidation...');
  
  try {
    // 1. Check for tasks with old task_type
    const oldTasksCount = await db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(eq(tasks.task_type, 'company_onboarding_KYB'));
    
    const tasksToUpdate = oldTasksCount[0]?.count || 0;
    console.log(`[Migration] Found ${tasksToUpdate} tasks with old 'company_onboarding_KYB' task type`);
    
    if (tasksToUpdate > 0) {
      // 2. Update all existing tasks to use the new task_type
      await db.update(tasks)
        .set({
          task_type: 'company_kyb',
          updated_at: new Date()
        })
        .where(eq(tasks.task_type, 'company_onboarding_KYB'));
      
      console.log(`[Migration] Updated ${tasksToUpdate} tasks from 'company_onboarding_KYB' to 'company_kyb'`);
    } else {
      console.log('[Migration] No tasks found with old task_type, skipping update');
    }
    
    console.log('[Migration] KYB task type consolidation completed successfully');
  } catch (error) {
    console.error('[Migration] Error during KYB task type consolidation:', error);
    throw error;
  }
}

/**
 * Revert changes (not fully implemented as this would be complex to revert)
 */
export async function down() {
  console.log('[Migration] This migration cannot be fully reverted automatically');
  // Would need to recreate the original template and restore task types
}