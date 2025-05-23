/**
 * Schema definition for field-level timestamps
 * 
 * This schema supports the deterministic conflict resolution system
 * by tracking when each field was last modified
 */

import { pgTable, serial, integer, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * KYB Field Timestamps table - tracks when each field was last modified
 */
export const kybFieldTimestamps = pgTable('kyb_field_timestamps', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').notNull(),
  fieldKey: text('field_key').notNull(),
  timestamp: timestamp('timestamp').notNull(),
}, (table) => {
  return {
    // Composite unique constraint to ensure only one timestamp per task+field combination
    taskFieldKey: primaryKey({ columns: [table.taskId, table.fieldKey] })
  };
});

// Index definition for quick lookups
export const kybFieldTimestampsIndex = {
  taskIdIdx: 'idx_kyb_field_timestamps_task_id',
  fieldKeyIdx: 'idx_kyb_field_timestamps_field_key'
};

// Type definitions for TypeScript
export type KybFieldTimestamp = typeof kybFieldTimestamps.$inferSelect;
export type NewKybFieldTimestamp = typeof kybFieldTimestamps.$inferInsert;

// Zod schemas for validation
export const insertKybFieldTimestampSchema = createInsertSchema(kybFieldTimestamps).extend({
  // Any additional validation can be added here
  timestamp: z.date().or(z.string().transform(val => new Date(val)))
});

export const selectKybFieldTimestampSchema = createSelectSchema(kybFieldTimestamps).extend({
  // Any additional transformations can be added here
  timestamp: z.date()
});

// SQL definition for creating the table
export const createKybFieldTimestampsTable = `
CREATE TABLE IF NOT EXISTS kyb_field_timestamps (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL,
  field_key TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  CONSTRAINT task_field_key UNIQUE (task_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_kyb_field_timestamps_task_id ON kyb_field_timestamps(task_id);
CREATE INDEX IF NOT EXISTS idx_kyb_field_timestamps_field_key ON kyb_field_timestamps(field_key);
`;

// Migration helper
export const kybFieldTimestampsMigration = {
  up: createKybFieldTimestampsTable,
  down: `DROP TABLE IF EXISTS kyb_field_timestamps;`
};