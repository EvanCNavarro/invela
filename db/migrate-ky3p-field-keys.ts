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
    // Get all KY3P responses without field_key
    const query = `
      SELECT r.id, r.field_id, f.field_key 
      FROM ky3p_responses r
      JOIN ky3p_fields f ON r.field_id = f.id
      WHERE r.field_key IS NULL
    `;
    
    const responsesResult = await db.execute(query);
    const responses = responsesResult.rows;
    
    console.log(`[KY3P-MIGRATION] Found ${responses.length} responses needing migration`);
    
    if (responses.length === 0) {
      console.log('[KY3P-MIGRATION] No responses need migration, exiting');
      return { migrated: 0, total: 0 };
    }
    
    // Begin transaction for updates
    let migratedCount = 0;
    
    await db.transaction(async (tx) => {
      for (const response of responses) {
        await tx.execute(`
          UPDATE ky3p_responses 
          SET field_key = $1 
          WHERE id = $2
        `, [response.field_key, response.id]);
        
        migratedCount++;
        
        if (migratedCount % 100 === 0) {
          console.log(`[KY3P-MIGRATION] Migrated ${migratedCount}/${responses.length} responses`);
        }
      }
    });
    
    console.log(`[KY3P-MIGRATION] Migration complete, migrated ${migratedCount}/${responses.length} responses`);
    return { migrated: migratedCount, total: responses.length };
    
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
    
    const nullCount = parseInt(nullKeyResponses.rows[0].count);
    
    // Check total migrated responses
    const migratedResponses = await db.execute(`
      SELECT COUNT(*) as count 
      FROM ky3p_responses 
      WHERE field_key IS NOT NULL
    `);
    
    const migratedCount = parseInt(migratedResponses.rows[0].count);
    
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

// Run the migration if this script is executed directly
if (require.main === module) {
  main().then(() => {
    console.log('[KY3P-MIGRATION] Script execution completed');
    process.exit(0);
  }).catch(error => {
    console.error('[KY3P-MIGRATION] Unhandled error:', error);
    process.exit(1);
  });
}

export { migrateKy3pResponses, verifyMigration };
