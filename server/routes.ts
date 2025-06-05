/**
 * ========================================
 * Central API Routes Configuration
 * ========================================
 * 
 * Main routing configuration for the enterprise risk assessment platform API.
 * This file orchestrates all API endpoints, middleware, and route handlers for
 * comprehensive business logic across authentication, data management, and real-time features.
 * 
 * Key Responsibilities:
 * - API route registration and organization
 * - Authentication and authorization middleware integration
 * - Database operations and data validation
 * - WebSocket integration for real-time updates
 * - File upload and company logo management
 * - Risk assessment form routing (KYB, KY3P, Open Banking)
 * 
 * Route Categories:
 * - Authentication: Login, registration, session management
 * - Company Management: Profile, logo, relationships
 * - Risk Assessment: KYB, KY3P, Security, Card processing
 * - File Management: Upload, download, document handling
 * - Real-time Features: WebSocket connections, live updates
 * - Analytics: Tutorial tracking, progress monitoring
 * 
 * @module server/routes
 * @version 1.0.0
 * @since 2025-05-23
 */

// ========================================
// IMPORTS
// ========================================

// Express framework and routing
import express, { Express, Router, Request, Response } from 'express';

// Database ORM and query builders
import { eq, and, gt, sql, or, isNull, inArray, desc, asc, ne } from 'drizzle-orm';
import { db } from '@db';
import { users, companies, files, companyLogos, relationships, tasks, invitations, TaskStatus, accreditationHistory } from '@db/schema';

// Authentication and security
import * as bcrypt from 'bcrypt';
import crypto from 'crypto';
import { requireAuth, optionalAuth } from './middleware/auth';

// File system and upload handling
import path from 'path';
import fs from 'fs';

// Demo API routes
import demoApiRoutes from './demo-api';
import companyNameValidationRouter from './routes/company-name-validation';
import { logoUpload } from './middleware/upload';

// Business logic and services
import { emailService } from './services/email';
import { createCompany } from "./services/company";
import { taskStatusToProgress, NetworkVisualizationData, RiskBucket } from './types';

// WebSocket services for real-time communication
import * as LegacyWebSocketService from './services/websocket';
import * as WebSocketService from './services/websocket-service';
import { broadcast, broadcastTaskUpdate, getWebSocketServer } from './utils/unified-websocket';

// Specialized route modules
import timestampRouter from './routes/kyb-timestamp-routes';
import claimsRouter from './routes/claims';
import tutorialRouter from './routes/tutorial';
import companySearchRouter from "./routes/company-search";
import kybRouter from './routes/kyb';
import { checkAndUnlockSecurityTasks } from './routes/kyb';
import { getKybProgress } from './routes/kyb-update';
import kybTimestampRouter from './routes/kyb-timestamp-routes';
import cardRouter from './routes/card';
import securityRouter from './routes/security';

// KY3P assessment routing modules
import ky3pRouter from './routes/ky3p';
import ky3pFieldsRouter from './routes/ky3p-fields';
import enhancedKy3pSubmissionRouter from './routes/enhanced-ky3p-submission';
import ky3pProgressRouter from './routes/ky3p-progress';
import ky3pFixedRouter from './routes/ky3p-enhanced.routes';
import { ky3pSubmissionFixRouter } from './routes/ky3p-submission-fix';
// Use the fixed KY3P batch update routes
import { registerKY3PBatchUpdateRoutes } from './routes/ky3p-batch-update.routes';
// Import the new unified KY3P update routes
import { registerUnifiedKY3PUpdateRoutes } from './routes/unified-ky3p-update';
// Import the KY3P field key router for string-based field key references
import ky3pFieldKeyRouter from './routes/ky3p-keyfield-router';
import { registerKY3PFieldKeyRouter } from './routes/ky3p-keyfield-router';
// Import the enhanced KY3P demo auto-fill routes
import ky3pDemoAutofillRouter from './routes/ky3p-demo-autofill';
// Import enhanced Open Banking routes with improved reliability
import enhancedOpenBankingRouter from './routes/enhanced-open-banking';
// Import the task fix route to correct status/progress issues
import { fixTaskStatus, batchFixTasks } from './routes/task-fix';
// Import manual KY3P fix route for direct recalculation of KY3P task progress
import { manualKy3pFix } from './routes/manual-ky3p-fix';
import openBankingDemoAutofillRouter from './routes/open-banking-demo.routes';
import universalDemoAutofillRouter from './routes/universal-demo-autofill';
// Import the fix-missing-file API route
import fixMissingFileRouter from './routes/fix-missing-file-api';
// Import WebSocket notification test router
// Test router removed during cleanup
import unifiedDemoAutofillRouter from './routes/unified-demo-autofill-api';
import { registerKY3PFieldUpdateRoutes } from './routes/ky3p-field-update';
import filesRouter from './routes/files';
import taskProgressRouter from './routes/task-progress';
// Import the unified clear fields router that handles all form types
import unifiedClearFieldsRouter from './routes/unified-clear-fields';
import fixKy3pFilesRouter from './routes/fix-ky3p-files';
import enhancedDebugRoutes from './enhanced-debug-routes';
import debugRouter from './routes/debug';
import { router as debugRoutesTs } from './routes/debug-routes';
// Import our new task broadcast router
import taskBroadcastRouter from './routes/task-broadcast';
// Import our KY3P progress fix test route
// Test router removed during cleanup
// Import our test submission state router for testing submission state preservation
// Test router removed during cleanup
// Manual KY3P fix route already imported above
// Temporarily disabled until module compatibility is fixed
// import * as debugEndpoints from './routes/debug-endpoints';
import { registerOpenBankingRoutes } from './routes/open-banking';
import { registerOpenBankingProgressRoutes } from './routes/open-banking-progress';
import { registerOpenBankingTimestampRoutes } from './routes/open-banking-timestamp-routes';
import openBankingFieldUpdateRouter from './routes/open-banking-field-update';
import accessRouter from './routes/access';
import adminRouter from './routes/admin';
import tasksRouter from './routes/tasks';
import taskTemplatesRouter from './routes/task-templates';
import { aiSuggestionsRouter } from './routes/ai-suggestions';
import websocketRouter from './routes/websocket';
// Test WebSocket router removed
import riskScoreConfigurationRouter from './routes/risk-score-configuration';
// Tab tutorial system for onboarding
import userTabTutorialsRouter from './routes/user-tab-tutorials';
// Test routes have been removed
import submissionsRouter from './routes/submissions';
import companyTabsRouter from './routes/company-tabs';
import fileVaultRouter from './routes/file-vault';
import broadcastRouter from './routes/broadcast';
// Unified Form Update endpoint for all form types
import unifiedFormUpdateRouter from './routes/unified-form-update';
// Test routes have been removed
import { createUnifiedFormSubmissionRouter } from './routes/unified-form-submission';
import { createTransactionalFormRouter } from './routes/transactional-form-routes';
import { analyzeDocument } from './services/openai';
import { PDFExtract } from 'pdf.js-extract';

// Create PDFExtract instance
const pdfExtract = new PDFExtract();

// Import admin demo cleanup routes
import adminDemoCleanupRoutes from './routes/admin-demo-cleanup';

// Company cache for current company endpoint - exported for other modules to use
export const companyCache = new Map<number, { company: any, timestamp: number }>();
export const COMPANY_CACHE_TTL = 1 * 60 * 1000; // Reduced to 1 minute to improve UI responsiveness

/**
 * Invalidate company cache for a specific company ID 
 * This should be called when tabs are updated to ensure clients see the latest changes
 * 
 * @param companyId The company ID to invalidate in the cache
 */
export function invalidateCompanyCache(companyId: number) {
  if (companyId && companyCache.has(companyId)) {
    console.log(`[Cache] Invalidating company cache for company ${companyId}`);
    companyCache.delete(companyId);
    return true;
  }
  return false;
}

/**
 * Smart Route Registration Tracker
 * 
 * Consolidates individual route registration logs into a clean summary,
 * reducing startup noise while maintaining visibility of module initialization.
 */
const routeRegistrationTracker = {
  modules: [] as string[],
  
  register(moduleName: string) {
    this.modules.push(moduleName);
  },
  
  getSummary() {
    return `Route registration completed: ${this.modules.length} modules initialized [${this.modules.join(', ')}]`;
  }
};

