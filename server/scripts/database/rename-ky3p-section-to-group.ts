/**
 * Migration script to rename the 'section' column to 'group'
 * in the ky3p_fields table to maintain consistency with the KYB schema.
 * 
 * This ensures both KYB and KY3P forms use the same field terminology.
 */
import { db } from './db';
import { sql } from 'drizzle-orm';

async function renameSectionToGroup() {
  try {
    console.log('Starting migration: Renaming section column to group in ky3p_fields table');
    
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
    
    // Check if section column exists
    const sectionColumnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ky3p_fields' 
        AND column_name = 'section'
      );
    `);
    
    if (!sectionColumnExists.rows[0].exists) {
      console.error('Error: section column does not exist in ky3p_fields table');
      return;
    }
    
    // Check if group column already exists
    const groupColumnExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ky3p_fields' 
        AND column_name = 'group'
      );
    `);
    
    if (groupColumnExists.rows[0].exists) {
      console.error('Error: group column already exists in ky3p_fields table');
      return;
    }
    
    // Add the new group column
    console.log('Adding group column...');
    await db.execute(sql`
      ALTER TABLE ky3p_fields 
      ADD COLUMN "group" TEXT;
    `);
    
    // Copy data from section to group
    console.log('Copying data from section to group...');
    await db.execute(sql`
      UPDATE ky3p_fields 
      SET "group" = section;
    `);
    
    // Drop the section column
    console.log('Dropping section column...');
    await db.execute(sql`
      ALTER TABLE ky3p_fields 
      DROP COLUMN section;
    `);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

async function run() {
  try {
    await renameSectionToGroup();
    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

run();