import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { companies } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getWebSocketServer } from '../utils/unified-websocket';

/**
 * Updates all Invela and Bank category companies to have the Claims and S&P Risk Score tabs
 * and broadcasts a WebSocket message to trigger cache invalidation and UI refresh
 */
export async function updateClaimsAndRiskScoreTabs(req: Request, res: Response) {
  try {
    // Find all Invela and Bank companies
    const companiesResult = await db.execute(sql`
      SELECT id, name, category, available_tabs 
      FROM companies 
      WHERE category IN ('Invela', 'Bank')
    `);
    
    const companies = companiesResult.rows as { 
      id: number; 
      name: string; 
      category: string;
      available_tabs: string[];
    }[];
    
    console.log(`[Admin API] Found ${companies.length} companies to update`);
    
    const updatedCompanies = [];
    
    // Update each company
    for (const company of companies) {
      let updated = false;
      const newTabs = [...company.available_tabs];
      
      // Check if we need to add 'claims'
      if (!newTabs.includes('claims')) {
        newTabs.push('claims');
        updated = true;
      }
      
      // Check if we need to add 'risk-score'
      if (!newTabs.includes('risk-score')) {
        newTabs.push('risk-score');
        updated = true;
      }
      
      // Only update if needed
      if (updated) {
        await db.execute(sql`
          UPDATE companies 
          SET available_tabs = ${JSON.stringify(newTabs)}
          WHERE id = ${company.id}
        `);
        
        updatedCompanies.push({
          id: company.id,
          name: company.name,
          category: company.category,
          updated: true,
          tabs: newTabs
        });
        
        // Broadcast WebSocket update message to trigger UI refresh
        broadcastCompanyUpdate(company.id, newTabs);
      } else {
        updatedCompanies.push({
          id: company.id,
          name: company.name,
          category: company.category,
          updated: false,
          tabs: newTabs
        });
      }
    }
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: `Updated ${updatedCompanies.filter(c => c.updated).length} companies`,
      data: updatedCompanies
    });
  } catch (error) {
    console.error('[Admin API] Error updating company tabs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update company tabs',
      error: String(error)
    });
  }
}

/**
 * Broadcasts a WebSocket message to all clients to update the company tabs
 * This will trigger cache invalidation in the frontend and refresh the sidebar
 */
function broadcastCompanyUpdate(companyId: number, availableTabs: string[]) {
  const wss = getWebSocketServer();
  if (!wss) {
    console.error('[WebSocket] Server not initialized');
    return;
  }
  
  const message = {
    type: 'company_updated',
    payload: {
      companyId,
      availableTabs,
      cache_invalidation: true,
      timestamp: new Date().toISOString()
    }
  };
  
  console.log(`[WebSocket] Broadcasting company update for company ${companyId}`);
  
  wss.clients.forEach(client => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}