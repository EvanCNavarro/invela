/**
 * API endpoints for managing company tabs
 * These routes handle tab updates and WebSocket broadcasting
 */

import { Router } from 'express';
import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';
import { broadcastMessage } from '../services/websocket';

const router = Router();

// Update company tabs endpoint - unlocks tabs like file-vault
router.post("/:id/update-tabs", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(id);
    const { addTabs = [], removeTabs = [], sendWebSocketEvent = true } = req.body;
    
    if (isNaN(companyId)) {
      return res.status(400).json({ message: "Invalid company ID", code: "INVALID_ID" });
    }
    
    // Get the company record
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
      
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    
    // Update the tabs
    const currentTabs = company.available_tabs || ['task-center'];
    let updatedTabs = [...currentTabs];
    
    // Add tabs if specified
    if (addTabs.length > 0) {
      const validTabsToAdd = addTabs.filter(tab => !currentTabs.includes(tab));
      updatedTabs = [...updatedTabs, ...validTabsToAdd];
    }
    
    // Remove tabs if specified (but never remove task-center)
    if (removeTabs.length > 0) {
      updatedTabs = updatedTabs.filter(tab => !removeTabs.includes(tab) || tab === 'task-center');
    }
    
    // Skip update if no changes
    if (JSON.stringify(currentTabs) === JSON.stringify(updatedTabs)) {
      return res.json({
        message: "No changes to company tabs",
        companyId,
        availableTabs: currentTabs,
        changes: false
      });
    }
    
    // Update the company record
    const [updatedCompany] = await db.update(companies)
      .set({
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning();
      
    console.log('[Company Tabs API] Updated tabs for company', companyId, {
      previousTabs: currentTabs,
      newTabs: updatedTabs
    });
    
    // Send WebSocket notification if requested
    if (sendWebSocketEvent) {
      try {
        broadcastMessage('company_tabs_updated', {
          companyId,
          availableTabs: updatedTabs,
          timestamp: new Date().toISOString()
        });
        console.log(`[Company Tabs API] Broadcasted company_tabs_updated event for company ${companyId}`);
      } catch (wsError) {
        console.error('[Company Tabs API] Failed to broadcast WebSocket event:', wsError);
      }
    }
    
    // Return success response
    return res.json({
      message: "Company tabs updated successfully",
      companyId,
      availableTabs: updatedTabs,
      previousTabs: currentTabs,
      changes: true
    });
  } catch (error) {
    console.error('[Company Tabs API] Error updating company tabs:', error);
    return res.status(500).json({ message: "Internal server error", code: "SERVER_ERROR" });
  }
});

// Force unlock file vault endpoint
router.post("/:id/unlock-file-vault", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = parseInt(id);
    
    if (isNaN(companyId)) {
      return res.status(400).json({ message: "Invalid company ID", code: "INVALID_ID" });
    }
    
    // Get the company record
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
      
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    
    // Check if file-vault is already unlocked
    const currentTabs = company.available_tabs || ['task-center'];
    if (currentTabs.includes('file-vault')) {
      return res.json({
        message: "File vault already unlocked",
        companyId,
        availableTabs: currentTabs,
        changes: false
      });
    }
    
    // Add file-vault to available tabs
    const updatedTabs = [...currentTabs, 'file-vault'];
    
    // Update the company record
    const [updatedCompany] = await db.update(companies)
      .set({
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning();
      
    console.log('[Company Tabs API] Unlocked file vault for company', companyId);
    
    // Always send WebSocket notification for file vault unlocking
    try {
      broadcastMessage('company_tabs_updated', {
        companyId,
        availableTabs: updatedTabs,
        timestamp: new Date().toISOString()
      });
      console.log(`[Company Tabs API] Broadcasted company_tabs_updated event for file vault unlock`);
    } catch (wsError) {
      console.error('[Company Tabs API] Failed to broadcast WebSocket event:', wsError);
    }
    
    // Return success response
    return res.json({
      message: "File vault unlocked successfully",
      companyId,
      availableTabs: updatedTabs,
      previousTabs: currentTabs,
      changes: true
    });
  } catch (error) {
    console.error('[Company Tabs API] Error unlocking file vault:', error);
    return res.status(500).json({ message: "Internal server error", code: "SERVER_ERROR" });
  }
});

export default router;