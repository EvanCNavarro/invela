/**
 * ========================================
 * Demo Tracking Migration Runner
 * ========================================
 * 
 * Standalone script to execute demo tracking database migration
 * 
 * @module db/run-demo-tracking-migration
 * @version 1.0.0
 * @since 2025-05-26
 */

import { db } from './index';
import { addDemoTrackingFields } from './migrations/add-demo-tracking-fields';

async function main() {
  console.log('[DemoTrackingMigration] Starting demo tracking migration...');
  
  try {
    await addDemoTrackingFields();
    console.log('[DemoTrackingMigration] ✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[DemoTrackingMigration] ❌ Migration failed:', error);
    process.exit(1);
  }
}

main();