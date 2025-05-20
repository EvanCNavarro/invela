/**
 * Fix for KY3P Task 739 Progress
 * 
 * This script manually updates the progress for KY3P task 739 to ensure
 * it correctly shows 3% instead of 0% after applying the unified progress fixes.
 * 
 * It uses our updated unified task progress calculator to ensure consistency.
 */

const { db } = require('./db');
const { sql } = require('drizzle-orm');
const { tasks } = require('./db/schema');
const { getProgressSqlValue } = require('./server/utils/progress-validator');
const { updateTaskProgressAndBroadcast } = require('./server/utils/unified-task-progress');

async function fixTask739Progress() {
  console.log('Starting fix for KY3P task 739 progress...');
  
  try {
    // Force update the progress using our unified system
    const result = await updateTaskProgressAndBroadcast(739, 'ky3p', {
      debug: true,
      forceUpdate: true
    });
    
    console.log('Update result:', result);
    
    if (result.success) {
      console.log(`\n✓ Successfully updated task 739 progress to ${result.progress}%!\n`);
    } else {
      console.log(`\n✗ Failed to update task 739 progress: ${result.message}\n`);
      
      // If the unified update fails, try a direct database update as fallback
      console.log('Attempting direct database update as fallback...');
      
      const [updated] = await db
        .update(tasks)
        .set({
          progress: getProgressSqlValue(3), // Force to 3%
          status: sql`'in_progress'::text`,
          updated_at: new Date(),
          metadata: sql`jsonb_set(
            COALESCE(metadata, '{}'::jsonb), 
            '{lastProgressUpdate}', 
            to_jsonb(now()::text)
          )`
        })
        .where(sql`id = 739`)
        .returning();
      
      if (updated) {
        console.log(`\n✓ Successfully updated task 739 progress with direct database update!\n`);
        console.log('Updated task:', updated);
      } else {
        console.log(`\n✗ Failed to update task 739 with direct database update.\n`);
      }
    }
  } catch (error) {
    console.error('Error fixing task progress:', error);
  }
}

fixTask739Progress();
