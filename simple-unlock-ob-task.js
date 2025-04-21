/**
 * Simple script to unlock Open Banking tasks using direct database access
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq, and, or } from 'drizzle-orm';

async function run() {
  try {
    console.log('Starting Open Banking task unlock');
    
    // Find all Open Banking tasks
    const openBankingTasks = await db.execute(
      `SELECT * FROM tasks WHERE task_type = 'open_banking_survey'`
    );
    
    console.log(`Found ${openBankingTasks.length} Open Banking tasks`);
    console.log(openBankingTasks);
    
    // Update all Open Banking tasks to unlock them
    const result = await db.execute(
      `UPDATE tasks 
       SET status = 'not_started',
           metadata = jsonb_set(
             jsonb_set(
               jsonb_set(
                 COALESCE(metadata, '{}'::jsonb),
                 '{locked}', 
                 'false'
               ),
               '{prerequisite_completed}',
               'true'
             ),
             '{unlocked_by}',
             '"manual_unlock"'
           ),
           updated_at = NOW()
       WHERE task_type = 'open_banking_survey'
       RETURNING id, title, status, metadata`
    );
    
    console.log('Update result:', result);
    console.log('Tasks unlocked successfully!');
  } catch (error) {
    console.error('Error:', error);
  }
}

run()
  .then(() => console.log('Script completed!'))
  .catch(error => console.error('Script failed:', error));
