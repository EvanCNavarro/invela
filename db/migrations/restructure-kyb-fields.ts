import { db } from '@db';
import { sql } from 'drizzle-orm';

/**
 * Restructure the kyb_fields table so that the row ID directly matches the order value
 * 
 * This migration creates a new table with the correct structure, transfers data with
 * adjusted IDs, updates related tables, and replaces the original table.
 */

export async function migrate() {
  console.log('Running restructure-kyb-fields migration...');
  
  try {
    // Clean up any potential leftover tables from previous migration attempts
    await db.execute(sql`
      DROP TABLE IF EXISTS kyb_fields_id_mapping, kyb_fields_new, kyb_responses_temp
    `);
    
    // Step 1: Create a temporary mapping table to manage the ID changes
    await db.execute(sql`
      CREATE TABLE kyb_fields_id_mapping (
        old_id INTEGER NOT NULL, 
        new_id INTEGER NOT NULL,
        field_key TEXT NOT NULL
      )
    `);
    
    // Step 2: Populate the mapping table based on the desired order
    await db.execute(sql`
      INSERT INTO kyb_fields_id_mapping (old_id, new_id, field_key)
      SELECT id, "order", field_key FROM kyb_fields ORDER BY "order" ASC
    `);
    
    console.log('Created and populated ID mapping table');
    
    // Step 3: Create a new kyb_fields table with the desired structure
    await db.execute(sql`
      CREATE TABLE kyb_fields_new (
        id INTEGER PRIMARY KEY,
        field_key TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        field_type TEXT NOT NULL,
        question TEXT,
        "group" TEXT,
        required BOOLEAN NOT NULL DEFAULT false,
        "order" INTEGER NOT NULL,
        validation_rules JSONB,
        help_text TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        step_index INTEGER,
        answer_expectation TEXT,
        demo_autofill TEXT,
        validation_type TEXT
      )
    `);
    
    console.log('Created new kyb_fields table');
    
    // Step 4: Insert data into the new table with IDs matching the order
    await db.execute(sql`
      INSERT INTO kyb_fields_new (
        id, field_key, display_name, field_type, question, "group", 
        required, "order", validation_rules, help_text, created_at, updated_at, 
        step_index, answer_expectation, demo_autofill, validation_type
      )
      SELECT 
        m.new_id, 
        f.field_key, 
        f.display_name, 
        f.field_type, 
        f.question, 
        f."group", 
        f.required, 
        f."order", 
        f.validation_rules, 
        f.help_text, 
        f.created_at, 
        f.updated_at, 
        f.step_index, 
        f.answer_expectation, 
        f.demo_autofill, 
        f.validation_type
      FROM kyb_fields f
      JOIN kyb_fields_id_mapping m ON f.id = m.old_id
      ORDER BY m.new_id ASC
    `);
    
    console.log('Populated new kyb_fields table with correct IDs');
    
    // Step 5: Create a temporary table to hold the kyb_responses data
    await db.execute(sql`
      CREATE TABLE kyb_responses_temp AS
      SELECT 
        id,
        task_id,
        (SELECT new_id FROM kyb_fields_id_mapping WHERE old_id = field_id) AS field_id,
        response_value,
        created_at,
        updated_at,
        version,
        status
      FROM kyb_responses
    `);
    
    console.log('Created temporary kyb_responses table with updated field_id references');
    
    // Step 6: Drop constraints and update tables
    // We need to do this in a transaction to ensure data integrity
    await db.execute(sql`
      BEGIN;
      
      -- Drop the constraint on kyb_responses
      ALTER TABLE kyb_responses DROP CONSTRAINT IF EXISTS kyb_responses_field_id_fkey;

      -- Drop the original kyb_responses table and rename the temporary one
      DROP TABLE kyb_responses;
      ALTER TABLE kyb_responses_temp RENAME TO kyb_responses;
      
      -- Add back the primary key
      ALTER TABLE kyb_responses ADD PRIMARY KEY (id);
      
      -- Drop the original kyb_fields table and rename the new one
      DROP TABLE kyb_fields;
      ALTER TABLE kyb_fields_new RENAME TO kyb_fields;
      
      -- Recreate the foreign key constraint
      ALTER TABLE kyb_responses 
        ADD CONSTRAINT kyb_responses_field_id_fkey 
        FOREIGN KEY (field_id) REFERENCES kyb_fields(id);
        
      -- Clean up the mapping table
      DROP TABLE kyb_fields_id_mapping;
      
      COMMIT;
    `);
    
    console.log('Successfully restructured the kyb_fields table with IDs matching order values');
    console.log('Updated all foreign key references in kyb_responses');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export async function rollback() {
  console.log('Rollback for this migration is not implemented due to its complexity and risk.');
  console.log('If needed, restore from a backup or create a reverse migration.');
}