/**
 * Status Value Migration Script - Database standardization for field status values
 * 
 * Normalizes all field status values across response tables to use consistent
 * lowercase formatting, ensuring compatibility with FieldStatus enum definitions.
 * Processes KYB, KY3P, and Open Banking response tables with comprehensive
 * validation and verification procedures for data integrity compliance.
 * 
 * Migration Process:
 * 1. Scans all response tables for uppercase status values
 * 2. Executes targeted UPDATE operations for each status type
 * 3. Verifies migration completeness with validation queries
 */

// ========================================
// IMPORTS
// ========================================

// External library imports (alphabetical)
import { and, eq, like, or, sql } from 'drizzle-orm';

// Internal absolute path imports (alphabetical)
import { db } from '@db';
import { kybResponses, ky3pResponses, openBankingResponses } from '@db/schema';

// ========================================
// CONSTANTS
// ========================================

/**
 * Standardized status value constants for database consistency
 * Prevents TypeScript type errors with drizzle-orm operations
 */
const FIELD_STATUS_VALUES = {
  COMPLETE: 'complete',
  EMPTY: 'empty', 
  INCOMPLETE: 'incomplete',
  INVALID: 'invalid'
} as const;

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Check for uppercase status values across all response tables
 * 
 * Scans KYB, KY3P, and Open Banking response tables to identify records
 * with uppercase status values that require migration to lowercase format.
 * Provides comprehensive count analysis for migration planning.
 * 
 * @returns Promise resolving to boolean indicating if migration is needed
 * 
 * @throws {Error} When database query operations fail
 */
async function checkForUppercaseStatusValues(): Promise<boolean> {
  try {
    // Check KYB responses for uppercase status values
    const kybUppercaseResult = await db.select({ count: sql<number>`count(*)` })
      .from(kybResponses)
      .where(
        and(
          or(
            like(kybResponses.status, '%COMPLETE%'),
            like(kybResponses.status, '%EMPTY%'),
            like(kybResponses.status, '%INCOMPLETE%'),
            like(kybResponses.status, '%INVALID%')
          ),
          sql`${kybResponses.status} != ${FIELD_STATUS_VALUES.COMPLETE} AND 
              ${kybResponses.status} != ${FIELD_STATUS_VALUES.EMPTY} AND 
              ${kybResponses.status} != ${FIELD_STATUS_VALUES.INCOMPLETE} AND 
              ${kybResponses.status} != ${FIELD_STATUS_VALUES.INVALID}`
        )
      );
    
    // Check KY3P responses for uppercase status values
    const ky3pUppercaseResult = await db.select({ count: sql<number>`count(*)` })
      .from(ky3pResponses)
      .where(
        and(
          or(
            like(ky3pResponses.status, '%COMPLETE%'),
            like(ky3pResponses.status, '%EMPTY%'),
            like(ky3pResponses.status, '%INCOMPLETE%'),
            like(ky3pResponses.status, '%INVALID%')
          ),
          sql`${ky3pResponses.status} != ${FIELD_STATUS_VALUES.COMPLETE} AND 
              ${ky3pResponses.status} != ${FIELD_STATUS_VALUES.EMPTY} AND 
              ${ky3pResponses.status} != ${FIELD_STATUS_VALUES.INCOMPLETE} AND 
              ${ky3pResponses.status} != ${FIELD_STATUS_VALUES.INVALID}`
        )
      );
    
    // Check Open Banking responses for uppercase status values
    const openBankingUppercaseResult = await db.select({ count: sql<number>`count(*)` })
      .from(openBankingResponses)
      .where(
        and(
          or(
            like(openBankingResponses.status, '%COMPLETE%'),
            like(openBankingResponses.status, '%EMPTY%'),
            like(openBankingResponses.status, '%INCOMPLETE%'),
            like(openBankingResponses.status, '%INVALID%')
          ),
          sql`${openBankingResponses.status} != ${FIELD_STATUS_VALUES.COMPLETE} AND 
              ${openBankingResponses.status} != ${FIELD_STATUS_VALUES.EMPTY} AND 
              ${openBankingResponses.status} != ${FIELD_STATUS_VALUES.INCOMPLETE} AND 
              ${openBankingResponses.status} != ${FIELD_STATUS_VALUES.INVALID}`
        )
      );
    
    const totalRequiringMigration = 
      kybUppercaseResult[0].count + 
      ky3pUppercaseResult[0].count + 
      openBankingUppercaseResult[0].count;
    
    return totalRequiringMigration > 0;
    
  } catch (checkError: unknown) {
    const errorMessage = checkError instanceof Error ? checkError.message : String(checkError);
    throw new Error(`Status value check failed: ${errorMessage}`);
  }
}

