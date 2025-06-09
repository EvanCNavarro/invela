/**
 * ========================================
 * FinTech Tab Migration API Routes
 * ========================================
 * 
 * API endpoints for executing the Phase 1 FinTech tab unlocking migration.
 * Provides safe, controlled migration with comprehensive logging and validation.
 * 
 * @version 1.0.0
 * @author 10X Developer Implementation
 * @date 2025-06-09
 */

import { Router } from 'express';
import { db } from '@db';
import { companies } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// =============================================================================
// MIGRATION CONFIGURATION
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
 * Migration logger for consistent formatting
 */
const migrationLogger = {
  info: (message: string, meta?: Record<string, any>) => {
    logger.info(`[FinTechTabMigration] ${message}`, meta);
  },
  error: (message: string, meta?: Record<string, any>) => {
    logger.error(`[FinTechTabMigration] ${message}`, meta);
  },
  warn: (message: string, meta?: Record<string, any>) => {
    logger.warn(`[FinTechTabMigration] ${message}`, meta);
  },
  debug: (message: string, meta?: Record<string, any>) => {
    logger.debug(`[FinTechTabMigration] ${message}`, meta);
  }
};

// =============================================================================
// MIGRATION FUNCTIONS
// =============================================================================

/**
 * Analyzes current FinTech companies and their tab states
 */
async function analyzeFinTechCompanies() {
  const startTime = performance.now();
  
  migrationLogger.info('Analyzing FinTech companies for tab migration');

  try {
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

    const companyStates = fintechCompanies.map(company => {
      const currentTabs = Array.isArray(company.available_tabs) ? company.available_tabs : ['task-center'];
      const hasAllTargetTabs = FINTECH_TARGET_TABS.every(tab => currentTabs.includes(tab));
      const needsUpdate = !hasAllTargetTabs;

      return {
        id: company.id,
        name: company.name,
        currentTabs,
        needsUpdate,
        isDemo: company.is_demo || false
      };
    });

    const analysisTime = performance.now() - startTime;
    const needsUpdateCount = companyStates.filter(state => state.needsUpdate).length;

    migrationLogger.info('FinTech company analysis completed', {
      totalCompanies: companyStates.length,
      companiesNeedingUpdate: needsUpdateCount,
      companiesAlreadyUpdated: companyStates.length - needsUpdateCount,
      analysisTime: `${analysisTime.toFixed(2)}ms`
    });

    return companyStates;

  } catch (error) {
    const analysisTime = performance.now() - startTime;
    migrationLogger.error('Failed to analyze FinTech companies', {
      error: error instanceof Error ? error.message : String(error),
      analysisTime: `${analysisTime.toFixed(2)}ms`
    });
    throw error;
  }
}

/**
 * Updates FinTech companies to have all target tabs
 */
