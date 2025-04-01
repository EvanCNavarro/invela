const { updateTaskTitles } = require('./dist/db/migrations/update_task_titles');

async function runTest() {
  try {
    console.log('Running task title update migration...');
    const result = await updateTaskTitles();
    console.log('Migration completed successfully:', result);
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runTest();