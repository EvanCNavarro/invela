/**
 * Run Open Banking Template Migration
 * 
 * This script adds the Open Banking task template to make forms work correctly.
 */

import { addOpenBankingTemplate } from './server/migrations/add_open_banking_template';

async function run() {
  try {
    console.log('Running Open Banking template migration...');
    const result = await addOpenBankingTemplate();
    console.log('Migration completed with result:', result);
    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

// Run the migration
run();