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

const router = Router();

/**
 * Enable file vault for a specific company
 */
router.post('/api/file-vault/enable/:companyId', requireAuth, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    // Validate company ID
    if (isNaN(companyId) || companyId <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid company ID' 
      });
    }
    
    // Get the company record
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId));
    
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: 'Company not found' 
      });
    }
    
    // Get current tabs or default to task-center
    const currentTabs = company.available_tabs || ['task-center'];
    
    // Check if file-vault is already in the tabs
    if (currentTabs.includes('file-vault')) {
      console.log(`[FILE VAULT] Company ${companyId} already has file-vault tab`);
      
      return res.json({
        success: true,
        message: 'File vault already enabled',
        company: {
          id: company.id,
          name: company.name,
          available_tabs: currentTabs
        }
      });
    }
    
    // Add file-vault tab
    const updatedTabs = [...currentTabs, 'file-vault'];
    console.log(`[FILE VAULT] Adding file-vault tab to company ${companyId}`);
    
    // Update the company record
    const [updatedCompany] = await db.update(companies)
      .set({
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning();
    
    console.log(`[FILE VAULT] Successfully enabled file vault for company ${companyId}`);
    
    // Return success response with updated company data
    return res.json({
      success: true,
      message: 'File vault enabled successfully',
      company: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        available_tabs: updatedCompany.available_tabs
      }
    });
  } catch (error) {
    console.error('[FILE VAULT] Error enabling file vault:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to enable file vault'
    });
  }
});

/**
 * Get file vault status for a specific company
 */
router.get('/api/file-vault/status/:companyId', requireAuth, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    // Validate company ID
    if (isNaN(companyId) || companyId <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid company ID' 
      });
    }
    
    // Get the company record
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId));
    
    if (!company) {
      return res.status(404).json({ 
        success: false, 
        message: 'Company not found' 
      });
    }
    
    // Get current tabs or default to task-center
    const currentTabs = company.available_tabs || ['task-center'];
    
    // Check if file-vault is in the tabs
    const hasFileVault = currentTabs.includes('file-vault');
    
    return res.json({
      success: true,
      enabled: hasFileVault,
      company: {
        id: company.id,
        name: company.name,
        available_tabs: currentTabs
      }
    });
  } catch (error) {
    console.error('[FILE VAULT] Error checking file vault status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check file vault status'
    });
  }
});

export default router;