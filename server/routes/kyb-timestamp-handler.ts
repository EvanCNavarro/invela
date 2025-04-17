/**
 * KYB Timestamp Handler
 * 
 * Provides the database functions for working with field-level timestamps
 * Core component of the timestamp-based conflict resolution system
 */

import { db } from '@db';
import { kybFieldTimestamps, NewKybFieldTimestamp, KybFieldTimestamp } from '../../db/schema-timestamps';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Get all timestamps for a specific task
 * @param taskId Task ID to fetch timestamps for
 * @returns Promise with all field timestamps for the task
 */
export async function getTaskTimestamps(taskId: number): Promise<KybFieldTimestamp[]> {
  try {
    const timestamps = await db.select()
      .from(kybFieldTimestamps)
      .where(eq(kybFieldTimestamps.taskId, taskId));
    
    console.log(`[TimestampHandler] Retrieved ${timestamps.length} timestamps for task ${taskId}`);
    return timestamps;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[TimestampHandler] Error fetching task timestamps:', error);
    throw new Error(`Failed to fetch timestamps for task ${taskId}: ${errorMessage}`);
  }
}

/**
 * Get a specific field timestamp for a task
 * @param taskId Task ID to fetch timestamp for
 * @param fieldKey Field key to fetch timestamp for
 * @returns Promise with the field timestamp or null if not found
 */
export async function getFieldTimestamp(
  taskId: number,
  fieldKey: string
): Promise<KybFieldTimestamp | null> {
  try {
    const [timestamp] = await db.select()
      .from(kybFieldTimestamps)
      .where(
        and(
          eq(kybFieldTimestamps.taskId, taskId),
          eq(kybFieldTimestamps.fieldKey, fieldKey)
        )
      );
    
    return timestamp || null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[TimestampHandler] Error fetching field timestamp:', error);
    throw new Error(`Failed to fetch timestamp for field ${fieldKey} in task ${taskId}: ${errorMessage}`);
  }
}

/**
 * Save a batch of field timestamps for a task
 * Uses upsert to update existing timestamps or insert new ones
 * @param taskId Task ID to save timestamps for
 * @param timestamps Object mapping field keys to timestamp values
 * @returns Promise that resolves when all timestamps are saved
 */
export async function saveTaskTimestamps(
  taskId: number,
  timestamps: Record<string, number>
): Promise<void> {
  try {
    console.log(`[TimestampHandler] Saving ${Object.keys(timestamps).length} timestamps for task ${taskId}`);
    
    // Process timestamps in batches to prevent large transactions
    const batchSize = 50;
    const fieldKeys = Object.keys(timestamps);
    
    for (let i = 0; i < fieldKeys.length; i += batchSize) {
      const batch = fieldKeys.slice(i, i + batchSize);
      const values: NewKybFieldTimestamp[] = batch.map(fieldKey => ({
        taskId,
        fieldKey,
        timestamp: new Date(timestamps[fieldKey])
      }));
      
      await db.insert(kybFieldTimestamps)
        .values(values)
        .onConflictDoUpdate({
          target: [kybFieldTimestamps.taskId, kybFieldTimestamps.fieldKey],
          set: { timestamp: sql`excluded.timestamp` }
        });
    }
    
    console.log(`[TimestampHandler] Successfully saved timestamps for task ${taskId}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[TimestampHandler] Error saving task timestamps:', error);
    throw new Error(`Failed to save timestamps for task ${taskId}: ${errorMessage}`);
  }
}

/**
 * Delete all timestamps for a specific task
 * Used when deleting a task or resetting its state
 * @param taskId Task ID to delete timestamps for
 * @returns Promise that resolves when all timestamps are deleted
 */
export async function deleteTaskTimestamps(taskId: number): Promise<void> {
  try {
    await db.delete(kybFieldTimestamps)
      .where(eq(kybFieldTimestamps.taskId, taskId));
    
    console.log(`[TimestampHandler] Deleted all timestamps for task ${taskId}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[TimestampHandler] Error deleting task timestamps:', error);
    throw new Error(`Failed to delete timestamps for task ${taskId}: ${errorMessage}`);
  }
}