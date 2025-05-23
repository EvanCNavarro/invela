/**
 * Database Schema Timestamps - Field-level timestamp tracking for conflict resolution
 * 
 * Defines the KYB field timestamps table schema that supports deterministic conflict
 * resolution by tracking when each form field was last modified. Includes Drizzle ORM
 * table definitions, TypeScript types, Zod validation schemas, and migration utilities
 * for comprehensive timestamp synchronization across form submissions.
 */

// ========================================
// IMPORTS
// ========================================

// External library imports (alphabetical)
import { pgTable, serial, integer, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ========================================
// CONSTANTS
// ========================================

/**
 * Index definitions for optimized database query performance
 * Provides quick lookups on task_id and field_key columns
 */
const KYB_FIELD_TIMESTAMPS_INDICES = {
  TASK_ID_INDEX: 'idx_kyb_field_timestamps_task_id',
  FIELD_KEY_INDEX: 'idx_kyb_field_timestamps_field_key'
} as const;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * KYB Field Timestamp record type for database operations
 * Represents a single timestamp entry for field-level tracking
 */
export type KybFieldTimestamp = typeof kybFieldTimestamps.$inferSelect;

/**
 * New KYB Field Timestamp input type for insertions
 * Used when creating new timestamp records
 */
export type NewKybFieldTimestamp = typeof kybFieldTimestamps.$inferInsert;

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * KYB Field Timestamps table schema definition
 * 
 * Tracks modification timestamps for individual form fields to enable
 * deterministic conflict resolution in multi-user environments. Each
 * record represents when a specific field was last updated.
 * 
 * @param id - Auto-incrementing primary key for unique record identification
 * @param taskId - Foreign key reference to the associated task
 * @param fieldKey - String identifier for the specific form field
 * @param timestamp - Exact date/time when the field was last modified
 */
export const kybFieldTimestamps = pgTable('kyb_field_timestamps', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').notNull(),
  fieldKey: text('field_key').notNull(),
  timestamp: timestamp('timestamp').notNull(),
}, (table) => {
  return {
    // Composite unique constraint ensures only one timestamp per task+field combination
    taskFieldKey: primaryKey({ columns: [table.taskId, table.fieldKey] })
  };
});

/**
 * Index configuration for optimized query performance
 * Enables fast lookups by task_id and field_key
 */
export const kybFieldTimestampsIndex = KYB_FIELD_TIMESTAMPS_INDICES;

/**
 * Zod schema for validating timestamp insertion data
 * Accepts both Date objects and ISO date strings with automatic conversion
 */
export const insertKybFieldTimestampSchema = createInsertSchema(kybFieldTimestamps).extend({
  timestamp: z.date().or(z.string().transform(dateString => new Date(dateString)))
});

/**
 * Zod schema for validating timestamp selection data
 * Ensures timestamp fields are properly typed as Date objects
 */
export const selectKybFieldTimestampSchema = createSelectSchema(kybFieldTimestamps).extend({
  timestamp: z.date()
});

/**
 * SQL DDL statement for creating the KYB field timestamps table
 * Includes table creation, unique constraints, and performance indices
 */
export const createKybFieldTimestampsTable = `
CREATE TABLE IF NOT EXISTS kyb_field_timestamps (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL,
  field_key TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  CONSTRAINT task_field_key UNIQUE (task_id, field_key)
);

CREATE INDEX IF NOT EXISTS ${KYB_FIELD_TIMESTAMPS_INDICES.TASK_ID_INDEX} ON kyb_field_timestamps(task_id);
CREATE INDEX IF NOT EXISTS ${KYB_FIELD_TIMESTAMPS_INDICES.FIELD_KEY_INDEX} ON kyb_field_timestamps(field_key);
`;

/**
 * Migration helper object for database schema versioning
 * Provides both creation and rollback SQL statements
 */
export const kybFieldTimestampsMigration = {
  up: createKybFieldTimestampsTable,
  down: `DROP TABLE IF EXISTS kyb_field_timestamps;`
};

// ========================================
// EXPORTS
// ========================================

export {
  kybFieldTimestamps as default,
  KYB_FIELD_TIMESTAMPS_INDICES
};