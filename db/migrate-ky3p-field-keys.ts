/**
 * KY3P Field Key Migration Script - Database migration for field key unification
 * 
 * Populates field_key columns in ky3p_responses based on relationships between
 * field_id and ky3p_fields.id for data model unification. Part of comprehensive
 * strategy to align KY3P with KYB and Open Banking systems by standardizing
 * string-based field_key as primary identifier instead of numeric field_id.
 * 
 * Migration Process:
 * 1. Identifies responses with NULL field_key values
 * 2. Executes bulk UPDATE using JOIN operation for performance
 * 3. Verifies migration completeness with comprehensive validation
 */

// ========================================
// IMPORTS
// ========================================

// External library imports (alphabetical)
import { eq } from "drizzle-orm";

// Internal absolute path imports (alphabetical)
import { db } from "@db";

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Migration execution result interface
 * Provides structured feedback on migration outcomes
 */
interface MigrationResult {
  migrated: number;
  total: number;
}

/**
 * Migration verification result interface
 * Tracks validation outcomes after migration execution
 */
interface VerificationResult {
  migratedCount: number;
  nullCount: number;
}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Execute KY3P responses field key migration with bulk update operation
 * 
 * Performs efficient bulk update to populate field_key values in ky3p_responses
 * by joining with ky3p_fields table. Uses SQL JOIN for optimal performance
 * when processing large datasets.
 * 
 * @returns Promise resolving to migration statistics including counts
 * 
 * @throws {Error} When database operation fails or query execution encounters issues
 */
async function migrateKy3pResponses(): Promise<MigrationResult> {
  try {
    // Count responses requiring migration
    const countQuery = `
      SELECT COUNT(*) as count
      FROM ky3p_responses
      WHERE field_key IS NULL
    `;
    
    const countResult = await db.execute(countQuery);
    const totalRequiringMigration = parseInt(String(countResult.rows[0].count));
    
    if (totalRequiringMigration === 0) {
      return { migrated: 0, total: 0 };
    }
    
    // Execute bulk update with JOIN operation for performance
    const updateQuery = `
      UPDATE ky3p_responses AS r
      SET field_key = f.field_key
      FROM ky3p_fields AS f
      WHERE r.field_id = f.id AND r.field_key IS NULL
    `;
    
    await db.execute(updateQuery);
    
    // Verify migration results
    const verificationQuery = `
      SELECT COUNT(*) as count
      FROM ky3p_responses
      WHERE field_key IS NOT NULL
    `;
    
    const verificationResult = await db.execute(verificationQuery);
    const migratedCount = parseInt(String(verificationResult.rows[0].count));
    
    return { 
      migrated: migratedCount, 
      total: totalRequiringMigration 
    };
    
  } catch (migrationError: unknown) {
    const errorMessage = migrationError instanceof Error ? migrationError.message : String(migrationError);
    throw new Error(`KY3P migration execution failed: ${errorMessage}`);
  }
}

/**
 * Verify KY3P migration completeness with comprehensive validation
 * 
 * Performs post-migration validation to ensure all ky3p_responses records
 * have been properly migrated with field_key values. Provides detailed
 * statistics for migration auditing and compliance verification.
 * 
 * @returns Promise resolving to verification statistics and counts
 * 
 * @throws {Error} When database validation queries fail
 */
async function verifyMigration(): Promise<VerificationResult> {
  try {
    // Count responses still missing field_key values
    const nullKeyQuery = `
      SELECT COUNT(*) as count 
      FROM ky3p_responses 
      WHERE field_key IS NULL
    `;
    
    const nullKeyResult = await db.execute(nullKeyQuery);
    const nullCount = parseInt(String(nullKeyResult.rows[0].count));
    
    // Count successfully migrated responses
    const migratedQuery = `
      SELECT COUNT(*) as count 
      FROM ky3p_responses 
      WHERE field_key IS NOT NULL
    `;
    
    const migratedResult = await db.execute(migratedQuery);
    const migratedCount = parseInt(String(migratedResult.rows[0].count));
    
    return { migratedCount, nullCount };
    
  } catch (verificationError: unknown) {
    const errorMessage = verificationError instanceof Error ? verificationError.message : String(verificationError);
    throw new Error(`Migration verification failed: ${errorMessage}`);
  }
}

/**
 * Execute complete KY3P migration process with verification
 * 
 * Orchestrates the full migration workflow including execution and validation.
 * Provides comprehensive error handling for production deployment scenarios.
 * 
 * @returns Promise that resolves when migration completes successfully
 * 
 * @throws {Error} When migration or verification fails
 */
async function main(): Promise<void> {
  try {
    // Execute primary migration
    const migrationResult = await migrateKy3pResponses();
    
    // Perform verification
    const verificationResult = await verifyMigration();
    
    // Validate migration success
    if (verificationResult.nullCount > 0) {
      throw new Error(`Migration incomplete: ${verificationResult.nullCount} responses still missing field_key`);
    }
    
  } catch (mainError: unknown) {
    const errorMessage = mainError instanceof Error ? mainError.message : String(mainError);
    throw new Error(`KY3P migration process failed: ${errorMessage}`);
  }
}

// ========================================
// MODULE EXECUTION LOGIC
// ========================================

/**
 * Determine if this file is being executed as the main module
 * Enables direct script execution while maintaining importability
 */
const isMainModule = import.meta.url.endsWith(process.argv[1]);

/**
 * Execute migration when script is run directly
 * Provides clean exit codes for automation and CI/CD pipelines
 */
if (isMainModule) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((executionError: unknown) => {
      const errorMessage = executionError instanceof Error ? executionError.message : String(executionError);
      process.stderr.write(`KY3P migration execution failed: ${errorMessage}\n`);
      process.exit(1);
    });
}

// ========================================
// EXPORTS
// ========================================

export { migrateKy3pResponses, verifyMigration };

