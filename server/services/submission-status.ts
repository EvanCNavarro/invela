/**
 * Submission status service
 * 
 * Handles reliable submission status updates and notifications
 * to ensure form submissions are properly tracked and broadcast
 */

import { db } from '@db';
import { tasks, TaskStatus } from '@db/schema';
import { eq } from 'drizzle-orm';
import { broadcastTaskUpdate } from './websocket';

/**
 * Update a task's status to submitted and broadcast the update to all clients
 * This is a critical function to ensure submission status is reliably tracked
 * 
 * @param taskId The task ID to update
 * @param fileId Optional file ID that was created during submission
 * @returns A boolean indicating if the update was successful
 */
export async function updateAndBroadcastSubmissionStatus(
  taskId: number, 
  fileId?: number
): Promise<boolean> {
  try {
    console.log(`[SubmissionService] Updating task ${taskId} to submitted status`);
    
    // Get the current task data
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      console.error(`[SubmissionService] Task ${taskId} not found`);
      return false;
    }
    
    const submissionDate = new Date().toISOString();
    
    // Update the task status in the database
    await db.update(tasks)
      .set({
        status: TaskStatus.SUBMITTED,
        progress: 100,
        updated_at: new Date(),
        metadata: {
          ...task.metadata,
          ...(fileId ? { kybFormFile: fileId } : {}),
          submissionDate: submissionDate,
          status: 'submitted', // Explicit flag for status
          formVersion: task.metadata?.formVersion || '1.0',
          statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.SUBMITTED]
            .filter((v, i, a) => a.indexOf(v) === i)
        }
      })
      .where(eq(tasks.id, taskId));
    
    // Broadcast the status update to all connected clients
    console.log(`[SubmissionService] Broadcasting submission update for task ${taskId}`);
    broadcastTaskUpdate({
      id: taskId,
      status: TaskStatus.SUBMITTED,
      progress: 100,
      metadata: {
        ...(fileId ? { kybFormFile: fileId } : {}),
        submissionDate: submissionDate,
        status: 'submitted'
      }
    });
    
    console.log(`[SubmissionService] Task ${taskId} successfully updated to submitted status`);
    return true;
  } catch (error) {
    console.error(`[SubmissionService] Error updating submission status:`, error);
    return false;
  }
}