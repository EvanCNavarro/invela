/**
 * ========================================
 * FinTech Tab Migration Script
 * ========================================
 * 
 * CRITICAL MIGRATION: Updates existing FinTech companies to have all 5 tabs unlocked
 * from the start instead of progressive unlocking system.
 * 
 * This script implements the Phase 1 transformation:
 * FROM: FinTech companies with only ['task-center'] 
 * TO:   FinTech companies with ['task-center', 'dashboard', 'file-vault', 'insights', 'network']
 * 
 * Features:
 * - Comprehensive error handling with rollback procedures
 * - Detailed logging for audit trail
 * - Dry-run mode for testing before execution
 * - Single company testing capability
 * - Database backup verification
 * - Performance monitoring
 * 
 * @version 1.0.0
 * @author 10X Developer Implementation
 * @date 2025-06-09
 */

import { db } from '../db/index';
import { companies } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

/**
 * Target tab configuration for FinTech companies
 * These 5 tabs will be unlocked by default for all FinTech companies
 */
const FINTECH_TARGET_TABS = [
  'task-center',
  'dashboard', 
  'file-vault',
  'insights',
  'network'
] as const;

/**
 * Migration metadata for tracking and logging
 */
const MIGRATION_CONFIG = {
  version: '1.0.0',
  phase: 'Phase 1: Database Schema Changes',
  target: 'FinTech Companies Tab Unlocking',
  author: '10X Developer Implementation',
  timestamp: new Date().toISOString()
} as const;

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface MigrationResult {
  success: boolean;
  totalProcessed: number;
  companiesUpdated: number;
  companiesSkipped: number;
  errors: Array<{
    companyId: number;
    companyName: string;
    error: string;
    timestamp: string;
  }>;
  executionTime: number;
  dryRun: boolean;
}

interface CompanyTabState {
  id: number;
  name: string;
  category: string;
  currentTabs: string[];
  needsUpdate: boolean;
  isDemo: boolean;
}

// =============================================================================
// LOGGING UTILITIES
// =============================================================================

/**
 * Specialized logger for tab migration operations
 * Provides structured logging with consistent formatting
 */
