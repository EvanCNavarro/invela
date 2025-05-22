/**
 * Migration script to rename the 'description' column to 'question'
 * in the ky3p_fields table to maintain consistency with the KYB schema.
 * 
 * This ensures both KYB and KY3P forms use the same field terminology.
 */
import { db } from './db';
import { sql } from 'drizzle-orm';

async function renameDescriptionToQuestion() {
  try {
    console.log('Starting migration: Renaming description column to question in ky3p_fields table');
    
    // First, check if the table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ky3p_fields'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.error('Error: ky3p_fields table does not exist');
      return;
    }
    
    // Check if description column exists
    const descriptionColumnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ky3p_fields' 
        AND column_name = 'description'
      );
    `);
    
    if (!descriptionColumnExists.rows[0].exists) {
      console.error('Error: description column does not exist in ky3p_fields table');
      return;
    }
    
    // Check if question column already exists
    const questionColumnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ky3p_fields' 
        AND column_name = 'question'
      );
    `);
    
    if (questionColumnExists.rows[0].exists) {
      console.error('Error: question column already exists in ky3p_fields table');
      return;
    }
    
    // Add the new question column
    console.log('Adding question column...');
    await db.execute(sql`
      ALTER TABLE ky3p_fields 
      ADD COLUMN question TEXT;
    `);
    
    // Copy data from description to question
    console.log('Copying data from description to question...');
    await db.execute(sql`
      UPDATE ky3p_fields 
      SET question = description;
    `);
    
    // Drop the description column
    console.log('Dropping description column...');
    await db.execute(sql`
      ALTER TABLE ky3p_fields 
      DROP COLUMN description;
    `);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

async function run() {
  try {
    await renameDescriptionToQuestion();
    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

run();