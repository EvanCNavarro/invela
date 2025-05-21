/**
 * Routes for managing company tabs
 * 
 * This file defines the API endpoints for managing and updating company tabs,
 * including the file vault unlock functionality.
 */

import { Router } from 'express';
import { CompanyTabsService } from '../services/companyTabsService';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
// Logger is already initialized in the imported module

/**
 * Update available tabs for a company
 * POST /api/company-tabs/:companyId
 * 
 * Request body: { tabs: string[] }
 * Returns the updated company with the new tabs
 */
router.post('/:companyId', requireAuth, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    const { tabs } = req.body;
    
    if (isNaN(companyId)) {
      return res.status(400).json({ message: 'Invalid company ID' });
    }
    
    if (!Array.isArray(tabs) || !tabs.every(tab => typeof tab === 'string')) {
      return res.status(400).json({ message: 'Tabs must be an array of strings' });
    }
    
    console.log(`[CompanyTabsRoutes] Updating tabs for company ${companyId}:`, tabs);
    
    const updatedCompany = await CompanyTabsService.addTabsToCompany(companyId, tabs);
    
    if (!updatedCompany) {
      return res.status(500).json({ message: 'Failed to update company tabs' });
    }
    
    res.json({
      success: true,
      company: updatedCompany
    });
  } catch (error) {
    logger.error('Error updating company tabs', error);
    res.status(500).json({ message: 'Error updating company tabs' });
  }
});

/**
 * Unlock file vault for a company
 * POST /api/company-tabs/:companyId/unlock-file-vault
 * 
 * This endpoint specifically adds the 'file-vault' tab to a company's available tabs
 * and broadcasts a WebSocket message to update all connected clients.
 */
router.post('/:companyId/unlock-file-vault', requireAuth, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    if (isNaN(companyId)) {
      return res.status(400).json({ message: 'Invalid company ID' });
    }
    
    console.log(`[CompanyTabsRoutes] Unlocking file vault for company ${companyId}`);
    
    // Use the CompanyTabsService to unlock the file vault
    const updatedCompany = await CompanyTabsService.unlockFileVault(companyId);
    
    if (!updatedCompany) {
      return res.status(500).json({ message: 'Failed to unlock file vault' });
    }
    
    // Clear any server-side cache
    try {
      const { invalidateCompanyCache } = require('../routes');
      if (typeof invalidateCompanyCache === 'function') {
        invalidateCompanyCache(companyId);
        console.log(`[CompanyTabsRoutes] Invalidated cache for company ${companyId}`);
      }
    } catch (cacheError) {
      console.error(`[CompanyTabsRoutes] Error invalidating cache:`, cacheError);
    }
    
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
    logger.error('Error unlocking file vault', error);
    res.status(500).json({ message: 'Error unlocking file vault' });
  }
});

/**
 * Force unlock file vault for any company (emergency endpoint)
 * POST /api/company-tabs/force-unlock/:companyId
 * 
 * This endpoint is an emergency fix for unlocking the file vault
 * even if the user doesn't have direct access to the company.
 * It should only be used for debugging and emergency fixes.
 */
router.post('/force-unlock/:companyId', async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    if (isNaN(companyId)) {
      return res.status(400).json({ message: 'Invalid company ID' });
    }
    
    console.log(`[EMERGENCY] Force unlocking file vault for company ${companyId}`);
    
    // Use the CompanyTabsService to unlock the file vault
    const updatedCompany = await CompanyTabsService.unlockFileVault(companyId);
    
    if (!updatedCompany) {
      return res.status(500).json({ message: 'Failed to force unlock file vault' });
    }
    
    // Clear any server-side cache
    try {
      const { invalidateCompanyCache } = require('../routes');
      if (typeof invalidateCompanyCache === 'function') {
        invalidateCompanyCache(companyId);
        console.log(`[EMERGENCY] Invalidated cache for company ${companyId}`);
      }
    } catch (cacheError) {
      console.error(`[EMERGENCY] Error invalidating cache:`, cacheError);
    }
    
    res.json({
      success: true,
      message: 'File vault force unlocked successfully',
      company: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        available_tabs: updatedCompany.available_tabs
      }
    });
  } catch (error) {
    logger.error('Error force unlocking file vault', error);
    res.status(500).json({ message: 'Error force unlocking file vault' });
  }
});

export default router;