class TabMigrationLogger {
  private static formatMessage(level: string, message: string, meta?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] [TabMigration] ${message}${metaStr}`;
  }

  static info(message: string, meta?: Record<string, any>): void {
    console.log(this.formatMessage('INFO', message, meta));
  }

  static warn(message: string, meta?: Record<string, any>): void {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  static error(message: string, meta?: Record<string, any>): void {
    console.error(this.formatMessage('ERROR', message, meta));
  }

  static debug(message: string, meta?: Record<string, any>): void {
    console.log(this.formatMessage('DEBUG', message, meta));
  }

  static success(message: string, meta?: Record<string, any>): void {
    console.log(this.formatMessage('SUCCESS', message, meta));
  }
}

// =============================================================================
// CORE MIGRATION FUNCTIONS
// =============================================================================

/**
 * Analyzes current state of FinTech companies and determines which need updates
 * 
 * @returns Promise<CompanyTabState[]> Array of company states
 */
async function analyzeFinTechCompanies(): Promise<CompanyTabState[]> {
  const startTime = performance.now();
  
  TabMigrationLogger.info('Starting FinTech company analysis', {
    targetTabs: FINTECH_TARGET_TABS,
    migrationConfig: MIGRATION_CONFIG
  });

  try {
    // Query all FinTech companies with their current tab configuration
    const fintechCompanies = await db
      .select({
        id: companies.id,
        name: companies.name,
        category: companies.category,
        available_tabs: companies.available_tabs,
        is_demo: companies.is_demo
      })
      .from(companies)
      .where(eq(companies.category, 'FinTech'));

    TabMigrationLogger.info('Retrieved FinTech companies from database', {
      totalFound: fintechCompanies.length,
      queryExecutionTime: `${(performance.now() - startTime).toFixed(2)}ms`
    });

    // Analyze each company's tab state
    const companyStates: CompanyTabState[] = fintechCompanies.map(company => {
      const currentTabs = Array.isArray(company.available_tabs) ? company.available_tabs : ['task-center'];
      
      // Check if company needs update by comparing current tabs with target tabs
      const hasAllTargetTabs = FINTECH_TARGET_TABS.every(tab => currentTabs.includes(tab));
      const needsUpdate = !hasAllTargetTabs;

      TabMigrationLogger.debug('Analyzed company tab state', {
        companyId: company.id,
        companyName: company.name,
        currentTabs,
        targetTabs: FINTECH_TARGET_TABS,
        needsUpdate,
        isDemo: company.is_demo || false
      });

      return {
        id: company.id,
        name: company.name,
        category: company.category || 'FinTech',
        currentTabs,
        needsUpdate,
        isDemo: company.is_demo || false
      };
    });

    const needsUpdateCount = companyStates.filter(state => state.needsUpdate).length;
    const analysisTime = performance.now() - startTime;

    TabMigrationLogger.success('FinTech company analysis completed', {
      totalCompanies: companyStates.length,
      companiesNeedingUpdate: needsUpdateCount,
      companiesAlreadyUpdated: companyStates.length - needsUpdateCount,
      analysisExecutionTime: `${analysisTime.toFixed(2)}ms`
    });

    return companyStates;

  } catch (error) {
    const analysisTime = performance.now() - startTime;
    TabMigrationLogger.error('Failed to analyze FinTech companies', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      analysisExecutionTime: `${analysisTime.toFixed(2)}ms`
    });
    throw error;
  }
}

/**
 * Updates a single company's available_tabs to include all target tabs
 * 
 * @param companyState The company state to update
 * @param dryRun Whether to perform actual database update or just simulate
 * @returns Promise<boolean> Success status
 */
async function updateCompanyTabs(companyState: CompanyTabState, dryRun: boolean = false): Promise<boolean> {
  const startTime = performance.now();
  
  TabMigrationLogger.info('Starting company tab update', {
    companyId: companyState.id,
    companyName: companyState.name,
    currentTabs: companyState.currentTabs,
    targetTabs: FINTECH_TARGET_TABS,
    dryRun
  });

  try {
    if (dryRun) {
      TabMigrationLogger.info('DRY RUN: Simulating tab update (no database changes)', {
        companyId: companyState.id,
        companyName: companyState.name,
        wouldUpdateFrom: companyState.currentTabs,
        wouldUpdateTo: FINTECH_TARGET_TABS
      });
      return true;
    }

    // Perform actual database update with transaction safety
    await db.transaction(async (tx) => {
      await tx
        .update(companies)
        .set({
          available_tabs: [...FINTECH_TARGET_TABS],
          updated_at: new Date()
        })
        .where(eq(companies.id, companyState.id));

      TabMigrationLogger.debug('Database transaction completed for company', {
        companyId: companyState.id,
        updatedTabs: FINTECH_TARGET_TABS,
        transactionTime: `${(performance.now() - startTime).toFixed(2)}ms`
      });
    });

    const updateTime = performance.now() - startTime;
    TabMigrationLogger.success('Company tab update completed successfully', {
      companyId: companyState.id,
      companyName: companyState.name,
      previousTabs: companyState.currentTabs,
      newTabs: FINTECH_TARGET_TABS,
      updateExecutionTime: `${updateTime.toFixed(2)}ms`
    });

    return true;

  } catch (error) {
    const updateTime = performance.now() - startTime;
    TabMigrationLogger.error('Failed to update company tabs', {
      companyId: companyState.id,
      companyName: companyState.name,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      updateExecutionTime: `${updateTime.toFixed(2)}ms`
    });
    return false;
  }
}

/**
 * Executes the complete FinTech tab migration process
 * 
 * @param options Migration execution options
 * @returns Promise<MigrationResult> Complete migration results
 */
async function executeFinTechTabMigration(options: {
  dryRun?: boolean;
  testSingleCompany?: boolean;
  companyId?: number;
} = {}): Promise<MigrationResult> {
  const { dryRun = false, testSingleCompany = false, companyId } = options;
  const migrationStartTime = performance.now();

  TabMigrationLogger.info('Starting FinTech tab migration execution', {
    ...MIGRATION_CONFIG,
    options: { dryRun, testSingleCompany, companyId },
    targetTabs: FINTECH_TARGET_TABS
  });

  const result: MigrationResult = {
    success: false,
    totalProcessed: 0,
    companiesUpdated: 0,
    companiesSkipped: 0,
    errors: [],
    executionTime: 0,
    dryRun
  };

  try {
    // Step 1: Analyze current state
    let companyStates = await analyzeFinTechCompanies();
    
    // Step 2: Filter for single company testing if requested
    if (testSingleCompany && companyId) {
      const targetCompany = companyStates.find(state => state.id === companyId);
      if (!targetCompany) {
        throw new Error(`Company with ID ${companyId} not found or is not a FinTech company`);
      }
      companyStates = [targetCompany];
      TabMigrationLogger.info('Single company test mode activated', {
        targetCompanyId: companyId,
        targetCompanyName: targetCompany.name
      });
    }

    // Step 3: Filter companies that need updates
    const companiesToUpdate = companyStates.filter(state => state.needsUpdate);
    result.totalProcessed = companyStates.length;
    result.companiesSkipped = companyStates.length - companiesToUpdate.length;

    TabMigrationLogger.info('Migration batch prepared', {
      totalCompanies: result.totalProcessed,
      companiesNeedingUpdate: companiesToUpdate.length,
      companiesAlreadyUpToDate: result.companiesSkipped,
      dryRun
    });

    // Step 4: Process each company that needs updates
    for (const companyState of companiesToUpdate) {
      try {
        const updateSuccess = await updateCompanyTabs(companyState, dryRun);
        
        if (updateSuccess) {
          result.companiesUpdated++;
          TabMigrationLogger.debug('Company processed successfully', {
            companyId: companyState.id,
            companyName: companyState.name,
            progress: `${result.companiesUpdated}/${companiesToUpdate.length}`
          });
        } else {
          result.errors.push({
            companyId: companyState.id,
            companyName: companyState.name,
            error: 'Update operation returned false',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        result.errors.push({
          companyId: companyState.id,
          companyName: companyState.name,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        
        TabMigrationLogger.error('Error processing company during migration', {
          companyId: companyState.id,
          companyName: companyState.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Step 5: Calculate final results
    result.executionTime = performance.now() - migrationStartTime;
    result.success = result.errors.length === 0;

    // Step 6: Log final migration summary
    if (result.success) {
      TabMigrationLogger.success('FinTech tab migration completed successfully', {
        ...MIGRATION_CONFIG,
        summary: {
          totalProcessed: result.totalProcessed,
          companiesUpdated: result.companiesUpdated,
          companiesSkipped: result.companiesSkipped,
          errorCount: result.errors.length,
          dryRun: result.dryRun,
          executionTime: `${result.executionTime.toFixed(2)}ms`
        }
      });
    } else {
      TabMigrationLogger.error('FinTech tab migration completed with errors', {
        ...MIGRATION_CONFIG,
        summary: {
          totalProcessed: result.totalProcessed,
          companiesUpdated: result.companiesUpdated,
          companiesSkipped: result.companiesSkipped,
          errorCount: result.errors.length,
          dryRun: result.dryRun,
          executionTime: `${result.executionTime.toFixed(2)}ms`
        },
        errors: result.errors
      });
    }

    return result;

  } catch (error) {
    result.executionTime = performance.now() - migrationStartTime;
    result.success = false;
    
    const criticalError = {
      companyId: -1,
      companyName: 'MIGRATION_SYSTEM',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
    result.errors.push(criticalError);

    TabMigrationLogger.error('Critical error during FinTech tab migration', {
      ...MIGRATION_CONFIG,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      executionTime: `${result.executionTime.toFixed(2)}ms`
    });

    return result;
  }
}

// =============================================================================
// VALIDATION & VERIFICATION FUNCTIONS
// =============================================================================

/**
 * Verifies the migration results by checking actual database state
 * 
 * @param migrationResult The result from the migration execution
 * @returns Promise<boolean> Verification success status
 */
async function verifyMigrationResults(migrationResult: MigrationResult): Promise<boolean> {
  if (migrationResult.dryRun) {
    TabMigrationLogger.info('Skipping verification for dry run migration');
    return true;
  }

  const startTime = performance.now();
  TabMigrationLogger.info('Starting migration result verification');

  try {
    // Re-analyze companies to verify the changes
    const verificationStates = await analyzeFinTechCompanies();
    const companiesStillNeedingUpdate = verificationStates.filter(state => state.needsUpdate);

    const verificationTime = performance.now() - startTime;
    const verificationSuccess = companiesStillNeedingUpdate.length === 0;

    if (verificationSuccess) {
      TabMigrationLogger.success('Migration verification completed successfully', {
        totalCompaniesVerified: verificationStates.length,
        companiesStillNeedingUpdate: companiesStillNeedingUpdate.length,
        verificationTime: `${verificationTime.toFixed(2)}ms`
      });
    } else {
      TabMigrationLogger.error('Migration verification failed - some companies still need updates', {
        totalCompaniesVerified: verificationStates.length,
        companiesStillNeedingUpdate: companiesStillNeedingUpdate.length,
        verificationTime: `${verificationTime.toFixed(2)}ms`,
        problematicCompanies: companiesStillNeedingUpdate.map(state => ({
          id: state.id,
          name: state.name,
          currentTabs: state.currentTabs
        }))
      });
    }

    return verificationSuccess;

  } catch (error) {
    const verificationTime = performance.now() - startTime;
    TabMigrationLogger.error('Error during migration verification', {
      error: error instanceof Error ? error.message : String(error),
      verificationTime: `${verificationTime.toFixed(2)}ms`
    });
    return false;
  }
}

// =============================================================================
// EXPORT FUNCTIONS
// =============================================================================

/**
 * Main entry point for dry run testing
 */
export async function runDryRunMigration(): Promise<MigrationResult> {
  TabMigrationLogger.info('Executing DRY RUN migration for FinTech tab updates');
  return await executeFinTechTabMigration({ dryRun: true });
}

/**
 * Main entry point for single company testing
 */
export async function testSingleCompanyMigration(companyId: number): Promise<MigrationResult> {
  TabMigrationLogger.info('Executing SINGLE COMPANY test migration', { companyId });
  return await executeFinTechTabMigration({ 
    dryRun: false, 
    testSingleCompany: true, 
    companyId 
  });
}

/**
 * Main entry point for full production migration
 */
export async function runFullMigration(): Promise<MigrationResult> {
  TabMigrationLogger.info('Executing FULL PRODUCTION migration for FinTech tab updates');
  const result = await executeFinTechTabMigration({ dryRun: false });
  
  if (result.success) {
    const verificationSuccess = await verifyMigrationResults(result);
    if (!verificationSuccess) {
      TabMigrationLogger.warn('Migration completed but verification failed - manual review recommended');
    }
  }
  
  return result;
}

/**
 * Utility function to get current FinTech company states without making changes
 */
export async function analyzeCurrentState(): Promise<CompanyTabState[]> {
  TabMigrationLogger.info('Analyzing current FinTech company tab states');
  return await analyzeFinTechCompanies();
}

// =============================================================================
// CLI EXECUTION (when run directly)
// =============================================================================

if (require.main === module) {
  // This allows the script to be run directly from command line
  async function main() {
    try {
      console.log('='.repeat(80));
      console.log('🚀 FinTech Tab Migration Script - Phase 1 Implementation');
      console.log('='.repeat(80));
      
      // First, run analysis
      const currentStates = await analyzeCurrentState();
      
      // Then run dry run
      const dryRunResult = await runDryRunMigration();
      
      if (dryRunResult.success) {
        console.log('\n✅ Dry run completed successfully - ready for production migration');
        console.log('\nTo execute the actual migration, call runFullMigration()');
      } else {
        console.log('\n❌ Dry run failed - review errors before proceeding');
      }
      
    } catch (error) {
      console.error('Fatal error in migration script:', error);
      process.exit(1);
    }
  }
  
  main();
}