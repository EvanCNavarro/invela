/**
 * KYB Timestamp Handler
 * 
 * This file contains utilities for handling field-level timestamps in the KYB API.
 * It provides functions for storing and retrieving timestamps alongside form data.
 */

import { db } from '../db';
import { kyb_timestamps } from '../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Save field timestamps for a KYB task
 */
export async function saveFieldTimestamps(
  taskId: number,
  timestamps: Record<string, number>
): Promise<void> {
  try {
    // First, check if we already have entries for this task
    const existingEntries = await db.query.kyb_timestamps.findMany({
      where: eq(kyb_timestamps.task_id, taskId)
    });

    // Create a map of existing entries by field_key for quick lookups
    const existingByKey: Record<string, typeof existingEntries[0]> = {};
    existingEntries.forEach(entry => {
      existingByKey[entry.field_key] = entry;
    });

    // Prepare batch operations
    const updates: any[] = [];
    const inserts: any[] = [];

    // Process each timestamp
    for (const [fieldKey, timestamp] of Object.entries(timestamps)) {
      if (existingByKey[fieldKey]) {
        // Update existing timestamp if newer
        if (timestamp > (existingByKey[fieldKey].timestamp || 0)) {
          updates.push(
            db.update(kyb_timestamps)
              .set({ timestamp })
              .where(
                and(
                  eq(kyb_timestamps.task_id, taskId),
                  eq(kyb_timestamps.field_key, fieldKey)
                )
              )
          );
        }
      } else {
        // Insert new timestamp
        inserts.push({
          task_id: taskId,
          field_key: fieldKey,
          timestamp
        });
      }
    }

    // Execute all updates in parallel
    if (updates.length > 0) {
      await Promise.all(updates.map(query => query.execute()));
    }

    // Execute all inserts
    if (inserts.length > 0) {
      await db.insert(kyb_timestamps).values(inserts);
    }
  } catch (error) {
    console.error('Error saving field timestamps:', error);
    throw error;
  }
}

/**
 * Get all field timestamps for a KYB task
 */
export async function getFieldTimestamps(
  taskId: number
): Promise<Record<string, number>> {
  try {
    const entries = await db.query.kyb_timestamps.findMany({
      where: eq(kyb_timestamps.task_id, taskId)
    });

    // Convert to simple key-value object
    const timestamps: Record<string, number> = {};
    entries.forEach(entry => {
      timestamps[entry.field_key] = entry.timestamp;
    });

    return timestamps;
  } catch (error) {
    console.error('Error getting field timestamps:', error);
    return {};
  }
}

/**
 * Delete all timestamps for a task (e.g., when deleting a task)
 */
export async function deleteTaskTimestamps(taskId: number): Promise<void> {
  try {
    await db.delete(kyb_timestamps)
      .where(eq(kyb_timestamps.task_id, taskId));
  } catch (error) {
    console.error('Error deleting task timestamps:', error);
    throw error;
  }
}