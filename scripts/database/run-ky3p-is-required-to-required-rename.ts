/**
 * Migration to rename the 'is_required' column to 'required' in the ky3p_fields table
 * 
 * This script renames the column to match the KYB schema and the UniversalDemoAutoFillService
 * configuration, which expects a 'required' column for all form types.
 */

import { db } from './db';
import { Logger } from './server/utils/logger';
import { sql } from 'drizzle-orm';

const logger = new Logger('KY3P-Column-Rename');

async function renamingIsRequiredToRequired() {
  try {
    logger.info('Starting migration to rename is_required to required in ky3p_fields table');
    
    // Check if is_required column exists
    const checkColumnResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ky3p_fields' AND column_name = 'is_required'
    `);
    
    if (checkColumnResult.length === 0) {
      logger.warn('Column is_required does not exist in ky3p_fields table. Checking if required already exists.');
      
      const checkRequiredResult = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'ky3p_fields' AND column_name = 'required'
      `);
      
      if (checkRequiredResult.length > 0) {
        logger.info('Column required already exists in ky3p_fields table. Migration not needed.');
        return;
      } else {
        logger.error('Neither is_required nor required columns exist in ky3p_fields table. Please check schema.');
        return;
      }
    }
    
    // Execute the column rename
    await db.execute(sql`
      ALTER TABLE ky3p_fields RENAME COLUMN is_required TO required
    `);
    
    logger.info('Successfully renamed is_required to required in ky3p_fields table');
    
    // Verify the migration was successful
    const verifyResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ky3p_fields' AND column_name = 'required'
    `);
    
    if (verifyResult.length > 0) {
      logger.info('Verified that required column now exists in ky3p_fields table');
    } else {
      logger.error('Migration failed: required column not found after rename operation');
    }
  } catch (error) {
    logger.error('Error during column rename operation', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

async function run() {
  try {
    await renamingIsRequiredToRequired();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

run();