async function updateFinTechCompanyTabs(dryRun: boolean = false) {
  const migrationStartTime = performance.now();
  
  migrationLogger.info('Starting FinTech tab migration', {
    targetTabs: FINTECH_TARGET_TABS,
    dryRun
  });

  const result = {
    success: false,
    totalProcessed: 0,
    companiesUpdated: 0,
    companiesSkipped: 0,
    errors: [] as Array<{ companyId: number; companyName: string; error: string }>,
    executionTime: 0,
    dryRun
  };

  try {
    // Step 1: Analyze current state
    const companyStates = await analyzeFinTechCompanies();
    const companiesToUpdate = companyStates.filter(state => state.needsUpdate);
    
    result.totalProcessed = companyStates.length;
    result.companiesSkipped = companyStates.length - companiesToUpdate.length;

    migrationLogger.info('Migration batch prepared', {
      totalCompanies: result.totalProcessed,
      companiesNeedingUpdate: companiesToUpdate.length,
      companiesAlreadyUpToDate: result.companiesSkipped,
      dryRun
    });

    // Step 2: Process companies that need updates
    for (const companyState of companiesToUpdate) {
      try {
        if (dryRun) {
          migrationLogger.info('DRY RUN: Would update company tabs', {
            companyId: companyState.id,
            companyName: companyState.name,
            currentTabs: companyState.currentTabs,
            targetTabs: FINTECH_TARGET_TABS
          });
          result.companiesUpdated++;
        } else {
          // Perform actual database update
          await db.transaction(async (tx) => {
            await tx
              .update(companies)
              .set({
                available_tabs: [...FINTECH_TARGET_TABS],
                updated_at: new Date()
              })
              .where(eq(companies.id, companyState.id));
          });

          migrationLogger.info('Successfully updated company tabs', {
            companyId: companyState.id,
            companyName: companyState.name,
            previousTabs: companyState.currentTabs,
            newTabs: FINTECH_TARGET_TABS
          });
          result.companiesUpdated++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push({
          companyId: companyState.id,
          companyName: companyState.name,
          error: errorMessage
        });
        
        migrationLogger.error('Error updating company', {
          companyId: companyState.id,
          companyName: companyState.name,
          error: errorMessage
        });
      }
    }

    // Step 3: Calculate final results
    result.executionTime = performance.now() - migrationStartTime;
    result.success = result.errors.length === 0;

    if (result.success) {
      migrationLogger.info('FinTech tab migration completed successfully', {
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
      migrationLogger.error('FinTech tab migration completed with errors', {
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
      error: error instanceof Error ? error.message : String(error)
    };
    result.errors.push(criticalError);

    migrationLogger.error('Critical error during FinTech tab migration', {
      error: error instanceof Error ? error.message : String(error),
      executionTime: `${result.executionTime.toFixed(2)}ms`
    });

    return result;
  }
}

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * GET /api/fintech-tab-migration/analyze
 * Analyzes current FinTech company tab states without making changes
 */
router.get('/analyze', requireAuth, async (req, res) => {
  try {
    migrationLogger.info('API request to analyze FinTech companies', {
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    const companyStates = await analyzeFinTechCompanies();
    
    const summary = {
      totalCompanies: companyStates.length,
      companiesNeedingUpdate: companyStates.filter(state => state.needsUpdate).length,
      companiesAlreadyUpdated: companyStates.filter(state => !state.needsUpdate).length,
      targetTabs: FINTECH_TARGET_TABS,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      summary,
      companies: companyStates.map(state => ({
        id: state.id,
        name: state.name,
        currentTabs: state.currentTabs,
        needsUpdate: state.needsUpdate,
        isDemo: state.isDemo
      }))
    });

  } catch (error) {
    migrationLogger.error('Error in analyze endpoint', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to analyze FinTech companies',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/fintech-tab-migration/dry-run
 * Performs a dry run of the migration without making database changes
 */
router.post('/dry-run', requireAuth, async (req, res) => {
  try {
    migrationLogger.info('API request for dry run migration', {
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    const result = await updateFinTechCompanyTabs(true);
    
    res.json({
      success: result.success,
      dryRun: true,
      summary: {
        totalProcessed: result.totalProcessed,
        companiesWouldBeUpdated: result.companiesUpdated,
        companiesAlreadyUpToDate: result.companiesSkipped,
        errors: result.errors,
        executionTime: `${result.executionTime.toFixed(2)}ms`,
        targetTabs: FINTECH_TARGET_TABS
      },
      message: result.success 
        ? 'Dry run completed successfully - ready for production migration'
        : 'Dry run completed with errors - review before proceeding'
    });

  } catch (error) {
    migrationLogger.error('Error in dry-run endpoint', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to execute dry run migration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/fintech-tab-migration/execute
 * Executes the actual migration with database updates
 */
router.post('/execute', requireAuth, async (req, res) => {
  try {
    migrationLogger.info('API request for production migration execution', {
      userId: req.user?.id,
      userEmail: req.user?.email,
      timestamp: new Date().toISOString(),
      warning: 'PRODUCTION MIGRATION STARTING'
    });

    const result = await updateFinTechCompanyTabs(false);
    
    // Log final result for audit trail
    migrationLogger.info('Production migration execution completed', {
      success: result.success,
      totalProcessed: result.totalProcessed,
      companiesUpdated: result.companiesUpdated,
      companiesSkipped: result.companiesSkipped,
      errorCount: result.errors.length,
      executionTime: `${result.executionTime.toFixed(2)}ms`,
      userId: req.user?.id,
      userEmail: req.user?.email,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: result.success,
      dryRun: false,
      summary: {
        totalProcessed: result.totalProcessed,
        companiesUpdated: result.companiesUpdated,
        companiesSkipped: result.companiesSkipped,
        errors: result.errors,
        executionTime: `${result.executionTime.toFixed(2)}ms`,
        targetTabs: FINTECH_TARGET_TABS
      },
      message: result.success 
        ? 'Migration completed successfully - all FinTech companies now have access to all 5 tabs'
        : 'Migration completed with errors - some companies may need manual review'
    });

  } catch (error) {
    migrationLogger.error('Critical error in execute endpoint', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.id,
      userEmail: req.user?.email,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Failed to execute production migration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/fintech-tab-migration/test-single/:companyId
 * Tests migration on a single company for validation
 */
router.post('/test-single/:companyId', requireAuth, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    if (isNaN(companyId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid company ID provided'
      });
    }

    migrationLogger.info('API request for single company test migration', {
      companyId,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    // First check if company exists and is FinTech
    const [company] = await db
      .select({
        id: companies.id,
        name: companies.name,
        category: companies.category,
        available_tabs: companies.available_tabs
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      return res.status(404).json({
        success: false,
        error: `Company with ID ${companyId} not found`
      });
    }

    if (company.category !== 'FinTech') {
      return res.status(400).json({
        success: false,
        error: `Company ${company.name} is not a FinTech company (category: ${company.category})`
      });
    }

    // Perform single company update
    const startTime = performance.now();
    
    await db.transaction(async (tx) => {
      await tx
        .update(companies)
        .set({
          available_tabs: [...FINTECH_TARGET_TABS],
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId));
    });

    const executionTime = performance.now() - startTime;

    migrationLogger.info('Single company test migration completed', {
      companyId,
      companyName: company.name,
      previousTabs: company.available_tabs,
      newTabs: FINTECH_TARGET_TABS,
      executionTime: `${executionTime.toFixed(2)}ms`
    });

    res.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        category: company.category,
        previousTabs: company.available_tabs,
        newTabs: FINTECH_TARGET_TABS
      },
      executionTime: `${executionTime.toFixed(2)}ms`,
      message: `Successfully updated tabs for ${company.name}`
    });

  } catch (error) {
    migrationLogger.error('Error in test-single endpoint', {
      companyId: req.params.companyId,
      error: error instanceof Error ? error.message : String(error),
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to execute single company test migration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;