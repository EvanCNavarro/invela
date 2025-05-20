/**
 * KY3P Progress Column Constraint Investigation
 * 
 * This script investigates potential database schema issues that could be
 * preventing proper progress updates for KY3P tasks.
 * 
 * It performs the following checks:
 * 1. Examine the column type and constraints for the 'progress' field
 * 2. Check for any database triggers that might be affecting updates
 * 3. Performs a test update with explicit type casting
 * 4. Logs detailed error information to diagnose the issue
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq, sql } from 'drizzle-orm';

// Target task with the progress update issue
const TARGET_TASK_ID = 694;

/**
 * Check and log column information
 */
async function checkColumnInfo() {
  console.log(`[Schema Check] Checking column information for 'progress' field`);
  
  try {
    // Use SQL to get column information
    const columnInfo = await db.execute(sql`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable,
        column_default
      FROM 
        information_schema.columns 
      WHERE 
        table_name = 'tasks' AND 
        column_name = 'progress'
    `);
    
    console.log(`[Schema Check] Column information for 'progress':`, columnInfo.rows[0]);
    
    // Check for any constraints
    const constraintInfo = await db.execute(sql`
      SELECT 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name
      FROM 
        information_schema.table_constraints tc
      JOIN 
        information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE 
        tc.table_name = 'tasks' AND 
        kcu.column_name = 'progress'
    `);
    
    console.log(`[Schema Check] Constraints for 'progress':`, constraintInfo.rows);
    
    // Check for any triggers
    const triggerInfo = await db.execute(sql`
      SELECT 
        trigger_name, 
        event_manipulation, 
        action_statement
      FROM 
        information_schema.triggers
      WHERE 
        event_object_table = 'tasks'
    `);
    
    console.log(`[Schema Check] Triggers affecting 'tasks' table:`, triggerInfo.rows);
    
    return {
      columnInfo: columnInfo.rows[0],
      constraintInfo: constraintInfo.rows,
      triggerInfo: triggerInfo.rows
    };
  } catch (error) {
    console.error(`[Schema Check] Error getting column information:`, error);
    return null;
  }
}

/**
 * Test progress update with explicit type casting
 */
async function testProgressUpdate() {
  console.log(`[Schema Check] Testing progress update with explicit type casting`);
  
  try {
    // Get current task info
    const [currentTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, TARGET_TASK_ID));
    
    console.log(`[Schema Check] Current task progress:`, {
      id: currentTask.id,
      progress: currentTask.progress,
      progressType: typeof currentTask.progress
    });
    
    // Test update with explicit casting to ensure proper type
    // Using SQL with CAST to ensure type compatibility
    const updateResult = await db.execute(sql`
      UPDATE tasks
      SET 
        progress = CAST(100 AS INTEGER),
        updated_at = NOW()
      WHERE id = ${TARGET_TASK_ID}
      RETURNING id, progress, status, updated_at
    `);
    
    console.log(`[Schema Check] Update result with explicit casting:`, updateResult.rows[0]);
    
    // Verify update
    const [updatedTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, TARGET_TASK_ID));
    
    console.log(`[Schema Check] Task after explicit cast update:`, {
      id: updatedTask.id,
      progress: updatedTask.progress,
      progressType: typeof updatedTask.progress,
      status: updatedTask.status,
      updated_at: updatedTask.updated_at
    });
    
    // Check if the progress field is storing the value correctly
    const isStored = updatedTask.progress === 100;
    console.log(`[Schema Check] Progress value stored correctly:`, isStored);
    
    return {
      success: isStored,
      before: currentTask.progress,
      after: updatedTask.progress
    };
  } catch (error) {
    console.error(`[Schema Check] Error in test update:`, error);
    return { success: false, error };
  }
}

/**
 * Main function to check and fix constraints
 */
async function checkAndFix() {
  console.log(`[Schema Check] Starting schema investigation for tasks.progress field`);
  
  try {
    // Step 1: Check column info
    const schemaInfo = await checkColumnInfo();
    
    if (!schemaInfo) {
      console.error(`[Schema Check] Failed to get schema information`);
      return false;
    }
    
    // Step 2: Test update with explicit casting
    const updateResult = await testProgressUpdate();
    
    console.log(`[Schema Check] Investigation complete`, {
      updateSuccess: updateResult.success,
      progressBefore: updateResult.before,
      progressAfter: updateResult.after
    });
    
    return updateResult.success;
  } catch (error) {
    console.error(`[Schema Check] Error in schema investigation:`, error);
    return false;
  }
}

// Run the check and fix
checkAndFix().then(success => {
  console.log(`[Schema Check] Script execution ${success ? 'successful' : 'failed'}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('[Schema Check] Script execution failed with error:', error);
  process.exit(1);
});
