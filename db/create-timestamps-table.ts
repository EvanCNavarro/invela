/**
 * Database migration to create the field timestamps table
 * Part of the field-level timestamp synchronization system
 */

import { db } from '@db';
import { sql } from 'drizzle-orm';
import { createKybFieldTimestampsTable } from './schema-timestamps';

/**
 * Create the KYB field timestamps table
 * @returns Promise that resolves when the migration is complete
 */
export async function createTimestampsTable(): Promise<void> {
  try {
    console.log('[DB Migration] Creating KYB field timestamps table...');
    await db.execute(sql.raw(createKybFieldTimestampsTable));
    console.log('[DB Migration] Successfully created KYB field timestamps table');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[DB Migration] Error creating timestamps table:', error);
    throw new Error(`Failed to create timestamps table: ${errorMessage}`);
  }
}