export async function registerRoutes(app: Express): Promise<Express> {
  // ========================================
  // PRIORITY API ROUTES - REGISTER FIRST
  // ========================================
  
  /**
   * Demo API Route Registration - Critical Priority
   * 
   * Registers demo API endpoints before any other routes to ensure proper
   * middleware precedence. This prevents frontend catch-all routes from
   * intercepting API calls and returning HTML instead of JSON responses.
   * 
   * Following best practice: API routes must be registered before frontend
   * routes in the Express middleware stack to ensure proper request routing.
   */
  console.log('[Routes] Registering demo API routes with priority...');
  app.use('/api', demoApiRoutes);
  routeRegistrationTracker.register('DemoAPI');
  console.log('[Routes] Demo API routes registered successfully with priority');
  
  // Add production debugging middleware for critical API endpoints
  app.use('/api/user', (req, res, next) => {
    console.log(`[PROD-DEBUG] /api/user request received: ${req.method} - Route handler active`);
    next();
  });
  
  app.use('/api/companies/current', (req, res, next) => {
    console.log(`[PROD-DEBUG] /api/companies/current request received: ${req.method} - Route handler active`);
    next();
  });
  
  app.use('/api/tasks', (req, res, next) => {
    console.log(`[PROD-DEBUG] /api/tasks request received: ${req.method} - Route handler active`);
    next();
  });
  
  // Register company name validation API for real-time form feedback
  console.log('[Routes] Registering company name validation API...');
  app.use('/api/company-name', companyNameValidationRouter);
  routeRegistrationTracker.register('CompanyNameValidation');
  console.log('[Routes] Company name validation API registered successfully');

  // Register demo cleanup routes
  const demoCleanupRoutes = await import('./routes/demo-cleanup-simple');
  console.log('[Routes] Registering demo cleanup API...');
  app.use('/api/admin', demoCleanupRoutes.default);
  routeRegistrationTracker.register('DemoCleanup');
  console.log('[Routes] Demo cleanup API registered successfully');
  
  // ========================================
  // CORE APPLICATION ROUTES
  // ========================================
  
  // Track core routes
  app.use(companySearchRouter);
  routeRegistrationTracker.register('CompanySearch');
  
  app.use(kybRouter);
  routeRegistrationTracker.register('KYB');
  
  // Register KYB progress route with status update support
  const kybProgressRouter = Router();
  getKybProgress(kybProgressRouter);
  app.use(kybProgressRouter);

  // Register KYB timestamps route for field-level timestamp support
  app.use('/api/kyb/timestamps', kybTimestampRouter);
  
  // Register task fix routes for fixing inconsistent task status/progress
  app.get('/api/task-fix/:taskId', requireAuth, fixTaskStatus);
  app.post('/api/task-fix/batch', requireAuth, batchFixTasks);

  // Critical fix: Add a redirect handler for KY3P tasks that are being queried 
  // through the KYB endpoint to resolve the form loading issue
  app.get('/api/kyb/progress/:taskId', requireAuth, async (req, res, next) => {
    try {
      const taskId = parseInt(req.params.taskId);
      
      if (isNaN(taskId)) {
        return next(); // Let the original handler process invalid IDs
      }
      
      // First check if this is actually a KY3P task
      const [task] = await db.select({
        id: tasks.id,
        task_type: tasks.task_type
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
      
      if (task && task.task_type === 'ky3p') {
        console.log(`[Routes] Redirecting KY3P task ${taskId} from /api/kyb/progress to /api/ky3p/progress`);
        
        // This is a KY3P task, redirect to the proper endpoint
        // Instead of HTTP redirect, we'll proxy the request to maintain session context
        const ky3pUrl = `/api/ky3p/progress/${taskId}`;
        const response = await fetch(`http://localhost:5000${ky3pUrl}`, {
          headers: {
            'Cookie': req.headers.cookie || '',
            'Authorization': req.headers.authorization || '',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          return res.json(data);
        }
        
        // If it failed, let the original handler try
        console.log(`[Routes] KY3P redirect failed with status ${response.status}, falling back to original handler`);
      }
      
      // Not a KY3P task or redirect failed, continue to the original handler
      next();
    } catch (error) {
      console.error('[Routes] Error in KY3P redirect handler:', error);
      next(); // Continue to the original handler
    }
  }, (req, res, next) => {
    // This is a passthrough middleware to ensure we don't create double responses
    // if the redirect handler didn't handle the request
    next();
  });
  
  // Register Company Tabs routes for file vault unlock functionality
  app.use('/api/company-tabs', companyTabsRouter);
  
  // Register the File Vault router for direct access to file vault functionality 
  // with proper API path prefix
  app.use('/api/file-vault', fileVaultRouter);
  
  // EMERGENCY ENDPOINT: Direct fix for file vault access
  app.post('/api/emergency/unlock-file-vault/:companyId', async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId);
      
      if (isNaN(companyId)) {
        return res.status(400).json({ message: 'Invalid company ID' });
      }
      
      console.log(`[EMERGENCY] Unlocking file vault for company ${companyId}`);
      
      // Get current company data
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));
        
      if (!company) {
        return res.status(404).json({ message: 'Company not found' });
      }
      
      console.log(`[EMERGENCY] Current company state:`, {
        id: company.id,
        name: company.name,
        available_tabs: company.available_tabs
      });
      
      // Ensure we have a proper available_tabs array
      const currentTabs = company.available_tabs || ['task-center'];
      
      // Check if file-vault is already included
      if (currentTabs.includes('file-vault')) {
        console.log(`[EMERGENCY] File vault already enabled for company ${companyId}`);
        
        // Force broadcast WebSocket event to refresh client caches
        // Use the unified broadcast function for consistent handling
        broadcast('company_tabs_updated', {
          companyId,
          availableTabs: currentTabs,
          timestamp: new Date().toISOString(),
          source: 'emergency_endpoint',
          cache_invalidation: true
        });
        
        // Force clear company cache
        invalidateCompanyCache(companyId);
        
        return res.json({
          success: true,
          message: 'File vault already enabled, forced cache refresh',
          company: {
            id: company.id,
            name: company.name,
            available_tabs: currentTabs
          }
        });
      }
      
      // Add file-vault to the tabs
      const updatedTabs = [...currentTabs, 'file-vault'];
      console.log(`[EMERGENCY] Updating tabs from ${JSON.stringify(currentTabs)} to ${JSON.stringify(updatedTabs)}`);
      
      // Direct database update
      const [updatedCompany] = await db.update(companies)
        .set({
          available_tabs: updatedTabs,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning();
        
      console.log(`[EMERGENCY] Successfully updated company tabs:`, {
        id: updatedCompany.id,
        name: updatedCompany.name,
        available_tabs: updatedCompany.available_tabs
      });
      
      // Clear any server-side cache
      invalidateCompanyCache(companyId);
      console.log(`[EMERGENCY] Invalidated cache for company ${companyId}`);
      
      // Broadcast WebSocket event to update clients
      // Use the unified broadcast function
      broadcast('company_tabs_updated', {
        companyId,
        availableTabs: updatedCompany.available_tabs,
        timestamp: new Date().toISOString(),
        source: 'emergency_endpoint',
        cache_invalidation: true
      });
      
      console.log(`[EMERGENCY] WebSocket broadcast sent for company ${companyId}`);
      
      // Return success
      res.json({
        success: true,
        message: 'File vault unlocked successfully',
        company: {
          id: updatedCompany.id,
          name: updatedCompany.name,
          available_tabs: updatedCompany.available_tabs
        }
      });
    } catch (error) {
      console.error('[EMERGENCY] Error unlocking file vault:', error);
      res.status(500).json({ message: 'Error unlocking file vault' });
    }
  });
  
  // Special endpoint to force refresh file vault access
  app.post('/api/refresh-file-vault', requireAuth, async (req, res) => {
    try {
      // Get the user's company ID
      if (!req.user || !req.user.company_id) {
        return res.status(400).json({ error: 'No company associated with user' });
      }
      
      const companyId = req.user.company_id;
      console.log(`[File Vault] Force refresh requested for company ${companyId}`);
      
      // Check company exists
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));
        
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
      
      // Check if file-vault is in available_tabs
      const hasFileVault = company.available_tabs && 
                          company.available_tabs.includes('file-vault');
                          
      if (!hasFileVault) {
        // Add file-vault to available_tabs
        const newTabs = company.available_tabs 
          ? [...company.available_tabs, 'file-vault'] 
          : ['task-center', 'file-vault'];
          
        // Update company record
        await db.update(companies)
          .set({ 
            available_tabs: newTabs,
            updated_at: new Date()
          })
          .where(eq(companies.id, companyId));
          
        console.log(`[File Vault] Added file-vault tab for company ${companyId}`);
        
        // Broadcast the update via WebSocket
        // Use the unified broadcast function for consistency
        broadcast('company_tabs_updated', {
          companyId,
          availableTabs: newTabs,
          cache_invalidation: true,
          timestamp: new Date().toISOString(),
          source: 'force-refresh-endpoint'
        });
      }
      
      return res.json({
        success: true,
        message: 'File vault access refreshed',
        company_name: company.name,
        available_tabs: hasFileVault ? company.available_tabs : [...(company.available_tabs || []), 'file-vault']
      });
    } catch (error) {
      console.error('[File Vault] Error in refresh endpoint:', error);
      return res.status(500).json({ error: 'Failed to refresh file vault access' });
    }
  });
  
  // Register enhanced debugging routes
  app.use('/api/debug', enhancedDebugRoutes);
  app.use('/api/debug', debugRouter);
  // Register debug-routes.ts
  app.use('/api/debug', debugRoutesTs);
  // Register test submission state router
  // Test router removed during cleanup
  // Register test WebSocket notifications router
  // Test router removed during cleanup
  // Temporarily disabled until module compatibility is fixed
  // app.use('/api/debug', debugEndpoints);
  
  app.use(cardRouter);
  app.use(securityRouter);
  app.use(ky3pRouter);
  // Register KY3P fields router for field definitions
  app.use(ky3pFieldsRouter);
  // Register KY3P progress router for saved form data
  app.use(ky3pProgressRouter);
  // Register enhanced KY3P submission router with fixed progress handling
  app.use(enhancedKy3pSubmissionRouter);
  // Register KY3P progress test route
  // Test router removed during cleanup
  // Register KY3P progress fix test route
  // Test router removed during cleanup
  // Register manual KY3P progress fix endpoint
  app.use('/api/ky3p/manual-fix', manualKy3pFix);
  // Register KY3P submission fix router to properly handle form submissions
  app.use(ky3pSubmissionFixRouter);
  routeRegistrationTracker.register('KY3P-SubmissionFix');
  
  // Register task progress endpoints for testing and direct manipulation
  app.use(taskProgressRouter);
  routeRegistrationTracker.register('TaskProgress');
  
  // Register the unified form update API for all form types
  app.use(unifiedFormUpdateRouter);
  routeRegistrationTracker.register('UnifiedFormUpdate');
  
  // Use our unified fixed KY3P routes for batch update, demo autofill, and clear fields
  app.use(ky3pFixedRouter);
  routeRegistrationTracker.register('KY3P-Fixed');
  
  // Use our enhanced KY3P demo auto-fill routes
  app.use(ky3pDemoAutofillRouter);
  routeRegistrationTracker.register('KY3P-DemoAutofill');
  
  // Register the standardized KY3P batch update routes
  const ky3pBatchFixedRouter = registerKY3PBatchUpdateRoutes();
  app.use(ky3pBatchFixedRouter);
  routeRegistrationTracker.register('KY3P-BatchUpdate');
  
  // Register the fully unified KY3P update routes
  const unifiedKy3pRouter = registerUnifiedKY3PUpdateRoutes();
  app.use(unifiedKy3pRouter);
  routeRegistrationTracker.register('KY3P-UnifiedUpdate');
  
  // Register the KY3P field key router for string-based field key references
  registerKY3PFieldKeyRouter(app);
  routeRegistrationTracker.register('KY3P-FieldKey');
  // Removed reference to old KY3P batch update implementation
  // Register the standardized KY3P field update routes
  const ky3pFieldUpdateRouter = registerKY3PFieldUpdateRoutes();
  app.use(ky3pFieldUpdateRouter);
  // Register the unified clear fields router for all form types
  app.use(unifiedClearFieldsRouter);
  routeRegistrationTracker.register('UnifiedClearFields');
  app.use(openBankingDemoAutofillRouter);
  // Register the KY3P files fix router
  app.use(fixKy3pFilesRouter);
  // Register the universal demo auto-fill router
  app.use(universalDemoAutofillRouter);
  
  // Register unified demo auto-fill API for all form types (KYB, KY3P, Open Banking)
  // This implementation resolves inconsistencies with case sensitivity and status handling
  app.use(unifiedDemoAutofillRouter);
  app.use(filesRouter);
  
  // Register fix-missing-file API router for regenerating files
  app.use(fixMissingFileRouter);
  
  // ========================================
  // COMPANY USERS ENDPOINT
  // ========================================
  
  /**
   * Company Users API Endpoint
   * 
   * Provides access to users associated with a specific company.
   * Uses direct PostgreSQL pool access for optimal performance and
   * to bypass known Drizzle ORM issues with complex queries.
   * 
   * Security: Requires authentication via optionalAuth middleware
   * Performance: Direct database pool access with connection monitoring
   * Error Handling: Comprehensive logging and structured error responses
   */
  app.get('/api/companies/:id/users', optionalAuth, async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = `company-users-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Request validation and logging
      const companyId = parseInt(req.params.id);
      
      console.log(`[CompanyUsers] ${requestId} - Request initiated`, {
        companyId,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      if (!companyId || isNaN(companyId)) {
        console.log(`[CompanyUsers] ${requestId} - Invalid company ID provided:`, req.params.id);
        return res.status(400).json({ 
          error: 'Invalid company ID',
          code: 'INVALID_COMPANY_ID',
          requestId 
        });
      }

      // Database query with direct PostgreSQL pool for reliability
      console.log(`[CompanyUsers] ${requestId} - Executing database query for company ${companyId}`);
      
      const { pool } = await import('@db');
      const result = await pool.query(
        'SELECT id, email, full_name, first_name, last_name, company_id, onboarding_user_completed, created_at, updated_at FROM users WHERE company_id = $1 ORDER BY full_name ASC',
        [companyId]
      );
      
      const companyUsers = result.rows;
      const queryTime = Date.now() - startTime;

      console.log(`[CompanyUsers] ${requestId} - Query successful`, {
        companyId,
        userCount: companyUsers.length,
        queryTime: `${queryTime}ms`,
        timestamp: new Date().toISOString()
      });

      // Return structured response
      res.json({
        users: companyUsers,
        meta: {
          count: companyUsers.length,
          companyId,
          requestId,
          queryTime: `${queryTime}ms`
        }
      });
      
    } catch (error) {
      const queryTime = Date.now() - startTime;
      
      console.error(`[CompanyUsers] ${requestId} - Database error:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        companyId: req.params.id,
        queryTime: `${queryTime}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({ 
        message: 'Error fetching company users',
        code: 'FETCH_ERROR',
        requestId,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Register the company users endpoint in the tracking system
  routeRegistrationTracker.register('CompanyUsers');
  
  // Register task broadcast router for WebSocket notifications
  app.use('/api/tasks', taskBroadcastRouter);
  routeRegistrationTracker.register('TaskBroadcast');
  
  // Register Open Banking Survey routes with WebSocket support
  // Use getWebSocketServer from the unified implementation
  registerOpenBankingRoutes(app, getWebSocketServer());
  
  // Register Open Banking Progress routes for standardized form handling
  const openBankingProgressRouter = Router();
  registerOpenBankingProgressRoutes(openBankingProgressRouter);
  app.use(openBankingProgressRouter);
  
  // Register Open Banking Timestamps routes for field-level timestamp conflict resolution
  registerOpenBankingTimestampRoutes(app);
  
  // Register Open Banking Field Update routes with universal progress calculation
  app.use(openBankingFieldUpdateRouter);
  
  // Register Enhanced Open Banking routes with improved error handling and retry logic
  app.use('/api/enhanced-open-banking', enhancedOpenBankingRouter);
  
  app.use(accessRouter);
  app.use('/api/admin', adminRouter);
  app.use(tasksRouter);
  
  // Register Risk Score Configuration routes with optional authentication
  // This allows unauthenticated access for demo purposes
  app.use('/api/risk-score', optionalAuth, riskScoreConfigurationRouter);
  
  // Register Tab Tutorials routes for the onboarding system
  app.use('/api/user-tab-tutorials', userTabTutorialsRouter);
  
  // Register Claims Management routes
  app.use('/api/claims', claimsRouter);
  
  // Register Tutorial API routes
  app.use('/api/tutorial', tutorialRouter);
  
  // Register our unified form submission router - centralized endpoint for all form types
  // Set up our transaction-based unified form submission router
  try {
    console.log('[Routes] Setting up transaction-based unified form submission router');
    const unifiedFormSubmissionRouter = createUnifiedFormSubmissionRouter();
    app.use('/api/unified-form', unifiedFormSubmissionRouter);
    console.log('[Routes] Successfully registered transaction-based unified form submission router');
  } catch (error) {
    console.error('[Routes] Error setting up transaction-based unified form submission router:', error);
  }
  
  // Register our new truly unified form submission endpoint that works for all form types
  try {
    console.log('[Routes] Setting up unified form submission router');
    // Use previously imported module
    // We already imported createUnifiedFormSubmissionRouter at the top of the file
    const newUnifiedRouter = createUnifiedFormSubmissionRouter();
    app.use('/api/submit-form', newUnifiedRouter);
    console.log('[Routes] Successfully registered unified form submission router');
  } catch (error) {
    console.error('[Routes] Error setting up unified form submission router:', error);
  }
  
  // Register our new transactional form submission router that ensures atomic operations
  try {
    console.log('[Routes] Setting up transactional form submission router');
    const transactionalFormRouter = createTransactionalFormRouter();
    app.use('/api/forms-tx', transactionalFormRouter);
    console.log('[Routes] Successfully registered transactional form submission router');
  } catch (error) {
    console.error('[Routes] Error setting up transactional form submission router:', error);
  }
  
  app.use('/api/task-templates', taskTemplatesRouter);
  app.use(aiSuggestionsRouter);
  
  // Register WebSocket test routes
  app.use('/api/websocket', websocketRouter);
  
  // We already registered taskProgressRouter earlier, so we don't need to do it again here
  
  // Test endpoints for WebSocket functionality have been removed
  // They have been replaced with standardized WebSocket implementation
  
  // Test WebSocket routes have been removed
  // They have been replaced with standardized WebSocket implementation
  
  // Test form submission routes have been removed
  // They have been replaced with standardized form submission implementation
  
  // Test routes have been removed
  // Replaced with standardized API endpoints
  
  // Register submission status API - reliable form submission status checking
  app.use('/api/submissions', submissionsRouter);
  
  // Register broadcast router for demo auto-fill WebSocket functionality
  app.use(broadcastRouter);
  
  // Test routes have been removed

  // Companies endpoints
  app.get("/api/companies", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        console.log('[Companies] No authenticated user found');
        return res.status(401).json({
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      console.log('[Companies] Fetching companies for user:', {
        userId: req.user.id,
        company_id: req.user.company_id
      });

      // Get all companies that either:
      // 1. The user's own company
      // 2. Companies that have a relationship with the user's company
      const networkCompanies = await db.select({
        id: companies.id,
        name: sql<string>`COALESCE(${companies.name}, '')`,
        category: sql<string>`COALESCE(${companies.category}, '')`,
        description: sql<string>`COALESCE(${companies.description}, '')`,
        logo_id: companies.logo_id,
        accreditation_status: companies.accreditation_status,
        risk_score: companies.risk_score,
        chosen_score: companies.chosen_score,
        risk_clusters: companies.risk_clusters,
        is_demo: companies.is_demo,
        onboarding_company_completed: sql<boolean>`COALESCE(${companies.onboarding_company_completed}, false)`,
        website_url: sql<string>`COALESCE(${companies.website_url}, '')`,
        legal_structure: sql<string>`COALESCE(${companies.legal_structure}, '')`,
        hq_address: sql<string>`COALESCE(${companies.hq_address}, '')`,
        num_employees: sql<number>`COALESCE(${companies.num_employees}, 0)`,
        products_services: sql<string>`COALESCE(${companies.products_services}, '')`,
        incorporation_year: sql<number>`COALESCE(${companies.incorporation_year}, 0)`,
        investors: sql<string>`COALESCE(${companies.investors}, '')`,
        funding_stage: sql<string>`COALESCE(${companies.funding_stage}, '')`,
        key_clients_partners: sql<string>`COALESCE(${companies.key_clients_partners}, '')`,
        founders_and_leadership: sql<string>`COALESCE(${companies.founders_and_leadership}, '')`,
        has_relationship: sql<boolean>`
          CASE 
            WHEN ${companies.id} = ${req.user.company_id} THEN true
            WHEN EXISTS (
              SELECT 1 FROM ${relationships} r 
              WHERE (r.company_id = ${companies.id} AND r.related_company_id = ${req.user.company_id})
              OR (r.company_id = ${req.user.company_id} AND r.related_company_id = ${companies.id})
            ) THEN true
            ELSE false
          END
        `,
        relationship_type: sql<string>`
          CASE 
            WHEN ${companies.id} = ${req.user.company_id} THEN 'self'
            ELSE (
              SELECT r.relationship_type FROM ${relationships} r 
              WHERE (r.company_id = ${companies.id} AND r.related_company_id = ${req.user.company_id})
              OR (r.company_id = ${req.user.company_id} AND r.related_company_id = ${companies.id})
              LIMIT 1
            )
          END
        `
      })
        .from(companies)
        .where(
          or(
            eq(companies.id, req.user.company_id),
            sql`EXISTS (
            SELECT 1 FROM ${relationships} r 
            WHERE (r.company_id = ${companies.id} AND r.related_company_id = ${req.user.company_id})
            OR (r.company_id = ${req.user.company_id} AND r.related_company_id = ${companies.id})
          )`
          )
        )
        .orderBy(companies.name);

      console.log('[Companies] Query successful, found companies:', {
        count: networkCompanies.length,
        companies: networkCompanies.map(c => ({
          id: c.id,
          name: c.name,
          hasLogo: !!c.logo_id,
          hasRelationship: c.has_relationship,
          hasRiskScore: !!c.risk_score,
          hasRiskClusters: !!c.risk_clusters,
          riskScore: c.risk_score,
          accreditationStatus: c.accreditation_status
        }))
      });
      
      console.log('[Companies] Sample risk data check:', {
        firstCompanyRiskData: networkCompanies[0] ? {
          id: networkCompanies[0].id,
          name: networkCompanies[0].name,
          risk_score: networkCompanies[0].risk_score,
          risk_clusters: networkCompanies[0].risk_clusters ? 'PRESENT' : 'MISSING',
          accreditation_status: networkCompanies[0].accreditation_status
        } : 'NO_COMPANIES'
      });

      // Transform the data to match frontend expectations
      const transformedCompanies = networkCompanies.map(company => {
        // Process products_services correctly - database stores it as text, but frontend expects array
        let productsServices = [];
        if (company.products_services) {
          try {
            // If it's already a valid JSON string, parse it
            if (company.products_services.startsWith('[') && company.products_services.endsWith(']')) {
              productsServices = JSON.parse(company.products_services);
            } else {
              // Otherwise treat it as a single item
              productsServices = [company.products_services];
            }
          } catch (e) {
            // If parsing fails, make it a single item array
            productsServices = [company.products_services];
            console.log('[Companies] Failed to parse products_services as JSON:', {
              companyId: company.id, 
              value: company.products_services,
              error: e instanceof Error ? e.message : String(e)
            });
          }
        }
        
        // Process key_clients_partners correctly - database stores it as text, but frontend expects array
        let keyClientsPartners = [];
        if (company.key_clients_partners) {
          try {
            // If it's already a valid JSON string, parse it
            if (company.key_clients_partners.startsWith('[') && company.key_clients_partners.endsWith(']')) {
              keyClientsPartners = JSON.parse(company.key_clients_partners);
            } else {
              // Otherwise treat it as a single item
              keyClientsPartners = [company.key_clients_partners];
            }
          } catch (e) {
            // If parsing fails, make it a single item array
            keyClientsPartners = [company.key_clients_partners];
            console.log('[Companies] Failed to parse key_clients_partners as JSON:', {
              companyId: company.id, 
              value: company.key_clients_partners,
              error: e instanceof Error ? e.message : String(e)
            });
          }
        }
        
        return {
          id: company.id,
          name: company.name,
          category: company.category,
          description: company.description,
          logo_id: company.logo_id,
          accreditation_status: company.accreditation_status || null,
          risk_score: company.risk_score,
          riskScore: company.risk_score, // Add frontend-friendly version
          chosen_score: company.chosen_score, 
          chosenScore: company.chosen_score, // Add frontend-friendly version
          risk_clusters: company.risk_clusters,
          riskClusters: company.risk_clusters, // Add frontend-friendly version
          is_demo: company.is_demo,
          isDemo: company.is_demo, // Add frontend-friendly version
          onboarding_company_completed: company.onboarding_company_completed,
          websiteUrl: company.website_url || 'N/A',
          legalStructure: company.legal_structure || 'N/A',
          hqAddress: company.hq_address || 'N/A',
          numEmployees: company.num_employees || 'N/A',
          productsServices: productsServices,
          incorporationYear: company.incorporation_year || 'N/A',
          investors: company.investors || 'No investor information available',
          fundingStage: company.funding_stage || null,
          keyClientsPartners: keyClientsPartners,
          foundersAndLeadership: company.founders_and_leadership || 'No leadership information available',
          has_relationship: company.has_relationship,
          hasRelationship: company.has_relationship, // Add frontend-friendly version
          relationship_type: company.relationship_type,
          relationshipType: company.relationship_type // Add frontend-friendly version
        };
      });

      res.json(transformedCompanies);
    } catch (error) {
      console.error("[Companies] Error details:", {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        query: 'SELECT query for companies endpoint'
      });
      
      // Log more detailed error information
      if (error instanceof Error) {
        console.error(`[Companies] DETAILED ERROR: ${error.message}`);
        console.error(error.stack);
        
        // Check for SQL syntax error
        if (error.message.includes('syntax error')) {
          console.error('[Companies] SQL SYNTAX ERROR DETECTED in companies query');
        }
      }

      // Check if it's a database error
      if (error instanceof Error && error.message.includes('relation')) {
        return res.status(500).json({
          message: "Database configuration error",
          code: "DB_ERROR"
        });
      }

      res.status(500).json({
        message: "Error fetching companies",
        code: "INTERNAL_ERROR"
      });
    }
  });

  // Use the company cache exported from the top-level of this file
  
  // PATCH endpoint for updating the current company's details
  app.patch("/api/companies/current", requireAuth, async (req, res) => {
    try {
      const companyId = req.user.company_id;
      
      if (!companyId) {
        return res.status(400).json({ 
          message: "User is not associated with a company",
          code: "NO_COMPANY"
        });
      }
      
      console.log(`[Company API] Updating company ${companyId} with data:`, req.body);
      
      // Get allowed fields from request body
      const updateData: Partial<typeof companies.$inferInsert> = {};
      
      // Process and validate revenue - ensure it's a number
      if (req.body.revenue !== undefined) {
        // If revenue is already a number, use it directly
        if (typeof req.body.revenue === 'number') {
          updateData.revenue = req.body.revenue;
        } 
        // Otherwise try to convert it to a number
        else {
          const numericRevenue = Number(req.body.revenue);
          if (!isNaN(numericRevenue)) {
            updateData.revenue = numericRevenue;
          } else {
            console.warn(`[Company API] Invalid revenue value: ${req.body.revenue}, not updating revenue field`);
          }
        }
      }
      
      // Set revenue tier as string for display/categorization purposes
      if (req.body.revenue_tier !== undefined) {
        updateData.revenue_tier = req.body.revenue_tier;
      }
      
      // Process employee count
      if (req.body.num_employees !== undefined) {
        updateData.num_employees = req.body.num_employees;
      }
      
      console.log(`[Company API] Processed update data:`, updateData);
      
      // Update company record
      const [updatedCompany] = await db.update(companies)
        .set({
          ...updateData,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning();
        
      if (!updatedCompany) {
        return res.status(404).json({
          message: "Company not found or update failed",
          code: "UPDATE_FAILED"
        });
      }
      
      // Invalidate the company cache to ensure fresh data
      invalidateCompanyCache(companyId);
      
      console.log(`[Company API] Successfully updated company ${companyId}`);
      
      return res.json({
        success: true,
        message: "Company updated successfully",
        data: updatedCompany
      });
    } catch (error) {
      console.error('[Company API] Error updating company:', error);
      return res.status(500).json({
        message: "Failed to update company",
        code: "SERVER_ERROR"
      });
    }
  });
  
  app.get("/api/companies/current", requireAuth, async (req, res) => {
    try {
      const now = Date.now();
      const companyId = req.user.company_id;
      const cachedData = companyCache.get(companyId);
      
      // Use cached data if it exists and is not expired
      if (cachedData && (now - cachedData.timestamp) < COMPANY_CACHE_TTL) {
        // Only log cache hits occasionally to reduce log noise
        if (Math.random() < 0.05) { // Log ~5% of cache hits
          console.log('[Current Company] Using cached company data:', companyId);
        }
        return res.json(cachedData.company);
      }
      
      console.log('[Current Company] Fetching company for user:', {
        userId: req.user.id,
        companyId: companyId
      });

      // Use a direct query to get the most updated company data including the risk_score
      // Be explicit about the fields we select to avoid errors with missing columns
      const [company] = await db.select({
        id: companies.id,
        name: companies.name,
        category: companies.category,
        is_demo: companies.is_demo,
        revenue_tier: companies.revenue_tier,
        onboarding_company_completed: companies.onboarding_company_completed,
        risk_score: companies.risk_score,
        chosen_score: companies.chosen_score,
        accreditation_status: companies.accreditation_status,
        website_url: companies.website_url,
        num_employees: companies.num_employees,
        incorporation_year: companies.incorporation_year,
        available_tabs: companies.available_tabs,
        logo_id: companies.logo_id,
        created_at: companies.created_at,
        updated_at: companies.updated_at,
        risk_clusters: companies.risk_clusters
      })
      .from(companies)
      .where(eq(companies.id, companyId));

      if (!company) {
        console.error('[Current Company] Company not found:', companyId);
        return res.status(404).json({ message: "Company not found" });
      }

      // Make sure the company data includes risk score and is_demo in the logged info
      console.log('[Current Company] Found company:', {
        id: company.id,
        name: company.name,
        onboardingCompleted: company.onboarding_company_completed,
        riskScore: company.risk_score,
        chosenScore: company.chosen_score,
        isDemo: company.is_demo
      });

      // Get user's onboarding status to ensure consistent state across company and user
      const userOnboardingStatus = req.user?.onboarding_user_completed || false;
      
      // Log detailed onboarding status for debugging
      console.log('[Current Company] Onboarding status check:', {
        userId: req.user?.id,
        companyId: companyId,
        userOnboardingStatus: userOnboardingStatus,
        companyOnboardingStatus: company.onboarding_company_completed,
        timestamp: new Date().toISOString()
      });
      
      // Transform response to include both risk_score and riskScore consistently
      // Also include isDemo for frontend usage (camelCase)
      // And onboardingCompleted for the modal check
      const transformedCompany = {
        ...company,
        risk_score: company.risk_score,                 // Keep the original property
        riskScore: company.risk_score,                  // Add the frontend expected property name
        chosen_score: company.chosen_score,             // Keep the original property
        chosenScore: company.chosen_score,              // Add camelCase version for frontend
        isDemo: company.is_demo,                        // Add camelCase version for frontend
        onboarding_company_completed: company.onboarding_company_completed, // Original DB field
        // CRITICAL FIX: Only use user's onboarding status, not company's
        // This ensures onboarding modal only appears when the current user hasn't completed onboarding
        onboardingCompleted: userOnboardingStatus
      };
      
      // Update the cache with the transformed data
      companyCache.set(companyId, { 
        company: transformedCompany, 
        timestamp: now 
      });

      // Return the transformed data to the client
      res.json(transformedCompany);
    } catch (error) {
      console.error("[Current Company] Error fetching company:", error);
      res.status(500).json({ message: "Error fetching company details" });
    }
  });

  // Force unlock file vault endpoint - direct API call to ensure immediate visibility
  // CRITICAL FIX: Direct route to unlock file vault - highest priority implementation
  app.post("/api/companies/:id/unlock-file-vault", requireAuth, async (req, res) => {
    try {
      console.log('[API] Force unlock file vault request received:', {
        userId: req.user?.id,
        companyId: req.params.id, 
        timestamp: new Date().toISOString()
      });
      
      const { id } = req.params;
      const companyId = parseInt(id);
      
      if (isNaN(companyId)) {
        return res.status(400).json({ 
          message: "Invalid company ID", 
          code: "INVALID_ID" 
        });
      }
      
      // Use the CompanyTabsService to handle unlocking
      const { CompanyTabsService } = await import('./services/companyTabsService');
      console.log(`[API] Calling CompanyTabsService.unlockFileVault for company ${companyId}`);
      
      const updatedCompany = await CompanyTabsService.unlockFileVault(companyId);
      
      if (!updatedCompany) {
        console.error(`[API] Failed to unlock file vault for company ${companyId}`);
        return res.status(404).json({ 
          message: "Failed to unlock file vault", 
          code: "UNLOCK_FAILED" 
        });
      }
      
      console.log(`[API] Successfully unlocked file vault for company ${companyId}`);
      
      // Return success response
      return res.json({
        message: "File vault unlocked successfully",
        companyId,
        availableTabs: updatedCompany.available_tabs,
        changes: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[API] Error unlocking file vault:', error);
      return res.status(500).json({ 
        message: "Internal server error", 
        code: "SERVER_ERROR" 
      });
    }
  });
  
  // Update a company's chosen risk score
  app.patch("/api/companies/:id/score", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      if (isNaN(companyId)) {
        return res.status(400).json({ 
          message: "Invalid company ID",
          code: "INVALID_ID"
        });
      }
      
      // Ensure the user belongs to this company or has a relationship with it
      const userCompanyId = req.user.company_id;
      if (companyId !== userCompanyId) {
        // Check if there's a relationship between the companies
        const relationshipCheck = await db.select()
          .from(relationships)
          .where(
            or(
              and(
                eq(relationships.company_id, userCompanyId),
                eq(relationships.related_company_id, companyId)
              ),
              and(
                eq(relationships.company_id, companyId),
                eq(relationships.related_company_id, userCompanyId)
              )
            )
          );
        
        if (!relationshipCheck || relationshipCheck.length === 0) {
          return res.status(403).json({
            message: "Unauthorized to update this company's score",
            code: "UNAUTHORIZED"
          });
        }
      }
      
      // Extract and validate the chosen_score value
      const { chosen_score } = req.body;
      
      if (chosen_score === undefined || chosen_score === null) {
        return res.status(400).json({
          message: "Missing chosen_score value",
          code: "MISSING_VALUE"
        });
      }
      
      const scoreValue = parseInt(chosen_score);
      if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 100) {
        return res.status(400).json({
          message: "Invalid score value (must be between 0 and 100)",
          code: "INVALID_VALUE"
        });
      }
      
      // Update the company's chosen score
      await db.update(companies)
        .set({
          chosen_score: scoreValue,
          updated_at: new Date()
        })
        .where(eq(companies.id, companyId));
      
      // Invalidate the cache for this company
      invalidateCompanyCache(companyId);
      
      console.log(`[Company Score] Updated chosen_score for company ${companyId} to ${scoreValue}`);
      
      // Return the updated score
      return res.json({
        message: "Score updated successfully",
        companyId,
        chosen_score: scoreValue
      });
    } catch (error) {
      console.error("[Company Score] Error updating company score:", error);
      return res.status(500).json({
        message: "Error updating company score",
        code: "SERVER_ERROR"
      });
    }
  });

  // NEW: Companies with risk data endpoint (cache-bypassing)
  app.get("/api/companies-with-risk", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        console.log('[Companies-Risk] No authenticated user found');
        return res.status(401).json({
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      console.log('[Companies-Risk] Fetching companies with risk data for user:', {
        userId: req.user.id,
        company_id: req.user.company_id
      });

      // Get all companies that either:
      // 1. The user's own company
      // 2. Companies that have a relationship with the user's company
      const networkCompanies = await db.select({
        id: companies.id,
        name: sql<string>`COALESCE(${companies.name}, '')`,
        category: sql<string>`COALESCE(${companies.category}, '')`,
        description: sql<string>`COALESCE(${companies.description}, '')`,
        accreditation_status: companies.accreditation_status,
        risk_score: companies.risk_score,
        chosen_score: companies.chosen_score,
        risk_clusters: companies.risk_clusters,
        is_demo: companies.is_demo,
        has_relationship: sql<boolean>`
          CASE 
            WHEN ${companies.id} = ${req.user.company_id} THEN true
            WHEN EXISTS (
              SELECT 1 FROM ${relationships} r 
              WHERE (r.company_id = ${companies.id} AND r.related_company_id = ${req.user.company_id})
              OR (r.company_id = ${req.user.company_id} AND r.related_company_id = ${companies.id})
            ) THEN true
            ELSE false
          END
        `
      })
        .from(companies)
        .where(
          or(
            eq(companies.id, req.user.company_id),
            sql`EXISTS (
            SELECT 1 FROM ${relationships} r 
            WHERE (r.company_id = ${companies.id} AND r.related_company_id = ${req.user.company_id})
            OR (r.company_id = ${req.user.company_id} AND r.related_company_id = ${companies.id})
          )`
          )
        )
        .orderBy(companies.name);

      console.log('[Companies-Risk] Query successful, found companies with risk data:', {
        count: networkCompanies.length,
        companiesWithRiskData: networkCompanies.filter(c => c.risk_score && c.risk_clusters).length,
        sampleRiskData: networkCompanies.slice(0, 3).map(c => ({
          id: c.id,
          name: c.name,
          risk_score: c.risk_score,
          hasRiskClusters: !!c.risk_clusters,
          accreditation_status: c.accreditation_status
        }))
      });

      // Transform to match frontend expectations with explicit field names
      const transformedCompanies = networkCompanies.map(company => ({
        id: company.id,
        name: company.name,
        category: company.category,
        description: company.description,
        accreditation_status: company.accreditation_status,
        accreditationStatus: company.accreditation_status, // Both formats
        risk_score: company.risk_score,
        riskScore: company.risk_score, // Both formats
        chosen_score: company.chosen_score,
        chosenScore: company.chosen_score, // Both formats
        risk_clusters: company.risk_clusters,
        riskClusters: company.risk_clusters, // Both formats
        is_demo: company.is_demo,
        isDemo: company.is_demo, // Both formats
        has_relationship: company.has_relationship,
        hasRelationship: company.has_relationship // Both formats
      }));

      // Add cache headers to prevent caching
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json(transformedCompanies);
    } catch (error) {
      console.error("[Companies-Risk] Error details:", error);
      res.status(500).json({
        message: "Error fetching companies with risk data",
        code: "INTERNAL_ERROR"
      });
    }
  });
  
  // Get a specific company with risk clusters data
  app.get("/api/companies/:id", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      if (isNaN(companyId)) {
        return res.status(400).json({ 
          message: "Invalid company ID",
          code: "INVALID_ID"
        });
      }
      
      console.log(`[Companies] Fetching complete company data for ID: ${companyId}`);
      
      // Fetch comprehensive company data matching CompanyProfileData interface
      const companyData = await db.select({
        id: companies.id,
        name: companies.name,
        description: companies.description,
        category: companies.category,
        // Risk scoring fields
        riskScore: companies.risk_score,
        chosenScore: companies.chosen_score,
        riskClusters: companies.risk_clusters,
        // Business information fields
        websiteUrl: companies.website_url,
        numEmployees: companies.num_employees,
        incorporationYear: companies.incorporation_year,
        productsServices: companies.products_services,
        keyClientsPartners: companies.key_clients_partners,
        investors: companies.investors,
        fundingStage: companies.funding_stage,
        legalStructure: companies.legal_structure,
        hqAddress: companies.hq_address,
        // Status and compliance fields
        accreditationStatus: companies.accreditation_status,
        revenueTier: companies.revenue_tier,
        // System fields
        onboardingCompleted: companies.onboarding_company_completed,
        isDemo: companies.is_demo,
        logoId: companies.logo_id,
        availableTabs: companies.available_tabs,
        createdAt: companies.created_at,
        updatedAt: companies.updated_at,
        // Additional fields for comprehensive profile
        certificationsCompliance: companies.certifications_compliance,
        foundersAndLeadership: companies.founders_and_leadership
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
      
      if (!companyData || companyData.length === 0) {
        console.log(`[Companies] Company not found for ID: ${companyId}`);
        return res.status(404).json({
          message: "Company not found",
          code: "NOT_FOUND"
        });
      }
      
      const company = companyData[0];
      console.log(`[Companies] Successfully fetched company: ${company.name} (${company.id})`);
      
      // Return the complete company data
      return res.json(company);
    } catch (error) {
      console.error("[Companies] Error fetching company data:", error);
      return res.status(500).json({
        message: "Error fetching company data",
        code: "SERVER_ERROR"
      });
    }
  });

  // Get company profile data for network company pages
  app.get("/api/companies/:id/profile", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      if (isNaN(companyId)) {
        return res.status(400).json({ 
          message: "Invalid company ID",
          code: "INVALID_ID"
        });
      }
      
      // Fetch comprehensive company profile data
      const companyProfile = await db.select({
        id: companies.id,
        name: companies.name,
        description: companies.description,
        category: companies.category,
        risk_score: companies.risk_score,
        chosen_score: companies.chosen_score,
        risk_clusters: companies.risk_clusters,
        onboarding_company_completed: companies.onboarding_company_completed,
        is_demo: companies.is_demo,
        revenue_tier: companies.revenue_tier,
        accreditation_status: companies.accreditation_status,
        website_url: companies.website_url,
        num_employees: companies.num_employees,
        incorporation_year: companies.incorporation_year,
        available_tabs: companies.available_tabs,
        logo_id: companies.logo_id,
        created_at: companies.created_at,
        updated_at: companies.updated_at,
        // Business information fields
        products_services: companies.products_services,
        market_position: companies.market_position,
        founders_and_leadership: companies.founders_and_leadership,
        key_clients_partners: companies.key_clients_partners,
        investors: companies.investors,
        funding_stage: companies.funding_stage,
        legal_structure: companies.legal_structure,
        hq_address: companies.hq_address,
        certifications_compliance: companies.certifications_compliance
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
      
      if (!companyProfile || companyProfile.length === 0) {
        return res.status(404).json({
          message: "Company profile not found",
          code: "NOT_FOUND"
        });
      }
      
      const company = companyProfile[0];
      console.log(`[Company Profile] Retrieved profile for company ${companyId}: ${company.name}`);
      console.log(`[Company Profile Debug] API returning data:`, {
        id: company.id,
        name: company.name,
        hasBusinessFields: {
          products_services: !!company.products_services,
          market_position: !!company.market_position,
          founders_and_leadership: !!company.founders_and_leadership,
          key_clients_partners: !!company.key_clients_partners,
          investors: !!company.investors,
          funding_stage: !!company.funding_stage,
          certifications_compliance: !!company.certifications_compliance
        },
        businessFieldValues: {
          products_services: company.products_services,
          market_position: company.market_position,
          founders_and_leadership: company.founders_and_leadership,
          key_clients_partners: company.key_clients_partners,
          investors: company.investors,
          funding_stage: company.funding_stage,
          certifications_compliance: company.certifications_compliance
        }
      });
      
      // Return the complete company profile data
      return res.json(company);
    } catch (error) {
      console.error("[Company Profile] Error fetching company profile:", error);
      return res.status(500).json({
        message: "Error fetching company profile",
        code: "SERVER_ERROR"
      });
    }
  });
  
  // Get network companies for the current user's company
  app.get("/api/companies/network", requireAuth, async (req, res) => {
    try {
      const userCompanyId = req.user.company_id;
      
      // Find all relationships where this company is either the source or target
      const companyRelationships = await db.select({
        relatedCompanyId: relationships.related_company_id,
        companyId: relationships.company_id,
      })
      .from(relationships)
      .where(
        or(
          eq(relationships.company_id, userCompanyId),
          eq(relationships.related_company_id, userCompanyId)
        )
      );
      
      if (!companyRelationships || companyRelationships.length === 0) {
        return res.json([]);
      }
      
      // Extract the IDs of all related companies
      const relatedCompanyIds = companyRelationships.map(rel => 
        rel.companyId === userCompanyId ? rel.relatedCompanyId : rel.companyId
      );
      
      // Fetch data for all related companies
      const networkCompanies = await db.select({
        id: companies.id,
        name: companies.name,
        category: companies.category,
        risk_score: companies.risk_score,
        chosen_score: companies.chosen_score,
        risk_clusters: companies.risk_clusters,
      })
      .from(companies)
      .where(inArray(companies.id, relatedCompanyIds));
      
      return res.json(networkCompanies);
    } catch (error) {
      console.error("[Companies] Error fetching network companies:", error);
      return res.status(500).json({
        message: "Error fetching network companies",
        code: "SERVER_ERROR"
      });
    }
  });
  
  // Check if a company is a demo company - accept either companyId or taskId
  app.get("/api/companies/is-demo", requireAuth, async (req, res) => {
    try {
      console.log(`[IsDemo Check] Received request with params:`, {
        taskId: req.query.taskId,
        companyId: req.query.companyId,
        userId: req.user?.id,
        userCompanyId: req.user?.company_id
      });
      
      // Accept either taskId or companyId parameter
      const taskId = req.query.taskId;
      const companyIdParam = req.query.companyId;
      
      // If neither parameter is provided, return error
      if (!taskId && !companyIdParam) {
        console.log(`[IsDemo Check] Missing required parameter - need either taskId or companyId`);
        return res.status(400).json({ 
          message: 'Missing required parameter',
          code: 'MISSING_PARAM',
          isDemo: false 
        });
      }
      
      // Handle direct company ID lookup if provided
      let directCompanyId: number | null = null;
      let parsedTaskId: number | null = null;
      let companyName: string | undefined;
      
      // Try company ID first if provided
      if (companyIdParam) {
        try {
          directCompanyId = parseInt(companyIdParam as string, 10);
          if (isNaN(directCompanyId)) {
            throw new Error('Invalid companyId format');
          }
          console.log(`[IsDemo Check] Using directly provided companyId: ${directCompanyId}`);
        } catch (err) {
          console.log(`[IsDemo Check] Error parsing companyId: ${companyIdParam}, error: ${err}`);
          return res.status(400).json({ 
            message: 'Invalid company ID',
            code: 'INVALID_ID',
            isDemo: false 
          });
        }
      }
      // If no companyId or invalid, try using taskId
      else if (taskId) {
        try {
          parsedTaskId = parseInt(taskId as string, 10);
          if (isNaN(parsedTaskId)) {
            throw new Error('Invalid taskId format');
          }
          console.log(`[IsDemo Check] Parsed valid taskId: ${parsedTaskId}`);
          
          // Get the task with metadata to find the company info directly
          console.log(`[IsDemo Check] Fetching task with ID: ${parsedTaskId}`);
        } catch (err) {
          console.log(`[IsDemo Check] Error parsing taskId: ${taskId}, error: ${err}`);
          return res.status(400).json({ 
            message: 'Invalid task ID',
            code: 'INVALID_ID',
            isDemo: false 
          });
        }
      }
      
      // If we have a direct company ID from the param, we can use it directly
      let finalCompanyId: number | null = directCompanyId;
      let taskCompanyName: string | undefined;
      
      // If we don't have a direct company ID but we have a task ID, look up the task
      if (!finalCompanyId && parsedTaskId) {
        // Only perform task lookup if we need to get the company ID from a task
        const taskResults = await db.select()
          .from(tasks)
          .where(eq(tasks.id, parsedTaskId));
        
        console.log(`[IsDemo Check] Task query results: ${taskResults?.length || 0} rows found`);
        
        if (!taskResults || taskResults.length === 0) {
          console.log(`[IsDemo Check] Task not found: ${parsedTaskId}`);
          return res.status(404).json({ 
            message: 'Task not found',
            code: 'NOT_FOUND',
            isDemo: false 
          });
        }
        
        const task = taskResults[0];
        console.log(`[IsDemo Check] Found task with metadata:`, { 
          taskId: task.id, 
          companyId: task.company_id,
          taskType: task.task_type,
          hasMetadata: task.metadata !== null,
          metadataKeys: task.metadata ? Object.keys(task.metadata) : []
        });
        
        // If the task has metadata with company_name, use that instead of looking up the company
        taskCompanyName = task.metadata?.company_name;
        
        // Set the companyId from the task details
        finalCompanyId = task.company_id || task.metadata?.company_id;
      }
      
      console.log(`[IsDemo Check] Company info:`, { 
        companyId: finalCompanyId, 
        companyName: taskCompanyName
      });
      
      // If we don't have a company ID from anywhere, we can't continue
      if (!finalCompanyId) {
        console.log(`[IsDemo Check] No company ID available - cannot proceed`);
        return res.status(400).json({ 
          message: "Missing company ID",
          code: "INVALID_ID",
          isDemo: false 
        });
      }
      
      // If we have a company name in the metadata and it's one of our known demo companies
      if (taskCompanyName && taskCompanyName === 'DevelopmentTesting3') {
        console.log(`[IsDemo Check] Company name "${taskCompanyName}" from metadata matches known demo company`);
        
        // First check the database anyway
        try {
          console.log(`[IsDemo Check] Fetching company details from database as double-check`);
          
          // Get the company
          const companyResults = await db.select({
            id: companies.id,
            name: companies.name,
            isDemo: companies.is_demo
          })
          .from(companies)
          .where(eq(companies.id, finalCompanyId));
          
          console.log(`[IsDemo Check] Company query results: ${companyResults?.length || 0} rows found`);
          
          if (companyResults && companyResults.length > 0) {
            const company = companyResults[0];
            
            // Log the raw company data to help debug
            console.log(`[IsDemo Check] Company data from database:`, {
              id: company.id,
              name: company.name,
              isDemo: company.isDemo,
              isDemoType: typeof company.isDemo,
              rawValue: company.isDemo
            });
            
            // Use the database value if available
            const isCompanyDemo = company.isDemo === true;
            
            // Return the demo status with debug information
            return res.json({
              isDemo: isCompanyDemo, 
              companyId: company.id,
              companyName: company.name,
              taskId: parsedTaskId,
              source: 'database',
              debug: {
                isDemo: company.isDemo,
                isDemoType: typeof company.isDemo,
                companyName: company.name,
                dbValueUsed: true
              }
            });
          }
        } catch (dbError) {
          console.error('[IsDemo Check] Error looking up company in database:', dbError);
          // Continue to fallback below
        }
        
        // Fallback to using the name-based check if database lookup fails
        console.log(`[IsDemo Check] Using name-based check for demo company "${taskCompanyName}"`);
        
        // Return using name-based check
        return res.json({
          isDemo: false, // Always return false now if database didn't have the value
          companyId: finalCompanyId,
          companyName: taskCompanyName,
          taskId: parsedTaskId,
          source: 'metadata',
          debug: {
            isDemo: false,
            isDemoType: 'boolean',
            companyName: taskCompanyName,
            metadataValueUsed: true
          }
        });
      }
      
      // If we get here, we need to check the database for the company
      console.log(`[IsDemo Check] Fetching company with ID: ${finalCompanyId}`);
      
      // Get the company
      const companyResults = await db.select({
        id: companies.id,
        name: companies.name,
        isDemo: companies.is_demo
      })
      .from(companies)
      .where(eq(companies.id, finalCompanyId));
      
      console.log(`[IsDemo Check] Company query results: ${companyResults?.length || 0} rows found`);
      
      if (!companyResults || companyResults.length === 0) {
        console.log(`[IsDemo Check] Company not found for ID ${finalCompanyId}`);
        return res.status(404).json({ 
          message: 'Company not found',
          code: 'NOT_FOUND',
          isDemo: false 
        });
      }
      
      const company = companyResults[0];
      
      // Log the raw company data to help debug
      console.log(`[IsDemo Check] Company data:`, {
        id: company.id,
        name: company.name,
        isDemo: company.isDemo,
        isDemoType: typeof company.isDemo,
        rawValue: company.isDemo
      });
      
      // Return the demo status with debug information
      res.json({
        isDemo: company.isDemo === true, // Ensure this is a boolean true/false
        companyId: company.id,
        companyName: company.name,
        taskId: parsedTaskId,
        source: 'database',
        debug: {
          isDemo: company.isDemo,
          isDemoType: typeof company.isDemo,
          companyName: company.name
        }
      });
    } catch (error) {
      console.error('Error checking company demo status:', error);
      res.status(500).json({ 
        error: 'Failed to check company demo status',
        isDemo: false 
      });
    }
  });


  // Tasks cache
  const tasksCache = new Map<string, { data: any[], timestamp: number }>();
  const TASKS_CACHE_TTL = 30 * 1000; // 30 seconds in milliseconds - shorter than user/company caches for more frequent updates

  // Tasks endpoints
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const now = Date.now();
      const userId = req.user.id;
      const companyId = req.user.company_id;
      const userEmail = req.user.email;
      
      // Create a cache key based on user ID, company ID, and email
      const cacheKey = `${userId}_${companyId}_${userEmail}`;
      const cachedData = tasksCache.get(cacheKey);
      
      // Use cached data if it exists and is not expired
      if (cachedData && (now - cachedData.timestamp) < TASKS_CACHE_TTL) {
        // Only log cache hits occasionally to reduce log noise
        if (Math.random() < 0.1) { // Log ~10% of cache hits (more than the user cache for monitoring)
          console.log('[Tasks] Using cached task data for user:', userId);
        }
        return res.json(cachedData.data);
      }
      
      console.log('[Tasks] ====== Starting task fetch =====');
      console.log('[Tasks] User details:', {
        id: userId,
        company_id: companyId,
        email: userEmail
      });

      // Dynamic Task Unlocking: Check if any security tasks need to be unlocked
      // This ensures tasks are properly unlocked whenever a user accesses the Task Center
      try {
        const unlockResult = await checkAndUnlockSecurityTasks(companyId, userId);
        if (unlockResult.unlocked) {
          console.log('[Tasks] Dynamic task unlocking completed successfully:', {
            companyId,
            userId,
            tasksUnlocked: unlockResult.count,
            message: unlockResult.message
          });
          
          // Clear task cache to ensure updated task status is returned
          tasksCache.delete(cacheKey);
        }
        
        // Always process task dependencies and ensure all tasks are unlocked
        // This makes the dependency chain optional rather than enforced
        try {
          console.log('[Tasks] Automatically unlocking all tasks for company', {
            userId,
            companyId,
            requestedBy: 'automatic_task_unlock'
          });
          
          // Import and use task dependency processors
          // Use dynamic import to handle the ESM module properly
          const taskDependencies = await import('./routes/task-dependencies');
          const unlockAllTasks = taskDependencies.unlockAllTasks;
          
          // Unlock ALL tasks for this company regardless of dependencies
          await unlockAllTasks(companyId);
          
          // Clear task cache to ensure updated task status is returned
          tasksCache.delete(cacheKey);
          
          console.log('[Tasks] Successfully unlocked all tasks for company:', companyId);
        } catch (depError) {
            console.error('[Tasks] Error unlocking all tasks:', {
              userId,
              companyId,
              error: depError instanceof Error ? depError.message : 'Unknown error'
            });
          }
      } catch (unlockError) {
        console.error('[Tasks] Error in dynamic task unlocking:', unlockError);
        // Continue with regular task fetching even if dynamic unlocking fails
      }

      // First, let's check if there are any company-wide KYB tasks
      const kybTasks = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.company_id, companyId),
          eq(tasks.task_type, 'company_kyb'),
          eq(tasks.task_scope, 'company')
        ));

      console.log('[Tasks] KYB tasks found:', {
        count: kybTasks.length
      });

      // Get all tasks that are either:
      // 1. Assigned to the user
      // 2. Created by the user
      // 3. Company tasks (company_id matches user's company and no specific assignee)
      // 4. KYB tasks for the user's company
      // 5. User onboarding tasks for the user's email
      const query = or(
        eq(tasks.assigned_to, userId),
        eq(tasks.created_by, userId),
        and(
          eq(tasks.company_id, companyId),
          isNull(tasks.assigned_to),
          eq(tasks.task_scope, 'company')
        ),
        and(
          eq(tasks.task_type, 'user_onboarding'),
          sql`LOWER(${tasks.user_email}) = LOWER(${userEmail})`
        )
      );

      console.log('[Tasks] Query conditions:', {
        conditions: {
          condition1: `tasks.assigned_to = ${userId}`,
          condition2: `tasks.created_by = ${userId}`,
          condition3: `tasks.company_id = ${companyId} AND tasks.assigned_to IS NULL AND tasks.task_scope = 'company'`,
          condition4: `tasks.task_type = 'user_onboarding' AND LOWER(tasks.user_email) = LOWER('${userEmail}')`
        }
      });

      const userTasks = await db.select()
        .from(tasks)
        .where(query)
        .orderBy(sql`created_at DESC`);

      console.log('[Tasks] Tasks found:', {
        count: userTasks.length,
        // No longer showing the full task list for better console readability
      });
      
      // Update the cache
      tasksCache.set(cacheKey, {
        data: userTasks,
        timestamp: now
      });

      res.json(userTasks);
    } catch (error) {
      console.error("[Tasks] Error details:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        position: error.position,
        hint: error.hint
      });
      console.error("[Tasks] Full error:", error);
      res.status(500).json({
        message: "Error fetching tasks",
        detail: error.message
      });
    }
  });

  // Relationships endpoints
  app.get("/api/relationships", requireAuth, async (req, res) => {
    try {
      console.log('[Relationships] Fetching network for company:', req.user.company_id);

      // Get all relationships where the current company is either the creator or related company
      const networkRelationships = await db.select({
        id: relationships.id,
        companyId: relationships.company_id,
        relatedCompanyId: relationships.related_company_id,
        relationshipType: relationships.relationship_type,
        status: relationships.status,
        metadata: relationships.metadata,
        createdAt: relationships.created_at,
        // Join with companies to get related company details
        relatedCompany: {
          id: companies.id,
          name: companies.name,
          category: companies.category,
          logoId: companies.logo_id,
          accreditationStatus: companies.accreditation_status,
          riskScore: companies.risk_score,
          isDemo: companies.is_demo
        }
      })
        .from(relationships)
        .innerJoin(
          companies,
          eq(
            companies.id,
            sql`CASE 
          WHEN ${relationships.company_id} = ${req.user.company_id} THEN ${relationships.related_company_id}
          ELSE ${relationships.company_id}
        END`
          )
        )
        .where(
          or(
            eq(relationships.company_id, req.user.company_id),
            eq(relationships.related_company_id, req.user.company_id)
          )
        )
        .orderBy(companies.name);

      console.log('[Relationships] Found network members:', {
        count: networkRelationships.length,
        // No longer showing the full relationship list for better console readability
      });

      res.json(networkRelationships);
    } catch (error) {
      console.error("[Relationships] Error fetching relationships:", error);
      res.status(500).json({ message: "Error fetching relationships" });
    }
  });
  
  // Network Visualization cache
  const networkCache = new Map<number, { data: any, timestamp: number }>();
  const NETWORK_CACHE_TTL = 60 * 1000; // 60 seconds in milliseconds - network data changes less frequently
  
  // Network Visualization endpoint
  app.get("/api/network/visualization", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        console.log('[Network Visualization] No authenticated user found');
        return res.status(401).json({
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }
      
      const now = Date.now();
      const companyId = req.user.company_id;
      const cachedData = networkCache.get(companyId);
      
      // Use cached data if it exists and is not expired
      if (cachedData && (now - cachedData.timestamp) < NETWORK_CACHE_TTL) {
        if (Math.random() < 0.1) { // Log only ~10% of cache hits to reduce noise
          console.log('[Network Visualization] Using cached network data for company:', companyId);
        }
        return res.json(cachedData.data);
      }
      
      console.log('[Network Visualization] Fetching network data for company:', companyId);

      // 1. Get current company info for the center node
      const [currentCompany] = await db.select({
        id: companies.id,
        name: companies.name,
        category: sql<string>`COALESCE(${companies.category}, '')`,
        riskScore: companies.risk_score,
        accreditationStatus: sql<string>`COALESCE(${companies.accreditation_status}, 'PENDING')`,
        isDemo: companies.is_demo
      })
      .from(companies)
      .where(eq(companies.id, req.user.company_id));

      if (!currentCompany) {
        console.error('[Network Visualization] Company not found:', req.user.company_id);
        return res.status(404).json({ 
          message: "Company not found",
          code: "COMPANY_NOT_FOUND"
        });
      }

      // 2. Get all relationships where current company is either the source or target
      const networkRelationships = await db.select({
        id: relationships.id,
        companyId: relationships.company_id,
        relatedCompanyId: relationships.related_company_id,
        relationshipType: relationships.relationship_type,
        status: relationships.status,
        metadata: relationships.metadata,
        // Join with companies to get related company details
        relatedCompany: {
          id: companies.id,
          name: companies.name,
          category: sql<string>`COALESCE(${companies.category}, '')`,
          accreditationStatus: sql<string>`COALESCE(${companies.accreditation_status}, 'PENDING')`,
          riskScore: sql<number>`COALESCE(${companies.risk_score}, 0)`,
          revenueTier: companies.revenue_tier,
          isDemo: companies.is_demo
        }
      })
      .from(relationships)
      .innerJoin(
        companies,
        eq(
          companies.id,
          sql`CASE 
            WHEN ${relationships.company_id} = ${req.user.company_id} THEN ${relationships.related_company_id}
            ELSE ${relationships.company_id}
          END`
        )
      )
      .where(
        or(
          eq(relationships.company_id, req.user.company_id),
          eq(relationships.related_company_id, req.user.company_id)
        )
      );

      console.log('[Network Visualization] Found network relationships:', {
        count: networkRelationships.length
      });

      // 3. Determine risk bucket for each company on 0-100 scale
      const getRiskBucket = (score: number): RiskBucket => {
        if (score === 0) return 'none';
        if (score <= 33) return 'low';
        if (score <= 66) return 'medium';
        if (score <= 99) return 'high';
        return 'critical';
      };

      // 4. Transform into the expected format
      const nodes = networkRelationships.map(rel => {
        // Get revenue tier from either the company record or metadata, or use default
        const revenueTier = rel.relatedCompany.revenueTier || (rel.metadata?.revenueTier as string) || 'Enterprise';
        
        // Create node for the visualization
        return {
          id: rel.relatedCompany.id,
          name: rel.relatedCompany.name,
          relationshipId: rel.id,
          relationshipType: rel.relationshipType || 'partner',
          relationshipStatus: rel.status || 'active',
          riskScore: rel.relatedCompany.riskScore || 0,
          riskBucket: getRiskBucket(rel.relatedCompany.riskScore || 0),
          accreditationStatus: rel.relatedCompany.accreditationStatus || 'PENDING',
          revenueTier,
          category: rel.relatedCompany.category || 'Other',
          // activeConsents field removed as it doesn't exist in the database schema
          isDemo: rel.relatedCompany.isDemo
        };
      });

      // 5. Create the response object
      const responseData: NetworkVisualizationData = {
        center: {
          id: currentCompany.id,
          name: currentCompany.name,
          riskScore: currentCompany.riskScore || 0,
          riskBucket: getRiskBucket(currentCompany.riskScore || 0),
          accreditationStatus: currentCompany.accreditationStatus || 'PENDING',
          revenueTier: 'Enterprise', // Default for the logged-in company
          category: currentCompany.category || 'FinTech',
          isDemo: currentCompany.isDemo
        },
        nodes
      };

      console.log('[Network Visualization] Returning visualization data:', {
        centerNode: responseData.center.name,
        nodeCount: responseData.nodes.length
      });
      
      // Update the cache with fresh data
      networkCache.set(companyId, {
        data: responseData,
        timestamp: now
      });

      res.json(responseData);
    } catch (error) {
      console.error("[Network Visualization] Error details:", {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        message: "Error fetching network visualization data",
        code: "INTERNAL_ERROR"
      });
    }
  });

  // Account setup endpoint
  app.post("/api/account/setup", async (req, res) => {
    try {
      const { email, password, fullName, firstName, lastName, invitationCode } = req.body;

      console.log('[Account Setup] Processing setup request for:', email);

      // Validate invitation code
      const [invitation] = await db.select()
        .from(invitations)
        .where(and(
          eq(invitations.code, invitationCode.toUpperCase()),
          eq(invitations.status, 'pending'),
          sql`LOWER(${invitations.email}) = LOWER(${email})`,
          gt(invitations.expires_at, new Date())
        ));

      if (!invitation) {
        console.log('[Account Setup] Invalid invitation:', invitationCode);
        return res.status(400).json({
          message: "Invalid invitation code or email mismatch"
        });
      }

      // Find existing user with case-insensitive email match
      const [existingUser] = await db.select()
        .from(users)
        .where(sql`LOWER(${users.email}) = LOWER(${email})`);

      if (!existingUser) {
        console.log('[Account Setup] User not found for email:', email);
        return res.status(400).json({ message: "User account not found" });
      }

      // Update the existing user with new information
      const [updatedUser] = await db.update(users)
        .set({
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          password: await bcrypt.hash(password, 10),
          onboarding_user_completed: false, // Ensure this stays false for new user registration
        })
        .where(eq(users.id, existingUser.id))
        .returning();

      console.log('[Account Setup] Updated user:', {
        id: updatedUser.id,
        email: updatedUser.email,
        onboarding_completed: updatedUser.onboarding_user_completed
      });

      // Update the related task - improved to handle all user onboarding tasks
      // We now search for all user onboarding tasks for this email, not just those with EMAIL_SENT status
      const onboardingTasks = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.user_email, email.toLowerCase()),
          eq(tasks.task_type, 'user_onboarding')
        ));

      console.log(`[Account Setup] Found ${onboardingTasks.length} onboarding tasks for email: ${email.toLowerCase()}`);

      if (onboardingTasks.length > 0) {
        // Update all associated tasks to ensure consistent state
        for (const task of onboardingTasks) {
          const [updatedTask] = await db.update(tasks)
            .set({
              status: TaskStatus.COMPLETED,
              progress: 100, // Set directly to 100 for completed status
              assigned_to: updatedUser.id, // Ensure user is properly assigned to the task
              metadata: {
                ...task.metadata,
                registeredAt: new Date().toISOString(),
                completed: true,
                submission_date: new Date().toISOString(),
                statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.COMPLETED]
              }
            })
            .where(eq(tasks.id, task.id))
            .returning();
            
          // Get the updated task after the update operation
          console.log(`[Account Setup] Updated task: ${task.id} for user: ${updatedUser.id}, status: 'completed', progress: 100%`);
        }

        // Log summary of the tasks that were updated
        const lastUpdatedTask = onboardingTasks[onboardingTasks.length - 1];
        console.log('[Account Setup] Updated task status summary:', {
          taskCount: onboardingTasks.length,
          lastTaskId: lastUpdatedTask.id,
          status: TaskStatus.COMPLETED,
          progress: 100 // Explicitly set to 100% for completed status
        });

        // Use the imported broadcast function from unified-websocket
        // This ensures we're using the standardized WebSocket implementation
        // Broadcast update for each task that was modified
        for (const task of onboardingTasks) {
          // Broadcast a task update with corrected taskId parameter
          broadcast('task_updated', {
            taskId: task.id,
            status: TaskStatus.COMPLETED,
            progress: 100,
            metadata: {
              completed: true,
              submission_date: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
          });
          console.log(`[Account Setup] Broadcast task update for task ${task.id}`);
        }
      }

      // Update invitation status
      await db.update(invitations)
        .set({
          status: 'used',
          used_at: new Date(),
        })
        .where(eq(invitations.id, invitation.id));

      // ========================================
      // TASK ASSIGNMENT POLICY ENFORCEMENT
      // ========================================
      
      /**
       * REMOVED: Duplicate Task Creation Logic
       * 
       * Previously, this section attempted to create company tasks during user login,
       * which resulted in duplicate tasks for New Data Recipients. This violated the
       * DRY principle and created data inconsistencies.
       * 
       * CURRENT APPROACH:
       * - Company tasks are created ONLY during company creation (demo-api.ts)
       * - Uses the same proven service pattern as FinTech invitations
       * - Ensures single source of truth for task assignment
       * - Eliminates duplicate task creation across different user flows
       * 
       * @see server/demo-api.ts - Primary task creation during company setup
       * @see server/services/company.ts - Unified task creation service
       * @see server/routes.ts (FinTech invite) - Reference implementation pattern
       * 
       * @removed 2025-05-27 - Duplicate task creation logic
       * @rationale DRY principle compliance and data integrity
       */
      
      // Verify company exists and log account setup completion
      try {
        const [companyDetails] = await db.select()
          .from(companies)
          .where(eq(companies.id, existingUser.company_id))
          .limit(1);

        if (companyDetails) {
          console.log('[Account Setup] ✅ Account setup completed successfully:', {
            userId: updatedUser.id,
            userEmail: updatedUser.email,
            companyId: companyDetails.id,
            companyName: companyDetails.name,
            companyType: companyDetails.is_demo ? 'Demo' : 'Production',
            accreditationStatus: companyDetails.accreditation_status,
            setupTimestamp: new Date().toISOString(),
            taskCreationApproach: 'Handled during company creation (no duplicates)'
          });
        }
      } catch (companyVerificationError) {
        // Log verification error but don't fail the account setup
        console.warn('[Account Setup] ⚠️ Company verification failed (non-critical):', {
          error: companyVerificationError.message,
          userId: updatedUser.id,
          companyId: existingUser.company_id,
          timestamp: new Date().toISOString()
        });
      }

      // Log the user in - wrap req.login in a Promise for proper async/await handling
      await new Promise<void>((resolve, reject) => {
        req.login(updatedUser, (err) => {
          if (err) {
            console.error("[Account Setup] Login error:", err);
            reject(err);
          } else {
            console.log("[Account Setup] Login successful for user ID:", updatedUser.id);
            resolve();
          }
        });
      }).catch(err => {
        throw new Error(`Login failed: ${err.message}`);
      });

      // Only respond after successful login
      res.json(updatedUser);

    } catch (error) {
      console.error("[Account Setup] Account setup error:", error);
      res.status(500).json({ message: "Error updating user information" });
    }
  });

  // Add new endpoint after account setup endpoint
  app.post("/api/user/complete-onboarding", requireAuth, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(400).json({ 
          message: "Missing user information",
          error: "User data is required for onboarding completion" 
        });
      }
      
      const userId = req.user.id;
      const companyId = req.user.company_id;
      const startTime = Date.now();
      
      console.log('[User Onboarding] Completing onboarding for user and company:', {
        userId: userId,
        companyId: companyId,
        timestamp: new Date().toISOString()
      });

      // Variable to store updated user and company data
      let updatedUserData = null;
      let updatedCompanyData = null;
      
      // Create transaction to update the user record only
      // We no longer update company onboarding status here to avoid premature company onboarding completion
      await db.transaction(async (tx) => {
        // Update only the user record to mark onboarding as completed
        const [updatedUser] = await tx.update(users)
          .set({
            onboarding_user_completed: true,
            updated_at: new Date()
          })
          .where(eq(users.id, userId))
          .returning();
          
        if (!updatedUser) {
          throw new Error(`Failed to update user ${userId} onboarding status`);
        }
        
        // Save for use outside the transaction
        updatedUserData = updatedUser;
        
        // Get current company data without modifying it
        const [company] = await tx.select()
          .from(companies)
          .where(eq(companies.id, companyId));
          
        if (!company) {
          throw new Error(`Company ${companyId} not found`);
        }
        
        // Save for use outside the transaction without modifying onboarding status
        updatedCompanyData = company;
        
        console.log('[User Onboarding] Successfully updated user onboarding status:', {
          userId: updatedUser.id,
          companyId: company.id,
          userOnboardingStatus: updatedUser.onboarding_user_completed,
          companyOnboardingStatus: company.onboarding_company_completed, // Unchanged
          elapsedMs: Date.now() - startTime
        });
      });

      // After successful transaction, now try to update the onboarding task as well
      try {
        // Also update the onboarding task to mark it as completed
        const updatedTask = await updateOnboardingTaskStatus(userId);
        
        console.log('[User Onboarding] Updated task status:', {
          userId: userId,
          taskUpdated: !!updatedTask,
          taskId: updatedTask?.id,
          elapsedMs: Date.now() - startTime
        });
        
        // Invalidate company cache to ensure fresh data is returned
        invalidateCompanyCache(companyId);
        
        // Return success response with appropriate details
        return res.json({
          success: true,
          message: "Onboarding completed successfully",
          user: updatedUserData,
          company: (updatedCompanyData && typeof updatedCompanyData === 'object') ? {
            id: updatedCompanyData.id,
            name: updatedCompanyData.name,
            onboardingCompleted: true
          } : null,
          elapsedMs: Date.now() - startTime
        });
      } catch (taskError) {
        console.error('[User Onboarding] Error updating task status:', taskError);
        
        // Still return success since the main transaction succeeded
        return res.json({
          success: true,
          message: "Onboarding completed successfully, but task status update failed",
          user: updatedUserData,
          company: (updatedCompanyData && typeof updatedCompanyData === 'object') ? {
            id: updatedCompanyData.id,
            name: updatedCompanyData.name,
            onboardingCompleted: true
          } : null,
          elapsedMs: Date.now() - startTime
        });
      }
    } catch (error) {
      console.error("[User Onboarding] Error updating onboarding status:", error);
      
      // Invalidate company cache to trigger a fresh fetch of data next time
      try {
        if (req.user && req.user.company_id) {
          invalidateCompanyCache(req.user.company_id);
        }
      } catch (cacheError) {
        console.error("[User Onboarding] Error invalidating cache:", cacheError);
      }
      
      res.status(500).json({ 
        message: "Error updating onboarding status",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // File upload endpoint
  app.post("/api/files/upload", requireAuth, logoUpload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const storedPath = req.file.filename;

      // Check if file already exists
      const existingFile = await db.select()
        .from(files)
        .where(and(
          eq(files.name, req.file.originalname),
          eq(files.user_id, req.user.id)
        ));

      if (existingFile.length > 0) {
        try {
          // Update existing file record
          const [updatedFile] = await db.update(files)
            .set({
              size: req.file.size,
              type: req.file.mimetype,
              path: storedPath,
              version: existingFile[0].version + 1
            })
            .where(eq(files.id, existingFile[0].id))
            .returning();

          console.log('Debug - Updated existing file record:', updatedFile);
          return res.status(200).json(updatedFile);
        } catch (error) {
          console.error('Error updating existing file:', error);
          // Clean up uploaded file on error
          const newFilePath = path.resolve('/home/runner/workspace/uploads', req.file.filename);
          if (fs.existsSync(newFilePath)) {
            fs.unlinkSync(newFilePath);
          }
          throw error;
        }
      }

      // Create new file record
      const fileData = {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
        path: storedPath,
        status: 'uploaded',
        user_id: req.user.id,
        company_id: req.user.company_id,
        download_count: 0,
        version: 1.0,
      };

      const [file] = await db.insert(files)
        .values(fileData)
        .returning();

      console.log('Debug - Created new file record:', file);
      res.status(201).json(file);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Error uploading file" });

      // Clean up uploaded file on error
      if (req.file) {
        const filePath = path.resolve('/home/runner/workspace/uploads', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
  });


  app.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const [file] = await db.select()
        .from(files)
        .where(and(
          eq(files.id, parseInt(req.params.id)),
          eq(files.user_id, req.user.id)
        ));

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Remove the file from storage
      const filePath = path.resolve('/home/runner/workspace/uploads', file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Update file status to deleted
      await db.update(files)
        .set({ status: 'deleted' })
        .where(eq(files.id, file.id));

      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Error deleting file" });
    }
  });

  // Add file restore endpoint
  app.post("/api/files/:id/restore", requireAuth, async (req, res) => {
    try {
      // Find the file
      const [file] = await db.select()
        .from(files)
        .where(and(
          eq(files.id, parseInt(req.params.id)),
          eq(files.user_id, req.user.id)
        ));

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      if (file.status !== 'deleted') {
        return res.status(400).json({ message: "File is not in deleted state" });
      }

      // Update file status to restored
      const [updatedFile] = await db.update(files)
        .set({ status: 'restored' })
        .where(eq(files.id, file.id))
        .returning();

      res.json(updatedFile);
    } catch (error) {
      console.error("Error restoring file:", error);
      res.status(500).json({ message: "Error restoring file" });
    }
  });

  // Update company logo upload endpoint
  app.post("/api/companies/:id/logo", requireAuth, logoUpload.single('logo'), async (req, res) => {
    try {
      if (!req.file) {
        console.log('Debug - No logo filein request');
        return res.status(400).json({ message: "No logo uploaded" });
      }

      console.log('Debug - Received logo upload:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const companyId = parseInt(req.params.id);
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));

      if (!company) {
        console.log('Debug - Company not found:', companyId);
        return res.status(404).json({ message: "Company not found" });
      }

      // If company already has a logo, delete the old file
      if (company.logo_id) {
        const [oldLogo] = await db.select()
          .from(companyLogos)
          .where(eq(companyLogos.id, company.logo_id));

        if (oldLogo) {
          const oldFilePath = path.resolve('/home/runner/workspace/uploads/logos', oldLogo.file_path);
          console.log('Debug - Attempting to delete old logo:', oldFilePath);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
            console.log('Debug - Successfully deleted old logo');
          } else {
            console.log('Debug - Old logo file not found on disk');
          }
        }
      }

      // Create logo record
      const [logo] = await db.insert(companyLogos)
        .values({
          company_id: companyId,
          file_name: req.file.originalname,
          file_path: req.file.filename,
          file_type: req.file.mimetype,
        })
        .returning();

      console.log('Debug - Created new logo record:', logo);

      // Update company with logo reference
      await db.update(companies)
        .set({ logo_id: logo.id })
        .where(eq(companies.id, companyId));

      // Verify file exists in the correct location
      const uploadedFilePath = path.resolve('/home/runner/workspace/uploads/logos', req.file.filename);
      console.log('Debug - Verifying uploaded file exists:', uploadedFilePath);
      if (!fs.existsSync(uploadedFilePath)) {
        console.error('Debug - Logo file not found after upload!');
        throw new Error('Logo file not found after upload');
      }

      res.json(logo);
    } catch (error) {
      console.error("Error uploading company logo:", error);
      res.status(500).json({ message: "Error uploading company logo" });
    }
  });

  // Update the company logo endpoint to properly handle logo_id correctly
  app.get("/api/companies/:id/logo", requireAuth, async (req, res) => {
    try {
      console.log(`[Company Logo] Fetching logo for company ID: ${req.params.id}`);

      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, parseInt(req.params.id)));

      if (!company) {
        console.log(`[Company Logo] Company not found: ${req.params.id}`);
        return res.status(404).json({
          message: "Company not found",
          code: "COMPANY_NOT_FOUND"
        });
      }

      if (!company.logo_id) {
        console.log(`[Company Logo] No logo assigned for company: ${company.name} (${company.id})`);
        return res.status(404).json({
          message: "No logo assigned to company",
          code: "LOGO_NOT_ASSIGNED"
        });
      }

      // Get logo record and log it for debugging
      const [logo] = await db.select()
        .from(companyLogos)
        .where(eq(companyLogos.id, company.logo_id));

      console.log(`[Company Logo] Found logo record:`, logo);

      if (!logo) {
        console.log(`[Company Logo] Logo record not found for company ${company.name} (${company.id}), logo_id: ${company.logo_id}`);
        return res.status(404).json({
          message: "Logo record not found",
          code: "LOGO_RECORD_NOT_FOUND"
        });
      }

      if (!logo.file_path) {
        console.log(`[Company Logo] Logo file path is missing for company ${company.name}`);
        return res.status(404).json({
          message: "Logo file path is missing",
          code: "LOGO_PATH_MISSING"
        });
      }

      // Resolve correct file path
      const filePath = path.resolve('/home/runner/workspace/uploads/logos', logo.file_path);
      console.log(`[Company Logo] Attempting to serve logo from: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        console.error(`Logo file missing for company ${company.name} (${company.id}): ${filePath}`);
        return res.status(404).json({
          message: "Logo file not found on disk",
          code: "LOGO_FILE_MISSING"
        });
      }

      try {
        // Validate SVG content
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('<?xml') && !content.includes('<svg')) {
          console.error(`[Company Logo] Invalid SVG content for company ${company.name}:`, content.slice(0, 100));
          return res.status(400).json({
            message: "Invalid SVG file",
            code: "INVALID_SVG_CONTENT"
          });
        }

        // Set proper headers
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        console.log(`[Company Logo] Successfully served logo for company ${company.name} (${company.id})`);
      } catch (readError) {
        console.error(`[Company Logo] Error reading SVG file for company ${company.name}:`, readError);
        return res.status(500).json({
          message: "Error reading logo file",
          code: "LOGO_READ_ERROR"
        });
      }
    } catch (error) {
      console.error(`[Company Logo] Error serving company logo for ID ${req.params.id}:`, error);
      res.status(500).json({
        message: "Error serving company logo",
        code: "LOGO_SERVER_ERROR"
      });
    }
  });

  // Get accreditation information for a company
  app.get("/api/companies/:id/accreditation", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      if (isNaN(companyId)) {
        return res.status(400).json({
          message: "Invalid company ID",
          code: "INVALID_ID"
        });
      }

      console.log('[Accreditation] Fetching accreditation for company:', companyId);

      // Query accreditation history directly to avoid import issues
      const accreditationResult = await db
        .select({
          id: accreditationHistory.id,
          accreditation_number: accreditationHistory.accreditation_number,
          issued_date: accreditationHistory.issued_date,
          expires_date: accreditationHistory.expires_date,
          status: accreditationHistory.status
        })
        .from(accreditationHistory)
        .where(
          and(
            eq(accreditationHistory.company_id, companyId),
            eq(accreditationHistory.status, 'ACTIVE')
          )
        )
        .orderBy(desc(accreditationHistory.created_at))
        .limit(1);
      
      if (!accreditationResult || accreditationResult.length === 0) {
        return res.json(null);
      }
      
      const accreditation = accreditationResult[0];
      const isPermanent = accreditation.expires_date === null;
      
      // Calculate days until expiration
      let daysUntilExpiration = null;
      if (!isPermanent && accreditation.expires_date) {
        const now = new Date();
        const diffTime = accreditation.expires_date.getTime() - now.getTime();
        daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      const result = {
        id: accreditation.id,
        accreditationNumber: accreditation.accreditation_number,
        issuedDate: accreditation.issued_date,
        expiresDate: accreditation.expires_date,
        status: accreditation.status,
        daysUntilExpiration,
        isPermanent
      };
      
      console.log('[Accreditation] Found accreditation:', result);
      res.json(result);
    } catch (error) {
      console.error('[Accreditation] Error fetching accreditation:', error);
      res.status(500).json({ 
        message: "Error fetching accreditation details",
        code: "SERVER_ERROR"
      });
    }
  });

  // Add this endpoint to handle fintech company check
  app.post("/api/fintech/check-company", requireAuth, async (req, res) => {
    try {
      const { company_name } = req.body;

      if (!company_name) {
        return res.status(400).json({
          message: "Company name is required"
        });
      }

      // Check for existing company with same name
      const [existingCompany] = await db.select()
        .from(companies)
        .where(sql`LOWER(${companies.name}) = LOWER(${company_name})`);

      if (existingCompany) {
        return res.status(409).json({
          message: "A company with this name already exists",
          existingCompany: {
            id: existingCompany.id,
            name: existingCompany.name,
            category: existingCompany.category
          }
        });
      }

      res.status(200).json({ exists: false });

    } catch (error) {
      console.error("Error checking company existence:", error);
      res.status(500).json({
        message: "Error checking company existence"
      });
    }
  });

  // Get risk trend data for a company
  app.get("/api/companies/:id/risk-trend", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      if (isNaN(companyId)) {
        return res.status(400).json({
          message: "Invalid company ID",
          code: "INVALID_ID"
        });
      }

      // Get current company data
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId),
        columns: {
          id: true,
          name: true,
          risk_score: true,
          previous_risk_score: true,
          updated_at: true
        }
      });

      if (!company) {
        return res.status(404).json({
          message: "Company not found",
          code: "COMPANY_NOT_FOUND"
        });
      }

      const currentRisk = company.risk_score || 0;
      const previousRisk = company.previous_risk_score || currentRisk;
      const change = currentRisk - previousRisk;
      
      let direction: 'up' | 'down' | 'stable' = 'stable';
      if (change > 0) direction = 'up';
      else if (change < 0) direction = 'down';

      const percentage = previousRisk > 0 ? Math.abs((change / previousRisk) * 100) : 0;

      res.json({
        change,
        direction,
        percentage: Math.round(percentage * 100) / 100
      });

    } catch (error) {
      console.error(`[Risk Trend] Error fetching risk trend for company ${req.params.id}:`, error);
      res.status(500).json({
        message: "Error fetching risk trend data",
        code: "FETCH_ERROR"
      });
    }
  });

  // Get risk status summary for a company
  app.get("/api/companies/:id/risk-status", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      if (isNaN(companyId)) {
        return res.status(400).json({
          message: "Invalid company ID",
          code: "INVALID_ID"
        });
      }

      // Get current company data
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId),
        columns: {
          id: true,
          name: true,
          risk_score: true,
          updated_at: true
        }
      });

      if (!company) {
        return res.status(404).json({
          message: "Company not found",
          code: "COMPANY_NOT_FOUND"
        });
      }

      const riskScore = company.risk_score || 0;
      
      // Calculate risk status based on score
      let status = 'Stable';
      if (riskScore >= 70) {
        status = 'Blocked';
      } else if (riskScore >= 50) {
        status = 'Approaching Block';
      }

      // Calculate days in current status (simplified for now)
      const updatedAt = new Date(company.updated_at);
      const now = new Date();
      const daysInStatus = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

      // Determine trend based on risk score
      let trend: 'improving' | 'stable' | 'deteriorating' = 'stable';
      if (riskScore < 30) trend = 'improving';
      else if (riskScore > 60) trend = 'deteriorating';

      res.json({
        status,
        daysInStatus: Math.max(1, daysInStatus),
        trend
      });

    } catch (error) {
      console.error(`[Risk Status] Error fetching risk status for company ${req.params.id}:`, error);
      res.status(500).json({
        message: "Error fetching risk status data",
        code: "FETCH_ERROR"
      });
    }
  });

  app.post("/api/fintech/invite", requireAuth, async (req, res) => {
    const startTime = Date.now();
    try {
      console.log('[FinTech Invite] Starting invitation process with payload:', {
        ...req.body,
        email: req.body.email ? '***@***.***' : undefined
      });

      const { email, company_name, full_name, sender_name } = req.body;

      // Auth check with error handling
      if (!req.user?.id) {
        console.error('[FinTech Invite] Authentication failed:', { user: req.user });
        return res.status(401).json({
          message: "Authentication required",
          code: "AUTH_REQUIRED"
        });
      }

      // Input validation
      const invalidFields = [];
      if (!email) invalidFields.push('email');
      if (!company_name) invalidFields.push('company name');
      if (!full_name) invalidFields.push('full name');
      if (!sender_name) invalidFields.push('sender name');

      if (invalidFields.length > 0) {
        console.log('[FinTech Invite] Validation failed:', {
          invalidFields,
          duration: Date.now() - startTime
        });
        return res.status(400).json({
          message: `${invalidFields.join(', ')} ${invalidFields.length > 1 ? 'are' : 'is'} required`,
          invalidFields
        });
      }

      // Check existing company outside transaction
      try {
        const existingCompany = await db.query.companies.findFirst({
          where: sql`LOWER(${companies.name}) = LOWER(${company_name})`
        });

        if (existingCompany) {
          console.log('[FinTech Invite] Company exists:', {
            name: existingCompany.name,
            duration: Date.now() - startTime
          });
          return res.status(409).json({
            message: "Company already exists",
            existingCompany: {
              id: existingCompany.id,
              name: existingCompany.name
            }
          });
        }
      } catch (error) {
        console.error('[FinTech Invite] Company check failed:', {
          error,
          duration: Date.now() - startTime
        });
        return res.status(500).json({
          message: "Failed to check company existence",
          code: "DB_ERROR"
        });
      }

      // Critical database operations in transaction
      const result = await db.transaction(async (tx) => {
        const txStartTime = Date.now();
        try {
          // Validate user has a valid company_id
          if (!req.user || !req.user.company_id) {
            console.error('[FinTech Invite] User missing company_id:', { user: req.user });
            throw new Error("User company ID not found");
          }
          
          // Get sender company
          const [userCompany] = await tx.select()
            .from(companies)
            .where(eq(companies.id, req.user.company_id));

          if (!userCompany) {
            throw new Error("Sender company not found");
          }

          console.log('[FinTech Invite] Found sender company:', {
            name: userCompany.name,
            duration: Date.now() - txStartTime
          });

          // Create new company
          const [newCompany] = await tx.insert(companies)
            .values({
              name: company_name.trim(),
              description: `FinTech partner company ${company_name}`,
              category: 'FinTech',
              status: 'active',
              accreditation_status: 'PENDING',
              onboarding_company_completed: false,
              available_tabs: ['task-center'],
              is_demo: req.body.is_demo === true, // Set demo status from request
              metadata: {
                invited_by: req.user!.id,
                invited_at: new Date().toISOString(),
                invited_from: userCompany.name,
                created_via: 'fintech_invite',
                created_by_id: req.user!.id,
                is_demo_fintech: req.body.is_demo === true, // Also track in metadata
              }
            })
            .returning();

          console.log('[FinTech Invite] Created company:', {
            id: newCompany.id,
            duration: Date.now() - txStartTime
          });

          // Create user account
          const hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
          const [newUser] = await tx.insert(users)
            .values({
              email: email.toLowerCase(),
              full_name: full_name.trim(),
              password: hashedPassword,
              company_id: newCompany.id,
              onboarding_user_completed: false,
              metadata: {
                invited_by: req.user!.id,
                invited_at: new Date().toISOString(),
                invited_from: userCompany.name
              }
            })
            .returning();

          console.log('[FinTech Invite] Created user:', {
            id: newUser.id,
            duration: Date.now() - txStartTime
          });

          // Create user onboarding task first
          console.log('[FinTech Invite] Creating user onboarding task');
          const [onboardingTask] = await tx.insert(tasks)
            .values({
              title: `New User Invitation: ${email.toLowerCase()}`,
              description: 'Complete user registration and onboarding.',
              task_type: 'user_onboarding',
              task_scope: 'user',
              status: TaskStatus.EMAIL_SENT,
              priority: 'medium',  // Changed from 'high' to 'medium'
              progress: 25,  // Fixed progress value for EMAIL_SENT status
              company_id: newCompany.id,
              user_email: email.toLowerCase(),
              assigned_to: newUser.id,
              created_by: req.user!.id,
              due_date: (() => {
                const date = new Date();
                date.setDate(date.getDate() + 30); // 30 days deadline
                return date;
              })(),
              metadata: {
                user_id: newUser.id,
                company_id: newCompany.id,
                created_via: 'fintech_invite',
                created_by_id: req.user!.id,
                created_at: new Date().toISOString(),
                email_sent_at: new Date().toISOString(),
                statusFlow: [TaskStatus.EMAIL_SENT],
                userEmail: email.toLowerCase(),
                companyName: company_name
              }
            })
            .returning();

          console.log('[FinTech Invite] Created onboarding task:', {
            taskId: onboardingTask.id,
            status: onboardingTask.status,
            assignedTo: onboardingTask.assigned_to,
            duration: Date.now() - txStartTime
          });

          // Create invitation
          const invitationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
          const [invitation] = await tx.insert(invitations)
            .values({
              email: email.toLowerCase(),
              company_id: newCompany.id,
              code: invitationCode,
              status: 'pending',
              invitee_name: full_name.trim(),
              invitee_company: company_name.trim(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              metadata: {
                sender_name: req.user!.full_name,
                sender_company: userCompany.name,
                invitation_type: 'fintech',
                onboarding_task_id: onboardingTask.id
              }
            })
            .returning();

          console.log('[FinTech Invite] Created invitation:', {
            id: invitation.id,
            code: invitation.code,
            duration: Date.now() - txStartTime
          });

          // Create company tasks last, passing the existing transaction to avoid nested transactions
          console.log('[FinTech Invite] Creating company tasks with existing transaction');
          const createdCompany = await createCompany({
            ...newCompany,
            metadata: {
              created_by_id: req.user!.id,
              invited_by: req.user!.id,
              created_via: 'fintech_invite',
              created_by_company_id: req.user!.company_id
            }
          }, tx); // Pass the existing tx to avoid nested transactions

          console.log('[FinTech Invite] Tasks created successfully:', {
            companyId: createdCompany.id,
            tasks: {
              kyb: createdCompany.kyb_task_id,
              security: createdCompany.security_task_id,
              card: createdCompany.card_task_id,
              onboarding: onboardingTask.id
            },
            duration: Date.now() - txStartTime
          });

          // Broadcast task update using unified WebSocket implementation
          broadcastTaskUpdate(onboardingTask.id, {
            status: onboardingTask.status,
            progress: onboardingTask.progress,
            metadata: onboardingTask.metadata
          });

          return { newCompany: createdCompany, newUser, invitation, onboardingTask, userCompany };
        } catch (txError) {
          console.error('[FinTech Invite] Transaction failed:', {
            error: txError,
            duration: Date.now() - txStartTime
          });
          throw txError;
        }
      });

      // Send email
      console.log('[FinTech Invite] Sending invitation email');
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers.host;
      const inviteUrl = `${protocol}://${host}/register?code=${result.invitation.code}&email=${encodeURIComponent(email)}`;

      const emailResult = await emailService.sendTemplateEmail({
        to: email.toLowerCase(),
        from: process.env.GMAIL_USER!,
        template: 'fintech_invite',
        templateData: {
          recipientName: full_name,
          recipientEmail: email.toLowerCase(),
          senderName: sender_name,
          senderCompany: result.userCompany.name,
          targetCompany: company_name,
          inviteUrl,
          code: result.invitation.code
        }
      });

      if (!emailResult.success) {
        console.error('[FinTech Invite] Email sending failed:', emailResult.error);
      } else {
        console.log('[FinTech Invite] Invitation email sent successfully');
      }

      console.log('[FinTech Invite] Process completed:', {
        companyId: result.newCompany.id,
        userId: result.newUser.id,
        invitationId: result.invitation.id,
        onboardingTaskId: result.onboardingTask.id,
        duration: Date.now() - startTime
      });

      res.status(201).json({
        message: "FinTech company invited successfully",
        company: {
          id: result.newCompany.id,
          name: result.newCompany.name
        },
        invitation: {
          id: result.invitation.id,
          code: result.invitation.code
        }
      });

    } catch (error) {
      console.error('[FinTech Invite] Process failed:', {
        error,
        duration: Date.now() - startTime
      });

      res.status(500).json({
        message: "Failed to process invitation",
        error: error instanceof Error ? error.message : "Unknown error",
        code: "INVITATION_FAILED"
      });
    }
  });

  // Add this endpoint to handle user onboarding completion
  app.post("/api/users/complete-onboarding", requireAuth, async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(400).json({ 
          message: "Missing user information",
          error: "User data is required for onboarding completion" 
        });
      }
      
      const userId = req.user.id;
      const companyId = req.user.company_id;
      const startTime = Date.now();
      
      console.log('[Complete Onboarding] Processing request for user:', {
        userId: userId,
        companyId: companyId,
        timestamp: new Date().toISOString()
      });
      
      // ========================================
      // CHECK FOR NEW DATA RECIPIENT DEMO USERS
      // ========================================
      
      // Get current user data to check demo persona type
      const [currentUser] = await db.select()
        .from(users)
        .where(eq(users.id, userId));
        
      if (!currentUser) {
        return res.status(404).json({ 
          message: "User not found",
          error: `User ${userId} does not exist` 
        });
      }
      
      // Check if this is a New Data Recipient demo user who should NOT complete onboarding
      const isNewDataRecipientDemo = currentUser.is_demo_user && 
                                    currentUser.demo_persona_type === 'new-data-recipient';
      
      if (isNewDataRecipientDemo) {
        console.log('[Complete Onboarding] BLOCKED: New Data Recipient demo users should not complete onboarding:', {
          userId: userId,
          demoPersonaType: currentUser.demo_persona_type,
          isDemoUser: currentUser.is_demo_user,
          reason: 'New Data Recipients must show onboarding modal for authentic persona experience'
        });
        
        // Return success but don't actually update the onboarding status
        return res.json({
          message: "Onboarding completion blocked for New Data Recipient persona",
          success: true,
          blocked: true,
          reason: "New Data Recipients maintain pending onboarding status for authentic demo experience",
          user: {
            id: currentUser.id,
            email: currentUser.email,
            onboarding_user_completed: currentUser.onboarding_user_completed // Keep original status
          },
          elapsedMs: Date.now() - startTime
        });
      }
      
      // Variable to store updated user data
      let updatedUserData = null;
      
      // Use transaction to update the user record (only for non-New Data Recipient personas)
      await db.transaction(async (tx) => {
        // Update the user record to mark onboarding as completed
        const [updatedUser] = await tx.update(users)
          .set({
            onboarding_user_completed: true,
            updated_at: new Date()
          })
          .where(eq(users.id, userId))
          .returning();
          
        if (!updatedUser) {
          throw new Error(`Failed to update user ${userId} onboarding status`);
        }
        
        // Save for use outside the transaction
        updatedUserData = updatedUser;
        
        console.log('[Complete Onboarding] Successfully updated user record:', {
          userId: updatedUser.id,
          companyId: companyId,
          userOnboardingStatus: updatedUser.onboarding_user_completed,
          elapsedMs: Date.now() - startTime
        });
      });

      // After successful transaction, try to update the onboarding task as well
      const updatedTask = await updateOnboardingTaskStatus(userId);

      console.log('[Complete Onboarding] Successfully completed onboarding for user:', {
        userId: updatedUserData.id,
        taskId: updatedTask?.id,
        elapsedMs: Date.now() - startTime
      });
      
      // Invalidate company cache to ensure fresh data is returned
      if (companyId) {
        invalidateCompanyCache(companyId);
      }

      // Get current company information for response
      const [company] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId));
        
      res.json({
        message: "Onboarding completed successfully",
        success: true,
        user: updatedUserData,
        company: company ? {
          id: company.id,
          name: company.name,
          // Only return the user's onboarding status, not company's
          onboardingCompleted: updatedUserData.onboarding_user_completed
        } : null,
        elapsedMs: Date.now() - startTime
      });

    } catch (error) {
      console.error("[Complete Onboarding] Error:", error);
      res.status(500).json({
        message: "Error completing onboarding",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add document processing endpoint after the file endpoints
  app.post("/api/documents/process", requireAuth, logoUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fieldsJson = req.body.fields;
      if (!fieldsJson) {
        return res.status(400).json({ message: "No fields provided" });
      }

      const fields = JSON.parse(fieldsJson);

      console.log('[DocumentProcessing] Starting document analysis:', {
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        fieldsCount: fields.length,
        timestamp: new Date().toISOString()
      });

      let documentText: string;

      // Handle different file types
      if (req.file.mimetype === 'application/pdf') {
        try {
          // Extract text from PDF using pdf.js-extract
          const data = await pdfExtract.extractBuffer(req.file.buffer);
          documentText = data.pages.map(page => page.content.map(item => item.str).join(' ')).join('\n');

          console.log('[DocumentProcessing] PDF text extracted:', {
            fileName: req.file.originalname,
            textLength: documentText.length,
            pages: data.pages.length,
            timestamp: new Date().toISOString()
          });
        } catch (pdfError) {
          console.error('[DocumentProcessing] PDF parsing error:', {
            fileName: req.file.originalname,
            error: pdfError instanceof Error ? pdfError.message : String(pdfError)
          });
          return res.status(400).json({
            message: "Failed to parse PDF document",
            error: pdfError instanceof Error ? pdfError.message : String(pdfError)
          });
        }
      } else if (req.file.mimetype === 'text/plain') {
        // For text files, read buffer directly as UTF-8 text
        documentText = req.file.buffer.toString('utf-8');
        console.log('[DocumentProcessing] Text file content loaded:', {
          fileName: req.file.originalname,
          textLength: documentText.length,
          timestamp: new Date().toISOString()
        });
      } else {
        return res.status(400).json({
          message: "Unsupported file type",
          supportedTypes: ['application/pdf', 'text/plain']
        });
      }

      // Split text into chunks for processing
      const CHUNK_SIZE = 4000; // Adjust based on OpenAI token limits
      const chunks = [];
      for (let i = 0; i < documentText.length; i += CHUNK_SIZE) {
        chunks.push(documentText.slice(i, i + CHUNK_SIZE));
      }

      console.log('[DocumentProcessing] Document chunked:', {
        fileName: req.file.originalname,
        totalChunks: chunks.length,
        timestamp: new Date().toISOString()
      });

      // Process each chunk and combine results
      const allAnswers = [];
      for (const [index, chunk] of chunks.entries()) {
        console.log('[DocumentProcessing] Processing chunk:', {
          fileName: req.file.originalname,
          chunkIndex: index + 1,
          totalChunks: chunks.length,
          timestamp: new Date().toISOString()
        });

        const result = await analyzeDocument(chunk, fields);
        if (result.answers && result.answers.length > 0) {
          allAnswers.push(...result.answers);
        }
      }

      // Remove duplicate answers based on field_key
      const uniqueAnswers = Array.from(
        new Map(allAnswers.map(answer => [answer.field_key, answer])).values()
      );

      console.log('[DocumentProcessing] Document analysis complete:', {
        fileName: req.file.originalname,
        answersFound: uniqueAnswers.length,
        timestamp: new Date().toISOString()
      });

      res.json({
        answersFound: uniqueAnswers.length,
        answers: uniqueAnswers
      });

    } catch (error) {
      console.error("[DocumentProcessing] Error:", error);
      res.status(500).json({
        message: "Error processing document",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  //Add new document processing endpoint using stored files
  app.post("/api/documents/process", requireAuth, async (req, res) => {
    try {
      const { fileIds, fields } = req.body;

      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ message: "File IDs are required" });
      }

      if (!fields || !Array.isArray(fields)) {
        return res.status(400).json({ message: "Fields are required" });
      }

      console.log('[DocumentProcessing] Starting batch analysis:', {
        fileCount: fileIds.length,
        fieldsCount: fields.length,
        timestamp: new Date().toISOString()
      });

      // Get files from database
      const storedFiles = await db.select()
        .from(files)
        .where(
          and(
            sql`${files.id} = ANY(${fileIds})`,
            eq(files.company_id, req.user.company_id)
          )
        );

      if (storedFiles.length === 0) {
        return res.status(404).json({ message: "No valid files found" });
      }

      console.log('[DocumentProcessing] Retrieved files:', {
        count: storedFiles.length,
        files: storedFiles.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type
        }))
      });

      const results = [];

      // Process each file
      for (const file of storedFiles) {
        const filePath = path.join(process.cwd(), 'uploads', 'documents', file.path);

        try {
          console.log('[DocumentProcessing] Reading file:', {
            fileName: file.name,
            filePath: file.path
          });

          const fileContent = fs.readFileSync(filePath, 'utf-8');

          // Split content into chunks
          const CHUNK_SIZE = 4000;
          const chunks = [];
          for (let i = 0; i < fileContent.length; i += CHUNK_SIZE) {
            chunks.push(fileContent.slice(i, i + CHUNK_SIZE));
          }

          console.log('[DocumentProcessing] Content chunked:', {
            fileName: file.name,
            chunks: chunks.length
          });

          const fileAnswers = [];

          // Process each chunk
          for (const [index, chunk] of chunks.entries()) {
            console.log('[DocumentProcessing] Processing chunk:', {
              fileName: file.name,
              chunkIndex: index + 1,
              totalChunks: chunks.length
            });

            const result = await analyzeDocument(chunk, fields);
            if (result.answers && result.answers.length > 0) {
              fileAnswers.push(...result.answers);
            }
          }

          // Remove duplicates
          const uniqueAnswers = Array.from(
            new Map(fileAnswers.map(answer => [answer.field_key, answer])).values()
          );

          results.push({
            fileId: file.id,
            fileName: file.name,
            answers: uniqueAnswers
          });

          console.log('[DocumentProcessing] File analysis complete:', {
            fileName: file.name,
            answersFound: uniqueAnswers.length
          });

        } catch (fileError) {
          console.error('[DocumentProcessing] Error processing file:', {
            fileName: file.name,
            error: fileError instanceof Error ? fileError.message : String(fileError)
          });

          // Continue with other files
          results.push({
            fileId: file.id,
            fileName: file.name,
            error: fileError instanceof Error ? fileError.message : String(fileError)
          });
        }
      }

      res.json({
        results
      });

    } catch (error) {
      console.error('[DocumentProcessing] Error:', error);
      res.status(500).json({
        message: "Error processing documents",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  //Add the new document processing endpoint here.
  app.post("/api/documents/process", requireAuth, async (req, res) => {
    try {
      const { fileIds, fields } = req.body;

      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({
          message: "No file IDs provided",
          code: "INVALID_REQUEST"
        });
      }

      console.log('[Document Processing] Starting processing:', {
        fileIds,
        fieldCount: fields?.length,
        timestamp: new Date().toISOString()
      });

      const results = [];

      // Process one file at a time
      for (const fileId of fileIds) {
        // Get file record from database
        const [file] = await db.select()
          .from(files)
          .where(eq(files.id, fileId));

        if (!file) {
          console.error('[Document Processing] File not found:', fileId);
          results.push({
            fileId,
            fileName: 'Unknown',
            error: 'File not found'
          });
          continue;
        }

        try {
          // Get file path
          const filePath = path.resolve('/home/runner/workspace/uploads', file.path);

          if (!fs.existsSync(filePath)) {
            throw new Error('File not found on disk');
          }

          // Extract PDF text
          const data = await pdfExtract.extract(filePath, {});
          if (!data.pages || data.pages.length === 0) {
            throw new Error('No text content found in PDF');
          }

          // Process in chunks of ~3 pages
          const chunkSize = 3;
          const answers = [];

          for (let i = 0; i < data.pages.length; i += chunkSize) {
            const chunk = data.pages.slice(i, i + chunkSize);
            const chunkText = chunk.map(page => page.content).join('\n');

            // Analyze chunk with OpenAI
            const chunkAnswers = await analyzeDocument(chunkText, fields);
            answers.push(...chunkAnswers);

            // Send progress update via unified WebSocket broadcast system
            // Uses the same consistent broadcasting approach as the rest of the application
            broadcast('task_update', {
              id: req.body.taskId, // Using the task ID from request body
              metadata: {
                type: 'CLASSIFICATION_UPDATE',
                fileId: file.id.toString(),
                category: file.status || 'unknown', // Using status instead of category
                confidence: 0.95
              }
            });
          }

          // Add results
          results.push({
            fileId: file.id,
            fileName: file.name,
            answers
          });

        } catch (error) {
          console.error('[Document Processing] Error processing file:', {
            fileId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          results.push({
            fileId,
            fileName: file.name,
            error: error instanceof Error ? error.message : 'Error processing document'
          });
        }
      }

      res.json({ results });

    } catch (error) {
      console.error('[Document Processing] Error:', error);
      res.status(500).json({
        message: "Error processing documents",
        code: "PROCESSING_ERROR"
      });
    }
  });

  //Add the new invitation validation endpoint here.
  app.get("/api/invitations/:code/validate", async (req, res) => {
    try {
      console.log('[Invite Debug] Starting validation for code:', req.params.code);

      // Get the invitation with case-insensitive code match and valid expiration
      const [invitation] = await db.select()
        .from(invitations)
        .where(and(
          eq(invitations.code, req.params.code.toUpperCase()),
          eq(invitations.status, 'pending'),
          sql`${invitations.expires_at} > NOW()`
        ));

      if (!invitation) {
        console.log('[Invite Debug] No valid invitation found for code:', req.params.code);
        return res.json({
          valid: false,
          message: "Invalid or expired invitation code"
        });
      }

      console.log('[Invite Debug] Found valid invitation:', {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expires_at: invitation.expires_at
      });

      res.json({
        valid: true,
        invitation: {
          email: invitation.email,
          invitee_name: invitation.invitee_name,
          company_name: invitation.invitee_company
        }
      });

    } catch (error) {
      console.error('[Invite Debug] Validation error:', error);
      res.status(500).json({
        valid: false,
        message: "Error validating invitation code"
      });
    }
  });

  //Add new endpoint for companies to add other companies to their network
  app.post("/api/companies/:id/network", requireAuth, async (req, res) => {
    try {
      const targetCompanyId = parseInt(req.params.id);

      // Verify the target company exists
      const [targetCompany] = await db.select()
        .from(companies)
        .where(eq(companies.id, targetCompanyId));

      if (!targetCompany) {
        return res.status(404).json({ message: "Target company not found" });
      }

      // Check if relationship already exists
      const [existingRelationship] = await db.select()
        .from(relationships)
        .where(and(
          eq(relationships.company_id, req.user.company_id),
          eq(relationships.related_company_id, targetCompanyId)
        ));

      if (existingRelationship) {
        return res.status(400).json({ message: "Company is already in your network" });
      }

      // Create the relationship
      const [relationship] = await db.insert(relationships)
        .values({
          company_id: req.user.company_id,
          related_company_id: targetCompanyId,
          relationship_type: 'network_member',
          status: 'active',
          metadata: {
            added_at: new Date().toISOString(),
            added_by: req.user.id
          }
        })
        .returning();

      res.status(201).json(relationship);
    } catch (error) {
      console.error("Error adding company to network:", error);
      res.status(500).json({ message: "Error adding company to network" });
    }
  });

  // Get users for a specific company - for company profile page
  app.get("/api/companies/:id/users", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      if (isNaN(companyId)) {
        return res.status(400).json({ 
          message: "Invalid company ID",
          code: "INVALID_ID"
        });
      }
      
      // Fetch users associated with this company
      const companyUsers = await db.select({
        id: users.id,
        email: users.email,
        full_name: users.full_name,
        role: users.role,
        onboarding_user_completed: users.onboarding_user_completed,
        created_at: users.created_at
      })
      .from(users)
      .where(eq(users.company_id, companyId))
      .orderBy(users.created_at);
      
      console.log(`[Companies] Found ${companyUsers.length} users for company ${companyId}`);
      
      res.json(companyUsers);
    } catch (error) {
      console.error("Error fetching company users:", error);
      res.status(500).json({ 
        message: "Error fetching company users",
        code: "FETCH_ERROR"
      });
    }
  });

  // Update the user invite endpoint after the existing registration endpoint
  app.post("/api/users/invite", requireAuth, async (req, res) => {
    try {
      console.log('[Invite] Starting invitation process');
      console.log('[Invite] Request body:', req.body);

      // Validate and normalize invite data
      const inviteData = {
        email: req.body.email.toLowerCase(),
        full_name: req.body.full_name,
        company_id: req.body.company_id,
        company_name: req.body.company_name,
        sender_name: req.body.sender_name,
        sender_company: req.body.sender_company
      };

      console.log('[Invite] Validated invite data:', inviteData);

      // Start a database transaction
      console.log('[Invite] Starting database transaction');
      const result = await db.transaction(async (tx) => {
        try {
          console.log('[Invite] Creating user account');
          // Create new user account with explicit company_id
          const [user] = await tx.insert(users)
            .values({
              email: inviteData.email,
              full_name: inviteData.full_name,
              company_id: inviteData.company_id,
              password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
              onboarding_user_completed: false
            })
            .returning();

          if (!user) {
            throw new Error('Failed to create user account');
          }

          // Create invitation record
          const inviteCode = generateInviteCode();
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 7);

          const [invitation] = await tx.insert(invitations)
            .values({
              email: inviteData.email,
              status: 'pending',
              code: inviteCode,
              company_id: inviteData.company_id,
              invitee_name: inviteData.full_name,
              invitee_company: inviteData.company_name,
              expires_at: expiryDate
            })
            .returning();

          // Create task for tracking the invitation
          const [task] = await tx.insert(tasks)
            .values({
              title: `New User Invitation: ${inviteData.email}`,
              description: `Invitation sent to ${inviteData.full_name} (${inviteData.email}) to join ${inviteData.company_name}`,
              task_type: 'user_onboarding',
              task_scope: 'user',
              status: TaskStatus.EMAIL_SENT,
              progress: 100,
              priority: 'high',
              company_id: inviteData.company_id,
              user_email: inviteData.email,
              created_by: req.user.id,
              metadata: {
                invitation_id: invitation.id,
                invited_by: req.user.id,
                invited_at: new Date().toISOString(),
                status_flow: [TaskStatus.EMAIL_SENT]
              }
            })
            .returning();

          // Update invitation with task reference
          await tx.update(invitations)
            .set({ task_id: task.id })
            .where(eq(invitations.id, invitation.id));

          // Send invitation email
          await emailService.sendTemplateEmail({
            to: inviteData.email,
            from: 'noreply@example.com',
            template: 'user_invite',
            templateData: {
              recipientEmail: inviteData.email,
              recipientName: inviteData.full_name,
              senderName: inviteData.sender_name,
              senderCompany: inviteData.sender_company,
              targetCompany: inviteData.company_name,
              code: inviteCode,
              inviteUrl: `${process.env.APP_URL}/auth?code=${inviteCode}`
            }
          });

          return { invitation, task, user };
        } catch (error) {
          console.error('[Invite] Error processing invitation:', error);
          throw error;
        }
      });

      res.status(201).json({
        message: 'Invitation sent successfully',
        invitation: result.invitation,
        task: result.task
      });

    } catch (error) {
      console.error('[Invite] Error processing invitation:', error);
      res.status(500).json({
        message: 'Error processing invitation request',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  //Utility functions
  function generateInviteCode(): string {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  function formatTimestampForFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  function toTitleCase(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  async function updateOnboardingTaskStatus(userId: number): Promise<{ id: number; status: TaskStatus; } | null> {
    try {
      const [task] = await db.select().from(tasks).where(eq(tasks.user_email, (await db.select().from(users).where(eq(users.id, userId))).find()?.email));

      if (task && task.task_type === 'user_onboarding') {
        const [updatedTask] = await db.update(tasks)
          .set({ status: TaskStatus.COMPLETED, progress: 100 })
          .where(eq(tasks.id, task.id))
          .returning();
        return updatedTask;
      }
      return null;
    } catch (error) {
      console.error('[updateOnboardingTaskStatus] Error updating task status:', error);
      return null;
    }
  }

  // Network visualization endpoint
  app.get("/api/relationships/network", requireAuth, async (req, res) => {
    try {
      console.log('[Network] Fetching network visualization data for company:', req.user.company_id);

      // Get the current company details
      const [currentCompany] = await db.select({
        id: companies.id,
        name: companies.name,
        risk_score: companies.risk_score,
        accreditation_status: companies.accreditation_status,
        revenue_tier: companies.revenue_tier,
        category: companies.category
      })
      .from(companies)
      .where(eq(companies.id, req.user.company_id));

      if (!currentCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Create a simpler query structure to avoid null/undefined issues
      // First, get basic relationship info
      const relationshipsData = await db.select({
        id: relationships.id,
        companyId: relationships.company_id,
        relatedCompanyId: relationships.related_company_id,
        relationshipType: relationships.relationship_type,
        relationshipStatus: relationships.status,
        metadata: relationships.metadata,
      })
      .from(relationships)
      .where(
        or(
          eq(relationships.company_id, req.user.company_id),
          eq(relationships.related_company_id, req.user.company_id)
        )
      );

      console.log('[Network] Found relationships:', relationshipsData.length);
      
      // Process relationships to determine which company IDs we need to fetch
      const relatedCompanyIds = new Set<number>();
      relationshipsData.forEach(rel => {
        // If this company is the current company, we need the related company
        if (rel.companyId === req.user.company_id) {
          relatedCompanyIds.add(rel.relatedCompanyId);
        } else {
          // Otherwise, we need this company
          relatedCompanyIds.add(rel.companyId);
        }
      });
      
      // Now fetch all the needed companies in one query
      // Convert the Set to a string for SQL IN operation
      const companyIdsArray = [...relatedCompanyIds, req.user.company_id];
      const companyIds = companyIdsArray.join(',');
      
      const allCompaniesData = await db.select({
        id: companies.id,
        name: companies.name,
        riskScore: companies.risk_score,
        accreditationStatus: companies.accreditation_status,
        revenueTier: companies.revenue_tier,
        category: companies.category
      })
      .from(companies)
      .where(sql`${companies.id} IN (${companyIds})`);
      
      console.log('[Network] Found companies:', allCompaniesData.length);
      
      // Create a lookup for companies
      const companiesMap = new Map();
      allCompaniesData.forEach(company => {
        companiesMap.set(company.id, company);
      });
      
      // Now construct the network data by joining the information
      const networkData = relationshipsData.map(rel => {
        // Determine which is the related company
        const targetCompanyId = rel.companyId === req.user.company_id 
          ? rel.relatedCompanyId
          : rel.companyId;
        
        const company = companiesMap.get(targetCompanyId);
        
        return {
          relationshipId: rel.id,
          relationshipType: rel.relationshipType || 'Unknown',
          relationshipStatus: rel.relationshipStatus || 'Unknown',
          relationshipMetadata: rel.metadata || {},
          companyId: targetCompanyId,
          companyName: company?.name || 'Unknown Company',
          riskScore: company?.riskScore || 0,
          accreditationStatus: company?.accreditationStatus || 'Unknown',
          revenueTier: company?.revenueTier || 'Unknown',
          category: company?.category || 'Unknown'
        };
      });

      // Map risk scores to risk buckets (0-100 scale)
      const getRiskBucket = (score: number) => {
        if (score === 0) return 'none';
        if (score <= 33) return 'low';
        if (score <= 66) return 'medium';
        if (score <= 99) return 'high';
        return 'critical';
      };

      // Add debug logging
      console.log('[Network] Current company:', currentCompany);
      console.log('[Network] Sample network node:', networkData.length > 0 ? networkData[0] : 'No network data');
      
      // Ensure values are not null/undefined with defaults
      const safeRiskScore = currentCompany.risk_score || 0;
      
      // Transform the data into visualization-friendly format
      const result = {
        center: {
          id: currentCompany.id,
          name: currentCompany.name || 'Unknown',
          riskScore: safeRiskScore,
          riskBucket: getRiskBucket(safeRiskScore),
          accreditationStatus: currentCompany.accreditation_status || 'Unknown',
          revenueTier: currentCompany.revenue_tier || 'Unknown',
          category: currentCompany.category || 'Unknown'
        },
        nodes: networkData.map(relation => {
          // Ensure all values have defaults if null/undefined
          const nodeRiskScore = relation.riskScore || 0;
          return {
            id: relation.companyId,
            name: relation.companyName || 'Unknown Company',
            relationshipId: relation.relationshipId,
            relationshipType: relation.relationshipType || 'Unknown',
            relationshipStatus: relation.relationshipStatus || 'Unknown',
            riskScore: nodeRiskScore,
            riskBucket: getRiskBucket(nodeRiskScore),
            accreditationStatus: relation.accreditationStatus || 'Unknown',
            revenueTier: relation.revenueTier || 'Unknown',
            category: relation.category || 'Unknown'
          };
        })
      };

      console.log('[Network] Found network data:', {
        centerNode: result.center.name,
        nodesCount: result.nodes.length
      });

      res.json(result);
    } catch (error) {
      console.error("[Network] Error fetching network data:", error);
      
      // Detailed error logging for debugging
      if (error instanceof Error) {
        console.error("[Network] Error name:", error.name);
        console.error("[Network] Error message:", error.message);
        console.error("[Network] Error stack:", error.stack);
      }
      
      // Check for specific error types and provide better error messages
      let errorMessage = "Error fetching network visualization data";
      if (error instanceof TypeError && error.message.includes("Cannot convert undefined or null to object")) {
        errorMessage = "Data structure error: Null value where object expected";
      }
      
      res.status(500).json({ 
        message: errorMessage,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Company type distribution endpoint
  app.get("/api/company-type-distribution", requireAuth, async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Get the current company ID
      const currentCompanyId = req.user.company_id;
      
      // Execute a query that counts companies by category, but only including companies
      // that have a relationship with the current company
      console.log('[CompanyTypes] Fetching company type distribution for company:', currentCompanyId);
      
      const result = await db.execute(
        sql`
          SELECT c.category, COUNT(*) as count 
          FROM companies c
          WHERE c.id IN (
            SELECT r.related_company_id 
            FROM relationships r 
            WHERE r.company_id = ${currentCompanyId}
            UNION
            SELECT r.company_id 
            FROM relationships r 
            WHERE r.related_company_id = ${currentCompanyId}
          )
          GROUP BY c.category
        `
      );
      
      console.log('[CompanyTypes] Results:', result.rows);
      
      // Transform into the format needed by the chart
      const formattedData = result.rows.map((row: any) => ({
        type: row.category || 'Unknown',
        count: parseInt(row.count, 10),
        color: row.category === 'Invela' ? '#4965EC' : 
               row.category === 'Bank' ? '#081E59' : 
               row.category === 'FinTech' ? '#C2C4EA' : '#CCCCCC'
      }));
      
      // Sort data to have the specific order: Invela, Bank, FinTech, then others
      const sortOrder = { 'Invela': 1, 'Bank': 2, 'FinTech': 3 };
      
      const sortedData = formattedData.sort((a, b) => {
        const orderA = sortOrder[a.type] || 999;
        const orderB = sortOrder[b.type] || 999;
        return orderA - orderB;
      });
      
      console.log('[CompanyTypes] Formatted and sorted data:', sortedData);
      
      res.json(sortedData);
    } catch (error) {
      console.error("[CompanyTypes] Error fetching company type distribution:", error);
      res.status(500).json({ 
        message: "Error fetching company type distribution data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Accreditation status distribution endpoint
  app.get("/api/accreditation-status-distribution", requireAuth, async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Get the current company ID
      const currentCompanyId = req.user.company_id;
      
      console.log('[AccreditationStatus] Fetching accreditation status distribution for company:', currentCompanyId);
      
      // Query the companies along with their accreditation status
      // Only include companies that have a relationship with the current company
      const companiesResult = await db.execute(
        sql`
          SELECT c.id, c.name, c.category, c.accreditation_status 
          FROM companies c 
          WHERE c.id != ${currentCompanyId}
          AND c.id IN (
            SELECT r.related_company_id 
            FROM relationships r 
            WHERE r.company_id = ${currentCompanyId}
            UNION
            SELECT r.company_id 
            FROM relationships r 
            WHERE r.related_company_id = ${currentCompanyId}
          )
          ORDER BY c.name
        `
      );
      
      // Define status types and colors
      const statusMap: Record<string, { color: string; label: string }> = {
        'APPROVED': { color: '#209C5A', label: 'Approved' }, // Green
        'PENDING': { color: '#FFC300', label: 'Pending' },   // Yellow
        'AWAITING_INVITATION': { color: '#9CA3AF', label: 'Awaiting Invitation' }, // Pale Gray
        'REVOKED': { color: '#EF4444', label: 'Revoked' }    // Red
      };
      
      // Transform the data for the dot matrix visualization
      const companies = companiesResult.rows.map((row: any) => {
        // Default to AWAITING_INVITATION if status is null or not recognized
        const status = row.accreditation_status || 'AWAITING_INVITATION';
        const statusInfo = statusMap[status] || statusMap['AWAITING_INVITATION'];
        
        return {
          id: row.id,
          name: row.name,
          category: row.category || 'Unknown',
          status: status,
          color: statusInfo.color,
          label: statusInfo.label
        };
      });
      
      // Count companies by status
      const statusCounts = Object.keys(statusMap).reduce((acc, status) => {
        acc[status] = companies.filter(c => c.status === status).length;
        return acc;
      }, {} as Record<string, number>);
      
      // Format the response
      const response = {
        companies,
        statusCounts,
        statusMap: Object.entries(statusMap).map(([key, value]) => ({
          id: key,
          ...value,
          count: statusCounts[key] || 0
        }))
      };
      
      console.log('[AccreditationStatus] Results summary:', {
        totalCompanies: companies.length,
        statusCounts
      });
      
      res.json(response);
    } catch (error) {
      console.error("[AccreditationStatus] Error fetching accreditation status distribution:", error);
      res.status(500).json({ 
        message: "Error fetching accreditation status data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Network expansion statistics endpoint
  app.get("/api/network/stats", requireAuth, async (req, res) => {
    try {
      if (!req.user?.company_id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userCompanyId = req.user.company_id;

      // Get current user's company data
      const userCompany = await db.query.companies.findFirst({
        where: eq(companies.id, userCompanyId),
        columns: { id: true, name: true, category: true }
      });

      if (!userCompany) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Get network relationships count using Drizzle ORM
      const networkRelationships = await db.query.relationships.findMany({
        where: eq(relationships.company_id, userCompanyId),
        columns: { related_company_id: true }
      });
      
      const currentNetworkSize = networkRelationships.length;

      // Get related company IDs to exclude from available count
      const relatedCompanyIds = networkRelationships.map(r => r.related_company_id);

      // For Invela users, get separate counts for data providers and recipients
      let dataProviderCount = 0;
      let dataRecipientCount = 0;
      let expansionCount = 0;
      let targetCategory = 'FinTech';
      let expansionMessage = 'companies available to expand your network';

      if (userCompany.category === 'Invela') {
        // Invela can see all Banks (data providers) and FinTech (data recipients)
        const allBanks = await db.query.companies.findMany({
          where: eq(companies.category, 'Bank'),
          columns: { id: true }
        });
        const allFinTech = await db.query.companies.findMany({
          where: eq(companies.category, 'FinTech'),
          columns: { id: true }
        });

        // Count connected data providers (Banks) and recipients (FinTech)
        const connectedBanks = allBanks.filter(company => relatedCompanyIds.includes(company.id));
        const connectedFinTech = allFinTech.filter(company => relatedCompanyIds.includes(company.id));
        
        dataProviderCount = connectedBanks.length;
        dataRecipientCount = connectedFinTech.length;
        expansionCount = 0; // Invela doesn't need expansion as they see all companies
      } else {
        // For Bank and FinTech users, determine target category
        if (userCompany.category === 'FinTech') {
          targetCategory = 'Bank';
          expansionMessage = 'banks available to expand your network';
        } else if (userCompany.category === 'Bank') {
          targetCategory = 'FinTech';
          expansionMessage = 'FinTech companies available to expand your network';
        }

        // Get available companies to connect with
        const allTargetCompanies = await db.query.companies.findMany({
          where: eq(companies.category, targetCategory),
          columns: { id: true }
        });

        // Filter out current user's company and related companies
        const availableCompanies = allTargetCompanies.filter(company => 
          company.id !== userCompanyId && 
          !relatedCompanyIds.includes(company.id)
        );
        expansionCount = availableCompanies.length;
      }

      // Get risk breakdown for network companies using consistent risk status logic
      const riskStats = { stable: 0, monitoring: 0, approaching: 0, blocked: 0 };
      
      if (relatedCompanyIds.length > 0) {
        const networkCompanies = await db.query.companies.findMany({
          where: inArray(companies.id, relatedCompanyIds),
          columns: { id: true, risk_score: true }
        });

        networkCompanies.forEach(company => {
          const score = company.risk_score || 0;
          // Use same logic as session data service and individual risk status endpoint
          if (score >= 70) {
            riskStats.blocked++;
          } else if (score >= 50) {
            riskStats.approaching++;
          } else if (score >= 30) {
            riskStats.monitoring++;
          } else {
            riskStats.stable++;
          }
        });
      }

      res.json({
        currentNetworkSize,
        availableCount: expansionCount,
        targetCategory,
        expansionMessage,
        riskStats,
        userCompanyCategory: userCompany.category,
        dataProviderCount,
        dataRecipientCount
      });

    } catch (error) {
      console.error('[Network Stats] Error fetching network statistics:', error);
      res.status(500).json({ 
        message: "Error fetching network statistics",
        code: "FETCH_ERROR"
      });
    }
  });

  // Network connection endpoint - creates relationship between companies
  app.post("/api/network/connect", requireAuth, async (req, res) => {
    try {
      if (!req.user?.company_id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { companyId } = req.body;
      
      if (!companyId || typeof companyId !== 'number') {
        return res.status(400).json({ 
          message: 'Invalid company ID provided',
          code: 'INVALID_COMPANY_ID'
        });
      }

      const userCompanyId = req.user.company_id;

      // Validate target company exists and get its details
      const targetCompany = await db.query.companies.findFirst({
        where: eq(companies.id, companyId),
        columns: { 
          id: true, 
          name: true, 
          risk_score: true, 
          accreditation_status: true 
        }
      });

      if (!targetCompany) {
        return res.status(404).json({ 
          message: 'Target company not found',
          code: 'COMPANY_NOT_FOUND'
        });
      }

      // Validate connection eligibility (low risk + accredited)
      const riskScore = targetCompany.risk_score || 0;
      const isLowRisk = riskScore <= 33;
      const isAccredited = targetCompany.accreditation_status === "APPROVED";

      if (!isLowRisk || !isAccredited) {
        return res.status(400).json({
          message: 'Connection not allowed: Only low risk accredited companies can be connected',
          code: 'CONNECTION_NOT_ALLOWED',
          details: {
            riskScore,
            isLowRisk,
            isAccredited: targetCompany.accreditation_status
          }
        });
      }

      // Check if relationship already exists
      const existingRelationship = await db.query.relationships.findFirst({
        where: or(
          and(
            eq(relationships.company_id, userCompanyId),
            eq(relationships.related_company_id, companyId)
          ),
          and(
            eq(relationships.company_id, companyId),
            eq(relationships.related_company_id, userCompanyId)
          )
        )
      });

      if (existingRelationship) {
        return res.status(400).json({
          message: 'Connection already exists between these companies',
          code: 'RELATIONSHIP_EXISTS'
        });
      }

      // Create the relationship
      const newRelationship = await db.insert(relationships).values({
        company_id: userCompanyId,
        related_company_id: companyId,
        relationship_type: 'partner',
        status: 'active',
        metadata: {
          created_via: 'network_expansion',
          connection_date: new Date().toISOString()
        }
      }).returning();

      console.log('[NetworkConnect] Created relationship:', {
        from: userCompanyId,
        to: companyId,
        relationshipId: newRelationship[0]?.id
      });

      res.json({
        success: true,
        message: 'Connection established successfully',
        relationship: {
          id: newRelationship[0]?.id,
          companyId: targetCompany.id,
          companyName: targetCompany.name,
          status: 'active'
        }
      });

    } catch (error) {
      console.error('[NetworkConnect] Error creating connection:', error);
      res.status(500).json({ 
        message: "Error creating connection",
        code: "CONNECTION_ERROR"
      });
    }
  });

  // Network expansion candidates endpoint
  app.get("/api/network/expansion-candidates", requireAuth, async (req, res) => {
    try {
      if (!req.user?.company_id) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const userCompanyId = req.user.company_id;

      // Get current user's company data
      const userCompany = await db.query.companies.findFirst({
        where: eq(companies.id, userCompanyId),
        columns: { id: true, name: true, category: true }
      });

      if (!userCompany) {
        return res.status(404).json({ message: 'Company not found' });
      }

      // Get existing relationships to exclude
      const networkRelationships = await db.query.relationships.findMany({
        where: eq(relationships.company_id, userCompanyId),
        columns: { related_company_id: true }
      });

      const relatedCompanyIds = networkRelationships.map(r => r.related_company_id);

      // Determine target categories and expansion logic
      let allTargetCompanies = [];
      let expansionMessage = 'companies available to expand your network';
      let targetCategory = 'All';
      
      if (userCompany.category === 'FinTech') {
        targetCategory = 'Bank';
        expansionMessage = 'banks available to expand your network';
        allTargetCompanies = await db.query.companies.findMany({
          where: eq(companies.category, 'Bank'),
          columns: { 
            id: true, 
            name: true, 
            category: true, 
            risk_score: true, 
            revenue_tier: true,
            accreditation_status: true
          }
        });
      } else if (userCompany.category === 'Bank') {
        targetCategory = 'FinTech';
        expansionMessage = 'FinTech companies available to expand your network';
        allTargetCompanies = await db.query.companies.findMany({
          where: eq(companies.category, 'FinTech'),
          columns: { 
            id: true, 
            name: true, 
            category: true, 
            risk_score: true, 
            revenue_tier: true,
            accreditation_status: true
          }
        });
      } else {
        // For Invela and other categories, show both Bank and FinTech companies
        targetCategory = 'All';
        expansionMessage = 'companies available to expand your network';
        const bankCompanies = await db.query.companies.findMany({
          where: eq(companies.category, 'Bank'),
          columns: { 
            id: true, 
            name: true, 
            category: true, 
            risk_score: true, 
            revenue_tier: true,
            accreditation_status: true
          }
        });
        const fintechCompanies = await db.query.companies.findMany({
          where: eq(companies.category, 'FinTech'),
          columns: { 
            id: true, 
            name: true, 
            category: true, 
            risk_score: true, 
            revenue_tier: true,
            accreditation_status: true
          }
        });
        allTargetCompanies = [...bankCompanies, ...fintechCompanies];
      }

      // Filter out current user's company and related companies
      const candidates = allTargetCompanies.filter(company => 
        company.id !== userCompanyId && 
        !relatedCompanyIds.includes(company.id)
      );

      res.json({
        candidates,
        totalAvailable: candidates.length,
        targetCategory,
        expansionMessage
      });

    } catch (error) {
      console.error('[Network Expansion] Error fetching expansion candidates:', error);
      res.status(500).json({ 
        message: "Error fetching expansion candidates",
        code: "FETCH_ERROR"
      });
    }
  });

  // Risk Flow Visualization (Sankey Diagram) endpoint
  app.get("/api/risk-flow-visualization", requireAuth, async (req, res) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const currentCompanyId = req.user.company_id;
      
      console.log('[RiskFlow] Fetching risk flow visualization data for company:', currentCompanyId);
      
      // Get all companies in the network (current company and related companies)
      const companiesResult = await db.execute(
        sql`
          SELECT 
            c.id, 
            c.name, 
            c.category, 
            c.accreditation_status, 
            c.risk_score
          FROM companies c 
          WHERE c.id IN (
            SELECT r.related_company_id 
            FROM relationships r 
            WHERE r.company_id = ${currentCompanyId}
            UNION
            SELECT r.company_id 
            FROM relationships r 
            WHERE r.related_company_id = ${currentCompanyId}
            UNION
            SELECT ${currentCompanyId}
          )
          ORDER BY c.name
        `
      );
      
      // Determine risk bucket for each company (0-100 scale)
      const getRiskBucket = (score: number): RiskBucket => {
        if (score === 0) return 'none';
        if (score <= 33) return 'low';
        if (score <= 66) return 'medium';
        if (score <= 99) return 'high';
        return 'critical';
      };
      
      // Define colors for each category
      const colorMap = {
        companyType: {
          'Invela': '#4965EC', // Invela Blue
          'Bank': '#0C195B',   // Dark Blue
          'FinTech': '#C2C4EA', // Light Purple
          'Other': '#CCCCCC'  // Gray
        },
        accreditationStatus: {
          'APPROVED': '#209C5A',     // Green
          'PENDING': '#FFC300',      // Amber
          'AWAITING_INVITATION': '#8A8D9F', // Gray
          'REVOKED': '#E15554'       // Red
        },
        riskBucket: {
          'low': '#82C091',     // Light Green
          'medium': '#F9CB9C',  // Light Orange
          'high': '#F28C77',    // Orange-Red
          'critical': '#DB4325' // Deep Red
        }
      };
      
      // Process and categorize the companies
      const companyTypes = new Map<string, number>();
      const accreditationStatuses = new Map<string, number>();
      const riskBuckets = new Map<string, number>();
      
      // Maps to track relationships between categories
      const typeToStatus = new Map<string, Map<string, number>>();
      const statusToRisk = new Map<string, Map<string, number>>();
      
      // Process each company
      companiesResult.rows.forEach((company: any) => {
        const type = company.category || 'Other';
        const status = company.accreditation_status || 'AWAITING_INVITATION';
        const riskScore = company.risk_score || 0;
        const riskBucket = getRiskBucket(riskScore);
        
        // Count by company type
        companyTypes.set(type, (companyTypes.get(type) || 0) + 1);
        
        // Count by accreditation status
        accreditationStatuses.set(status, (accreditationStatuses.get(status) || 0) + 1);
        
        // Count by risk bucket
        riskBuckets.set(riskBucket, (riskBuckets.get(riskBucket) || 0) + 1);
        
        // Track company type to accreditation status flow
        if (!typeToStatus.has(type)) {
          typeToStatus.set(type, new Map<string, number>());
        }
        const statusMap = typeToStatus.get(type)!;
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
        
        // Track accreditation status to risk bucket flow
        if (!statusToRisk.has(status)) {
          statusToRisk.set(status, new Map<string, number>());
        }
        const riskMap = statusToRisk.get(status)!;
        riskMap.set(riskBucket, (riskMap.get(riskBucket) || 0) + 1);
      });
      
      // Create Sankey nodes and links
      const nodes: SankeyNode[] = [];
      const links: SankeyLink[] = [];
      
      // Add company type nodes
      Array.from(companyTypes.entries()).forEach(([type, count]) => {
        nodes.push({
          id: `type-${type}`,
          name: type,
          category: 'companyType',
          count,
          color: colorMap.companyType[type as keyof typeof colorMap.companyType] || colorMap.companyType.Other
        });
      });
      
      // Add accreditation status nodes
      Array.from(accreditationStatuses.entries()).forEach(([status, count]) => {
        nodes.push({
          id: `status-${status}`,
          name: status.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
          category: 'accreditationStatus',
          count,
          color: colorMap.accreditationStatus[status as keyof typeof colorMap.accreditationStatus] || colorMap.accreditationStatus.AWAITING_INVITATION
        });
      });
      
      // Add risk bucket nodes
      Array.from(riskBuckets.entries()).forEach(([bucket, count]) => {
        nodes.push({
          id: `risk-${bucket}`,
          name: bucket.charAt(0).toUpperCase() + bucket.slice(1) + ' Risk',
          category: 'riskBucket',
          count,
          color: colorMap.riskBucket[bucket as keyof typeof colorMap.riskBucket]
        });
      });
      
      // Add links from company types to accreditation statuses
      typeToStatus.forEach((statusMap, type) => {
        statusMap.forEach((value, status) => {
          links.push({
            source: `type-${type}`,
            target: `status-${status}`,
            value,
            sourceColor: colorMap.companyType[type as keyof typeof colorMap.companyType] || colorMap.companyType.Other,
            targetColor: colorMap.accreditationStatus[status as keyof typeof colorMap.accreditationStatus] || colorMap.accreditationStatus.AWAITING_INVITATION
          });
        });
      });
      
      // Add links from accreditation statuses to risk buckets
      statusToRisk.forEach((riskMap, status) => {
        riskMap.forEach((value, riskBucket) => {
          links.push({
            source: `status-${status}`,
            target: `risk-${riskBucket}`,
            value,
            sourceColor: colorMap.accreditationStatus[status as keyof typeof colorMap.accreditationStatus] || colorMap.accreditationStatus.AWAITING_INVITATION,
            targetColor: colorMap.riskBucket[riskBucket as keyof typeof colorMap.riskBucket]
          });
        });
      });
      
      // Prepare the final response
      const sankeyData: SankeyData = {
        nodes,
        links
      };
      
      console.log('[RiskFlow] Generated Sankey data with:', {
        nodeCount: nodes.length,
        linkCount: links.length
      });
      
      res.json(sankeyData);
    } catch (error) {
      console.error("[RiskFlow] Error generating risk flow visualization:", error);
      res.status(500).json({ 
        message: "Error generating risk flow visualization",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Removed Storybook static files - using custom component library

  // ========================================
  // FINTECH COMPANY GENERATION ENDPOINT
  // ========================================
  
  /**
   * POST /api/generate-fintech-companies
   * Generates 100 diverse FinTech companies for network selection
   */
  app.post('/api/generate-fintech-companies', async (req: Request, res: Response) => {
    try {
      console.log('[FinTechGeneration] Starting generation of 100 FinTech companies...');
      
      // Import the generator function
      const { generateFinTechCompanies, validateGeneration } = await import('./utils/fintech-company-generator');
      
      // Execute the generation
      await generateFinTechCompanies();
      
      // Validate the results
      await validateGeneration();
      
      console.log('[FinTechGeneration] ✅ Successfully completed generation and validation');
      
      res.status(200).json({
        success: true,
        message: 'Successfully generated 100 FinTech companies',
        details: {
          approved_companies: 50,
          pending_companies: 50,
          total_companies: 100,
          network_relationships_created: true,
          generation_timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('[FinTechGeneration] ❌ Generation failed:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to generate FinTech companies',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Company users endpoint moved to proper registration location within registerRoutes() function

  // Demo API routes are now registered early in the process via synchronous import
  // This ensures API endpoints have proper priority over frontend catch-all routes

  // Output consolidated route registration summary
  console.log(`[Routes] ${routeRegistrationTracker.getSummary()}`);
  // ========================================
  // FINTECH COMPANY GENERATION ENDPOINTS
  // ========================================

  // Generate custom number of FinTech companies
  app.post("/api/generate-fintech-companies", requireAuth, async (req, res) => {
    try {
      const { count = 100 } = req.body;
      
      // Validate count parameter
      if (!Number.isInteger(count) || count < 1 || count > 1000) {
        return res.status(400).json({
          message: "Count must be an integer between 1 and 1000",
          error: "INVALID_COUNT"
        });
      }

      console.log(`[FinTechGenerator] Starting generation of ${count} companies via API`);
      
      // Import and run the generator
      const { generateFinTechCompanies } = await import('./utils/fintech-company-generator');
      await generateFinTechCompanies(count);
      
      res.json({
        message: `Successfully generated ${count} FinTech companies`,
        count,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[FinTechGenerator] API generation failed:', error);
      res.status(500).json({
        message: "Failed to generate FinTech companies",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Test with a single company first
  app.post("/api/test-fintech-generation", requireAuth, async (req, res) => {
    try {
      console.log('[FinTechGenerator] Testing with single company generation');
      
      // Import and run the test
      const { testSingleCompanyGeneration } = await import('./utils/test-single-company');
      await testSingleCompanyGeneration();
      
      res.json({
        message: "Successfully generated and validated 1 test FinTech company",
        count: 1,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[FinTechGenerator] Test generation failed:', error);
      res.status(500).json({
        message: "Failed to generate test company",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Validate generation results
  app.get("/api/validate-fintech-generation", requireAuth, async (req, res) => {
    try {
      console.log('[FinTechGenerator] Validating generation results');
      
      // Import and run validation
      const { validateGeneration } = await import('./utils/fintech-company-generator');
      await validateGeneration();
      
      res.json({
        message: "Generation validation completed successfully",
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[FinTechGenerator] Validation failed:', error);
      res.status(500).json({
        message: "Failed to validate generation",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  return app;
}

// Export both the named and default function for backward compatibility
export default registerRoutes;