/**
 * Database migration to create the field timestamps table
 * Part of the field-level timestamp synchronization system
 */

import { db } from './index';
import { sql } from 'drizzle-orm';
import { createKybFieldTimestampsTable } from './schema-timestamps';

/**
 * Create the KYB field timestamps table
 * @returns Promise that resolves when the migration is complete
 */
export async function createTimestampsTable(): Promise<void> {
  try {
    console.log('[DB Migration] Creating kyb_field_timestamps table...');
    
    // Execute the migration SQL
    await db.execute(sql.raw(createKybFieldTimestampsTable));
    
    console.log('[DB Migration] kyb_field_timestamps table created successfully');
    
    return Promise.resolve();
  } catch (error) {
    console.error('[DB Migration] Failed to create timestamps table:', error);
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('[DB Migration] Timestamps table already exists, skipping creation');
      return Promise.resolve();
    }
    return Promise.reject(error);
  }
}

// For direct execution (e.g., via node)
if (require.main === module) {
  createTimestampsTable()
    .then(() => {
      console.log('[DB Migration] Timestamps table migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('[DB Migration] Migration failed:', error);
      process.exit(1);
    });
}