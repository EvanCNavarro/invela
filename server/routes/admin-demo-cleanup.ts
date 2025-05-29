/**
 * ========================================
 * Admin Demo Data Cleanup API
 * ========================================
 * 
 * Comprehensive paired API system for demo data cleanup with preview and deletion capabilities.
 * Follows best practices with safety mechanisms, detailed logging, and audit trails.
 * 
 * Key Features:
 * - Preview API: Shows what would be deleted before doing it
 * - Delete API: Performs actual deletion with confirmation tokens
 * - Configurable cleanup with filters (age, persona type, batch limits)
 * - Dry-run mode and detailed audit logging
 * - Database transactions for atomic operations
 * - Admin-only authorization with comprehensive validation
 * 
 * @module server/routes/admin-demo-cleanup
 * @version 1.0.0
 * @since 2025-05-29
 */

import { Router } from 'express';
import { db } from '@db';
import { 
  companies, 
  users, 
  tasks, 
  relationships, 
  invitations, 
  files,
  companyLogos
} from '@db/schema';
import { eq, and, lt, sql, inArray, isNotNull } from 'drizzle-orm';
import * as crypto from 'crypto';
// Simple console logger for demo cleanup operations
const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  warn: (message: string, data?: any) => console.warn(`[WARN] ${message}`, data || ''),
  error: (message: string, data?: any) => console.error(`[ERROR] ${message}`, data || '')
};

const router = Router();

// ========================================
// TYPES & INTERFACES
// ========================================

interface CleanupFilters {
  ageInDays?: number;
  personaTypes?: string[];
  maxBatchSize?: number;
  excludeCompanyIds?: number[];
  excludeUserIds?: number[];
  onlyExpired?: boolean;
  dryRun?: boolean;
}

interface CleanupSummary {
  companies: number;
  users: number;
  tasks: number;
  files: number;
  relationships: number;
  invitations: number;
  companyLogos: number;
  totalEntities: number;
}

interface CleanupDetails {
  companies: any[];
  users: any[];
  tasks: any[];
  files: any[];
  relationships: any[];
  invitations: any[];
  companyLogos: any[];
}

interface CleanupPreviewResponse {
  summary: CleanupSummary;
  details: CleanupDetails;
  warnings: string[];
  filters: CleanupFilters;
  timestamp: string;
  confirmationToken: string;
  estimatedDuration: string;
}

interface CleanupResult {
  success: boolean;
  summary: CleanupSummary;
  errors: string[];
  duration: number;
  timestamp: string;
  auditTrail: string[];
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Generate a secure confirmation token for cleanup operations
 */
function generateConfirmationToken(filters: CleanupFilters): string {
  const data = JSON.stringify(filters) + Date.now();
  return crypto.createHash('sha256').update(data).digest('hex').substr(0, 16);
}

/**
 * Validate confirmation token
 */
function validateConfirmationToken(token: string, filters: CleanupFilters): boolean {
  const expectedToken = generateConfirmationToken(filters);
  return token === expectedToken;
}

/**
 * Check if user has admin privileges
 */
async function checkAdminAccess(userId: number): Promise<boolean> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        company: true
      }
    });
    
    // Check if user is from Invela admin company or has admin role
    return user?.email?.includes('@invela.') || (user as any)?.company?.name === 'Invela';
  } catch (error) {
    logger.error('Error checking admin access:', (error as Error).message);
    return false;
  }
}

/**
 * Build cleanup query based on filters
 */
function buildDemoCompanyQuery(filters: CleanupFilters) {
  const conditions = [eq(companies.is_demo, true)];
  
  if (filters.ageInDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filters.ageInDays);
    conditions.push(lt(companies.created_at, cutoffDate));
  }
  
  if (filters.excludeCompanyIds && filters.excludeCompanyIds.length > 0) {
    conditions.push(sql`${companies.id} NOT IN (${filters.excludeCompanyIds.join(',')})`);
  }
  
  return conditions;
}

/**
 * Get demo data preview
 */
