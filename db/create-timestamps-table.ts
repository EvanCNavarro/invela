/**
 * Script to create the timestamps table in the database
 * Run with: npx tsx db/create-timestamps-table.ts
 */
import { db } from './index';
import { sql } from 'drizzle-orm';

async function createTimestampsTable() {
  try {
    console.log('Creating kyb_timestamps table...');
    
    // Create the timestamps table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "kyb_timestamps" (
        "id" SERIAL PRIMARY KEY,
        "task_id" INTEGER NOT NULL REFERENCES "tasks"("id"),
        "field_key" TEXT NOT NULL,
        "timestamp" BIGINT NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create an index for faster lookups by task_id
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "kyb_timestamps_task_id_idx" ON "kyb_timestamps" ("task_id");
    `);
    
    // Create a composite index for task_id + field_key for faster lookups
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "kyb_timestamps_task_field_idx" 
      ON "kyb_timestamps" ("task_id", "field_key");
    `);
    
    console.log('Successfully created kyb_timestamps table and indexes');
  } catch (error) {
    console.error('Error creating timestamps table:', error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  createTimestampsTable()
    .then(() => {
      console.log('Table creation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to create table:', error);
      process.exit(1);
    });
}

export { createTimestampsTable };