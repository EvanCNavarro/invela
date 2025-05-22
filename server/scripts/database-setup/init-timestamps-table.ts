/**
 * Initialize the KYB field timestamps table
 * 
 * This script creates the table needed for the field-level timestamp
 * synchronization system which enables deterministic conflict resolution
 */

import { createTimestampsTable } from './db/create-timestamps-table';

async function init() {
  try {
    console.log('=== Initializing KYB Field Timestamps Table ===');
    await createTimestampsTable();
    console.log('=== Table initialization completed successfully ===');
    process.exit(0);
  } catch (error: unknown) {
    console.error('Error initializing timestamps table:', error);
    process.exit(1);
  }
}

// Run initialization
init();