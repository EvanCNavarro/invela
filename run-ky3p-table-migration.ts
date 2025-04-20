/**
 * Run KY3P table migration
 * 
 * This script creates the KY3P fields table directly using SQL
 * to ensure the table exists before trying to import data
 */

import { db } from './db';
import { sql } from 'drizzle-orm';

async function createKy3pTables() {
  console.log('Creating KY3P tables if they don\'t exist...');
  
  try {
    // Check if ky3p_fields table exists
    const tablesResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'ky3p_fields'
      );
    `);
    
    const tableExists = tablesResult.rows[0]?.exists === true;
    
    if (tableExists) {
      console.log('KY3P fields table already exists. No migration needed.');
      return;
    }
    
    console.log('Creating ky3p_fields table...');
    
    // Create ky3p_fields table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ky3p_fields" (
        "id" SERIAL PRIMARY KEY,
        "order" INTEGER NOT NULL,
        "field_key" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "help_text" TEXT,
        "demo_autofill" TEXT,
        "section" TEXT NOT NULL,
        "field_type" TEXT NOT NULL,
        "is_required" BOOLEAN NOT NULL,
        "answer_expectation" TEXT,
        "validation_type" TEXT,
        "phasing" TEXT,
        "soc2_overlap" TEXT,
        "validation_rules" TEXT,
        "step_index" INTEGER DEFAULT 0,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('Creating ky3p_responses table...');
    
    // Create ky3p_responses table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ky3p_responses" (
        "id" SERIAL PRIMARY KEY,
        "task_id" INTEGER NOT NULL REFERENCES "tasks"("id"),
        "field_id" INTEGER NOT NULL REFERENCES "ky3p_fields"("id"),
        "response_value" TEXT,
        "status" TEXT NOT NULL DEFAULT 'empty',
        "version" INTEGER NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('KY3P tables created successfully');
  } catch (error) {
    console.error('Error creating KY3P tables:', error);
    throw error;
  }
}

// Run migration
createKy3pTables()
  .then(() => {
    console.log('KY3P table migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('KY3P table migration failed:', error);
    process.exit(1);
  });