/**
 * Script to unlock all tabs for Affirm (company ID 8)
 * 
 * This script directly updates the company record in the database
 * to ensure all tabs are available and broadcasts a WebSocket event
 * to update the UI immediately.
 */

import { db } from './db/index.js';
import { companies } from './db/schema.js';
import { eq } from 'drizzle-orm';
import WebSocket from 'ws';

const COMPANY_ID = 8; // Affirm
const AVAILABLE_TABS = ["task-center", "dashboard", "network", "file-vault", "insights", "builder"];

async function unlockAllTabs() {
  try {
    console.log(`[Tab Unlock] Starting unlock process for company ID ${COMPANY_ID} (Affirm)`);
    
    // Get the current company record
    const [company] = await db.select().from(companies).where(eq(companies.id, COMPANY_ID));
    
    if (!company) {
      console.error(`[Tab Unlock] Company with ID ${COMPANY_ID} not found`);
      return;
    }
    
    console.log(`[Tab Unlock] Current company data:`, {
      id: company.id,
      name: company.name,
      availableTabs: company.available_tabs
    });
    
    // Update the company record with all available tabs
    await db.update(companies)
      .set({ 
        available_tabs: AVAILABLE_TABS,
        onboarding_completed: true
      })
      .where(eq(companies.id, COMPANY_ID));
    
    console.log(`[Tab Unlock] Company record updated successfully with tabs:`, AVAILABLE_TABS);
    
    // Broadcast the update via WebSocket to all connected clients
    await broadcastWebSocketUpdate(company.id, AVAILABLE_TABS);
    
    console.log(`[Tab Unlock] Process completed successfully`);
  } catch (error) {
    console.error(`[Tab Unlock] Error:`, error);
  }
}

async function broadcastWebSocketUpdate(companyId, availableTabs) {
  try {
    // Get WebSocket server instance from the global scope
    // This assumes the WebSocket server is set up in routes.ts
    const wss = global.wss;
    
    if (!wss) {
      console.error('[Tab Unlock] WebSocket server not found in global scope');
      return;
    }
    
    const message = JSON.stringify({
      type: 'company_update',
      payload: {
        companyId,
        availableTabs,
        cache_invalidation: true
      }
    });
    
    let broadcastCount = 0;
    
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        broadcastCount++;
      }
    });
    
    console.log(`[Tab Unlock] WebSocket message broadcast to ${broadcastCount} clients`);
  } catch (error) {
    console.error('[Tab Unlock] Error broadcasting WebSocket message:', error);
  }
}

unlockAllTabs();