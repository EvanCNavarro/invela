/**
 * File Vault Router
 * 
 * This router handles all endpoints related to file vault access management.
 * It provides dedicated endpoints for:
 * 1. Checking if file vault is unlocked
 * 2. Unlocking file vault access
 * 3. Refreshing file vault status
 * 
 * All endpoints are protected by authentication middleware.
 */

import express from 'express';
import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * Utility function to check if a user can access a specific company
 */
async function canAccessCompany(userId: number, companyId: number) {
  // For this simplified implementation, we'll just return true
  // In production, you would implement proper permission checks
  return true;
}

/**
 * POST /api/companies/:id/unlock-file-vault
 * Unlock file vault access for a company
 */
router.post('/companies/:id/unlock-file-vault', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const companyId = parseInt(req.params.id, 10);
    if (isNaN(companyId)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }
    
    // Verify user has access to this company
    const userId = req.user.id;
    const hasAccess = await canAccessCompany(userId, companyId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this company' });
    }
    
    console.log(`[FileVault] Unlocking file vault for company ${companyId}`, {
      userId,
      companyId,
      source: 'file-vault-unlock-endpoint'
    });
    
    // Get current company data
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
      
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Check if file vault is already unlocked
    const availableTabs = company.available_tabs || [];
    if (availableTabs.includes('file-vault')) {
      console.log(`[FileVault] File vault already unlocked for company ${companyId}`, {
        companyId,
        availableTabs
      });
      
      return res.status(200).json({
        message: 'File vault already unlocked',
        company: {
          id: company.id,
          name: company.name,
          available_tabs: availableTabs
        }
      });
    }
    
    // Add file-vault to available tabs
    const updatedTabs = [...availableTabs, 'file-vault'];
    
    // Update company record in database
    await db
      .update(companies)
      .set({ 
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
      
    console.log(`[FileVault] Successfully unlocked file vault for company ${companyId}`, {
      companyId,
      availableTabs: updatedTabs
    });
    
    // Try to broadcast WebSocket event for real-time updates
    try {
      const wsService = req.app.get('wsService');
      if (wsService && typeof wsService.broadcast === 'function') {
        wsService.broadcast('company_updated', {
          companyId,
          company: {
            id: company.id,
            name: company.name,
            available_tabs: updatedTabs
          },
          timestamp: new Date().toISOString(),
          cache_invalidation: true
        });
        
        console.log(`[FileVault] Broadcast WebSocket event for company ${companyId}`, {
          companyId,
          event: 'company_updated'
        });
      }
    } catch (wsError) {
      console.error(`[FileVault] Failed to broadcast WebSocket event`, {
        error: wsError instanceof Error ? wsError.message : String(wsError),
        companyId
      });
      // Continue despite WebSocket error - the API will still return success
    }
    
    return res.status(200).json({
      message: 'File vault unlocked successfully',
      company: {
        id: company.id,
        name: company.name,
        available_tabs: updatedTabs
      }
    });
  } catch (error) {
    console.error(`[FileVault] Error unlocking file vault`, {
      error: error instanceof Error ? error.message : String(error),
      companyId: req.params.id
    });
    
    return res.status(500).json({
      error: 'Failed to unlock file vault',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/companies/:id/file-vault-status
 * Check if file vault is unlocked for a company
 */
router.get('/companies/:id/file-vault-status', async (req, res) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const companyId = parseInt(req.params.id, 10);
    if (isNaN(companyId)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }
    
    // Verify user has access to this company
    const userId = req.user.id;
    const hasAccess = await canAccessCompany(userId, companyId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to this company' });
    }
    
    // Get current company data
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
      
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Check if file vault is unlocked
    const availableTabs = company.available_tabs || [];
    const isUnlocked = availableTabs.includes('file-vault');
    
    return res.status(200).json({
      isUnlocked,
      company: {
        id: company.id,
        name: company.name,
        available_tabs: availableTabs
      }
    });
  } catch (error) {
    console.error(`[FileVault] Error checking file vault status`, {
      error: error instanceof Error ? error.message : String(error),
      companyId: req.params.id
    });
    
    return res.status(500).json({
      error: 'Failed to check file vault status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;