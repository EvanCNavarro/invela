/**
 * Reconcile task 694 to ensure UI shows correct progress
 */
const { db } = require('./db');
const { eq } = require('drizzle-orm');
const { tasks } = require('./db/schema');
const { reconcileTaskProgress } = require('./server/utils/task-reconciliation');

async function runReconciliation() {
  try {
    console.log('Starting task reconciliation for task 694');
    
    // First check the current state
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, 694)
    });
    
    console.log('Current task state:', task);
    
    // Run reconciliation
    const result = await reconcileTaskProgress(694);
    
    console.log('Reconciliation result:', result);
    
    // Verify the updated state
    const updatedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, 694)
    });
    
    console.log('Updated task state:', updatedTask);
    
  } catch (error) {
    console.error('Error reconciling task:', error);
  }
}

runReconciliation().catch(console.error);