/**
 * Execute status value migration across all response tables
 * 
 * Performs targeted UPDATE operations to convert uppercase status values
 * to lowercase format across KYB, KY3P, and Open Banking response tables.
 * Uses efficient batch operations for optimal database performance.
 * 
 * @returns Promise that resolves when all migrations complete successfully
 * 
 * @throws {Error} When database update operations fail
 */
async function migrateStatusValues(): Promise<void> {
  try {
    // Migrate KYB responses to lowercase status values
    await db.update(kybResponses)
      .set({ status: FIELD_STATUS_VALUES.COMPLETE })
      .where(like(kybResponses.status, '%COMPLETE%'));
      
    await db.update(kybResponses)
      .set({ status: FIELD_STATUS_VALUES.EMPTY })
      .where(like(kybResponses.status, '%EMPTY%'));
      
    await db.update(kybResponses)
      .set({ status: FIELD_STATUS_VALUES.INCOMPLETE })
      .where(like(kybResponses.status, '%INCOMPLETE%'));
      
    await db.update(kybResponses)
      .set({ status: FIELD_STATUS_VALUES.INVALID })
      .where(like(kybResponses.status, '%INVALID%'));
    
    // Migrate KY3P responses to lowercase status values
    await db.update(ky3pResponses)
      .set({ status: FIELD_STATUS_VALUES.COMPLETE })
      .where(like(ky3pResponses.status, '%COMPLETE%'));
      
    await db.update(ky3pResponses)
      .set({ status: FIELD_STATUS_VALUES.EMPTY })
      .where(like(ky3pResponses.status, '%EMPTY%'));
      
    await db.update(ky3pResponses)
      .set({ status: FIELD_STATUS_VALUES.INCOMPLETE })
      .where(like(ky3pResponses.status, '%INCOMPLETE%'));
      
    await db.update(ky3pResponses)
      .set({ status: FIELD_STATUS_VALUES.INVALID })
      .where(like(ky3pResponses.status, '%INVALID%'));
    
    // Migrate Open Banking responses to lowercase status values
    await db.update(openBankingResponses)
      .set({ status: FIELD_STATUS_VALUES.COMPLETE })
      .where(like(openBankingResponses.status, '%COMPLETE%'));
      
    await db.update(openBankingResponses)
      .set({ status: FIELD_STATUS_VALUES.EMPTY })
      .where(like(openBankingResponses.status, '%EMPTY%'));
      
    await db.update(openBankingResponses)
      .set({ status: FIELD_STATUS_VALUES.INCOMPLETE })
      .where(like(openBankingResponses.status, '%INCOMPLETE%'));
      
    await db.update(openBankingResponses)
      .set({ status: FIELD_STATUS_VALUES.INVALID })
      .where(like(openBankingResponses.status, '%INVALID%'));
    
  } catch (migrationError: unknown) {
    const errorMessage = migrationError instanceof Error ? migrationError.message : String(migrationError);
    throw new Error(`Status value migration failed: ${errorMessage}`);
  }
}

/**
 * Execute complete status migration workflow with verification
 * 
 * Orchestrates the full status value migration process including pre-check,
 * migration execution, and post-migration verification for data integrity.
 * 
 * @returns Promise that resolves when migration workflow completes
 * 
 * @throws {Error} When migration process fails at any stage
 */
async function run(): Promise<void> {
  try {
    // Check if migration is required
    const needsMigration = await checkForUppercaseStatusValues();
    
    if (needsMigration) {
      // Execute migration
      await migrateStatusValues();
      
      // Verify migration success
      const postMigrationCheck = await checkForUppercaseStatusValues();
      if (postMigrationCheck) {
        throw new Error('Migration verification failed: Uppercase values still detected');
      }
    }
  } catch (runError: unknown) {
    const errorMessage = runError instanceof Error ? runError.message : String(runError);
    throw new Error(`Status migration workflow failed: ${errorMessage}`);
  }
}

// ========================================
// MODULE EXECUTION LOGIC
// ========================================

/**
 * Determine if this file is being executed as the main module
 * Enables direct script execution while maintaining importability
 */
const isMainModule = process.argv[1].includes('status-value-migration.ts');

/**
 * Execute migration when script is run directly
 * Provides clean exit codes for automation and CI/CD pipelines
 */
if (isMainModule) {
  run()
    .then(() => process.exit(0))
    .catch((executionError: unknown) => {
      const errorMessage = executionError instanceof Error ? executionError.message : String(executionError);
      process.stderr.write(`Status migration execution failed: ${errorMessage}\n`);
      process.exit(1);
    });
}

// ========================================
// EXPORTS
// ========================================

export { checkForUppercaseStatusValues, migrateStatusValues };
