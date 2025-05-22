/**
 * Direct SQL-based unlock script for task ID 614
 * 
 * This script uses the executeSQL tool to directly unlock task 614
 * without dependencies on other modules
 */

const { execute_sql_tool } = require('@lib/execute-sql');

// SQL query to unlock task 614
const unlockQuery = `
UPDATE tasks 
SET status = 'not_started',
    metadata = jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{locked}', 'false'
        ),
        '{prerequisite_completed}', 'true'
      ),
      '{prerequisite_completed_at}', to_jsonb(now())
    ),
    updated_at = NOW()
WHERE id = 614
RETURNING id, title, task_type, status, metadata;
`;

async function unlockTask() {
  try {
    console.log('Executing SQL to unlock task 614...');
    
    const result = await execute_sql_tool({
      sql_query: unlockQuery
    });
    
    console.log('SQL query executed successfully:');
    console.log(JSON.stringify(result, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error executing SQL:', error);
    return false;
  }
}

// Execute the script
(async () => {
  try {
    const success = await unlockTask();
    
    if (success) {
      console.log('Task 614 successfully unlocked via SQL!');
    } else {
      console.error('Failed to unlock task 614');
    }
  } catch (error) {
    console.error('Unhandled error:', error);
  }
})();