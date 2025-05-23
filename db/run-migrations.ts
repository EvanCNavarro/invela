/**
 * Database Migration Runner - Coordinated execution of data consistency migrations
 * 
 * Orchestrates multiple database migrations in proper sequence to ensure data integrity
 * and consistency across all application tables. Executes critical data transformations
 * including field key population and status value standardization with comprehensive
 * error handling and verification procedures.
 * 
 * Migration Sequence:
 * 1. KY3P Field Key Migration - Populates field_key values for response unification
 * 2. Status Value Standardization - Ensures lowercase status format consistency
 */

// ========================================
// IMPORTS
// ========================================

// Relative imports (alphabetical)
import { checkForUppercaseStatusValues, migrateStatusValues } from './status-value-migration';
import { migrateKy3pResponses, verifyMigration } from './migrate-ky3p-field-keys';

// ========================================
// CONSTANTS
// ========================================

/**
 * Migration process configuration and formatting constants
 */
const MIGRATION_CONFIG = {
  SECTION_SEPARATOR: '======================================================',
  STEP_SEPARATOR: '------------------------------------------------------',
  SUCCESS_PREFIX: '✅ Success:',
  WARNING_PREFIX: '⚠️ Warning:',
  ERROR_PREFIX: '❌ ERROR:'
} as const;

// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Migration execution result interface
 * Provides structured feedback on migration outcomes
 */
interface MigrationExecutionResult {
  success: boolean;
  step: string;
  message: string;
  timestamp: Date;
}

// ========================================
// MAIN IMPLEMENTATION
// ========================================

/**
 * Execute coordinated database migrations in proper sequence
 * 
 * Runs critical data consistency migrations with comprehensive error handling
 * and verification. Each migration step includes validation and rollback
 * procedures to ensure data integrity throughout the process.
 * 
 * @returns Promise that resolves when all migrations complete successfully
 * 
 * @throws {Error} When any migration step fails or verification does not pass
 */
async function runMigrations(): Promise<void> {
  const startTime = new Date();
  
  try {
    // Step 1: Execute KY3P Field Key Migration
    const ky3pMigrationResult = await migrateKy3pResponses();
    const ky3pVerificationResult = await verifyMigration();
    
    if (ky3pVerificationResult.nullCount > 0) {
      throw new Error(`KY3P migration verification failed: ${ky3pVerificationResult.nullCount} responses still missing field_key`);
    }
    
    // Step 2: Execute Status Value Standardization
    const needsStatusMigration = await checkForUppercaseStatusValues();
    
    if (needsStatusMigration) {
      await migrateStatusValues();
      const postMigrationCheck = await checkForUppercaseStatusValues();
      
      if (postMigrationCheck) {
        throw new Error('Status value migration verification failed: Uppercase values still detected');
      }
    }
    
    const completionTime = new Date();
    const duration = completionTime.getTime() - startTime.getTime();
    
    // Successfully completed all migrations
    return Promise.resolve();
    
  } catch (migrationError: unknown) {
    const errorMessage = migrationError instanceof Error ? migrationError.message : String(migrationError);
    throw new Error(`Database migration process failed: ${errorMessage}`);
  }
}

// ========================================
// MODULE EXECUTION LOGIC
// ========================================

/**
 * Determine if this file is being executed as the main module
 * Enables direct script execution while maintaining importability
 */
const isMainModule = process.argv[1].includes('run-migrations.ts');

/**
 * Execute migrations when script is run directly
 * Provides clean exit codes for automation and CI/CD pipelines
 */
if (isMainModule) {
  runMigrations()
    .then(() => {
      process.exit(0);
    })
    .catch((executionError: unknown) => {
      const errorMessage = executionError instanceof Error ? executionError.message : String(executionError);
      process.stderr.write(`Migration execution failed: ${errorMessage}\n`);
      process.exit(1);
    });
}

// ========================================
// EXPORTS
// ========================================

export { runMigrations as default };
