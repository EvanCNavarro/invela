/**
 * Open Banking Timestamp Handler
 * 
 * Provides the database functions for working with field-level timestamps
 * Mirrors the KYB timestamp handler for consistency across form types
 */

import { db } from '@db';
import { sql } from 'drizzle-orm';

// Define the timestamp structure
interface OpenBankingFieldTimestamp {
  id: number;
  task_id: number;
  field_key: string;
  timestamp: Date;
}

// Define a new timestamp entry
interface NewOpenBankingFieldTimestamp {
  task_id: number;
  field_key: string;
  timestamp: Date;
}

/**
 * Get all timestamps for a specific task
 * @param taskId Task ID to fetch timestamps for
 * @returns Promise with all field timestamps for the task
 */
export async function getTaskTimestamps(taskId: number): Promise<Record<string, string>> {
  try {
    const timestamps = await db.execute(sql`
      SELECT field_key, timestamp::text 
      FROM open_banking_field_timestamps
      WHERE task_id = ${taskId}
    `);
    
    // Convert the result rows to a map of field_key to timestamp
    const timestampMap: Record<string, string> = {};
    
    for (const row of timestamps.rows) {
      // Ensure both field_key and timestamp exist
      if (row && 'field_key' in row && 'timestamp' in row) {
        timestampMap[row.field_key] = row.timestamp;
      }
    }
    
    console.log(`[OpenBanking TimestampHandler] Retrieved ${Object.keys(timestampMap).length} timestamps for task ${taskId}`);
    return timestampMap;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[OpenBanking TimestampHandler] Error fetching task timestamps:', error);
    throw new Error(`Failed to fetch timestamps for task ${taskId}: ${errorMessage}`);
  }
}

/**
 * Get timestamp for a specific field in a task
 * @param taskId Task ID to fetch timestamp for
 * @param fieldKey Field key to fetch timestamp for
 * @returns Promise with the timestamp for the field or null if not found
 */
export async function getFieldTimestamp(taskId: number, fieldKey: string): Promise<string | null> {
  try {
    const result = await db.execute(sql`
      SELECT timestamp::text
      FROM open_banking_field_timestamps
      WHERE task_id = ${taskId} AND field_key = ${fieldKey}
      LIMIT 1
    `);
    
    if (result.rows.length > 0 && result.rows[0] && 'timestamp' in result.rows[0]) {
      return result.rows[0].timestamp;
    }
    
    return null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[OpenBanking TimestampHandler] Error fetching field timestamp:', error);
    throw new Error(`Failed to fetch timestamp for field ${fieldKey} in task ${taskId}: ${errorMessage}`);
  }
}

/**
 * Save timestamps for fields in a task
 * @param taskId Task ID to save timestamps for
 * @param fieldKeys Array of field keys to save timestamps for
 * @returns Promise that resolves when the save is complete
 */
export async function saveTaskTimestamps(
  taskId: number, 
  fieldKeys: string[]
): Promise<void> {
  if (!fieldKeys || fieldKeys.length === 0) {
    console.log('[OpenBanking TimestampHandler] No field keys provided, skipping timestamp save');
    return;
  }
  
  try {
    const now = new Date();
    
    // Use a transaction for atomic updates
    await db.transaction(async (tx) => {
      // Create a batch of insert statements
      for (const fieldKey of fieldKeys) {
        // Use upsert to handle conflicts (existing timestamps)
        await tx.execute(sql`
          INSERT INTO open_banking_field_timestamps (task_id, field_key, timestamp)
          VALUES (${taskId}, ${fieldKey}, ${now})
          ON CONFLICT (task_id, field_key) 
          DO UPDATE SET timestamp = ${now}
        `);
      }
    });
    
    console.log(`[OpenBanking TimestampHandler] Saved ${fieldKeys.length} timestamps for task ${taskId}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[OpenBanking TimestampHandler] Error saving task timestamps:', error);
    throw new Error(`Failed to save timestamps for task ${taskId}: ${errorMessage}`);
  }
}

/**
 * Delete timestamps for a task
 * @param taskId Task ID to delete timestamps for
 * @returns Promise that resolves when the delete is complete
 */
export async function deleteTaskTimestamps(taskId: number): Promise<void> {
  try {
    const result = await db.execute(sql`
      DELETE FROM open_banking_field_timestamps
      WHERE task_id = ${taskId}
    `);
    
    console.log(`[OpenBanking TimestampHandler] Deleted timestamps for task ${taskId}. Count: ${result.rowCount || 0}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[OpenBanking TimestampHandler] Error deleting task timestamps:', error);
    throw new Error(`Failed to delete timestamps for task ${taskId}: ${errorMessage}`);
  }
}