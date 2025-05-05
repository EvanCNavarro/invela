/**
 * Database Migration Runner
 * 
 * This script runs multiple database migrations in sequence to ensure data consistency.
 * It runs the following migrations in order:
 * 1. KY3P Field Key Migration: Ensures all KY3P responses have field_key values
 * 2. Status Value Standardization: Ensures all status values are lowercase
 */

import { migrateKy3pResponses, verifyMigration } from './migrate-ky3p-field-keys';
import { checkForUppercaseStatusValues, migrateStatusValues } from '../db/status-value-migration';

async function runMigrations() {
  try {
    console.log('======================================================');
    console.log('STARTING DATABASE MIGRATIONS');
    console.log('======================================================');
    
    // Step 1: Migrate KY3P Field Keys
    console.log('\nSTEP 1: KY3P Field Key Migration');
    console.log('------------------------------------------------------');
    const migrationResult = await migrateKy3pResponses();
    const verificationResult = await verifyMigration();
    
    console.log('KY3P Field Key Migration Results:');
    console.log(`- Migration stats: ${migrationResult.migrated}/${migrationResult.total} responses updated`);
    console.log(`- Verification stats: ${verificationResult.migratedCount} responses have field_key, ${verificationResult.nullCount} missing`);
    
    if (verificationResult.nullCount > 0) {
      console.warn('⚠️ Warning: Some responses still have NULL field_key');
    } else {
      console.log('✅ Success: All responses now have field_key populated');
    }
    
    // Step 2: Standardize Status Values
    console.log('\nSTEP 2: Status Value Standardization');
    console.log('------------------------------------------------------');
    const needsStatusMigration = await checkForUppercaseStatusValues();
    
    if (needsStatusMigration) {
      await migrateStatusValues();
      const stillNeedsMigration = await checkForUppercaseStatusValues();
      
      if (stillNeedsMigration) {
        console.warn('⚠️ Warning: Some status values still need migration');
      } else {
        console.log('✅ Success: All status values are now in lowercase standard format');
      }
    } else {
      console.log('✅ Success: All status values are already in the correct format');
    }
    
    console.log('\n======================================================');
    console.log('ALL MIGRATIONS COMPLETED SUCCESSFULLY');
    console.log('======================================================');
    
  } catch (error) {
    console.error('\n❌ ERROR DURING MIGRATION PROCESS:');
    console.error(error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  runMigrations().then(() => {
    console.log('Migration script execution completed');
    process.exit(0);
  }).catch(error => {
    console.error('Unhandled migration error:', error);
    process.exit(1);
  });
}

export { runMigrations };
