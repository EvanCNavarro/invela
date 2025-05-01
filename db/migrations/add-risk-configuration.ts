/**
 * Migration: Add risk_configuration column to companies table
 * 
 * This migration adds a JSONB column to store risk score configuration
 */

import { db } from '../index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log('[Migration] Adding risk_configuration column to companies table...');

    // Add the risk_configuration column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS risk_configuration JSONB;
    `);

    console.log('[Migration] Successfully added risk_configuration column to companies table');
  } catch (error) {
    console.error('[Migration] Error adding risk_configuration column:', error);
    throw error;
  }
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
