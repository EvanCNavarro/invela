/**
 * Task Status History Schema
 * 
 * This module provides the database schema for tracking task status changes.
 * It records when a task status changes, who changed it, and other relevant metadata.
 */

import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { tasks, users } from '@db/schema';

/**
 * Task Status History Table
 * 
 * Records all status changes for tasks
 */
export const task_status_history = pgTable('task_status_history', {
  id: serial('id').primaryKey(),
  task_id: integer('task_id').references(() => tasks.id).notNull(),
  status: text('status').notNull(),
  changed_by: integer('changed_by').references(() => users.id),
  metadata: text('metadata'),
  created_at: timestamp('created_at').defaultNow(),
});
