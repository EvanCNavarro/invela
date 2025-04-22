import { Express, Router } from 'express';
import { eq, and, gt, sql, or, isNull, inArray } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import { db } from '@db';
import timestampRouter from './routes/kyb-timestamp-routes';
import { users, companies, files, companyLogos, relationships, tasks, invitations, TaskStatus } from '@db/schema';
import { taskStatusToProgress, NetworkVisualizationData, RiskBucket } from './types';
import { emailService } from './services/email';
import { requireAuth } from './middleware/auth';
import { logoUpload } from './middleware/upload';
import { broadcastTaskUpdate, broadcastMessage, getWebSocketServer } from './services/websocket';
import crypto from 'crypto';
import companySearchRouter from "./routes/company-search";
import { createCompany } from "./services/company";
import kybRouter from './routes/kyb';
import { checkAndUnlockSecurityTasks } from './routes/kyb';
import { getKybProgress } from './routes/kyb-update';
import kybTimestampRouter from './routes/kyb-timestamp-routes';
import cardRouter from './routes/card';
import securityRouter from './routes/security';
import ky3pRouter from './routes/ky3p';
import ky3pDemoAutofillRouter from './routes/ky3p-demo-autofill';
import openBankingDemoAutofillRouter from './routes/open-banking-demo-autofill';
import filesRouter from './routes/files';
import enhancedDebugRoutes from './enhanced-debug-routes';
import debugRouter from './routes/debug';
import { registerOpenBankingRoutes } from './routes/open-banking';
import { registerOpenBankingProgressRoutes } from './routes/open-banking-progress';
import { registerOpenBankingTimestampRoutes } from './routes/open-banking-timestamp-routes';
import accessRouter from './routes/access';
import adminRouter from './routes/admin';
import tasksRouter from './routes/tasks';
import taskTemplatesRouter from './routes/task-templates';
import { aiSuggestionsRouter } from './routes/ai-suggestions';
import websocketRouter from './routes/websocket';
import { router as wsTestRouter } from './routes/websocket-test';
import submissionsRouter from './routes/submissions';
import companyTabsRouter from './routes/company-tabs';
import fileVaultRouter from './routes/file-vault';
import broadcastRouter from './routes/broadcast';
import { analyzeDocument } from './services/openai';
import { PDFExtract } from 'pdf.js-extract';

// Create PDFExtract instance
const pdfExtract = new PDFExtract();

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

