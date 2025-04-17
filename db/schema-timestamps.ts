/*
 * Timestamp table definitions for field-level timestamp tracking
 * This is added as a separate file to avoid conflicts with existing schema
 */

import { 
  pgTable, 
  text, 
  integer, 
  bigint,
  timestamp,
  serial
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tasks } from "./schema";

/**
 * Table for storing field-level timestamps
 * This allows for optimistic conflict resolution based on actual edit times
 */
export const kyb_timestamps = pgTable("kyb_timestamps", {
  id: serial("id").primaryKey(),
  task_id: integer("task_id").references(() => tasks.id).notNull(),
  field_key: text("field_key").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(), // Milliseconds since epoch
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow()
});

/**
 * Relationships for the kyb_timestamps table
 */
export const kybTimestampsRelations = relations(kyb_timestamps, ({ one }) => ({
  task: one(tasks, {
    fields: [kyb_timestamps.task_id],
    references: [tasks.id],
  }),
}));