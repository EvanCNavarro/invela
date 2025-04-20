/**
 * File Vault API Routes
 * 
 * This module provides endpoints for updating and accessing file vault functionality
 */

import { Router } from 'express';
import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

export const fileVaultRouter = Router();

/**
 * Enable file vault for a specific company
 */
fileVaultRouter.post('/enable/:companyId', requireAuth, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    if (isNaN(companyId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid company ID' 
      });
    }
    
    // Get the company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: 'Company not found' 
      });
    }
    
    // Get current available tabs
    const currentTabs = company.available_tabs || [];
    
    // Check if file-vault tab already exists
    if (currentTabs.includes('file-vault')) {
      console.log(`[File Vault] File vault tab already enabled for company ${companyId}`);
      return res.status(200).json({ 
        success: true, 
        message: 'File vault already enabled',
        company: company
      });
    }
    
    // Add file-vault tab
    const newTabs = [...currentTabs, 'file-vault'];
    
    // Update the company record
    const [updatedCompany] = await db
      .update(companies)
      .set({ available_tabs: newTabs })
      .where(eq(companies.id, companyId))
      .returning();
    
    console.log(`[File Vault] Successfully enabled file vault for company ${companyId}`);
    
    // Return success
    return res.status(200).json({
      success: true,
      message: 'File vault enabled successfully',
      company: updatedCompany
    });
  } catch (error) {
    console.error('[File Vault] Error enabling file vault:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get file vault status for a specific company
 */
fileVaultRouter.get('/status/:companyId', requireAuth, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    if (isNaN(companyId)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }
    
    // Get the company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Check if file-vault tab is enabled
    const availableTabs = company.available_tabs || [];
    const enabled = availableTabs.includes('file-vault');
    
    return res.status(200).json({
      enabled,
      company_id: companyId,
      available_tabs: availableTabs
    });
  } catch (error) {
    console.error('[File Vault] Error checking file vault status:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Force enable file vault for the current company
 * This is a direct emergency endpoint that bypasses all checks
 */
fileVaultRouter.post('/force-enable', requireAuth, async (req, res) => {
  try {
    // Get the current user's company ID
    if (!req.user || !req.user.company_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'User does not have an associated company' 
      });
    }
    
    const companyId = req.user.company_id;
    
    // Get the company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: 'Company not found' 
      });
    }
    
    // Get current available tabs
    const currentTabs = company.available_tabs || [];
    
    // Check if file-vault tab already exists
    if (currentTabs.includes('file-vault')) {
      console.log(`[File Vault] File vault tab already enabled for company ${companyId}`);
      return res.status(200).json({ 
        success: true, 
        message: 'File vault already enabled',
        company: company
      });
    }
    
    // Add file-vault tab
    const newTabs = [...currentTabs, 'file-vault'];
    
    // Update the company record
    const [updatedCompany] = await db
      .update(companies)
      .set({ available_tabs: newTabs })
      .where(eq(companies.id, companyId))
      .returning();
    
    console.log(`[File Vault] Successfully force enabled file vault for company ${companyId}`);
    
    // Return success
    return res.status(200).json({
      success: true,
      message: 'File vault force enabled successfully',
      company: updatedCompany
    });
  } catch (error) {
    console.error('[File Vault] Error force enabling file vault:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});