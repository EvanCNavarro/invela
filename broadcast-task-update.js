/**
 * Broadcast a task update via WebSocket to notify clients
 * 
 * This script sends a WebSocket broadcast to inform clients that
 * the task status has changed, so they can update their UI accordingly
 */
import { db } from './db/index.js';
import { eq } from 'drizzle-orm';
import { tasks } from './db/schema.js';
import { broadcastTaskUpdate } from './server/utils/websocketBroadcast.js';

async function run() {
  try {
    // Get task from database
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, 694)
    });

    if (!task) {
      console.error('Task not found');
      return;
    }

    console.log('Broadcasting update for task:', task);

    // Broadcast the update
    await broadcastTaskUpdate({
      taskId: task.id,
      status: task.status,
      progress: task.progress || 0
    });

    console.log('Broadcast complete');
  } catch (error) {
    console.error('Error broadcasting task update:', error);
  }
}

run().catch(console.error);
