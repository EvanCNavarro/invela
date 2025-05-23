/**
 * Database Timestamps Table Creation - Migration utility for field-level timestamp tracking
 * 
 * Creates the KYB field timestamps table that supports deterministic conflict resolution
 * by tracking when each form field was last modified. This enables proper data
 * synchronization across multiple form submissions and user interactions.
 */

// ========================================
// IMPORTS
// ========================================

// External library imports (alphabetical)
import { sql } from 'drizzle-orm';

// Internal absolute path imports (alphabetical)
import { db } from '@db';

// Relative imports (alphabetical)
import { createKybFieldTimestampsTable as createTableSql } from './schema-timestamps';

// ========================================
// TYPE DEFINITIONS
// ========================================

interface TimestampTableCreationResult {
  success: boolean;
  tableName: string;
  timestamp: Date;
}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Create the KYB field timestamps table with proper error handling
 * 
 * Executes the SQL creation statement for the KYB field timestamps table,
 * which tracks modification times for form fields to enable deterministic
 * conflict resolution in the field-level timestamp synchronization system.
 * 
 * @returns Promise that resolves when the migration completes successfully
 * 
 * @throws {Error} When database connection fails
 * @throws {Error} When SQL execution fails
 * @throws {Error} When table creation encounters constraints violations
 * 
 * @example
 * await createTimestampsTable();
 */
export async function createTimestampsTable(): Promise<TimestampTableCreationResult> {
  try {
    // Execute table creation SQL with raw query for precise control
    await db.execute(sql.raw(createTableSql));
    
    return {
      success: true,
      tableName: 'kyb_field_timestamps',
      timestamp: new Date()
    };
  } catch (error: unknown) {
    // Type-safe error handling for comprehensive error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create KYB field timestamps table: ${errorMessage}`);
  }
}

// ========================================
// EXPORTS
// ========================================

export { createTimestampsTable as default };