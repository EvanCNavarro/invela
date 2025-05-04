/**
 * KY3P Field Key Migration Script
 * 
 * This script populates the field_key column in ky3p_responses based on
 * the relationship between field_id in responses and id in ky3p_fields.
 * 
 * This is part of the unification strategy to align KY3P with KYB and Open Banking
 * by using string-based field_key as the primary identifier instead of numeric field_id.
 */

import { db } from "@db";
import { eq } from "drizzle-orm";

async function migrateKy3pResponses() {
  console.log('[KY3P-MIGRATION] Starting KY3P responses migration');
  
  try {
    // Check how many responses need migration
    const countQuery = `
      SELECT COUNT(*) as count
      FROM ky3p_responses
      WHERE field_key IS NULL
    `;
    
    const countResult = await db.execute(countQuery);
    const count = parseInt(String(countResult.rows[0].count));
    
    console.log(`[KY3P-MIGRATION] Found ${count} responses needing migration`);
    
    if (count === 0) {
      console.log('[KY3P-MIGRATION] No responses need migration, exiting');
      return { migrated: 0, total: 0 };
    }
    
    // Use a direct SQL UPDATE for all records at once - much more efficient
    const updateQuery = `
      UPDATE ky3p_responses AS r
      SET field_key = f.field_key
      FROM ky3p_fields AS f
      WHERE r.field_id = f.id AND r.field_key IS NULL
    `;
    
    console.log('[KY3P-MIGRATION] Executing bulk update query...');
    await db.execute(updateQuery);
    
    // Verify how many were updated
    const verifyQuery = `
      SELECT COUNT(*) as count
      FROM ky3p_responses
      WHERE field_key IS NOT NULL
    `;
    
    const verifyResult = await db.execute(verifyQuery);
    const updatedCount = parseInt(String(verifyResult.rows[0].count));
    
    console.log(`[KY3P-MIGRATION] Migration complete, migrated ${updatedCount} responses`);
    return { migrated: updatedCount, total: count };
    
  } catch (error) {
    console.error('[KY3P-MIGRATION] Error during migration:', error);
    throw error;
  }
}

async function verifyMigration() {
  try {
    // Check if any responses still have NULL field_key
    const nullKeyResponses = await db.execute(`
      SELECT COUNT(*) as count 
      FROM ky3p_responses 
      WHERE field_key IS NULL
    `);
    
    const nullCount = parseInt(String(nullKeyResponses.rows[0].count));
    
    // Check total migrated responses
    const migratedResponses = await db.execute(`
      SELECT COUNT(*) as count 
      FROM ky3p_responses 
      WHERE field_key IS NOT NULL
    `);
    
    const migratedCount = parseInt(String(migratedResponses.rows[0].count));
    
    console.log(`[KY3P-MIGRATION] Verification results:`);
    console.log(`- Total responses with field_key: ${migratedCount}`);
    console.log(`- Responses still missing field_key: ${nullCount}`);
    
    return { migratedCount, nullCount };
    
  } catch (error) {
    console.error('[KY3P-MIGRATION] Error during verification:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('[KY3P-MIGRATION] Starting migration process');
    
    // Run the migration
    const migrationResult = await migrateKy3pResponses();
    
    // Verify the results
    const verificationResult = await verifyMigration();
    
    console.log('[KY3P-MIGRATION] Migration process completed');
    console.log(`- Migration stats: ${migrationResult.migrated}/${migrationResult.total} responses updated`);
    console.log(`- Verification stats: ${verificationResult.migratedCount} responses have field_key, ${verificationResult.nullCount} missing`);
    
    if (verificationResult.nullCount > 0) {
      console.warn('[KY3P-MIGRATION] Warning: Some responses still have NULL field_key');
    } else {
      console.log('[KY3P-MIGRATION] Success: All responses now have field_key populated');
    }
    
  } catch (error) {
    console.error('[KY3P-MIGRATION] Critical error during migration process:', error);
    process.exit(1);
  }
}

// Run the migration if this is the main module
// Using ESM detection method
const isMainModule = import.meta.url.endsWith(process.argv[1]);
if (isMainModule) {
  main().then(() => {
    console.log('[KY3P-MIGRATION] Script execution completed');
    process.exit(0);
  }).catch(error => {
    console.error('[KY3P-MIGRATION] Unhandled error:', error);
    process.exit(1);
  });
}

export { migrateKy3pResponses, verifyMigration };