export function registerRoutes(app: Express): Express {
  app.use(companySearchRouter);
  app.use(kybRouter);
  
  // Register KYB progress route with status update support
  const kybProgressRouter = Router();
  getKybProgress(kybProgressRouter);
  app.use(kybProgressRouter);

  // Register KYB timestamps route for field-level timestamp support
  app.use('/api/kyb/timestamps', kybTimestampRouter);
  
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
        broadcastMessage('company_tabs_updated', {
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
      broadcastMessage('company_tabs_updated', {
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
        broadcastMessage('company_tabs_updated', {
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
  
  app.use(cardRouter);
  app.use(securityRouter);
  app.use(ky3pRouter);
  app.use(ky3pDemoAutofillRouter);
  app.use(openBankingDemoAutofillRouter);
  app.use(filesRouter);
  
  // Register Open Banking Survey routes with WebSocket support
  registerOpenBankingRoutes(app, getWebSocketServer());
  
  // Register Open Banking Progress routes for standardized form handling
  const openBankingProgressRouter = Router();
  registerOpenBankingProgressRoutes(openBankingProgressRouter);
  app.use(openBankingProgressRouter);
  
  // Register Open Banking Timestamps routes for field-level timestamp conflict resolution
  registerOpenBankingTimestampRoutes(app);
  
  app.use(accessRouter);
  app.use('/api/admin', adminRouter);
  app.use(tasksRouter);
  app.use('/api/task-templates', taskTemplatesRouter);
  app.use(aiSuggestionsRouter);
  
  // Register WebSocket test routes
  app.use('/api/websocket', websocketRouter);
  
  // Register test endpoints for WebSocket functionality
  app.use('/api/ws-test', wsTestRouter);
  
  // Register submission status API - reliable form submission status checking
  app.use('/api/submissions', submissionsRouter);
  
  // Register broadcast router for demo auto-fill WebSocket functionality
  app.use(broadcastRouter);

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
        accreditation_status: sql<string>`COALESCE(${companies.accreditation_status}, '')`,
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
          hasRelationship: c.has_relationship
        }))
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
          accreditation_status: company.accreditation_status,
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
      const [company] = await db.select()
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

      // Transform response to include both risk_score and riskScore consistently
      // Also include isDemo for frontend usage (camelCase)
      const transformedCompany = {
        ...company,
        risk_score: company.risk_score,       // Keep the original property
        riskScore: company.risk_score,        // Add the frontend expected property name
        chosen_score: company.chosen_score,   // Keep the original property
        chosenScore: company.chosen_score,    // Add camelCase version for frontend
        isDemo: company.is_demo               // Add camelCase version for frontend
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

  // Get company by ID
  app.get("/api/companies/:id", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);

      if (isNaN(companyId)) {
        return res.status(400).json({
          message: "Invalid company ID",
          code: "INVALID_ID"
        });
      }

      // Get company details along with relationship check
      const [company] = await db.select()
        .from(companies)
        .where(
          and(
            eq(companies.id, companyId),
            or(
              eq(companies.id, req.user.company_id),
              sql`EXISTS (
                SELECT 1 FROM ${relationships} r 
                WHERE (r.company_id = ${companies.id} AND r.related_company_id = ${req.user.company_id})
                OR (r.company_id = ${req.user.company_id} AND r.related_company_id = ${companies.id})
              )`
            )
          )
        );

      if (!company) {
        return res.status(404).json({
          message: "Company not found",
          code: "COMPANY_NOT_FOUND"
        });
      }

      // Transform response to match frontend expectations
      // Ensure we transform the response to include both risk_score and riskScore consistently
      // Also include isDemo field for frontend usage
      const transformedCompany = {
        ...company,
        websiteUrl: company.website_url,
        numEmployees: company.num_employees,
        incorporationYear: company.incorporation_year,
        risk_score: company.risk_score,       // Keep the original property
        riskScore: company.risk_score,        // Add the frontend expected property name
        chosen_score: company.chosen_score,   // Keep the original property
        chosenScore: company.chosen_score,    // Add camelCase version for frontend
        risk_clusters: company.risk_clusters, // Keep the original property
        riskClusters: company.risk_clusters,  // Add frontend-friendly version
        is_demo: company.is_demo,             // Keep the original property
        isDemo: company.is_demo               // Add camelCase version for frontend
      };

      res.json(transformedCompany);
    } catch (error) {
      console.error("[Companies] Error fetching company:", error);
      res.status(500).json({
        message: "Error fetching company details",
        code: "INTERNAL_ERROR"
      });
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
      if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 1500) {
        return res.status(400).json({
          message: "Invalid score value (must be between 0 and 1500)",
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
      
      // Fetch the company data
      const companyData = await db.select({
        id: companies.id,
        name: companies.name,
        description: companies.description,
        category: companies.category,
        riskScore: companies.risk_score,
        chosenScore: companies.chosen_score,
        riskClusters: companies.risk_clusters,
        onboardingCompleted: companies.onboarding_company_completed,
        isDemo: companies.is_demo,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
      
      if (!companyData || companyData.length === 0) {
        return res.status(404).json({
          message: "Company not found",
          code: "NOT_FOUND"
        });
      }
      
      // Return the company data
      return res.json(companyData[0]);
    } catch (error) {
      console.error("[Companies] Error fetching company data:", error);
      return res.status(500).json({
        message: "Error fetching company data",
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

      // 3. Determine risk bucket for each company on 0-1500 scale
      const getRiskBucket = (score: number): RiskBucket => {
        if (score <= 500) return 'low';
        if (score <= 900) return 'medium';  // Changed from 700 to 900
        if (score <= 1200) return 'high';   // Changed from 1000 to 1200
        return 'critical';
      };

      // 4. Transform into the expected format
      const nodes = networkRelationships.map(rel => {
        // Get revenue tier from metadata or use default
        const revenueTier = (rel.metadata?.revenueTier as string) || 'Unknown';
        
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

      // Update the related task
      const [task] = await db.select()
        .from(tasks)
        .where(and(
          eq(tasks.user_email, email.toLowerCase()),
          eq(tasks.status, TaskStatus.EMAIL_SENT)
        ));

      if (task) {
        const [updatedTask] = await db.update(tasks)
          .set({
            status: TaskStatus.COMPLETED,
            progress: 100, // Set directly to 100 for completed status
            assigned_to: updatedUser.id,
            metadata: {
              ...task.metadata,
              registeredAt: new Date().toISOString(),
              statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.COMPLETED]
            }
          })
          .where(eq(tasks.id, task.id))
          .returning();

        console.log('[Account Setup] Updated task status:', {
          taskId: updatedTask.id,
          status: updatedTask.status,
          progress: updatedTask.progress
        });

        broadcastTaskUpdate(updatedTask);
      }

      // Update invitation status
      await db.update(invitations)
        .set({
          status: 'used',
          used_at: new Date(),
        })
        .where(eq(invitations.id, invitation.id));

      // Log the user in
      req.login(updatedUser, (err) => {
        if (err) {
          console.error("[Account Setup] Login error:", err);
          return res.status(500).json({ message: "Error logging in" });
        }
        res.json(updatedUser);
      });

    } catch (error) {
      console.error("[Account Setup] Account setup error:", error);
      res.status(500).json({ message: "Error updating user information" });
    }
  });

  // Add new endpoint after account setup endpoint
  app.post("/api/user/complete-onboarding", requireAuth, async (req, res) => {
    try {
      console.log('[User Onboarding] Completing onboarding for user:', req.user.id);

      const [updatedUser] = await db.update(users)
        .set({
          onboarding_user_completed: true,
          updated_at: new Date()
        })
        .where(eq(users.id, req.user.id))
        .returning();

      console.log('[User Onboarding] Updated user onboarding status:', {
        id: updatedUser.id,
        onboarding_completed: updatedUser.onboarding_user_completed
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("[User Onboarding] Error updating onboarding status:", error);
      res.status(500).json({ message: "Error updating onboarding status" });
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
          // Get sender company
          const [userCompany] = await tx.select()
            .from(companies)
            .where(eq(companies.id, req.user!.company_id));

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
              metadata: {
                invited_by: req.user!.id,
                invited_at: new Date().toISOString(),
                invited_from: userCompany.name,
                created_via: 'fintech_invite',
                created_by_id: req.user!.id
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

          // Broadcast task update
          broadcastTaskUpdate({
            id: onboardingTask.id,
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
      console.log('[Complete Onboarding] Processing request for user:', req.user.id);

      // Update user's onboarding status
      const [updatedUser] = await db.update(users)
        .set({
          onboarding_user_completed: true,
          updated_at: new Date()
        })
        .where(eq(users.id, req.user.id))
        .returning();

      if (!updatedUser) {
        console.error('[Complete Onboarding] Failed to update user:', req.user.id);
        return res.status(500).json({ message: "Failed to update user" });
      }

      // Try to update the onboarding task status
      const updatedTask = await updateOnboardingTaskStatus(req.user.id);

      console.log('[Complete Onboarding] Successfully completed onboarding for user:', {
        userId: updatedUser.id,
        taskId: updatedTask?.id
      });

      res.json({
        message: "Onboarding completed successfully",
        user: updatedUser,
        task: updatedTask
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

            // Send progress update via WebSocket
            broadcastTaskUpdate({
              type: 'CLASSIFICATION_UPDATE',
              fileId: file.id.toString(),
              category: file.category || 'unknown',
              confidence: 0.95
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

      // Map risk scores to risk buckets (0-1500 scale)
      const getRiskBucket = (score: number) => {
        if (score <= 500) return 'low';
        if (score <= 900) return 'medium';  // Changed from 700 to 900
        if (score <= 1200) return 'high';   // Changed from 1000 to 1200
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
      
      // Determine risk bucket for each company
      const getRiskBucket = (score: number): RiskBucket => {
        if (score < 300) return 'low';
        if (score < 700) return 'medium';
        if (score < 1000) return 'high';
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

  console.log('[Routes] Routes setup completed');  
  return app;
}

// Export both the named and default function for backward compatibility
export default registerRoutes;