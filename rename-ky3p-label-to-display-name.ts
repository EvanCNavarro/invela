/**
 * Migration script to rename the 'label' column to 'display_name'
 * in the ky3p_fields table to maintain consistency with the KYB schema.
 * 
 * This ensures both KYB and KY3P forms use the same field terminology.
 */

import { db } from './db';
import { Logger } from './server/utils/logger';

const logger = new Logger('KY3P Migration');

async function renameLabelToDisplayName() {
  try {
    logger.info('Starting migration: Renaming label to display_name in ky3p_fields table');

    // Use raw SQL to execute the ALTER TABLE command
    await db.execute(`
      ALTER TABLE ky3p_fields
      RENAME COLUMN label TO display_name;
    `);

    logger.info('Successfully renamed label column to display_name in ky3p_fields table');
  } catch (error) {
    logger.error('Error renaming label to display_name:', error);
    throw error;
  }
}

async function run() {
  try {
    await renameLabelToDisplayName();
    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

run();