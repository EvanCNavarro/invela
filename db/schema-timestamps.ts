/**
 * Schema definition for field-level timestamps
 * 
 * This schema supports the deterministic conflict resolution system
 * by tracking when each field was last modified
 */

import { pgTable, serial, integer, text, timestamp, bigint } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * KYB Field Timestamps table - tracks when each field was last modified
 */
export const kybFieldTimestamps = pgTable('kyb_field_timestamps', {
  id: serial('id').primaryKey(),
  task_id: integer('task_id').notNull(),
  field_key: text('field_key').notNull(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Create a composite index on task_id and field_key
export const kybFieldTimestampsIndex = {
  taskField: 'kyb_field_timestamps_task_id_field_key_idx'
};

// Define types for TypeScript
export type KybFieldTimestamp = typeof kybFieldTimestamps.$inferSelect;
export type NewKybFieldTimestamp = typeof kybFieldTimestamps.$inferInsert;

// Create Zod schemas for validation
export const insertKybFieldTimestampSchema = createInsertSchema(kybFieldTimestamps).extend({
  timestamp: z.number()
});

export const selectKybFieldTimestampSchema = createSelectSchema(kybFieldTimestamps).extend({
  timestamp: z.number()
});

// Export a migration function to create the table
export const createKybFieldTimestampsTable = `
CREATE TABLE IF NOT EXISTS kyb_field_timestamps (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL,
  field_key TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kyb_field_timestamps_task_id_field_key_idx 
ON kyb_field_timestamps(task_id, field_key);
`;

// Add this to your migrations object
export const kybFieldTimestampsMigration = {
  name: 'create_kyb_field_timestamps_table',
  sql: createKybFieldTimestampsTable
};