async function getDemoDataPreview(filters: CleanupFilters): Promise<{
  summary: CleanupSummary;
  details: CleanupDetails;
  warnings: string[];
}> {
  const warnings: string[] = [];
  
  // Get demo companies matching filters
  const demoCompanies = await db.query.companies.findMany({
    where: and(...buildDemoCompanyQuery(filters)),
    limit: filters.maxBatchSize || 1000,
    with: {
      users: true,
      tasks: true,
      relationships: true,
      logo: true
    }
  });
  
  if (demoCompanies.length === 0) {
    return {
      summary: {
        companies: 0,
        users: 0,
        tasks: 0,
        files: 0,
        relationships: 0,
        invitations: 0,
        companyLogos: 0,
        totalEntities: 0
      },
      details: {
        companies: [],
        users: [],
        tasks: [],
        files: [],
        relationships: [],
        invitations: [],
        companyLogos: []
      },
      warnings: ['No demo companies found matching the specified filters']
    };
  }
  
  const companyIds = demoCompanies.map(c => c.id);
  
  // Get related demo users
  let demoUsersQuery = [eq(users.is_demo_user, true)];
  if (companyIds.length > 0) {
    demoUsersQuery.push(inArray(users.company_id, companyIds));
  }
  if (filters.personaTypes && filters.personaTypes.length > 0) {
    demoUsersQuery.push(inArray(users.demo_persona_type, filters.personaTypes));
  }
  if (filters.excludeUserIds && filters.excludeUserIds.length > 0) {
    demoUsersQuery.push(sql`${users.id} NOT IN (${filters.excludeUserIds.join(',')})`);
  }
  if (filters.onlyExpired) {
    demoUsersQuery.push(lt(users.demo_expires_at, new Date()));
  }
  
  const demoUsers = await db.query.users.findMany({
    where: and(...demoUsersQuery),
    limit: filters.maxBatchSize || 1000
  });
  
  // Check for potential issues
  const adminUsers = demoUsers.filter(u => u.email?.includes('@invela.'));
  if (adminUsers.length > 0) {
    warnings.push(`${adminUsers.length} Invela admin users will be deleted`);
  }
  
  // Get related tasks
  const demoTasks = companyIds.length > 0 ? await db.query.tasks.findMany({
    where: inArray(tasks.company_id, companyIds),
    limit: filters.maxBatchSize || 5000
  }) : [];
  
  // Get related files
  const demoFiles = companyIds.length > 0 ? await db.query.files.findMany({
    where: inArray(files.company_id, companyIds),
    limit: filters.maxBatchSize || 5000
  }) : [];
  
  // Get related relationships
  const demoRelationships = companyIds.length > 0 ? await db.query.relationships.findMany({
    where: inArray(relationships.company_id, companyIds),
    limit: filters.maxBatchSize || 1000
  }) : [];
  
  // Get related invitations (if table exists)
  let demoInvitations: any[] = [];
  try {
    // Note: Invitations table might not exist - handle gracefully
    const invitationsExist = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'invitations'
      )
    `);
    
    if (invitationsExist.rows[0]?.exists && companyIds.length > 0) {
      demoInvitations = await db.execute(sql`
        SELECT * FROM invitations 
        WHERE company_id = ANY(${companyIds}) 
        LIMIT ${filters.maxBatchSize || 1000}
      `).then(result => result.rows);
    }
  } catch (error) {
    logger.warn('Invitations table not found or accessible:', error);
  }
  
  // Get company logos
  const demoLogos = demoCompanies
    .filter(c => c.logo)
    .map(c => c.logo)
    .filter(Boolean);
  
  const summary: CleanupSummary = {
    companies: demoCompanies.length,
    users: demoUsers.length,
    tasks: demoTasks.length,
    files: demoFiles.length,
    relationships: demoRelationships.length,
    invitations: demoInvitations.length,
    companyLogos: demoLogos.length,
    totalEntities: demoCompanies.length + demoUsers.length + demoTasks.length + 
                   demoFiles.length + demoRelationships.length + demoInvitations.length + demoLogos.length
  };
  
  const details: CleanupDetails = {
    companies: demoCompanies.map(c => ({
      id: c.id,
      name: c.name,
      created_at: c.created_at,
      num_employees: c.num_employees,
      category: c.category
    })),
    users: demoUsers.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      company_id: u.company_id,
      demo_persona_type: u.demo_persona_type,
      created_at: u.created_at
    })),
    tasks: demoTasks.map(t => ({
      id: t.id,
      title: t.title,
      task_type: t.task_type,
      company_id: t.company_id,
      status: t.status
    })),
    files: demoFiles.map(f => ({
      id: f.id,
      name: f.name,
      company_id: f.company_id,
      created_at: f.created_at
    })),
    relationships: demoRelationships.map(r => ({
      id: r.id,
      company_id: r.company_id,
      related_company_id: r.related_company_id,
      relationship_type: r.relationship_type
    })),
    invitations: demoInvitations.map(i => ({
      id: i.id,
      company_id: i.company_id,
      email: i.email,
      status: i.status
    })),
    companyLogos: demoLogos.map(l => ({
      id: l.id,
      company_id: l.company_id,
      file_name: l.file_name
    }))
  };
  
  return { summary, details, warnings };
}

// ========================================
// API ENDPOINTS
// ========================================

/**
 * Preview Demo Data Cleanup
 * GET /api/admin/demo-data/preview
 * 
 * Shows what would be deleted without actually performing the deletion.
 * Returns detailed breakdown and generates confirmation token for actual cleanup.
 */
router.get('/demo-data/preview', async (req, res) => {
  const startTime = Date.now();
  const requestId = `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info('[AdminCleanup] Starting demo data preview request', {
      requestId,
      userId: req.user?.id,
      query: req.query
    });
    
    // Check admin access
    if (!req.user || !(await checkAdminAccess(req.user.id))) {
      logger.warn('[AdminCleanup] Unauthorized preview attempt', {
        requestId,
        userId: req.user?.id
      });
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin privileges required for demo data cleanup operations'
      });
    }
    
    // Parse and validate filters
    const filters: CleanupFilters = {
      ageInDays: req.query.ageInDays ? parseInt(req.query.ageInDays as string) : undefined,
      personaTypes: req.query.personaTypes ? (req.query.personaTypes as string).split(',') : undefined,
      maxBatchSize: req.query.maxBatchSize ? parseInt(req.query.maxBatchSize as string) : 1000,
      excludeCompanyIds: req.query.excludeCompanyIds ? 
        (req.query.excludeCompanyIds as string).split(',').map(id => parseInt(id)) : [],
      excludeUserIds: req.query.excludeUserIds ? 
        (req.query.excludeUserIds as string).split(',').map(id => parseInt(id)) : [],
      onlyExpired: req.query.onlyExpired === 'true',
      dryRun: true // Always true for preview
    };
    
    logger.info('[AdminCleanup] Processing preview with filters', {
      requestId,
      filters
    });
    
    // Get preview data
    const { summary, details, warnings } = await getDemoDataPreview(filters);
    
    // Generate confirmation token
    const confirmationToken = generateConfirmationToken(filters);
    
    // Estimate duration based on entity count
    const estimatedSeconds = Math.ceil(summary.totalEntities / 100); // ~100 entities per second
    const estimatedDuration = estimatedSeconds > 60 ? 
      `${Math.ceil(estimatedSeconds / 60)} minutes` : 
      `${estimatedSeconds} seconds`;
    
    const response: CleanupPreviewResponse = {
      summary,
      details,
      warnings,
      filters,
      timestamp: new Date().toISOString(),
      confirmationToken,
      estimatedDuration
    };
    
    logger.info('[AdminCleanup] Preview completed successfully', {
      requestId,
      summary,
      duration: Date.now() - startTime,
      warningsCount: warnings.length
    });
    
    res.json(response);
    
  } catch (error) {
    logger.error('[AdminCleanup] Preview request failed', {
      requestId,
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime
    });
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate demo data preview',
      requestId
    });
  }
});

