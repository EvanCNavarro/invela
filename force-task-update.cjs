/**
 * Force update task status and progress
 * 
 * This script directly updates the task status and progress in the database
 * and broadcasts the update to all connected clients.
 */
const { db } = require('./db');
const { eq } = require('drizzle-orm');
const { tasks } = require('./db/schema');

async function updateTask() {
  try {
    // First, verify current task state
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, 694)
    });

    console.log('Current task state:', task);

    // Update task status and progress
    const updateResult = await db
      .update(tasks)
      .set({
        status: 'not_started',
        progress: 0
      })
      .where(eq(tasks.id, 694))
      .returning();

    console.log('Update result:', updateResult);

    // Verify the update
    const updatedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, 694)
    });

    console.log('Updated task state:', updatedTask);

    // Insert a broadcast message to queue
    await db.execute(
      `INSERT INTO broadcast_queue (type, payload) VALUES ('task_update', $1)`,
      { payload: JSON.stringify({ taskId: 694, status: 'not_started', progress: 0 }) }
    );

    console.log('Broadcast message queued');
  } catch (error) {
    console.error('Error updating task:', error);
  }
}

updateTask().catch(console.error);
