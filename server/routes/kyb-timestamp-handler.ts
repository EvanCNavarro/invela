/**
 * KYB Form Timestamp Handler
 * 
 * This module manages field-level timestamps for reliable conflict resolution
 * and data integrity with timestamp-based synchronization between client and server.
 */

import { db } from '../../db';
import { eq, and } from 'drizzle-orm';
import { kybResponses, tasks } from '../../db/schema';
import { kybFieldTimestamps } from '../../db/schema-timestamps';

/**
 * Get timestamps for a specific task
 * @param taskId - The task ID to fetch timestamps for
 * @param userId - The user ID making the request
 * @returns - Record of field keys to timestamps (milliseconds since epoch)
 */
export async function getKybTimestamps(taskId: number, userId: number): Promise<Record<string, number>> {
  try {
    console.log(`[Timestamp Handler] Fetching timestamps for task ${taskId}`);
    
    // First verify that the task exists and the user has access to it
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.assigned_to, userId)
      )
    });
    
    if (!task) {
      console.error(`[Timestamp Handler] Task ${taskId} not found or user ${userId} does not have access`);
      throw new Error('Task not found or unauthorized');
    }
    
    // Fetch all timestamps for this task
    const timestamps = await db.query.kybFieldTimestamps.findMany({
      where: eq(kybFieldTimestamps.task_id, taskId)
    });
    
    if (!timestamps || timestamps.length === 0) {
      console.log(`[Timestamp Handler] No timestamps found for task ${taskId}, returning empty object`);
      return {};
    }
    
    // Convert to key-value record expected by client
    const result: Record<string, number> = {};
    timestamps.forEach(timestamp => {
      result[timestamp.field_key] = timestamp.timestamp;
    });
    
    console.log(`[Timestamp Handler] Retrieved ${timestamps.length} timestamps for task ${taskId}`);
    return result;
  } catch (error) {
    console.error('[Timestamp Handler] Error fetching timestamps:', error);
    throw error;
  }
}

/**
 * Save timestamps for a specific task
 * @param taskId - The task ID to save timestamps for
 * @param userId - The user ID making the request
 * @param timestamps - Record of field keys to timestamps
 * @returns - Updated timestamp record
 */
export async function saveKybTimestamps(
  taskId: number, 
  userId: number, 
  timestamps: Record<string, number>
): Promise<Record<string, number>> {
  try {
    console.log(`[Timestamp Handler] Saving ${Object.keys(timestamps).length} timestamps for task ${taskId}`);
    
    // First verify that the task exists and the user has access to it
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.assigned_to, userId)
      )
    });
    
    if (!task) {
      console.error(`[Timestamp Handler] Task ${taskId} not found or user ${userId} does not have access`);
      throw new Error('Task not found or unauthorized');
    }
    
    // Fetch existing timestamps to determine what to update vs. insert
    const existingTimestamps = await db.query.kybFieldTimestamps.findMany({
      where: eq(kybFieldTimestamps.task_id, taskId)
    });
    
    const existingMap = new Map(existingTimestamps.map(t => [t.field_key, t]));
    const updatedTimestamps: Record<string, number> = {};
    
    // Process each timestamp
    for (const [fieldKey, timestamp] of Object.entries(timestamps)) {
      try {
        if (existingMap.has(fieldKey)) {
          // Get existing timestamp record
          const existing = existingMap.get(fieldKey)!;
          
          // Only update if the new timestamp is newer
          if (timestamp > existing.timestamp) {
            await db.update(kybFieldTimestamps)
              .set({ timestamp })
              .where(and(
                eq(kybFieldTimestamps.task_id, taskId),
                eq(kybFieldTimestamps.field_key, fieldKey)
              ));
            
            updatedTimestamps[fieldKey] = timestamp;
          } else {
            // Keep existing timestamp
            updatedTimestamps[fieldKey] = existing.timestamp;
          }
        } else {
          // Insert new timestamp
          await db.insert(kybFieldTimestamps).values({
            task_id: taskId,
            field_key: fieldKey,
            timestamp,
            created_at: new Date(),
            updated_at: new Date()
          });
          
          updatedTimestamps[fieldKey] = timestamp;
        }
      } catch (fieldError) {
        console.error(`[Timestamp Handler] Error processing timestamp for field ${fieldKey}:`, fieldError);
        // Continue with other fields even if one fails
      }
    }
    
    console.log(`[Timestamp Handler] Successfully saved/updated timestamps for task ${taskId}`);
    return updatedTimestamps;
  } catch (error) {
    console.error('[Timestamp Handler] Error saving timestamps:', error);
    throw error;
  }
}

/**
 * Delete timestamps for a specific task
 * @param taskId - The task ID to delete timestamps for
 * @param userId - The user ID making the request
 * @returns - Success status
 */
export async function deleteKybTimestamps(taskId: number, userId: number): Promise<boolean> {
  try {
    console.log(`[Timestamp Handler] Deleting timestamps for task ${taskId}`);
    
    // First verify that the task exists and the user has access to it
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.assigned_to, userId)
      )
    });
    
    if (!task) {
      console.error(`[Timestamp Handler] Task ${taskId} not found or user ${userId} does not have access`);
      throw new Error('Task not found or unauthorized');
    }
    
    // Delete all timestamps for this task
    await db.delete(kybFieldTimestamps)
      .where(eq(kybFieldTimestamps.task_id, taskId));
    
    console.log(`[Timestamp Handler] Successfully deleted timestamps for task ${taskId}`);
    return true;
  } catch (error) {
    console.error('[Timestamp Handler] Error deleting timestamps:', error);
    throw error;
  }
}

/**
 * Get the latest timestamp for a specific field in a task
 * @param taskId - The task ID
 * @param fieldKey - The field key
 * @returns - Timestamp (milliseconds since epoch) or null if not found
 */
export async function getFieldTimestamp(taskId: number, fieldKey: string): Promise<number | null> {
  try {
    const timestamp = await db.query.kybFieldTimestamps.findFirst({
      where: and(
        eq(kybFieldTimestamps.task_id, taskId),
        eq(kybFieldTimestamps.field_key, fieldKey)
      )
    });
    
    return timestamp ? timestamp.timestamp : null;
  } catch (error) {
    console.error(`[Timestamp Handler] Error fetching timestamp for field ${fieldKey}:`, error);
    return null;
  }
}