/**
 * Execute Demo Data Cleanup
 * DELETE /api/admin/demo-data/cleanup
 * 
 * Performs actual deletion of demo data with confirmation token validation.
 * Uses database transactions for atomic operations with comprehensive logging.
 */
router.delete('/demo-data/cleanup', async (req, res) => {
  const startTime = Date.now();
  const requestId = `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info('[AdminCleanup] Starting demo data cleanup request', {
      requestId,
      userId: req.user?.id,
      body: req.body
    });
    
    // Check admin access
    if (!req.user || !(await checkAdminAccess(req.user.id))) {
      logger.warn('[AdminCleanup] Unauthorized cleanup attempt', {
        requestId,
        userId: req.user?.id
      });
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin privileges required for demo data cleanup operations'
      });
    }
    
    const { confirmationToken, filters = {}, excludeIds = {} } = req.body;
    
    // Validate required fields
    if (!confirmationToken) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Confirmation token is required'
      });
    }
    
    // Validate confirmation token
    if (!validateConfirmationToken(confirmationToken, filters)) {
      logger.warn('[AdminCleanup] Invalid confirmation token provided', {
        requestId,
        providedToken: confirmationToken,
        filters
      });
      
      return res.status(400).json({
        error: 'Invalid confirmation token',
        message: 'Please generate a new preview before attempting cleanup'
      });
    }
    
    logger.info('[AdminCleanup] Confirmation token validated, starting cleanup', {
      requestId,
      filters,
      excludeIds
    });
    
    // Merge exclude IDs from request
    const finalFilters: CleanupFilters = {
      ...filters,
      excludeCompanyIds: [
        ...(filters.excludeCompanyIds || []),
        ...(excludeIds.companies || [])
      ],
      excludeUserIds: [
        ...(filters.excludeUserIds || []),
        ...(excludeIds.users || [])
      ],
      dryRun: false // Ensure this is an actual cleanup
    };
    
    const auditTrail: string[] = [];
    const errors: string[] = [];
    let deletedCounts: CleanupSummary = {
      companies: 0,
      users: 0,
      tasks: 0,
      files: 0,
      relationships: 0,
      invitations: 0,
      companyLogos: 0,
      totalEntities: 0
    };
    
    // Execute cleanup in transaction
    await db.transaction(async (tx) => {
      try {
        auditTrail.push(`Transaction started at ${new Date().toISOString()}`);
        
        // Step 1: Get all demo companies to delete
        const demoCompanies = await tx.query.companies.findMany({
          where: and(...buildDemoCompanyQuery(finalFilters)),
          limit: finalFilters.maxBatchSize || 1000
        });
        
        if (demoCompanies.length === 0) {
          auditTrail.push('No demo companies found matching criteria');
          return;
        }
        
        const companyIds = demoCompanies.map(c => c.id);
        auditTrail.push(`Found ${companyIds.length} demo companies to delete`);
        
        // Step 2: Delete tasks first (to avoid foreign key constraints)
        if (companyIds.length > 0) {
          const taskDeleteResult = await tx.delete(tasks)
            .where(inArray(tasks.company_id, companyIds));
          deletedCounts.tasks = taskDeleteResult.rowCount || 0;
          auditTrail.push(`Deleted ${deletedCounts.tasks} tasks`);
        }
        
        // Step 3: Delete files
        if (companyIds.length > 0) {
          const fileDeleteResult = await tx.delete(files)
            .where(inArray(files.company_id, companyIds));
          deletedCounts.files = fileDeleteResult.rowCount || 0;
          auditTrail.push(`Deleted ${deletedCounts.files} files`);
        }
        
        // Step 4: Delete invitations (if table exists)
        try {
          if (companyIds.length > 0) {
            const invitationDeleteResult = await tx.execute(sql`
              DELETE FROM invitations WHERE company_id = ANY(${companyIds})
            `);
            deletedCounts.invitations = invitationDeleteResult.rowCount || 0;
            auditTrail.push(`Deleted ${deletedCounts.invitations} invitations`);
          }
        } catch (error) {
          auditTrail.push('Invitations table not found, skipping...');
        }
        
        // Step 5: Delete relationships
        if (companyIds.length > 0) {
          const relationshipDeleteResult = await tx.delete(relationships)
            .where(inArray(relationships.company_id, companyIds));
          deletedCounts.relationships = relationshipDeleteResult.rowCount || 0;
          auditTrail.push(`Deleted ${deletedCounts.relationships} relationships`);
        }
        
        // Step 6: Delete demo users
        let userDeleteConditions = [eq(users.is_demo_user, true)];
        if (companyIds.length > 0) {
          userDeleteConditions.push(inArray(users.company_id, companyIds));
        }
        if (finalFilters.excludeUserIds && finalFilters.excludeUserIds.length > 0) {
          userDeleteConditions.push(sql`${users.id} NOT IN (${finalFilters.excludeUserIds.join(',')})`);
        }
        
        const userDeleteResult = await tx.delete(users)
          .where(and(...userDeleteConditions));
        deletedCounts.users = userDeleteResult.rowCount || 0;
        auditTrail.push(`Deleted ${deletedCounts.users} demo users`);
        
        // Step 7: Delete company logos
        const logosToDelete = demoCompanies.filter(c => c.logo_id);
        if (logosToDelete.length > 0) {
          const logoIds = logosToDelete.map(c => c.logo_id).filter(Boolean);
          const logoDeleteResult = await tx.delete(companyLogos)
            .where(inArray(companyLogos.id, logoIds));
          deletedCounts.companyLogos = logoDeleteResult.rowCount || 0;
          auditTrail.push(`Deleted ${deletedCounts.companyLogos} company logos`);
        }
        
        // Step 8: Finally delete companies
        const companyDeleteResult = await tx.delete(companies)
          .where(and(...buildDemoCompanyQuery(finalFilters)));
        deletedCounts.companies = companyDeleteResult.rowCount || 0;
        auditTrail.push(`Deleted ${deletedCounts.companies} demo companies`);
        
        // Calculate total
        deletedCounts.totalEntities = 
          deletedCounts.companies + 
          deletedCounts.users + 
          deletedCounts.tasks + 
          deletedCounts.files + 
          deletedCounts.relationships + 
          deletedCounts.invitations + 
          deletedCounts.companyLogos;
        
        auditTrail.push(`Transaction completed successfully. Total entities deleted: ${deletedCounts.totalEntities}`);
        
      } catch (transactionError) {
        auditTrail.push(`Transaction failed: ${(transactionError as Error).message}`);
        errors.push(`Transaction failed: ${(transactionError as Error).message}`);
        throw transactionError;
      }
    });
    
    const result: CleanupResult = {
      success: errors.length === 0,
      summary: deletedCounts,
      errors,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      auditTrail
    };
    
    logger.info('[AdminCleanup] Cleanup completed', {
      requestId,
      result,
      duration: Date.now() - startTime
    });
    
    res.json(result);
    
  } catch (error) {
    logger.error('[AdminCleanup] Cleanup request failed', {
      requestId,
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime
    });
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to execute demo data cleanup',
      requestId
    });
  }
});

export default router;